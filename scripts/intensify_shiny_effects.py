#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# 1) Stronger adult shiny presentation; do not elevate the pre-existing egg flag.
css_path = ROOT / "shared" / "shiny_bonus.css"
css = css_path.read_text(encoding="utf-8")
css = css.replace(
    '.q4b-shiny-art>svg{display:block;width:100%;height:100%;filter:drop-shadow(0 0 4px rgba(255,213,74,.48))}',
    '.q4b-shiny-art>svg{display:block;width:100%;height:100%;filter:drop-shadow(0 0 5px rgba(255,220,65,.78)) drop-shadow(0 0 10px rgba(95,203,255,.38))}'
)
css = css.replace(
    '.q4b-shiny-badge{position:absolute;right:-2px;top:-3px;z-index:2;font-size:15px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.28));pointer-events:none}',
    '.q4b-shiny-badge{position:absolute;right:-5px;top:-6px;z-index:4;font-size:21px;line-height:1;filter:drop-shadow(0 0 5px #ffc83d) drop-shadow(0 1px 2px rgba(0,0,0,.32));pointer-events:none}'
)
css = css.replace(
    '.q4b-shiny-art::before{left:6%;top:13%;font-size:13px}',
    '.q4b-shiny-art::before{left:2%;top:7%;font-size:20px}'
)
css = css.replace(
    '.q4b-shiny-art::after{right:7%;bottom:12%;font-size:10px}',
    '.q4b-shiny-art::after{right:1%;bottom:6%;font-size:16px}'
)
css = css.replace(
    '.q4b-shiny-card{outline:2px solid rgba(241,190,51,.9)!important;outline-offset:-2px;box-shadow:0 0 0 3px rgba(110,205,255,.18),0 4px 12px rgba(242,163,60,.24)!important}',
    '.q4b-shiny-card{outline:3px solid rgba(255,196,38,.98)!important;outline-offset:-3px;box-shadow:0 0 0 5px rgba(91,202,255,.22),0 0 18px rgba(255,170,43,.52),0 6px 16px rgba(121,83,190,.28)!important}'
)
css = css.replace(
    '.q4b-shiny-detail::before{animation:q4bShinyTwinkle 2.4s ease-in-out infinite}\n.q4b-shiny-detail::after{animation:q4bShinyTwinkle 2.4s ease-in-out .8s infinite}\n.q4b-shiny-egg{border-color:#e6b82f!important;box-shadow:0 0 0 3px rgba(113,207,255,.2),0 2px 8px rgba(242,163,60,.24)!important;background-image:linear-gradient(135deg,rgba(255,246,195,.35),rgba(214,244,255,.35))!important}\n.q4b-shiny-reveal{animation:q4bShinyReveal 1.15s ease-out both!important}\n.q4b-shiny-reveal::after{content:"✦  ✨  ✦";position:absolute;inset:8% 0 auto;text-align:center;font-size:22px;letter-spacing:12px;color:#fff8bb;text-shadow:0 0 8px #ffb52e,0 0 14px #6fd8ff;pointer-events:none;animation:q4bShinyBurst 1.1s ease-out both}',
    '.q4b-shiny-detail{animation:q4bShinyAura 1.9s ease-in-out infinite}\n.q4b-shiny-detail::before{animation:q4bShinyTwinkle 1.55s ease-in-out infinite}\n.q4b-shiny-detail::after{animation:q4bShinyTwinkle 1.55s ease-in-out .55s infinite}\n.q4b-shiny-reveal{position:relative;animation:q4bShinyReveal 1.55s cubic-bezier(.16,.82,.28,1) both!important}\n.q4b-shiny-reveal::after{content:"✦  ✧  ✨  ✧  ✦";position:absolute;z-index:8;inset:3% -8% auto;text-align:center;font-size:30px;letter-spacing:9px;color:#fffbd0;text-shadow:0 0 7px #fff,0 0 14px #ffb52e,0 0 24px #6fd8ff,0 0 34px #b86cff;pointer-events:none;animation:q4bShinyBurst 1.5s ease-out both}'
)
css = css.replace(
    '@keyframes q4bShinyTwinkle{0%,100%{opacity:.35;transform:scale(.75) rotate(0)}50%{opacity:1;transform:scale(1.25) rotate(25deg)}}\n@keyframes q4bShinyReveal{0%{opacity:.35;transform:scale(.92);filter:brightness(1)}35%{opacity:1;transform:scale(1.045);filter:brightness(1.35)}100%{opacity:1;transform:none;filter:none}}\n@keyframes q4bShinyBurst{0%{opacity:0;transform:translateY(18px) scale(.6)}35%{opacity:1}100%{opacity:0;transform:translateY(-18px) scale(1.25)}}',
    '@keyframes q4bShinyTwinkle{0%,100%{opacity:.25;transform:scale(.55) rotate(-18deg)}45%{opacity:1;transform:scale(1.55) rotate(28deg)}70%{opacity:.72;transform:scale(1.05) rotate(42deg)}}\n@keyframes q4bShinyAura{0%,100%{filter:drop-shadow(0 0 4px rgba(255,200,45,.55))}50%{filter:drop-shadow(0 0 10px rgba(255,210,50,.95)) drop-shadow(0 0 17px rgba(80,195,255,.72))}}\n@keyframes q4bShinyReveal{0%{opacity:.08;transform:scale(.72) rotate(-4deg);filter:brightness(2.3) saturate(1.8)}28%{opacity:1;transform:scale(1.16) rotate(2deg);filter:brightness(1.75) saturate(1.5);box-shadow:0 0 38px rgba(255,192,42,.95),0 0 68px rgba(83,203,255,.72)}52%{transform:scale(.97) rotate(-1deg);filter:brightness(1.25)}72%{transform:scale(1.045);filter:brightness(1.12)}100%{opacity:1;transform:none;filter:none}}\n@keyframes q4bShinyBurst{0%{opacity:0;transform:translateY(32px) scale(.35) rotate(-8deg)}24%{opacity:1;transform:translateY(0) scale(1.18) rotate(2deg)}55%{opacity:1;transform:translateY(-10px) scale(1)}100%{opacity:0;transform:translateY(-38px) scale(1.45) rotate(9deg)}}'
)
css = css.replace(
    '@media(prefers-reduced-motion:reduce){.q4b-shiny-detail::before,.q4b-shiny-detail::after,.q4b-shiny-reveal,.q4b-shiny-reveal::after,.q4b-morning-catch-note{animation:none!important}.q4b-shiny-reveal::after{display:none}}',
    '@media(prefers-reduced-motion:reduce){.q4b-shiny-detail,.q4b-shiny-detail::before,.q4b-shiny-detail::after,.q4b-shiny-reveal,.q4b-shiny-reveal::after,.q4b-morning-catch-note{animation:none!important}.q4b-shiny-reveal::after{display:none}}'
)
css_path.write_text(css, encoding="utf-8")

