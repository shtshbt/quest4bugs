# オーストラリア遠征 I guild データ補完のスポットチェック表

作成日: 2026-08-17。状態: 実装反映済み (要スポットチェック)。
対象: `shared/bugs.js` の AU 遠征 I 収録 84 種。
関連: `zukan_foundry/reports/au_expedition1_freeze_draft.md`、`docs/komorebi_release_linkage.md`

## 0. この文書の役割

freeze 時点で AU 84 種の `habitat` / `tags` / `sizeMm` は一律
(`["overseas"]` / `["forest"]` / 未設定) だった。学名からの昆虫学的推定で補完し、
語彙はマダガスカル遠征 I の実語彙に限定した。推定である以上、確信度の低い値は
後から実物の記載で検証する必要がある。その検証待ちを 1 枚にまとめたもの。

確信度 high の 48 種 (よく知られた種、標準的な記載が引ける種) は省略し、
medium 以下の 30 種と、判断が分かれうる語彙 3 点、レア度配分の補正 3 種を残す。

寸法の規則 (マダガスカル遠征 I と共通):
- チョウ・ガ: 開張 (wingspan)
- セミ: 翅端までの全長
- その他: 体長
- ナナフシ・カマキリ・バッタは雌雄差が大きいので、[小さい方の下限, 大きい方の上限]

## 1. 要スポットチェック 30 種 (確信度 medium 以下)

| # | 和名 | 学名 | sizeMm | habitat | 推定根拠 | 確信度 |
|---|---|---|---|---|---|---|
| 1 | ムネスジヤンマ | Aeshna brevistyla | [60,70] | pond, marsh | Aeshnidae 中型ヤンマ、静水性。現行分類は Adversaeschna 属で、属名も要確認 | medium |
| 2 | ハバビロイトトンボ | Austroargiolestes icteromelas | [42,50] | stream, forest | Argiolestidae は森林渓流性の大型イトトンボ | medium |
| 3 | ハラナガアオイトトンボ | Austrolestes analis | [36,44] | pond, marsh | Lestidae の一般的体長帯 | medium |
| 4 | ワモンアオイトトンボ | Austrolestes leda | [34,40] | pond, marsh | 同属 analis からの外挿 | medium |
| 5 | キボシエゾトンボ | Hemicordulia australiae | [42,50] | pond, forest | Corduliidae 中型 | medium |
| 6 | オセアニアハネビロトンボ | Tramea loewii | [48,56] | pond, marsh | Tramea 属の滑翔型、静水性 | medium |
| 7 | キノカワバッタ | Coryphistes ruricola | [25,40] | forest | 樹皮擬態の Acrididae、ユーカリ幹上 | medium |
| 8 | アカスネバッタ | Cryptobothrus chrysophorus | [18,28] | grassland | 小型 Acrididae | medium |
| 9 | セスジチャイロバッタ | Gastrimargus musicus | [30,50] | grassland | Oedipodinae 中型 | medium |
| 10 | トサカバッタ | Goniaea australasiae | [30,45] | forest, ground | 落葉擬態、林床 | medium |
| 11 | ミドリガシラバッタ | Oedaleus australis | [25,40] | grassland | Oedipodinae | medium |
| 12 | ダイダイサシガメ | Gminatus australis | [14,20] | forest, grassland | Reduviidae 中型 | medium |
| 13 | ダイダイオビゼミ | Henicopsaltria eydouxii | [50,65] | forest | 翅端までの全長。体長基準に直す場合は要修正 | medium |
| 14 | ネッタイマキバサシガメ | Nabis kinbergii | [7,9] | grassland, farmland | Nabidae 小型 | medium |
| 15 | クロモンヤガ | Agrotis munda | [35,45] | grassland, farmland | 開張。Agrotis 属標準 | medium |
| 16 | マダラナナフシ | Anchiale austrotessulata | [100,150] | forest | Phasmatidae 中型 | medium |
| 17 | アオバネナナフシ | Anchiale briareus | [110,160] | forest | 同属 austrotessulata からの外挿 | medium-low |
| 18 | イボアタマナナフシ | Candovia strumosa | [60,90] | forest | Lonchodidae 小型ナナフシの一般帯 | medium-low |
| 19 | イトアシナナフシ | Sipyloidea larryi | [70,100] | forest | 同上 | medium-low |
| 20 | ナカグロハナムグリ | Chondropyga dorsalis | [20,28] | forest, garden | Cetoniinae | medium |
| 21 | キイロブチコガネ | Cyclocephala signaticollis | [12,16] | grassland, garden | Dynastinae 小型、外来種 | medium |
| 22 | ヒョウモンハナムグリ | Neorrhina punctatum | [14,18] | forest, garden | Cetoniinae 小型 | medium |
| 23 | カレエダホソカマキリ | Archimantis sobrina | [60,80] | grassland, forest_edge | 同属 latistyla からの外挿 | medium |
| 24 | クロボシカマキリ | Mantis octospilota | [50,70] | grassland, garden | Mantis 属標準 | medium |
| 25 | マルバネカマキリ | Neomantis australis | [25,35] | forest | Nanomantidae 小型 | medium |
| 26 | チャバネカマキリ | Sphodropoda quinquedens | [50,70] | forest_edge, grassland | Mantidae 中型 | medium |
| 27 | ホシバネユスリカ | Polypedilum nubifer | [4,6] | pond, marsh | Chironomidae 小型、幼虫が水生 | medium |
| 28 | カスリシマトビケラ | Asmicridea edwardsii | [8,12] | stream, river | Hydropsychidae 造網性 | medium |
| 29 | シロバネナナフシ | Megacrania batesii | [100,130] | forest, seashore | 海岸のタコノキ (Pandanus) 依存。寸法は high、habitat の語彙採用が判断事項 | high / medium |
| 30 | キモンセセリモドキガ | Synemon plana | [30,36] | grassland | Castniidae。開張の記載はよく引けるが、日中飛翔性の小型群で個体差が大きい | high-medium |

