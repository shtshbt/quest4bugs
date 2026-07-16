#!/usr/bin/env python3
"""Write the static photo review bundle.

Usage: import review_bundle and call write_review_bundle(results, out_dir, repo_root)
"""

from __future__ import annotations

import html
from collections import Counter
from pathlib import Path
from urllib.parse import quote

STATE_ORDER = (
    "machine_reject",
    "review_required",
    "missing",
    "provisionally_valid",
    "approved",
)
DECISION_LABELS = (
    "approve current",
    "replace with candidate",
    "keep SVG fallback",
    "needs taxonomist",
)


def write_review_bundle(results: list[dict], out_dir: Path, repo_root: Path) -> Path:
    """Write one offline HTML review artifact and return its path."""
    del repo_root
    target_dir = Path(out_dir) / "photo_review"
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / "index.html"
    selected = _select_and_sort(results)
    counts = Counter(result["state"] for result in results)
    document = _document(selected, counts, len(results))
    target.write_text(document, encoding="utf-8", newline="\n")
    return target


def _select_and_sort(results: list[dict]) -> list[dict]:
    indexed = []
    for index, result in enumerate(results):
        match = result.get("taxonComparison", {}).get("match", "exact")
        if result.get("state") in {"machine_reject", "review_required"} or match != "exact":
            indexed.append((_group_rank(result), index, result))
    indexed.sort(key=lambda item: (item[0], item[1]))
    return [item[2] for item in indexed]


def _group_rank(result: dict) -> int:
    state = result.get("state", "")
    match = result.get("taxonComparison", {}).get("match", "exact")
    if state == "machine_reject":
        return 0
    if match in {"synonym_candidate", "mismatch"}:
        return 1
    return {
        "review_required": 2,
        "missing": 3,
        "provisionally_valid": 4,
    }.get(state, 5)


def _document(results: list[dict], counts: Counter, total: int) -> str:
    summary_rows = "".join(
        f"<tr><th>{_escape(state)}</th><td>{counts[state]}</td></tr>" for state in STATE_ORDER
    )
    blocks = "".join(_fixture_block(result) for result in results)
    return f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Photo review bundle</title>