# 2) Do not add new full-card styling to pre-existing shiny eggs.
js_path = ROOT / "shared" / "shiny_bonus.js"
js = js_path.read_text(encoding="utf-8")
egg_block = '''\n    var eggMarks = root.querySelectorAll ? root.querySelectorAll(".q4b-egg-shiny") : [];\n    for(var j=0;j<eggMarks.length;j++){\n      var eggCard = eggMarks[j].closest(".q4b-egg-card, .zd-egg-row, .zd-egg-pending-row");\n      if(eggCard) eggCard.classList.add("q4b-shiny-egg");\n    }\n'''
if egg_block not in js:
    raise SystemExit("egg decoration block not found")
js = js.replace(egg_block, "\n", 1)
js_path.write_text(js, encoding="utf-8")

# 3) Preview focuses on adult shiny presentation, not the hidden egg behavior.
preview_path = ROOT / "shiny_preview.html"
preview = preview_path.read_text(encoding="utf-8")
preview = preview.replace('.bug svg{width:100%;height:100%}.egg{font-size:78px;line-height:1.2}.label{display:inline-block;margin-top:8px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:800;background:#eee}', '.bug svg{width:100%;height:100%}')
egg_section = '''\n  <section class="panel">\n    <h2>色違い卵</h2>\n    <div class="grid">\n      <div class="card"><div class="egg">🥚</div><h2>通常の卵</h2><span class="label">ふ化まで 2日</span></div>\n      <div class="card q4b-shiny-egg"><div class="egg q4b-egg-shiny">🥚✨</div><h2>色違いの卵</h2><span class="label">ふ化まで 2日</span></div>\n    </div>\n  </section>\n'''
if egg_section not in preview:
    raise SystemExit("egg preview section not found")
preview = preview.replace(egg_section, "\n", 1)
preview = preview.replace('setTimeout(function(){card.classList.remove(\'q4b-shiny-reveal\');},1400)', 'setTimeout(function(){card.classList.remove(\'q4b-shiny-reveal\');},1800)')
preview_path.write_text(preview, encoding="utf-8")

print("intensified adult shiny effects and removed egg emphasis")
