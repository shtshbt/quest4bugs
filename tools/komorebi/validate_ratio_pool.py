"""Validate the kom_ratio static pools against docs/komorebi_ratio_curriculum.md 7 章.

The pools are authored by hand, so every rule the curriculum states is checked
mechanically here before the data ships: schema shape, id and level agreement,
the ordering chain being single and uniquely ordered, diagnosis labels matching
what the work actually does, the canonical choice wording, and the numeric
constraints.

Run:
    python3 tools/komorebi/validate_ratio_pool.py komorebi/data/*.json
"""

import argparse
import json
import re
import sys
from itertools import permutations
from pathlib import Path

CURRICULUM = Path(__file__).resolve().parents[2] / "docs" / "komorebi_ratio_curriculum.md"

ORDER_KEYS = {"id", "lv", "kind", "text", "parts", "ans", "explanation"}
DIAGNOSIS_KEYS = {"id", "lv", "kind", "text", "work", "choices", "ans",
                  "errorType", "explanation"}
CORRECT_TYPES = {"correct", "correct_alternative"}
# 式は行頭とは限らず、日本語の前置きや単位を伴う (「残りは 1-3/7=4/7」「270÷0.6=450円」)。
# 単位は式の途中にも現れる (「10割-3割=7割」)。数の直後に付く単位語だけを許す。
UNITS = "割分枚円人本個"
EQUATION = re.compile(r"([0-9][0-9./×÷+\-*() " + UNITS + r"]*?)\s*=\s*([0-9./]+)")
BANNED_TEXT = re.compile(r"[—–]|\*\*|--")
# 変換部品は = を持たないが値を産む。書式は 2 通り: 「2割 → 0.2」と「20%増しは ×1.2」。
CONVERSION = re.compile(r"(?:→|×)\s*([0-9./]+)\s*$")


def part_output(part):
    """The token a part hands to the next one, from an equation or a conversion.

    The literal token is kept rather than its value: fractions are written as
    4/7 in the following part, and matching on the evaluated 0.571 would miss.
    """
    found = EQUATION.findall(part)
    if found:
        return found[-1][1]
    match = CONVERSION.search(part)
    return match.group(1) if match else None


def mentions(part, token):
    """Is the token used as a whole number in this part?

    Plain substring matching gives false positives: the 6 produced by one part
    is found inside 60% and 0.6 in another, which invents extra valid orders.
    """
    if token is None:
        return False
    return re.search(r"(?<![\d.])" + re.escape(token) + r"(?![\d.])", part) is not None


def canonical_labels():
    """Read the errorType-to-wording table out of the curriculum itself.

    Keeping the single source of truth in the document means a wording change
    there cannot silently diverge from the data.
    """
    labels = {}
    for line in CURRICULUM.read_text(encoding="utf-8").splitlines():
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) == 2 and re.fullmatch(r"[a-z_]+", cells[0]):
            labels[cells[0]] = cells[1]
    return labels


def evaluate(expression):
    """Evaluate an arithmetic expression written the way the pools write them."""
    text = expression.replace("×", "*").replace("÷", "/")
    for unit in UNITS:
        text = text.replace(unit, "")
    if not re.fullmatch(r"[0-9./*+\-() ]+", text):
        return None
    try:
        return eval(text, {"__builtins__": {}}, {})  # noqa: S307 - digits and operators only
    except (SyntaxError, ZeroDivisionError, TypeError):
        return None


def close(a, b, tolerance=1e-9):
    return a is not None and b is not None and abs(a - b) <= tolerance


def check_common(item, problems):
    if not isinstance(item.get("lv"), int) or not 1 <= item["lv"] <= 10:
        problems.append("lv が 1..10 でない")
    for field in ("text", "explanation"):
        value = item.get(field, "")
        if not isinstance(value, str) or not value.strip():
            problems.append(f"{field} が空")
        elif BANNED_TEXT.search(value):
            problems.append(f"{field} にダッシュか強調記法が混入")


