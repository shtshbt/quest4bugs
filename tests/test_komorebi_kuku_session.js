/* れんぞく九九を「画面から」遊びきるテスト。
   エンジンの単体テスト (test_komorebi_kuku_run.js) が通っていても、ボタンが描かれない・
   ハンドラが結線されない・だんランの鎖が進まない、といった配線ミスは捕まらない。
   実際に innerHTML を読んでボタンを押し、5 問を最後まで通す。
   node tests/test_komorebi_kuku_session.js で実行。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
let passed = 0;
function test(name, fn){ fn(); passed++; console.log("PASS", name); }

/* --- 最小の DOM。innerHTML から要素を拾い、click を発火できるだけのもの --- */

function parseAttrs(tagText){
  const attrs = {};
  const re = /([\w-]+)(?:="([^"]*)")?/g;
  let m;
  re.exec(tagText);                       /* タグ名を読み飛ばす */
  while((m = re.exec(tagText))) attrs[m[1]] = m[2] === undefined ? "" : m[2];
  return attrs;
}

function parseElements(html, owner){
  const elements = [];
  const re = /<(button|form|ol|div|span|aside|section|h2)\b([^>]*)>/g;
  let m;
  while((m = re.exec(html))){
    const attrs = parseAttrs(m[1] + " " + m[2]);
    const element = {
      tag: m[1], attrs, listeners: {}, disabled: false, style: {},
      classList: { toggle(){}, add(){}, remove(){} },
      getAttribute(name){ return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null; },
      setAttribute(name, value){ attrs[name] = String(value); },
      addEventListener(type, fn){ (this.listeners[type] = this.listeners[type] || []).push(fn); },
      querySelector(selector){ return owner ? owner.querySelector(selector) : null; },
      querySelectorAll(selector){ return owner ? owner.querySelectorAll(selector) : []; },
      insertAdjacentHTML(){},
      focus(){},
      click(){ (this.listeners.click || []).forEach(fn => fn({ preventDefault(){}, target: this })); },
      submit(){ (this.listeners.submit || []).forEach(fn => fn({ preventDefault(){}, target: this })); }
    };
    /* 小道の地図は #pathPanel の innerHTML だけを差し替える。親の HTML に混ぜないと
       「カテゴリのボタンが描かれていない」を見逃す。 */
    Object.defineProperty(element, "innerHTML", {
      get(){ return element._html || ""; },
      set(value){
        element._html = value;
        if(!owner) return;
        owner._extra.push(value);
        owner._elements = owner._elements.concat(parseElements(value, owner));
      }
    });
    elements.push(element);
  }
  return elements;
}

function matches(element, selector){
  const last = selector.trim().split(/\s+/).pop();
  if(last[0] === "["){
    const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(last);
    if(!m) return false;
    const value = element.attrs[m[1]];
    return value !== undefined && (m[2] === undefined || value === m[2]);
  }
  if(last[0] === ".") return (element.attrs.class || "").split(/\s+/).indexOf(last.slice(1)) >= 0;
  if(last[0] === "#") return element.attrs.id === last.slice(1);
  return element.tag === last;
}

function makeApp(){
  const app = {
    _html: "", _extra: [], _elements: [],
    get innerHTML(){ return this._html + this._extra.join(""); },
    set innerHTML(value){ this._html = value; this._extra = []; this._elements = parseElements(value, this); },
    style: {}, classList: { toggle(){}, add(){}, remove(){} },
    setAttribute(){}, getAttribute(){ return null; }, addEventListener(){},
    insertAdjacentHTML(){}, appendChild(child){ return child; },
    querySelector(selector){ return this._elements.filter(el => matches(el, selector))[0] || null; },
    querySelectorAll(selector){ return this._elements.filter(el => matches(el, selector)); }
  };
  return app;
}

