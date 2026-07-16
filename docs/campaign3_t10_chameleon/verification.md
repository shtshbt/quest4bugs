# T10 verification

## Deterministic checks

Run from the repository root:

```bash
node tests/test_t10_chameleon.js
node tests/test_t03_breeding.js
node tests/test_t03_portal_visuals.js
node tests/test_t03_reward.js
node tests/test_t03_zukan_ui.js
/tmp/q4b_t10_venv/bin/python tests/battle_feedback/test_battle_feedback.py
```

The focused test covers the separate hidden-boss entry, six-member requirement, two-action color transition and reset, swap isolation, additive unlock persistence, duplicate prevention, first-clear immutability, legacy save-shape preservation, Hall of Fame integration, and a no-legendary/no-equipment victory trace.

The T09 suite continues to own the four `presentBattleOutcome` states and its timing contract.

## Results on 2026-07-16

- `node tests/test_t10_chameleon.js`: 7 passed, 0 failed
- `node tests/test_t03_breeding.js`: 8 passed, 0 failed
- `node tests/test_t03_portal_visuals.js`: 4 passed, 0 failed
- `node tests/test_t03_reward.js`: 10 passed, 0 failed
- `node tests/test_t03_zukan_ui.js`: 4 passed, 0 failed
- T09 static contract: 10 passed
- T09 browser runner: unavailable because the task-local virtual environment has no Playwright package

The T03 checks confirm that the portal treasure summary, bespoke registry, breeding CAS flow, reward logic, and zukan UI remain unchanged. The T09 static checks confirm that `answer(c)` still delegates to `presentBattleOutcome`, owns no direct feedback effects or timers, and retains all four timing defaults.

## Visual harness

The committed harness exposes four deterministic scenes at a fixed 480 by 900 viewport:

```text
tests/chameleon_visual_harness.html?scene=guard
tests/chameleon_visual_harness.html?scene=warning
tests/chameleon_visual_harness.html?scene=forecast
tests/chameleon_visual_harness.html?scene=hall
```

Expected scene coverage:

- `guard`: five-member state with the challenge button disabled
- `warning`: advance disclosure that substitution is prohibited
- `forecast`: current type, incoming type, and two remaining actions
- `hall`: first-clear party, equipment, and date on the sacred-tree Hall of Fame

Headless screenshot capture was attempted with the cached Chromium builds. This sandbox rejects Chromium Crashpad socket setup and the browser exits with `Trace/breakpoint trap` before rendering even a minimal data URL. The same sandbox also rejects binding a localhost HTTP server. No fabricated screenshots are included.

Commands attempted:

```bash
/tmp/q4b_t10_venv/bin/python -m http.server 8765 --bind 127.0.0.1 --directory /home/shota/work/q4b_worktrees/t10-chameleon
/home/shota/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome --headless=new --no-sandbox --disable-gpu --disable-crashpad --disable-crash-reporter --noerrdialogs --allow-file-access-from-files --user-data-dir=/tmp/q4b_chrome_t10_try2 --window-size=480,900 --screenshot=/tmp/q4b_test.png 'data:text/html,<h1>test</h1>'
```
