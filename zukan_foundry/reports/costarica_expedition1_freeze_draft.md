# コスタリカ遠征 I volume 凍結設計ドラフト

status: draft、user 承認待ち。コード・カタログへの反映は freeze 承認後。

作成日: 2026-08-17。対象: 更新 4 (`docs/komorebi_release_linkage.md` 2 章)。最終決定は発案者が行う。

## 0. 前提と入力

- 地域 seeds: `zukan_foundry/data/species_reserve/regions/costa_rica.enriched.jsonl` 301 件。国コード CR で harvest 済み。GBIF の Insecta occurrence が実測最上位 (10.5M) の地域で、供給力は 4 地域中で最も厚い。
- 本ドラフトの選抜は 84 種、レア度配分は `docs/komorebi_rarity_standard.md` の基準値どおり N 57 / R 17 / SR 7 / SSR 3 (看板 1 + 非看板 2)。
- 看板はハキリアリ (Atta cephalotes)。`docs/komorebi_release_linkage.md` 2 章の更新カレンダーで更新 4 の看板として確保済みと記載され、`docs/komorebi_regions.md` 7 章の対カタログ照合でも使用可と判定されている。seeds に実在を確認した (occurrence 2853、英名 Leaf-cutter ant、和名は未)。
- ビワハゴロモ (Fulgora laternaria、標準和名 ユカタンビワハゴロモ) は更新 8 のコスタリカ遠征 II の看板として予約済みのため、本巻には入れない。seeds に実在を確認済み (occurrence 95)。
- オーストラリア遠征 I ドラフト (`zukan_foundry/reports/au_expedition1_freeze_draft.md`) と同じ書式で書いた。AU I が写真実見に基づく選抜だったのに対し、本ドラフトの時点でコスタリカ種の標本写真は 1 枚も無い (3 章)。本書の選抜は写真取得の対象リストであり、写真実見後に落選が出る前提で読む。

## 1. seeds 前処理の監査 (2026-08-17 再実測)

| 工程 | 台帳の記録 | 2026-08-17 の再実測 | 判定 |
|---|---|---|---|
| 対カタログ重複判定 | 2026-08-12 実施。コスタリカ 296/301 使用可 | 本編重複 7 件、既存 volume 重複 0 件、使用可 294 件 | 再実施が望ましい。本編カタログが拡張されたため |
| 名前 enrichment | 未実施と記載 | 実施済み (`zukan_foundry/reports/name_enrichment_costa_rica.md`、2026-08-14)。standard 17 / english 71 / provisional 213、標準和名取得率 5.6% | 台帳の記述が古い。本工程は完了。ただし取得率は 4 地域で最低 |
| 種選抜 | 未実施 | 本ドラフトが該当 | 承認待ち |
| 標本写真 zukan-fetch | 未着手 | 301 種中 7 種にカードあり。うち使用可能な種は 1 種 (Bemisia tabaci) のみ | 最大の残作業 (3 章) |
| volume freeze | 未実施 | 本ドラフト承認後 | |

### 1.1 本編カタログとの重複 7 件 (選抜対象外)

| seed 学名 | 本編 id | 本編和名 |
|---|---|---|
| Apis mellifera | seiyou_mitsubachi | セイヨウミツバチ |
| Eciton burchellii | guntai_ari | グンタイアリ |
| Megaloprepus caerulatus | master_habiro_itotombo | ハビロイトトンボ |
| Hermetia illucens | ame_ika_abu | アメリカミズアブ |
| Paraponera clavata | sashihari_ari | サシハリアリ |
| Maruca vitrata | mame_nomeiga | マメノメイガ |
| Pantala flavescens | usubaki_tonbo | ウスバキトンボ |

重複が 7 件と少ないのは、コスタリカ産の多くが日本と縁のない中南米固有の系統で、本編との共通種が汎存種に限られるためである。他の 3 地域より歩留まりがよい。

グンタイアリとサシハリアリが既に本編にあるため、コスタリカの「有名アリ」の第一想起はハキリアリを残して使用済みである。看板をハキリアリに置く更新カレンダーの判断はこの点で妥当である。

