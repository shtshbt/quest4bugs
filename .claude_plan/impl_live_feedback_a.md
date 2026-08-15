# round: 実機フィードバック修正 A (バグ + コース分離 + 地域ロック)

仕様の正本: docs/komorebi_design.md (60 行: 年齢コース k5/k10 は既存 p.type を流用 / 325 行: 地域内に「現在コースへの」offers を表示 / 419 行: k5/k10 の Lv 進行は混合しない)。共通要件: .claude_plan/k10_new_cats_common.md のうち「全テスト green」「sw.js は CORE 配列のみ触り CACHE 文字列は触らない」「doc 矛盾は BLOCKED」を適用。

前提: komorebi/app.js には kisokusei round の変更が入っている。それらを壊さないこと。

## 範囲

### 1. 「正解！く」見出し修正 (小)

komorebi/app.js の kukuPhraseCardHtml が h3 見出しに文字通り「く」を出している。見出しを「くくの よみかた」に変更。フィードバック画面 (feedbackHtml) の「正解！」直後にこのカードが出た際に自然に読めること。

### 2. 段暗唱の音声判定強化 (komorebi/app.js + komorebi/kuku_dan2.js)

a. 結果待ちグレース: startDan2Voice のタイマー発火時、spoke (speechEndAt>0) なら即 retry せず、追加 1800ms だけ onresult を待つ待機状態に入る。経過時間は従来どおり speechEndAt-startedAt で計るので、遅延到着を受理しても judgeTiming が limitMs 超過を弾き、時間の不正は生じない (この方針が既存コメントの懸念への回答)。グレース内に結果が来なければ現行文言で retry。

b. 書き起こしエイリアス: normalizeTranscript の前処理 (halfWidthLower 直後、source 段階) に、Chrome の日本語書き起こしで頻出する漢字混入をかなへ戻す置換表を追加する。最低限「人→にん」(例:「2人が4」→「2にんが4」。既存の kanaNumberAt が「に」=2 を拾い、数トークン列 [2,2,4] で一致するようになる)。表は kuku_dan2.js 内の定数とし、テストから参照可能にする。source を置換すると positions がずれるので、canonicalEnd と numberTokens の両方が同じ置換済み source を見るよう一貫させること。

c. 期待値誘導トークン化: numberSequence が greedy 誤トークン化で落ちるケース (「にごじゅう」→ [2,50] となり期待 [2,5,10] に不一致) のフォールバックとして、期待値列を先に固定し、各期待値のかな表現 (KANA_NUMBERS の逆引き) と数字表現を cursor から順に indexOf で探す誘導マッチを追加。既存の numberSequence が成功する場合は挙動を変えない。

d. 可視化: retryDan2 の文言と不正解フィードバックに「きこえたことば: <認識文字列>」を添える (displayText 経由、認識文字列が空なら出さない)。原因の切り分けを保護者ができるようにする。

### 3. コースフィルタ (docs/komorebi_design.md 325 行への整合)

categoryButtonsHtml ほか、地域画面で volume.categories を列挙して offers を出す箇所を CATEGORIES[cat].course===profileType で絞る。profileType は既にポータル profile の type から読み込み済み (furigana 用)。進捗表示の分母 (「x/y カテゴリ」等) も同じ絞り込みで数える。release ゲート (isReleased) との合成順は「release で絞る → course で絞る」。tests/test_komorebi_boot.js・tests/test_komorebi_release_gate.js・tests/test_komorebi_map.js 等で「全カテゴリ表示」を固定している期待値をコース別に更新する。

### 4. プレースホルダ地域のロック

komorebi/volumes/volume_fixture.js の AU/BO/CR の volume 定義に placeholder:true を追加し、app.js は placeholder volume を:
- 地図ピンは出すが「じゅんびちゅう」バッジ表示にし、地域画面への遷移またはプレイ導線 (カテゴリボタン・小道開始) を出さない
- こもれびのずかん (renderCommonZukan) の集計・分母から除外
- 既に捕獲済みの孤児レコード (kom_fixture_* が profile.collection.catches にある状態) が読み込まれても例外を出さず無視する
マダガスカル (実在 84 種) は影響を受けないこと。

### 5. テスト

- 既存 komorebi テスト全 green (node tests/test_komorebi_*.js)
- 新規または追記:
  - tests/test_komorebi_kuku_dan2.js に追記: 「2人が4 …」がエイリアス経由で一致すること、「にごじゅう」が誘導マッチで一致すること、空転写が recognition_failure のままであること
  - コースフィルタ: k5 profile で k10 cat のボタンが出ない / 分母がコース内で閉じる
  - 地域ロック: placeholder volume でプレイ導線が出ない・共通ずかん分母から除外される

## 検収

- 全テスト green、zukan_cards/ の diff なし、sw.js CACHE 文字列変更なし、commit しない
