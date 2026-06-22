/* Quest4Bugs Service Worker
   オフライン対応: 初回オンライン時にアプリ一式をキャッシュし、以後は機内など
   オフラインでも起動・プレイ可能にする。進捗は localStorage に保存され、
   オンライン復帰時に storage.js が自動 push する（GitHub API はキャッシュ対象外）。
   方針: cache-first ＋ バックグラウンド更新(stale-while-revalidate)。
   ?v= のクエリ差はキャッシュヒット時に無視(ignoreSearch)してオフライン継続性を確保。 */
var CACHE = "q4b-cache-v100";  /* v100: kanji applyAnswer に due gate (期限前正解は box/due 据置、 復習チャレンジ等の迂回 promotion を防止) */
var CORE = [
  "./", "./index.html", "./battle.html",
  "./kanji/index.html", "./eitango/index.html",
  "./keisan/index.html", "./keisan/app.js", "./keisan/style.css",
  "./shared/storage.js", "./shared/equipment_data.js", "./shared/bugs.js", "./shared/kanji_data.js", "./shared/eitango_data.js", "./shared/render.js",
  "./shared/bespoke.js", "./shared/reward.js", "./shared/furigana.js",
  "./shared/yomi.js", "./shared/battle.js", "./shared/boss_zukan.js", "./shared/colloc.js",
  "./shared/k5_devs_data.js",
  "./shared/zukan_detail.js", "./shared/zukan_render.js", "./shared/zukan_lightbox.js",
  "./shared/bug_archetypes.js", "./shared/breeding.js", "./shared/breeding_debug.js",
  "./assets/larva_svg/egg.svg",
  "./assets/larva_svg/koganemushi.svg", "./assets/larva_svg/kuwagata.svg",
  "./assets/larva_svg/kamikiri.svg", "./assets/larva_svg/zoumushi.svg",
  "./assets/larva_svg/mizu_kouchu.svg",
  "./assets/larva_svg/imomushi.svg", "./assets/larva_svg/kemushi.svg",
  "./assets/larva_svg/hachi.svg", "./assets/larva_svg/uji.svg",
  "./assets/larva_svg/kabuto_pupa.svg", "./assets/larva_svg/chou_pupa.svg",
  "./assets/larva_svg/ga_pupa.svg", "./assets/larva_svg/hachi_pupa.svg",
  "./assets/larva_svg/yago.svg", "./assets/larva_svg/batta.svg",
  "./assets/larva_svg/kamakiri.svg", "./assets/larva_svg/semi.svg",
  "./assets/larva_svg/kamemushi_nymph.svg", "./assets/larva_svg/gokiburi.svg",
  "./zukan_config/zukan_catalog.js",
  "./assets/home_map_base_island_v1.webp", "./assets/home_map_module_goshinboku_v1.webp",
  "./assets/home_map_module_eigo_v2.webp", "./assets/home_map_module_keisan_v1.webp",
  "./assets/home_map_module_kanji_v1.webp", "./assets/home_map_module_ouja_no_michi_fitted_v1.webp",
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

  var isHTML = req.mode === "navigate" ||
               (req.headers.get("accept") || "").indexOf("text/html") >= 0;

  if(isHTML){
    /* HTML は network-first: オンラインなら常に最新HTML(新しい?v=参照)を取得。
       オフライン時のみキャッシュ(完全一致→無ければ任意)にフォールバック。
       注意: res.clone() は同期で取らないと、return res で body が consume された後の
       async caches.open() 内では clone できず TypeError になる。 */
    e.respondWith(
      fetch(req).then(function(res){
        if(res && res.ok){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){
        return caches.open(CACHE).then(function(c){
          return c.match(req).then(function(h){ return h || c.match(req, {ignoreSearch:true}); });
        });
      })
    );
    return;
  }

  /* アセット(js/css等)は「?v= まで含む完全一致」を優先。
     バージョンが上がると新URL=キャッシュミス→ネットから取得し最新化。
     オフラインで完全一致が無い時だけ ignoreSearch で旧版にフォールバック(継続性)。 */
  e.respondWith(
    caches.open(CACHE).then(function(c){
      return c.match(req).then(function(exact){
        if(exact){
          fetch(req).then(function(res){ if(res && res.ok) c.put(req, res.clone()); }).catch(function(){});
          return exact;                                  /* 同バージョン→即返し＋背後更新 */
        }
        return fetch(req).then(function(res){
          if(res && res.ok) c.put(req, res.clone());     /* 新バージョン→取得して保存 */
          return res;
        }).catch(function(){ return c.match(req, {ignoreSearch:true}); });  /* オフラインは旧版 */
      });
    })
  );
});
