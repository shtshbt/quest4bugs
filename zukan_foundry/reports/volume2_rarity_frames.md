# 遠征 II 巻 (更新 5 から 8) のレアリティ枠と成立性

status: draft、user 承認待ち。コード・カタログへの反映は freeze 承認後。

作成日: 2026-08-17。対象: 更新 5 マダガスカル遠征 II、更新 6 オーストラリア遠征 II、更新 7 ボルネオ遠征 II、更新 8 コスタリカ遠征 II (`docs/komorebi_release_linkage.md` 2 章)。

## 0. 本書の位置づけ

軽量版である。4 地域の残 seeds プールの規模と質を実測し、II 巻が決定 11 の下限 80 種に届くか、レアリティ枠がどうなるか、看板の写真が確保できているか、追加 harvest が要るかを 1 枚にまとめる。種の深い選抜と選定理由の記述は行わない。それは各巻の freeze draft の仕事で、ボルネオ I とコスタリカ I については `zukan_foundry/reports/borneo_expedition1_freeze_draft.md` と `zukan_foundry/reports/costarica_expedition1_freeze_draft.md` が対応する。

計測の基準日は 2026-08-17。プールの定義は次のとおり。

- 地域 seeds (enriched) の全件から、本編カタログ (`shared/bugs.js` の areaOnly なし entry) と学名 canonical または synonym が一致するものを除く。
- 既に凍結済みの volume (マダガスカル遠征 I、オーストラリア遠征 I) へ収録済みの種を除く。
- 遠征 I のドラフト (ボルネオ、コスタリカ) で選抜した 84 種ずつを除く。この 2 巻は未承認なので、承認内容が変われば残プールも変わる。

## 1. 残プールの実測

| 地域 | 残プール | 標本写真あり | bugs.js 登録済 | 標準和名 | 英名候補 | Lep / Col | occurrence 200 以上 |
|---|---:|---:|---:|---:|---:|---|---:|
| マダガスカル | 209 | 107 | 72 | 5 | 1 | 8 / 28 | 51 |
| オーストラリア | 202 | 174 | 13 | 4 | 116 | 13 / 21 | 173 |
| ボルネオ | 98 | 2 | 1 | 6 | 16 | 5 / 12 | 32 |
| コスタリカ | 210 | 1 | 0 | 4 | 30 | 17 / 21 | 153 |

列の読み方。

- 標本写真あり: `zukan_cards/metadata/` に当該種のカードが存在する数。写真取得の残作業量はプール規模との差で読む。
- bugs.js 登録済: areaOnly komorebi の entry が既にあり和名も付いている数。マダガスカルの 72 はマダガスカル遠征 I の選抜から漏れた命名済み種で、そのまま II 巻へ回せる。
- 標準和名と英名候補: 命名工程の負荷を示す。マダガスカルは登録済 72 と合わせると命名済みが 77 種で、残り 132 種の命名が要る。
- occurrence 200 以上: GBIF 記録数が多い種は museum と iNat の双方で写真が見つかりやすい。写真取得の成功見込みの粗い代理指標として使う。

### 1.1 目 (order) の分布

| 地域 | Col | Dip | Hem | Hym | Lep | Man | Odo | Ort | Pha | Tri |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| マダガスカル | 28 | 29 | 26 | 28 | 8 | 21 | 1 | 21 | 22 | 25 |
| オーストラリア | 21 | 21 | 18 | 26 | 13 | 22 | 17 | 16 | 19 | 29 |
| ボルネオ | 12 | 12 | 10 | 9 | 5 | 10 | 10 | 11 | 12 | 7 |
| コスタリカ | 21 | 24 | 22 | 17 | 17 | 21 | 18 | 20 | 24 | 26 |

マダガスカルの Odonata が 1 種しか残っていない。マダガスカル遠征 I がトンボを 25 種前後収録したためで、II 巻はトンボがほぼ無い巻になる。同様に Lepidoptera も 8 種しか残らない。バトル属性の見込みは かんじ 8 / けいさん 28 / えいご 173 で、かんじ が薄い。

## 2. II 巻の成立性

