#!/usr/bin/env python3
# One-off branch patch. Removed after generated change is committed.
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "shared" / "shiny_bonus.js"
s = p.read_text(encoding="utf-8")
old = '''    mountMorningBanner();
    decorate(document);
    scheduleSummary();

    if(global.MutationObserver){'''
new = '''    mountMorningBanner();
    decorate(document);
    scheduleSummary();
    /* This script is intentionally loaded after each game's app code. If the first
       screen was rendered synchronously, redraw it once so shiny SVG wrappers also
       apply on the initial screen rather than only after the next navigation. */
    if(typeof global.Q4BZukanRerender === "function"){
      setTimeout(function(){
        try{ global.Q4BZukanRerender(); decorate(document); }catch(_){}
      }, 0);
    }

    if(global.MutationObserver){'''
if old not in s:
    if new in s:
        print("already applied")
    else:
        raise SystemExit("target block not found")
else:
    p.write_text(s.replace(old, new, 1), encoding="utf-8")
    print("initial shiny rerender fix applied")
