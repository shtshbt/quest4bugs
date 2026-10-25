#!/usr/bin/env python3
"""Design simulation for kom_shiki_henkei v0.2.

Generates 5-item sets per Lv following the curriculum rules, validates them,
and measures stage A (single visible cue) and stage B (doc-aware) solvers.
Usage: python3 -I shiki_henkei_design_sim.py [n_sets] [seed] [sample_seed]
Prints stage A / stage B rates per Lv; with sample_seed, also one sample set per Lv
(the set for Lv k uses seed sample_seed + k).
"""
import random
import sys
from collections import Counter

BOX = "□"


def ev(expr):
    """Evaluate a +/- expression left to right; return (value, min_partial)."""
    tokens, num, ops = [], "", []
    for ch in expr:
        if ch.isdigit():
            num += ch
        else:
            tokens.append(int(num)); num = ""; ops.append(ch)
    tokens.append(int(num))
    v, lo = tokens[0], tokens[0]
    for op, t in zip(ops, tokens[1:]):
        v = v + t if op == "+" else v - t
        lo = min(lo, v)
    return v, lo


def ops_of(expr):
    return [ch for ch in expr if ch in "+-"]


def first_num(expr):
    n = ""
    for ch in expr:
        if ch.isdigit():
            n += ch
        elif n:
            break
    return int(n) if n else None


# ---------------------------------------------------------------- two-number
def carry(x, y, kind):
    if kind == "+":
        return (x % 10 + y % 10) >= 10
    return (y % 10) < (x % 10)


def pair_xy(rng, M):
    while True:
        x = rng.randint(2, M - 4)
        y = rng.randint(x + 2, M)
        if x + y <= M + (0 if M == 20 else 0) and y != 2 * x and x + y <= (20 if M == 20 else 100):
            return x, y


def two_item(t, x, y, orient, sf_case=None):
    """t in AB AF SB SF. returns item dict."""
    rev = orient == "rev"
    if t in ("AB", "AF"):
        stem = (f"{x}+{BOX}={y}" if t == "AB" else f"{BOX}+{x}={y}")
        if rev:
            stem = (f"{y}={x}+{BOX}" if t == "AB" else f"{y}={BOX}+{x}")
        opts = [(f"{BOX}={y}-{x}", "correct"), (f"{BOX}={y}+{x}", "keep_op"),
                (f"{BOX}={y}", "copy_other_side"), (f"{BOX}={x}", "copy_neighbor")]
        val, op1, front = y - x, "+", t == "AF"
        nums = [x, y]
    elif t == "SB":
        stem = f"{y}-{BOX}={x}" if not rev else f"{x}={y}-{BOX}"
        opts = [(f"{BOX}={y}-{x}", "correct"), (f"{BOX}={y}+{x}", "invert_overapply"),
                (f"{BOX}={x}", "copy_other_side"), (f"{BOX}={y}", "copy_neighbor")]
        val, op1, front = y - x, "-", False
        nums = [x, y]
    else:  # SF
        a, d = (x, y) if sf_case == "keep" else (y, x)
        stem = f"{BOX}-{a}={d}" if not rev else f"{d}={BOX}-{a}"
        L, S = max(a, d), min(a, d)
        g = "keep_op" if d > a else "minuend_swap"
        opts = [(f"{BOX}={L}+{S}", "correct"), (f"{BOX}={L}-{S}", g),
                (f"{BOX}={d}", "copy_other_side"), (f"{BOX}={a}", "copy_neighbor")]
        val, op1, front = x + y, "-", True
        nums = [a, d]
    return dict(family="two", type=t, orient=orient, stem=stem, opts=opts, val=val,
                op1=op1, front=front, eqfirst=(front and not rev), nums=nums,
                other=None, carry=carry(x, y, "-" if t != "SF" else "+"))


