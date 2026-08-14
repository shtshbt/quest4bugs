"""Run static and headless checks for the battle feedback presenter.

Usage: python tests/battle_feedback/test_battle_feedback.py
"""

import re
import sys
from pathlib import Path
from typing import Callable

from harness import (
    REPO_ROOT,
    boot_battle,
    fx,
    inject_question,
    install_spies,
    reset_spies,
    serve_repo_root,
    set_timing,
)


FAST_ANTICIPATION = 20
FAST_IMPACT = 40
FAST_HP = 120
FAST_BANNER = 200
FAST_NEXT = 300
FAST_DRAMATIC = 60
WAIT_MARGIN = 300
QUESTION_TEXT = "「あ」を えらぼう"


class CheckResults:
    """Track and print individual assertion results."""

    def __init__(self) -> None:
        self.passed = 0
        self.failed = 0

    def assert_that(self, condition: bool, message: str) -> None:
        if condition:
            self.passed += 1
            print(f"PASS: {message}")
        else:
            self.failed += 1
            print(f"FAIL: {message}")


RESULTS = CheckResults()


def assert_that(condition: bool, message: str) -> None:
    """Record one check without aborting the remaining scenarios."""

    RESULTS.assert_that(condition, message)


def check_static_contract() -> None:
    """Check presenter ownership and the production timing defaults."""

    battle_path = REPO_ROOT / "battle.html"
    try:
        source = battle_path.read_text(encoding="utf-8")
    except OSError as exc:
        assert_that(False, f"static: read battle.html ({exc})")
        return

    match = re.search(
        r"function\s+answer\s*\(c\)\s*\{(?P<body>.*?)(?=\nfunction\s)",
        source,
        re.DOTALL,
    )
    assert_that(match is not None, "static: answer(c) body is extractable")
    if match:
        body = match.group("body")
        assert_that(
            body.count("presentBattleOutcome(") >= 1,
            "Must 1: answer delegates to presentBattleOutcome",
        )
        assert_that("setTimeout" not in body, "Must 1: answer owns no timers")
        forbidden = ["slashOn(", "floatDmg(", "sceneFlash(", "setHp(", "traitFx(", "log("]
        direct = [name for name in forbidden if name in body]
        assert_that(not direct, f"Must 1: answer owns no direct feedback calls ({direct})")

    assert_that(
        source.count("setTimeout(nextQuestion") == 0,
        "Must 1: no direct setTimeout(nextQuestion call remains",
    )
    timing = re.search(
        r"var\s+BATTLE_FEEDBACK_TIMING\s*=\s*\{(?P<body>[^}]*)\}",
        source,
        re.DOTALL,
    )
    assert_that(timing is not None, "Must 4: timing object exists")
    if timing:
        timing_body = timing.group("body")
        defaults = {
            "anticipationMs": 140,
            "impactDelayMs": 260,
            "hpDelayMs": 700,
            "bannerDurationMs": 1850,
            "nextQuestionDelayMs": 2050,
            "dramaticExtraMs": 300,
        }
        for name, value in defaults.items():
            found = re.search(rf"\b{name}\s*:\s*{value}\b", timing_body)
            assert_that(found is not None, f"Must 4: {name} defaults to {value}")
        assert_that(
            defaults["nextQuestionDelayMs"] + defaults["dramaticExtraMs"] <= 2400,
            "Must 4: the dramatic turn stays within 2400ms",
        )

    table = re.search(
        r"var\s+BATTLE_OUTCOME_TABLE\s*=\s*\{(?P<body>.*?)\n\};\nvar\s+BATTLE_OUTCOME_GRADE",
        source,
        re.DOTALL,
    )
    assert_that(table is not None, "Must 1: four-outcome table exists")
    if table:
        keys = re.findall(r"^\s*(attack_hit|attack_miss|defense_guard|defense_hit)\s*:", table.group("body"), re.MULTILINE)
        assert_that(len(keys) == 4 and len(set(keys)) == 4, "Must 1: four-outcome table keeps exactly four keys")

    grade = re.search(
        r"var\s+BATTLE_OUTCOME_GRADE\s*=\s*\{(?P<body>.*?)\n\};",
        source,
        re.DOTALL,
    )
    assert_that(grade is not None, "Phase 2: grade table exists")
    if grade:
        for key, cracks in (("adv", 0), ("neu", 2), ("dis", 3)):
            found = re.search(rf"\b{key}\s*:\s*\{{[^}}]*\bcracks\s*:\s*{cracks}\b", grade.group("body"))
            assert_that(found is not None, f"Phase 1/2: {key} grade has {cracks} shield cracks")


