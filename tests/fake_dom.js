/* 小道の画面を node から操作するための最小 DOM と起動ヘルパ。
   innerHTML から要素を拾い、click / submit を発火できるだけのもの。本物の DOM は
   使わないが、「ボタンが描かれていない」「ハンドラが結線されていない」という、
   ロジックのテストでは決して落ちない配線ミスを捕まえるのが目的。
   jsdom を入れないのは、この repo が committed dependency を持たないため。 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

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
  const re = /<(button|form|ol|div|span|aside|section|h2|p)\b([^>]*)>/g;
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
  return {
    _html: "", _extra: [], _elements: [],
    get innerHTML(){ return this._html + this._extra.join(""); },
    set innerHTML(value){ this._html = value; this._extra = []; this._elements = parseElements(value, this); },
    style: {}, classList: { toggle(){}, add(){}, remove(){} },
    setAttribute(){}, getAttribute(){ return null; }, addEventListener(){},
    insertAdjacentHTML(){}, appendChild(child){ return child; },
    querySelector(selector){ return this._elements.filter(el => matches(el, selector))[0] || null; },
    querySelectorAll(selector){ return this._elements.filter(el => matches(el, selector)); }
  };
}

/* 5 歳コースでは漢字に ruby が挟まる。文言の検査は読みを外した素の文字列で行う。
   タグは空白へ置き換える。詰めて連結すると「2×2＝4」と「2×3＝？」が
   「…42×3＝？」とつながり、式の読み取りが壊れる。 */
function plainText(html){
  return html
    .replace(/<rt>[\s\S]*?<\/rt>/g, "")
    /* ruby と文字装飾は語の途中に挟まる。空白へ置き換えると「もう一歩！」が
       「もう 一 歩！」になり、文言の検査がすべて外れる。 */
    .replace(/<\/?(ruby|rb|rp|strong|em|b|i)\b[^>]*>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ");
}

/* 小道のページと同じ構成で app.js を起動する。options:
     root        リポジトリのパス
     files       読み込む順のファイル一覧 (index.html の script 順に合わせる)
     profileType "k5" か "k10" (けいさん側の保存が返す type)
     globals     文脈へ足す追加のグローバル (SpeechRecognition など)
     setTimeout  差し替えたいタイマ (段暗唱のタイムバーを待たずに進めるため) */
function bootKomorebi(options){
  const root = options.root;
  const app = makeApp();
  const saved = {};
  const context = {
    console,
    setTimeout: options.setTimeout || setTimeout,
    clearTimeout: options.clearTimeout || clearTimeout,
    location: { href: "", search: options.search || "" },
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
      if(!file) throw new Error("unexpected runtime payload: " + url);
      const payload = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
      return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
    },
    QuestSave: {
      currentProfile: () => "p1",
      load(game){ return Promise.resolve(game === "keisan" ? { type: options.profileType || "k10" } : saved[game] || null); },
      save(game, id, state){ saved[game] = JSON.parse(JSON.stringify(state)); return Promise.resolve(true); },
      syncDown: () => Promise.resolve()
    },
    __app: app, __saved: saved
  };
  Object.assign(context, options.globals || {});
  context.window = context;
  context.global = context;
  vm.createContext(context);
  context.Q4B_KEISAN_NO_BOOT = true;
  for(const file of options.files){
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
  }
  return context;
}

/* 小道のページが読み込む順そのもの。ここを一覧にしておくと、
   「新しい共有モジュールを index.html に足し忘れた」が両テストで同時に落ちる。 */
const KOMOREBI_FILES = [
  "shared/bugs.js", "shared/render.js", "shared/bug_archetypes.js", "shared/reward.js",
  "shared/furigana.js", "shared/kuku_phrases.js", "keisan/app.js",
  "komorebi/volumes/volume_fixture.js", "komorebi/ratio_generator.js",
  "komorebi/kuku_run.js", "komorebi/kuku_dan2.js", "komorebi/pi314_generator.js",
  "komorebi/unit_convert_generator.js", "komorebi/kuku_reverse_generator.js",
  "komorebi/frac_flow_generator.js", "komorebi/trophies.js", "komorebi/app.js"
];

module.exports = { parseAttrs, parseElements, matches, makeApp, plainText, bootKomorebi, KOMOREBI_FILES };
