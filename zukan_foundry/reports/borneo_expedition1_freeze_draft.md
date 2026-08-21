# ボルネオ遠征 I volume 凍結設計ドラフト

status: draft、user 承認待ち。コード・カタログへの反映は freeze 承認後。

作成日: 2026-08-17。対象: 更新 3 (`docs/komorebi_release_linkage.md` 2 章)。最終決定は発案者が行う。

## 0. 前提と入力

- 地域 seeds: `zukan_foundry/data/species_reserve/regions/borneo.enriched.jsonl` 200 件。geometry 定義 (BN + MY サバ サラワク + ID カリマンタン) で harvest 済み。
- 本ドラフトの選抜は 84 種、レア度配分は `docs/komorebi_rarity_standard.md` の基準値どおり N 57 / R 17 / SR 7 / SSR 3 (看板 1 + 非看板 2)。
- 看板はアカエリトリバネアゲハ (Trogonoptera brookiana)。`docs/komorebi_release_linkage.md` 2 章の更新カレンダーで更新 3 の看板として確保済みと記載されており、`docs/komorebi_regions.md` 7 章の対カタログ照合でも使用可と判定されている。seeds に実在を確認した (標準和名 アカエリアゲハ、occurrence 377)。
- オーストラリア遠征 I ドラフト (`zukan_foundry/reports/au_expedition1_freeze_draft.md`) と同じ書式で書いた。ただし AU I が写真を実見して選抜したのに対し、本ドラフトの時点でボルネオ種の標本写真はほぼ未取得である (3 章)。したがって本書の選抜は写真取得の対象リストであり、写真実見後に落選が発生する前提で読む。
- モーレンカンプオオカブト (Chalcosoma moellenkampi) は更新 7 のボルネオ遠征 II の看板として予約済みのため、本巻には入れない。seeds に実在を確認済み (標準和名あり、occurrence 419)。

## 1. seeds 前処理の監査 (2026-08-17 再実測)

`docs/komorebi_release_linkage.md` 4 章のパイプライン 1 と 2 について、現在の `shared/bugs.js` に対して再計算した結果。

| 工程 | 台帳の記録 | 2026-08-17 の再実測 | 判定 |
|---|---|---|---|
| 対カタログ重複判定 | 2026-08-12 実施。ボルネオ 188/200 使用可 | 本編重複 17 件、既存 volume 重複 2 件、使用可 181 件 | 再実施が必要。差分の理由は下記 |
| 名前 enrichment | 未実施と記載 | 実施済み (`zukan_foundry/reports/name_enrichment_borneo.md`、2026-08-14)。standard 39 / english 41 / provisional 120、標準和名取得率 19.5% | 台帳の記述が古い。本工程は完了 |
| 種選抜 | 未実施 | 本ドラフトが該当 | 承認待ち |
| 標本写真 zukan-fetch | 未着手 | 200 種中 19 種にカードあり。うち使用可能な種は 3 種のみ | 最大の残作業 (3 章) |
| volume freeze | 未実施 | 本ドラフト承認後 | |

再実測が台帳より 6 件多い理由は 2 つある。第一に、2026-08-12 の判定は当時の本編カタログ 1,213 種に対して行われたが、本編拡張トラック (`docs/zukan_stock_ledger.md` 2.5 章) で bugs.js が拡張され、現在の本編 entry は 1,472 学名になっている。第二に、当時は他 volume の areaOnly 種が存在しなかった。

### 1.1 本編カタログとの重複 17 件 (選抜対象外)

| seed 学名 | 本編 id | 本編和名 |
|---|---|---|
| Hypolimnas bolina | ryukyu_murasaki | リュウキュウムラサキ |
| Deroplatys desiccata | orchid_ghost_mantis_dummy | カレハカマキリ |
| Aedes albopictus | hito_suji_shima_ka | ヒトスジシマカ |
| Apis koschevnikovi | nihon_mitsubachi | ニホンミツバチ (同属照合) |
| Apis cerana | nihon_mitsubachi | ニホンミツバチ |
| Papilio memnon | nagasaki_ageha | ナガサキアゲハ |
| Hymenopus coronatus | hana_kamakiri | ハナカマキリ |
| Hermetia illucens | ame_ika_abu | アメリカミズアブ |
| Anoplolepis gracilipes | ito_ari | アシナガキアリ |
| Graphium sarpedon | aosuji_ageha | アオスジアゲハ |
| Papilio nephelus | tomon_ageha | タイワンモンキアゲハ |
| Culex quinquefasciatus | aka_ie_ka | アカイエカ (synonym 照合) |
| Vespa affinis | tsumaguro_suzumebachi | ツマグロスズメバチ |
| Junonia orithya | ao_tatehamodoki | アオタテハモドキ |
| Eurema hecabe | minami_kichou | ミナミキチョウ |
| Heteropteryx dilatata | master_jungle_nymph | ジャングルニンフ |
| Catopsilia pomona | kibane_seseri_dummy_replaced_usuki_shirochou | ウスキシロチョウ |