def call_count(entries: list[dict], name: str) -> int:
    return sum(entry["n"] == name for entry in entries)


def first_call(entries: list[dict], names: set[str]) -> dict | None:
    return next((entry for entry in entries if entry["n"] in names), None)


def prepare_page(browser: object, base_url: str, fast_timing: bool = True) -> object:
    """Create and deterministically boot one isolated battle page.

    Service workers are blocked: shared/storage.js registers sw.js and reloads
    the page on controllerchange, which would tear the scenario down mid-run.
    """

    context = browser.new_context(service_workers="block")
    page = context.new_page()
    page.goto(f"{base_url}/battle.html", wait_until="load")
    boot = boot_battle(page)
    if boot.get("party") != 3:
        page.close()
        raise RuntimeError(f"Deterministic boot produced {boot.get('party')} party members")
    if fast_timing:
        set_timing(
            page,
            FAST_ANTICIPATION,
            FAST_IMPACT,
            FAST_HP,
            FAST_BANNER,
            FAST_NEXT,
            FAST_DRAMATIC,
        )
    return page


def submit_atomically(page: object, outcome: str, choice: str) -> dict:
    """Submit once and capture all presentation-window invariants atomically."""

    return page.evaluate(
        """
        ([outcome,choice]) => {
          window.__t0=performance.now();
          var hpId=st.phase==="attack" ? "bossHpT" : "meHpT";
          var effectiveness=(outcome==="attack_hit"||outcome==="defense_guard")
            ? B.advLabel(activeM().type,currentBossType()) : null;
          var gradeKey=battleOutcomeGradeKey(effectiveness);
          var expectedMessage=outcome==="attack_hit" ? BATTLE_OUTCOME_GRADE[gradeKey].atkMsg
            : outcome==="attack_miss" ? "からぶり…"
            : outcome==="defense_guard" ? BATTLE_OUTCOME_GRADE[gradeKey].defMsg
            : "まもれなかった…";
          var dramatic=outcome==="defense_hit"||(outcome==="attack_hit"&&gradeKey==="adv");
          var initialIdx=st.idx;
          var other=st.party.findIndex(function(m,i){return i!==st.idx && m.hp>0;});
          var hpTextBeforeAnswer=document.getElementById(hpId).textContent;
          answer(choice);
          var banner=document.getElementById("turnBanner");
          var result={
            bannerClass:Array.prototype.slice.call(banner.classList),
            bannerMessage:(banner.querySelector(".ob-msg")||{}).textContent||"",
            expectedMessage:expectedMessage,
            expectedNextDelay:BATTLE_FEEDBACK_TIMING.nextQuestionDelayMs
              +(dramatic?BATTLE_FEEDBACK_TIMING.dramaticExtraMs:0),
            busy:st.busy,
            inWindow:inPresentationWindow(),
            hpTextBeforeAnswer:hpTextBeforeAnswer,
            hpTextAtSubmit:document.getElementById(hpId).textContent,
            hpId:hpId,
            initialIdx:initialIdx,
            otherIdx:other,
            stateHp:st.phase==="attack" ? st.bossHp : st.party[st.idx].hp,
            stateMax:st.phase==="attack" ? st.bossMax : st.party[st.idx].max,
            t0:window.__t0
          };
          swapTo(other);
          result.idxAfterBlockedSwap=st.idx;
          result.fxBeforeSecond=window.__fx.length;
          answer("あ");
          result.fxAfterSecond=window.__fx.length;
          result.motionAtSubmit=window.__fx.some(function(e){
            return e.n==="slashOn"||e.n==="missOn"||e.n==="guardOn";
          });
          return result;
        }
        """,
        [outcome, choice],
    )