### 1.2 名前の状態と命名の残作業

選抜 84 種の nameStatus は standard 8 / english_common_candidate 39 / provisional 37。標準和名がある 8 種以外は命名が未であり、命名は `docs/komorebi_naming_convention.md` に従う別工程で行う。本ドラフトでは学名を主キーとして扱い、和名は標準和名がある場合のみ記載する。SSR と SR の 10 種については読み手の判断材料として仮称の方向性だけ添えるが、これは提案であって確定ではない。

標準和名がある 8 種は Morpho helenor (ヘレノールモルフォ)、Tropidacris cristata (シタベニオオバッタ)、Siproeta stelenes (ミドリタテハ)、Dryas iulia (チャイロドクチョウ)、Ascalapha odorata (オドラジゴクオオヤガ)、Ancognatha vulgaris (ブルガリスエボシコガネカブト)、Anartia jatrophae (ウスベニタテハ)、Urbanus proteus (オナガセセリ)。

### 1.3 seeds の質に関する注意

- 種小名が spec の学名が 8 件ある (Edessa spec、Bombus spec、Diabrotica spec、Thesprotiella spec、Pseudacanthops spec、Ocyptamus spec、Stagmomantis spec、Philipotabanus spec)。いずれも実在する学名だが読み手には属レベルの未同定に見えるため、本ドラフトでは選抜対象から外した。
- Diptera 29 種のうち 10 種が Megaselia 属 (Phoridae、体長 2mm 前後のノミバエ) である。図鑑カードとして成立しにくいため、本巻の Diptera は 5 種に抑え、ハナアブ科とミズアブ科とアブ科から採った。
- Trichoptera 30 種はいずれも体長 10mm 前後の地味なトビケラで、Leptonema、Smicridea、Chimarra が大半を占める。本巻は 4 種に抑えた。
- Coleoptera 30 種のうち 21 種が糞虫 (Scarabaeidae)。プラチナコガネ (Chrysina) やヘラクレス (Dynastes) といったコスタリカの看板甲虫は本編に収録済みで、そもそも頻度順 harvest では拾えていない。5 章で追加 harvest を提案する。

## 2. 収録 84 種の選抜案 (使用可 294 種から)

### 2.1 目 (order) 別の配分

| 目 | 使用可 | 本巻 | 遠征 II 以降へ残す | 備考 |
|---|---:|---:|---:|---|
| Lepidoptera (チョウ ガ) | 29 | 12 | 17 | 中南米の主役。モルフォ、フクロウチョウ、ドクチョウが揃う |
| Hymenoptera (ハチ アリ) | 27 | 10 | 17 | 看板のハキリアリを含む。ランのハチと社会性カリバチが厚い |
| Orthoptera (バッタ キリギリス) | 30 | 10 | 20 | ツノキリギリス類が多く形が面白い |
| Odonata (トンボ) | 28 | 10 | 18 | ヘリコプターダムセルフライを含む |
| Mantodea (カマキリ) | 30 | 9 | 21 | 葉擬態と枯葉擬態が揃う |
| Hemiptera (カメムシ セミ) | 31 | 9 | 22 | ヨコバイ科が 15 種と多い。看板予約のビワハゴロモは II へ |
| Coleoptera (甲虫) | 30 | 9 | 21 | 21 種が糞虫。5 章の弱点 |
| Phasmida (ナナフシ) | 30 | 6 | 24 | コケ擬態のナナフシが目玉 |
| Diptera (ハエ カ) | 29 | 5 | 24 | Megaselia 属 10 種を除くと選択肢は限られる |
| Trichoptera (トビケラ) | 30 | 4 | 26 | |
| 計 | 294 | 84 | 210 | |

バトル属性の見込みは かんじ (チョウ) 12 / けいさん (甲虫) 9 / えいご (他) 63。マダガスカル遠征 I の 22/4/58 と比べ けいさん が改善する。3 属性は確保できている。