function bootContext(){
  const app = makeApp();
  const saved = {};
  const context = {
    console, setTimeout, clearTimeout,
    location: { href: "", search: "" },
    document: {
      getElementById(id){ return id === "app" ? app : app.querySelector("#" + id); },
      querySelector(selector){ return app.querySelector(selector) || makeApp(); },
      querySelectorAll(selector){ return app.querySelectorAll(selector); },
      createElement(){ return makeApp(); },
      addEventListener(){},
      body: { appendChild(child){ return child; } }
    },
    fetch(url){
      const file = url.indexOf("world_paths.json") >= 0 ? "komorebi/assets/world_paths.json"
        : url.indexOf("ratio_pool.json") >= 0 ? "komorebi/assets/ratio_pool.json" : null;
      assert.ok(file, "a known runtime payload is fetched: " + url);
      const payload = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
    },
    QuestSave: {
      currentProfile: () => "p1",
      load(game){ return Promise.resolve(game === "keisan" ? { type: "k5" } : saved[game] || null); },
      save(game, id, state){ saved[game] = JSON.parse(JSON.stringify(state)); return Promise.resolve(true); },
      syncDown: () => Promise.resolve()
    },
    __app: app, __saved: saved
  };
  context.window = context;
  context.global = context;
  vm.createContext(context);
  /* 5 歳コースのふりがなは keisan/app.js の furi5 が付ける。小道のページも同じものを
     読み込んでいるので、テストも同じ構成で走らせる。 */
  context.Q4B_KEISAN_NO_BOOT = true;
  for(const file of ["shared/bugs.js", "shared/render.js", "shared/bug_archetypes.js", "shared/reward.js",
    "shared/furigana.js", "shared/kuku_phrases.js", "keisan/app.js",
    "komorebi/volumes/volume_fixture.js", "komorebi/ratio_generator.js",
    "komorebi/kuku_run.js", "komorebi/app.js"]){
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  }
  return context;
}

const settle = () => new Promise(resolve => setTimeout(resolve, 20));