<style>
body{{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:24px;color:#202124;background:#f6f7f8}}main{{max-width:1180px;margin:auto}}h1,h2,h3{{margin:.3em 0}}table{{border-collapse:collapse;background:white}}th,td{{border:1px solid #ccd1d6;padding:5px 9px;text-align:left}}.fixture{{background:white;border:1px solid #ccd1d6;border-radius:7px;padding:14px;margin:16px 0}}.badge,.flag,.decision{{display:inline-block;border:1px solid #9aa0a6;border-radius:4px;padding:2px 6px;margin:2px;font-size:.86rem}}.badge{{background:#fff3cd;font-weight:700}}.decision{{color:#5f6368;background:#f8f9fa}}.images{{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:12px;margin:10px 0}}.images img{{display:block;max-width:100%;height:220px;object-fit:contain;background:#eef0f2}}.meta{{display:grid;grid-template-columns:minmax(130px,220px) 1fr;gap:3px 10px}}ul{{margin:.3em 0 .7em;padding-left:24px}}code{{overflow-wrap:anywhere}}.notice{{padding:10px;background:#e8f0fe;border-left:4px solid #1a73e8}}@media(max-width:650px){{.images,.meta{{grid-template-columns:1fr}}}}
</style>
</head>
<body><main>
<h1>Photo review bundle</h1>
<p class="notice">内部レビュー用の生成物です。approved は機械的に割り当てません。人による承認はこのツールの外で行います。</p>
<p>全 fixture: {total}、レビュー表示: {len(results)}、差し替え候補: 0 件。</p>
<table><tbody>{summary_rows}</tbody></table>
{blocks or '<p>レビュー対象はありません。</p>'}
</main></body></html>
"""


def _fixture_block(result: dict) -> str:
    files = result.get("files", {})
    comparison = result.get("taxonComparison", {})
    flags = "".join(f'<span class="flag">{_escape(flag)}</span>' for flag in result.get("flags", []))
    decisions = "".join(f'<span class="decision">{label}</span>' for label in DECISION_LABELS)
    return f"""<section class="fixture">
<h2>{_escape(result.get('speciesId'))} <small>[{_escape(result.get('variant'))}]</small></h2>
<div class="meta"><strong>和名</strong><span>{_escape(result.get('jaName'))}</span><strong>学名</strong><span><i>{_escape(result.get('scientificName'))}</i></span><strong>状態</strong><span><span class="badge">{_escape(result.get('state'))}</span>{flags or ' flags: none'}</span></div>
<div class="images">{_image_link(files, 'display', 'processed display')}{_image_link(files, 'thumb54', 'thumb54')}</div>
<p>original: {_text_link(files.get('resized', {}).get('path', ''))}</p>
{_source_details(result.get('source', {}), comparison)}
<h3>自動判定軸と理由</h3>{_axis_details(result.get('axes', {}))}
<h3>danger word hits</h3>{_danger_details(result.get('dangerWords', []))}
<p><strong>差し替え候補: 0 件 (候補探索は zukan-fetch 側の後続 lane で行う)</strong></p>
<div aria-label="inert decision labels">{decisions}</div>
</section>"""


def _source_details(source: dict, comparison: dict) -> str:
    url = str(source.get("institutionRecordUrl") or "")
    source_link = f'<a href="{_escape(url)}">{_escape(url)}</a>' if url else "missing"
    mismatch = ""
    if comparison.get("match", "exact") != "exact":
        notes = "; ".join(str(note) for note in comparison.get("notes", [])) or "no notes"
        mismatch = f'<p><strong>mismatch: {_escape(comparison.get("match"))}</strong>, {_escape(notes)}</p>'
    return f"""<h3>source and taxon comparison</h3>
<div class="meta"><strong>institution record</strong><span>{source_link}</span><strong>catalog scientificName</strong><span>{_escape(comparison.get('catalogName'))}</span><strong>bugs.js scientificName</strong><span>{_escape(comparison.get('bugsName'))}</span><strong>bugs.js taxonRank</strong><span>{_escape(comparison.get('bugsRank'))}</span></div>{mismatch}"""


def _axis_details(axes: dict) -> str:
    items = []
    for name in ("completeness", "subject", "identification", "rights"):
        axis = axes.get(name, {})
        reasons = axis.get("reasons", [])
        detail = "; ".join(str(reason) for reason in reasons) if reasons else "no reasons"
        items.append(f"<li><strong>{name}: {_escape(axis.get('state'))}</strong>, {_escape(detail)}</li>")
    return "<ul>" + "".join(items) + "</ul>"


def _danger_details(matches: list[dict]) -> str:
    if not matches:
        return "<p>none</p>"
    items = []
    for match in matches:
        items.append(
            f"<li><strong>{_escape(match.get('word'))}</strong>, "
            f"{_escape(match.get('field'))}: {_escape(match.get('value'))}</li>"
        )
    return "<ul>" + "".join(items) + "</ul>"


def _image_link(files: dict, role: str, label: str) -> str:
    path = str(files.get(role, {}).get("path") or "")
    if not path:
        return f"<div><strong>{label}</strong><p>missing</p></div>"
    href = _repo_href(path)
    return f'<div><strong>{label}</strong><a href="{href}"><img loading="lazy" src="{href}" alt="{label}"></a><code>{_escape(path)}</code></div>'


def _text_link(path: str) -> str:
    if not path:
        return "missing"
    return f'<a href="{_repo_href(path)}"><code>{_escape(path)}</code></a>'


def _repo_href(path: str) -> str:
    normalized = str(path).replace("\\", "/").lstrip("/")
    return "../../" + quote(normalized, safe="/")


def _escape(value: object) -> str:
    text = str(value or "").replace("\u2013", ",").replace("\u2014", ",")
    return html.escape(text, quote=True)
