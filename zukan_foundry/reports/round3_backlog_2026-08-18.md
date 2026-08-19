# round1-3 の積み残し課題と komorebi 残 release の準備状況 (2026-08-18)

status: 記録のみ。コード、`zukan_config/zukan_catalog.js`、`shared/bugs.js`、volume manifest のいずれにも変更を加えていない。

作成日: 2026-08-18。対象は 2026-08-18 に実行した fetch round 1 から 3 と、それに付随する検品レポート・freeze draft 群が残した課題。

計測方針。本レポートの件数は、branch `claude/komorebi-tools` の作業ツリーに実在するファイルを走査した実測値である。具体的には `zukan_cards/metadata/*.json` (1501 件) を読み、`files.display` が指す `zukan_cards/processed/*_L2_grade.webp` の実在を確認したうえで、species_id または学名 (属 + 種小名) で選抜リストと突き合わせた。freeze draft や検品レポートの記載は根拠の参照にのみ使い、充足数の算出には使っていない。したがって draft の数字と食い違う箇所がいくつかあり、その差分は本文で明示する。

入力にした本日の成果物。

- `zukan_foundry/reports/card_image_inspection_2026-08-18.md` (公開中 168 種の検品、6 章に対応記録)
- `zukan_foundry/reports/card_image_inspection_round123_2026-08-18.md` (round1-3 の新規取得 179 種の検品)
- `zukan_foundry/reports/borneo_expedition1_freeze_draft.md`、`costarica_expedition1_freeze_draft.md`、`au_expedition2_freeze_draft.md`、`mg_expedition2_freeze_draft.md`
- `zukan_foundry/reports/volume2_rarity_frames.md`、`borneo_costarica_naming_proposal_2026-08-18.md`、`au_expedition1_guild_backfill_review.md`
- `zukan_foundry/rounds/2026-08-18/` の `run.log`、`batch_113033.log`、`batch_165736.log`、`batch_192205.log`、`manifest.md`
- `zukan_foundry/rounds/2026-08-18_r2/` の `run.log`、`repair.log`、`manifest.md`

round のログから読める実数を先に置く。

| round | ログ | 対象 | ok | quality gate reject | 失敗 |
|---|---|---:|---:|---:|---|
| round1 (AU 再取得 + ボルネオ + マダガスカル) | `2026-08-18/batch_113033.log` | 140 | 86 | source reject 3 / gate failure 0 | no tier matched 54 |
| round2 (コスタリカ I) | `2026-08-18/batch_165736.log` | 84 | 78 | source reject 3 / gate failure 0 | no tier matched 6 |
| round3 (補修 3 波) | `2026-08-18/batch_192205.log` | 62 | 46 | source reject 10 / gate failure 5 | no tier matched 10、PermissionError 1 |

round3 の `refetch_kept_previous` は 10 件で、うち 5 件は quality gate で新 source が全て落ちたため旧カードが残った (`neolethaeus_australiensis`、`haneashi_ito_tonbo`、`ageha_himebachi`、`oomizuao_oki`、`sekai_saichou_nanafushi`)。

## 1. 次 fetch round に持ち越す課題

### 1.1 ameiro_tonbo のラベル写り込み

`ameiro_tonbo` (アメイロトンボ、Tholymis tillarga、USNM、USNMENT00326267) は公開中のマダガスカル遠征 I に rarity N で収録されている。`zukan_cards/processed/USNMENT00326267_L2_grade.webp` を 512 角で開くと、翅の中央から上部にかけて採集ラベルのタイプ文字が前景として残っており、`sh a` と `rd R. Wimme` が読める。metadata の `specimen.recordedBy` は H. Wimmer で、背景除去の際に標本の直後にあるラベル文字が前景側へ取り込まれたものと読める。

処置は 2 通り。第一に `processing.cropBox` (現在 [1198, 281, 1693, 977]) を標本側へ寄せ、ラベル文字が入らない範囲で再生成する。翅端まで含めると文字が必ず入る構図なので、この方法では翅の一部を切る妥協が要る。第二に同種の別 accession を USNM または iNat から取り直す。公開中カードであり、更新 1 の利用者が現に見ている画像なので、本項の優先度は本章で最も高い。

