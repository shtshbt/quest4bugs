(function(global){
  "use strict";

  /* 公開スイッチだけを持つ小さなモジュール。shared/ に置く理由は 2 つ。御神木パネル
     (shared/breeding.js) を描く portal が komorebi/app.js を読み込まないこと、そして
     採集道具を全ゲーム共通へ広げる改修で本編 3 教科のページもこのスイッチを読むこと。
     app.js を他のページに読ませると小道 1 本のために地図・セッション・図鑑まで
     ぶら下がるので、判定に要る 2 つの数だけを切り出して全員が同じ 1 本を読む。

     - CURRENT_RELEASE: 公開済みの更新番号 (release_linkage 2 章の更新カレンダー)。
       実装は先へ進めて公開はここ 1 か所で段階解禁する。
     - MEDAL_ECONOMY_ON: メダル経済 (採集道具・かがやきのうろ・メダル交換・リセット
       周回) の公開スイッチ。更新番号とは独立させてある。地域 volume の公開は新奇性が
       効くうちに出したいが、道具は手が止まりかけた頃に出すほうが効くので、同じ
       deploy に束ねない (2026-08-17 決定)。false の間はメダルの挙動が道具の実装前と
       1 ビットも変わらない: 金の虫が増えるだけで、交換ポップアップもうろの入口も
       リセットボタンも出ず、抽選も乱数の消費本数も動かない。

     点火はこの 2 行だけを動かす。 */

  var CURRENT_RELEASE=2;
  var MEDAL_ECONOMY_ON=false;

  /* 道具が最初に開く更新番号。tools.js の release 最小値と同じ値で、tools.js を
     読み込んでいない portal のための控えでしかない。ずれると御神木の入口だけが
     早く出るので、tests/test_komorebi_portal_gate.js が両者の一致を見張る。 */
  var TOOLS_FIRST_RELEASE=2;

  function currentRelease(){return CURRENT_RELEASE;}
  function on(){return MEDAL_ECONOMY_ON;}

  /* ゲートは 2 段。まず経済ごと開いているか、次に道具 1 本ずつの release。
     tools.js が居る文脈 (小道のページ) では実際の一覧から数え、居ない文脈
     (portal) では控えの番号で判定する。 */
  function toolsReleased(){
    if(!MEDAL_ECONOMY_ON)return false;
    var tools=global.Q4B_TOOLS;
    if(tools&&typeof tools.list==="function"){
      return tools.list().some(function(tool){return tool.release<=CURRENT_RELEASE;});
    }
    return TOOLS_FIRST_RELEASE<=CURRENT_RELEASE;
  }

  global.Q4B_ECONOMY={
    toolsFirstRelease:TOOLS_FIRST_RELEASE,
    currentRelease:currentRelease,
    on:on,
    toolsReleased:toolsReleased
  };

  /* 公開前後の両方を 1 回の実行で確かめるための切替 (テスト専用の seam)。
     ハーネスが Q4B_KOMOREBI_TEST_HOOKS を立てた文脈でだけ生やす。常設の API に
     置くと、配信された画面の console 1 行でメダル経済が開いてしまう。 */
  if(global.Q4B_KOMOREBI_TEST_HOOKS){
    global.Q4B_ECONOMY.setOn=function(value){MEDAL_ECONOMY_ON=!!value;};
    global.Q4B_ECONOMY.setCurrentRelease=function(value){
      if(!Number.isInteger(value)||value<1)throw new Error("更新番号の指定が正しくありません");
      CURRENT_RELEASE=value;
    };
  }
})(typeof window!=="undefined"?window:globalThis);