### 2.2 SSR 3 種

| # | 学名 | 和名 | 科 | 名前の状態 | 選定理由 |
|---|---|---|---|---|---|
| 1 | Atta cephalotes | (命名未。ハキリアリ相当) | Formicidae | english_common_candidate | 看板。葉を切り出して運ぶ行列と地下の菌園という生態が、説明なしで絵になる。中米の昆虫として知名度が最も高い。更新カレンダーの予約どおり |
| 2 | Morpho helenor | ヘレノールモルフォ | Nymphalidae | standard | 金属光沢の青い大型タテハ。子どもへの訴求という一点では本巻で最強で、標準和名も既にある。occurrence 2310 で写真確保の見込みも高い |
| 3 | Tropidacris cristata | シタベニオオバッタ | Romaleidae | standard | 体長 12cm を超える巨大バッタで、飛ぶと後翅の深紅が開く。大きさの物語性と色の意外性を同時に持ち、標準和名もある |

看板と目を散らす条件は満たしている (ハチ、チョウ、バッタ)。マダガスカル遠征 I とオーストラリア遠征 I も SSR 3 種を 3 つの目に散らしている。

Morpho helenor については確認が 1 点ある。本編カタログにモルフォチョウの属 entry (Morpho spp) とオオルリモルフォ (Morpho menelaus) が収録済みで、`docs/komorebi_regions.md` 7 章はモルフォを看板不可としつつ「同属別種 (ヘレナモルフォ等) の差し替えは要検討」と書いている。本種はその「ヘレナモルフォ」に相当する。看板ではなく非看板 SSR に置く形なら 7 章の禁止には触れないが、重複感を許容するかは判断が要る。許容できない場合の次点は Copiphora rhinoceros (2.3 の SR) を SSR に上げ、Morpho helenor を SR に下げる入れ替えとする。

### 2.3 SR 7 種

| # | 学名 | 和名 | 科 | 名前の状態 | 選定理由 |
|---|---|---|---|---|---|
| 1 | Caligo atreus | (命名未) | Nymphalidae | english_common_candidate | 後翅裏に巨大な眼状紋を持つフクロウチョウ。翅の表は紫と橙の帯。本編にフクロウチョウ (Caligo memnon) があり同属のため SSR には上げず SR とした |
| 2 | Choeradodis rhombicollis | (命名未) | Mantidae | english_common_candidate | 胸部が木の葉状に大きく張り出すカマキリ。輪郭が唯一無二で thumb でも判別できる。コスタリカ産カマキリ 30 種の頂点 |
| 3 | Mecistogaster ornata | (命名未) | Coenagrionidae | english_common_candidate | 翅端に色帯を持つ超大型イトトンボ。クモの巣からクモを摘み取る生態が話になる。本編のハビロイトトンボと近縁のため SSR には上げない |
| 4 | Copiphora rhinoceros | (命名未) | Tettigoniidae | english_common_candidate | 頭部に前向きの角を持つキリギリス。緑色の体に角という組み合わせが強く、英名 Rhinoceros Katydid が説明の足がかりになる |
| 5 | Umbonia crassicornis | (命名未) | Membracidae | provisional | 背に棘状の突起を持つツノゼミ。植物の棘に擬態する生態的スペクタクル。occurrence 1060 で写真確保の見込みが高い |
| 6 | Eacles imperialis | (命名未) | Saturniidae | english_common_candidate | 開張 15cm 級のヤママユガ。黄色地に紫褐色の斑という配色で、大型ガの枠を担う |
| 7 | Trychopeplus laciniatus | (命名未) | Diapheromeridae | english_common_candidate | 全身がコケに覆われたように見えるナナフシ。擬態の完成度が高く、コスタリカ雲霧林の象徴になる。occurrence 31 と少なく写真確保は難度が高い |

SR は 7 種で、更新 4 に投入するカテゴリ 4 本 (kom_kuku_bridge / kom_equation_select / kom_kuku_dan8 / kom_kuku_dan9) を上回っており、トロフィー代表虫の予備として足りる。