### 1.2 検品で非 OK と判定された 63 件のうち再取得で改善しうるもの

`card_image_inspection_round123_2026-08-18.md` 3 章の 63 件を、欠陥の型で分類した。推奨処置の内訳は差し替え必須 31、差し替え推奨 30、同定確認要 2。

| 型 | 件数 | 再取得での改善見込み | 次 round での指定 |
|---|---:|---|---|
| ラベル主体 (標本の断片が端に見える構図) | 19 | 高い | 同一機関の別 accession を指名。RMNH と NHMUK と USNM に集中しているため、機関単位で別個体を引く |
| 非写真 (歴史図版、彩色イラスト、線画) | 16 | 中 | WMC tier をスキップし museum tier または iNat CC0 を明示指定する。同一 tier の再検索では同じ図版に戻る |
| 多個体・合成 (2 個体、群れ、捕食、複数ステージ) | 11 | 中 | 別 accession の単一個体標本を指名。iNat 側は単独個体の写真に絞る条件が要る |
| 画質・構図 (ぼやけ、極端なクローズアップ、破損標本) | 7 | 高い | occurrence 上位の別個体で引き直せば解決する見込みが高い |
| その他 (幼虫 3、別種の疑い 3、巣板、脱皮殻ほか) | 10 | 個別 | 幼虫 3 件 (`hierodula_majuscula`、`phricta_spinosa`、`zanna_tenebrosa`) は lifeStage=Adult を条件に付ける。別種の疑い 3 件 (`pycanum_alternatum`、`metriophasma_diocles`、`lirometopum_coronatum`) は同定確認が先 |

改善見込みが高い 26 件 (ラベル主体 19 + 画質・構図 7) を次 round の第 1 波に置き、tier 切り替えが前提になる 16 件を第 2 波に回すのが順当である。

この 63 件に加えて、本日は取り直していないが `card_image_inspection_2026-08-18.md` 2 章 (未公開 257 件) で非 OK と判定され、かつ更新 3 から 6 の選抜に入っている 11 種がある。次 round の対象から漏れやすいので併記する。オーストラリア遠征 II の 4 種 (podacanthus_typhon、tettigarcta_tomentosa、tropidoderus_rhodomus、thopha_saccata)、マダガスカル遠征 II 案 A の 5 種 (achrioptera_magnifica、yanga_guttulata、canthydrus_guttula、amberana_marginata、anopheles_gambiae)、ボルネオ遠征 I の 2 種 (oecophylla_smaragdina、bactrocera_musae) である。いずれも欠陥の型は上表と同じで、イラストと図版が 5 件、画質不良が 3 件、複数物体の散在が 2 件、別種の疑いが 1 件。

### 1.3 再 fetch が同一の不良 source に再収束した 4 件

`card_image_inspection_round123_2026-08-18.md` 4 章の差し戻し推奨 6 件のうち、実測で live に display 実体が無いのは次の 4 件である。metadata は復元されているが、`files.display` が指す webp が存在しない。

| species_id | 学名 | 現状 | 必要な指定 |
|---|---|---|---|
| akamadara_hanamuguri | Anthracophora rusticola | 再 fetch が旧版と完全に同一の Georgiy Jacobson 図版 (甲虫 30 種混在) に再収束 | WMC を外し museum tier または iNat を明示 |
| hiroobi_midorishijimi | Favonius cognatus | 同上。Favonius 系統比較図版 (蝶 24 種混在) に再収束 | 同上 |
| oohikage_janome | Ninguta schrenckii | 同上。Rhopalocera Nihonica 図版 (蝶 28 種混在) に再収束 | 同上 |
| yamato_batta | Epacromius japonicus | 再取得結果が無関係な昆虫 6 種の 2x3 グリッド合成画像。復元しても不合格 | source discovery のクエリごと見直し |