Apis koschevnikovi (サバミツバチ) は本編のニホンミツバチと canonical 一致ではなく同属照合で引っかかっている。学名は別種なので使用可とする判断もありうるが、和名の第一想起が重なるため本ドラフトでは除外した。復帰させたい場合は 5 章の追加候補に回す。

### 1.2 既存 volume との重複 2 件 (選抜対象外)

| seed 学名 | 既存 id | 状況 |
|---|---|---|
| Bactrocera dorsalis | bactrocera_dorsalis | オーストラリア遠征 I の命名 97 種に含まれ bugs.js へ areaOnly 登録済み。ただし写真品質で volume からは落選しており、AU I の 84 種には入っていない |
| Orthetrum sabina | orthetrum_sabina | オーストラリア遠征 I の 84 種に N として収録済み |

Bactrocera dorsalis は entry だけが宙に浮いている状態で、ボルネオへ付け替える余地がある。ただし既存 entry の産地や説明文を書き換える作業になるため、本ドラフトでは触らず AU 側の refetch 対象のままとした。

### 1.3 名前の状態と命名の残作業

選抜 84 種の nameStatus は standard 18 / english_common_candidate 22 / provisional 44。標準和名がある 18 種以外は命名が未であり、命名は `docs/komorebi_naming_convention.md` に従う別工程で行う。本ドラフトでは学名を主キーとして扱い、和名は標準和名がある場合のみ記載する。SSR と SR の 10 種については読み手の判断材料として仮称の方向性だけ添えるが、これは提案であって確定ではない。

seeds 全体で注意が必要な点が 1 つある。Ceratina spec、Vespa spec、Amegilla spec の 3 件は種小名が spec という実在する学名で、属レベルの未同定を表す表記ではない。ただし読み手には未同定に見えるため、本ドラフトでは選抜対象から外した。

## 2. 収録 84 種の選抜案 (使用可 181 種から)

### 2.1 目 (order) 別の配分

| 目 | 使用可 | 本巻 | 遠征 II へ残す | 備考 |
|---|---:|---:|---:|---|
| Hemiptera (カメムシ セミ) | 21 | 11 | 10 | ビワハゴロモ科 6 種とセミ 8 種がボルネオらしさを担う |
| Coleoptera (甲虫) | 21 | 10 | 11 + 看板予約 1 | 使用可 21 種が全て糞虫 (Scarabaeidae)。5 章の弱点 |
| Odonata (トンボ) | 20 | 10 | 10 | |
| Orthoptera (バッタ キリギリス) | 21 | 10 | 11 | |
| Lepidoptera (チョウ ガ) | 14 | 9 | 5 | 使用可が最も少ない目。看板を含むため本巻に厚く取る |
| Mantodea (カマキリ) | 19 | 9 | 10 | |
| Phasmida (ナナフシ) | 20 | 8 | 12 | ボルネオの看板分類群 |
| Hymenoptera (ハチ アリ) | 17 | 8 | 9 | |
| Diptera (ハエ カ) | 17 | 6 | 11 | ミバエ属が 11 種を占め見た目が単調なため本巻は抑える |
| Trichoptera (トビケラ) | 10 | 3 | 7 | |
| 計 | 180 | 84 | 96 | Chalcosoma moellenkampi を II 予約として別勘定 |

バトル属性の見込みは かんじ (チョウ) 9 / けいさん (甲虫) 10 / えいご (他) 65。マダガスカル遠征 I の 22/4/58 に比べ けいさん が改善し かんじ が減る。3 属性は確保できている。

### 2.2 SSR 3 種