### 2.4 R 17 種

| # | 学名 | 和名 | 科 | 名前の状態 | occurrence |
|---|---|---|---|---|---:|
| 1 | Anartia fatima | (命名未) | Nymphalidae | english_common_candidate | 4574 |
| 2 | Siproeta stelenes | ミドリタテハ | Nymphalidae | standard | 1815 |
| 3 | Dryas iulia | チャイロドクチョウ | Nymphalidae | standard | 1714 |
| 4 | Ascalapha odorata | オドラジゴクオオヤガ | Erebidae | standard | 1472 |
| 5 | Heliconius hecale | (命名未) | Nymphalidae | english_common_candidate | 1086 |
| 6 | Automeris zugana | (命名未) | Saturniidae | provisional | 1089 |
| 7 | Euglossa imperialis | (命名未) | Apidae | english_common_candidate | 6432 |
| 8 | Camponotus sericeiventris | (命名未) | Formicidae | english_common_candidate | 1898 |
| 9 | Synoeca septentrionalis | (命名未) | Vespidae | english_common_candidate | 1520 |
| 10 | Apoica pallens | (命名未) | Vespidae | english_common_candidate | 1490 |
| 11 | Pseudoxycheila tarsalis | (命名未) | Carabidae | english_common_candidate | 1460 |
| 12 | Ancognatha vulgaris | ブルガリスエボシコガネカブト | Scarabaeidae | standard | 1438 |
| 13 | Hetaerina titia | (命名未) | Calopterygidae | english_common_candidate | 431 |
| 14 | Libellula herculea | (命名未) | Libellulidae | english_common_candidate | 348 |
| 15 | Pseudovates chlorophaea | (命名未) | Mantidae | english_common_candidate | 39 |
| 16 | Acanthops godmani | (命名未) | Acanthopidae | provisional | 25 |
| 17 | Lirometopum coronatum | (命名未) | Tettigoniidae | english_common_candidate | 155 |

R 帯の選定理由 (各 2 行)。

- Anartia fatima。黒地に白帯と橙紋というはっきりした模様で、コスタリカ seeds のチョウで occurrence 最大 (4574)。写真確保が最も堅い R 候補。
- Siproeta stelenes。黒地に淡緑の広い斑が入り、標準和名ミドリタテハがある。命名工程を省ける数少ない種。
- Dryas iulia。細長い翅全体が橙一色という潔い配色。標準和名チャイロドクチョウがあり、ドクチョウ類の代表として置ける。
- Ascalapha odorata。開張 15cm を超える大型ヤガで、中南米で最も名の通ったガ。標準和名オドラジゴクオオヤガがある。
- Heliconius hecale。黒地に橙と黄の帯というドクチョウ類の警告色。擬態環 (ミュラー型擬態) の説明素材として価値がある。
- Automeris zugana。後翅に大きな眼状紋を持つヤママユガ。驚かせると眼状紋を見せる行動が話になる。命名は未。
- Euglossa imperialis。金属光沢の緑に輝くランのハチで、コスタリカ seeds のハチで occurrence 最大 (6432)。ランの香りを集める生態が独特。
- Camponotus sericeiventris。腹部が金色の絹のような毛で覆われる大型オオアリ。アリの中では見た目の華やかさが突出している。
- Synoeca septentrionalis。巣を叩いて集団で威嚇音を出すカリバチ。生態的スペクタクルは SR 級だが、体そのものの色は黒藍一色のため R とした。
- Apoica pallens。夜に活動する珍しいカリバチで、巣に整列してぶら下がる姿が絵になる。淡黄色の体色も他のカリバチと差別化できる。
- Pseudoxycheila tarsalis。金属光沢の緑と黄斑を持つハンミョウ。甲虫 9 種の中で糞虫でない数少ない選択肢のひとつ。
- Ancognatha vulgaris。標準和名ブルガリスエボシコガネカブトを持つコガネムシ。命名工程を省けるうえ、和名に「カブト」が入り子どもに届く。
- Hetaerina titia。翅の付け根が赤く染まるカワトンボ。トンボ 10 種の中で色の主張が最も強い。
- Libellula herculea。腹部が銀白色になる大型トンボ。属名と英名の hercules と Silver-sided が語りになる。
- Pseudovates chlorophaea。頭部に角状の突起を持つカマキリ。Choeradodis に次ぐ形の面白さだが occurrence 39 と少なく写真確保は難しい。
- Acanthops godmani。翅を丸めて枯葉になりきるカマキリ。擬態の質は高いが occurrence 25 と少なく、写真が取れなければ 5 章の代替へ回す。
- Lirometopum coronatum。頭部が冠状に張り出すキリギリス。英名 Pitbull katydid が示すとおり顎が発達しており、形で押せる。

