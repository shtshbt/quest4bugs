"""Capture the tomoshibi counter and effects in headless Chromium.

Setup and run (from the repository root):

    python3 -m venv /tmp/q4b_t09_venv
    /tmp/q4b_t09_venv/bin/pip install playwright
    PLAYWRIGHT_BROWSERS_PATH=/tmp/q4b_t09_venv/browsers /tmp/q4b_t09_venv/bin/playwright install chromium
    PLAYWRIGHT_BROWSERS_PATH=/tmp/q4b_t09_venv/browsers /tmp/q4b_t09_venv/bin/python tests/tomoshibi_visual/capture.py [out_dir]

Screenshots go to out_dir (default: tests/tomoshibi_visual/screenshots/, git-ignored)
at a fixed 480 by 900 CSS-pixel viewport. The page is served from an ephemeral
localhost port; no external network requests are made.
"""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "battle_feedback"))
from harness import serve_repo_root  # noqa: E402

PAGE = "/tests/tomoshibi_visual/preview.html"
# (name, query, wait in ms after load, reduced motion)
SHOTS = [
    ("badges", "", 300, False),
    ("fx_bonus", "?fx=bonus", 1100, False),
    ("fx_up_swap", "?fx=up", 4200, False),
    ("fx_drop", "?fx=drop", 2600, False),
    ("help", "?fx=help", 400, False),
    ("fx_bonus_reduced", "?fx=bonus", 400, True),
]


def main() -> int:
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "screenshots"
    out_dir.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    with serve_repo_root() as base, sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            for name, query, wait_ms, reduced in SHOTS:
                context = browser.new_context(
                    viewport={"width": 480, "height": 900},
                    service_workers="block",
                    reduced_motion="reduce" if reduced else "no-preference",
                )
                page = context.new_page()
                page.on("pageerror", lambda exc, n=name: errors.append(f"{n}: {exc}"))
                page.goto(base + PAGE + query)
                page.wait_for_function("() => window.Q4BTomoshibiUI !== undefined")
                page.wait_for_timeout(wait_ms)
                page.screenshot(path=str(out_dir / f"{name}.png"))
                context.close()
        finally:
            browser.close()
    for line in errors:
        print("PAGE ERROR", line, file=sys.stderr)
    print(f"wrote {len(SHOTS)} screenshots to {out_dir}", file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