| # | 学名 | 和名 | 科 | 名前の状態 | 選定理由 |
|---|---|---|---|---|---|
| 1 | Trogonoptera brookiana | アカエリアゲハ (更新カレンダー表記はアカエリトリバネアゲハ) | Papilionidae | standard | 看板。黒地の翅に緑の炎のような帯が並ぶ大型トリバネアゲハで、ボルネオの象徴として最も通りがよい。標準和名があり thumb サイズでも帯の形で識別できる |
| 2 | Tacua speciosa | キエリアブラゼミ | Cicadidae | standard | 世界最大級のセミ。黒地に黄色い襟と青緑の斑という配色が図鑑映えし、標準和名も定着している。本編に同属は無く、重複感が出ない |
| 3 | Pyrops whiteheadi | (命名未) | Fulgoridae | provisional | 頭部から前へ長く伸びる突起をもつビワハゴロモ科。ボルネオ産 Pyrops 6 種の中で occurrence が最大 (442) で写真確保の見込みも最も高い。姿の異様さが説明不要のインパクトを持つ |

看板と目を散らす条件は満たしている (チョウ、セミ、ヨコバイ近縁)。

Pyrops whiteheadi については確認が 1 点ある。更新 8 のコスタリカ遠征 II の看板がビワハゴロモ (Fulgora laternaria) で、科が同じ Fulgoridae になる。見た目は Pyrops が細長い上向きの突起、Fulgora が落花生状の頭部で明確に違うが、和名を付ける段階で「ビワハゴロモ」の語を共有する可能性がある。重複感が許容できない場合の次点は Haaniella echinata (2.3 の SR 1 位) を SSR に上げ、Pyrops whiteheadi を SR に下げる入れ替えとする。

### 2.3 SR 7 種

| # | 学名 | 和名 | 科 | 名前の状態 | 選定理由 |
|---|---|---|---|---|---|
| 1 | Lyssa zampa | オオツバメガ | Uraniidae | standard | 開張 10cm を超えるツバメガで、後翅の尾状突起と白帯が目を引く。標準和名がある。本編のニシキオオツバメガと同科だが属も色調も異なる |
| 2 | Troides amphrysus | アンフリサスキシタアゲハ | Papilionidae | standard | 後翅の黄金色が広く、看板のアカエリアゲハと並べたときに東南アジアのトリバネアゲハ 2 枚看板になる。標準和名あり |
| 3 | Neurobasis longipes | (命名未) | Calopterygidae | english_common_candidate | 後翅全体が金属光沢の緑になるカワトンボ。トンボ 10 種の代表枠で、色の強さが帯内で突出している |
| 4 | Haaniella echinata | (命名未) | Heteropterygidae | english_common_candidate | 全身がトゲに覆われた大型ナナフシ。飼育界での知名度が高く、ボルネオの看板分類群を SR 帯で代表できる |
| 5 | Toxodera hauseri | (命名未) | Toxoderidae | provisional | 胸部が極端に細長く枯枝そのものに見えるカマキリ。形の異様さが際立つ。occurrence 16 と少なく写真確保が難しいため、取れなければ 5 章の代替へ差し替える |
| 6 | Discotettix belzebuth | (命名未) | Tetrigidae | english_common_candidate | 背に棘と突起が並ぶヒシバッタ。小型だが形が唯一無二で、バッタ 10 種の中で最も図鑑映えする |
| 7 | Pulchriphyllium mannani | (命名未) | Phylliidae | provisional | 葉に擬態するコノハムシ科。生態的スペクタクルは SSR 級だが、本編にコノハムシ (Phyllium pulchrifolium) とサカダチコノハナナフシが既に収録済みで重複感が出るため SR に置いた |

SR は 7 種で、更新 3 に投入するカテゴリ 4 本 (kom_frac_flow / kom_kuku_inverse / kom_kuku_dan6 / kom_kuku_dan7) を上回っており、トロフィー代表虫の予備として足りる。

### 2.4 R 17 種