### 2.5 N 57 種

Lepidoptera (3)

| 学名 | 和名 | 科 | 名前の状態 |
|---|---|---|---|
| Anartia jatrophae | ウスベニタテハ | Nymphalidae | standard |
| Urbanus proteus | オナガセセリ | Hesperiidae | standard |
| Astraptes fulgerator | (命名未) | Hesperiidae | english_common_candidate |

Hymenoptera (5)

| 学名 | 科 | 名前の状態 | occurrence |
|---|---|---|---:|
| Wasmannia auropunctata | Formicidae | english_common_candidate | 4253 |
| Trigona fulviventris | Apidae | english_common_candidate | 2010 |
| Ectatomma ruidum | Formicidae | provisional | 1861 |
| Bombus ephippiatus | Apidae | english_common_candidate | 1716 |
| Polistes instabilis | Eumenidae | english_common_candidate | 1477 |

Orthoptera (7)

| 学名 | 科 | 名前の状態 | occurrence |
|---|---|---|---:|
| Abracris flavolineata | Acrididae | provisional | 1830 |
| Neoconocephalus triops | Tettigoniidae | english_common_candidate | 466 |
| Mimetica incisa | Tettigoniidae | provisional | 303 |
| Chromacris trogon | Romaleidae | provisional | 276 |
| Copiphora cultricornis | Tettigoniidae | english_common_candidate | 261 |
| Philophyllia guttulata | Tettigoniidae | provisional | 200 |
| Pycnopalpa bicordata | Tettigoniidae | provisional | 187 |

Hemiptera (8)

| 学名 | 科 | 名前の状態 | occurrence |
|---|---|---|---:|
| Hortensia similis | Cicadellidae | english_common_candidate | 2249 |
| Chlorogonalia coeruleovittata | Cicadellidae | provisional | 1405 |
| Mahanarva costaricensis | Cercopidae | provisional | 1123 |
| Prosapia simulans | Cercopidae | provisional | 839 |
| Orsilochides variabilis | Scutelleridae | provisional | 764 |
| Augocoris gomesii | Scutelleridae | provisional | 754 |
| Dysdercus bimaculatus | Pyrrhocoridae | english_common_candidate | 732 |
| Graphocephala albomaculata | Cicadellidae | provisional | 682 |

Coleoptera (7)

| 学名 | 科 | 名前の状態 | occurrence |
|---|---|---|---:|
| Canthidium aurifex | Scarabaeidae | provisional | 3646 |
| Cyclocephala lunulata | Scarabaeidae | provisional | 3370 |
| Copris lugubris | Scarabaeidae | provisional | 2702 |
| Cephaloleia belti | Chrysomelidae | provisional | 2586 |
| Dichotomius satanas | Scarabaeidae | provisional | 2570 |
| Chelobasis perplexa | Chrysomelidae | provisional | 1633 |
| Eurysternus caribaeus | Scarabaeidae | provisional | 1379 |

Odonata (7)