この 4 件はいずれも `card_image_inspection_2026-08-18.md` 6.5 章が特定した「WMC の非 ASCII File 名がローカル basename 生成で脱落し、複数種が同一 basename に衝突していた」群と重なる。同じ basename を引く限り再 fetch は同じ結果に収束するため、tier の明示指定なしに再実行しても解決しない。

残り 2 件 (`akamarubane_monki_tateha`、`hagata_murasaki`) は display 実体が live にあるが、内容は Seitz Fauna Africana 原著の複合プレートのままで、単一個体写真という基準を満たしていない。同じ扱いで tier を切り替える対象に含める。

### 1.4 accession 衝突で復元先が一意に決まらない 2 件

round3 の archive 退避バグで退避された metadata のうち、live に戻っていないのは 2 ファイル (`WIKIPEDIAWP_397da139.json`、`WMCFileOnthophagusPrintIconographiaZoologicaSpecialCollectionsUniversityofAmsterdamUBAINV0274001050014tif.json`) である。

`WIKIPEDIAWP_397da139` は `tokara_nokogiri_kuwagata` (Prosopocoilus dissimilis elegans) と `yakushima_noko_kuwagata` (Prosopocoilus inclinatus yakushimaensis) の両方が同じ accession を持っており、archive 側に実体が 1 件しか無いため、どちらの種に戻すべきかが機械的に決まらない。両種とも live metadata が存在しない状態が続いている。処置は accession を種ごとに分けて 2 件を個別に取り直すことで、既存ファイルの復元では解決しない。

同型で未復元のものがもう 1 件ある。`himekimadara_seseri` (Ochlodes ochracea) は accession `WMCFileRhopaloceranihonicaBHL22784764jpg` を持つが、この basename は現在 `hime_kijanome` に紐づいており、内容も蝶多数を並べた歴史図版である。復元先が無いため新規取得が要る。

### 1.5 no tier matched で取得できなかった 60 種

round1 の 54 件と round2 の 6 件を実測で照合した。round3 の no tier matched 10 件のうち 6 件は round2 の 6 件と同一種で、残り 4 件 (`kanmuri_kareha_kamakiri`、`hamasuzu`、`kuro_suzu`、`tennen_kimadara_seseri`) は補修対象である。重複を除いた実体は 64 種で、うち巻の選抜に直接効くのは次の 60 種である。

| 帰属 | 件数 | 内容 |
|---|---:|---|
| ボルネオ遠征 I の選抜 84 種 | 10 | Onthophagus cervicapra、Proagoderus watanabei、Catharsius renaudpauliani、Onthophagus rugicollis、Catharsius dayacus、Copris sinicus、Devadatta clavicauda、Diesbachia sophiae、Salomona borneensis、Cheumatopsyche globosa |
| ボルネオの予備 (84 枠外) | 2 | Asiophlugis longiuncus、Astyliasula phyllopus |
| マダガスカル遠征 II 案 B の追加 fetch | 42 | 1.7 参照。Helictopleurus 属 5、Epilissus 属 3、Nanos 属 6、Apotolamprus 属 2、Toxopus 属 2 ほかのマダガスカル固有属が中心 |
| コスタリカ遠征 I の選抜 84 種 | 6 | Copiphora cultricornis、Chlorogonalia coeruleovittata、Canthidium aurifex、Pterinoxylus speciosus、Atopsyche majada、Helicopsyche incisa |

この 60 種は museum tier に標本画像が存在しないために discover 段階で全 tier を外している。単純な再実行では結果が変わらない。必要なのは次の 2 つで、いずれも取得条件を変える作業である。第一に `docs/komorebi_regions.md` 6 章の must-have 指名シード層を使い、speciesKey 指定で近縁の代替種を harvest すること。第二に iNat CC0 の条件を緩めること (現行は CC0 限定。CC-BY 系まで広げると license 表記の扱いを決める必要がある)。ボルネオ側の糞虫 6 種とコスタリカ側の 6 種は、選抜からの差し替えのほうが安い可能性が高い。ボルネオは 84 枠外に検品 OK の予備が 12 種あり、これで 10 件の欠落を埋められる。

