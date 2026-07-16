# Blocked Decisions

実装を止めずに進めるため、可逆で保守的なデフォルトを選んだ判断点の記録。
各エントリは人間の確認によって解決する。

## 1. ALLOWED_MEDIA_LICENSES の正本がコメントと実コードで食い違う

判断点:
`zukan_config/zukan_catalog.js` の冒頭コメントは許可ライセンスを 3 種
(`CC0-1.0`, `PDM-1.0`, `CC-BY-4.0`) と記載している。一方、同ファイル内で実際に
評価される `var ALLOWED_MEDIA_LICENSES` は 7 種を許可しており、`CC-BY-SA-2.0`,
`CC-BY-SA-2.5`, `CC-BY-SA-3.0`, `CC-BY-SA-4.0` を追加で含む。出典・権利軸の判定は
どちらを正本とするかで結果が大きく変わる。

検討した選択肢:

1. 冒頭コメントの 3 種を正本とする。現行カタログの CC-BY-SA 系 148 件が
   `machine_reject` に落ちる。
2. 実コードの `var` 宣言 7 種を正本とする。CC-BY-SA 系は許可として通る。
3. 両方の積集合を採り、差分を全件 `review_required` に送る。

実際に取った安全側の行動:
選択肢 2 を採用した。監査ツールはライセンス一覧をハードコードせず、カタログ
ファイルのテキストから `var ALLOWED_MEDIA_LICENSES` の object literal を実行時に
パースして使う。理由は、この `var` がブラウザ実行時に実際に評価される唯一の
チェックであり、カタログの runtime 動作と監査結果が一致するため。コメントは
更新漏れと判断した。CC-BY-SA 系にも CC-BY 系と同じ attribution 要件
(creditLine, institutionRecordUrl, licenseUrl) を課している。

理由:
どちらが意図された正本かはカタログ側の履歴からは確定できない。誤って選択肢 1 を
採ると、実際には配信中で表示に問題のない 148 件を一括で reject し、後続の
差し替え lane に大量の偽の作業を発生させる。逆に選択肢 2 が誤りだった場合でも、
状態は `provisionally_valid` 止まりであり、人間承認を経ないため配信には影響しない。
可逆側は選択肢 2 である。

必要な人間の入力:
CC-BY-SA 系 4 種を図鑑カードの media license として許可する方針で正しいか。
正しい場合はカタログ冒頭コメントを実コードに合わせて更新する。許可しない場合は
`var` 側を修正し、該当 148 件の差し替え方針を決める。

## 2. SPEC が参照する `specimen.scientificName` がカタログに存在しない

判断点:
SPEC の同定整合性軸は「entry の `specimen.scientificName`
(female variant があれば `specimenFemale.scientificName` も) を
`shared/bugs.js` と比較する」と規定する。しかし現行カタログ 893 件のうち
`specimen.scientificName` を持つ entry は 0 件である。学名は entry の
トップレベル `scientificName` に格納されている。`specimenFemale` にも
`scientificName` フィールドはない。

検討した選択肢:

1. `specimen.scientificName` を厳密に読み、存在しないので全件を同定不能として
   `review_required` にする。894 fixture 全件が同定疑義になり、軸として機能しない。
2. トップレベル `scientificName` を読む。SPEC の文言からは外れるが、実データ上
   唯一の学名フィールドである。
3. 実装を止めて確認を待つ。

実際に取った安全側の行動:
選択肢 2 を採用した。`specimen.scientificName` を先に探し、存在しない場合に
トップレベル `scientificName` へフォールバックする実装とした。female variant も
同様に `specimenFemale.scientificName` を先に探し、なければトップレベルへ落とす。
将来カタログに `specimen.scientificName` が追加されても、そちらが優先される。

理由:
SPEC の意図 (カタログ側の学名と bugs.js 側の学名を突き合わせる) は明確であり、
フィールド名の記述はカタログ実体とずれた planning 段階の記述と判断した。ただし
SPEC は本 lane の唯一の実行権威であるため、その文言から外れる読み替えを無記録で
行うことは避ける。

必要な人間の入力:
トップレベル `scientificName` を同定整合性軸の比較元とする読み替えが妥当か。
将来 `specimen.scientificName` を Darwin Core 準拠でカタログに追加する予定が
あるかどうか。

## 3. MediaGapRecord の正本スキーマがリポジトリ内に存在しない

判断点:
SPEC は `photo_audit/missing_or_replacement_species.json` を「zukan-fetch 側の
`MediaGapRecord` 形式に沿った」形で出力するよう要求する。しかし
`MediaGapRecord` および `gapId` の定義は本リポジトリ内に存在せず
(全ツリーを検索して 0 件)、zukan-fetch skill 本体はこのリポジトリの外にある。
本 lane はネットワークアクセスと外部参照を行わない制約下にある。

検討した選択肢:

1. 出力を省略する。Must 4 の必達成果物が欠ける。
2. リポジトリ外の zukan-fetch skill を読みに行く。worktree 外へ出る操作であり、
   本セッションの制約に反する。
3. SPEC が明示する要素 (`intent` が `missing` / `replacement` / `variant_missing`
   のいずれか、`gapId` 相当の冪等 key) を満たす近似スキーマを定義し、近似である
   ことをファイル内に明記する。

実際に取った安全側の行動:
選択肢 3 を採用した。出力ファイルの先頭に `schemaNote` フィールドを置き、正本
スキーマが本リポジトリに存在しないため保守的な近似である旨を明記した。`gapId` は
`<speciesId>::<variant>::<intent>` を冪等 key とし、重複しないことを実行時に
検証している。`new_species` は本 lane では出力しない。

理由:
このファイルは後続の zukan-fetch lane (T02 / T05) の入力になるため、フィールド名が
正本とずれていると受け側で読み替えが必要になる。ただし本 lane の成果物は
再生成が容易であり、後で正本スキーマに合わせて mapping し直すコストは小さい。
出力しないより、近似であることを明示して出力する方が後続 lane にとって有益と判断した。

必要な人間の入力:
zukan-fetch 側の `MediaGapRecord` の正本フィールド定義。特に `gapId` の生成規則が
`<speciesId>::<variant>::<intent>` と互換かどうか。互換でない場合は
`outputs.py` の `build_gap_records` の該当部分のみ差し替えれば足りる。
