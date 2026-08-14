#!/usr/bin/env python3
"""地域 seed を本編カタログと学名だけで重複判定する。"""

import argparse
import json
import re
import sys
from pathlib import Path


MINIMUM_BUG_COUNT = 1400

PARENTHESIZED_RE = re.compile(r"\([^)]*\)")
SPACE_RE = re.compile(r"\s+")
BUG_CALL_RE = re.compile(r"\bbug\(\s*\{[^\n]*")


class JapaneseArgumentParser(argparse.ArgumentParser):
    """argparse の既定英語を外部向けエラーに漏らさない。"""

    def error(self, message):
        self.print_usage(sys.stderr)
        self.exit(2, "エラー: コマンドライン引数が不正です。\n")


def canonicalize_scientific_name(name):
    """著者表記と亜属を除き、比較用の学名を小文字で返す。"""
    if not isinstance(name, str):
        return ""

    # 括弧は亜属と括弧付き著者の両方に使われるが、比較にはどちらも不要。
    without_parentheses = PARENTHESIZED_RE.sub(" ", name)
    tokens = SPACE_RE.sub(" ", without_parentheses).strip().split(" ")
    if len(tokens) < 2:
        return ""

    canonical_tokens = tokens[:2]
    if len(tokens) >= 3 and _is_infraspecific_epithet(tokens[2]):
        canonical_tokens.append(tokens[2])
    return " ".join(canonical_tokens).lower()


def _is_infraspecific_epithet(token):
    """第 3 語が小文字の分類群名なら著者名ではなく亜種として残す。"""
    return (
        bool(token)
        and token[0].islower()
        and not any(character.isdigit() for character in token)
        and "," not in token
        and token != "&"
    )


def canonical_forms(name):
    """亜種名には完全形と種レベルの 2 語形を用意する。"""
    canonical = canonicalize_scientific_name(name)
    if not canonical:
        return ()
    tokens = canonical.split(" ")
    if len(tokens) == 3:
        return canonical, " ".join(tokens[:2])
    return (canonical,)


def _extract_js_string(object_text, field_names):
    """JSON 風と JavaScript 風のどちらのキー表記からも文字列を抜く。"""
    names = "|".join(re.escape(name) for name in field_names)
    pattern = re.compile(
        rf'(?:^|[,{{])\s*["\']?(?:{names})["\']?\s*:\s*'
        r'(?P<value>"(?:\\.|[^"\\])*")'
    )
    match = pattern.search(object_text)
    if not match:
        return None
    try:
        return json.loads(match.group("value"))
    except json.JSONDecodeError:
        return None


def parse_bugs(path, minimum_count=MINIMUM_BUG_COUNT):
    """bugs.js の bug 呼び出しから照合に必要な 3 項目だけを読む。"""
    path = Path(path)
    text = path.read_text(encoding="utf-8")
    bugs = []
    skipped = []
    for match in BUG_CALL_RE.finditer(text):
        object_text = match.group(0)
        bug_id = _extract_js_string(object_text, ("id",))
        japanese_name = _extract_js_string(object_text, ("jaName",))
        scientific_name = _extract_js_string(
            object_text, ("scientificName", "sciName"))
        forms = canonical_forms(scientific_name)
        if bug_id is None or japanese_name is None or not forms:
            # 属名だけの entry (フキバッタ = Parapodisma 等) は種の照合対象にならない。
            # 落とすこと自体は正しいが、黙って総数が減ると「なぜ 2 件足りないのか」を
            # 後から誰も追えなくなる。理由つきで数えて報告へ出す。
            skipped.append({
                "id": bug_id,
                "japanese_name": japanese_name,
                "scientific_name": scientific_name,
                "reason": "属名のみ"
                if scientific_name and len(scientific_name.split()) < 2
                else "id か 和名 か 学名 を読めない",
            })
            continue
        bugs.append({
            "id": bug_id,
            "japanese_name": japanese_name,
            "scientific_name": scientific_name,
            "forms": forms,
        })

    # パーサ破損を「重複なし」と誤報しないため、件数不足は必ず失敗させる。
    if len(bugs) < minimum_count:
        raise ValueError(
            f"{path} から抽出できた虫は {len(bugs)} 件です。"
            f"想定下限 {minimum_count} 件を下回りました"
        )
    parse_bugs.last_skipped = skipped
    return bugs