### 1.6 Morpho helenor の腹面写真

`Morpho helenor` (ヘレノールモルフォ、NHMUK、NHMUK808207) はコスタリカ遠征 I の非看板 SSR である。現行カードは展翅された腹面 (裏面) の全形で、褐色地に眼状紋が並ぶ模様として種の同定に問題は無い。ただしモルフォ蝶の訴求は背面の構造色による青の光沢にあり、SSR の看板性という観点ではその最大の見せ場が写っていない。背面が確認できる個体への差し替えを次 round の対象に含める。NHMUK と USNM のいずれにも背面展翅の Morpho 標本は多いため、取得自体の難度は低い。

### 1.7 マダガスカル遠征 II 案 B の追加 fetch 60 種

これは未実施ではなく、実施して失敗している。`zukan_foundry/rounds/2026-08-18/manifest.md` の mg 系 3 波 (mg_refetch 15、mg_w1 34、mg_w2 10、計 59 種) が `mg_expedition2_freeze_draft.md` 4.2 と 4.3 の 60 種に対応する。結果は次の通り。

| 波 | 対象 | 成功 | 内容 |
|---|---:|---:|---|
| mg_refetch | 15 | 15 | A- 等級と B 等級の再取得。全件 live に display あり |
| mg_w1 | 34 | 1 | 新規取得。成功は Zanna tenebrosa のみ |
| mg_w2 | 10 | 1 | 新規取得。成功は Oxya hyla のみ |

新規取得 44 種のうち成功は 2 種で、その 2 種はいずれも検品で非 OK と判定されている (`zanna_tenebrosa` は翅の無いセミ幼虫、`oxya_hyla` は画質不良)。したがって案 B が必要とする 28 種の不足は 1 種も埋まっていない。失敗 42 件は全て discover 段階の no tier matched で、マダガスカル固有の糞虫 (Helictopleurus、Epilissus、Nanos)、トビケラ、ナナフシに museum tier の標本画像が存在しないことが原因である。案 B を維持するなら must-have 指名 harvest が先に立つ。案 A (80 種) へ戻す選択肢は 3 章で扱う。

### 1.8 写真なしで暫定命名した 36 種

`borneo_costarica_naming_proposal_2026-08-18.md` の提案 141 件 (ボルネオ 66、コスタリカ 75) のうち、写真の欄が「なし」で学名と分類だけから仮称を作ったものは 36 件 (ボルネオ 17、コスタリカ 19) である。命名規約が禁じる「写真で確認できない特徴の使用」を避けるため、これらは属名や種小名の語義、または地域名を修飾語にしており、写真取得後に付け直す前提になっている。

実測すると、この 36 件のうち 20 件は現在 live に display 実体がある。round3 の archive 退避バグからの復元と、命名作業時点では未完了だった fetch の完走による。さらにそのうち 12 件は検品で OK と判定されており、写真を実見した再命名が今すぐ可能である。

| 帰属 | 写真なしで暫定命名 | 現在 live に写真あり | うち検品 OK |
|---|---:|---:|---:|
| ボルネオ遠征 I | 17 | 7 | 4 (pulchriphyllium_mannani、velinus_nigrigenu、rhinagrion_borneense、anopheles_balabacensis) |
| コスタリカ遠征 I | 19 | 13 | 8 (acanthops_godmani、graphocephala_albomaculata、mecistogaster_modesta、vates_pectinicornis、oncotophasma_martini、prisopus_biolleyi、scione_maculipennis、leptonema_albovirens) |

とくに `pulchriphyllium_mannani` はボルネオ I の SR で、現在の仮称ウツクシコノハムシは属名 Pulchriphyllium の語義 (美しい葉) からの暫定である。写真が取れているので実見での再命名を優先したい。残り 24 件は写真取得が先で、その大半は 1.5 の no tier matched 群と重なる。

## 2. quality gate の改良課題