def visual_snapshot(page: object) -> dict:
    """Read the held feedback DOM without changing the presentation."""

    return page.evaluate(
        """
        () => {
          var banner=document.getElementById("turnBanner");
          var damage=document.querySelector(".dmg-float");
          var shield=document.querySelector(".guard-pop");
          var cracks=shield ? Array.prototype.filter.call(
            shield.querySelectorAll(".shield-crack"),
            function(el){return getComputedStyle(el).display!=="none";}
          ).length : 0;
          var scene=document.querySelector("#battle .bt-scene");
          return {
            bannerClass:Array.prototype.slice.call(banner.classList),
            bannerMessage:(banner.querySelector(".ob-msg")||{}).textContent||"",
            damageClass:damage?Array.prototype.slice.call(damage.classList):[],
            damageText:damage?damage.textContent:"",
            damageFontSize:damage?parseFloat(getComputedStyle(damage).fontSize):0,
            damageShadow:damage?getComputedStyle(damage).textShadow:"",
            hasShield:!!shield,
            cracks:cracks,
            hasBurst:!!document.querySelector(".burst-pop"),
            hasDodge:!!document.querySelector(".dodge-slip"),
            hasMiss:!!document.querySelector(".slash.miss"),
            sceneFlash:document.getElementById("btFlash").classList.contains("go"),
            sceneQuake:scene.classList.contains("impact-quake")
          };
        }
        """
    )


def check_immediate(outcome: str, immediate: dict) -> None:
    prefix = f"{outcome} immediate"
    assert_that(f"ob-{outcome}" in immediate["bannerClass"], f"Must 2/3: {prefix} banner class")
    assert_that(
        immediate["bannerMessage"] == immediate["expectedMessage"],
        f"Must 2/3: {prefix} banner message",
    )
    assert_that(immediate["busy"] is True, f"Must 5a: {prefix} sets busy")
    assert_that(immediate["inWindow"] is True, f"Must 5a: {prefix} opens shared window")
    assert_that(
        immediate["hpTextAtSubmit"] == immediate["hpTextBeforeAnswer"],
        f"Must 5c: {prefix} leaves displayed HP unchanged at submit",
    )
    assert_that(
        immediate["idxAfterBlockedSwap"] == immediate["initialIdx"],
        f"Must 8: {prefix} blocks swapping",
    )
    assert_that(
        immediate["fxBeforeSecond"] == immediate["fxAfterSecond"],
        f"Must 8: {prefix} ignores double input",
    )
    assert_that(not immediate["motionAtSubmit"], f"Must 5b: {prefix} delays impact")


