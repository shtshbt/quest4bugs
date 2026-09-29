"""コスタリカ遠征 I の凍結前の確認ページを作る。

freeze draft の選抜 84 種を段ごとに並べ、各種のカード画像・取得元・8/18 の検品の指摘・
仮称 (8/18 の命名提案) を 1 枚の HTML にまとめる。画像は repo の zukan_cards/ を相対
パスで参照するので、出力はこのフォルダに置き、ブラウザで直接開く。

8/18 より後に取得したカードは「取り直し」と表示し、8/18 の指摘は古いものとして扱う。
仮称の多くは写真を見て付けたので、取り直した種は仮称が新しい写真と合うかも見る。

    python3 zukan_foundry/rounds/2026-09-29_cr1/make_review.py
"""

import glob
import html
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
DRAFT = ROOT / "zukan_foundry/reports/costarica_expedition1_freeze_draft.md"
NAMING = ROOT / "zukan_foundry/reports/borneo_costarica_naming_proposal_2026-08-18.md"
INSPECTIONS = sorted(glob.glob(str(ROOT / "zukan_foundry/reports/card_image_inspection*.md")))
INSPECTED_ON = "2026-08-18"


def selection() -> list[tuple[str, str, str]]:
    """freeze draft 2 章の表から (段, 学名, 和名) を順に返す。"""
    text = DRAFT.read_text(encoding="utf-8")
    sec = text.split("## 2. 収録 84 種の選抜案")[1].split("## 3.")[0]
    rows, rarity = [], None
    for line in sec.splitlines():
        m = re.match(r"### 2\.\d (\w+)", line)
        if m:
            rarity = m.group(1)
            continue
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if cells and re.fullmatch(r"\d+", cells[0]):
            cells = cells[1:]
        if len(cells) >= 2 and re.fullmatch(r"[A-Z][a-z]+ [a-z\-]+", cells[0]):
            rows.append((rarity, cells[0], cells[1]))
    return rows


def proposed_names() -> dict[str, str]:
    """命名提案のコスタリカ節から 学名 -> 仮称 を返す。"""
    text = NAMING.read_text(encoding="utf-8").split("## 2. コスタリカ遠征 I")[1].split("## 3.")[0]
    names = {}
    for line in text.splitlines():
        m = re.match(r"\|\s*[a-z0-9_]+\s*\|\s*\*([^*]+)\*\s*\|\s*([^|]+)\|", line)
        if m:
            names[" ".join(m.group(1).split()[:2])] = m.group(2).strip()
    return names


def prior_flags() -> dict[str, list[str]]:
    flags: dict[str, list[str]] = {}
    for rep in INSPECTIONS:
        for line in open(rep, encoding="utf-8"):
            m = re.match(r"\|\s*([a-z0-9_]+)\s*\|(.*)", line)
            if m and m.group(1) != "species_id":
                cells = [c.strip() for c in m.group(2).split("|") if c.strip()]
                flags.setdefault(m.group(1), []).append(" / ".join(cells[-3:-1]) if len(cells) >= 3 else " / ".join(cells))
    return flags


def round_verdicts() -> dict[str, tuple[str, str]]:
    """この round の目視検品 (inspection.md) から species_id -> (判定, 根拠)。"""
    path = HERE / "inspection.md"
    verdicts = {}
    if not path.exists():
        return verdicts
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\|\s*([a-z0-9_]+)\s*\|\s*(OK|要確認|不可)\s*\|\s*([^|]+)\|", line)
        if m:
            verdicts[m.group(1)] = (m.group(2), m.group(3).strip())
    return verdicts


def cards() -> dict[str, dict]:
    out = {}
    for path in glob.glob(str(ROOT / "zukan_cards/metadata/*.json")):
        try:
            data = json.load(open(path, encoding="utf-8"))
        except (OSError, ValueError) as error:
            print(f"skip {path}: {error}", file=sys.stderr)
            continue
        sci = " ".join((data.get("scientific_name") or "").split()[:2])
        display = (data.get("files") or {}).get("display")
        if sci and display and (ROOT / "zukan_cards" / display).exists():
            prev = out.get(sci)
            if not prev or str(data.get("fetched_date") or "") > str(prev.get("fetched_date") or ""):
                out[sci] = data
    return out


def figure(card: dict | None, title: str, sci: str, note: str, state: str) -> str:
    if card:
        thumb = ((card.get("files") or {}).get("thumbnails") or {}).get("216") or card["files"]["display"]
        img = os.path.relpath(ROOT / "zukan_cards" / thumb, HERE)
        src = (card.get("specimen") or {}).get("institutionCode") or ""
        pic = f'<img src="{html.escape(img)}" alt="">'
    else:
        src, pic = "", '<div class="noimg">写真なし</div>'
    return (f'<figure class="{state}">{pic}<figcaption><b>{html.escape(title)}</b>'
            f'<i>{html.escape(sci)}</i><span>{html.escape(src)}</span>'
            f'<em>{html.escape(note)}</em></figcaption></figure>')