`card_image_inspection_round123_2026-08-18.md` 6 章が挙げた「gate をすり抜けた欠陥の型」を、検出案とともに整理する。次に pipeline を触るときの入力として使う。現行 gate の実測 recall は 53.6% で、round3 では 5 件を gate failure として弾いている。

| 欠陥の型 | 実測での現れ方 | 検出案 |
|---|---|---|
| 部分ラベル (標本の端が見えているとラベル検出が効かない) | 非 OK 63 件中 19 件。RMNH は検品対象 4 件中 4 件が該当し defect 率 100%、NHMUK は 65 件中 7 件、USNM は 32 件中 6 件 | 前景全体の矩形性ではなく、前景を連結成分に分けたうえで「直線的な矩形成分 (ラベル)」と「非矩形成分 (標本)」を分離し、標本側の面積比が閾値未満なら reject する |
| 多個体の合成図版 | 種でない 44 件のうち約 20 件。同一ピンに複数個体、タンデム、群れ、捕食シーン | セグメンテーション後の連結成分数を数え、面積が一定以上の成分が 2 つ以上あれば reject する。翅と脚の分離を成分数に数えないよう最小面積の下限を置く |
| 歴史的な版画・図版 | 種でない 44 件のうち約 12 件。WMC tier 経由の 19 世紀図版、彩色プレート、点描ペン画 | 輝度ヒストグラムの離散性 (ハーフトーン網点)、彩度分布の狭さ、直線的な図版枠の有無を特徴量に加える。加えて WMC の File 名に plate、Iconographia、Fauna 等の語が含まれる場合を source 側で減点する |
| 再 fetch が同じ不良 source に再収束する | 1.3 の 4 件。同一クエリが同一の最上位結果を返すため gate をいくら強化しても解決しない | 種ごとに拒否した source の accession を記録し、次回 discover でその accession を候補から除外する。全 tier を使い切った種は renderer フォールバックへ回す判定を返す |
| archive 退避が対象種以外を巻き込む | round3 で 31 種が live から消失。原因は accession の広い prefix (`WIKIPEDIAWP*`、`WMCFilejpg*`) による一括マッチ | 退避対象を「その species_id の metadata が指すファイル」に限定し、prefix 一致で列挙しない。加えて退避前後で live のファイル数の差分が対象種の分と一致するか assert する |

5 番目は gate ではなく `zukan_cards/_archive/refetch/` のファイル操作ロジック側の欠陥だが、実害 (31 種の消失、うち 7 種が現在も未復旧) が最も大きいため同じ表に置いた。次の fetch または repair の実行前に修正が要る。

## 3. komorebi 残 release (更新 3 から 8) の準備状況

`docs/komorebi_release_runbook.md` 2 章の状態表を、実測値で置き換えたものである。更新 5 と 6 の入れ替え (`volume2_rarity_frames.md` の決定記録、2026-08-18 user 承認) を反映し、更新 5 をオーストラリア遠征 II、更新 6 をマダガスカル遠征 II とする。

写真の実充足数は、選抜リストの species_id または学名を `zukan_cards/metadata/*.json` と突き合わせ、`files.display` の実ファイルが存在する件数を数えたものである。検品 OK は、そこから 2 本の検品レポートの非 OK 判定を差し引いた数である。`card_image_inspection_round123_2026-08-18.md` 3 章の 63 件 (本日取得分) だけでなく、`card_image_inspection_2026-08-18.md` 2 章の未公開 257 件 (本日より前に取得済みの分) も差し引いている。後者を落とすと、本日再取得していない古いカードの欠陥が見落とされる。

