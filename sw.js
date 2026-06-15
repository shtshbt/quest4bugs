/* Quest4Bugs Service Worker
   オフライン対応: 初回オンライン時にアプリ一式をキャッシュし、以後は機内など
   オフラインでも起動・プレイ可能にする。進捗は localStorage に保存され、
   オンライン復帰時に storage.js が自動 push する（GitHub API はキャッシュ対象外）。
   方針: cache-first ＋ バックグラウンド更新(stale-while-revalidate)。
   ?v= のクエリ差はキャッシュヒット時に無視(ignoreSearch)してオフライン継続性を確保。 */
var CACHE = "q4b-cache-v1";
var CORE = [
  "./", "./index.html", "./battle.html",
  "./kanji/index.html", "./eitango/index.html",
  "./keisan/index.html", "./keisan/app.js", "./keisan/style.css",
  "./shared/storage.js", "./shared/bugs.js", "./shared/render.js",
  "./shared/bespoke.js", "./shared/reward.js", "./shared/furigana.js",
  "./shared/yomi.js", "./shared/battle.js", "./shared/colloc.js",
  "./manifest.webmanifest"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      /* 個別 add で 404 等があっても install を失敗させない */
      return Promise.all(CORE.map(function(u){ return c.add(u).catch(function(){}); }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ return k===CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;                       /* POST/PUT(GitHub API) は触らない */
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;        /* 別オリジン(api.github.com 等)は素通し */
  e.respondWith(
    caches.open(CACHE).then(function(c){
      return c.match(req, {ignoreSearch:true}).then(function(hit){
        var net = fetch(req).then(function(res){
          if(res && res.ok) c.put(req, res.clone());     /* オンライン時は最新を取り込み次回更新 */
          return res;
        }).catch(function(){ return hit; });             /* オフラインはキャッシュで継続 */
        return hit || net;                               /* cache-first ＋ 背後更新 */
      });
    })
  );
});