def load_seeds(path):
    """JSONL を読み取り、照合に必要な項目を検証する。"""
    path = Path(path)
    seeds = []
    for line_number, line in enumerate(
            path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            seed = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(
                f"{path} の {line_number} 行目が正しい JSON ではありません"
            ) from error
        if not isinstance(seed, dict):
            raise ValueError(f"{path} の {line_number} 行目は JSON object ではありません")

        scientific_name = seed.get("scientificName")
        if not canonical_forms(scientific_name):
            raise ValueError(f"{path} の {line_number} 行目に有効な scientificName がありません")
        synonyms = seed.get("synonyms", [])
        if not isinstance(synonyms, list) or not all(
                isinstance(synonym, str) for synonym in synonyms):
            raise ValueError(f"{path} の {line_number} 行目の synonyms が文字列配列ではありません")
        seeds.append(seed)
    return seeds


def _build_exact_index(bugs):
    """同じ虫が亜種形と 2 語形の双方に入ることを許す索引を作る。"""
    index = {}
    for bug in bugs:
        for form in bug["forms"]:
            index.setdefault(form, []).append(bug)
    return index


def _gender_stems(epithet):
    """ラテン語の代表的な性語尾と末尾 1 文字差を比較できる語幹を返す。"""
    stems = set()
    if len(epithet) > 3:
        # signata/signatus のように語尾の長さ自体が違う実例も同じ語幹へ寄せる。
        for ending in ("us", "um", "a"):
            if epithet.endswith(ending):
                stems.add(epithet[:-len(ending)])
        stems.add(epithet[:-1])
    return stems


def _build_gender_index(bugs):
    """属と性語尾を除いた種小名の語幹でレビュー候補を引く。"""
    index = {}
    for bug in bugs:
        genus, epithet = bug["forms"][0].split(" ")[:2]
        for stem in _gender_stems(epithet):
            index.setdefault((genus, stem), []).append(bug)
    return index


def _unique_bugs(candidates):
    """複数 canonical form から引かれた同一 ID を 1 件にまとめる。"""
    unique = []
    seen = set()
    for bug in candidates:
        if bug["id"] in seen:
            continue
        seen.add(bug["id"])
        unique.append(bug)
    return unique


def _exact_matches(names, index):
    """指定した各学名の全 canonical form に一致する虫を返す。"""
    matches = []
    for name in names:
        for form in canonical_forms(name):
            matches.extend(index.get(form, ()))
    return _unique_bugs(matches)


def _gender_matches(names, index):
    """完全一致しない性語尾候補だけを返す。"""
    matches = []
    for name in names:
        forms = canonical_forms(name)
        if not forms:
            continue
        genus, epithet = forms[0].split(" ")[:2]
        for stem in _gender_stems(epithet):
            for bug in index.get((genus, stem), ()):
                bug_epithet = bug["forms"][0].split(" ")[1]
                if bug_epithet != epithet:
                    matches.append(bug)
    return _unique_bugs(matches)


def _public_bug(bug):
    """内部索引を報告へ漏らさず必要な情報だけを返す。"""
    return {
        "id": bug["id"],
        "japaneseName": bug["japanese_name"],
        "scientificName": bug["scientific_name"],
    }


def analyze_seed_file(path, bugs):
    """1 地域を available/rejected/needs_review の排他的 3 状態に分ける。"""
    path = Path(path)
    seeds = load_seeds(path)
    exact_index = _build_exact_index(bugs)
    gender_index = _build_gender_index(bugs)
    rejected_seeds = []
    review_seeds = []
    available = 0

    for seed in seeds:
        scientific_name = seed["scientificName"]
        synonyms = seed.get("synonyms", [])
        matches = _exact_matches((scientific_name,), exact_index)
        reason = "canonical"
        if not matches:
            matches = _exact_matches(synonyms, exact_index)
            reason = "synonym"
        if matches:
            rejected_seeds.append({
                "seedId": seed.get("seedId", ""),
                "scientificName": scientific_name,
                "reason": reason,
                "matches": [_public_bug(bug) for bug in matches],
            })
            continue

        review_matches = _gender_matches((scientific_name,), gender_index)
        review_reason = "canonical"
        if not review_matches:
            review_matches = _gender_matches(synonyms, gender_index)
            review_reason = "synonym"
        if review_matches:
            review_seeds.append({
                "seedId": seed.get("seedId", ""),
                "scientificName": scientific_name,
                "reason": review_reason,
                "matches": [_public_bug(bug) for bug in review_matches],
            })
            continue
        available += 1

    return {
        "region": path.stem,
        "source": str(path),
        "total": len(seeds),
        "available": available,
        "rejected": len(rejected_seeds),
        "needsReview": len(review_seeds),
        "rejectedSeeds": rejected_seeds,
        "reviewSeeds": review_seeds,
    }


def _markdown_cell(value):
    """学名や和名が Markdown 表を壊さないよう最小限にエスケープする。"""
    return str(value).replace("|", "\\|").replace("\n", " ")


def render_markdown(results, bugs_count, skipped=()):
    """地域別集計と要確認明細を Markdown に整形する。"""
    lines = [
        "# 地域 seeds 重複判定報告",
        "",
        f"- bugs.js 抽出件数: **{bugs_count:,}**",
        "- 判定基準: 学名 canonical と synonym（和名は不使用）",
    ]
    if skipped:
        # 抽出件数がカタログ総数より少ない理由を報告に残す。数が合わない報告は、
        # 読む側が「取りこぼしたのか、対象外なのか」を判断できない。
        lines.append(
            f"- 照合対象外: {len(skipped)} 件 "
            + "（" + "、".join(
                f"{item['japanese_name'] or item['id']}: {item['reason']}"
                for item in skipped
            ) + "）"
        )
    lines.append("")
    for result in results:
        lines.extend([
            f"## {result['region']}",
            "",
            f"- 入力: `{result['source']}`",
            "",
            "| 総数 | 使用可能 | rejected | needs_review |",
            "|---:|---:|---:|---:|",
            f"| {result['total']} | {result['available']} | "
            f"{result['rejected']} | {result['needsReview']} |",
            "",
            "### rejected",
            "",
        ])
        if result["rejectedSeeds"]:
            lines.extend([
                "| seed 学名 | bugs.js 学名 | 和名 | 根拠 |",
                "|---|---|---|---|",
            ])
            for seed in result["rejectedSeeds"]:
                for bug in seed["matches"]:
                    lines.append(
                        f"| {_markdown_cell(seed['scientificName'])} | "
                        f"{_markdown_cell(bug['scientificName'])} | "
                        f"{_markdown_cell(bug['japaneseName'])} | {seed['reason']} |"
                    )
        else:
            lines.append("なし")

        lines.extend(["", "### needs_review", ""])
        if result["reviewSeeds"]:
            lines.extend([
                "| seed 学名 | bugs.js 候補学名 | 和名 | 照合元 |",
                "|---|---|---|---|",
            ])
            for seed in result["reviewSeeds"]:
                for bug in seed["matches"]:
                    lines.append(
                        f"| {_markdown_cell(seed['scientificName'])} | "
                        f"{_markdown_cell(bug['scientificName'])} | "
                        f"{_markdown_cell(bug['japaneseName'])} | {seed['reason']} |"
                    )
        else:
            lines.append("なし")
        lines.append("")
    return "\n".join(lines)


def _validate_output_paths(seed_paths, bugs_path, out_path, json_path):
    """出力先の誤指定で読み取り専用入力を上書きしないよう拒否する。"""
    inputs = {Path(path).resolve() for path in seed_paths}
    inputs.add(Path(bugs_path).resolve())
    outputs = [Path(out_path).resolve()]
    if json_path is not None:
        outputs.append(Path(json_path).resolve())
    if any(path in inputs for path in outputs):
        raise ValueError("出力先に seeds または bugs.js と同じパスは指定できません")
    if len(set(outputs)) != len(outputs):
        raise ValueError("Markdown と JSON の出力先は別々に指定してください")


def build_parser():
    """CLI の引数定義を返す。"""
    parser = JapaneseArgumentParser(description="地域 seeds を学名で重複判定します")
    parser.add_argument("--seeds", nargs="+", help="地域 seeds の JSONL（複数可）")
    parser.add_argument("--bugs", help="本編カタログの shared/bugs.js")
    parser.add_argument("--out", help="Markdown 報告の出力先")
    parser.add_argument("--json", dest="json_path", help="任意の JSON 報告出力先")
    return parser


def main(argv=None):
    """CLI を実行し、成功時 0、入力または解析異常時 1 を返す。"""
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.seeds or not args.bugs or not args.out:
        print("エラー: --seeds、--bugs、--out は必須です", file=sys.stderr)
        return 1

    try:
        _validate_output_paths(args.seeds, args.bugs, args.out, args.json_path)
        bugs = parse_bugs(args.bugs, minimum_count=MINIMUM_BUG_COUNT)
        results = [analyze_seed_file(path, bugs) for path in args.seeds]
        report = render_markdown(
            results, len(bugs), getattr(parse_bugs, "last_skipped", ()))

        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(report, encoding="utf-8")
        if args.json_path:
            json_path = Path(args.json_path)
            json_path.parent.mkdir(parents=True, exist_ok=True)
            payload = {"bugsParsed": len(bugs), "regions": results}
            json_path.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
    except (OSError, ValueError) as error:
        print(f"エラー: {error}", file=sys.stderr)
        return 1

    print(f"報告を出力しました: {args.out}", file=sys.stderr)
    if args.json_path:
        print(f"JSON を出力しました: {args.json_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
