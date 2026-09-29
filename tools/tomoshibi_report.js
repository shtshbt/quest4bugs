/* れんぞく ともしび の監視レポート (docs/tomoshibi_streak_design.md 7 章)。
   同期データの save.json を読み、プロフィールごとに次を出す。

   - 履歴の取り込み (seeded / seededAt) と、いまの段・連続日数
   - 1 日の正解数の分布。3 問ちょうど・10 問ちょうどに張り付く日が増えたらゲーミングの兆し
   - ともしびの数と、既存の日次記録 (goshin の log + komorebi の daily) の突き合わせ
     (取り込み日以降。食い違いは配線の漏れか統合の欠落の手がかり)
   - 2 台以上で数えた日 (二重払いが起こりうる日)
   - 支払った こはく の合計

   呼び出し経由の捕獲の割合は、捕獲記録に入手経路が残っていないので測れない。

   node tools/tomoshibi_report.js <save.json> [today]
   (tools/tomoshibi_report.sh が save.json の取得から通しで回す) */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const SEP = "\u0000";
const SUBJECTS = ["keisan", "kanji", "eitango"];

function loadEngine() {
  const context = { console, Date, Math, Object };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "shared/tomoshibi.js"), "utf8"), context);
  return context.Q4BTomoshibi;
}

function localToday() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function dayTotal(day) {
  let total = 0;
  for (const dev of Object.keys((day && day.dev) || {})) total += day.dev[dev];
  return total;
}

function liveDevices(day) {
  return Object.keys((day && day.dev) || {}).filter(dev => dev !== "legacy");
}

function report(save, today, T) {
  const lines = [];
  for (const profile of save.profiles || []) {
    const entry = save.kv["tomoshibi" + SEP + profile.id];
    lines.push("## " + profile.name + " (" + profile.id + ")");
    if (!entry || !entry.data) {
      lines.push("  ともしびの記録なし (まだ数えていない)");
      continue;
    }
    const data = entry.data;
    const state = T.computeState(data, today);
    lines.push("  取り込み: " + (data.seeded ? "済 (" + (data.seededAt || "日付なし") + ")" : "未"));
    lines.push("  いま: " + state.tier.name + " " + (state.dropPending ? state.restartDay + " にちめ から さいかい 待ち" : state.streakDays + " にち") +
      "  きょう " + state.todayCount + " もん");

    const since = data.seededAt || today;
    const log = ((save.kv["goshin" + SEP + profile.id] || {}).data || {}).log || {};
    const daily = ((save.kv["komorebi" + SEP + profile.id] || {}).data || {}).daily || {};
    const liveDays = Object.keys(data.days || {}).filter(d => d >= since).sort();
    /* 順序を保つため配列で持つ (オブジェクトだと数字のキーが先に並ぶ)。 */
    const bucketNames = ["1-2", "3", "4-9", "10", "11+"];
    const buckets = new Map(bucketNames.map(name => [name, 0]));
    const mismatches = [];
    const multi = [];
    for (const d of liveDays) {
      const live = liveDevices(data.days[d]).reduce((sum, dev) => sum + data.days[d].dev[dev], 0);
      const n = dayTotal(data.days[d]);
      const key = n <= 2 ? "1-2" : n === 3 ? "3" : n < 10 ? "4-9" : n === 10 ? "10" : "11+";
      buckets.set(key, buckets.get(key) + 1);
      if (liveDevices(data.days[d]).length >= 2) multi.push(d + " (" + liveDevices(data.days[d]).join(", ") + ")");
      /* 取り込み日当日は、取り込み前に解いた分が既存記録にだけあるので比べない。 */
      if (d > since) {
        const c = (log[d] && log[d].correct) || {};
        const existing = SUBJECTS.reduce((sum, s) => sum + (c[s] || 0), 0) + ((daily[d] && daily[d].ok) || 0);
        if (existing !== live) mismatches.push(d + ": ともしび " + live + " / 既存 " + existing);
      }
    }
    lines.push("  取り込み日以降に数えた日: " + liveDays.length + " 日");
    lines.push("  1 日の正解数の分布: " + bucketNames.map(k => k + " もん " + buckets.get(k) + " 日").join("、"));
    lines.push("  既存記録との食い違い: " + (mismatches.length ? mismatches.join("; ") : "なし"));
    lines.push("  2 台以上で数えた日: " + (multi.length ? multi.join("; ") : "なし"));
    const paid = Object.values(data.awarded || {}).reduce((sum, a) => sum + (a.base || 0) + (a.top || 0), 0);
    lines.push("  支払った こはく: " + paid + " (" + Object.keys(data.awarded || {}).length + " 日)");
  }
  lines.push("");
  lines.push("注: 呼び出し経由の捕獲の割合は、捕獲記録に入手経路が残っていないので測れない。");
  return lines.join("\n");
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node tools/tomoshibi_report.js <save.json> [today]");
    process.exit(2);
  }
  let save;
  try {
    save = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error("save.json を読めません: " + error.message);
    process.exit(1);
  }
  const today = process.argv[3] || localToday();
  process.stdout.write(report(save, today, loadEngine()) + "\n");
}

if (require.main === module) main();
module.exports = { report, loadEngine };