| # | 学名 | 和名 | 科 | 名前の状態 | occurrence |
|---|---|---|---|---|---:|
| 1 | Kallima sylvia | (命名未) | Nymphalidae | provisional | 476 |
| 2 | Graphium agamemnon | コモンタイマイ | Papilionidae | standard | 226 |
| 3 | Graphium antiphates | オナガタイマイ | Papilionidae | standard | 219 |
| 4 | Junonia hedonia | イワサキタテハモドキ | Nymphalidae | standard | 487 |
| 5 | Pyrops sultanus | (命名未) | Fulgoridae | provisional | 359 |
| 6 | Pyrops intricatus | (命名未) | Fulgoridae | provisional | 186 |
| 7 | Penthicodes farinosa | (命名未) | Fulgoridae | provisional | 179 |
| 8 | Cryptotympana aquila | (命名未) | Cicadidae | english_common_candidate | 67 |
| 9 | Dundubia vaginata | ミドリゼミ | Cicadidae | standard | 140 |
| 10 | Pycanum alternatum | (命名未) | Tessaratomidae | provisional | 108 |
| 11 | Deroplatys truncata | (命名未) | Deroplatyidae | provisional | 98 |
| 12 | Deroplatys lobata | (命名未) | Deroplatyidae | english_common_candidate | 31 |
| 13 | Hierodula venosa | (命名未) | Mantidae | english_common_candidate | 24 |
| 14 | Epidares nolimetangere | (命名未) | Heteropterygidae | english_common_candidate | 143 |
| 15 | Xylocopa latipes | (命名未) | Apidae | english_common_candidate | 367 |
| 16 | Oecophylla smaragdina | ツムギアリ | Formicidae | standard | 494 |
| 17 | Neurothemis fluctuans | フチトリベッコウトンボ | Libellulidae | standard | 1074 |

R 帯の選定理由 (各 2 行)。

- Kallima sylvia。翅を閉じると枯葉そのものになる擬態が話の核になる。本編のコノハチョウ (Kallima inachus) と同属のため、SR 以上には上げずに R とした。
- Graphium agamemnon。黒地に緑の斑が規則正しく並び、thumb でも模様が読める。標準和名コモンタイマイがあり命名工程を省ける。
- Graphium antiphates。細い尾状突起と縞模様の組み合わせが上品で、同属のコモンタイマイと並べて見比べる楽しみが出る。標準和名あり。
- Junonia hedonia。タテハモドキ属の中で最も occurrence が高く写真確保が堅い。地味な褐色だが眼状紋の列が図鑑向きに読みやすい。
- Pyrops sultanus。SSR に置いた whiteheadi と同属で、突起の形と色が違う 2 枚目。同属を帯違いで並べると図鑑としての見比べが生まれる。
- Pyrops intricatus。上記 2 種に続く 3 枚目で、翅の網目模様が細かい。ビワハゴロモ科をボルネオの見どころとして厚めに置く方針の一部。
- Penthicodes farinosa。ビワハゴロモ科だが突起を持たず、翅の白粉と赤い後翅で別系統の見た目になる。科内の多様性を見せる枠。
- Cryptotympana aquila。翅の形がコウモリに例えられる大型セミで、英名 Batwing Cicada が説明の足がかりになる。occurrence 67 と少なめで写真確保は中程度の難度。
- Dundubia vaginata。標準和名ミドリゼミがあり緑色のセミという分かりやすさがある。ボルネオのセミ 8 種の中では中位の大きさ。
- Pycanum alternatum。大型のキンカメムシ近縁で、体が平たく縁が波打つ。色は地味だが形の面白さで R に置いた。
- Deroplatys truncata。枯葉に擬態する大型カマキリ。本編のカレハカマキリ (Deroplatys desiccata) と同属のため SR には上げなかった。
- Deroplatys lobata。同属 2 種目で、胸部の張り出しが truncata より丸い。同属 2 種を並べる意図は Pyrops と同じ。
- Hierodula venosa。前脚の内側が黄金色になる大型カマキリで、英名 Golden-armed Mantis が示すとおり色の見どころがある。occurrence 24 と少なく写真確保は難度が高い。
- Epidares nolimetangere。触ると硬直する小型ナナフシで、英名 Touch Me Not がそのまま説明になる。棘の並びが密で図鑑映えする。
- Xylocopa latipes。世界最大級のクマバチで、翅が青紫に光る。本編のキムネクマバチと同属だが大きさの物語で差別化できる。
- Oecophylla smaragdina。葉を綴って巣を作るツムギアリ。標準和名があり、生態が説明しやすい。既に標本写真が確保されている数少ない種。
- Neurothemis fluctuans。翅の大部分が赤褐色に染まるトンボで、ボルネオ seeds 中で occurrence 最大 (1074)。写真確保が最も堅い R 候補。

### 2.5 N 57 種

学名、標準和名 (ある場合)、科、名前の状態の順に列挙する。

Coleoptera (10)