(async () => {
  const context = bootContext();
  await settle();
  const app = context.__app;
  const komorebi = context.Q4B_KOMOREBI;
  const volume = context.Q4B_KOMOREBI_VOLUMES.volume_fixture;

  /* 5 歳コースでは漢字に ruby が挟まるので、文言の検査は読みを外した素の文字列で行う。
     タグは空白に置き換える。詰めて連結すると「2×2＝4」と「2×3＝？」が「…42×3＝？」と
     つながり、式の読み取りが壊れる。 */
  const plain = () => app.innerHTML.replace(/<rt>[\s\S]*?<\/rt>/g, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

  test("the path panel offers the kuku run category as playable", () => {
    const button = app.querySelector('[data-cat="kom_kuku_run"]');
    assert.ok(button, "kom_kuku_run is not on the path panel: " + app.innerHTML.slice(0, 200));
    assert.equal(button.attrs.disabled, undefined);
  });

  /* 決定的な乱数で開始する。だんランのおとり位置まで固定されるので、
     「正解ボタンが必ず存在する」ことを押しながら確かめられる。 */
  let seed = 7;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  await komorebi.startKukuRunSession(volume, random);

  const profile = komorebi.profile();
  const questions = () => app.innerHTML;

  test("the session head shows the same level readout as the main game", () => {
    assert.match(questions(), /Lv1　○○○○○○○○○○/, "level dots missing: " + questions().slice(0, 400));
    assert.match(questions(), /採集ゲージ/);
    assert.match(questions(), /第1／5問/);
  });

  test("dan_run draws a chain and one tappable choice row", () => {
    assert.match(questions(), /kuku-chain/);
    assert.equal(app.querySelectorAll("[data-step-choice]").length, 4);
  });

  /* --- 5 問を最後まで正解で押しきる ------------------------------------- */

  function correctStepButton(){
    const question = context.Q4B_KOMOREBI.profile() && null;   /* 内部状態は覗かない */
    const buttons = app.querySelectorAll("[data-step-choice]");
    const shown = /(\d+)×(\d+)＝？/.exec(app.innerHTML);
    assert.ok(shown, "the current step is not displayed: " + app.innerHTML.slice(0, 300));
    const answer = String(Number(shown[1]) * Number(shown[2]));
    const hit = buttons.filter(b => b.attrs.class.indexOf("kuku-num") >= 0 && stripRuby(b) === answer)[0];
    assert.ok(hit, "no button carries the correct product " + answer);
    return hit;
  }
  /* k5 では displayText が ruby を振るので、ボタンの文字列は素の数字ではない。 */
  function stripRuby(button){
    const html = app.innerHTML;
    const re = new RegExp('data-step-choice="' + button.attrs["data-step-choice"] + '">([\\s\\S]*?)</button>');
    const m = re.exec(html);
    return m ? m[1].replace(/<[^>]*>/g, "").replace(/[^0-9]/g, "") : "";
  }

  let steps = 0;
  while(app.querySelectorAll("[data-step-choice]").length && steps < 12){
    correctStepButton().click();
    steps++;
    await settle();
  }

  test("the chain accepts every step and ends the first question", () => {
    assert.equal(steps, 5, "dan_run should be five steps, walked " + steps);
    assert.match(plain(), /正解！/, "the run did not judge as correct: " + plain().slice(0, 300));
  });

  function advance(){
    const next = app.querySelector('[data-action="ratio-next"]');
    assert.ok(next, "no next button on the feedback screen");
    next.click();
  }

  function label(attribute, value){
    const re = new RegExp(attribute + '="' + value + '">([\\s\\S]*?)</button>');
    const m = re.exec(app.innerHTML);
    return m ? m[1].replace(/<rt>[\s\S]*?<\/rt>/g, "").replace(/<[^>]*>/g, "") : "";
  }

  /* 正解は画面に書かれている情報だけから決める。内部状態を覗かないことで、
     「画面だけ見て答えられる」という出題側の条件そのものを検証している。 */
  function correctChoice(){
    const buttons = app.querySelectorAll("[data-choice-index]");
    assert.ok(buttons.length >= 4, "choices missing: " + plain().slice(0, 300));
    const labels = buttons.map(button => label("data-choice-index", button.attrs["data-choice-index"]));
    const equations = labels.map(text => /^(\d+)\s*×\s*(\d+)\s*＝\s*(\d+)$/.exec(text.replace(/\s+/g, " ").trim()));
    if(equations.every(Boolean)){
      const index = equations.findIndex(m => Number(m[1]) * Number(m[2]) !== Number(m[3]));
      assert.ok(index >= 0, "error_find offers no wrong line");
      return buttons[index];
    }
    const digits = labels.map(text => text.replace(/[^0-9]/g, ""));
    const blank = /(\d+)\s*×\s*(\d+)\s*＝\s*？/.exec(plain());
    if(blank){
      const answer = String(Number(blank[1]) * Number(blank[2]));
      const index = digits.indexOf(answer);
      assert.ok(index >= 0, "the product " + answer + " is not among the choices");
      return buttons[index];
    }
    const dan = /(\d+)のだん/.exec(plain());
    assert.ok(dan, "the board does not name its table: " + plain().slice(0, 200));
    const chips = (app.innerHTML.match(/class="kuku-chip"[^>]*>[\s\S]*?<\/span>/g) || [])
      .map(chunk => chunk.replace(/<rt>[\s\S]*?<\/rt>/g, "").replace(/<[^>]*>/g, "").replace(/[^0-9]/g, ""));
    const missing = [];
    for(let b = 1; b <= 9; b++){
      const value = String(Number(dan[1]) * b);
      if(chips.indexOf(value) < 0) missing.push(value);
    }
    assert.equal(missing.length, 1, "the board must hide exactly one product, it hid " + missing.length);
    const index = digits.indexOf(missing[0]);
    assert.ok(index >= 0, "the hidden product " + missing[0] + " is not among the choices");
    return buttons[index];
  }

  let solved = 1;
  for(let index = 1; index < 5; index++){
    advance();
    await settle();
    assert.match(plain(), new RegExp("第" + (index + 1) + "／5問"), "the session did not advance to question " + (index + 1));
    correctChoice().click();
    await settle();
    assert.match(plain(), /正解！/, "question " + (index + 1) + " was not judged correct: " + plain().slice(0, 300));
    solved++;
  }

  test("every format can be answered from what the screen shows alone", () => {
    assert.equal(solved, 5);
    assert.equal(profile.collection.gauge, 5, "five correct answers should advance the shared gauge by five");
  });

  test("answers are recorded against kom_kuku_run only", () => {
    assert.equal(profile.stats.kom_kuku_run.n, 5);
    assert.equal(profile.stats.kom_ratio, undefined);
    assert.equal(profile.adapt.kom_kuku_run.n, 5);
  });

  test("the silent latency deck learned the facts it asked about", () => {
    const deck = profile.srs.kuku;
    assert.ok(deck, "no kuku SRS deck was created");
    assert.ok(Object.keys(deck.facts).length >= 5, "the deck recorded " + Object.keys(deck.facts).length + " facts");
    assert.ok(deck.counter > 0);
    Object.keys(deck.facts).forEach(key => {
      assert.match(key, /^[1-9]x[1-9]$/);
      assert.equal(Number.isInteger(deck.facts[key].interval), true);
    });
  });

  test("the saved profile carries the deck so the weakness survives a reload", () => {
    const saved = context.__saved.komorebi;
    assert.ok(saved && saved.srs && saved.srs.kuku, "the deck was not persisted");
    assert.equal(komorebi.normalizeProfile(JSON.parse(JSON.stringify(saved))).profile.srs.kuku.counter, saved.srs.kuku.counter);
  });

  test("no timing or speed wording is shown to the child", () => {
    /* categories 3.10: れんぞく九九に時間の可視要素は置かない。 */
    for(const word of ["秒", "タイム", "はやい", "おそい", "スピード"]){
      assert.equal(app.innerHTML.indexOf(word), -1, "the screen exposes timing wording: " + word);
    }
  });

  console.log("RESULT " + passed + " passed, 0 failed");
})().catch(error => {
  console.error("FAIL " + error.message);
  process.exit(1);
});