def check_ordering(item, problems):
    if set(item) != ORDER_KEYS:
        problems.append(f"キー不一致 {sorted(set(item) ^ ORDER_KEYS)}")
        return
    parts, answer = item.get("parts"), item.get("ans")
    if not isinstance(parts, list) or not 3 <= len(parts) <= 4:
        problems.append("部品が 3 個以上 4 個以下でない")
        return
    if answer != list(range(len(parts))):
        problems.append("ans が正順の恒等列でない")
    values = []
    for part in parts:
        for left, right in EQUATION.findall(part):
            if not close(evaluate(left), evaluate(right)):
                problems.append(f"式が成り立たない: {part}")
        values.append(part_output(part))
    # 一意性 (curriculum 6.2)。前向きの鎖が繋がるだけでは足りない: 単位分数の値が
    # 分母と数値衝突すると別の順序も鎖として成立してしまうため、全順列を評価して
    # 成立する並びが正順ただ 1 つであることを確かめる。
    for index in range(1, len(parts)):
        previous = values[index - 1]
        if previous is None:
            continue
        if not mentions(parts[index], previous):
            problems.append(f"部品 {index + 1} が直前の出力 {previous} を使っていない")
    valid = [order for order in permutations(range(len(parts)))
             if _chains(order, parts, values)]
    if valid != [tuple(range(len(parts)))]:
        others = [list(order) for order in valid if list(order) != answer]
        problems.append(f"順序が一意でない (ほかに成立する並び {others})")


def _chains(order, parts, values):
    """Does this order form a single chain, each step consuming the previous output?"""
    for position in range(1, len(order)):
        previous = values[order[position - 1]]
        if previous is None:
            return False
        if not mentions(parts[order[position]], previous):
            return False
    return True


def check_diagnosis(item, labels, problems):
    if set(item) != DIAGNOSIS_KEYS:
        problems.append(f"キー不一致 {sorted(set(item) ^ DIAGNOSIS_KEYS)}")
        return
    choices, answer = item.get("choices"), item.get("ans")
    if not isinstance(choices, list) or len(choices) != 4:
        problems.append("選択肢が 4 個でない")
        return
    if len(set(choices)) != 4:
        problems.append("選択肢に重複がある")
    if not isinstance(answer, int) or not 0 <= answer < 4:
        problems.append("ans が選択肢の範囲外")
        return
    unknown = [choice for choice in choices if choice not in labels.values()]
    if unknown:
        problems.append(f"canonical 文言表にない選択肢 {unknown}")
    error_type = item.get("errorType")
    if error_type not in labels:
        problems.append(f"未知の errorType {error_type}")
    elif labels[error_type] != choices[answer]:
        problems.append(f"errorType と正解選択肢が不一致 ({error_type} / {choices[answer]})")
    if {labels.get("correct"), labels.get("correct_alternative")} <= set(choices):
        problems.append("correct と correct_alternative が同居している")
    if not isinstance(item.get("work"), list) or not item["work"]:
        problems.append("work が空")
        return
    # ラベルと中身の一致: 計算だけの誤りは式が崩れ、それ以外は式自体は成り立つ
    broken = []
    for line in item["work"]:
        for left, right in EQUATION.findall(line):
            if not close(evaluate(left), evaluate(right)):
                broken.append(f"{left}={right}")
    if error_type == "calc_only" and not broken:
        problems.append("calc_only なのに崩れた式がない")
    if error_type in CORRECT_TYPES and broken:
        problems.append(f"正答案なのに式が崩れている {broken}")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Validate kom_ratio static pools")
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args(argv)

    labels = canonical_labels()
    if "correct" not in labels:
        print("canonical 文言表を curriculum から読めません", file=sys.stderr)
        return 2

    seen_ids, failures, counts = {}, 0, {"order": 0, "choice": 0}
    correct_by_lv = {}
    for path in args.paths:
        for item in json.loads(path.read_text(encoding="utf-8")):
            problems = []
            item_id = item.get("id", "(id なし)")
            if item_id in seen_ids:
                problems.append(f"id 重複 ({seen_ids[item_id]})")
            seen_ids[item_id] = path.name
            check_common(item, problems)
            kind = item.get("kind")
            if kind == "order":
                check_ordering(item, problems)
            elif kind == "choice":
                check_diagnosis(item, labels, problems)
                bucket = correct_by_lv.setdefault(item.get("lv"), [0, 0])
                bucket[1] += 1
                if item.get("errorType") in CORRECT_TYPES:
                    bucket[0] += 1
            else:
                problems.append(f"未知の kind {kind}")
            counts[kind] = counts.get(kind, 0) + 1
            if problems:
                failures += 1
                print(f"NG {item_id} ({path.name})")
                for problem in problems:
                    print(f"     {problem}")

    print(f"\n検査 {sum(counts.values())} 問 (整列 {counts.get('order', 0)} / "
          f"診断 {counts.get('choice', 0)})、NG {failures} 問")
    for lv in sorted(correct_by_lv):
        good, total = correct_by_lv[lv]
        share = good / total * 100
        limit = 35 if lv == 9 else 30
        flag = "" if 20 <= share <= limit else "  ← 規定 20 から " + str(limit) + "% の外"
        print(f"  Lv{lv} 正答案 {good}/{total} ({share:.1f}%){flag}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
