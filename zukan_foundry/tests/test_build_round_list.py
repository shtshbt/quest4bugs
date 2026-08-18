"""fetch 統合 round の対象組み立てが凍結ドラフトと一致しているかを見る。

launcher は名前を手で写さずレポートの表から読むので、レポート側の編集で
拾えなくなったらここで落ちる。数え上げの正解値はレポート本文が明記している
数字 (見出しの「SSR 3 種」など) をそのまま置く。

Run: python3 -m unittest zukan_foundry.tests.test_build_round_list
"""

import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

_spec = importlib.util.spec_from_file_location(
    "build_round_list", ROOT / "tools" / "fetch_round" / "build_round_list.py",
)
build_round_list = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(build_round_list)

REPORTS = ROOT / "zukan_foundry" / "reports"


def sections(name):
    return build_round_list.read_sections(REPORTS / name)


class BorneoParsingTests(unittest.TestCase):
    def setUp(self):
        self.report = sections("borneo_expedition1_freeze_draft.md")

    def test_rarity_band_counts_match_the_headings(self):
        expected = {"2.2": 3, "2.3": 7, "2.4": 17, "2.5": 57}
        for prefix, count in expected.items():
            with self.subTest(section=prefix):
                found = build_round_list.table_species(
                    build_round_list.section(self.report, prefix))
                self.assertEqual(len(found), count)

    def test_selection_totals_84(self):
        total = sum(
            len(build_round_list.table_species(
                build_round_list.section(self.report, p)))
            for p in ("2.2", "2.3", "2.4", "2.5")
        )
        self.assertEqual(total, 84)

    def test_priority_list_covers_waves_one_to_three(self):
        priority = build_round_list.numbered_species(
            build_round_list.section(self.report, "3.1"))
        self.assertEqual(len(priority), 27)
        self.assertEqual(priority[0], "Trogonoptera brookiana")

    def test_every_prioritised_name_exists_in_the_selection(self):
        selected = set()
        for p in ("2.2", "2.3", "2.4", "2.5"):
            selected.update(
                n for n, _ in build_round_list.table_species(
                    build_round_list.section(self.report, p)))
        priority = build_round_list.numbered_species(
            build_round_list.section(self.report, "3.1"))
        self.assertEqual([n for n in priority if n not in selected], [])

    def test_spare_pool_is_parsed(self):
        spares = build_round_list.numbered_species(
            build_round_list.section(self.report, "5."))
        self.assertEqual(len(spares), 22)


class MadagascarParsingTests(unittest.TestCase):
    def setUp(self):
        self.report = sections("mg_expedition2_freeze_draft.md")

    def test_additional_fetch_list_is_34_explicit_names(self):
        found = build_round_list.table_species(
            build_round_list.section(self.report, "4.2"))
        # Coleoptera 21 + Hemiptera 13。Orthoptera 10 は本文が列挙していない。
        self.assertEqual(len(found), 34)

    def test_refetch_grades(self):
        self.assertEqual(
            len(build_round_list.table_species(
                build_round_list.section(self.report, "1.1"))), 5)
        self.assertEqual(
            len(build_round_list.table_species(
                build_round_list.section(self.report, "1.2"))), 11)

    def test_derived_orthoptera_starts_with_the_named_leader(self):
        entries = build_round_list.build_madagascar()
        derived = [e for e in entries if e["wave"] == "mg_w2"]
        self.assertEqual(len(derived), 10)
        self.assertEqual(derived[0]["sci"], "Rubellia nigro-signata")
        self.assertTrue(all(e["order"] == "Orthoptera" for e in derived))

    def test_derived_orthoptera_occurrence_range_matches_report(self):
        """3 章の表が示す残プールの occ 範囲 22-126 に収まること。"""
        derived = [e for e in build_round_list.build_madagascar()
                   if e["wave"] == "mg_w2"]
        occ = [e["occurrence"] for e in derived]
        self.assertLessEqual(max(occ), 126)
        self.assertGreaterEqual(min(occ), 22)

    def test_derived_orthoptera_is_occurrence_descending(self):
        derived = [e for e in build_round_list.build_madagascar()
                   if e["wave"] == "mg_w2"]
        occ = [e["occurrence"] for e in derived]
        self.assertEqual(occ, sorted(occ, reverse=True))


class BorneoCoverageTests(unittest.TestCase):
    def test_only_two_of_the_84_already_have_a_photo(self):
        """3 章「写真が既にあるのは 2 種」と取得済み判定が一致すること。"""
        entries = [e for e in build_round_list.build_borneo(spares=0)]
        covered = build_round_list.covered_scientific_names()
        carded = build_round_list.carded_species_ids()
        already = [
            e["sci"] for e in entries
            if e["sci"] in covered or e["id"] in carded
        ]
        self.assertEqual(sorted(already),
                         ["Bactrocera musae", "Oecophylla smaragdina"])


class AustraliaParsingTests(unittest.TestCase):
    def test_replacement_candidates_resolve_to_seeds(self):
        entries = build_round_list.build_australia()
        self.assertEqual(len(entries), 8)
        self.assertTrue(all(e["refetch"] for e in entries))
        self.assertIn("phricta_spinosa", {e["id"] for e in entries})
        self.assertTrue(all(e["sci"] for e in entries))


class EntryShapeTests(unittest.TestCase):
    def test_species_id_derivation(self):
        self.assertEqual(
            build_round_list.species_id_of("Rubellia nigro-signata"),
            "rubellia_nigro_signata")
        self.assertEqual(
            build_round_list.species_id_of("Nanos viettei (Paulian, 1976)"),
            "nanos_viettei")

    def test_canonical_drops_authorship(self):
        self.assertEqual(
            build_round_list.canonical("Liatongus femoratus (Illiger, 1800)"),
            "Liatongus femoratus")

    def test_entries_carry_the_batch_contract_fields(self):
        for entry in build_round_list.build_borneo(spares=2):
            self.assertTrue(entry["id"])
            self.assertTrue(entry["ja"])
            self.assertTrue(entry["sci"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