def check_visual_state(outcome: str, visual: dict) -> None:
    """Check the visual-language contract while the outcome is held."""

    if outcome == "attack_hit":
        grade = next((cls for cls in visual["bannerClass"] if cls.startswith("gr-")), "")
        assert_that(grade in {"gr-adv", "gr-neu", "gr-dis"}, "Phase 2: attack_hit has a grade class")
        assert_that(visual["hasBurst"] == (grade == "gr-adv"), "Phase 2: only advantageous attack_hit bursts")
    elif outcome == "attack_miss":
        assert_that(visual["hasMiss"], "Phase 3: attack_miss keeps the miss slash")
        assert_that(not visual["hasDodge"], "Phase 3: attack_miss has no dodge element")
    elif outcome == "defense_guard":
        grade = next((cls for cls in visual["bannerClass"] if cls.startswith("gr-")), "")
        expected_cracks = {"gr-adv": 0, "gr-neu": 2, "gr-dis": 3}.get(grade)
        assert_that(visual["hasShield"], "Phase 1: defense_guard renders the shield SVG")
        assert_that(visual["cracks"] == expected_cracks, "Phase 1: defense_guard crack count follows grade")
        assert_that(visual["damageFontSize"] == 18, "Phase 1: defense_guard damage is 18px")
        red_shadow = "rgb(153, 0, 0)" in visual["damageShadow"] or "rgb(153,0,0)" in visual["damageShadow"]
        assert_that(not red_shadow, "Phase 1: defense_guard damage has no red shadow")
        assert_that(not visual["sceneFlash"], "Phase 1: defense_guard has no scene flash")
        assert_that(not visual["sceneQuake"], "Phase 1: defense_guard has no scene shake")
    elif outcome == "defense_hit":
        assert_that(visual["damageFontSize"] == 36, "Phase 1: defense_hit damage is 36px")
        assert_that(visual["sceneFlash"], "Phase 1: defense_hit uses the scene flash")
        assert_that(visual["sceneQuake"], "Phase 1: defense_hit shakes the scene")


def check_effect_path(outcome: str, entries: list[dict], immediate: dict) -> None:
    expectations = {
        "attack_hit": ("slashOn", "enemy", {"missOn": 0, "guardOn": 0, "sceneFlash": 0}),
        "attack_miss": ("missOn", "enemy", {"slashOn": 0, "guardOn": 0}),
        "defense_guard": ("guardOn", "ally", {"slashOn": 0, "sceneFlash": 0}),
        "defense_hit": ("slashOn", "ally", {"guardOn": 0}),
    }
    motion_name, side, absent = expectations[outcome]
    matches = [entry for entry in entries if entry["n"] == motion_name]
    assert_that(len(matches) == 1, f"Must 1: {outcome} has one {motion_name} path")
    assert_that(bool(matches) and matches[0]["a"][:1] == [side], f"Must 1: {outcome} targets {side}")
    for name, expected in absent.items():
        assert_that(call_count(entries, name) == expected, f"Must 1: {outcome} {name} count is {expected}")
    if outcome == "defense_hit":
        assert_that(call_count(entries, "sceneFlash") >= 1, "Must 1: defense_hit flashes the scene")

    motion = first_call(entries, {"slashOn", "missOn", "guardOn"})
    hp_call = first_call(entries, {"setHp"})
    next_call = first_call(entries, {"nextQuestion"})
    ordered = bool(
        motion
        and hp_call
        and next_call
        and immediate["t0"] < motion["t"] < hp_call["t"] < next_call["t"]
    )
    assert_that(ordered, f"Must 5: {outcome} order is banner, impact, HP, next question")
    if motion:
        assert_that(
            motion["t"] - immediate["t0"] >= FAST_IMPACT - 15,
            f"Must 4/5: {outcome} impact honors configured delay",
        )
    if hp_call:
        assert_that(
            hp_call["t"] - immediate["t0"] >= FAST_HP - 15,
            f"Must 4/5: {outcome} HP honors configured delay",
        )
    if next_call:
        assert_that(
            next_call["t"] - immediate["t0"] >= immediate["expectedNextDelay"] - 15,
            f"Must 4/5: {outcome} next question honors configured delay",
        )


