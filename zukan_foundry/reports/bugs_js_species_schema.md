# bugs.js 種定義スキーマ正典

対象: `shared/bugs.js` (2026-08-12 時点、HEAD dc308a3 + working tree、総数 1213 種)。
本編 species-only 拡充で新種 entry を生成する agent 向けの仕様書。運用工程は
`~/.claude/skills/q4b-species-release/SKILL.md`、repo 運用ルールは repo CLAUDE.md が優先。

## 0. ファイル全体構造

```
shared/bugs.js (IIFE、global へ export)
  L4    RARITY_LEVEL / RARITY_LABELS       レア度定義 (編集不要)
  L6    ORDER_JA                           order 学名 → 和名 (新 order のときのみ追記)
  L18   METAMORPHOSIS_BY_ORDER             order → 変態タイプ (卵育成。既存 12 order 登録済)
  L25   LEP_MOTH_FAMS                      蛾と判定する family list (新規蛾 family のとき追記)
  L27   refineRenderer()                   order/family → renderer 自動細分化 (編集不要)
  L46   SIZE_MM                            id → [min,max] mm の 1 行巨大マップ (編集点 2)
  L47   bug()                              入力 object の正規化・派生フィールド生成 (編集不要)
  L96   var bugs=[ ... ];                  種定義本体 (編集点 1)。内部セクション:
          L97〜872    本編 (771 entry)
          L873〜1251  /* ==== 水増し追加 (+378) ==== */
          L1252〜1276 /* ==== マスター虫＋特別追加 (+24) ==== */
          L1277〜1317 /* ==== ボス (+20) ==== */ (bossOnly 20 + バトルボス SS 20)
  L1323 Q4B_SPECIES_MIGRATIONS             旧 id → 新 id 移行表 (新種追加では触らない)
  L1325 export: Q4B_RARITY_LABELS / RAR / Q4B_BUGS / BUGS
```

行番号は追記で変動するため、位置はセクションコメントを基準に特定すること。

## 1. 1 種追加に必要な編集点の完全リスト

通常種 (masterOnly / bossOnly でない種) の追加は bugs.js 内の 2 箇所で完結する。
他の JS はすべて自動導出であり編集不要。

| # | 場所 | 内容 | 必須 |
|---|---|---|---|
| 1 | `var bugs=[...]` 配列 | `bug({...}),` を 1 行で追記 | 必須 |
| 2 | サイズ | entry 内に `"sizeMm":[min,max]` を inline 記述、または L46 の SIZE_MM マップに `"<id>":[min,max]` を追加。どちらか一方 | 必須 (欠落すると renderer 由来の推定レンジ legacySizeRange に落ちる) |
| 3 | ORDER_JA (L6) | 未登録の order を使う場合のみ和名を追記 | 条件付き |
| 4 | METAMORPHOSIS_BY_ORDER (L18) | 未登録の order を卵育成対象にする場合のみ | 条件付き |
| 5 | LEP_MOTH_FAMS (L25) | 新規の蛾 family を "ga" renderer に載せたい場合のみ | 条件付き |

現状の実数: サイズは SIZE_MM 経由 769 種、inline `sizeMm` 442 種、両方欠落 2 種
(フユシャク 2 種。メス無翅で翅開長が定義できないため意図的に null、`sizeBySexMm` のみ保持)。
新規 batch は inline `sizeMm` を推奨する。SIZE_MM は 1 行 46KB の巨大マップで、
編集事故と diff レビュー困難のリスクが高い (chairo_kanabun が SIZE_MM 側なのは
旧 id ootora_hanamuguri のキー置換だったため)。

編集不要な自動導出 (bugs.js を読むだけで反映される):

- `shared/reward.js`: 教科プール POOLS、poolCount、ZUKAN_DENOM (図鑑分母)、
  抽選重み、サイズ抽選、卵コスト。すべて BUGS を forEach して構築。
