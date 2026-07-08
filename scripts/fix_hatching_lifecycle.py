#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    (ROOT / path).write_text(text, encoding="utf-8")


def once(text, old, new, label):
    n = text.count(old)
    if n == 0 and new in text:
        return text
    if n != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {n}")
    return text.replace(old, new, 1)


# --- reward engine ---
p = "shared/reward.js"
s = read(p)
s = once(
    s,
    "  /* 卵生成 (フロー A)。前提チェック + かけら消費 + sex/shiny 抽選 + eggs に追加。",
    "  /* 卵生成 (フロー A)。前提チェック + かけら消費 + sex 抽選 + eggs に追加。\n     色違いは卵では決めず、成虫として羽化する瞬間に抽選する。",
    "layEgg comment",
)
s = once(
    s,
    '''        origin: "lay",\n        bornAt: todayStr(),\n        shiny: rollShiny()''',
    '''        origin: "lay",\n        bornAt: todayStr(),\n        shownStage: "egg"''',
    "layEgg fields",
)
s = once(
    s,
    '''        origin: origin,\n        bornAt: todayStr(),\n        shiny: rollShiny()''',
    '''        origin: origin,\n        bornAt: todayStr(),\n        shownStage: "egg"''',
    "awardEgg fields",
)
old_stage = '''  /* 進捗→ステージ変換 (自然な変換 — 進捗率だけで決まる)。完全変態 4 段階 / 不完全変態 3 段階。 */\n  function naturalStage(egg, sp){\n    var ratio = egg.target>0 ? egg.progress / egg.target : 0;\n    if(sp && sp.metamorphosis === "complete"){\n      if(ratio < 0.25) return "egg";\n      if(ratio < 0.50) return "larva";\n      if(ratio < 0.85) return "pupa";\n      return "adult";\n    } else {\n      if(ratio < 0.35) return "egg";\n      if(ratio < 0.85) return "nymph";\n      return "adult";\n    }\n  }'''
new_stage = '''  /* 進捗→育成中ステージ変換。成虫は育成スロット内の段階ではなく、\n     100% 到達後に hatchEgg を実行した瞬間だけ成立する。\n     完全変態: egg -> larva -> pupa / 不完全変態: egg -> nymph。 */\n  function naturalStage(egg, sp){\n    var ratio = egg.target>0 ? egg.progress / egg.target : 0;\n    if(sp && sp.metamorphosis === "complete"){\n      if(ratio < 0.25) return "egg";\n      if(ratio < 0.50) return "larva";\n      return "pupa";\n    } else {\n      if(ratio < 0.35) return "egg";\n      return "nymph";\n    }\n  }'''
s = once(s, old_stage, new_stage, "naturalStage")
s = once(
    s,
    '''      var next = nextStageFor(egg, sp);\n      if(!next) return null;\n      egg.shownStage = next;''',
    '''      var next = nextStageFor(egg, sp);\n      if(!next || next === "adult") return null;\n      egg.shownStage = next;''',
    "advanceStage adult guard",
)
s = once(
    s,
    '''  /* UI が「タップで かえす」を出すべきか: 自然 stage が adult かつ shown も adult 手前 */\n  function canHatchNow(egg, sp){\n    if(!egg) return false;\n    if(!isHatchReady(egg)) return false;\n    var shown = displayStage(egg, sp);\n    return shown !== "adult";    // shown が既に adult なら hatchEgg 実行で消える\n  }''',
    '''  /* UI が最終の羽化ボタンを出せるか。100% 到達に加え、\n     完全変態は pupa、不完全変態は nymph まで表示済みであることを要求する。 */\n  function canHatchNow(egg, sp){\n    if(!egg || !isHatchReady(egg)) return false;\n    var order = stageOrderFor(sp);\n    return displayStage(egg, sp) === order[order.length-2];\n  }''',
    "canHatchNow",
)
s = once(
    s,
    '''      var sp = spById(id);\n      if(!sp) return null;\n      var size = rollSize(sp, egg.sex);''',
    '''      var sp = spById(id);\n      if(!sp || !canHatchNow(egg, sp)) return null;\n      var size = rollSize(sp, egg.sex);''',
    "hatch precondition",
)
s = once(
    s,
    '''        /* breeding 保存成功後に caller が coll.records に追加するため、 ここで\n           record() を呼ぶ。 record() は coll の in-place mutation で同期的に動く。 */\n        record(coll, sp, {sex: egg.sex, size: size, shiny: egg.shiny, reared: true, bornAt: egg.bornAt});\n        return {egg: egg, sp: sp, size: size, totalReared: bs.stats.totalReared,\n                prevTier: prevTier.tier, newTier: newTier.tier, leveledUp: leveledUp};''',
    '''        /* 色違いは保存済み卵属性ではなく、成虫として羽化したこの瞬間に抽選する。\n           legacy egg.shiny は意図的に無視し、結果だけを羽化演出と個体 record に渡す。 */\n        var hatchShiny = rollShiny({source:"hatch"});\n        delete egg.shiny;\n        egg.shiny = hatchShiny;\n        egg.stageHistory = egg.stageHistory || [];\n        if(!egg.stageHistory.some(function(h){ return h.stage === "adult"; })){\n          egg.stageHistory.push({stage:"adult", d:todayStr()});\n        }\n        record(coll, sp, {sex: egg.sex, size: size, shiny: hatchShiny, reared: true, bornAt: egg.bornAt});\n        return {egg: egg, sp: sp, size: size, shiny:hatchShiny, totalReared: bs.stats.totalReared,\n                prevTier: prevTier.tier, newTier: newTier.tier, leveledUp: leveledUp};''',
    "hatch shiny roll",
)
write(p, s)