# --------------------------------------------------------------- both sides
def both_params(rng, t, right_op, M=100):
    for _ in range(20000):
        a = rng.randint(2, max(3, M * 6 // 10))
        b = rng.randint(4, max(5, M * 8 // 10))
        c = rng.randint(2, max(3, M * 4 // 10))
        if b - c < 2 or c == a:
            continue
        R = b + c if right_op == "+" else b - c
        Rp = b - c if right_op == "+" else b + c
        if R < 2 or Rp < 2 or R > M or Rp > M:
            continue
        if t in ("AB", "AF", "SF") and not R > a:
            continue
        if t == "SB" and (right_op != "+" or not a > R or a - R < 2):
            continue
        it = both_item(t, a, b, c, right_op, "normal")
        vals = [ev(s.split("=")[1]) for s, _ in it["opts"]]
        if any(lo < 0 or v < 1 or v > M for v, lo in vals) or b > M:
            continue
        if len({v for v, _ in vals}) != 4 or it["val"] < 2:
            continue
        return a, b, c
    raise RuntimeError("no params")


def both_item(t, a, b, c, right_op, orient):
    Rs = f"{b}{right_op}{c}"
    flip = "-" if right_op == "+" else "+"
    Rps = f"{b}{flip}{c}"
    R = ev(Rs)[0]
    lhs = {"AB": f"{a}+{BOX}", "AF": f"{BOX}+{a}", "SB": f"{a}-{BOX}", "SF": f"{BOX}-{a}"}[t]
    stem = f"{lhs}={Rs}" if orient == "normal" else f"{Rs}={lhs}"
    if t in ("AB", "AF"):
        opts = [(f"{BOX}={Rs}-{a}", "correct"), (f"{BOX}={Rs}+{a}", "keep_op"),
                (f"{BOX}={Rps}-{a}", "invert_all"), (f"{BOX}={Rps}+{a}", "invert_wrong_op")]
        val = R - a
    elif t == "SF":
        opts = [(f"{BOX}={Rs}+{a}", "correct"), (f"{BOX}={Rs}-{a}", "keep_op"),
                (f"{BOX}={Rps}+{a}", "invert_all"), (f"{BOX}={Rps}-{a}", "invert_wrong_op")]
        val = R + a
    else:  # SB, right_op '+'
        opts = [(f"{BOX}={a}-{b}-{c}", "correct"), (f"{BOX}={b}+{c}+{a}", "invert_overapply"),
                (f"{BOX}={a}-{b}+{c}", "flip_other_side"), (f"{BOX}={b}-{c}+{a}", "invert_all")]
        val = a - R
    op1 = "+" if t in ("AB", "AF") else "-"
    front = t in ("AF", "SF")
    return dict(family="both", type=t, orient=orient, stem=stem, opts=opts, val=val,
                op1=op1, front=front, eqfirst=(front and orient == "normal"),
                nums=[a, b, c], other=Rs, right_op=right_op, abc=(a, b, c))


# ------------------------------------------------------------------- story
CTX = [("あめ", "こ", "もらって", "たべて", "ありました"),
       ("シール", "まい", "もらって", "あげて", "ありました"),
       ("はな", "本", "さいて", "かれて", "ありました"),
       ("ほん", "さつ", "かって", "あげて", "ありました"),
       ("くるま", "台", "きて", "でていって", "とまって いました")]


def story_item(kind, inc, n1, n2, ctx):
    """kind start/change/result; n1<n2 roles assigned per kind."""
    noun, unit, vi, vd, aru = ctx
    verb = vi if inc else vd
    op = "+" if inc else "-"
    if kind == "start":
        c, r = n1, n2  # r > c
        text = f"{noun}が {BOX} {unit} {aru}。{c} {unit} {verb}、{r} {unit}に なりました。"
        C = f"{BOX}{op}{c}={r}"
        D2 = f"{max(c, r)}{op}{min(c, r)}={BOX}"
        opts = [(C, "correct"), (D2, "unknown_last"), (f"{BOX}={r}", "copy_result"),
                (f"{BOX}={c}", "copy_change")]
        val = r - c if inc else r + c
    elif kind == "change":
        if inc:
            s, r = n1, n2
        else:
            s, r = n2, n1
        text = f"{noun}が {s} {unit} {aru}。{BOX} {unit} {verb}、{r} {unit}に なりました。"
        C = f"{s}{op}{BOX}={r}"
        D = (f"{r}+{s}={BOX}", "unknown_last") if inc else (f"{BOX}-{s}={r}", "unknown_first")
        opts = [(C, "correct"), D, (f"{BOX}={r}", "copy_result"), (f"{BOX}={s}", "copy_start")]
        val = r - s if inc else s - r
    else:
        s, c = n2, n1  # s > c
        text = f"{noun}が {s} {unit} {aru}。{c} {unit} {verb}、{BOX} {unit}に なりました。"
        C = f"{s}{op}{c}={BOX}"
        D3 = f"{BOX}{op}{c}={s}"
        opts = [(C, "correct"), (D3, "unknown_first"), (f"{BOX}={s}", "copy_start"),
                (f"{BOX}={c}", "copy_change")]
        val = s + c if inc else s - c
    return dict(family="story", type=kind, inc=inc, stem=text, opts=opts, val=val, nums=[n1, n2],
                op1=op)


def story_nums(rng, kind):
    while True:
        x = rng.randint(2, 14)
        y = rng.randint(x + 2, 28)
        if y == 2 * x or x + y > 30:
            continue
        return x, y


# ------------------------------------------------------------------- sets
def type_template(rng):
    if rng.random() < 0.5:
        ts = ["AB", "AF", "SB", "SF", rng.choice(["AF", "SB", "SF"])]
    else:
        ts = ["AF", "SB", "SF"] + rng.sample(["AF", "SB", "SF"], 2)
    return ts


LV_SPEC = {
    2: dict(fam="mix", M=20, orients="normal", right_ops="+", sides="normal"),
    3: dict(fam="mix", M=100, orients="normal", right_ops="+", sides="normal"),
    4: dict(fam="mix", M=100, orients="mixed2", right_ops="+", sides="normal"),
    5: dict(fam=["both"] * 5, right_ops="+", sides="normal"),
    6: dict(fam=["both"] * 5, right_ops="pm", sides="normal"),
    7: dict(fam=["both"] * 5, right_ops="pm", sides="rev2"),
    8: dict(fam=["both"] * 5, right_ops="pm", sides="mixed"),
    9: dict(fam=["both"] * 5, right_ops="pm", sides="mixed"),
}


def make_two(rng, t, M, orient):
    while True:
        x, y = pair_xy(rng, M)
        it = two_item(t, x, y, orient, rng.choice(["keep", "swap"]))
        if it["val"] in it["nums"]:
            continue
        return it, (x, y)


def composition(lv, rng):
    """returns list of (family, type) for 5 items, and allowed pair types."""
    if lv in (2, 3, 4):
        r = rng.random()
        two = ["AF", "SB", "SF"] if r < 0.4 else (["AF", "SB", "SB"] if r < 0.7 else ["SF", "SB", "SB"])
        return [("two", t) for t in two] + [("both", "AF"), ("both", "SF")], []
    ts = type_template(rng)
    pairs = [] if lv == 5 else ["P4", "P5", "P6"]
    return [("both", t) for t in ts], pairs


def build_set(lv, rng):
    if lv == 1:
        return build_lv1(rng)
    if lv == 10:
        return build_lv10(rng)
    spec = LV_SPEC[lv]
    for _ in range(2000):
        comp, allowed = composition(lv, rng)
        rng.shuffle(comp)
        ts = [t for _, t in comp]
        fams = [f for f, _ in comp]
        idx = list(range(5))
        # choose pair
        sf = [i for i in idx if ts[i] == "SF"]
        pair = None
        cands = []
        for i in idx:
            for j in sf:
                if i == j or fams[i] != fams[j]:
                    continue
                if fams[i] == "two" and ts[i] in ("AB", "AF", "SB"):
                    cands.append((i, j, "P1" if ts[i] == "AB" else "P2" if ts[i] == "AF" else "P3"))
                if fams[i] == "both" and ts[i] in ("AB", "AF"):
                    cands.append((i, j, "P4"))
                    if spec["right_ops"] == "pm":
                        cands.append((i, j, "P6"))
        if spec.get("right_ops") == "pm":
            for i in idx:
                for j in idx:
                    if i < j and ts[i] == ts[j] and ts[i] in ("AB", "AF", "SF") and fams[i] == fams[j] == "both":
                        cands.append((i, j, "P5"))
        cands = [c for c in cands if c[2] in allowed]
        if allowed and not cands:
            continue
        if cands:
            pi, pj, ptype = rng.choice(cands)
        else:
            pi = pj = None; ptype = None
        items = [None] * 5
        # orientation / side per item
        def orient_for(i):
            if fams[i] == "two":
                if spec["orients"] == "normal":
                    return "normal"
                return rng.choice(["normal", "rev"])
            s = spec["sides"]
            if s == "normal":
                return "normal"
            return rng.choice(["normal", "rev"])
        ok = True
        for i in idx:
            if i in (pi, pj):
                continue
            o = orient_for(i)
            if fams[i] == "two":
                items[i], _ = make_two(rng, ts[i], spec.get("M", 100), o)
            else:
                rop = "+" if (spec["right_ops"] == "+" or ts[i] == "SB") else rng.choice(["+", "-"])
                a, b, c = both_params(rng, ts[i], rop, spec.get("M", 100))
                items[i] = both_item(ts[i], a, b, c, rop, o)
        # pair
        if pi is None:
            pass
        elif fams[pi] == "two":
            M = spec.get("M", 100)
            while True:
                x, y = pair_xy(rng, M)
                case = rng.choice(["keep", "swap"])
                i1 = two_item(ts[pi], x, y, orient_for(pi), None)
                i2 = two_item("SF", x, y, orient_for(pj), case)
                if i1["val"] in i1["nums"]:
                    continue
                if sorted(s for s, _ in i1["opts"]) != sorted(s for s, _ in i2["opts"]):
                    continue
                break
        else:
            for _ in range(5000):
                rop = "+" if spec["right_ops"] == "+" else rng.choice(["+", "-"])
                try:
                    a, b, c = both_params(rng, ts[pi], rop)
                except RuntimeError:
                    continue
                if ptype == "P4":
                    i1 = both_item(ts[pi], a, b, c, rop, orient_for(pi))
                    i2 = both_item("SF", a, b, c, rop, orient_for(pj))
                elif ptype == "P6":
                    i1 = both_item(ts[pi], a, b, c, rop, orient_for(pi))
                    i2 = both_item("SF", a, b, c, "-" if rop == "+" else "+", orient_for(pj))
                else:
                    i1 = both_item(ts[pi], a, b, c, rop, orient_for(pi))
                    i2 = both_item(ts[pj], a, b, c, "-" if rop == "+" else "+", orient_for(pj))
                if not (valid(i1) and valid(i2)):
                    continue
                if sorted(s for s, _ in i1["opts"]) != sorted(s for s, _ in i2["opts"]):
                    continue
                break
            else:
                ok = False
        if not ok:
            continue
        if pi is None:
            seq = items[:]
            rng.shuffle(seq)
        else:
            pid = rng.random()
            i1["pair"], i2["pair"] = (ptype, pid), (ptype, pid)
            items[pi], items[pj] = i1, i2
            rest = [items[i] for i in idx if i not in (pi, pj)]
            rng.shuffle(rest)
            pr = [i1, i2]
            rng.shuffle(pr)
            pos = rng.randint(0, 3)
            seq = rest[:pos] + pr + rest[pos:]
        if not set_rules_ok(lv, seq):
            continue
        for it in seq:
            o = it["opts"][:]
            rng.shuffle(o)
            it["shown"] = o
            it["ans"] = [k for k, (s, t) in enumerate(o) if t == "correct"][0]
            it.setdefault("pair", None)
        return seq
    raise RuntimeError(f"cannot build lv{lv}")


def valid(it):
    for s, t in it["opts"]:
        rhs = s.split("=")[1]
        if any(ch.isdigit() for ch in rhs) and BOX not in rhs:
            v, lo = ev(rhs)
            if lo < 0 or v < 1 or v > 100:
                return False
    return True


def set_rules_ok(lv, seq):
    for it in seq:
        if not valid(it):
            return False
        if it["family"] == "two" and it["val"] in it["nums"]:
            return False
    stems = [it["stem"] for it in seq]
    if len(set(stems)) != 5:
        return False
    types = Counter(it["type"] for it in seq)
    if lv >= 5 and not (1 <= types["AF"] <= 2 and 1 <= types["SB"] <= 2 and 1 <= types["SF"] <= 2 and types["AB"] <= 1):
        return False
    two = [it for it in seq if it["family"] == "two"]
    both = [it for it in seq if it["family"] == "both"]
    if lv == 2 and any(max(ev(rhs(o))[0] for o, _ in it["opts"] if any(ch in "+-" for ch in rhs(o))) > 20 for it in seq):
        return False
    if lv == 3 and sum(it["carry"] for it in two) < 2:
        return False
    if lv == 4:
        if sum(it["carry"] for it in two) < 2:
            return False
        o = Counter(it["orient"] for it in two)
        if o["rev"] < 1 or o["normal"] < 1:
            return False
    if lv in (6, 7, 8, 9) and not any(it["right_op"] == "-" for it in both):
        return False
    if lv == 7:
        o = Counter(it["orient"] for it in both)
        if o["rev"] < 2 or o["normal"] < 1:
            return False
    if lv in (8, 9):
        o = Counter(it["orient"] for it in both)
        if o["rev"] < 1 or o["normal"] < 1:
            return False
    # adjacent pattern ids differ (type+orient+family+rightop)
    def pid(it):
        return (it["family"], it["type"], it.get("orient"))
    for a, b in zip(seq, seq[1:]):
        if pid(a) == pid(b) and not (a.get("pair") and a.get("pair") == b.get("pair")):
            return False
    return True


def build_lv1(rng):
    while True:
        seq = []
        ops = ["+", "+", "-", "-", rng.choice("+-")]
        sides = ["r", "r", "l", "l", rng.choice("rl")]
        rng.shuffle(ops); rng.shuffle(sides)
        for op, side in zip(ops, sides):
            while True:
                a = rng.randint(11, 89)
                b = rng.choice([rng.randint(2, 9), rng.randint(11, 89)])
                if op == "+":
                    if a % 10 + b % 10 > 9 or (a // 10 + b // 10) > 9 or a + b > 99:
                        continue
                    v = a + b
                else:
                    if b >= a or a % 10 < b % 10 or (b >= 10 and a // 10 < b // 10) or a - b < 2:
                        continue
                    v = a - b
                break
            stem = f"{BOX}={a}{op}{b}" if side == "r" else f"{a}{op}{b}={BOX}"
            seq.append(dict(family="intro", type=op, stem=stem, val=v, nums=[a, b], pair=None))
        # pair P0: make items 0 and 1 share numbers with different ops
        i, j = [k for k, it in enumerate(seq) if it["type"] == "+"][0], [k for k, it in enumerate(seq) if it["type"] == "-"][0]
        a, b = seq[j]["nums"]
        if a % 10 + b % 10 > 9 or a // 10 + b // 10 > 9:
            continue
        side = "r" if seq[i]["stem"].startswith(BOX) else "l"
        seq[i] = dict(family="intro", type="+", stem=(f"{BOX}={a}+{b}" if side == "r" else f"{a}+{b}={BOX}"),
                      val=a + b, nums=[a, b], pair=("P0", 1))
        seq[j]["pair"] = ("P0", 1)
        a1 = seq.pop(max(i, j)); a0 = seq.pop(min(i, j))
        pr = [a0, a1]; rng.shuffle(pr)
        pos = rng.randint(0, 3)
        seq = seq[:pos] + pr + seq[pos:]
        return seq


def build_lv10(rng):
    while True:
        inc = rng.random() < 0.5
        ctx = rng.choice(CTX)
        x, y = story_nums(rng, "start")
        p1 = story_item("start", inc, x, y, ctx)
        p2 = story_item("result", inc, x, y, ctx)
        if sorted(s for s, _ in p1["opts"]) != sorted(s for s, _ in p2["opts"]):
            continue
        pid = rng.random()
        p1["pair"] = p2["pair"] = ("P7" if inc else "P8", pid)
        rest = []
        for kind in ("start", "result"):
            xx, yy = story_nums(rng, kind)
            rest.append(story_item(kind, not inc, xx, yy, rng.choice(CTX)))
        if rng.random() < 0.5:
            kind, d = "change", rng.random() < 0.5
        else:
            kind, d = rng.choice(["start", "result"]), rng.random() < 0.5
        xx, yy = story_nums(rng, kind)
        rest.append(story_item(kind, d, xx, yy, rng.choice(CTX)))
        rng.shuffle(rest)
        pr = [p1, p2]; rng.shuffle(pr)
        pos = rng.randint(0, 3)
        seq = rest[:pos] + pr + rest[pos:]
        bad = any((u["type"], u["inc"]) == (v["type"], v["inc"]) or u["stem"][:3] == v["stem"][:3] and not (u.get("pair") and u.get("pair") == v.get("pair")) for u, v in zip(seq, seq[1:]))
        for it in seq:
            it.setdefault("pair", None)
            vals = set()
            for s, t in it["opts"]:
                if s.startswith(BOX + "=") and BOX not in s[2:]:
                    vals.add(int(s[2:]))
            if it["val"] in vals or it["val"] < 2 or it["val"] > 30:
                bad = True
        if bad:
            continue
        for it in seq:
            o = it["opts"][:]; rng.shuffle(o)
            it["shown"] = o
            it["ans"] = [k for k, (s, t) in enumerate(o) if t == "correct"][0]
        return seq


# ------------------------------------------------------------------ solvers
def pick(rng, cands, it):
    if not cands:
        cands = list(range(4))
    return rng.choice(cands)


def rhs(s):
    return s.split("=", 1)[1]


def is_expr(s):
    return any(ch in "+-" for ch in rhs(s))


def last_op(s):
    o = ops_of(rhs(s))
    return o[-1] if o else None


def stage_a(it, rng):
    sh = [s for s, _ in it["shown"]]
    n = range(4)
    stem_nums = [int(t) for t in "".join(ch if ch.isdigit() else " " for ch in it["stem"]).split()]
    big = max(stem_nums)
    stem_ops = Counter(ops_of(it["stem"]))
    out = {}
    out["A1a 引く肢"] = pick(rng, [k for k in n if "-" in rhs(sh[k])], it)
    out["A1b 最後が引く"] = pick(rng, [k for k in n if last_op(sh[k]) == "-"], it)
    out["A2a たすだけ"] = pick(rng, [k for k in n if is_expr(sh[k]) and "-" not in rhs(sh[k])], it)
    out["A2b 最後がたす"] = pick(rng, [k for k in n if last_op(sh[k]) == "+"], it)
    out["A3 演算そのまま"] = pick(rng, [k for k in n if last_op(sh[k]) == it["op1"]], it)
    out["A3b 演算の組そのまま"] = pick(rng, [k for k in n if Counter(ops_of(rhs(sh[k]))) == stem_ops], it)
    out["A4 ぎゃくの演算"] = pick(rng, [k for k in n if last_op(sh[k]) and last_op(sh[k]) != it["op1"]], it)
    want = "+" if it["front"] else "-"
    out["A5 □まえならたす"] = pick(rng, [k for k in n if last_op(sh[k]) == want], it)
    out["A6 □まえならひく"] = pick(rng, [k for k in n if last_op(sh[k]) and last_op(sh[k]) != want], it)
    wante = "+" if it.get("eqfirst") else "-"
    out["A5e □が式頭ならたす"] = pick(rng, [k for k in n if last_op(sh[k]) == wante], it)
    out["A7 大きい数から"] = pick(rng, [k for k in n if first_num(rhs(sh[k])) == big], it)
    out["A8 位置固定"] = 0
    if it["family"] == "two":
        other = it["stem"].split("=")[1] if it["stem"].index(BOX) < it["stem"].index("=") else it["stem"].split("=")[0]
        out["A9 むこうを写す"] = pick(rng, [k for k in n if rhs(sh[k]) == other], it)
    else:
        out["A9 むこうを写す"] = pick(rng, [k for k in n if it["other"] in rhs(sh[k])], it)
    return out


def filt_b(it):
    sh = [s for s, _ in it["shown"]]
    if it["family"] == "two":
        return [k for k in range(4) if is_expr(sh[k])]
    return [k for k in range(4) if it["other"] in rhs(sh[k])]


def cue_rules(it, cands):
    sh = [s for s, _ in it["shown"]]
    want_front = "+" if it["front"] else "-"
    r = {}
    r["いつも引く"] = [k for k in cands if last_op(sh[k]) == "-" or (sh[k].count("-") >= 2)]
    r["いつもたす"] = [k for k in cands if last_op(sh[k]) == "+" and sh[k].count("-") < 2]
    r["ぎゃく"] = [k for k in cands if (last_op(sh[k]) != it["op1"]) and not (it["type"] == "SB" and it["family"] == "both" and sh[k].count("-") >= 2)]
    r["そのまま"] = [k for k in cands if k not in r["ぎゃく"]]
    r["□まえ+"] = [k for k in cands if (last_op(sh[k]) == want_front) and not (it["family"] == "both" and it["type"] == "SB" and sh[k].count("-") >= 2 and want_front == "+")]
    r["□まえ-"] = [k for k in cands if k not in r["□まえ+"]]
    return r


def run(lv, n_sets, seed):
    rng = random.Random(seed)
    srng = random.Random(seed + 7)
    A = Counter(); B = Counter(); total = 0
    for _ in range(n_sets):
        seq = build_set(lv, rng)
        prev_correct = {}
        for idx, it in enumerate(seq):
            total += 1
            if lv == 1:
                a, b = it["nums"]
                A["L1 いつもたす"] += (a + b) == it["val"]
                A["L2 大きい数から引く"] += (max(a, b) - min(a, b)) == it["val"]
                A["L3 最初の数"] += a == it["val"]
                B["L1 いつもたす (+ペア)"] += (a + b) == it["val"]
                continue
            sh = [s for s, _ in it["shown"]]
            if lv == 10:
                def shape(s):
                    if s.startswith(BOX + "=") and BOX not in s[2:]:
                        return "single"
                    if s.startswith(BOX):
                        return "first"
                    if s.endswith(BOX):
                        return "last"
                    return "mid"
                shp = [shape(s) for s in sh]
                ns = [k for k in range(4) if shp[k] != "single"]
                q = {"Q1 □がはじめ": [k for k in ns if shp[k] == "first"],
                     "Q2 □がさいご": [k for k in ns if shp[k] == "last"],
                     "Q3 さいご以外": [k for k in ns if shp[k] != "last"],
                     "Q4 はじめ以外": [k for k in ns if shp[k] != "first"],
                     "Q5 まんなか": [k for k in ns if shp[k] == "mid"],
                     "Q6 動詞の演算": [k for k in ns if ("+" in sh[k]) == it["inc"]],
                     "Q8 数だけの肢": [k for k in range(4) if shp[k] == "single"]}
                for name, cands in q.items():
                    if name == "Q5 まんなか" and not cands:
                        cands = ns
                    A[name] += srng.choice(cands or list(range(4))) == it["ans"]
                A["A8 位置固定"] += it["ans"] == 0
                # stage B: best shape rule + pair inference
                for name, cands in q.items():
                    c = cands or ns
                    if it["pair"] and it["pair"][1] in prev_correct:
                        c = [k for k in ns if sh[k] != prev_correct[it["pair"][1]]]
                    B["B " + name + " +ペア"] += srng.choice(c or ns) == it["ans"]
                if it["pair"]:
                    prev_correct[it["pair"][1]] = sh[it["ans"]]
                continue
            for name, k in stage_a(it, srng).items():
                A[name] += k == it["ans"]
            f = filt_b(it)
            B["B0 形でしぼって無作為"] += srng.choice(f) == it["ans"]
            cr = cue_rules(it, f)
            for name, c in cr.items():
                cc = c or f
                if it["pair"] and it["pair"][1] in prev_correct:
                    left = [k for k in cc if sh[k] != prev_correct[it["pair"][1]]]
                    left2 = [k for k in f if sh[k] != prev_correct[it["pair"][1]]]
                    cc = left if left else left2
                B["B " + name + " +ペア"] += srng.choice(cc or f) == it["ans"]
            if it["pair"]:
                prev_correct[it["pair"][1]] = sh[it["ans"]]
    return {k: v / total for k, v in A.items()}, {k: v / total for k, v in B.items()}


def show_set(lv, seed):
    rng = random.Random(seed)
    seq = build_set(lv, rng)
    lines = []
    for k, it in enumerate(seq, 1):
        if lv == 1:
            lines.append(f"{k}. {it['stem']}  正答 {it['val']}  pair={it['pair'][0] if it['pair'] else '-'}")
            continue
        opts = "  ".join(f"{'ABCD'[i]}. {s} ({t})" for i, (s, t) in enumerate(it["shown"]))
        tag = f"{it['family']}/{it['type']}/{it.get('orient', '')}/{it.get('right_op', '')}"
        if lv == 10:
            tag = f"story/{it['type']}/{'inc' if it['inc'] else 'dec'}"
        lines.append(f"{k}. [{tag}] pair={it['pair'][0] if it['pair'] else '-'} val={it['val']}\n   {it['stem']}\n   {opts}")
    return "\n".join(lines)


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 2000
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    for lv in range(1, 11):
        a, b = run(lv, n, seed + lv)
        amax = max(a.items(), key=lambda kv: kv[1])
        bmax = max(b.items(), key=lambda kv: kv[1])
        print(f"Lv{lv}: A_max={amax[1]:.3f} ({amax[0]})  B_max={bmax[1]:.3f} ({bmax[0]})")
        print("   A:", ", ".join(f"{k}={v:.2f}" for k, v in sorted(a.items())))
        print("   B:", ", ".join(f"{k}={v:.2f}" for k, v in sorted(b.items())))
    if len(sys.argv) > 3:
        for lv in range(1, 11):
            print(f"\n=== Lv{lv} sample ===")
            print(show_set(lv, int(sys.argv[3]) + lv))