def candidate_section(rows: list[tuple[str, str, str]], meta: dict[str, dict]) -> str:
    """substitution_plan.md の枠ごとに、今のカードと候補 2 種を横に並べる。"""
    plan = HERE / "substitution_plan.md"
    if not plan.exists():
        return ""
    by_id = {sci.lower().replace(" ", "_"): (rar, sci) for rar, sci, _ in rows}
    lines = []
    for line in plan.read_text(encoding="utf-8").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 5 or cells[0] not in by_id:
            continue
        rar, sci = by_id[cells[0]]
        figs = [figure(meta.get(sci), f"入れ替える種 ({rar})", sci, cells[2], "flagged")]
        for cell in cells[3:5]:
            cand = re.match(r"([A-Z][a-z]+ [a-z\-]+)", cell)
            if not cand:
                continue
            csci = cand.group(1)
            card = meta.get(csci)
            figs.append(figure(card, "候補", csci, cell[len(csci):].strip(" ()"),
                               "ok" if card else "missing"))
        lines.append(f'<div class="row">{"".join(figs)}</div>')
    return ("<h2>差し替え候補</h2><p>左が入れ替える種、右の 2 つが候補 (同じ目、同じ科を優先)。"
            "写真の無い候補は取得できなかったもの。</p>" + "".join(lines))


def main() -> int:
    rows = selection()
    if len(rows) != 84:
        print(f"expected 84 species in the draft, found {len(rows)}", file=sys.stderr)
        return 1
    names, flags, meta, verdicts = proposed_names(), prior_flags(), cards(), round_verdicts()
    counts = {"ok": 0, "refetched": 0, "flagged": 0, "missing": 0}
    sections = []
    for rarity in ["SSR", "SR", "R", "N"]:
        items = []
        for rar, sci, ja in rows:
            if rar != rarity:
                continue
            card = meta.get(sci)
            name = names.get(sci) or ja
            if not card:
                counts["missing"] += 1
                state, note, img, src = "missing", "写真なし", "", ""
            else:
                thumb = ((card.get("files") or {}).get("thumbnails") or {}).get("216") or card["files"]["display"]
                img = os.path.relpath(ROOT / "zukan_cards" / thumb, HERE)
                spec = card.get("specimen") or {}
                src = spec.get("institutionCode") or (card.get("source") or {}).get("provider") or ""
                fetched = str(card.get("fetched_date") or "")
                if fetched > INSPECTED_ON:
                    verdict = verdicts.get(card.get("species_id"))
                    if verdict and verdict[0] == "OK":
                        counts["refetched"] += 1
                        state, note = "refetched", f"取り直し OK ({verdict[1]})。仮称が新しい写真と合うかも見る"
                    elif verdict:
                        counts["flagged"] += 1
                        state, note = "flagged", f"取り直し後も {verdict[0]}: {verdict[1]}"
                    else:
                        counts["refetched"] += 1
                        state, note = "refetched", f"取り直し ({fetched})。未検品。仮称が新しい写真と合うかも見る"
                elif flags.get(card.get("species_id")):
                    counts["flagged"] += 1
                    state, note = "flagged", "8/18 の指摘: " + "; ".join(flags[card["species_id"]])
                else:
                    counts["ok"] += 1
                    state, note = "ok", "8/18 の検品で問題なし"
            pic = f'<img src="{html.escape(img)}" alt="">' if img else '<div class="noimg">写真なし</div>'
            items.append(f'<figure class="{state}">{pic}<figcaption><b>{html.escape(name)}</b>'
                         f'<i>{html.escape(sci)}</i><span>{html.escape(src)}</span>'
                         f'<em>{html.escape(note)}</em></figcaption></figure>')
        sections.append(f"<h2>{rarity}</h2><div class=\"grid\">{''.join(items)}</div>")
    summary = (f"問題なし {counts['ok']}、取り直し {counts['refetched']}、8/18 の指摘あり {counts['flagged']}、"
               f"写真なし {counts['missing']} (計 84)")
    sections.append(candidate_section(rows, meta))
    page = f"""<!doctype html><html lang="ja"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>コスタリカ遠征 I 確認</title>
<style>
body{{font-family:sans-serif;margin:16px;background:#f6f4ee;color:#222}}
h1{{font-size:20px}} h2{{font-size:17px;margin-top:22px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}}
figure{{margin:0;background:#fff;border:3px solid #ccc;border-radius:10px;padding:6px}}
figure.ok{{border-color:#9bc59b}} figure.refetched{{border-color:#6fa8dc}}
figure.flagged{{border-color:#e69138}} figure.missing{{border-color:#cc4125}}
img{{width:100%;aspect-ratio:1;object-fit:contain;background:#fafafa}}
.noimg{{aspect-ratio:1;display:flex;align-items:center;justify-content:center;color:#999}}
figcaption{{display:flex;flex-direction:column;gap:2px;font-size:12px}}
figcaption i{{color:#555}} figcaption span{{color:#888}} figcaption em{{font-style:normal;color:#8a4b00}}
.row{{display:grid;grid-template-columns:repeat(3,minmax(0,200px));gap:10px;margin-bottom:12px}}
</style>
<h1>コスタリカ遠征 I 凍結前の確認</h1><p>{summary}。枠の色: 緑 問題なし / 青 取り直し / 橙 8/18 の指摘あり / 赤 写真なし。</p>
{''.join(sections)}</html>"""
    out = HERE / "review.html"
    out.write_text(page, encoding="utf-8")
    print(summary)
    print(f"wrote {out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
