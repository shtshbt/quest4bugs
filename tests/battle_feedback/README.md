# Battle feedback headless checks

These scripts verify the battle outcome presenter in `battle.html` and capture its
four base outcomes, seven graded/dodge variants, and two reduced-motion states. They serve the repository root on an ephemeral
localhost port and use headless Chromium; no external network requests are made by
the scripts.

## Reproducible setup and commands

```bash
python3 -m venv /tmp/q4b_t09_venv
/tmp/q4b_t09_venv/bin/pip install playwright
PLAYWRIGHT_BROWSERS_PATH=/tmp/q4b_t09_venv/browsers /tmp/q4b_t09_venv/bin/playwright install chromium
cd <repo root>
PLAYWRIGHT_BROWSERS_PATH=/tmp/q4b_t09_venv/browsers /tmp/q4b_t09_venv/bin/python tests/battle_feedback/test_battle_feedback.py
PLAYWRIGHT_BROWSERS_PATH=/tmp/q4b_t09_venv/browsers /tmp/q4b_t09_venv/bin/python tests/battle_feedback/capture_screenshots.py
```

Both Python entry points resolve the repository from their own location, so they
also work when invoked from another directory. Screenshot output is written to
`tests/battle_feedback/screenshots/` at a fixed 480 by 900 CSS-pixel viewport.

## Coverage

| Check | Must | Coverage |
|---|---:|---|
| Static `answer(c)` and scheduler scan | 1 | One presenter call; no direct effects, logging, HP updates, or legacy timers |
| Static timing-object scan | 4 | Six production timing defaults and the 2400ms cap |
| Four outcome paths | 1, 2, 3 | Exact banner class/message and exactly one outcome-specific motion path |
| Grade and dodge variants | 1, 2, 3 | Attack/guard grade classes, shield cracks, burst exclusivity, and dedicated dodge DOM |
| Fast runtime timing profile | 4, 5 | Runtime value mutation; banner, impact, HP, and next-question ordering |
| Production runtime profile | 4, 5 | Four outcomes plus dodge at 2050/2350ms, with all motion ending inside the turn |
| Atomic submit snapshot | 5 | Busy/window state, banner-before-impact, and delayed HP display |
| Double-input and swap gate | 8 | Repeated answers and swaps are blocked only during presentation |
| Victory and faint paths | 10 | Terminal actions occur only after the configured next delay |
| Stable and reduced-motion captures | 12 | Four base, seven graded/dodge, and two reduced-motion held states |
