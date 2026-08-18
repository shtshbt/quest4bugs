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

確定した配分: SSR 3 / SR 7 / R 17 / N 57 = 84 (SR 帯 10 の内訳は 4 章)。

## 3.1 SR 帯の内訳を MG I と一致させた昇格 2 種

マダガスカル遠征 I は SSR 3 (看板 1 + 非看板 2) / SR 7 で、非看板 SSR は
ベニホシオオアゲハ (世界的知名度の大型アゲハ) と マダガスカルオオタガメ
(迫力と存在感) が占めている。AU I も同じ内訳に揃えるため、SR 9 から 2 種を
SSR へ昇格した (2026-08-17 決定)。選定は生態的スペクタクル、知名度、
見た目のインパクトの 3 点で、いずれも freeze draft 3 章が看板候補の
第 2 位・第 3 位に挙げた種にあたる。

| 和名 | 学名 | 昇格理由 |
|---|---|---|
| ベニバネナナフシ | Podacanthus viridiroseus | 緑の体から桃紅色の大きな後翅を全開した生態写真で、静止画 1 枚で場面が立つスペクタクル性が SR 帯で突出している。ナナフシ大国オーストラリアの個性を代表する分類群の頂点でもあり、freeze draft 3 章の看板候補第 2 位 |
| アウラタキンイロクワガタ | Lamprima aurata | 全身が金緑に輝く金属光沢で、遠目でも識別できる見た目のインパクトが強い。クワガタは子どもの人気が最も高い分類群で知名度の面でも別格。freeze draft 3 章の看板候補第 3 位 |

看板 papilio_ulysses (アゲハチョウ科) と合わせて Papilionidae / Phasmatidae /
Lucanidae の 3 科に散り、マダガスカル遠征 I の SSR 3 種 (ヤママユガ科 /
アゲハチョウ科 / コオイムシ科) と同じく分類群の重複がない。

なお `zukan_config/zukan_catalog.js` は rarity を持たない (標本写真と
provenance のみ) ので、昇格に伴う変更はない。

## 4. あわせて是正した renderer (スポットチェック対象外だが記録)

freeze 前の AU 84 種のうち 46 種が、`shared/render.js` に存在しない renderer 名
(`tonbo` / `nanafushi` / `kamemushi` / `hae`) を持っており、すべて汎用甲虫の
シルエットで描画されていた (マダガスカル遠征 I は該当ゼロ)。
マダガスカル遠征 I の実語彙 (`tombo` / `kemushi` / `other`) へ揃えた。

同じ欠陥は AU 84 の外にまだ 15 種残っている (マダガスカル遠征 II 予備在庫など)。
今回は出荷対象外なので触っていない。次の巻の freeze 前に同じ検査を通すこと。

## 5. 外部照合結果 (2026-08-18)

1 章の要スポットチェック 30 種について、学名で WebSearch し、`sizeMm` (寸法規則は
0 章のとおり) / `habitat` / 生態記述が公開文献・データベースと整合するかを個別に
確認した。判定は 3 分類:

- **一致**: 文献と整合。根拠 URL 1 本を付す。
- **要修正**: 文献値と乖離。修正案と根拠を付す。
- **文献不足**: 種特異的な信頼できる情報源が見つからず、確認できず。user の専門判断待ち。

結果: **一致 9 種 / 要修正 14 種 / 文献不足 7 種** (計 30 種)。

情報源について: 博物館 (Australian Museum, Museums Victoria)、政府系 (agriculture.gov.au
の DAFF バッタ識別ガイド)、査読誌 (Records of the Australian Museum、原記載 Zootaxa 論文、
PMC 掲載論文)、大学 (University of Hertfordshire AERU)、Atlas of Living
Australia / Australian Faunal Directory を優先して当たった。ただし、これらの一次資料が
存在しない普通種・地味な種が多く、その場合は Brisbane Insects / ozanimals.com /
ausemade.com.au / Minibeast Wildlife / phasmatodea.com など、豪州昆虫界隈で広く参照される
専門愛好家サイトを補助的に採用した (該当箇所は所見に明記)。Wikipedia は一次文献
(Moulds 1990 の "Australian Cicadas"、Theischinger & Hawking 2006 の CSIRO 図鑑など) を
出典として引ける場合のみ採用した。