| 更新 | 巻 | 選抜 84 種の確定 | 写真の実充足 (実ファイル / 選抜数) | 検品 OK | 命名 | freeze 反映 | 判定 |
|---|---|---|---|---:|---|---|---|
| 3 | ボルネオ遠征 I | 確定 (2026-08-18 user 承認) | 74 / 84 | 57 | 84 件提案済 (標準和名 18 + 仮称 66)。うち 17 件は写真未確認の暫定 | 未 (bugs.js 0、catalog 0、manifest は合成 fixture のまま) | 写真待ち |
| 4 | コスタリカ遠征 I | 案は確定、draft に承認記録が無い | 78 / 84 | 57 | 84 件提案済 (標準和名 8 + 提案 76、うち 1 件は既存名採用)。うち 19 件は写真未確認の暫定 | 未 (bugs.js 0、catalog 0、manifest は合成 fixture のまま) | 写真待ち |
| 5 | オーストラリア遠征 II | 確定 (2026-08-18 user 承認、SSR 差し替え適用済) | 84 / 84 | 75 | 84 件確定、bugs.js 登録済 | 済 (branch `claude/au2-ready`) | 今すぐ freeze 可能 (freeze 済)。deploy 待ち |
| 6 | マダガスカル遠征 II | 案 B (84 種) を user 決定。ただし追加 28 種が未取得のため確定しているのは案 A の 80 種 | 案 A: 80 / 80、案 B: 80 / 84 | 75 (案 A) | 案 A 80 種のうち 63 件は bugs.js 登録済、17 件は提案済で未反映。案 B ならさらに 28 件前後 | 未 (bugs.js の rarity 更新 63 件と新規 17 件、catalog 0、manifest 未作成) | 案 B のままなら写真待ち。案 A へ戻せば命名待ち |
| 7 | ボルネオ遠征 II | 未着手 (残プール 98) | 12 / 84 相当 (ボルネオ I の予備と同一集合) | 12 | 未着手 | 未 | 未着手 |
| 8 | コスタリカ遠征 II | 未着手 (残プール 210) | 7 / 84 相当 (本編重複を含む) | 未検品 | 未着手 | 未 | 未着手 |

各巻の補足。

更新 3 ボルネオ遠征 I。選抜 84 種は承認済みで、写真は 74 種が live にある。不足は 3 種類あり、no tier matched で取得できなかった 10 種 (1.5)、本日の取得で検品非 OK になった 15 種 (Amphibotettix longipes、Apis dorsata、Bactrocera frauenfeldi、Ceriagrion cerinorubellum、Dolichoderus thoracicus、Junonia atlites、Limnocentropus grandis、Orthetrum testaceum、Penthicodes farinosa、Polyrhachis armata、Pycanum alternatum、Pyrops intricatus、Pyrops sultanus、Sisyphus thoracicus、Vespa tropica)、および本日より前から写真を持っていた 2 種 (Oecophylla smaragdina は葉巻き営巣の写真でアリ本体が写っておらず、Bactrocera musae は強いボケで識別特徴が読めない) である。差し替えの原資として、選抜 84 枠外に取得した 12 種が全て検品 OK で残っている。27 種の穴に対して 12 種の予備なので、15 種は再取得か選抜の入れ替えが要る。公開までに残るのは写真の充足、命名 17 件の再確定、bugs.js 84 entry、catalog 84 entry、manifest の実データ差し替え、trophies 4 件、sw.js のバンプである。

更新 4 コスタリカ遠征 I。写真は 78 種が live にあるが、検品非 OK が 21 種と多い。ラベル主体と歴史図版が集中しており、RMNH 由来の 3 件 (Astraptes fulgerator、Urbanus proteus ほか) はラベルのみで個体が写っていない。写真は全て本日取得したもので、本日より前からの持ち越し欠陥は無い。不足は no tier matched 6 種と非 OK 21 種の計 27 種で、予備の取得は行っていない。使用可プールが 294 種と厚いため、差し替えでの充足は数の面では容易である。加えて freeze draft 本体に承認記録が無い。round2 で 84 種の fetch まで進んでいるので実務上は着手済みだが、記録上は draft のままである点を残作業に含める。

更新 5 オーストラリア遠征 II。実測で 84 種全てに live の display があり、bugs.js 84 entry と catalog 84 entry と `volume_fixture_australia_2` (expedition 2、release 5、denominator 84、flagship anoplognathus_viridiaeneus、レア度 N 57 / R 17 / SR 7 / SSR 3) が branch `claude/au2-ready` に入っている。承認記録の SSR 差し替え (オオフクロゼミからコナフキゼミへ、オオフクロゼミは SR 帯) も反映済みである。