| 学名 | 科 | 名前の状態 | occurrence |
|---|---|---|---:|
| Orthemis discolor | Libellulidae | english_common_candidate | 790 |
| Erythrodiplax funerea | Libellulidae | english_common_candidate | 760 |
| Hetaerina occisa | Calopterygidae | english_common_candidate | 453 |
| Erythemis peruviana | Libellulidae | english_common_candidate | 188 |
| Gynacantha nervosa | Aeshnidae | english_common_candidate | 180 |
| Argia oenea | Coenagrionidae | english_common_candidate | 173 |
| Mecistogaster modesta | Coenagrionidae | provisional | 169 |

Mantodea (6)

| 学名 | 科 | 名前の状態 | occurrence |
|---|---|---|---:|
| Vates pectinicornis | Mantidae | provisional | 181 |
| Liturgusa maya | Liturgusidae | english_common_candidate | 88 |
| Stagmomantis carolina | Mantidae | english_common_candidate | 76 |
| Macromantis hyalina | Photinaidae | provisional | 39 |
| Stagmatoptera biocellata | Mantidae | provisional | 22 |
| Tithrone roseipennis | Acanthopidae | provisional | 8 |

Phasmida (5)

| 学名 | 科 | 名前の状態 | occurrence |
|---|---|---|---:|
| Pseudophasma unicolor | Pseudophasmatidae | provisional | 220 |
| Oncotophasma martini | Diapheromeridae | provisional | 89 |
| Prisopus biolleyi | Prisopodidae | provisional | 79 |
| Metriophasma diocles | Pseudophasmatidae | english_common_candidate | 35 |
| Pterinoxylus speciosus | Phasmatidae | provisional | 15 |

Diptera (5)

| 学名 | 科 | 名前の状態 | occurrence |
|---|---|---|---:|
| Ornidia obesa | Syrphidae | english_common_candidate | 2668 |
| Sargus fasciatus | Stratiomyidae | provisional | 1729 |
| Cochliomyia macellaria | Calliphoridae | english_common_candidate | 1661 |
| Scione maculipennis | Tabanidae | provisional | 1124 |
| Palpada agrorum | Syrphidae | english_common_candidate | 1081 |

Trichoptera (4)

| 学名 | 科 | 名前の状態 | occurrence |
|---|---|---|---:|
| Atopsyche majada | Hydrobiosidae | provisional | 1136 |
| Leptonema albovirens | Hydropsychidae | provisional | 1130 |
| Helicopsyche incisa | Helicopsychidae | provisional | 283 |
| Nectopsyche punctata | Leptoceridae | provisional | 261 |

N の合計は Lepidoptera 3 + Hymenoptera 5 + Orthoptera 7 + Hemiptera 8 + Coleoptera 7 + Odonata 7 + Mantodea 6 + Phasmida 5 + Diptera 5 + Trichoptera 4 = 57 種。

Tithrone roseipennis (occurrence 8) と Stagmatoptera biocellata (22) は写真確保の見込みが薄い。落選した場合は 5 章の予備から補充する。

## 3. 標本写真の取得状況と優先順リスト

コスタリカ seeds 301 種のうち `zukan_cards/metadata/` にカードがあるのは 7 種で、そのうち 6 種は本編重複のため選抜対象外である。残る 1 種 (Bemisia tabaci、タバココナジラミ) は本ドラフトの 84 種に含めていない。したがって本巻の 84 種は全種が写真未取得である。

`docs/zukan_stock_ledger.md` の「must-have 看板 ... ハキリアリ 在庫済み」という記述は seeds に speciesKey があるという意味であり、標本写真の確保を意味しない。看板の Atta cephalotes も現時点で写真は未取得である。

### 3.1 優先順

第 1 波 (看板と SSR。ここが通らなければ巻が立たない)

1. Atta cephalotes (看板)
2. Morpho helenor
3. Tropidacris cristata

第 2 波 (SR 7 種。トロフィー代表虫の候補になるため看板の次に確実にしたい)

4. Caligo atreus
5. Choeradodis rhombicollis
6. Copiphora rhinoceros
7. Umbonia crassicornis
8. Eacles imperialis
9. Mecistogaster ornata
10. Trychopeplus laciniatus

第 3 波 (R 17 種。occurrence 降順)