| 学名 | 科 | 名前の状態 | occurrence |
|---|---|---|---:|
| Liatongus femoratus | Scarabaeidae | provisional | 3232 |
| Onthophagus cervicapra | Scarabaeidae | provisional | 1759 |
| Sisyphus thoracicus | Scarabaeidae | provisional | 1618 |
| Proagoderus watanabei | Scarabaeidae | provisional | 1563 |
| Paragymnopleurus maurus | Scarabaeidae | provisional | 1487 |
| Paragymnopleurus sparsus | Scarabaeidae | provisional | 1323 |
| Catharsius renaudpauliani | Scarabaeidae | provisional | 1191 |
| Onthophagus rugicollis | Scarabaeidae | provisional | 1131 |
| Catharsius dayacus | Scarabaeidae | provisional | 831 |
| Copris sinicus | Scarabaeidae | provisional | 541 |

Hemiptera (3)

| 学名 | 科 | 名前の状態 | occurrence |
|---|---|---|---:|
| Megapomponia merula | Cicadidae | provisional | 117 |
| Champaka spinosa | Cicadidae | provisional | 99 |
| Velinus nigrigenu | Reduviidae | provisional | 39 |

Odonata (8)

| 学名 | 和名 | 科 | 名前の状態 |
|---|---|---|---|
| Orthetrum testaceum | (命名未) | Libellulidae | english_common_candidate |
| Tyriobapta torrida | (命名未) | Libellulidae | english_common_candidate |
| Neurothemis terminata | ナンヨウベッコウトンボ | Libellulidae | standard |
| Euphaea impar | (命名未) | Euphaeidae | english_common_candidate |
| Heliocypha biseriata | (命名未) | Chlorocyphidae | provisional |
| Rhinagrion borneense | (命名未) | Philosinidae | provisional |
| Ceriagrion cerinorubellum | ナンヨウベニイトトンボ | Coenagrionidae | standard |
| Devadatta clavicauda | (命名未) | Devadattidae | provisional |

Mantodea (5)

| 学名 | 科 | 名前の状態 |
|---|---|---|
| Psychomantis borneensis | Hymenopodidae | provisional |
| Helvia cardinalis | Hymenopodidae | provisional |
| Odontomantis planiceps | Hymenopodidae | english_common_candidate |
| Ceratocrania macra | Hymenopodidae | provisional |
| Amantis reticulata | Gonypetidae | provisional |

Phasmida (5)

| 学名 | 科 | 名前の状態 |
|---|---|---|
| Aretaon asperrimus | Heteropterygidae | english_common_candidate |
| Haaniella grayii | Heteropterygidae | english_common_candidate |
| Hoploclonia gecko | Heteropterygidae | english_common_candidate |
| Aschiphasma annulipes | Aschiphasmatidae | english_common_candidate |
| Diesbachia sophiae | Lonchodidae | english_common_candidate |

Orthoptera (9)

| 学名 | 科 | 名前の状態 |
|---|---|---|
| Nisitrus vittatus | Gryllidae | provisional |
| Valanga nigricornis | Acrididae | english_common_candidate |
| Traulia azureipennis | Acrididae | provisional |
| Xantia borneensis | Tettigoniidae | provisional |
| Zulpha perlaria | Tettigoniidae | provisional |
| Amphibotettix longipes | Tetrigidae | provisional |
| Leptoderes ornatipennis | Tettigoniidae | provisional |
| Salomona borneensis | Tettigoniidae | provisional |
| Onomarchus uninotatus | Tettigoniidae | provisional |

Lepidoptera (2)

| 学名 | 和名 | 科 | 名前の状態 |
|---|---|---|---|
| Junonia atlites | アトリテスタテハモドキ | Nymphalidae | standard |
| Junonia iphita | クロタテハモドキ | Nymphalidae | standard |

Hymenoptera (6)

| 学名 | 和名 | 科 | 名前の状態 |
|---|---|---|---|
| Apis dorsata | オオミツバチ | Apidae | standard |
| Apis andreniformis | クロコミツバチ | Apidae | standard |
| Vespa tropica | (命名未) | Vespidae | english_common_candidate |
| Polyrhachis armata | (命名未) | Formicidae | english_common_candidate |
| Crematogaster inflata | (命名未) | Formicidae | provisional |
| Dolichoderus thoracicus | (命名未) | Formicidae | english_common_candidate |

Diptera (6)

| 学名 | 和名 | 科 | 名前の状態 |
|---|---|---|---|
| Bactrocera carambolae | (命名未) | Tephritidae | provisional |
| Bactrocera musae | (命名未) | Tephritidae | provisional |
| Bactrocera cucurbitae | ウリミバエ | Tephritidae | standard |
| Bactrocera frauenfeldi | (命名未) | Tephritidae | english_common_candidate |
| Aedes aegypti | ネッタイシマカ | Culicidae | standard |
| Anopheles balabacensis | (命名未) | Culicidae | provisional |