- `shared/bug_archetypes.js`: 幼虫/蛹/若虫 archetype は order/family から
  ルールで自動アサイン。種側にフィールド不要。
- `shared/render.js`: parametric SVG は `renderer` + `colors` から描画。
- `zukan_config/zukan_catalog.js`: 触らない。写真は後追いで別リリース。

リリース付帯編集 (種 entry とは別レイヤ、skill 工程 5〜6 で実施):

- `tests/test_zukan_progress_count.js` L99〜102 の固定分母値
  (現状 keisan 427 / kanji 353 / eitango 423) を新期待値へ更新。
- `sw.js` の CACHE 名 bump と、各 HTML の `?v=` パラメータ更新。

## 2. フィールド仕様表

bug() に渡す入力 object のキー。格納後の実体は bug() が正規化するため、
ここに書くのは「entry に書いてよいキー」のみ。

### 2.1 必須フィールド

| フィールド | 型 | 値域・規約 | 由来 (消費側) |
|---|---|---|---|
| `id` | string | 和名のヘボン式ローマ字 snake_case。全 1213 種で一意。例 `chairo_kanabun` | 全システムの主キー。SIZE_MM、catalog、保存データ catches のキー |
| `jaName` | string | カタカナ標準和名。一意 (重複禁止、skill 絶対規則 3) | 図鑑表示、検索 |
| `scientificName` | string | 属 + 種小名の 2 語 (著者名なし)。属レベルは `Morpho spp.` 形式 | 図鑑表示、dedup 照合、catalog 照合 |
| `order` | string | ラテン語目名。ORDER_JA 登録済 20 目 (昆虫 12 + 非昆虫 8) | 教科割当 gameFor、変態タイプ、archetype、orderJa 表示 |
| `family` | string | ラテン語科名 | renderer 自動細分化、archetype |
| `familyJa` | string | カタカナ科名 | 図鑑表示、分類フィルタ |
| `groupJa` | string | 表示グループ名 (「ハナムグリ」「クワガタムシ」等の日本語) | 図鑑分類フィルタ、夜行性判定 (蛾) |
| `rarity` | string | `"N"` `"R"` `"SR"` `"SSR"` のいずれか。新設種に `"SS"` は禁止 (skill 絶対規則 2)。省略時 N | 抽選重み、卵コスト、図鑑バッジ。現分布 N311 / R450 / SR276 / SSR104 / SS72 |
| `colors` | [string, string] | hex 2 色 [主色 c1, 副色 c2]。実物の体色に合わせる | parametric SVG の描画色 |
| `note` | string | 子ども向け説明文。§5 参照 | 図鑑詳細、夜行性判定 (「夜」を含むと夜間出現 2.5 倍) |
| `tags` | string[] | 英語小文字 snake_case。既存語彙 260 種 (`beetle` `butterfly` `overseas` 等)。最低 1 個 | `firefly` `moth` は夜行性判定。他は分類メモ |

### 2.2 強く推奨 (現行 94% が保持)

| フィールド | 型 | 値域・規約 | 由来 |
|---|---|---|---|
| `sizeMm` | [number, number] | [min, max] mm。0 < min < max。SIZE_MM 側に書く場合は entry から省略可 | 捕獲個体のサイズ抽選 (personal best 機構) |
| `sexRatio` | {m:number, f:number} | 合計 1.0。慣行は `{"m":0.5,"f":0.5}` | 捕獲時の性別抽選 |
| `sizeBySexMm` | {m:[lo,hi], f:[lo,hi]} | 性別別実寸レンジ | 性別別サイズ抽選、SVG の体格スケール |
| `taxonRank` | string | `"species"` (default) / `"genus"` (1 種) / `"subspecies"` (12 種) | 表示 |
| `origin` | string | `"japan_native"` (default) / `"overseas"` / `"introduced_established"` / `"vagrant"` / `"uncertain"` | 表示・選抜メタ |
| `needsTaxonReview` | bool | 分類に要確認点があれば true。通常 false を明記 | foundry の監査レポート |