品質課題は 9 件ある。`au_expedition2_freeze_draft.md` 5 章の差し替え候補 8 種を round1 と round3 で 2 度取り直したが、改善したのは `onthophagus_taurus` の 1 種だけで、acrossidius_tasmaniae と adoryphorus_couloni (点描ペン画)、didymuria_violescens (複数個体の彩色図版)、hierodula_majuscula と phricta_spinosa (幼虫) の 5 種は非 OK のまま残った。これに加えて、5 章の差し替え候補に挙がっておらず取り直していない 4 種が全件検品で非 OK と判定されている。podacanthus_typhon (手描き彩色イラスト)、tettigarcta_tomentosa (強いピンボケ)、tropidoderus_rhodomus (1881 年の絵画作品、ナナフシ 3 匹の装飾的複合プレート)、thopha_saccata (白黒線画) である。このうち thopha_saccata は承認記録で SSR から降ろした先の SR 帯にあり、帯が高いぶん目に触れる回数が多い。`calofulcinia_paraoxypila` は round3 の消失バグで検品対象から漏れており、再取得後の実体が未確認のまま残っている。

これらは全て写真の差し替えで直る種類の問題で、選抜そのものややり直しを要求しない。したがって本巻は今すぐ freeze 可能な状態にあり (すでに freeze 済み)、残るのは deploy 判断と、公開前に thopha_saccata の写真を差し替えるかどうかの判断である。

更新 6 マダガスカル遠征 II。user 決定は案 B (84 種、追加 fetch 28 種) だが、1.7 のとおりその追加 fetch は実行して 0 種の成果だった。一方、案 A の 80 種は写真が 80 種全て live にある。round1 の mg_refetch 15 種は全件成功し、A- 等級と B 等級の欠陥はここで解消している。ただし draft が A 等級としていた 5 種が全件検品で非 OK と判定されており、取り直しの対象にも入っていない。achrioptera_magnifica (R。彩色イラスト。`volume2_rarity_frames.md` 4.1 の MG II 看板候補でもある)、yanga_guttulata (R。極端な露出不足でシルエットのみ)、canthydrus_guttula (N。版画イラスト)、amberana_marginata (N。赤い破片が 3 つ散在し 1 個体にまとまらない)、anopheles_gambiae (N。別種の疑い) である。draft の等級づけと独立検品の判定が食い違った箇所なので、freeze 前にどちらを採るかを決める必要がある。

案 A へ戻せば、命名 17 件を bugs.js へ入れて catalog 80 entry と manifest を書くだけで freeze に進める (上の 5 種の扱いは別途)。案 B を維持する場合は must-have 指名 harvest から始めることになり、リードタイムが読めない。決定 4 (凍結は取り消せない) がある以上、80 種で先に出すか 84 種を待つかは判断が要る。

更新 7 ボルネオ遠征 II。`volume2_rarity_frames.md` の残プールは 98 種。実測では、選抜 84 種を除いたボルネオ seeds 116 件のうち live に写真があるのは 29 件で、うち 17 件は本編カタログとの重複である。本 round で 84 枠外に取得した 12 種が実質の新規在庫にあたる。ただしこの 12 種はボルネオ遠征 I の穴 27 件を埋める予備でもあり、両方に数えることはできない。I に回せば II の在庫はほぼゼロに戻る。看板の Chalcosoma moellenkampi は写真未取得で、`volume2_rarity_frames.md` 5.1 で提案された facetOffset を進める追加 harvest と must-have 指名 (Mormolyce phyllodes、Cyclommatus 属、Odontolabis 属ほか) はいずれも未実施である。

更新 8 コスタリカ遠征 II。残プールは 210 種で数の余裕はあるが、選抜 84 種を除いた seeds 217 件のうち live に写真があるのは 7 件だけで、その大半は本編重複である。看板の Fulgora laternaria も写真未取得。実質ゼロからの写真取得になる。

## 4. deploy 保留中のもの