11. Euglossa imperialis
12. Anartia fatima
13. Camponotus sericeiventris
14. Siproeta stelenes
15. Dryas iulia
16. Synoeca septentrionalis
17. Apoica pallens
18. Ascalapha odorata
19. Pseudoxycheila tarsalis
20. Ancognatha vulgaris
21. Automeris zugana
22. Heliconius hecale
23. Hetaerina titia
24. Libellula herculea
25. Lirometopum coronatum
26. Pseudovates chlorophaea
27. Acanthops godmani

第 4 波 (N 57 種。occurrence 降順でよい)

28 以降。Wasmannia auropunctata、Canthidium aurifex、Cyclocephala lunulata、Copris lugubris、Ornidia obesa、Cephaloleia belti、Dichotomius satanas、Hortensia similis、Trigona fulviventris、Ectatomma ruidum 以下。

### 3.2 取得数の見積り

オーストラリア遠征 I の落選率 13% を当てはめると、84 種を確定させるには 96 種前後の写真取得が要る。使用可 294 種のプールに対して 96 種は 33% であり、コスタリカ遠征 II と III (各 84 種) を出しても余裕がある。ボルネオと違い在庫制約は無い。

### 3.3 tier の見込み

コスタリカは GBIF の occurrence 密度が実測最上位で、iNat の市民科学記録も厚い (`docs/komorebi_regions.md` 2 章)。したがって museum tier が薄い分類群でも iNat CC0 fallback で拾える見込みが 4 地域で最も高い。ただし iNat の生態写真は背景が複雑で BiRefNet の切り抜き難度が上がるため、L2 生成の失敗率は museum 標本より高くなる。取得数の見積りは 3.2 の 96 種より多めに、100 種程度を見ておくのが安全である。

Smithsonian (USNM) は中米標本の被覆が厚く、museum tier の第一候補になる。マダガスカルやオーストラリアで多用した Australian Museum と Naturalis の寄与は小さい。

## 4. 地域 blurb

マダガスカル遠征 I とオーストラリア遠征 I の三段構成 (位置、日本との大きさ比較、自然の特徴) に合わせた案。

> 中央アメリカの小さな国。日本の 7 分の 1。海と山と雲の森がぎゅっとつまっている。

固有性を一言足す対案。

> 中央アメリカの小さな国。日本の 7 分の 1。せまい国土に、地球の虫の 4% がくらす。

対案の数値は生物多様性の紹介でよく使われる概数だが、出典を確認していないため第 1 案を推奨する。

## 5. 追加候補と追加 harvest の提案

### 5.1 差し替え予備 (使用可 294 種の中から)

1. Heliconius charithonia、Eueides isabella 相当のドクチョウ類。本 seeds には Heliconius hecale 以外のドクチョウが乏しいため、追加 harvest で補うのが望ましい。
2. Stagmomantis theophila、Stagmomantis heterogamia、Antemna rapax、Tauromantis championi。カマキリの補充。
3. Copiphora hastata、Ischnomela pulchripennis、Moncheca elegans、Balboana tibialis。キリギリスの補充。
4. Edessa 属を除く Pentatomidae と Scutelleridae。カメムシの補充。
5. Palpada aemula、Ocyptamus 属を除く Syrphidae。ハエの補充。

### 5.2 追加 harvest の提案 (甲虫の弱点解消)

コスタリカ seeds の Coleoptera 30 種のうち 21 種が糞虫で、中南米の看板甲虫が 1 種も入っていない。頻度順 harvest の構造的な弱点である。`docs/komorebi_regions.md` 6 章の must-have 指名シード層を使い、次を speciesKey 指定で追加取得することを提案する。

- Golofa 属 (ゴロファ。長い角を持つカブトムシ。本編未収録)
- Phanaeus 属 (ニジイロフンコロガシ。糞虫だが金属光沢が鮮烈で、既存の地味な糞虫 21 種と対極)
- Chrysochroa 相当の中南米タマムシ類 (Euchroma gigantea など)
- Acrocinus longimanus (アカスジオオカミキリ。前脚が極端に長い大型カミキリ)