| 地域 | 更新 | 残プール | 写真の落選率 13% を見込んだ実効数 | 80 種到達 | 判定 |
|---|---:|---:|---:|---|---|
| マダガスカル | 5 | 209 | 182 | 到達 | 成立。数の余裕は III 巻まである |
| オーストラリア | 6 | 202 | 176 | 到達 | 成立。4 地域で最も準備が進んでいる |
| ボルネオ | 7 | 98 | 85 | 到達するが余裕なし | 条件付き成立。追加 harvest 推奨 |
| コスタリカ | 8 | 210 | 183 | 到達 | 成立。ただし写真が 1 枚も無い |

落選率 13% はオーストラリア遠征 I の実績 (命名済み 97 種から写真品質で 13 種を落として 84 種) から取った。

ボルネオだけが在庫制約を受ける。地域定義が geometry で、`docs/komorebi_regions.md` 4 章が harvest 目標を 2 回分 200 種と定めたためで、設計どおりの結果である。実効 85 種は下限 80 をわずかに超えるが、写真の落選が想定より多いと 80 を割る。またボルネオ遠征 I 側も、写真取得を 96 種に広げると II の残プールがさらに縮む (borneo_expedition1_freeze_draft.md 3.2)。

## 3. レアリティ枠

`docs/komorebi_rarity_standard.md` のスケール規則を適用する。SSR は volume サイズによらず 3 (看板 1 + 非看板 2)、SR は約 8%、R は約 20%、N は残り。

| 巻 | 想定種数 | N | R | SR | SSR |
|---|---:|---:|---:|---:|---:|
| マダガスカル遠征 II | 84 | 57 | 17 | 7 | 3 |
| オーストラリア遠征 II | 84 | 57 | 17 | 7 | 3 |
| ボルネオ遠征 II (標準案) | 84 | 57 | 17 | 7 | 3 |
| ボルネオ遠征 II (縮小案) | 80 | 55 | 16 | 6 | 3 |
| コスタリカ遠征 II | 84 | 57 | 17 | 7 | 3 |

ボルネオ遠征 II は写真取得の結果によって 84 と 80 のどちらになるか決まる。freeze 時に確定させる。80 に落ちる場合、SR が 6 種になり、更新 7 のカテゴリ本数 (kom_kuku_dan8 と kom_kuku_bridge が更新 4 で出揃っているため、更新 7 は図鑑の巻のみでカテゴリ 0 本) を下回る心配は無い。更新 5 から 8 は学習カテゴリを伴わないため (`docs/komorebi_release_linkage.md` 2 章)、SR 帯をトロフィー代表虫の予備として確保する必要が薄い点は 4 巻共通である。

## 4. 看板候補と写真確保状況

| 巻 | カレンダー記載の看板 | 学名 | 残プールに在籍 | 標本写真 | 判定 |
|---|---|---|---|---|---|
| マダガスカル II | マダガスカルオオゴキブリ | Gromphadorhina portentosa | 不在 | あり | 使用不可。下記 4.1 |
| オーストラリア II | クリスマスビートル | Anoplognathus 属 | 在籍 (2 種) | あり | 種の指名が必要。下記 4.2 |
| ボルネオ II | モーレンカンプオオカブト | Chalcosoma moellenkampi | 在籍 | なし | 写真取得が必要 |
| コスタリカ II | ビワハゴロモ | Fulgora laternaria | 在籍 | なし | 写真取得が必要 |

### 4.1 マダガスカル II の看板が消費済み

マダガスカルオオゴキブリ (Gromphadorhina portentosa) は既にマダガスカル遠征 I の 84 種へ R として収録されている (`komorebi/volumes/volume_fixture.js` の id madagasukaru_oo_gokiburi)。凍結済みのため取り消せない (決定 4)。したがって更新 5 の看板は別種を指名する必要がある。

残プールから、写真が確保済みで看板に立てられる候補を挙げる。いずれも `zukan_cards/metadata/` にカードがある。

