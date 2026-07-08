#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count == 0:
        if new in text:
            return text
        raise RuntimeError(f"{label}: target not found")
    if count != 1:
        raise RuntimeError(f"{label}: expected one target, found {count}")
    return text.replace(old, new, 1)


def replace_after(text, marker, old, new, label):
    start = text.find(marker)
    if start < 0:
        raise RuntimeError(f"{label}: marker not found")
    pos = text.find(old, start)
    if pos < 0:
        if text.find(new, start) >= 0:
            return text
        raise RuntimeError(f"{label}: target not found after marker")
    return text[:pos] + new + text[pos + len(old):]


SHINY_JS = r'''/* Quest4Bugs morning shiny bonus and shared shiny presentation layer. */
(function(global){
  "use strict";

  var NORMAL_CHANCE = 0.015;
  var MORNING_CHANCE = 0.045;
  var lastMorningCatchAt = 0;
  var summaryTimer = null;

  function isMorningBonusTime(date){
    var d = date || new Date();
    var h = d.getHours();
    return h >= 6 && h < 8;
  }

  function shinyTitle(count){
    var table = [
      [100, "色ちがい博士"],
      [50, "きらめきマスター"],
      [25, "虹色コレクター"],
      [10, "色ちがいコレクター"],
      [5, "きらめきハンター"]
    ];
    for(var i=0;i<table.length;i++) if(count >= table[i][0]) return table[i][1];
    return "";
  }

  function addShinyIds(out, catches){
    if(!catches) return;
    for(var id in catches){
      if(Object.prototype.hasOwnProperty.call(catches,id) && catches[id] && catches[id].shiny) out[id] = true;
    }
  }

  function shinySpeciesCount(states){
    states = states || {};
    var ids = {};
    var keisan = states.keisan || {};
    var kanji = states.kanji || {};
    var eitango = states.eitango || {};
    var battle = states.battle || {};
    addShinyIds(ids, keisan.coll && keisan.coll.catches);
    addShinyIds(ids, kanji.coll && kanji.coll.catches);
    addShinyIds(ids, eitango.catches || (eitango.coll && eitango.coll.catches));
    addShinyIds(ids, battle.bosses);
    return Object.keys(ids).length;
  }

  function wrapRenderer(name){
    var renderer = global.Q4BRender;
    if(!renderer || typeof renderer[name] !== "function" || renderer[name].__q4bShinyWrapped) return;
    var original = renderer[name];
    var wrapped = function(sp, shiny, sex){
      var html = original.apply(this, arguments);
      if(!shiny) return html;
      return '<span class="q4b-shiny-art q4b-shiny-static" data-q4b-shiny="1">'
        + html + '<span class="q4b-shiny-badge" aria-hidden="true">✨</span></span>';
    };
    wrapped.__q4bShinyWrapped = true;
    wrapped.__q4bOriginal = original;
    renderer[name] = wrapped;
  }

  function trackMorningResult(result){
    if(result && result.morningBonus){
      lastMorningCatchAt = Date.now();
    }
    return result;
  }

  function wrapRewardMethod(name){
    var reward = global.Q4BReward;
    if(!reward || typeof reward[name] !== "function" || reward[name].__q4bShinyTracked) return;
    var original = reward[name];
    var wrapped = function(){ return trackMorningResult(original.apply(this, arguments)); };
    wrapped.__q4bShinyTracked = true;
    wrapped.__q4bOriginal = original;
    reward[name] = wrapped;
  }

  function mountMorningBanner(){
    var old = document.getElementById("q4b-morning-shiny-banner");
    if(!isMorningBonusTime()){
      if(old) old.remove();
      return;
    }
    if(old) return;
    var banner = document.createElement("div");
    banner.id = "q4b-morning-shiny-banner";
    banner.setAttribute("role", "status");
    banner.innerHTML = '<span class="q4b-morning-sun">🌅</span><span><b>朝露ボーナス</b><small>朝8時まで 色ちがい3倍</small></span>';
    document.body.appendChild(banner);
  }

  function addMorningCatchMessage(){
    if(!lastMorningCatchAt || Date.now() - lastMorningCatchAt > 4000) return;
    var candidates = document.querySelectorAll(".card.center, .mcard, .face.front");
    for(var i=0;i<candidates.length;i++){
      var el = candidates[i];
      if(el.textContent.indexOf("つかまえた") < 0 && !(el.classList.contains("face") && el.textContent.indexOf("✨") >= 0)) continue;
      var host = el.classList.contains("face") ? (el.closest(".card") || el.parentElement) : el;
      if(host && !host.querySelector(".q4b-morning-catch-note")){
        var note = document.createElement("div");
        note.className = "q4b-morning-catch-note";
        note.textContent = "🌅 朝露ボーナスで見つけた！";
        var heading = host.querySelector("h2,h3");
        if(heading && heading.nextSibling) heading.parentNode.insertBefore(note, heading.nextSibling);
        else host.insertBefore(note, host.firstChild);
      }
      lastMorningCatchAt = 0;
      break;
    }
  }

  function decorate(root){
    root = root || document;
    var cards = root.querySelectorAll ? root.querySelectorAll(".zc, .face.front, .shiny-card") : [];
    for(var i=0;i<cards.length;i++){
      var card = cards[i];
      if(card.classList.contains("shiny-card") || card.textContent.indexOf("✨") >= 0){
        card.classList.add("q4b-shiny-card");
        if(card.classList.contains("face") && !card.dataset.q4bShinyRevealed){
          card.dataset.q4bShinyRevealed = "1";
          card.classList.add("q4b-shiny-reveal");
          (function(c){ setTimeout(function(){ c.classList.remove("q4b-shiny-reveal"); }, 1400); })(card);
        }
      }
    }

    var eggMarks = root.querySelectorAll ? root.querySelectorAll(".q4b-egg-shiny") : [];
    for(var j=0;j<eggMarks.length;j++){
      var eggCard = eggMarks[j].closest(".q4b-egg-card, .zd-egg-row, .zd-egg-pending-row");
      if(eggCard) eggCard.classList.add("q4b-shiny-egg");
    }

    var arts = root.querySelectorAll ? root.querySelectorAll(".q4b-shiny-art") : [];
    for(var k=0;k<arts.length;k++){
      if(arts[k].closest(".modal, .mcard, [data-q4b-zd], .drop-award")) arts[k].classList.add("q4b-shiny-detail");
    }

    addMorningCatchMessage();
  }

  function isPortal(){
    var p = (global.location && global.location.pathname) || "";
    return !/(?:\/kanji\/|\/keisan\/|\/eitango\/|\/battle\.html$)/.test(p);
  }

  function loadShinySummary(){
    if(!isPortal() || !global.QuestSave || !QuestSave.currentProfile || !QuestSave.load) return;
    var pid = QuestSave.currentProfile();
    var existing = document.getElementById("q4b-shiny-summary");
    if(!pid){ if(existing) existing.remove(); return; }
    Promise.all([
      QuestSave.load("keisan",pid),
      QuestSave.load("kanji",pid),
      QuestSave.load("eitango",pid),
      QuestSave.load("battle",pid)
    ]).then(function(r){
      if(QuestSave.currentProfile() !== pid) return;
      var count = shinySpeciesCount({keisan:r[0],kanji:r[1],eitango:r[2],battle:r[3]});
      var title = shinyTitle(count);
      var box = document.getElementById("q4b-shiny-summary");
      if(!box){
        box = document.createElement("div");
        box.id = "q4b-shiny-summary";
        box.className = "q4b-shiny-summary";
        var hero = document.querySelector(".hero");
        if(hero && hero.parentNode) hero.parentNode.insertBefore(box, hero.nextSibling);
        else document.body.insertBefore(box, document.body.firstChild);
      }
      box.innerHTML = '<span class="q4b-shiny-summary-icon">✨</span><span><b>色ちがい '+count+'種</b>'
        +(title?'<small>現在の称号　'+title+'</small>':'<small>5種で最初の称号</small>')+'</span>';
    }).catch(function(){});
  }

  function scheduleSummary(){
    if(!isPortal()) return;
    clearTimeout(summaryTimer);
    summaryTimer = setTimeout(loadShinySummary, 400);
  }

  function init(){
    wrapRenderer("species");
    wrapRenderer("deco");
    wrapRewardMethod("award");
    wrapRewardMethod("onCorrect");
    mountMorningBanner();
    decorate(document);
    scheduleSummary();

    if(global.MutationObserver){
      var observer = new MutationObserver(function(mutations){
        for(var i=0;i<mutations.length;i++){
          for(var j=0;j<mutations[i].addedNodes.length;j++){
            var node = mutations[i].addedNodes[j];
            if(node && node.nodeType === 1) decorate(node);
          }
        }
        mountMorningBanner();
        scheduleSummary();
      });
      observer.observe(document.body, {childList:true, subtree:true});
    }
  }

  global.Q4BShiny = {
    NORMAL_CHANCE: NORMAL_CHANCE,
    MORNING_CHANCE: MORNING_CHANCE,
    isMorningBonusTime: isMorningBonusTime,
    shinySpeciesCount: shinySpeciesCount,
    shinyTitle: shinyTitle,
    decorate: decorate,
    refreshSummary: loadShinySummary
  };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})(window);
'''


