"""Shared browser harness for battle feedback checks.

Usage: import these helpers from a script in tests/battle_feedback.
"""

from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from typing import Iterator


REPO_ROOT = Path(__file__).resolve().parents[2]


class QuietRequestHandler(SimpleHTTPRequestHandler):
    """Serve files without adding request logs to test output."""

    def log_message(self, format: str, *args: object) -> None:
        return


@contextmanager
def serve_repo_root() -> Iterator[str]:
    """Serve the repository root from an ephemeral localhost port."""

    handler = partial(QuietRequestHandler, directory=str(REPO_ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    try:
        yield f"http://{host}:{port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
        if thread.is_alive():
            raise RuntimeError("Repository HTTP server did not stop cleanly")


def boot_battle(page: object) -> dict:
    """Wait for page globals and boot stage one deterministically."""

    page.wait_for_function(
        "() => window.st!==undefined && window.B && window.BUGS "
        "&& document.getElementById('battle')!==null"
    )
    result = page.evaluate(
        """
        () => {
          Math.random = () => 0.42;
          PARTY = BUGS.slice(0,3);
          startBattle(B.roster[0]);
          beginBattleAfterIntro();
          // startBattle schedules a second beginBattleAfterIntro ~1.4s later for the
          // intro screen (the callback reference is captured at call time, so stubbing
          // the global would not help). Clear every pending timer so nothing
          // re-renders the battle mid-scenario.
          var lastTimer = setTimeout(function(){}, 0);
          for (var i = 0; i <= lastTimer; i++) clearTimeout(i);
          // Hide the floating zukan-mode toggle with its own production mechanism;
          // at 480px it overlaps the enemy artbox and would cover the damage float.
          if (window.Q4BRender && Q4BRender.setSessionActive) Q4BRender.setSessionActive(true);
          st.traits = [];
          return {boss: st.boss.jaName, party: st.party.length};
        }
        """
    )
    page.wait_for_selector("#turnBanner")
    page.wait_for_selector("#log")
    return result


def inject_question(page: object, text: str) -> None:
    """Replace the generated question with a fixed two-choice question."""

    page.evaluate(
        """
        (text) => {
          st.q = {q:text, kind:"choice", choices:["あ","い"], ans:"あ"};
          document.getElementById("qtext").innerHTML = text;
          var ans=document.getElementById("ans"); ans.innerHTML="";
          st.q.choices.forEach(function(c){ var b=document.createElement("button");
            b.textContent=c; b.onclick=function(){ answer(c); }; ans.appendChild(b); });
          st.busy = false;
        }
        """,
        text,
    )


def install_spies(page: object) -> None:
    """Wrap feedback functions and retain their call order and timestamps."""

    page.evaluate(
        """
        () => {
          window.__fx = [];
          ["slashOn","missOn","guardOn","sceneFlash","floatDmg","setHp",
           "traitFx","nextQuestion"].forEach(function(n){
            var orig = window[n];
            window[n] = function(){
              window.__fx.push({n:n, t:performance.now(),
                a:Array.prototype.slice.call(arguments).map(String)});
              return orig.apply(this,arguments);
            };
          });
          ["finish","faint"].forEach(function(n){
            window[n] = function(){
              window.__fx.push({n:n, t:performance.now(), a:[]});
            };
          });
          window.__t0 = performance.now();
        }
        """
    )


def reset_spies(page: object) -> None:
    """Clear recorded calls without wrapping functions a second time."""

    page.evaluate(
        "() => { window.__fx.length=0; window.__t0=performance.now(); }"
    )


def set_timing(page: object, impact: int, hp: int, banner: int, nextq: int) -> None:
    """Mutate the production timing profile for deterministic tests."""

    page.evaluate(
        """
        ([impact,hp,banner,nextq]) => {
          BATTLE_FEEDBACK_TIMING.impactDelayMs=impact;
          BATTLE_FEEDBACK_TIMING.hpDelayMs=hp;
          BATTLE_FEEDBACK_TIMING.bannerDurationMs=banner;
          BATTLE_FEEDBACK_TIMING.nextQuestionDelayMs=nextq;
        }
        """,
        [impact, hp, banner, nextq],
    )


def fx(page: object) -> list[dict]:
    """Return a copy of the recorded effect calls."""

    return page.evaluate("() => window.__fx.slice()")