### 2.3 任意フィールド

| フィールド | 型 | 値域・規約 | 由来 |
|---|---|---|---|
| `renderer` | string | §4.2 の 24 値。省略時 "other" から refineRenderer が order/family で自動細分化するため、蝶・蛾・主要甲虫科は省略可。明示指定はそれ以外 (kabuto/kuwagata/semi/tombo/hachi/tentou/ari/batta/kamakiri/hotaru/mizu/kemushi/dango 等) | SVG シルエット選択 |
| `subfamily` | string | ラテン語亜科名 (561 種が保持) | archetype ルールの優先照合 |
| `tribe` | string | ラテン語族名 (236 種) | 分類記録 |
| `season` | string[] | `spring` / `summer` / `autumn` / `winter` (638 種) | 現状表示予備 (木漏れ日で利用予定) |
| `habitat` | string[] | 英語小文字。`forest` `grassland` `water` 等 40 語彙、表記ゆれあり (`rice_field` と `ricefield` が並存) | 同上 |
| `caution` | string | 毒・刺咬・外来種の注意書き。子ども向け文体 (63 種)。例「刺すと痛い。」「つかむとくさいにおいを出すよ。」 | 図鑑詳細に注意枠で表示 |
| `sexDimorphism` | string | `"horn"` (カブト角) / `"mandible"` (クワガタ大顎) / `"size"` / `"color"` / `"wingless"` (メス無翅) / `"both"` (152 種) | SVG の雌雄描画切替 |
| `sexDimorphismNote` | string | 雌雄差の子ども向け説明。sexDimorphism とセットで付与 | 図鑑詳細 |

### 2.4 特殊種専用 (通常追加では書かない)

| フィールド | 型 | 用途 |
|---|---|---|
| `masterOnly` + `master` | bool + {game, kind, key, (k5key)} | 全習得報酬専用種。master.game は `keisan` / `kanji` / `eitango` / `grand` |
| `bossOnly` + `boss` | bool + {type, predator, final} | バトルボス専用種。`predator:true` (天敵 10 種) は catches に入る経路がなく図鑑分母から除外される |

### 2.5 書いてはいけない派生フィールド

次は bug() が自動生成する。entry に書くと無視されるか二重定義になる:
`orderJa` `n` `q` `r` `t` `c1` `c2` `metamorphosis`。
色違い (shiny) も種フィールドではない。保存データ側 `catches[id].shiny` と
render.js の色相回転で全種自動対応する。

## 3. 新種 1 件の完全な追加例

追跡例: commit dc308a3 の chairo_kanabun (実 diff そのまま)。

編集点 1: bugs 配列に 1 行 (実際は SR 置換だったため旧 entry と同位置):

```js
    bug({"id":"chairo_kanabun","jaName":"チャイロカナブン","scientificName":"Cosmiomorpha similis","taxonRank":"species","order":"Coleoptera","family":"Scarabaeidae","subfamily":"Cetoniinae","tribe":"Goliathini","familyJa":"コガネムシ科","groupJa":"ハナムグリ","origin":"japan_native","rarity":"SR","renderer":"other","colors":["#8A5A2A","#C2913C"],"tags":["beetle","hanamuguri","forest"],"season":["summer"],"habitat":["forest"],"note":"樹液にあつまる茶金色のカナブン。なかなか出会えないよ。","needsTaxonReview":false,"sexRatio":{"m":0.5,"f":0.5},"sizeBySexMm":{"m":[16,24],"f":[17,25]}}),
```

編集点 2: SIZE_MM マップ内 (この種は SIZE_MM 側。旧キーの置換だったため):

```js
"chairo_kanabun":[16,25],
```

新規 batch の推奨形 (inline sizeMm 版。SIZE_MM を触らず 1 行で完結):