これらは本巻に間に合わなくても、コスタリカ遠征 II と III の甲虫枠を救う。同じ弱点はボルネオにもあり (`zukan_foundry/reports/borneo_expedition1_freeze_draft.md` 2.1)、`zukan_foundry/reports/volume2_rarity_frames.md` 4 章で地域横断の追加 harvest としてまとめている。

## 6. 凍結時の残作業チェックリスト

1. 対カタログ重複判定の再実行。1 章のとおり 2026-08-12 の判定は当時の本編 1,213 種に対するもので、現行 bugs.js では結果が変わる。region モードの軽量スクリプト化 (`docs/zukan_stock_ledger.md` 3 章のフォローアップ) をここで消化するのが望ましい。
2. 命名。標準和名がある 8 種以外の 76 種について `docs/komorebi_naming_convention.md` に従い和名を確定する。4 地域で最も命名負荷が大きい巻になる。
3. 標本写真の取得。3 章の優先順で 84 種分、余裕を見て 100 種分。
4. bugs.js への areaOnly 登録。84 種を areaOnly komorebi、rarity は本ドラフトの確定値で登録する。
5. renderer と groupJa の確認。Lepidoptera 12 種はタテハ 7 (Morpho helenor、Caligo atreus、Heliconius hecale、Siproeta stelenes、Anartia fatima、Anartia jatrophae、Dryas iulia)、ガ 3 (Ascalapha odorata、Eacles imperialis、Automeris zugana)、セセリ 2 (Urbanus proteus、Astraptes fulgerator) に分かれる。AU I で発生した一律ガ登録の手戻りを繰り返さないため、登録時に指定する。
6. カタログカード生成。`zukan_config/zukan_catalog.js` へ 84 種の entry を append する。
7. volume manifest の差し替え。`komorebi/volumes/volume_fixture.js` の volume_fixture_costa_rica は合成 fixture なので、実 84 種の species 配列、frozen true、denominator 84、flagship 指定へ置き換える。categories は更新 4 の 4 本 (kom_kuku_bridge / kom_equation_select / kom_kuku_dan8 / kom_kuku_dan9)。
8. トロフィー結線。`komorebi/trophies.js` へ更新 4 の 4 カテゴリ分を追加する。看板 Atta cephalotes を k10 側 1 本に割り当て、残り 3 本は SR 帯から個別指定する。割当表は `docs/komorebi_release_linkage.md` 3 章へ追記する。
9. validator 実行。重複、license、nameStatus、画像参照の 4 点。iNat 由来が増える見込みのため mediaLicense の CC0 と CC-BY 系の混在を一括検査する。nameStatus は 84 種中 provisional と english_common_candidate が大半である点を凍結記録に残す。
10. 変態タイプ検査。収録 84 種の目は 10 目。
11. 完走章重複検査。収録 84 種と本編および他 volume の学名 canonical と synonym の衝突が無いことを最終確認する。特にビワハゴロモ (コスタリカ遠征 II の看板予約) を本巻へ混入させていないことを確認する。
12. sw.js の CACHE バンプ、CORE 追加、?v= バンプ。
13. 回帰 fixture 実行と commit 前 safety check。

## 7. レビューで確認したい事項

1. Morpho helenor を非看板 SSR に置く案 (2.2)。本編のモルフォ属 entry との重複感を許容するか。
2. Caligo atreus を SR に留めた判断 (2.3)。本編のフクロウチョウ (Caligo memnon) と同属である点をどう見るか。
3. Mecistogaster ornata を SR に置いた判断 (2.3)。本編のハビロイトトンボ (Megaloprepus caerulatus) と近縁である点。
4. 種小名が spec の 8 件を除外した判断 (1.3)。
5. 甲虫の追加 harvest 提案 (5.2)。本巻に間に合わせるか、遠征 II 以降に回すか。
6. 地域 blurb の第 1 案と対案 (4 章)。