# --- breeding UI / animation ---
p = "shared/breeding.js"
s = read(p)
s = once(
    s,
    '''    var nextIsAdult = nextStage === "adult";\n    var ready = r.isHatchReady(egg);\n    /* CTA: 次が adult なら hatch、それ以外は advance */\n    var showCta = canAdv && (nextIsAdult ? ready : true);''',
    '''    var nextIsAdult = nextStage === "adult";\n    var ready = r.isHatchReady(egg);\n    /* 中間段階は advance、最終段階まで表示済みかつ100%なら hatch。 */\n    var showCta = canAdv || (nextIsAdult && ready);''',
    "egg card CTA",
)
s = once(
    s,
    '''    var shinyMark = egg.shiny ? '<span class="q4b-egg-shiny" style="color:#f5b800;font-weight:700">✨</span>' : '';\n''',
    '',
    "remove egg shiny mark",
)
s = once(
    s,
    '''+   '<div style="font-size:12px;font-weight:800;color:#2A3D2C;text-align:center;line-height:1.2;min-height:28px;display:flex;align-items:center;justify-content:center">'+esc(name)+shinyMark+'</div>' ''',
    '''+   '<div style="font-size:12px;font-weight:800;color:#2A3D2C;text-align:center;line-height:1.2;min-height:28px;display:flex;align-items:center;justify-content:center">'+esc(name)+'</div>' ''',
    "egg card name",
)
s = once(
    s,
    '''    var readyLine = canAdv\n      ? '<div style="font-size:10px;color:#F2A33C;text-align:center;font-weight:800;margin-top:3px">✨ つぎに すすめるよ!</div>'\n      : '';''',
    '''    var readyLine = showCta\n      ? '<div style="font-size:10px;color:#F2A33C;text-align:center;font-weight:800;margin-top:3px">✨ つぎに すすめるよ!</div>'\n      : '';''',
    "ready line",
)
s = once(
    s,
    '''    var stages = sp.metamorphosis === "complete"\n      ? ["egg","larva","pupa","adult"]\n      : ["egg","nymph","adult"];''',
    '''    /* adult は中間 stageVisual に入れない。最後に実昆虫アートとして一度だけ表示する。 */\n    var stages = sp.metamorphosis === "complete"\n      ? ["egg","larva","pupa"]\n      : ["egg","nymph"];''',
    "hatch stages",
)
s = s.replace("    /* 4段階 (or 3段階) を ~0.55s 間隔で見せ、最後に成虫アート。SVG があれば img、なければ emoji */",
              "    /* 育成中段階を ~0.55s 間隔で振り返り、最後に成虫アートを一度だけ表示する。 */", 1)
write(p, s)

# Bump cache-busting refs in all entry HTML files.
for p in ["index.html", "battle.html", "kanji/index.html", "keisan/index.html", "eitango/index.html"]:
    s = read(p)
    s = re.sub(r'(shared/reward\.js\?v=)[^\"\']+', r'\g<1>0.8.1', s)
    s = re.sub(r'(shared/breeding\.js\?v=)[^\"\']+', r'\g<1>0.6.1', s)
    write(p, s)

# Static invariants.
r = read("shared/reward.js")
b = read("shared/breeding.js")
assert 'shiny: rollShiny()' not in r
assert 'shownStage: "egg"' in r
assert 'var hatchShiny = rollShiny({source:"hatch"});' in r
assert 'if(!next || next === "adult") return null;' in r
assert 'if(ratio < 0.85)' not in r[r.index('function naturalStage'):r.index('function currentStage')]
assert 'var shinyMark = egg.shiny' not in b
assert '["egg","larva","pupa","adult"]' not in b
assert '["egg","nymph","adult"]' not in b
print("hatching lifecycle patch applied")
