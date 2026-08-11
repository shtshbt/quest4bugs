"""Wire harvested seeds into ReserveEngine: CLI, subjectProposal, synonyms."""

import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tools.campaign3.t11_species_reserve.harvest_seeds import (
    CachedSeedAdapter, subject_for_order,
)
from zukan_foundry import reserve

ROOT = Path(__file__).resolve().parents[2]


def seed(key, name, ja, order="Coleoptera", synonyms=(), status="ACCEPTED",
         rank="SPECIES", **overrides):
    """A harvested seed with the species/{key} taxonomyResponse shape."""
    record = {
        "seedId": f"gbif_{key}", "scientificName": name, "taxonRank": "species",
        "synonyms": list(synonyms), "japaneseName": ja,
        "japaneseNameSource": f"https://www.gbif.org/species/{key}#vernacular-jpn",
        "order": order, "family": "Testidae",
        "taxonomySource": f"https://www.gbif.org/species/{key}",
        "sourceReceipt": f"https://www.gbif.org/species/{key}",
        "subjectProposal": "", "checkedAt": "2026-07-17T00:00:00+00:00",
        "taxonomyResponse": {
            "key": key, "nubKey": key, "rank": rank, "taxonomicStatus": status,
            "scientificName": name, "canonicalName": name,
        },
    }
    record.update(overrides)
    return record


def write_seeds(path, records):
    path.write_text(
        "".join(json.dumps(record, ensure_ascii=False) + "\n" for record in records),
        encoding="utf-8")


class SubjectForOrderTests(unittest.TestCase):
    def test_mirrors_reward_js_game_for(self):
        self.assertEqual(subject_for_order("Lepidoptera"), "kanji")
        self.assertEqual(subject_for_order("Coleoptera"), "keisan")
        for order in ("Hymenoptera", "Odonata", "Mantodea", "Hemiptera", ""):
            self.assertEqual(subject_for_order(order), "eitango")


class CachedSeedAdapterTests(unittest.TestCase):
    def make_adapter(self, records):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "seeds.jsonl"
            write_seeds(path, records)
            return CachedSeedAdapter(path)

    def test_subject_proposal_is_filled_from_order(self):
        adapter = self.make_adapter([
            seed(1, "Aus bus", "アアア", order="Lepidoptera"),
            seed(2, "Cus dus", "イイイ", order="Coleoptera"),
            seed(3, "Eus fus", "ウウウ", order="Odonata"),
        ])
        self.assertEqual([item["subjectProposal"] for item in adapter.fetch(3)],
                         ["kanji", "keisan", "eitango"])

    def test_existing_subject_proposal_is_preserved(self):
        adapter = self.make_adapter(
            [seed(1, "Aus bus", "アアア", subjectProposal="eitango")])
        self.assertEqual(adapter.fetch(1)[0]["subjectProposal"], "eitango")

    def test_backfilled_synonyms_are_merged_into_taxonomy_response(self):
        adapter = self.make_adapter([seed(1, "Aus bus", "アアア", synonyms=["Olds bus"])])
        self.assertEqual(adapter.fetch(1)[0]["taxonomyResponse"]["synonyms"], ["Olds bus"])

    def test_response_synonyms_are_not_overwritten(self):
        record = seed(1, "Aus bus", "アアア", synonyms=["Seeds bus"])
        record["taxonomyResponse"]["synonyms"] = ["Responsus bus"]
        adapter = self.make_adapter([record])
        self.assertEqual(adapter.fetch(1)[0]["taxonomyResponse"]["synonyms"],
                         ["Responsus bus"])

    def test_short_cache_fails_closed(self):
        adapter = self.make_adapter([seed(1, "Aus bus", "アアア")])
        with self.assertRaises(ValueError):
            adapter.fetch(2)


class ReserveSeedCliTests(unittest.TestCase):
    def run_cli(self, argv):
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            self.assertEqual(reserve.main(argv), 0)
        return json.loads(buffer.getvalue())

    def test_offline_seeds_run_resolves_dedupes_and_writes_banks(self):
        records = [
            seed(901, "Zzyzxus unus", "ジジクサスイチ", order="Coleoptera"),
            seed(902, "Qqartus duo", "ククアータスニ", order="Lepidoptera"),
            seed(903, "Graptopsaltria nigrofuscata", "アブラゼミ", order="Hemiptera"),
            seed(904, "Wwyrmus tris", "ウワームスサン", order="Odonata",
                 synonyms=["Zzyzxus unus"]),
        ]
        with tempfile.TemporaryDirectory() as directory:
            seeds_path = Path(directory) / "seeds.jsonl"
            output = Path(directory) / "banks"
            write_seeds(seeds_path, records)
            argv = ["--repository-root", str(ROOT), "--seeds", str(seeds_path),
                    "--skip-media", "--bank-count", "1", "--bank-size", "4",
                    "--output-root", str(output)]
            summary = self.run_cli(argv)
            self.assertEqual(summary["records"], 4)
            self.assertEqual(summary["discovery"],
                             {"queries": 0, "requested": 0, "cached": 0})
            bank = json.loads(
                (output / "candidate_bank_001.json").read_text(encoding="utf-8"))
            by_slot = {record["candidateId"]: record for record in bank}

            clean = by_slot["taxon_000001"]
            self.assertEqual(clean["status"], "taxonomy_resolved")
            self.assertEqual(clean["subjectProposal"], "keisan")
            self.assertEqual(clean["taxonKey"], "901")
            self.assertEqual(clean["reviewReasons"], [])
            self.assertEqual(by_slot["taxon_000002"]["subjectProposal"], "kanji")

            catalog_dup = by_slot["taxon_000003"]
            self.assertEqual(catalog_dup["status"], "rejected")
            self.assertEqual(catalog_dup["existingMatch"]["scope"], "catalog")
            self.assertEqual(catalog_dup["subjectProposal"], "eitango")

            reserve_dup = by_slot["taxon_000004"]
            self.assertEqual(reserve_dup["status"], "rejected")
            self.assertEqual(reserve_dup["existingMatch"]["scope"], "reserve")
            self.assertIn("taxon_000001", reserve_dup["existingMatch"]["identifiers"])

            # Slot IDs stay immutable when the same output root is rebuilt.
            self.run_cli(argv)
            rerun = json.loads(
                (output / "candidate_bank_001.json").read_text(encoding="utf-8"))
            self.assertEqual([record["candidateId"] for record in rerun],
                             [record["candidateId"] for record in bank])


if __name__ == "__main__":
    unittest.main()