Trichoptera (3)

| 学名 | 科 | 名前の状態 |
|---|---|---|
| Limnocentropus grandis | Limnocentropodidae | provisional |
| Cheumatopsyche globosa | Hydropsychidae | provisional |
| Polymorphanisus quadripunctatus | Hydropsychidae | provisional |

N の合計は Coleoptera 10 + Hemiptera 3 + Odonata 8 + Mantodea 5 + Phasmida 5 + Orthoptera 9 + Lepidoptera 2 + Hymenoptera 6 + Diptera 6 + Trichoptera 3 = 57 種。

Polymorphanisus quadripunctatus は occurrence 6 と極端に少なく写真確保の見込みが薄い。落選した場合は 5 章の予備から補充する。

## 3. 標本写真の取得状況と優先順リスト

ボルネオ seeds 200 種のうち `zukan_cards/metadata/` にカードがあるのは 19 種だが、そのうち 16 種は本編重複または既存 volume 収録で選抜対象外である。本ドラフトの 84 種のうち写真が既にあるのは 2 種 (Oecophylla smaragdina、Bactrocera musae) にとどまる。残り 82 種は zukan-fetch を新規に回す必要がある。

`docs/zukan_stock_ledger.md` の「must-have 看板 ... アカエリトリバネアゲハ 在庫済み」という記述は seeds に speciesKey があるという意味であり、標本写真の確保を意味しない。看板のアカエリアゲハも現時点で写真は未取得である。

### 3.1 優先順

第 1 波 (看板と SSR。ここが通らなければ巻が立たない)

1. Trogonoptera brookiana (看板)
2. Tacua speciosa
3. Pyrops whiteheadi

第 2 波 (SR 7 種。トロフィー代表虫の候補になるため看板の次に確実にしたい)

4. Lyssa zampa
5. Troides amphrysus
6. Neurobasis longipes
7. Haaniella echinata
8. Discotettix belzebuth
9. Pulchriphyllium mannani
10. Toxodera hauseri

第 3 波 (R 17 種。occurrence が高く成功見込みの高い順に並べた)

11. Neurothemis fluctuans
12. Oecophylla smaragdina (取得済み。品質確認のみ)
13. Junonia hedonia
14. Kallima sylvia
15. Xylocopa latipes
16. Pyrops sultanus
17. Graphium agamemnon
18. Graphium antiphates
19. Pyrops intricatus
20. Penthicodes farinosa
21. Epidares nolimetangere
22. Dundubia vaginata
23. Pycanum alternatum
24. Deroplatys truncata
25. Cryptotympana aquila
26. Deroplatys lobata
27. Hierodula venosa

第 4 波 (N 57 種。順序は occurrence 降順でよい)

28 以降。Liatongus femoratus、Onthophagus cervicapra、Sisyphus thoracicus、Proagoderus watanabei、Paragymnopleurus maurus 以下の糞虫 10 種、トンボ 8 種、バッタ 10 種、ナナフシ 5 種、カマキリ 5 種、ハチ 6 種、ハエ 6 種、セミとサシガメ 3 種、タテハ 2 種、トビケラ 2 種。

### 3.2 取得数の見積り

オーストラリア遠征 I は命名済み 97 種に対して写真品質で 13 種を落とし 84 種とした。落選率 13% を当てはめると、84 種を確定させるには 96 種前後の写真取得が要る。使用可 181 種のうち本巻に 96 種分の写真を取ると、ボルネオ遠征 II の候補は 85 種前後まで縮み、決定 11 の下限 80 種に対する余裕がほとんど無くなる。この点は `zukan_foundry/reports/volume2_rarity_frames.md` の 3 章で扱う。

### 3.3 tier の見込み

ボルネオ産は museum tier 依存が強い (`docs/komorebi_regions.md` 2 章)。NHMUK と Naturalis に東南アジア標本の蓄積があるため、チョウ、ガ、セミ、ナナフシ、カマキリは見込みがある。糞虫 (Scarabaeidae) は museum の barcode 標本が多く、ラベルが画面を占める写真が混じりやすい。トビケラは AU I と同様に落選が出やすい。

## 4. 地域 blurb

現行 `komorebi/volumes/volume_fixture.js` の合成 fixture には blurb が無いため、新規に起こす。マダガスカル遠征 I とオーストラリア遠征 I の三段構成 (位置、日本との大きさ比較、自然の特徴) に合わせた案を示す。