SHINY_CSS = r'''/* Quest4Bugs shared shiny presentation */
.q4b-shiny-art{position:relative;display:block;width:100%;height:100%;isolation:isolate}
.q4b-shiny-art>svg{display:block;width:100%;height:100%;filter:drop-shadow(0 0 4px rgba(255,213,74,.48))}
.q4b-shiny-badge{position:absolute;right:-2px;top:-3px;z-index:2;font-size:15px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.28));pointer-events:none}
.q4b-shiny-art::before,.q4b-shiny-art::after{content:"✦";position:absolute;z-index:2;color:#fff4a8;text-shadow:0 0 4px #ffb52e,0 0 8px #79d7ff;pointer-events:none;opacity:.88}
.q4b-shiny-art::before{left:6%;top:13%;font-size:13px}
.q4b-shiny-art::after{right:7%;bottom:12%;font-size:10px}
.q4b-shiny-card{outline:2px solid rgba(241,190,51,.9)!important;outline-offset:-2px;box-shadow:0 0 0 3px rgba(110,205,255,.18),0 4px 12px rgba(242,163,60,.24)!important}
.q4b-shiny-detail::before{animation:q4bShinyTwinkle 2.4s ease-in-out infinite}
.q4b-shiny-detail::after{animation:q4bShinyTwinkle 2.4s ease-in-out .8s infinite}
.q4b-shiny-egg{border-color:#e6b82f!important;box-shadow:0 0 0 3px rgba(113,207,255,.2),0 2px 8px rgba(242,163,60,.24)!important;background-image:linear-gradient(135deg,rgba(255,246,195,.35),rgba(214,244,255,.35))!important}
.q4b-shiny-reveal{animation:q4bShinyReveal 1.15s ease-out both!important}
.q4b-shiny-reveal::after{content:"✦  ✨  ✦";position:absolute;inset:8% 0 auto;text-align:center;font-size:22px;letter-spacing:12px;color:#fff8bb;text-shadow:0 0 8px #ffb52e,0 0 14px #6fd8ff;pointer-events:none;animation:q4bShinyBurst 1.1s ease-out both}
#q4b-morning-shiny-banner{position:fixed;top:8px;left:8px;z-index:9997;display:flex;align-items:center;gap:7px;max-width:230px;padding:7px 10px;border:2px solid #e7b939;border-radius:14px;background:rgba(255,251,224,.96);box-shadow:0 3px 10px rgba(68,75,40,.22);color:#493b1c;font-size:12px;font-family:inherit;pointer-events:none}
#q4b-morning-shiny-banner b{display:block;font-size:13px;line-height:1.15}
#q4b-morning-shiny-banner small{display:block;font-size:10px;line-height:1.2;color:#755f2f;font-weight:800}
.q4b-morning-sun{font-size:22px;line-height:1}
.q4b-morning-catch-note{display:inline-block;margin:3px auto 7px;padding:4px 10px;border-radius:999px;background:#fff2b8;border:1px solid #e6b82f;color:#6a4c13;font-size:12px;font-weight:900;animation:q4bShinyReveal .8s ease-out both}
.q4b-shiny-summary{display:flex;align-items:center;gap:10px;margin:0 0 14px;padding:10px 13px;border:2px solid #d8bd54;border-radius:15px;background:linear-gradient(135deg,#fff8d8,#edfaff);box-shadow:0 3px 9px rgba(63,84,52,.14);color:#2a3d2c}
.q4b-shiny-summary-icon{font-size:28px;filter:drop-shadow(0 0 5px #ffc947)}
.q4b-shiny-summary b{display:block;font-size:15px;line-height:1.2}
.q4b-shiny-summary small{display:block;margin-top:2px;font-size:10px;color:#6b7a5e;font-weight:800}
body.night #q4b-morning-shiny-banner{background:rgba(54,48,25,.96);border-color:#d5ad3d;color:#fff5c7}
body.night #q4b-morning-shiny-banner small{color:#e7d18b}
body.night .q4b-shiny-summary{background:linear-gradient(135deg,#35301c,#20374a);color:#f4f6e9;border-color:#c7a847}
body.night .q4b-shiny-summary small{color:#d5dfc5}
@keyframes q4bShinyTwinkle{0%,100%{opacity:.35;transform:scale(.75) rotate(0)}50%{opacity:1;transform:scale(1.25) rotate(25deg)}}
@keyframes q4bShinyReveal{0%{opacity:.35;transform:scale(.92);filter:brightness(1)}35%{opacity:1;transform:scale(1.045);filter:brightness(1.35)}100%{opacity:1;transform:none;filter:none}}
@keyframes q4bShinyBurst{0%{opacity:0;transform:translateY(18px) scale(.6)}35%{opacity:1}100%{opacity:0;transform:translateY(-18px) scale(1.25)}}
@media(max-width:520px){#q4b-morning-shiny-banner{top:54px;max-width:190px;padding:5px 8px}.q4b-morning-sun{font-size:19px}}
@media(prefers-reduced-motion:reduce){.q4b-shiny-detail::before,.q4b-shiny-detail::after,.q4b-shiny-reveal,.q4b-shiny-reveal::after,.q4b-morning-catch-note{animation:none!important}.q4b-shiny-reveal::after{display:none}}
'''