```js
    /* ==== 本編第1弾 (+50) ==== */
    bug({"id":"example_kogane","jaName":"レイコガネ","scientificName":"Genus species","taxonRank":"species","order":"Coleoptera","family":"Scarabaeidae","subfamily":"Rutelinae","familyJa":"コガネムシ科","groupJa":"コガネムシ","origin":"japan_native","rarity":"R","renderer":"other","colors":["#2E5A2E","#C9A227"],"tags":["beetle","forest"],"season":["summer"],"habitat":["forest"],"note":"みどり色にかがやく夏のコガネムシ。ひなたの葉っぱがすき。","needsTaxonReview":false,"sizeMm":[15,22],"sexRatio":{"m":0.5,"f":0.5},"sizeBySexMm":{"m":[15,21],"f":[16,22]}}),
```

この 1 行だけで、教科プール (Coleoptera なので keisan)、図鑑分母、抽選、
サイズ記録、卵育成 (complete 変態、koganemushi 幼虫 archetype)、SVG 描画
(refineRenderer が Scarabaeidae を "kogane" に細分化) がすべて自動で有効になる。

## 4. SVG fallback の成立条件

### 4.1 判定フロー

写真なし種は追加フィールドなしで必ず描画が成立する。判定は `shared/zukan_render.js`:

1. `Q4B_ZUKAN_INDEX[sp.id]` (zukan_catalog.js) に entry があれば museum 写真を表示。
2. entry がない、または shiny 個体、または表示モードが "svg" のときは
   元の `Q4BRender.species` に fallback。
3. `Q4BRender.species` (shared/render.js) は `BESPOKE[id]` (bespoke.js の個別作画
   registry、代表種のみ) があればそれを、なければ `renderer` (格納名 `t`) の
   シルエット + `colors` (c1/c2) + jaName/groupJa から導出する模様 (deriveParams)
   で parametric SVG を生成する。

つまり成立条件は「`renderer` (省略時は自動細分化) と `colors` が妥当であること」のみ。
zukan_catalog.js への entry 追加は写真取得後の別リリースで行う。

卵・幼虫・蛹の絵も `bug_archetypes.js` が order/family から自動でアサインし、
SVG 未制作 archetype は絵文字に落ちる。種側の作業はない。

### 4.2 renderer の値域 (render.js bugSVG の分岐 24 種)

`kabuto` `kuwagata` `chou` `ageha` `tateha` `shijimi` `seseri` `ga`
`tombo` `semi` `hachi` `tentou` `ari` `batta` `kamakiri` `hotaru`
`mizu` `kemushi` `dango` `kamikiri` `kogane` `tamamushi` `osamushi` `other`

自動細分化 (refineRenderer) の規則:

- Lepidoptera で renderer が chou / other / 未指定: Papilionidae は ageha、
  Nymphalidae は tateha、Lycaenidae / Riodinidae は shijimi、Hesperiidae は
  seseri、LEP_MOTH_FAMS 掲載 family は ga、それ以外は chou。
- Coleoptera で renderer が "other": Cerambycidae は kamikiri、Buprestidae は
  tamamushi、Carabidae / Cicindelidae は osamushi、Scarabaeidae / Rutelidae /
  Cetoniidae / Melolonthidae / Dynastidae は kogane。
- 上記以外はそのまま。

## 5. 説明文 (note) の文体規範

規範:

- 対象は小学校低学年。難読漢字はひらがなに開く (「さいだい」「うつくしい」)。
- 1〜2 文、体言止めや「〜よ。」「〜だ。」の軽い語りかけ。全角 11〜55 文字、
  中央値 26 文字。長くても 55 文字以内に収める。
- 内容は「その種のいちばん面白い一点」+ 補足一言。数値 (体長・速度) や
  行動 (樹液に集まる、夜に光る) を優先し、図鑑的な網羅はしない。
