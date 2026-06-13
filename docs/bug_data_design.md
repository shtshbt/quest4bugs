# Bug Data Design

Quest4Bugs の昆虫図鑑は、子ども向けの見た目を保ちつつ、採集・観察者目線の高解像度な種リストを扱う。**全体目標は最低350種、最終的に500種**。蝶類は日本産ほぼ全種（約230種）を網羅し、甲虫類・その他（トンボ・セミ・直翅・カメムシ等）も一般的な子ども向け図鑑を超える充実度を目指す。

## Goals

- 種は原則として種単位で扱い、「オサムシ類」「ミドリシジミ類」のような粗いまとめを避ける。
- ゲーム内IDは固定し、学名や分類変更に耐える。
- 日本産の蝶類と甲虫類を主軸にし、海外産は特別枠として扱う。
- レア度は分類上の希少性ではなく、ゲーム内の発見感・美しさ・生態の面白さで決める。
- 注意が必要な種、外来由来の種、地域性がある種はタグで明示する。

## Taxonomy

### Lepidoptera

- Papilionidae: アゲハチョウ科
- Pieridae: シロチョウ科
- Lycaenidae: シジミチョウ科
  - Zephyrus / Theclini: ゼフィルス
  - 緑色系: ミドリシジミ、アイノミドリシジミ、メスアカミドリシジミ、エゾミドリシジミ、オオミドリシジミ
  - 赤色系: アカシジミ、ウラナミアカシジミ、チョウセンアカシジミ
  - その他: クロシジミ、ウラゴマダラシジミ、ゴイシシジミ、ミヤマシジミ
- Nymphalidae: タテハチョウ科
  - タテハ
  - ヒョウモン
  - ジャノメ
  - マダラチョウ
  - コノハチョウ系
- Hesperiidae: セセリチョウ科

### Coleoptera

- Cerambycidae: カミキリムシ科
  - 大型カミキリ
  - トラカミキリ
  - ハナカミキリ
  - ルリ・アオ系
  - 小型・渋い系
- Lucanidae: クワガタムシ科
- Scarabaeidae: コガネムシ科
- Carabidae: オサムシ科
  - オサムシ
  - ゴミムシ
  - ハンミョウ
- Buprestidae: タマムシ科
- Meloidae: ツチハンミョウ科・ゲンセイ類
- その他甲虫

## Data Schema

```js
{
  id: "aino_midorishijimi",
  jaName: "アイノミドリシジミ",
  scientificName: "Chrysozephyrus brillantinus",
  taxonRank: "species",
  order: "Lepidoptera",
  family: "Lycaenidae",
  subfamily: "Theclinae",
  tribe: "Theclini",
  familyJa: "シジミチョウ科",
  groupJa: "ゼフィルス",
  origin: "japan_native",
  rarity: "SR",
  renderer: "lycaenid",
  colors: ["#35A56B", "#2A3D2C"],
  tags: ["butterfly", "zephyrus", "forest"],
  season: ["summer"],
  habitat: ["forest"],
  caution: null,
  note: "金緑色に輝くゼフィルスの一種。",
  needsTaxonReview: false
}
```

## Field Rules

- `id`: snake_case の固定ID。学名は分類変更があり得るためIDにしない。
- `jaName`: 表示名。
- `scientificName`: 学名。未確認の場合は空文字にし、`needsTaxonReview: true` を付ける。
- `taxonRank`: 通常は `species`。亜種を扱う場合は `subspecies`。
- `origin`: `japan_native`, `introduced_established`, `overseas`, `vagrant`, `uncertain`。
- `rarity`: `N`, `R`, `SR`, `SSR`, `SS`。`SS` は海外産や特別な伝説枠に使う。
- `renderer`: SVG描画タイプ。分類と完全一致させず、見た目の型として扱う。
- `caution`: 毒・刺激・外来種などの注意。なければ `null`。
- `needsTaxonReview`: 学名や分類の確認が必要な場合は `true`。

## Priority Species

### カミキリムシ科

- ウスバカミキリ
- ノコギリカミキリ
- オオアオカミキリ
- アオカミキリ
- ヨコヤマヒゲナガカミキリ
- キトラカミキリ
- ラミーカミキリ
- ルリボシカミキリ
- コブヤハズカミキリ
- ゴマダラカミキリ
- シロスジカミキリ
- キボシカミキリ
- トラフカミキリ
- ヨツスジハナカミキリ
- ベニカミキリ
- ハンノアオカミキリ
- 小型・渋い系のカミキリを追加調査する

### シジミチョウ科

- ミドリシジミ
- アイノミドリシジミ
- メスアカミドリシジミ
- エゾミドリシジミ
- オオミドリシジミ
- ジョウザンミドリシジミ
- ハヤシミドリシジミ
- ウラジロミドリシジミ
- ヒサマツミドリシジミ
- キリシマミドリシジミ
- チョウセンアカシジミ
- アカシジミ
- ウラナミアカシジミ
- クロシジミ
- ウラゴマダラシジミ
- ゴイシシジミ
- ミヤマシジミ

### その他の蝶類

- ベニヒカゲ
- クモマベニヒカゲ
- ウスバシロチョウ / ウスバアゲハ
- ツマキチョウ
- ツマベニチョウ
- スミナガシ
- コムラサキ
- クロコノマチョウ
- ウスイロコノマチョウ
- イチモンジチョウ
- オオイチモンジ
- コミスジ
- サカハチチョウ
- ミカドアゲハ
- リュウキュウアサギマダラ
- バナナセセリ
- アオバセセリ
- ギンイチモンジセセリ
- メスアカムラサキ
- ミドリヒョウモン
- クモガタヒョウモン

### 海外特別枠

- アポロチョウ
- ブータンシボリアゲハ

## Implementation Plan

1. `keisan/index.html` の `BUGS` を `shared/bugs.js` に移す。
2. 既存48種を新スキーマへ変換する。
3. 図鑑表示を `jaName`, `rarity`, `note` ベースへ差し替える。
4. `family`, `groupJa`, `origin` でフィルタできるようにする。
5. 100種まで追加し、レア抽選を100種前提に調整する。
