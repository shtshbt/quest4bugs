#!/usr/bin/env python3
"""fetch 統合 round の対象リストを凍結ドラフトから組み立てる。

対象は 3 本の freeze draft に書かれた優先順そのもの。名前を手で写さず、
レポートの表から機械的に読む。

  borneo_expedition1_freeze_draft.md
    第 1 波 SSR 3 / 第 2 波 SR 7 / 第 3 波 R 17 / 第 4 波 N 57 (計 84)
    + 5 章の差し替え予備から先頭 N 件 (既定 14。3.2 章の「96 種前後」に合わせる)
  mg_expedition2_freeze_draft.md
    4.2 章の追加 fetch (Coleoptera 21 + Hemiptera 13 + Orthoptera 10) 44
    + 1.1 章 A- 5 と 1.2 章 B 11 の再取得 16 (計 60)
  au_expedition2_freeze_draft.md
    5 章の差し替え候補 (再取得)

4.2 章の Orthoptera 10 種だけは本文が名前を列挙していない
(「Rubellia nigro-signata を筆頭に Acrididae 9 種」)。ここは
data/species_reserve/regions/madagascar.enriched.jsonl から order=Orthoptera を
occurrence 降順で補い、manifest に derived と記録する。

Usage:
  python3 tools/fetch_round/build_round_list.py            # 対象を数えて表示
  python3 tools/fetch_round/build_round_list.py --json out.json --manifest out.md
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
REPORTS = REPO / "zukan_foundry" / "reports"
REGIONS = REPO / "zukan_foundry" / "data" / "species_reserve" / "regions"
METADATA = REPO / "zukan_cards" / "metadata"

BINOMIAL_FULL = re.compile(r"^[A-Z][a-z]+ [a-z][a-z-]+$")
BINOMIAL_ANY = re.compile(r"[A-Z][a-z]+ [a-z][a-z-]+")
JAPANESE = re.compile(r"[ぁ-んァ-ヶ一-龠]")
MG_ORTHOPTERA_TARGET = 10


def log(msg: str) -> None:
    print(f"[round] {msg}", file=sys.stderr)


# --- report parsing --------------------------------------------------------
def read_sections(path: Path) -> dict[str, list[str]]:
    """'## '/'### ' 見出しごとに本文行を集める。"""
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for line in path.read_text(encoding="utf-8").splitlines():
        heading = re.match(r"^#{2,3}\s+(.*)$", line)
        if heading:
            current = heading.group(1).strip()
            sections[current] = []
        elif current is not None:
            sections[current].append(line)
    return sections


def section(sections: dict[str, list[str]], prefix: str) -> list[str]:
    for title, body in sections.items():
        if title.startswith(prefix):
            return body
    raise KeyError(f"見出し '{prefix}' がレポートに無い")


def strip_paren(cell: str) -> str:
    return re.sub(r"\s*[(（].*?[)）]\s*$", "", cell).strip()


def table_species(lines: list[str]) -> list[tuple[str, str]]:
    """表の行から (学名, 和名) を拾う。和名が無ければ空文字。

    学名は「属 種小名」の形の最初のセル。和名はその直後のセルが日本語で、
    命名未を表す記法でなければ採用する。"""
    found: list[tuple[str, str]] = []
    seen: set[str] = set()
    for line in lines:
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        for i, cell in enumerate(cells):
            name = strip_paren(cell)
            if not BINOMIAL_FULL.match(name) or name in seen:
                continue
            ja = ""
            if i + 1 < len(cells):
                nxt = cells[i + 1]
                if (
                    JAPANESE.search(nxt)
                    and "命名未" not in nxt
                    and len(nxt) <= 20
                    and not re.search(r"[。、]", nxt)
                ):
                    ja = strip_paren(nxt) or nxt
            seen.add(name)
            found.append((name, ja))
            break
    return found


def numbered_species(lines: list[str]) -> list[str]:
    """'1. Trogonoptera brookiana (看板)' 形式の番号付き行から学名を拾う。"""
    out: list[str] = []
    for line in lines:
        if not re.match(r"^\s*\d+\.\s", line):
            continue
        for name in BINOMIAL_ANY.findall(line):
            if name not in out:
                out.append(name)
    return out


# --- region seeds ----------------------------------------------------------
def canonical(scientific_name: str) -> str:
    parts = re.sub(r"[(（].*?[)）]", "", scientific_name).split()
    return " ".join(parts[:2]) if len(parts) >= 2 else scientific_name.strip()


def species_id_of(scientific_name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", canonical(scientific_name).lower()).strip("_")


def load_region(region: str) -> dict[str, dict]:
    """canonical 学名 -> seed record。"""
    path = REGIONS / f"{region}.enriched.jsonl"
    if not path.is_file():
        path = REGIONS / f"{region}.jsonl"
    if not path.is_file():
        log(f"警告: {region} の seeds が無い ({path})")
        return {}
    out: dict[str, dict] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        rec = json.loads(line)
        out.setdefault(canonical(rec.get("scientificName", "")), rec)
    return out


def carded_species_ids() -> set[str]:
    """既にカードを持つ species_id。"""
    out: set[str] = set()
    if not METADATA.is_dir():
        return out
    for path in METADATA.glob("*.json"):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        sid = payload.get("species_id") or payload.get("speciesId")
        if sid:
            out.add(sid)
    return out


def covered_scientific_names() -> set[str]:
    """既にカードがあるか、カタログに載っている canonical 学名。

    species_id では拾えない。カードの species_id は和名由来 (miiro_batta) で、
    seeds 側から導く学名由来の id (paracinema_tricolor) と一致しないため、
    学名で突き合わせないと「取得済み」を見落とす。"""
    out: set[str] = set()
    if METADATA.is_dir():
        for path in METADATA.glob("*.json"):
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                continue
            sci = payload.get("scientific_name") or payload.get("scientificName")
            if sci:
                out.add(canonical(sci))
    catalog = REPO / "zukan_foundry" / "data" / "catalog" / "current_species.json"
    if catalog.is_file():
        try:
            payload = json.loads(catalog.read_text(encoding="utf-8"))
        except Exception:
            payload = {}
        for rec in payload.get("species", []):
            sci = rec.get("canonicalName") or rec.get("scientificName")
            if sci:
                out.add(canonical(sci))
    return out


# --- entry assembly --------------------------------------------------------
def make_entry(scientific_name: str, ja: str, region: str, wave: str,
               origin: str, seeds: dict[str, dict], refetch: bool = False,
               species_id: str | None = None) -> dict:
    canon = canonical(scientific_name)
    seed = seeds.get(canon, {})
    if not ja:
        ja = seed.get("japaneseName") or ""
    return {
        "id": species_id or species_id_of(canon),
        # 和名が未定の種は学名をそのまま ja に入れる (naming/*.json の流儀)。
        "ja": ja or canon,
        "sci": canon,
        "wave": wave,
        "region": region,
        "origin": origin,
        "refetch": refetch,
        "seed_id": seed.get("seedId", ""),
        "occurrence": seed.get("occurrenceCount", 0),
        "order": seed.get("order", ""),
        "family": seed.get("family", ""),
    }


def build_borneo(spares: int) -> list[dict]:
    report = read_sections(REPORTS / "borneo_expedition1_freeze_draft.md")
    seeds = load_region("borneo")
    selected: list[tuple[str, str]] = []
    for prefix in ("2.2", "2.3", "2.4", "2.5"):
        selected.extend(table_species(section(report, prefix)))
    ja_of = dict(selected)

    priority = numbered_species(section(report, "3.1"))
    wave_of: dict[str, str] = {}
    for pos, name in enumerate(priority, start=1):
        wave_of[name] = "1" if pos <= 3 else "2" if pos <= 10 else "3"

    missing = [n for n in priority if n not in ja_of]
    if missing:
        log(f"警告: 3.1 の優先順に 2 章の表に無い学名がある: {missing}")

    entries = [
        make_entry(name, ja, "borneo", f"borneo_w{wave_of.get(name, '4')}",
                   "borneo 2.2-2.5 の 84 種", seeds)
        for name, ja in selected
    ]
    entries.sort(key=lambda e: (e["wave"], -(e["occurrence"] or 0)))

    if spares > 0:
        spare_names = numbered_species(section(report, "5."))[:spares]
        entries.extend(
            make_entry(name, "", "borneo", "borneo_w5",
                       "borneo 5 章の差し替え予備", seeds)
            for name in spare_names
        )
    return entries


def build_madagascar() -> list[dict]:
    report = read_sections(REPORTS / "mg_expedition2_freeze_draft.md")
    seeds = load_region("madagascar")
    entries: list[dict] = []

    explicit = table_species(section(report, "4.2"))
    entries.extend(
        make_entry(name, ja, "madagascar", "mg_w1", "mg 4.2 の追加 fetch (明記)", seeds)
        for name, ja in explicit
    )

    # 4.2 第 3 優先の Orthoptera 10 種は本文が列挙していないので seeds から補う。
    already = {e["sci"] for e in entries}
    carded = carded_species_ids()
    covered = covered_scientific_names()
    orthoptera = sorted(
        (
            rec for canon, rec in seeds.items()
            if rec.get("order") == "Orthoptera"
            and canon not in already
            and canon not in covered
            and species_id_of(canon) not in carded
        ),
        key=lambda r: -(r.get("occurrenceCount") or 0),
    )[:MG_ORTHOPTERA_TARGET]
    entries.extend(
        make_entry(rec["scientificName"], rec.get("japaneseName", ""), "madagascar",
                   "mg_w2", "mg 4.2 第 3 優先 Orthoptera (seeds から occurrence 降順で補完)",
                   seeds)
        for rec in orthoptera
    )
    if len(orthoptera) < MG_ORTHOPTERA_TARGET:
        log(f"警告: mg Orthoptera が {len(orthoptera)} 種しか埋まらなかった")

    for prefix, grade in (("1.1", "A-"), ("1.2", "B")):
        for name, ja in table_species(section(report, prefix)):
            entries.append(make_entry(
                name, ja, "madagascar", "mg_refetch",
                f"mg {prefix} 等級 {grade} の再取得", seeds, refetch=True,
            ))
    return entries


def build_australia() -> list[dict]:
    report = read_sections(REPORTS / "au_expedition2_freeze_draft.md")
    seeds = load_region("australia")
    by_id = {species_id_of(canon): canon for canon in seeds}
    entries: list[dict] = []
    for line in section(report, "5."):
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 3 or cells[0] in ("id", "---"):
            continue
        ja_cell = cells[1]
        for part in cells[0].split("/"):
            sid = part.strip()
            if not re.fullmatch(r"[a-z0-9_]+", sid):
                continue
            canon = by_id.get(sid)
            if not canon:
                log(f"警告: au 5 章の id '{sid}' が australia seeds で解決できない")
                continue
            ja = ja_cell if JAPANESE.search(ja_cell) and "/" not in ja_cell else ""
            entries.append(make_entry(
                canon, ja, "australia", "au_refetch",
                "au 5 章の差し替え候補", seeds, refetch=True, species_id=sid,
            ))
    return entries


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--json", type=Path, help="species list JSON の出力先")
    ap.add_argument("--manifest", type=Path, help="人間が読む対象一覧の出力先")
    ap.add_argument(
        "--spares", type=int, default=14,
        help=(
            "borneo 5 章の差し替え予備から先頭何件を含めるか (既定 14)。"
            "3.2 章の見積り 96 種に届くよう、既存カード分を差し引いた新規 82 種に"
            "足す本数。"
        ),
    )
    ap.add_argument(
        "--regions", default="borneo,madagascar,australia",
        help="対象地域をカンマ区切りで絞る",
    )
    ap.add_argument(
        "--waves", default="",
        help=(
            "wave をカンマ区切りで絞る。前方一致で見るので 'borneo' や "
            "'borneo_w1,borneo_w2'、'mg_refetch' のように書ける"
        ),
    )
    ap.add_argument(
        "--limit", type=int, default=0,
        help="wave 順に先頭 N 種だけ残す (0 なら制限なし)",
    )
    ap.add_argument(
        "--include-carded", action="store_true",
        help="既にカードを持つ種も残す (既定は refetch 指定分を除いて落とす)",
    )
    args = ap.parse_args()

    wanted = {r.strip() for r in args.regions.split(",") if r.strip()}
    entries: list[dict] = []
    if "borneo" in wanted:
        entries.extend(build_borneo(args.spares))
    if "madagascar" in wanted:
        entries.extend(build_madagascar())
    if "australia" in wanted:
        entries.extend(build_australia())

    # 同一 species_id の重複を潰す。波は先に出た方を採るが、どこかで再取得
    # 指定されていればその指定を優先する (Bactrocera musae のように borneo の
    # 新規枠と mg の再取得枠に同時に載る種がある)。
    deduped: dict[str, dict] = {}
    for e in entries:
        prev = deduped.get(e["id"])
        if prev is None:
            deduped[e["id"]] = e
            continue
        if e["refetch"] and not prev["refetch"]:
            prev["refetch"] = True
        prev["origin"] = f"{prev['origin']} / {e['origin']}"
    entries = list(deduped.values())

    carded = carded_species_ids()
    covered = covered_scientific_names()
    skipped = []
    if not args.include_carded:
        kept = []
        for e in entries:
            if e["refetch"] or (e["id"] not in carded and e["sci"] not in covered):
                kept.append(e)
            else:
                skipped.append(e)
        entries = kept

    if args.waves:
        prefixes = tuple(w.strip() for w in args.waves.split(",") if w.strip())
        entries = [e for e in entries if e["wave"].startswith(prefixes)]

    entries.sort(key=lambda e: (e["wave"], -(e["occurrence"] or 0)))
    if args.limit > 0:
        entries = entries[: args.limit]

    by_wave: dict[str, int] = {}
    for e in entries:
        by_wave[e["wave"]] = by_wave.get(e["wave"], 0) + 1

    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(
            json.dumps(
                [{"id": e["id"], "ja": e["ja"], "sci": e["sci"]} for e in entries],
                ensure_ascii=False, indent=1,
            ),
            encoding="utf-8",
        )

    if args.manifest:
        args.manifest.parent.mkdir(parents=True, exist_ok=True)
        lines = ["# fetch 統合 round の対象", ""]
        lines.append(f"合計 {len(entries)} 種 (カード既存で除外 {len(skipped)} 種)")
        lines.append("")
        lines.append("| wave | 件数 |")
        lines.append("|---|---:|")
        for wave in sorted(by_wave):
            lines.append(f"| {wave} | {by_wave[wave]} |")
        lines.append("")
        lines.append("| # | wave | species_id | 学名 | 和名 | occ | 由来 |")
        lines.append("|---:|---|---|---|---|---:|---|")
        for i, e in enumerate(entries, start=1):
            mark = " (再取得)" if e["refetch"] else ""
            lines.append(
                f"| {i} | {e['wave']} | {e['id']} | {e['sci']} | {e['ja']} | "
                f"{e['occurrence']} | {e['origin']}{mark} |"
            )
        args.manifest.write_text("\n".join(lines) + "\n", encoding="utf-8")

    for wave in sorted(by_wave):
        print(f"{wave:14s} {by_wave[wave]:4d}")
    print(f"{'合計':14s} {len(entries):4d}  (カード既存で除外 {len(skipped)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