### 5.1 要修正 (14 種)

| # | 和名 | 学名 | 現行案 | 修正案 | 根拠 |
|---|---|---|---|---|---|
| 1 | ムネスジヤンマ | Aeshna brevistyla | sizeMm [60,70] | 学名を **Adversaeschna brevistyla** に修正 (Watson 1992 の再分類、AFD/ALA 準拠の現行受理学名)。sizeMm は文献間で 50〜80mm とばらつき確定できず、5.2 の文献不足も参照 | [ALA / AFD](https://bie.ala.org.au/species/Adversaeschna+brevistyla) |
| 5 | キボシエゾトンボ | Hemicordulia australiae | habitat [pond, forest] | habitat を **pond, stream** 系へ (forest の裏付けなし、実態は池・小川をパトロールしホバリングする種。sizeMm [42,50] は文献と一致でそのまま可) | [Brisbane Insects](https://www.brisbaneinsects.com/brisbane_dragons/AustraliaEmerald.htm) |
| 7 | キノカワバッタ | Coryphistes ruricola | sizeMm [25,40] | **[40,50]** (ozanimals.com 40-50mm、Brisbane Insects/Esperance Fauna も独立に約50mmを報告。上限が過小だった) | [ozanimals.com](https://www.ozanimals.com/Insect/Bark-mimicking-Grasshopper/Coryphistes/ruricola.html) |
| 9 | セスジチャイロバッタ | Gastrimargus musicus | sizeMm [30,50] | **[25,50]** (DAFF: 雄25-35mm/雌35-50mm。規約 [小さい方の下限, 大きい方の上限] 適用で下限を25へ) | [DAFF locust ID guide](https://www.agriculture.gov.au/biosecurity-trade/pests-diseases-weeds/locusts/about/id-guide/description_of_adults/7_yellow_winged_locust_gastrimargus_musicus) |
| 10 | トサカバッタ | Goniaea australasiae | sizeMm [30,45] | **[30,52]** (雄〜35mm/雌〜52mm、Brisbane Insects も独立に約50mmを報告。上限が過小だった) | [Friends of Queens Park Bushland](https://www.friendsofqueensparkbushland.org.au/wildlife/goniaea-australasiae/) |
| 11 | ミドリガシラバッタ | Oedaleus australis | sizeMm [25,40] | **[20,35]** (DAFF: 雄20-30mm/雌25-35mm。規約適用で [20,35]。上限が過大だった) | [DAFF locust ID guide](https://www.agriculture.gov.au/biosecurity-trade/pests-diseases-weeds/locusts/about/id-guide/description_of_adults/6_eastern_plague_grasshopper_oedaleus_australis) |
| 15 | クロモンヤガ | Agrotis munda | sizeMm(開張) [35,45] | **[30,40]** (複数独立ページで開張30-40mmに収束、40mm超のデータなし) | [ausemade.com.au](https://ausemade.com.au/flora-fauna/fauna/insects/moths/agrotis-munda/) |
| 17 | アオバネナナフシ | Anchiale briareus | sizeMm [110,160] | **[110,170]** (専門ナナフシサイトが最大170mmと明記。上限が過小だった) | [phasmatodea.com](https://www.phasmatodea.com/curiosities) |
| 19 | イトアシナナフシ | Sipyloidea larryi | sizeMm [70,100] | **[50,90]** (原記載 Zootaxa 1570 のホロタイプ雌80mm、Minibeast Wildlife の雄50-80mm。上限100mmの裏付けなし) | [原記載関連 (ResearchGate)](https://www.researchgate.net/figure/Sipyloidea-larryi-holotype-female-Garradunga-note-parasite_fig30_287837852) |
| 23 | カレエダホソカマキリ | Archimantis sobrina | sizeMm [60,80] | **[60,90]** (Minibeast Wildlife 飼育ガイドが最大約90mmと明記。上限が過小だった) | [Minibeast Wildlife 飼育ガイド (PDF)](https://shop.minibeastwildlife.com.au/content/Minibeast%20Wildlife%20Care%20Guide%20-%20Archimantis%20sobrina.pdf) |
| 25 | マルバネカマキリ | Neomantis australis | sizeMm [25,35] | **[18,25]** (専門ブリーダー筋で成体最大25mmと複数独立に一致。上限35mmの裏付けなし) | [Bug Frenzy](https://bugfrenzy.com.au/product/net-winged-mantis-neomantis-australis-sub-adults/) |
| 26 | チャバネカマキリ | Sphodropoda quinquedens | sizeMm [50,70]、habitat [forest_edge, grassland] | sizeMm **[64,70]** (Milledge 2005, Records of the Australian Museum の改訂論文実測値: 雄64mm/雌70mm。下限が過小だった)。habitat は「灌木・樹上性、乾燥地のユーカリ林」の記述が中心で、grassland はやや外れる可能性あり (要 user 判断) | [Records of the Australian Museum (Milledge 2005)](https://media.australian.museum/media/Uploads/Journals/18016/1442_complete.pdf) |
| 29 | シロバネナナフシ | Megacrania batesii | sizeMm [100,130] | **[76,137]** (Hsiung 2007, Journal of Orthoptera Research 16:207 実測値: 雄76-87mm/雌98-137mm。規約適用で [76,137]) | [Wikipedia (Hsiung 2007 引用)](https://en.wikipedia.org/wiki/Megacrania_batesii) |

### 5.2 文献不足 (7 種)

| # | 和名 | 学名 | 現行案 | 所見 |
|---|---|---|---|---|
| 3 | ハラナガアオイトトンボ | Austrolestes analis | sizeMm [36,44] | 文献が「腹部長 3-3.2cm」のみを報告し体長全体の値がない。他ソースは「全長約3cm強」の定性記述のみで、[36,44] との整合を確認できない | [Wikipedia (Slender ringtail)](https://en.wikipedia.org/wiki/Slender_ringtail) |
| 8 | アカスネバッタ | Cryptobothrus chrysophorus | sizeMm [18,28] | 唯一見つかった数値が専門愛好家サイトの単一点データ (体長30mm) のみで、範囲・雌雄差の記載なし。habitat の grassland 自体は自然保護区の記録で裏付けられる | [Brisbane Insects](https://www.brisbaneinsects.com/brisbane_grasshoppers/GoldenBandwing.htm) |
| 13 | ダイダイオビゼミ | Henicopsaltria eydouxii | sizeMm [50,65] (翅端までの全長として推定) | 文献にあるのは前翅長45-60mm (最頻50-55mm、Moulds 1990 / Queensland Museum 2011 由来) のみで、翅端まで全長の直接値なし。habitat の forest は dry/wet sclerophyll forest 等の記述と整合。詳細は 5.4 の内部一貫性チェックを参照 | [Wikipedia (Moulds 1990 引用)](https://en.wikipedia.org/wiki/Henicopsaltria_eydouxii) |
| 18 | イボアタマナナフシ | Candovia strumosa | sizeMm [60,90] | 属改訂論文 (Forni et al. 2022) は新種のみに実測値を記載し、本種の種固有値はなし。近縁種メスが52-90mm程度という断片情報はあり、現行案と大きく矛盾はしないが確証なし | なし |
| 24 | クロボシカマキリ | Mantis octospilota | sizeMm [50,70] | 出典未記載の Wikipedia 記述 (「2インチ超」) 以外に種特異的一次情報源が見つからず | なし |
| 27 | ホシバネユスリカ | Polypedilum nubifer | sizeMm [4,6] | 査読論文 (Cranston 2016, Zootaxa) は蛹殻長5.5-7.5mmを報告するが成虫体長の記載はない。測定部位が異なり単純比較不可。habitat (pond, marsh) は富栄養化した止水に大発生するとの記述と整合 | [Cranston 2016 (PubMed)](https://pubmed.ncbi.nlm.nih.gov/27394199/) |
| 28 | カスリシマトビケラ | Asmicridea edwardsii | sizeMm [8,12] | 分類学的record・標本記録は存在するが、体長・前翅長いずれの実測値も一次資料で確認できず。Trichoptera 科レベルの一般値 (前翅長4-20mm程度) と大きな矛盾はない | なし |

### 5.3 一致 (9 種)

| # | 和名 | 学名 | 根拠 |
|---|---|---|---|
| 2 | ハバビロイトトンボ | Austroargiolestes icteromelas | [Wikipedia (Theischinger & Hawking 2006, CSIRO 引用)](https://en.wikipedia.org/wiki/Common_flatwing) |
| 4 | ワモンアオイトトンボ | Austrolestes leda | [Brisbane Insects](https://www.brisbaneinsects.com/brisbane_damsels/Ringtail.htm) |
| 6 | オセアニアハネビロトンボ | Tramea loewii | [Brisbane Insects](https://www.brisbaneinsects.com/brisbane_dragons/CommonGlider.htm) |
| 12 | ダイダイサシガメ | Gminatus australis | [Museums Victoria](https://collections.museumsvictoria.com.au/species/8555) |
| 14 | ネッタイマキバサシガメ | Nabis kinbergii | [Univ. of Hertfordshire AERU](https://sitem.herts.ac.uk/aeru/bpdb/Reports/2327.htm) |
| 16 | マダラナナフシ | Anchiale austrotessulata | [Brisbane Insects](https://www.brisbaneinsects.com/brisbane_hoppers/tessulata.htm) |
| 21 | キイロブチコガネ | Cyclocephala signaticollis | [PMC 掲載論文](https://pmc.ncbi.nlm.nih.gov/articles/PMC4802167/) |
| 22 | ヒョウモンハナムグリ | Neorrhina punctatum | [Australian Museum](https://australian.museum/learn/animals/insects/punctate-flower-chafer-beetle/) |
| 30 | キモンセセリモドキガ | Synemon plana | [Wikipedia (Clarke 2000 引用)](https://en.wikipedia.org/wiki/Synemon_plana) |

### 5.4 セミの寸法規則 (翅端まで vs 体長) の内部一貫性チェック

#13 ダイダイオビゼミの現行案 [50,65]mm は 0 章の規則 (セミ = 翅端までの全長) に沿って
見積もられたと見られるが、直接その全長を報告する文献は見つからなかった (5.2 のとおり
文献不足)。判断材料として、bugs.js 内の既存セミ種の登録値と公開実測値を突き合わせた。

- **アブラゼミ** (Graptopsaltria nigrofuscata、日本産、bugs.js 既存): 文献の「翅端まで」
  値は53-60mmで複数情報源が収束。bugs.js 登録値 `sizeMm:[53,60]` と完全一致。
  → 登録値は「翅端まで」規則に忠実。
- **ミンミンゼミ** (Hyalessa maculaticollis、日本産、bugs.js 既存): 文献の「翅端まで」
  値は約55-63mm、「体長 (翅を除く)」値は29-39mm。ところが bugs.js 登録値
  `sizeMm:[33,38]` は後者の体長値に近い。→ この種は「翅端まで」規則が徹底されておらず、
  bugs.js 全体では規約の適用に既存の揺れがある。
- **ウスキバネオオゼミ** (Cyclochila australasiae、AU 遠征 I 同バッチ、3 章で追加済・
  確信度 high 扱いのため 30 種表の対象外): 文献の前翅長は50-58mm、裸の体長は約40mm。
  bugs.js 登録値 `sizeMm:[55,70]` は体長40mmより明らかに前翅長50-58mm寄りで、かつ
  それをやや上回る (頭胸部の分の上乗せと解釈できる)。→ AU 遠征 I バッチの見積もり
  プロセスは「前翅長 + 頭胸部相当」で翅端までの全長を近似していると考えられる。
- ダイダイオビゼミの文献前翅長は45-60mm (最頻50-55mm)。ウスキバネオオゼミと同じ
  「前翅長→翅端までの全長」の見積もり方を適用すると、現行案 [50,65]mm は前翅長データの
  レンジとほぼ整合し、少なくとも同一バッチ内では一貫した見積もりになっている。

**結論**: 直接の文献的裏付けがないため 5.2 の「文献不足」区分はそのまま維持するが、
バッチ内一貫性の観点では現行案 [50,65]mm を積極的に修正する根拠はない。Moulds (1990)
原典または Queensland Museum の標本記録で翅端までの全長値を確認できれば、この判定を
「一致」へ格上げできる。なお、ミンミンゼミのように bugs.js に規約の揺れが既にある点は
今回のスコープ外 (AU 遠征 I 外の既存種) として触れていない。