> 東南アジアのまん中にある大きな島。日本の 2 倍。一年じゅう暑くて雨が多い森が広がる。

固有性を一言足す対案。

> 東南アジアのまん中にある大きな島。日本の 2 倍。一年じゅう雨の多い森に、世界一長い虫や大きなカブトムシがすむ。

対案は世界最長のナナフシ (チャニナナフシ) に触れているが、当該種は GBIF の地域内 occurrence が 0 で未確保のため (`docs/zukan_stock_ledger.md` 1 章)、巻に登場しない種を blurb で約束することになる。第 1 案を推奨する。

## 5. 追加候補と差し替え予備

写真取得で落選が出た場合の補充順。全て使用可 181 種の中から選んだ。

1. Sympaestria acutelobata (Tettigoniidae)、Asiophlugis longiuncus (Tettigoniidae)、Lesina blanchardi (Tettigoniidae)。バッタ目の補充。
2. Marmessoidea rubescens、Marmessoidea quadriguttata、Dares verrucosus、Haaniella saussurei、Aretaon muscosus。ナナフシの補充。ボルネオ遠征 II の主力候補と競合するため、取りすぎないこと。
3. Hierodula dyaka、Hapalopeza tigrina、Deroplatys trigonodera、Astyliasula phyllopus。カマキリの補充。
4. Pyrops sidereus、Pyrops cultellata、Orientopsaltria padda、Dundubia rufivena。カメムシ目の補充。
5. Anthene lycaenina、Prosotas nora、Ypthima pandocus、Ionolyce helicon、Graphium evemon。チョウの補充。ただしこの 5 種はボルネオ遠征 II のチョウ枠の全部でもあるため、本巻へ回すと II のチョウが 0 になる。
6. Apis koschevnikovi (サバミツバチ)。1.1 の同属照合で除外した種。本編のニホンミツバチと学名は別種なので、和名の重複感が許容できるなら復帰できる。

## 6. 凍結時の残作業チェックリスト

`docs/komorebi_design.md` 13.2 の更新チェックリストを土台に、ボルネオ I 固有の項目を加えた。

1. 対カタログ重複判定の再実行。1 章のとおり 2026-08-12 の判定は当時の本編 1,213 種に対するもので、現行 bugs.js (本編 1,472 学名 + areaOnly 253) では結果が変わる。region モードの軽量スクリプト化 (`docs/zukan_stock_ledger.md` 3 章のフォローアップ) をここで消化するのが望ましい。
2. 命名。標準和名がある 18 種以外の 66 種について `docs/komorebi_naming_convention.md` に従い和名を確定する。本ドラフトの仮称の方向性は提案にとどめている。
3. 標本写真の取得。3 章の優先順で 82 種分。リードタイム最大の工程で、更新 3 の日程はこの工程で決まる。
4. bugs.js への areaOnly 登録。84 種を areaOnly komorebi、rarity は本ドラフトの確定値で登録する。AU I では rarity を一律 N の仮値で登録してから後で更新したため二度手間になった。ボルネオ I は最初から確定 rarity で入れる。
5. renderer と groupJa の確認。AU I ではチョウ 12 種が一律 groupJa ガ、renderer ga で登録され後から修正が必要になった。ボルネオ I の Lepidoptera 9 種はアゲハ 3 (Trogonoptera brookiana、Troides amphrysus、Graphium 2 種を含む)、タテハ 4 (Kallima sylvia、Junonia 3 種)、ガ 1 (Lyssa zampa) に分かれるため、登録時に指定する。
6. カタログカード生成。`zukan_config/zukan_catalog.js` へ 84 種の entry を append する。
7. volume manifest の差し替え。`komorebi/volumes/volume_fixture.js` の volume_fixture_borneo は合成 fixture (prefix kom_fixture_borneo) なので、実 84 種の species 配列、frozen true、denominator 84、flagship 指定へ置き換える。categories は更新 3 の 4 本 (kom_frac_flow / kom_kuku_inverse / kom_kuku_dan6 / kom_kuku_dan7)。
8. トロフィー結線。`komorebi/trophies.js` へ更新 3 の 4 カテゴリ分を追加する。看板 Trogonoptera brookiana を k10 側 1 本に割り当て、残り 3 本は SR 帯から個別指定する。割当表は `docs/komorebi_release_linkage.md` 3 章へ追記する。
9. validator 実行。重複、license、nameStatus、画像参照の 4 点。license は NHMUK の CC-BY 系と Naturalis の CC0 が混在する見込みで、metadata の mediaLicense を一括検査する。nameStatus は 84 種中 provisional が大半である点を凍結記録に残す。
10. 変態タイプ検査。収録 84 種の目は 10 目で、bugs.js の METAMORPHOSIS_BY_ORDER は 10 目すべてをカバーしている見込み。凍結時に再確認する。
11. 完走章重複検査。収録 84 種と本編および他 volume の学名 canonical と synonym の衝突が無いことを最終確認する。
12. sw.js の CACHE バンプ、CORE 追加、?v= バンプ。
13. 回帰 fixture 実行と commit 前 safety check。