| 候補 | 学名 | 目 | 推薦理由 |
|---|---|---|---|
| ネジレカンムリカマキリ | Phyllocrania paradoxa | Mantodea | 枯葉に擬態する有名種で飼育界の知名度が高い。頭部の突起と体の輪郭が独特で thumb でも判別できる。マダガスカル遠征 I の看板コメットガと目が異なり、巻ごとの顔が変わる |
| (命名未) | Achrioptera magnifica | Phasmida | 青と橙の派手な大型ナナフシ。色のインパクトは残プール中で最強。occurrence 6 と極端に少ないが写真は既に確保済み |
| (命名未) | Achrioptera impennis | Phasmida | 上記の近縁で occurrence 90。写真はあるが `zukan_foundry/data/species_reserve/naming/refetch_queue.json` に載っており差し替え候補の扱い |
| マダガスカルビワハゴロモ | Zanna madagascariensis | Hemiptera | ビワハゴロモ科。ただしコスタリカ遠征 II の看板ビワハゴロモと科が重なるため、同じ更新群で 2 巻の看板が同科になる |
| ベニトゲアシナナフシ | Parectatosoma mocquerysi | Phasmida | 赤い棘を持つナナフシ。命名済みで写真もある |

推奨は Phyllocrania paradoxa。知名度と写真の確実性を両立し、看板が 4 巻続けてチョウとカブトに偏るのを避けられる。

### 4.2 オーストラリア II の看板は属指名のまま

更新カレンダーはクリスマスビートルを属名 (Anoplognathus) で記載している。オーストラリア遠征 I は Anoplognathus porosus (ホシアメイロコガネ) を R として収録済みなので、II の看板は別種になる。残プールに 2 種ある。

| 候補 | 学名 | 英名 | occurrence | 標本写真 |
|---|---|---|---:|---|
| Anoplognathus viridiaeneus | | King Christmas Beetle | 330 | あり |
| Anoplognathus montanus | | Duck Billed Beetle | 2577 | あり |

推奨は Anoplognathus viridiaeneus。英名が King Christmas Beetle で、クリスマスビートルの代表という位置づけが名前から読める。occurrence は少ないが写真は既に確保済みなので調達リスクは無い。写真の実見で品質が不足していた場合は Anoplognathus montanus に切り替える。

### 4.3 ボルネオ II とコスタリカ II の看板は写真未取得

Chalcosoma moellenkampi と Fulgora laternaria はいずれも seeds に在籍し、`docs/komorebi_regions.md` 7 章の対カタログ照合でも使用可だが、標本写真が無い。`docs/zukan_stock_ledger.md` の「must-have 看板 ... 在庫済み」は seeds に speciesKey があるという意味であって写真の確保を意味しない。この読み違えは 4 地域すべての看板に共通するため、台帳の該当行に写真列を足す修正を提案する。

Fulgora laternaria は occurrence 95、Chalcosoma moellenkampi は occurrence 419。どちらも museum tier で標本の見込みはあるが、看板の写真は品質基準が高いので早めに着手して差し替え余地を作りたい。

## 5. 必要な追加 harvest

| 地域 | 追加 harvest の要否 | 理由 | 内容 |
|---|---|---|---|
| マダガスカル | 遠征 III 向けに必要 | 残 209 から II が 84 を取ると III は 125 で、写真落選を見込むと 109。III は成立するが IV は無い | 更新 9 の内容確定 (9 月 LOGOS ゲート) と合わせて判断。優先度は低い |
| オーストラリア | 不要 | 残 202 で II と III が成立。写真も 174 種確保済み | なし |
| ボルネオ | 必要 | 残 98 で II がぎりぎり。写真落選次第で 80 を割る | geometry 定義で facetOffset を進めて 100 種追加。加えて must-have 指名で下記 5.1 |
| コスタリカ | 不要 (数の面では) | 残 210 で II と III が成立 | ただし甲虫の質は要改善 (5.2) |

### 5.1 ボルネオの追加 harvest 提案

数の追加と、質の追加の 2 つが要る。

数の追加。`docs/komorebi_regions.md` 2 章のとおりボルネオは国コードで切れず geometry (BN + MY サバ サラワク + ID カリマンタン) が必須である。既存の facetReceipts は facetOffset 0 の 1 ページのみなので、facetOffset を進めれば 100 種前後は追加できる見込み。頻度順の下位に降りるため occurrence は小さくなるが、写真は museum 標本があれば取れる。

質の追加。ボルネオ seeds の Coleoptera 22 種は全て糞虫 (Scarabaeidae) で、ボルネオの看板甲虫が 1 種も入っていない。`docs/komorebi_regions.md` 6 章の must-have 指名シード層を使い、speciesKey 指定で次を追加することを提案する。