def check_final_state(page: object, outcome: str, immediate: dict) -> None:
    final = page.evaluate(
        """
        ([hpId,otherIdx]) => {
          var who=hpId==="bossHpT" ? "boss" : "me";
          var hp=who==="boss" ? st.bossHp : st.party[st.idx].hp;
          var max=who==="boss" ? st.bossMax : st.party[st.idx].max;
          var before=st.idx;
          var text=document.getElementById(hpId).textContent;
          var width=parseFloat(document.querySelector("#"+who+"HpBar i").style.width);
          var busy=st.busy;
          swapTo(otherIdx);
          return {busy:busy, text:text, width:width, hp:hp, max:max,
            before:before, after:st.idx};
        }
        """,
        [immediate["hpId"], immediate["otherIdx"]],
    )
    if outcome == "attack_miss":
        assert_that(
            final["text"] == immediate["hpTextAtSubmit"],
            "Must 1/5c: attack_miss leaves boss HP unchanged",
        )
    else:
        assert_that(
            final["text"] != immediate["hpTextAtSubmit"],
            f"Must 5c: {outcome} updates HP only after submit",
        )
    assert_that(final["text"] == f"HP {max(0, final['hp'])}/{final['max']}", f"Must 5c: {outcome} HP text reflects state")
    expected_width = max(0.0, final["hp"] / final["max"] * 100)
    assert_that(abs(final["width"] - expected_width) < 0.05, f"Must 5c: {outcome} HP bar reflects state")
    assert_that(final["busy"] is False, f"Must 8: {outcome} presentation window reopens")
    assert_that(final["after"] != final["before"], f"Must 8: {outcome} allows swapping afterward")


def check_outcome(browser: object, base_url: str, outcome: str) -> None:
    page = prepare_page(browser, base_url)
    try:
        if outcome.startswith("defense_"):
            page.evaluate("() => beginDefense()")
        else:
            page.evaluate("() => { st.phase='attack'; }")
        inject_question(page, QUESTION_TEXT)
        install_spies(page)
        reset_spies(page)
        choice = "あ" if outcome in {"attack_hit", "defense_guard"} else "い"
        immediate = submit_atomically(page, outcome, choice)
        check_immediate(outcome, immediate)
        visual_wait = FAST_HP + 25
        page.wait_for_timeout(visual_wait)
        check_visual_state(outcome, visual_snapshot(page))
        page.wait_for_timeout(max(0, immediate["expectedNextDelay"] + WAIT_MARGIN - visual_wait))
        entries = fx(page)
        check_effect_path(outcome, entries, immediate)
        check_final_state(page, outcome, immediate)
    finally:
        page.context.close()