## 2. 語彙の判断 3 点 (2026-08-17 に確定済み)

| 論点 | 決定 | 理由 |
|---|---|---|
| Megacrania batesii の habitat | `forest, seashore` を採用 | 実生態が正。`seashore` を habitat 語彙として認める |
| Phasmatodea の renderer | `kemushi` のまま | マダガスカル遠征 I の indo_nanafushi の前例踏襲。棒状専用 renderer の新設は別件 |
| Diptera の groupJa | `双翅目` のまま | マダガスカル遠征 I の実語彙。新バッチが使っていた `ハエ・アブ` には寄せない |
| Lepidoptera のジャノメ・マダラ | ジャノメ / マダラ に修正済み | 本編語彙に厳密一致。heteronympha_merope は Satyrinae、euploea_corinna は Danainae。シルエットはどちらも tateha で不変 |

## 3. レア度配分の補正で R に追加した 3 種

freeze draft 2.4 章の昇格候補 5 種をそのまま適用すると N60 / R14 / SR 帯 10 にしかならず、
承認された配分 N57 / R17 / SR 帯 10 に届かない (R から 3 種が SR 帯へ抜ける分が
数え落とされている)。承認された配分値を優先し、R へ 3 種を追加した。
追加分はすべて draft 本文が自ら次点または borderline と書いた種から採っている。

| 和名 | 学名 | draft の該当記述 |
|---|---|---|
| ウスキバネオオゼミ | Cyclochila australasiae | 2.3 判断メモ「現地で最有名のセミだが標本退色が強く N とした」 |
| アミメキリギリス | Acripeza reticulata | 2.3 判断メモ「実物は隠し色をもつ有名種だが写真が暗く N」 |
| ムネスジヤンマ | Aeshna brevistyla | 2.2 #15「同格候補の aeshna_brevistyla は翅にラベル文字が透けるため次点」 |

確定した配分: SSR 1 (papilio_ulysses、看板) / SR 9 / R 17 / N 57 = 84。

## 4. あわせて是正した renderer (スポットチェック対象外だが記録)

freeze 前の AU 84 種のうち 46 種が、`shared/render.js` に存在しない renderer 名
(`tonbo` / `nanafushi` / `kamemushi` / `hae`) を持っており、すべて汎用甲虫の
シルエットで描画されていた (マダガスカル遠征 I は該当ゼロ)。
マダガスカル遠征 I の実語彙 (`tombo` / `kemushi` / `other`) へ揃えた。

同じ欠陥は AU 84 の外にまだ 15 種残っている (マダガスカル遠征 II 予備在庫など)。
今回は出荷対象外なので触っていない。次の巻の freeze 前に同じ検査を通すこと。