def patch_reward():
    path = "shared/reward.js"
    text = read(path)
    text = replace_once(
        text,
        "  var SHINY_CHANCE = 0.03;",
        """  var SHINY_CHANCE_NORMAL = 0.015;\n  var SHINY_CHANCE_MORNING = 0.045;\n  function isMorningBonusTime(date){\n    var d=date||new Date(), h=d.getHours();\n    return h>=6 && h<8;\n  }\n  function shinyChanceFor(opts){\n    opts=opts||{};\n    return opts.source===\"wild\" && isMorningBonusTime(opts.now) ? SHINY_CHANCE_MORNING : SHINY_CHANCE_NORMAL;\n  }""",
        "reward shiny constants",
    )
    text = replace_once(
        text,
        "  function rollShiny(){ return Math.random() < SHINY_CHANCE; }",
        "  function rollShiny(opts){ return Math.random() < shinyChanceFor(opts); }",
        "reward rollShiny",
    )
    text = replace_once(
        text,
        "    var shiny = (opts.shiny!=null) ? !!opts.shiny : rollShiny();",
        "    var shiny = (opts.shiny!=null) ? !!opts.shiny : rollShiny(opts);",
        "reward record shiny",
    )
    text = replace_once(
        text,
        "    return { sp:sp, size:size, shiny:shiny, sex:sex, reared:reared, isNew:isNew, isRecord:isRecord, tier:tierOf(sp) };",
        "    return { sp:sp, size:size, shiny:shiny, sex:sex, reared:reared, isNew:isNew, isRecord:isRecord, tier:tierOf(sp), morningBonus:!!(shiny && opts.source===\"wild\" && isMorningBonusTime(opts.now)) };",
        "reward record result",
    )
    text = replace_after(
        text,
        "  function spendForCatch(",
        "    return sp ? record(coll, sp) : null;",
        "    return sp ? record(coll, sp, {source:\"amber\"}) : null;",
        "amber catch source",
    )
    text = replace_after(
        text,
        "  function onCorrect(",
        "    return record(coll, sp);",
        "    return record(coll, sp, {source:\"wild\"});",
        "onCorrect wild source",
    )
    text = replace_after(
        text,
        "  function award(",
        "    return sp ? record(coll, sp) : null;",
        "    return sp ? record(coll, sp, {source:\"wild\"}) : null;",
        "award wild source",
    )
    write(path, text)