- 副作用に注意: note に「夜」の字が入ると reward.js の nightOf が夜行性と
  判定し、夜間の出現率が 2.5 倍 (昼 0.45 倍) になる。昼行性種の note に
  「夜」を含めない。
- 危険情報は note に書かず `caution` フィールドへ分離する。

既存種の原文例 5 件:

| id | note 原文 |
|---|---|
| hercules_beetle | 世界さいだいきゅうのカブトムシ。180mmをこえることも。 |
| ookuwagata | 日本のクワガタの王さま。7年いきることもある長生き。 |
| gengorou | 泳ぎの天才。うしろあしがオールのかたち。 |
| suzumushi | リーンリーン。秋の夜のえんそう家。 |
| chairo_kanabun | 樹液にあつまる茶金色のカナブン。なかなか出会えないよ。 |

## 6. 組込時の注意

### 6.1 キーの引用符スタイル

配列内は 2 スタイル混在: 初期 111 entry が `bug({id:"...",jaName:...})` の
非引用キー、以後の 1102 entry が `bug({"id":"...","jaName":...})` の全キー引用。
新規 entry は全キー引用 (JSON 風) で統一する。dedup や既存照合を grep で行う
場合は両スタイルを拾うこと (`"id":"x"` だけを探すと初期 111 種を取りこぼす。
Python で両対応するのが確実。memory: bugs_js_dedup_gotcha 参照)。

### 6.2 挿入位置と表示順

- 機械的ソートはない。配列の定義順がそのまま教科プール配列の順になり、
  図鑑グリッドの表示順の基礎になる (POOLS は BUGS.forEach で push)。
- 通常種は必ず `/* ==== マスター虫＋特別追加 (+24) ==== */` マーカーより
  前に置く。マスター/ボスセクションの後ろに通常種を混ぜない。
- 少数追加は分類学的に近い種の隣へ挿入する慣行 (フユシャク 2 種は
  シャクガ科の並びに挿入された)。150 種級の batch は水増しセクション末尾
  (マスターセクション直前) に `/* ==== 本編第N弾 (+50) ==== */` 形式の
  セクションコメントを付けて弾ごとに追記するのが安全。
- 1 entry は 1 行 (改行を入れない)。行末は `}),` (配列最終 entry のみ `})`)。

### 6.3 一意性と値の検証 (validator 必須項目)

- id 一意 (既存 1213 + 同時追加分)、和名一意、学名 canonical で既存照合。
- rarity は N / R / SR / SSR のみ (SS 禁止)。
- サイズ sanity: 0 < min < max、目安 max < 300mm。sizeBySexMm と sizeMm の
  整合 (sizeMm が両性レンジを包含する)。
- order は ORDER_JA 登録済みか確認。未登録 order は orderJa が空文字になり、
  卵育成対象外 (metamorphosis null) になる。
- colors は hex 2 色、tags は 1 個以上。

### 6.4 追加後の数値確認

- poolCount: 現状 kanji 333 / keisan 380 / eitango 408 (合計 1121)。
  gameFor は order のみで決まる: Lepidoptera が kanji、Coleoptera が keisan、
  それ以外すべて eitango。masterOnly / bossOnly / SS はプール除外。
- ZUKAN_DENOM (図鑑分母): 現状 kanji 353 / keisan 427 / eitango 423 (合計 1203)。
  除外は boss.predator の 10 種のみ。通常の新種は無条件で
  「gameFor の教科のプール + 分母」に自動算入される。
- `tests/test_zukan_progress_count.js` の固定値を新期待値へ更新し、
  node で tests/test_*.js を全実行して green を確認する。

### 6.5 リリース時

- repo CLAUDE.md の commit 前 safety check (`_inbox` 等の誤 add 検査) を実行。
- 配信ファイル変更のため `sw.js` の CACHE 名 bump と `?v=` パラメータ更新。
- zukan_catalog.js は写真後追い (zukan-fetch batch、freqRank 昇順) で別 commit。