- Mormolyce phyllodes (バイオリンムシ。平たい体の異形。本編未収録)
- Cyclommatus 属、Odontolabis 属 (ボルネオ産クワガタ。本編のクワガタは日本産と有名外国産に限られる)
- Batocera 属 (大型カミキリ)
- Chrysochroa fulminans 等の東南アジア産タマムシ
- Phobaeticus chani (チャニナナフシ。世界最長。GBIF の地域内 occurrence が 0 で未確保のため、`docs/zukan_stock_ledger.md` 1 章のとおり自動再試行の対象。取れればボルネオ III の看板になる)

### 5.2 コスタリカの質の追加

数の面では追加不要だが、Coleoptera 30 種のうち 21 種が糞虫で、中南米の看板甲虫が入っていない。`zukan_foundry/reports/costarica_expedition1_freeze_draft.md` 5.2 で挙げた Golofa 属、Phanaeus 属、Euchroma gigantea、Acrocinus longimanus の must-have 指名を、コスタリカ遠征 II の準備と同時に行うことを提案する。

### 5.3 地域横断の傾向

頻度順 harvest は糞虫 (Scarabaeidae) とミバエ (Tephritidae) とノミバエ (Phoridae) とトビケラを大量に拾い、大型で有名な甲虫を落とす。GBIF の occurrence は生態調査のトラップ記録に強く依存するためで、4 地域すべてで同じ形が出ている。must-have 指名シード層 (`docs/komorebi_regions.md` 6 章の要求事項 1) は看板の取りこぼし対策として提案されたが、実際には甲虫枠全体の質を決める仕組みでもある。Tier 2 の新地域を harvest する際は、頻度順 300 種に加えて有名甲虫 10 種前後の指名を最初から組み込むことを提案する。

## 6. 着手順の提案

写真取得がボトルネックであるという `docs/zukan_stock_ledger.md` 2 章の判断は現時点でも変わらない。残プールの写真確保状況から、着手順は次を提案する。

1. ボルネオ遠征 I の写真取得 (96 種)。更新 3 の日程を直接決める。
2. コスタリカ遠征 I の写真取得 (84 から 100 種)。更新 4 の日程を直接決める。
3. ボルネオの追加 harvest (5.1)。更新 7 の成立性を確保するため、更新 3 の準備と並行して回す。
4. オーストラリア遠征 II の命名 (189 種)。写真は 174 種が既にあるので、命名さえ済めば II は最短で出せる。更新 3 と 4 の写真取得が詰まったときの繰り上げ候補になる。
5. マダガスカル遠征 II の命名 (132 種) と写真取得 (残 102 種)。登録済み 72 種があるため命名負荷は見た目より軽い。
6. コスタリカ遠征 II の写真取得。更新 8 は最も先なので最後でよい。

更新 5 から 8 は学習カテゴリを伴わない図鑑ドロップで、間隔を隔週に固定せず準備ができ次第出してよい (`docs/komorebi_release_linkage.md` 2 章)。したがってオーストラリア遠征 II が先に仕上がった場合、更新 5 と 6 の順序を入れ替える選択肢がある。

## 7. レビューで確認したい事項

1. マダガスカル遠征 II の看板を Phyllocrania paradoxa へ変更する案 (4.1)。更新カレンダーの記載を書き換える必要がある。
2. オーストラリア遠征 II の看板を Anoplognathus viridiaeneus に指名する案 (4.2)。
3. ボルネオ遠征 II を 84 種で通すか 80 種に落とすか (3 章)。追加 harvest の実施可否と連動する。
4. ボルネオの追加 harvest の実施時期 (5.1)。更新 3 の準備と並行させるか、更新 3 の公開後に回すか。
5. 更新 5 と 6 の順序を、準備の進み具合で入れ替えてよいか (6 章)。
6. `docs/zukan_stock_ledger.md` の must-have 看板の行に写真確保列を足す修正 (4.3)。

## 決定記録 (2026-08-18 user 承認)

- MG II 看板: Phyllocrania paradoxa (ネジレカンムリカマキリ) に差し替え (旧予定のマダガスカルオオゴキブリは MG I で R 収録済みのため)
- AU II 看板: Anoplognathus viridiaeneus (King Christmas Beetle)
- 更新 5 と 6 を入れ替え: 更新 5 = AU II (写真 174 種既存で最短)、更新 6 = MG II