def patch_shizuku_records():
    path = "index.html"
    text = read(path)
    if "function markEntryShiny(entry)" in text:
        return
    pattern = re.compile(r"function markCatchShiny\(source,state,id\)\{.*?\n\}\nfunction makeShinyUi", re.S)
    replacement = r'''function markEntryShiny(entry){
  if(!entry)return false;
  entry.shiny=1;
  if(entry.normal==null)entry.normal=1;
  var records=entry.records||[];
  var hasShiny=records.some(function(r){return !!(r&&r.shiny);});
  if(!hasShiny&&records.length){
    var best=records.length-1, bestDate=records[best]&&records[best].d||"";
    for(var i=records.length-2;i>=0;i--){
      var d=records[i]&&records[i].d||"";
      if(d>bestDate){best=i;bestDate=d;}
    }
    if(records[best])records[best].shiny=true;
  }
  return true;
}
function markCatchShiny(source,state,id){
  if(source==="eitango"){
    if(!state.catches||!state.catches[id])return false;
    return markEntryShiny(state.catches[id]);
  }
  if(source==="battle"){
    if(!state.bosses||!state.bosses[id])return false;
    state.bosses[id].shiny=1;
    return true;
  }
  if(!state.coll||!state.coll.catches||!state.coll.catches[id])return false;
  return markEntryShiny(state.coll.catches[id]);
}
function makeShinyUi'''
    text2, n = pattern.subn(replacement, text, count=1)
    if n != 1:
        raise RuntimeError(f"index markCatchShiny replacement count={n}")
    write(path, text2)


