"""Capture deterministic battle feedback screenshots.

Usage: python tests/battle_feedback/capture_screenshots.py
"""

import os
import sys
import tempfile
from pathlib import Path
from typing import Callable

from harness import boot_battle, inject_question, serve_repo_root, set_timing


SCREENSHOT_DIR = Path(__file__).resolve().parent / "screenshots"
EMOJI_FONT_DIRS = (
    Path("/mnt/c/Windows/Fonts"),      # WSL: Segoe UI Emoji lives here
)
QUESTION_TEXT = "「あ」を えらぼう"
HOLD_TIMING = (80, 160, 100000, 120000)
OUTCOMES = (
    ("attack_hit", "attack", "あ"),
    ("attack_miss", "attack", "い"),
    ("defense_guard", "defense", "あ"),
    ("defense_hit", "defense", "い"),
)


def configure_emoji_fonts() -> None:
    """Point fontconfig at an emoji-capable font dir so banner icons render.

    Best effort: headless chromium ships no emoji font, which would turn the
    outcome icons into tofu boxes. Skips silently when no candidate dir exists.
    """

    font_dirs = [d for d in EMOJI_FONT_DIRS if d.is_dir()]
    if not font_dirs or os.environ.get("FONTCONFIG_FILE"):
        return
    dir_lines = "\n".join(f"  <dir>{d}</dir>" for d in font_dirs)
    config = (
        '<?xml version="1.0"?>\n'
        '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n'
        "<fontconfig>\n"
        '  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>\n'
        f"{dir_lines}\n"
        f"  <cachedir>{tempfile.gettempdir()}/q4b_t09_fontcache</cachedir>\n"
        "</fontconfig>\n"
    )
    config_path = Path(tempfile.gettempdir()) / "q4b_t09_fonts.conf"
    config_path.write_text(config, encoding="utf-8")
    os.environ["FONTCONFIG_FILE"] = str(config_path)


def import_playwright() -> Callable:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise RuntimeError(
            "Playwright is unavailable. Follow tests/battle_feedback/README.md "
            "to create /tmp/q4b_t09_venv and install Chromium."
        ) from exc
    return sync_playwright


def capture_outcome(
    context: object,
    base_url: str,
    outcome: str,
    phase: str,
    choice: str,
    output_name: str | None = None,
) -> Path:
    """Boot one fresh page, freeze its result hold point, and capture it."""

    page = context.new_page()
    try:
        page.goto(f"{base_url}/battle.html", wait_until="load")
        boot_battle(page)
        set_timing(page, *HOLD_TIMING)
        if phase == "defense":
            page.evaluate("() => beginDefense()")
        else:
            page.evaluate("() => { st.phase='attack'; }")
        inject_question(page, QUESTION_TEXT)
        page.evaluate("(choice) => answer(choice)", choice)
        page.wait_for_timeout(700)
        output_path = SCREENSHOT_DIR / (output_name or f"{outcome}.png")
        page.screenshot(path=str(output_path), full_page=False)
        return output_path
    finally:
        page.close()


def main() -> int:
    try:
        SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
        configure_emoji_fonts()
        sync_playwright = import_playwright()
        with serve_repo_root() as base_url, sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                context = browser.new_context(
                    viewport={"width": 480, "height": 900},
                    device_scale_factor=1,
                    service_workers="block",
                )
                try:
                    for outcome, phase, choice in OUTCOMES:
                        path = capture_outcome(context, base_url, outcome, phase, choice)
                        print(path)
                finally:
                    context.close()

                reduced = browser.new_context(
                    viewport={"width": 480, "height": 900},
                    device_scale_factor=1,
                    reduced_motion="reduce",
                    service_workers="block",
                )
                try:
                    path = capture_outcome(
                        reduced,
                        base_url,
                        "defense_hit",
                        "defense",
                        "い",
                        "reduced_motion_defense_hit.png",
                    )
                    print(path)
                finally:
                    reduced.close()
            finally:
                browser.close()
    except Exception as exc:
        print(f"ERROR: screenshot capture failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
