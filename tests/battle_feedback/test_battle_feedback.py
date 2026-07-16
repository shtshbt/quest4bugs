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


FAST_IMPACT = 40
FAST_HP = 80
FAST_BANNER = 160
FAST_NEXT = 240
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
            "impactDelayMs": 250,
            "hpDelayMs": 450,
            "bannerDurationMs": 1400,
            "nextQuestionDelayMs": 1600,
        }
        for name, value in defaults.items():
            found = re.search(rf"\b{name}\s*:\s*{value}\b", timing_body)
            assert_that(found is not None, f"Must 4: {name} defaults to {value}")


def call_count(entries: list[dict], name: str) -> int:
    return sum(entry["n"] == name for entry in entries)


def first_call(entries: list[dict], names: set[str]) -> dict | None:
    return next((entry for entry in entries if entry["n"] in names), None)


def prepare_page(browser: object, base_url: str) -> object:
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
    set_timing(page, FAST_IMPACT, FAST_HP, FAST_BANNER, FAST_NEXT)
    return page


def submit_atomically(page: object, outcome: str, choice: str) -> dict:
    """Submit once and capture all presentation-window invariants atomically."""

    return page.evaluate(
        """
        ([outcome,choice]) => {
          window.__t0=performance.now();
          var hpId=st.phase==="attack" ? "bossHpT" : "meHpT";
          var initialIdx=st.idx;
          var other=st.party.findIndex(function(m,i){return i!==st.idx && m.hp>0;});
          var hpTextBeforeAnswer=document.getElementById(hpId).textContent;
          answer(choice);
          var banner=document.getElementById("turnBanner");
          var result={
            bannerClass:Array.prototype.slice.call(banner.classList),
            bannerMessage:(banner.querySelector(".ob-msg")||{}).textContent||"",
            expectedMessage:BATTLE_OUTCOME_TABLE[outcome].msg,
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
            next_call["t"] - immediate["t0"] >= FAST_NEXT - 15,
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
        page.wait_for_timeout(FAST_NEXT + WAIT_MARGIN)
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
              return {
                t0:window.__t0,
                outcomeClass:document.getElementById("turnBanner").classList.contains("ob-"+outcome),
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
            bool(entries) and entries[0]["t"] - immediate["t0"] >= FAST_NEXT - 15,
            f"Must 10: {terminal} waits for the configured next delay",
        )
    finally:
        page.context.close()


def run_dynamic_checks(browser: object, base_url: str) -> None:
    for outcome in ("attack_hit", "attack_miss", "defense_guard", "defense_hit"):
        try:
            check_outcome(browser, base_url, outcome)
        except Exception as exc:
            assert_that(False, f"dynamic scenario {outcome} completed ({type(exc).__name__}: {exc})")

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