## 7. レビューで確認したい事項

1. SSR 3 種目を Pyrops whiteheadi とする案 (2.2)。コスタリカ遠征 II の看板ビワハゴロモと科が重なる点をどう見るか。
2. Pulchriphyllium mannani を SR に留めた判断 (2.3)。本編のコノハムシとの重複感を許容して SSR に上げる選択肢もある。
3. Apis koschevnikovi (サバミツバチ) を同属照合で除外した判断 (1.1)。
4. 写真取得を 96 種前後まで広げる案 (3.2)。ボルネオ遠征 II の候補が 85 種前後まで縮む。追加 harvest の要否は `zukan_foundry/reports/volume2_rarity_frames.md` 3 章と合わせて判断したい。
5. 地域 blurb の第 1 案と対案 (4 章)。

## 承認記録

- 2026-08-18: user 承認。選抜 84 種と SSR3 構成は draft 通り (Pyrops whiteheadi の CR II 看板との同科懸念は認識の上で維持)。写真取得は本 draft の優先順リストで着手可。
- 2026-08-21: 発案者承認済みの写真不能 9 種差し替え。2026-08-21 の補完 fetch round (`zukan_foundry/rounds/2026-08-21/`) でも写真を確保できなかった 9 種を落選とし、5 章の予備から 9 種を補充して 84 種を維持した。落選 9 種は全て N だったため、補充 9 種も N 枠を引き継ぎ、配分は N 57 / R 17 / SR 7 / SSR 3 のまま変わらない。割当は各目の配分意図 (2.1 の表) に沿わせた。

  | 落選 (全て N) | 目 | 補充 (全て N) | 目 |
  |---|---|---|---|
  | Onthophagus cervicapra | Coleoptera | Pyrops sidereus | Hemiptera |
  | Proagoderus watanabei | Coleoptera | Pyrops cultellata | Hemiptera |
  | Catharsius renaudpauliani | Coleoptera | Hierodula dyaka | Mantodea |
  | Onthophagus rugicollis | Coleoptera | Hapalopeza tigrina | Mantodea |
  | Catharsius dayacus | Coleoptera | Deroplatys trigonodera | Mantodea |
  | Copris sinicus | Coleoptera | Dares verrucosus | Phasmida |
  | Diesbachia sophiae | Phasmida | Marmessoidea rubescens | Phasmida |
  | Salomona borneensis | Orthoptera | Sympaestria acutelobata | Orthoptera |
  | Cheumatopsyche globosa | Trichoptera | Lesina blanchardi | Orthoptera |

  目別の増減: Coleoptera 10→4 (使用可 21 種が全て糞虫で、museum 写真がラベル主体に集中して壊滅したため)、Hemiptera 11→13、Mantodea 9→12、Phasmida 8→9、Orthoptera 10→11、Trichoptera 3→2。糞虫の穴はボルネオらしさを担う Fulgoridae とカマキリ・ナナフシ (看板分類群) へ振り替えた。バトル属性 3 種は維持 (けいさん = 甲虫 4 種)。

  補充 9 種は命名提案書 (2026-08-18) の対象外だったため、標本写真を実見して命名規約 v0.1 で仮称を新規に付けた: Sympaestria acutelobata = コノハキリギリス、Dares verrucosus = イボナナフシ、Pyrops sidereus = ホシゾラビワハゴロモ、Pyrops cultellata = モエギビワハゴロモ、Hierodula dyaka = アメイロカマキリ、Hapalopeza tigrina = シマウデカマキリ、Deroplatys trigonodera = アミメカレハカマキリ、Lesina blanchardi = ヨロイキリギリス、Marmessoidea rubescens = オウギバネナナフシ (いずれも nameStatus provisional。既存 1849 + 新規 84 の全体で和名一意性を機械検証済み)。