| 対象 | 内容 | 現在地 |
|---|---|---|
| オーストラリア遠征 II | `shared/bugs.js` 84 entry、`zukan_config/zukan_catalog.js` 84 entry (1004 から 1088)、`komorebi/volumes/volume_fixture.js` の `volume_fixture_australia_2` (release 5)、`komorebi/trophies.js` の代表種 4 行 (コメントで据え置き) | branch `claude/au2-ready`。`origin/claude/au2-ready` と同期済み。`claude/komorebi-tools` (= `origin/main`) より 5 commit 先行 |
| メダル経済 | 採集道具 11 種、かがやきのうろ、メダル交換、リセット周回。Phase 1 から 3 まで実装・配信済みで `komorebi/economy_flag.js` の `MEDAL_ECONOMY_ON=false` が止めている | main に同梱済み。フラグのみ false |

解禁手順。

オーストラリア遠征 II。

1. `claude/au2-ready` を main へ merge し、`sw.js` の CACHE 名と 6 エントリポイントの `?v=` を上げる。
2. `tests/test_*.js` を 4 状態 (CURRENT_RELEASE 1/2 x MEDAL_ECONOMY_ON true/false) で流し、commit 前 safety check (`_inbox`、`_archive`、`_pipeline`、`_L1_segmented`、`_original.` の混入検査) を通す。
3. `komorebi/economy_flag.js` の `CURRENT_RELEASE` を 5 にする。この 1 行で更新 3 と 4 のカテゴリ 8 本 (kom_kuku_inverse、kom_frac_flow、kom_kuku_dan6、kom_kuku_dan7、kom_kuku_bridge、kom_equation_select、kom_kuku_dan8、kom_kuku_dan9) も同時に開くため、それを避けるなら `volume_fixture_australia_2` の release を 3 に下げて出す。

メダル経済。

1. `komorebi/economy_flag.js` の `MEDAL_ECONOMY_ON` を true にする。
2. 公開する道具の `release` が `CURRENT_RELEASE` 以下であること、およびその道具の対象種が公開中の volume に 1 種以上いることを確認する (更新 2 で開くのは先行 4 種)。
3. `sw.js` の CACHE 名と `?v=` を上げ、4 状態で全テストを流して commit する。

`MEDAL_ECONOMY_ON` が false の間に成立したメダルは、うろの初回訪問で遡って奉納できるため取りこぼしは無い。したがって点火のタイミングは内容の準備ではなく利用者の状態で決めてよい。

## 5. 件数のまとめ

1 章の持ち越し課題は 8 項目で、対象種の実数は次の通り。項目をまたいで重複する種があり、種 id が特定できる分を重複なしで数えると 155 種になる (1.7 の未充足 28 件は対象種が確定していないため除く)。

| 項目 | 種数 |
|---|---:|
| 1.1 ameiro_tonbo のラベル写り込み | 1 |
| 1.2 検品非 OK の再取得 | 63 (巻の選抜に入る持ち越し 11 件を含めて 74) |
| 1.3 同一 source への再収束 | 4 (関連 2 を含めて 6) |
| 1.4 accession 衝突 | 2 (関連 1 を含めて 3) |
| 1.5 no tier matched | 60 |
| 1.6 Morpho helenor の背面差し替え | 1 |
| 1.7 マダガスカル II 案 B の追加 fetch | 28 (未充足分) |
| 1.8 写真なしでの暫定命名 | 36 (うち 12 は再命名が今すぐ可能) |

2 章の quality gate 改良課題は 5 件で、うち 1 件 (archive 退避の巻き込み) は gate ではなくファイル操作ロジック側の修正である。

3 章の判定は、今すぐ freeze 可能が 1 巻 (更新 5 オーストラリア遠征 II、freeze 済みで deploy 待ち)、写真待ちが 3 巻 (更新 3、更新 4、更新 6 の案 B)、未着手が 2 巻 (更新 7、更新 8) である。更新 6 は案 A (80 種) へ戻す判断をすれば命名待ちに変わる。