def patch_html(path, prefix):
    text = read(path)
    css = f'<link rel="stylesheet" href="{prefix}shared/shiny_bonus.css?v=0.1.0">'
    js = f'<script src="{prefix}shared/shiny_bonus.js?v=0.1.0"></script>'
    if css not in text:
        text = text.replace("</head>", "  " + css + "\n</head>", 1)
    if js not in text:
        text = text.replace("</body>", js + "\n</body>", 1)
    text = re.sub(r"(shared/reward\.js\?v=)[^\"']+", r"\g<1>0.8.0", text)
    write(path, text)


def patch_sw():
    path = "sw.js"
    text = read(path)
    if 'q4b-cache-v122' in text:
        text = text.replace('q4b-cache-v122', 'q4b-cache-v123', 1)
    if '"./shared/shiny_bonus.js"' not in text:
        text = text.replace(
            '"./shared/bespoke.js", "./shared/reward.js", "./shared/furigana.js",',
            '"./shared/bespoke.js", "./shared/reward.js", "./shared/shiny_bonus.js", "./shared/shiny_bonus.css", "./shared/furigana.js",',
            1,
        )
    write(path, text)


def patch_release():
    path = "index.html"
    text = read(path)
    text = re.sub(r'(<meta name="q4b-release" content=")[^"]+("")', r'\g<1>0.4.39\2', text)
    # Handle the normal one-quote closing form.
    text = re.sub(r'(<meta name="q4b-release" content=")[^"]+(">)', r'\g<1>0.4.39\2', text)
    write(path, text)


def validate():
    reward = read("shared/reward.js")
    required = [
        "SHINY_CHANCE_NORMAL = 0.015",
        "SHINY_CHANCE_MORNING = 0.045",
        'record(coll, sp, {source:"wild"})',
        'record(coll, sp, {source:"amber"})',
        "morningBonus:",
    ]
    for token in required:
        if token not in reward:
            raise RuntimeError(f"missing reward token: {token}")
    for path in ["index.html", "battle.html", "kanji/index.html", "keisan/index.html", "eitango/index.html"]:
        html = read(path)
        if "shiny_bonus.js" not in html or "shiny_bonus.css" not in html:
            raise RuntimeError(f"missing shiny assets in {path}")
    sw = read("sw.js")
    if "shiny_bonus.js" not in sw or "shiny_bonus.css" not in sw:
        raise RuntimeError("service worker cache list is missing shiny assets")


def main():
    patch_reward()
    patch_shizuku_records()
    write("shared/shiny_bonus.js", SHINY_JS)
    write("shared/shiny_bonus.css", SHINY_CSS)
    patch_html("index.html", "./")
    patch_html("battle.html", "./")
    patch_html("kanji/index.html", "../")
    patch_html("keisan/index.html", "../")
    patch_html("eitango/index.html", "../")
    patch_sw()
    patch_release()
    validate()
    print("Morning shiny bonus patch applied successfully")


if __name__ == "__main__":
    main()