def check_terminal(
    browser: object,
    base_url: str,
    terminal: str,
    setup: str,
    outcome: str,
    choice: str,
) -> None:
    page = prepare_page(browser, base_url)
    try:
        page.evaluate(setup)
        inject_question(page, QUESTION_TEXT)
        install_spies(page)
        reset_spies(page)
        immediate = page.evaluate(
            """
            ([choice,outcome,terminal]) => {
              window.__t0=performance.now();
              answer(choice);
              var banner=document.getElementById("turnBanner");
              var dramatic=outcome==="defense_hit"
                ||(outcome==="attack_hit"&&banner.classList.contains("gr-adv"));
              return {
                t0:window.__t0,
                outcomeClass:banner.classList.contains("ob-"+outcome),
                expectedNextDelay:BATTLE_FEEDBACK_TIMING.nextQuestionDelayMs
                  +(dramatic?BATTLE_FEEDBACK_TIMING.dramaticExtraMs:0),
                terminalAtSubmit:window.__fx.some(function(e){return e.n===terminal;})
              };
            }
            """,
            [choice, outcome, terminal],
        )
        assert_that(immediate["outcomeClass"], f"Must 10: {terminal} outcome banner appears")
        assert_that(not immediate["terminalAtSubmit"], f"Must 10: {terminal} is absent at submit")
        page.wait_for_timeout(FAST_BANNER // 2)
        held = page.evaluate(
            "(outcome) => document.getElementById('turnBanner').classList.contains('ob-'+outcome)",
            outcome,
        )
        assert_that(held, f"Must 10/12: {terminal} banner remains during the hold window")
        page.wait_for_timeout(FAST_NEXT + WAIT_MARGIN)
        entries = [entry for entry in fx(page) if entry["n"] == terminal]
        assert_that(len(entries) == 1, f"Must 10: {terminal} fires exactly once")
        assert_that(
            bool(entries)
            and entries[0]["t"] - immediate["t0"] >= immediate["expectedNextDelay"] - 15,
            f"Must 10: {terminal} waits for the configured next delay",
        )
    finally:
        page.context.close()


def configure_matchup(page: object, phase: str, member_type: str, dodge: bool = False) -> None:
    """Force a grade and optional dodge while preserving production answer flow."""

    page.evaluate(
        """
        ([phase,memberType,dodge]) => {
          st.r.type="kanji";
          activeM().type=memberType;
          activeM().hp=100;
          activeM().max=100;
          st.traits=dodge?[B.TRAITS.dodge]:[];
          if(dodge) Math.random=()=>0;
          if(phase==="defense") beginDefense(); else st.phase="attack";
        }
        """,
        [phase, member_type, dodge],
    )


def check_grade_variants(browser: object, base_url: str) -> None:
    """Exercise all attack and guard grades through answer(c)."""

    variants = (
        ("adv", "gr-adv", "eitango", 0),
        ("neu", "gr-neu", "kanji", 2),
        ("dis", "gr-dis", "keisan", 3),
    )
    for grade_key, grade_class, member_type, cracks in variants:
        for phase, outcome in (("attack", "attack_hit"), ("defense", "defense_guard")):
            page = prepare_page(browser, base_url)
            try:
                configure_matchup(page, phase, member_type)
                inject_question(page, QUESTION_TEXT)
                page.evaluate("() => answer('あ')")
                page.wait_for_timeout(FAST_HP + 25)
                visual = visual_snapshot(page)
                assert_that(grade_class in visual["bannerClass"], f"Phase 1/2: {phase} uses {grade_class}")
                if phase == "attack":
                    expected = {
                        "adv": "こうかは ばつぐん！",
                        "neu": "こうげき せいこう！",
                        "dis": "きかない…！",
                    }[grade_key]
                    assert_that(visual["bannerMessage"] == expected, f"Phase 2: {grade_key} attack message")
                    assert_that(visual["hasBurst"] == (grade_key == "adv"), f"Phase 2: {grade_key} attack burst")
                else:
                    expected = {
                        "adv": "まもりきった！",
                        "neu": "まもった！",
                        "dis": "もちこたえた！",
                    }[grade_key]
                    assert_that(visual["bannerMessage"] == expected, f"Phase 1: {grade_key} guard message")
                    assert_that(visual["cracks"] == cracks, f"Phase 1: {grade_key} guard has {cracks} cracks")
            finally:
                page.context.close()


def check_dodge_variant(browser: object, base_url: str) -> None:
    """Verify that a correct dodged attack is not rendered as attack_miss."""

    page = prepare_page(browser, base_url)
    try:
        configure_matchup(page, "attack", "kanji", dodge=True)
        inject_question(page, QUESTION_TEXT)
        install_spies(page)
        reset_spies(page)
        page.evaluate("() => answer('あ')")
        page.wait_for_timeout(FAST_IMPACT + 25)
        visual = visual_snapshot(page)
        entries = fx(page)
        assert_that("ob-attack_hit" in visual["bannerClass"], "Phase 3: dodge keeps the attack_hit outcome key")
        assert_that(visual["bannerMessage"] == "よけられた！", "Phase 3: dodge has its own message")
        assert_that(visual["hasDodge"], "Phase 3: dodge creates a dedicated dodge element")
        misses = [entry for entry in entries if entry["n"] == "missOn"]
        assert_that(len(misses) == 1 and misses[0]["a"][:2] == ["enemy", "dodge"], "Phase 3: dodge preserves the missOn spy with a dodge variant")
        assert_that(call_count(entries, "sceneFlash") == 0, "Phase 3: dodge does not flash the scene")
    finally:
        page.context.close()


def check_production_timing(browser: object, base_url: str) -> None:
    """Drive four outcomes plus dodge with the production timing profile."""

    scenarios = (
        ("attack_hit", "attack", "あ", "eitango", False, "slashOn", 260, 2350),
        ("attack_miss", "attack", "い", "kanji", False, "missOn", 260, 2050),
        ("defense_guard", "defense", "あ", "kanji", False, "guardOn", 260, 2050),
        ("defense_hit", "defense", "い", "kanji", False, "slashOn", 300, 2350),
        ("attack_dodge", "attack", "あ", "kanji", True, "missOn", 260, 2050),
    )
    effect_selector = ".slash,.guard-pop,.shield-shatter,.burst-pop,.dodge-slip,.incoming-line,.dmg-float,.trait-pop"
    for outcome, phase, choice, member_type, dodge, motion_name, impact_ms, total_ms in scenarios:
        page = prepare_page(browser, base_url, fast_timing=False)
        try:
            configure_matchup(page, phase, member_type, dodge=dodge)
            inject_question(page, QUESTION_TEXT)
            install_spies(page)
            reset_spies(page)
            t0 = page.evaluate("(choice) => { window.__t0=performance.now(); answer(choice); return window.__t0; }", choice)
            page.wait_for_timeout(total_ms + 120)
            entries = fx(page)
            motion = first_call(entries, {motion_name})
            hp_call = first_call(entries, {"setHp"})
            next_call = first_call(entries, {"nextQuestion", "finish", "faint"})
            assert_that(bool(motion) and abs(motion["t"] - t0 - impact_ms) <= 45, f"Phase 2: {outcome} production impact timing")
            assert_that(bool(hp_call) and abs(hp_call["t"] - t0 - 700) <= 45, f"Phase 2: {outcome} production HP timing")
            assert_that(bool(next_call) and abs(next_call["t"] - t0 - total_ms) <= 45, f"Phase 2: {outcome} production total timing")
            remaining = page.locator(effect_selector).count()
            assert_that(remaining == 0, f"Phase 2/3: {outcome} motion and traits end within {total_ms}ms")
            assert_that(total_ms <= 2400, f"Phase 2: {outcome} stays within the 2400ms cap")
        finally:
            page.context.close()


def run_dynamic_checks(browser: object, base_url: str) -> None:
    for outcome in ("attack_hit", "attack_miss", "defense_guard", "defense_hit"):
        try:
            check_outcome(browser, base_url, outcome)
        except Exception as exc:
            assert_that(False, f"dynamic scenario {outcome} completed ({type(exc).__name__}: {exc})")

    try:
        check_grade_variants(browser, base_url)
    except Exception as exc:
        assert_that(False, f"grade variants completed ({type(exc).__name__}: {exc})")

    try:
        check_dodge_variant(browser, base_url)
    except Exception as exc:
        assert_that(False, f"dodge variant completed ({type(exc).__name__}: {exc})")

    try:
        check_production_timing(browser, base_url)
    except Exception as exc:
        assert_that(False, f"production timing completed ({type(exc).__name__}: {exc})")

    terminals: list[tuple[str, str, str, str]] = [
        ("finish", "() => { st.phase='attack'; st.bossHp=3; }", "attack_hit", "あ"),
        ("faint", "() => { st.party[st.idx].hp=1; beginDefense(); }", "defense_hit", "い"),
    ]
    for terminal, setup, outcome, choice in terminals:
        try:
            check_terminal(browser, base_url, terminal, setup, outcome, choice)
        except Exception as exc:
            assert_that(False, f"terminal scenario {terminal} completed ({type(exc).__name__}: {exc})")


def import_playwright() -> Callable:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError(
            "Playwright is unavailable. Follow tests/battle_feedback/README.md "
            "to create /tmp/q4b_t09_venv and install Chromium."
        ) from exc
    return sync_playwright


def main() -> int:
    check_static_contract()
    try:
        sync_playwright = import_playwright()
        with serve_repo_root() as base_url, sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                run_dynamic_checks(browser, base_url)
            finally:
                browser.close()
    except Exception as exc:
        assert_that(False, f"headless runner completed ({type(exc).__name__}: {exc})")

    print(f"RESULT: {RESULTS.passed} passed, {RESULTS.failed} failed")
    return 1 if RESULTS.failed else 0


if __name__ == "__main__":
    sys.exit(main())
