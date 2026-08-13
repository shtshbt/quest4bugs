# 本編図鑑拡張 選抜 v1 (450 種、150×3 弾)

- 日付: 2026-08-12。元データ: 教科 seeds 使用可能 1,651 から直接照合の取りこぼし 30 を除いた 1,621
- 直接照合層: bugs.js 1,213 種の学名 canonical (亜属・著者除去の 2 語) + 和名 (括弧注記除去) + seed synonym を突き合わせ。reserve エンジンの catalog dedup に取りこぼし 30 件 (アゲハ、キアゲハ、カイコ、チョウセンカマキリ等) を発見したため、この層を正とする。エンジン側の索引欠陥はフォローアップ
- 順位: GBIF 頻度順 harvest の順序を代理指標に使用 (2 ラン interleave 近似)。正確な記録数での精緻化は任意の後続タスク
- 基準: 頻度順位 + 科あたり 3 種上限 + 和名一意。レアリティは既存プール比率 (SS なし)
- 写真は後追い方式 (SVG fallback 先行)。fetch 順は頻度順位昇順
- 機械可読版: zukan_foundry/data/species_reserve/honpen_selection_v1.json

## 第 1 弾 (150 種)

### keisan 50 種 (N 17 / R 18 / SR 11 / SSR 4)

| 和名 | 学名 | 目 / 科 | 頻度順位 | レア度 |
|---|---|---|---|---|
| ツンベルグナガゴミムシ | Pterostichus thunbergi A.Morawitz, 1862 | Coleoptera / Carabidae | 1 | N |
| コキベリアオゴミムシ | Chlaenius circumdatus Brullé, 1835 | Coleoptera / Carabidae | 2 | N |
| コエンマムシ | Margarinotus niponicus (Lewis, 1895) | Coleoptera / Histeridae | 3 | N |
| アトワアオゴミムシ | Chlaenius virgulifer Chaudoir, 1876 | Coleoptera / Carabidae | 4 | N |
| カタベニデオキスイ | Urophorus humeralis (Fabricius, 1798) | Coleoptera / Nitidulidae | 5 | N |
| ニンフハナカミキリ | Parastrangalis nymphula (Bates, 1884) | Coleoptera / Cerambycidae | 7 | N |
| ナミモンコケシキスイ | Cryptarcha strigata (Fabricius, 1787) | Coleoptera / Nitidulidae | 10 | N |
| オオマグソコガネ | Colobopterus quadratus (Reiche, 1850) | Coleoptera / Scarabaeidae | 12 | N |
| カシルリオトシブミ | Euops splendida Dalla Torre & Voss, 1930 | Coleoptera / Attelabidae | 13 | N |
| マメゲンゴロウ | Agabus japonicus Sharp, 1873 | Coleoptera / Dytiscidae | 15 | N |
| ルイスアシナガオトシブミ | Henicolabus lewisi Voss, 1925 | Coleoptera / Attelabidae | 16 | N |
| ヒラタハナムグリ | Nipponovalgus angusticollis (Waterhouse, 1875) | Coleoptera / Scarabaeidae | 17 | N |
| キノコヒゲナガゾウムシ | Euparius oculatus (Sharp, 1891) | Coleoptera / Anthribidae | 20 | N |
| コブマルエンマコガネ | Onthophagus atripennis Waterhouse, 1875 | Coleoptera / Scarabaeidae | 21 | N |
| マルヒメツヤドロムシ | Zaitzeviaria ovata (Nomura, 1959) | Coleoptera / Elmidae | 23 | N |
| ナガヒラタムシ | Tenomerga mucida (Chevrolat, 1844) | Coleoptera / Cupedidae | 24 | N |
| キスジトラカミキリ | Cyrtoclytus caproides (Bates, 1873) | Coleoptera / Cerambycidae | 25 | N |
| ホソスジデオキノコムシ | Ascaphium tibiale Lewis, 1893 | Coleoptera / Staphylinidae | 26 | R |
| トゲヒゲトラカミキリ | Demonax transilis Bates, 1884 | Coleoptera / Cerambycidae | 29 | R |
| クロボシヒラタシデムシ | Oiceoptoma nigropunctatum (Lewis, 1888) | Coleoptera / Staphylinidae | 32 | R |
| ヤシャゲンゴロウ | Acilius kishii Nakane, 1963 | Coleoptera / Dytiscidae | 36 | R |
| ベニモンキノコゴミムシダマシ | Platydema subfascia (Walker, 1858) | Coleoptera / Tenebrionidae | 39 | R |
| ムネスジノミゾウムシ | Orchestes amurensis J.Faust, 1887 | Coleoptera / Curculionidae | 44 | R |
| クロヘリヒメテントウ | Scymnus hoffmanni Weise, 1879 | Coleoptera / Coccinellidae | 46 | R |
| キイロクビナガハムシ | Lilioceris rugata (Baly, 1865) | Coleoptera / Chrysomelidae | 48 | R |
| キベリクロヒメゲンゴロウ | Ilybius apicalis Sharp, 1873 | Coleoptera / Dytiscidae | 50 | R |
| キボシコオニケシキスイ | Cryptarcha maculata Reitter, 1873 | Coleoptera / Nitidulidae | 52 | R |
| ドロハマキチョッキリ | Byctiscus puberulus Faust, 1890 | Coleoptera / Attelabidae | 56 | R |
| キイロチビハナケシキスイ | Heterhelus scutellaris (Heer, 1841) | Coleoptera / Kateretidae | 57 | R |
| ナガニジゴミムシダマシ | Ceropria induta (Wiedemann, 1819) | Coleoptera / Tenebrionidae | 61 | R |
| ダイミョウハネカクシ | Staphylinus daimio Sharp, 1889 | Coleoptera / Staphylinidae | 63 | R |
| オオスナゴミムシダマシ | Gonocephalum pubens | Coleoptera / Tenebrionidae | 64 | R |
| トゲバゴマフガムシ | Berosus lewisius Sharp, 1873 | Coleoptera / Hydrophilidae | 66 | R |
| アカアシノミゾウムシ | Orchestes sanguinipes W.Roelofs, 1874 | Coleoptera / Curculionidae | 75 | R |
| ダイコンサルハムシ | Phaedon brassicae Baly, 1874 | Coleoptera / Chrysomelidae | 76 | R |
| ラエビコリスネブトクワガタ | Aegus laevicollis Saunders, 1854 | Coleoptera / Lucanidae | 78 | SR |
| ドウガネツヤハムシ | Oomorphoides cupreatus | Coleoptera / Chrysomelidae | 87 | SR |
| スグリゾウムシ | Pseudocneorhinus bifasciatus Roelofs, 1880 | Coleoptera / Curculionidae | 98 | SR |
| オオサカマキムシモドキ | Laricobius osakensis Montgomery & Shiyake, 2011 | Coleoptera / Derodontidae | 103 | SR |
| キイロヒラタガムシ | Enochrus simulans (Sharp, 1873) | Coleoptera / Hydrophilidae | 108 | SR |
| コツブゲンゴロウ | Noterus japonicus Sharp, 1873 | Coleoptera / Noteridae | 109 | SR |
| ヨツボシテントウダマシ | Ancylopus pictus | Coleoptera / Endomychidae | 111 | SR |
| キマダラヒゲナガゾウムシ | Tropideres naevulus Faust, 1887 | Coleoptera / Anthribidae | 117 | SR |
| ツヤドロムシ | Zaitzevia nitida Nomura, 1963 | Coleoptera / Elmidae | 123 | SR |
| ヤノナミガタチビタマムシ | Trachys yanoi Kurosawa, 1959 | Coleoptera / Buprestidae | 130 | SR |
| キバネケシガムシ | Cercyon quisquilius (Linnaeus, 1760) | Coleoptera / Hydrophilidae | 132 | SR |
| アミダテントウ | Amida tricolor | Coleoptera / Coccinellidae | 134 | SSR |
| ツマアカヒメテントウ | Scymnus dorcatomoides Weise, 1879 | Coleoptera / Coccinellidae | 142 | SSR |
| ヨツメオサゾウムシ | Sphenocorynes ocellatus (Pascoe, 1887) | Coleoptera / Dryophthoridae | 152 | SSR |
| クズノチビタマムシ | Trachys auricollis Saunders, 1873 | Coleoptera / Buprestidae | 153 | SSR |

### kanji 50 種 (N 10 / R 19 / SR 16 / SSR 5)

| 和名 | 学名 | 目 / 科 | 頻度順位 | レア度 |
|---|---|---|---|---|
| スジボソヤマキチョウ | Gonepteryx aspasia Ménétriès, 1859 | Lepidoptera / Pieridae | 1 | N |
| ナシイラガ | Narosoideus flavidorsalis (Staudinger, 1887) | Lepidoptera / Limacodidae | 2 | N |
| タイリクコムラサキ | Apatura ilia (Denis & Schiffermüller), 1775 | Lepidoptera / Nymphalidae | 3 | N |
| セブトエダシャク | Cusiala stipitaria (Oberthür, 1880) | Lepidoptera / Geometridae | 4 | N |
| キアシドクガ | Ivela auripes Butler, 1877 | Lepidoptera / Erebidae | 5 | N |
| ウスアオエダシャク | Parabapta clarissa (Butler, 1878) | Lepidoptera / Geometridae | 6 | N |
| ウラミスシジミ | Wagimo signata (Butler, 1881) | Lepidoptera / Lycaenidae | 7 | N |
| フタオビキヨトウ | Mythimna turca Linnaeus, 1761 | Lepidoptera / Noctuidae | 8 | N |
| マエアカスカシノメイガ | Palpita nigropunctalis Bremer, 1864 | Lepidoptera / Crambidae | 9 | N |
| ムクゲコノハ | Thyas juno (Dalman, 1823) | Lepidoptera / Erebidae | 10 | N |
| ウラキンシジミ | Ussuriana stygiana (Butler, 1881) | Lepidoptera / Lycaenidae | 11 | R |
| シロスジツトガ | Crambus argyrophorus Butler, 1878 | Lepidoptera / Crambidae | 12 | R |
| シロオビノメイガ | Spoladea recurvalis (Fabricius, 1775) | Lepidoptera / Crambidae | 13 | R |
| ハミスジエダシャク | Hypomecis roboraria (Denis & Schiffermüller), 1775 | Lepidoptera / Geometridae | 14 | R |
| オオミスジ | Neptis alwina Bremer, 1853 | Lepidoptera / Nymphalidae | 15 | R |
| ジョウザンシジミ | Scolitantides orion (Pallas, 1771) | Lepidoptera / Lycaenidae | 17 | R |
| カラフトセセリ | Thymelicus lineola (Ochsenheimer, 1808) | Lepidoptera / Hesperiidae | 18 | R |
| クモマツマキチョウ | Anthocharis cardamines (Linnaeus, 1758) | Lepidoptera / Pieridae | 19 | R |
| クシヒゲシャチホコ | Ptilophora nohirae (Matsumura, 1920) | Lepidoptera / Notodontidae | 20 | R |
| ウラジャノメ | Lopinga achine (Scopoli, 1763) | Lepidoptera / Nymphalidae | 21 | R |
| カクモンヒトリ | Lemyra inaequalis (Butler, 1879) | Lepidoptera / Erebidae | 22 | R |
| キノカワガ | Blenina senex Butler, 1878 | Lepidoptera / Nolidae | 26 | R |
| セスジスカシバ | Pennisetia fixseni (Leech, 1889) | Lepidoptera / Sesiidae | 30 | R |
| スジキリヨトウ | Spodoptera depravata Butler, 1879 | Lepidoptera / Noctuidae | 33 | R |
| クロテンキリガ | Orthosia fausta Leech, 1889 | Lepidoptera / Noctuidae | 34 | R |
| ミヤマシロチョウ | Aporia hippia (Bremer, 1861) | Lepidoptera / Pieridae | 35 | R |
| クビワシャチホコ | Shaka atrovittatus (Bremer, 1861) | Lepidoptera / Notodontidae | 44 | R |
| ホソオビヒゲナガ | Nemophora aurifera Butler, 1881 | Lepidoptera / Adelidae | 45 | R |
| マツカレハ | Dendrolimus spectabilis (Butler, 1877) | Lepidoptera / Lasiocampidae | 47 | R |
| ヒトツメカギバ | Auzata superba Butler, 1878 | Lepidoptera / Drepanidae | 62 | SR |
| コトビモンシャチホコ | Drymonia japonica (Wileman, 1911) | Lepidoptera / Notodontidae | 64 | SR |
| ホソオアゲハ | Sericinus montela Gray, 1852 | Lepidoptera / Papilionidae | 67 | SR |
| ウスズミカレハ | Poecilocampa tamanukii (Matsumura, 1928) | Lepidoptera / Lasiocampidae | 70 | SR |
| ヒルガオトリバ | Emmelina argoteles (Meyrick, 1922) | Lepidoptera / Pterophoridae | 79 | SR |
| モントガリバ | Thyatira batis (Linnaeus, 1758) | Lepidoptera / Drepanidae | 87 | SR |
| マエキカギバ | Agnidra scabiosa (Butler, 1877) | Lepidoptera / Drepanidae | 91 | SR |
| ゴマフボクトウ | Zeuzera multistrigata Moore, 1881 | Lepidoptera / Cossidae | 96 | SR |
| カラフトタカネキマダラセセリ | Carterocephalus silvicola (Meigen, 1829) | Lepidoptera / Hesperiidae | 101 | SR |
| タケカレハ | Euthrix albomaculata (Bremer, 1861) | Lepidoptera / Lasiocampidae | 105 | SR |
| オオクワゴモドキ | Oberthueria falcigera Butler, 1878 | Lepidoptera / Endromidae | 114 | SR |
| イモキバガ | Helcystogramma triannulella (Herrich-Schäffer, 1854) | Lepidoptera / Gelechiidae | 116 | SR |
| ウスベニトガリメイガ | Endotricha olivacealis Bremer, 1864 | Lepidoptera / Pyralidae | 119 | SR |
| ギンボシリンガ | Ariolica argentea Butler, 1881 | Lepidoptera / Nolidae | 122 | SR |
| クロテンケンモンスズメ | Kentrochrysalis consimilis Rothschild & Jordan, 1903 | Lepidoptera / Sphingidae | 128 | SR |
| コマユミシロスガ | Yponomeuta polystigmellus (Felder, 1862) | Lepidoptera / Yponomeutidae | 132 | SR |
| ハネナガブドウスズメ | Acosmeryx naga Moore | Lepidoptera / Sphingidae | 137 | SSR |
| ウスベニヒゲナガ | Nemophora staudingerella (Christoph, 1881) | Lepidoptera / Adelidae | 157 | SSR |
| アカイラガ | Phrixolepia sericea Butler, 1877 | Lepidoptera / Limacodidae | 179 | SSR |
| アカマダラメイガ | Oncocera semirubella Scopoli, 1763 | Lepidoptera / Pyralidae | 181 | SSR |
| ブドウスズメ | Acosmeryx castanea Rothschild & Jordan, 1903 | Lepidoptera / Sphingidae | 183 | SSR |

### eitango 50 種 (N 14 / R 22 / SR 11 / SSR 3)

| 和名 | 学名 | 目 / 科 | 頻度順位 | レア度 |
|---|---|---|---|---|
| タネバエ | Delia platura (Meigen, 1826) | Diptera / Anthomyiidae | 1 | N |
| オオシマトビケラ | Macrostemum radiatum (McLachlan, 1872) | Trichoptera / Hydropsychidae | 2 | N |
| キオビツヤハナバチ | Ceratina flavipes Smith, 1879 | Hymenoptera / Apidae | 3 | N |
| ヤマトヒメハナバチ | Andrena yamato Tadauchi & Hirashima, 1983 | Hymenoptera / Andrenidae | 4 | N |
| ホソバトビケラ | Molanna moesta Banks, 1906 | Trichoptera / Molannidae | 5 | N |
| マレーシアミバエ | Bactrocera latifrons (Hendel, 1912) | Diptera / Tephritidae | 6 | N |
| ヨツメトビケラ | Perissoneura paradoxa McLachlan, 1871 | Trichoptera / Odontoceridae | 7 | N |
| マルミズムシ | Paraplea japonica (Horváth, 1904) | Hemiptera / Pleidae | 8 | N |
| ムラサキトビケラ | Eubasilissa regina (McLachlan, 1871) | Trichoptera / Phryganeidae | 9 | N |
| ナミマガリケムシヒキ | Neoitamus angusticornis (Loew, 1858) | Diptera / Asilidae | 10 | N |
| コブナナフシ | Orestes japonicus (Ho, 2016) | Phasmida / Heteropterygidae | 11 | N |
| ヤエヤマトガリナナフシ | Entoria ishigakiensis Shiraki, 1935 | Phasmida / Phasmatidae | 12 | N |
| オキナワトガリナナフシ | Entoria nuda Brunner von Wattenwyl, 1907 | Phasmida / Phasmatidae | 13 | N |
| スジイリコカマキリ | Statilia nemoralis Saussure, 1870 | Mantodea / Mantidae | 14 | N |
| クメジマエダナナフシ | Phraortes kumensis Saito, 2015 | Phasmida / Lonchodidae | 15 | R |
| ヨナグニエダナナフシ | Phraortes yonaguniensis Saito, 2015 | Phasmida / Lonchodidae | 16 | R |
| オキナワオオカマキリ | Tenodera fasciata Olivier, 1792 | Mantodea / Mantidae | 17 | R |
| アオヒゲナガトビケラ | Mystacides azureus (Linnaeus, 1761) | Trichoptera / Leptoceridae | 18 | R |
| ヒゲナガヤチバエ | Sepedon aenescens Wiedemann, 1830 | Diptera / Sciomyzidae | 19 | R |
| ツメナガナガレトビケラ | Apsilochorema sutshanum Martynov, 1934 | Trichoptera / Hydrobiosidae | 20 | R |
| ツマグロトビケラ | Phryganea japonica McLachlan, 1866 | Trichoptera / Phryganeidae | 21 | R |
| トウゴウヤブカ | Aedes togoi (Theobald, 1907) | Diptera / Culicidae | 22 | R |
| カグヤマメヒメハナバチ | Andrena kaguya Hirashima, 1965 | Hymenoptera / Andrenidae | 23 | R |
| アカガネコハナバチ | Halictus aerarius Smith, 1873 | Hymenoptera / Halictidae | 24 | R |
| ツマジロカメムシ | Menida violacea Motschulsky, 1861 | Hemiptera / Pentatomidae | 25 | R |
| キマダラヒバリ | Cardiodactylus guttulus (Matsumura, 1913) | Orthoptera / Gryllidae | 26 | R |
| ツルガハキリバチ | Megachile tsurugensis Cockerell, 1924 | Hymenoptera / Megachilidae | 27 | R |
| ケシウミアメンボ | Halovelia septentrionalis Esaki, 1926 | Hemiptera / Veliidae | 28 | R |
| エゾヒメハナバチ | Andrena ezoensis Hirashima, 1965 | Hymenoptera / Andrenidae | 29 | R |
| ミカドフキバッタ | Parapodisma mikado (Bolívar, 1890) | Orthoptera / Acrididae | 30 | R |
| トガリアメンボ | Rhagadotarsus kraepelini Breddin, 1905 | Hemiptera / Gerridae | 31 | R |
| キボシホソヘリカメムシ | Riptortus pedestris (Fabricius, 1775) | Hemiptera / Alydidae | 32 | R |
| オオハマハマダラカ | Anopheles saperoi Bohart & Ingram, 1946 | Diptera / Culicidae | 33 | R |
| サビイロカタコハナバチ | Lasioglossum mutilum (Vachal, 1903) | Hymenoptera / Halictidae | 34 | R |
| トビイロトビケラ | Nothopsyche pallipes Banks, 1906 | Trichoptera / Limnephilidae | 35 | R |
| コガタシマトビケラ | Cheumatopsyche brevilineata (Iwata, 1927) | Trichoptera / Hydropsychidae | 36 | R |
| コミズムシ | Sigara substriata (Uhler, 1897) | Hemiptera / Corixidae | 37 | SR |
| クモヘリカメムシ | Leptocorisa chinensis Dallas, 1852 | Hemiptera / Alydidae | 39 | SR |
| タンザワフキバッタ | Parapodisma tenryuensis Kobayashi, 1983 | Orthoptera / Acrididae | 40 | SR |
| ホタルトビケラ | Nothopsyche ruficollis (Ulmer, 1905) | Trichoptera / Limnephilidae | 41 | SR |
| ツノアオカメムシ | Pentatoma japonica (Distant, 1882) | Hemiptera / Pentatomidae | 42 | SR |
| エグリトビケラ | Nemotaulius admorsus (McLachlan, 1866) | Trichoptera / Limnephilidae | 43 | SR |
| チャバネヒゲナガカワトビケラ | Stenopsyche sauteri Ulmer, 1907 | Trichoptera / Stenopsychidae | 45 | SR |
| カガハナゲバエ | Dichaetomyia bibax (Wiedemann, 1830) | Diptera / Muscidae | 46 | SR |
| ヒメクダマキモドキ | Phaulula macilenta Ichikawa, 2004 | Orthoptera / Tettigoniidae | 47 | SR |
| トウヨウグマガトビケラ | Gumaga orientalis (Martynov, 1935) | Trichoptera / Sericostomatidae | 48 | SR |
| ヒロバネヒナバッタ | Stenobothrus fumatus Shiraki, 1910 | Orthoptera / Acrididae | 50 | SR |
| アカハネオンブバッタ | Atractomorpha sinensis Bolívar, 1905 | Orthoptera / Pyrgomorphidae | 51 | SSR |
| マルバネトビケラ | Phryganopsyche latipennis (Banks, 1906) | Trichoptera / Phryganopsychidae | 52 | SSR |
| オキナワヒゲナガカワトビケラ | Stenopsyche schmidi Weaver, 1987 | Trichoptera / Stenopsychidae | 53 | SSR |

## 第 2 弾 (150 種)

### keisan 50 種 (N 17 / R 18 / SR 11 / SSR 4)

| 和名 | 学名 | 目 / 科 | 頻度順位 | レア度 |
|---|---|---|---|---|
| ルリヒラタゴミムシ | Dicranoncus femoralis Chaudoir, 1850 | Coleoptera / Carabidae | 6 | N |
| コマルガタゴミムシ | Amara simplicidens A.Morawitz, 1863 | Coleoptera / Carabidae | 8 | N |
| ホソアカガネオサムシ | Carabus vanvolxemi Putzeys, 1875 | Coleoptera / Carabidae | 9 | N |
| ヒメクロトラカミキリ | Rhaphuma diminuta (Bates, 1873) | Coleoptera / Cerambycidae | 31 | N |
| ビロウドコガネ | Maladera japonica (Motschulsky, 1860) | Coleoptera / Scarabaeidae | 34 | N |
| ケブカマグソコガネ | Brachiaphodius eccoptus (Bates, 1889) | Coleoptera / Scarabaeidae | 40 | N |
| コイチャコガネ | Adoretus tenuimaculatus Waterhouse, 1875 | Coleoptera / Scarabaeidae | 43 | N |
| キバネニセハムシハナカミキリ | Lemula decipiens Bates, 1884 | Coleoptera / Cerambycidae | 45 | N |
| クロカミキリ | Spondylis buprestoides (Linnaeus, 1758) | Coleoptera / Cerambycidae | 49 | N |
| コナライクビチョッキリ | Deporaus unicolor Legalov, 2003 | Coleoptera / Attelabidae | 62 | N |
| ヤマトデオキノコムシ | Scaphidium japonum Reitter, 1877 | Coleoptera / Staphylinidae | 67 | N |
| キムネチビケシキスイ | Meligethes denticulatus (Heer, 1841) | Coleoptera / Nitidulidae | 68 | N |
| メススジゲンゴロウ | Acilius japonicus Brinck, 1939 | Coleoptera / Dytiscidae | 70 | N |
| クロヒラタケシキスイ | Ipidia variolosa | Coleoptera / Nitidulidae | 73 | N |
| ムネビロハネカクシ | Algon grandicollis Sharp, 1874 | Coleoptera / Staphylinidae | 74 | N |
| モンキゴミムシダマシ | Diaperis lewisi | Coleoptera / Tenebrionidae | 77 | N |
| キボシヒラタケシキスイ | Omosita colon (Linnaeus, 1758) | Coleoptera / Nitidulidae | 86 | N |
| スジコガシラゴミムシダマシ | Heterotarsus carinula Marseul, 1876 | Coleoptera / Tenebrionidae | 94 | R |
| ヤナギルリハムシ | Plagiodera versicolora (Laicharting, 1781) | Coleoptera / Chrysomelidae | 97 | R |
| ビロウドヒラタシデムシ | Oiceoptoma thoracicum (Linnaeus, 1758) | Coleoptera / Staphylinidae | 104 | R |
| チャイロシマチビゲンゴロウ | Nebrioporus anchoralis (Sharp, 1884) | Coleoptera / Dytiscidae | 106 | R |
| ハギルリオトシブミ | Euops lespedezae Sharp, 1889 | Coleoptera / Attelabidae | 114 | R |
| コガタルリハムシ | Gastrophysa atrocyanea Motschulsky | Coleoptera / Chrysomelidae | 121 | R |
| コスナゴミムシダマシ | Gonocephalum coriaceum Motschulsky, 1857 | Coleoptera / Tenebrionidae | 124 | R |
| キアシノミハムシ | Luperomorpha tenebrosa (Jacoby, 1885) | Coleoptera / Chrysomelidae | 126 | R |
| モンキマメゲンゴロウ | Platambus pictipennis (Sharp, 1873) | Coleoptera / Dytiscidae | 127 | R |
| イチゴハナゾウムシ | Anthonomus bisignifer S.Schenkling & Marshall G.A.K., 1934 | Coleoptera / Curculionidae | 133 | R |
| ヒゲナガオトシブミ | Paratrachelophorus longicornis Voss, 1929 | Coleoptera / Attelabidae | 137 | R |
| キベリヒラタガムシ | Enochrus japonicus (Sharp, 1873) | Coleoptera / Hydrophilidae | 154 | R |
| クロチビエンマムシ | Carcinops pumilio (Erichson, 1834) | Coleoptera / Histeridae | 163 | R |
| ホソアシナガタマムシ | Agrilus ribbei Kiesenwetter, 1879 | Coleoptera / Buprestidae | 165 | R |
| トウカイコルリクワガタ | Platycerus takakuwai Fujita, 1987 | Coleoptera / Lucanidae | 168 | R |
| ケブカクチブトゾウムシ | Lepidepistomodes fumosus (Faust, 1882) | Coleoptera / Curculionidae | 170 | R |
| キノコアカマルエンマムシ | Notodoma fungorum Lewis, 1884 | Coleoptera / Histeridae | 175 | R |
| マダラメカクシゾウムシ | Mechistocerus nipponicus Kôno, 1932 | Coleoptera / Curculionidae | 176 | R |
| ウスチャケシマキムシ | Cortinicara gibbosa (Herbst, 1793) | Coleoptera / Latridiidae | 188 | SR |
| ミゾツヤドロムシ | Zaitzevia rivalis Nomura, 1963 | Coleoptera / Elmidae | 190 | SR |
| アオムネスジタマムシ | Chrysodema dalmanni Eschcholtz, 1837 | Coleoptera / Buprestidae | 194 | SR |
| シラケナガタマムシ | Agrilus pilosovittatus Saunders, 1873 | Coleoptera / Buprestidae | 202 | SR |
| クロフナガタハナノミ | Anaspis marseuli Csiki, 1915 | Coleoptera / Scraptiidae | 203 | SR |
| ヒゲブトハナムグリ | Amphicoma pectinata (Lewis, 1895) | Coleoptera / Glaphyridae | 206 | SR |
| ルリオオキノコ | Aulacocheilus sibiricus | Coleoptera / Erotylidae | 208 | SR |
| オオマルマメエンマムシ | Gnathoncus nannetensis (Marseul, 1862) | Coleoptera / Histeridae | 218 | SR |
| シロヒゲナガゾウムシ | Platystomos sellatus Wolfrum, 1953 | Coleoptera / Anthribidae | 226 | SR |
| フタモンクロテントウ | Cryptogonus orbiculus (Gyllenhal, 1808) | Coleoptera / Coccinellidae | 237 | SR |
| ツヤナガアシドロムシ | Grouvellinus nitidus Nomura, 1963 | Coleoptera / Elmidae | 240 | SR |
| アトホシヒメテントウ | Nephus phosphorus (Lewis, 1896) | Coleoptera / Coccinellidae | 246 | SSR |
| ティティウスヒラタクワガタ | Dorcus tityus Hope, 1842 | Coleoptera / Lucanidae | 263 | SSR |
| コクロチビハナケシキスイ | Brachypterus urticae (Fabricius, 1792) | Coleoptera / Kateretidae | 275 | SSR |
| ヒメマキムシ | Stephostethus chinensis (Reitter, 1877) | Coleoptera / Latridiidae | 277 | SSR |

### kanji 50 種 (N 10 / R 19 / SR 16 / SSR 5)

| 和名 | 学名 | 目 / 科 | 頻度順位 | レア度 |
|---|---|---|---|---|
| フタホシシロエダシャク | Lomographa bimaculata (Fabricius, 1775) | Lepidoptera / Geometridae | 16 | N |
| ソトウスグロアツバ | Hydrillodes lentalis Guenée, 1854 | Lepidoptera / Erebidae | 23 | N |
| ウスアオシャク | Dindica virescens (Butler, 1878) | Lepidoptera / Geometridae | 24 | N |
| ナカウスエダシャク | Alcis angulifera (Butler, 1878) | Lepidoptera / Geometridae | 25 | N |
| ゴマシオキシタバ | Catocala nubila Butler, 1881 | Lepidoptera / Erebidae | 27 | N |
| クロスジノメイガ | Tyspanodes striata Butler, 1879 | Lepidoptera / Crambidae | 28 | N |
| アカスジシロコケガ | Cyana hamata (Walker, 1854) | Lepidoptera / Erebidae | 29 | N |
| ミヤマモンキチョウ | Colias palaeno (Linnaeus, 1761) | Lepidoptera / Pieridae | 37 | N |
| オオバコヤガ | Diarsia canescens Butler, 1878 | Lepidoptera / Noctuidae | 39 | N |
| カバスジヤガ | Sineugraphe exusta (Butler, 1878) | Lepidoptera / Noctuidae | 49 | N |
| イチジクキンウワバ | Chrysodeixis eriosoma (Doubleday, 1843) | Lepidoptera / Noctuidae | 50 | R |
| コブノメイガ | Cnaphalocrocis medinalis (Guenée, 1854) | Lepidoptera / Crambidae | 61 | R |
| マメノメイガ | Maruca vitrata (Fabricius, 1787) | Lepidoptera / Crambidae | 63 | R |
| オオルリシジミ | Shijimiaeoides divina (Fixsen, 1887) | Lepidoptera / Lycaenidae | 73 | R |
| イワカワシジミ | Artipe eryx (Linnaeus, 1771) | Lepidoptera / Lycaenidae | 85 | R |
| バイバラシロシャチホコ | Cnethodonta grisescens Staudinger, 1887 | Lepidoptera / Notodontidae | 95 | R |
| オオアオシャチホコ | Syntypistis cyanea (Leech, 1889) | Lepidoptera / Notodontidae | 110 | R |
| ヤマトカギバ | Nordstromia japonica Moore, 1877 | Lepidoptera / Drepanidae | 115 | R |
| セダカシャチホコ | Euhampsonia cristata (Butler, 1877) | Lepidoptera / Notodontidae | 127 | R |
| マサキウラナミジャノメ | Ypthima masakii Ito, 1947 | Lepidoptera / Nymphalidae | 131 | R |
| オビカギバ | Drepana curvatula (Borkhausen, 1790) | Lepidoptera / Drepanidae | 133 | R |
| ルーミスシジミ | Arhopala ganesa (Moore, 1857) | Lepidoptera / Lycaenidae | 136 | R |
| リンゴカレハ | Odonestis pruni (Linnaeus, 1758) | Lepidoptera / Lasiocampidae | 150 | R |
| ウスギヌカギバ | Macrocilix mysticata Walker, 1862 | Lepidoptera / Drepanidae | 151 | R |
| ギンモンカレハ | Somadasys brevivenis (Butler, 1885) | Lepidoptera / Lasiocampidae | 155 | R |
| イカリモンガ | Pterodecta felderi (Bremer, 1864) | Lepidoptera / Callidulidae | 185 | R |
| ヨモギネムシガ | Epiblema foenella (Linnaeus, 1758) | Lepidoptera / Tortricidae | 196 | R |
| ベニモンアオリンガ | Earias roseifera Butler, 1881 | Lepidoptera / Nolidae | 198 | R |
| クロフテングイラガ | Microleon longipalpis Butler, 1885 | Lepidoptera / Limacodidae | 201 | R |
| ヨツスジヒメシンクイ | Grapholita delineana Walker, 1863 | Lepidoptera / Tortricidae | 208 | SR |
| タイワンモンシロチョウ | Pieris canidia (Sparrman, 1768) | Lepidoptera / Pieridae | 209 | SR |
| ヨシカレハ | Euthrix potatoria (Linnaeus, 1758) | Lepidoptera / Lasiocampidae | 221 | SR |
| ヒメアトスカシバ | Nokona pernix (Leech, 1889) | Lepidoptera / Sesiidae | 223 | SR |
| オオモモブトスカシバ | Melittia sangaica Moore, 1877 | Lepidoptera / Sesiidae | 233 | SR |
| マエキリンガ | Iragaodes nobilis Staudinger, 1887 | Lepidoptera / Nolidae | 248 | SR |
| ケブカヒゲナガ | Adela praepilosa Hirowatari, 1997 | Lepidoptera / Adelidae | 266 | SR |
| アトキハマキ | Archips audax Razowski, 1977 | Lepidoptera / Tortricidae | 274 | SR |
| コウトウシロシタセセリ | Tagiades trebellius (Hopffer, 1874) | Lepidoptera / Hesperiidae | 276 | SR |
| クロツバメ | Histia flabellicornis (Fabricius, 1775) | Lepidoptera / Zygaenidae | 277 | SR |
| アカスカシバ | Nokona rubra Arita & Toševski, 1992 | Lepidoptera / Sesiidae | 279 | SR |
| アミメリンガ | Sinna extrema Walker, 1854 | Lepidoptera / Nolidae | 299 | SR |
| オオシロモンセセリ | Udaspes folus (Cramer, 1775) | Lepidoptera / Hesperiidae | 300 | SR |
| クロハネシロヒゲナガ | Nemophora albiantennella Issiki, 1930 | Lepidoptera / Adelidae | 333 | SR |
| オオウスベニトガリメイガ | Endotricha icelusalis Walker, 1859 | Lepidoptera / Pyralidae | 334 | SR |
| ヒサゴスズメ | Mimas christophi Staudinger, 1887 | Lepidoptera / Sphingidae | 346 | SR |
| エゾギクトリバ | Platyptilia farfarellus Zeller, 1867 | Lepidoptera / Pterophoridae | 354 | SSR |
| トビイロシマメイガ | Hypsopygia regina Butler, 1879 | Lepidoptera / Pyralidae | 363 | SSR |
| オキナワルリチラシ | Eterusia aedea (Clerck, 1759) | Lepidoptera / Zygaenidae | 367 | SSR |
| シダエダシャク | Petrophora chlorosata (Scopoli, 1763) | Lepidoptera / Pterophoridae | 371 | SSR |
| ミスジビロードスズメ | Rhagastis trilineata Matsumura, 1921 | Lepidoptera / Sphingidae | 372 | SSR |

### eitango 50 種 (N 14 / R 22 / SR 11 / SSR 3)

| 和名 | 学名 | 目 / 科 | 頻度順位 | レア度 |
|---|---|---|---|---|
| シロヤヨイヒメハナバチ | Andrena luridiloma Strand, 1915 | Hymenoptera / Andrenidae | 38 | N |
| キバナヒメハナバチ | Andrena knuthi Alfken, 1900 | Hymenoptera / Andrenidae | 44 | N |
| マメヒメハナバチ | Andrena minutula (Kirby, 1802) | Hymenoptera / Andrenidae | 49 | N |
| オオトビサシガメ | Isyndus obscurus (Dallas, 1850) | Hemiptera / Reduviidae | 54 | N |
| キマダラシマトビケラ | Diplectrona japonica (Banks, 1906) | Trichoptera / Hydropsychidae | 55 | N |
| オオメカメムシ | Geocoris varius (Uhler, 1860) | Hemiptera / Geocoridae | 56 | N |
| アメリカカクスイトビケラ | Brachycentrus americanus (Banks, 1899) | Trichoptera / Brachycentridae | 57 | N |
| ヤマトヤブカ | Aedes japonicus (Theobald, 1901) | Diptera / Culicidae | 58 | N |
| ギンランキマダラハナバチ | Nomada ginran Tsuneki, 1973 | Hymenoptera / Apidae | 60 | N |
| ヒメフンバエ | Scathophaga stercoraria (Linnaeus, 1758) | Diptera / Scathophagidae | 61 | N |
| リュウキュウハグロトンボ | Matrona japonica (Förster, 1897) | Odonata / Calopterygidae | 63 | N |
| クサヒバリ | Svistella bifasciata (Shiraki, 1911) | Orthoptera / Trigonidiidae | 64 | N |
| ヤニサシガメ | Velinus nodipes (Uhler, 1860) | Hemiptera / Reduviidae | 65 | N |
| コバネヒシバッタ | Formosatettix larvatus Bey-Bienko, 1951 | Orthoptera / Tetrigidae | 66 | N |
| ヤマトアブ | Tabanus rufidens Bigot, 1887 | Diptera / Tabanidae | 67 | R |
| ルリチュウレンジ | Arge similis (Vollenhoven, 1860) | Hymenoptera / Argidae | 68 | R |
| ヒメツノカメムシ | Elasmucha putoni Scott, 1874 | Hemiptera / Acanthosomatidae | 69 | R |
| クスベニヒラタカスミカメ | Mansoniella cinnamomi | Hemiptera / Miridae | 70 | R |
| カラスヤンマ | Chlorogomphus brunneus Oguma, 1926 | Odonata / Chlorogomphidae | 71 | R |
| タイワンハネナガイナゴ | Oxya chinensis (Thunberg, 1815) | Orthoptera / Acrididae | 72 | R |
| カワムラナガレトビケラ | Rhyacophila kawamurae Tsuda, 1940 | Trichoptera / Rhyacophilidae | 73 | R |
| キンパラナガハシカ | Tripteroides bambusa (Yamada, 1917) | Diptera / Culicidae | 74 | R |
| マルシラホシカメムシ | Eysarcoris guttigerus (Thunberg, 1783) | Hemiptera / Pentatomidae | 75 | R |
| ハネナシコロギス | Nippancistroger testaceus (Matsumura & Shiraki, 1908) | Orthoptera / Gryllacrididae | 76 | R |
| ミカンミドリアブラムシ | Aphis spiraecola Patch, 1914 | Hemiptera / Aphididae | 77 | R |
| ダイトウクダマキモドキ | Phaulula daitoensis (Matsumura & Shiraki, 1908) | Orthoptera / Tettigoniidae | 78 | R |
| トランスクィラナガレトビケラ | Rhyacophila transquilla Tsuda, 1940 | Trichoptera / Rhyacophilidae | 79 | R |
| ノミバッタ | Xya japonica (Haan, 1844) | Orthoptera / Tridactylidae | 81 | R |
| スキバツリアブ | Villa limbata (Coquillett, 1898) | Diptera / Bombyliidae | 82 | R |
| ホソクビツユムシ | Shirakisotima japonica (Matsumura & Shiraki, 1908) | Orthoptera / Tettigoniidae | 83 | R |
| イネクロカメムシ | Scotinophara lurida (Burmeister, 1834) | Hemiptera / Pentatomidae | 84 | R |
| クロツヤハナバチ | Ceratina megastigmata Yasumatsu & Hirashima, 1969 | Hymenoptera / Apidae | 85 | R |
| ミヤケミズムシ | Xenocorixa vittipennis (Horváth, 1879) | Hemiptera / Corixidae | 86 | R |
| コナカハグロトンボ | Euphaea yayeyamana Matsmura, 1913 | Odonata / Euphaeidae | 87 | R |
| クロツツトビケラ | Uenoa tokunagai Iwata, 1927 | Trichoptera / Uenoidae | 88 | R |
| コガタウスバキトビケラ | Limnephilus quadratus Martynov, 1914 | Trichoptera / Limnephilidae | 89 | R |
| ウエノナガレトビケラ | Rhyacophila retracta Martynov, 1914 | Trichoptera / Rhyacophilidae | 90 | SR |
| ヤセヒシバッタ | Tetrix macilenta Ichikawa, 1993 | Orthoptera / Tetrigidae | 91 | SR |
| フタモンカタコハナバチ | Lasioglossum scitulum (Smith, 1873) | Hymenoptera / Halictidae | 92 | SR |
| ヘリグロツユムシ | Psyrana japonica (Shiraki, 1930) | Orthoptera / Tettigoniidae | 93 | SR |
| ゴマフトビケラ | Semblis melaleuca (McLachlan, 1871) | Trichoptera / Phryganeidae | 94 | SR |
| ハルササハマダラミバエ | Paragastrozona japonica (Miyake, 1919) | Diptera / Tephritidae | 95 | SR |
| イナゴモドキ | Mecostethus parapleurus (Hagenbach, 1822) | Orthoptera / Acrididae | 96 | SR |
| エンモンエグリトビケラ | Limnephilus sericeus (Say, 1824) | Trichoptera / Limnephilidae | 97 | SR |
| ヤノトガリハナバチ | Coelioxys yanonis Matsumura, 1912 | Hymenoptera / Megachilidae | 98 | SR |
| バラハキリバチ | Megachile nipponica Cockerell, 1914 | Hymenoptera / Megachilidae | 99 | SR |
| アカアシホソバッタ | Stenocatantops mistshenkoi Willemse, 1968 | Orthoptera / Acrididae | 100 | SR |
| コマツモムシ | Anisops ogasawarensis Matsumura, 1915 | Hemiptera / Notonectidae | 101 | SSR |
| ベニモンツノカメムシ | Elasmostethus humeralis Jakovlev, 1883 | Hemiptera / Acanthosomatidae | 104 | SSR |
| ニホンカブラハバチ | Athalia japonica (Klug, 1915) | Hymenoptera / Tenthredinidae | 105 | SSR |

## 第 3 弾 (150 種)

### keisan 50 種 (N 17 / R 18 / SR 11 / SSR 4)

| 和名 | 学名 | 目 / 科 | 頻度順位 | レア度 |
|---|---|---|---|---|
| マルガタナガゴミムシ | Pterostichus subovatus (Motschulsky, 1861) | Coleoptera / Carabidae | 11 | N |
| トックリゴミムシ | Oodes desertus Motschulsky, 1858 | Coleoptera / Carabidae | 14 | N |
| ミズアトキリゴミムシ | Apristus grandis Andrewes, 1937 | Coleoptera / Carabidae | 18 | N |
| ヒメスジコガネ | Mimela flavilabris (Waterhouse, 1875) | Coleoptera / Scarabaeidae | 51 | N |
| ハイイロビロウドコガネ | Paraserica grisea (Motschulsky, 1866) | Coleoptera / Scarabaeidae | 53 | N |
| ヨナグニゴマフカミキリ | Agelasta yonaguni (Hayashi, 1962) | Coleoptera / Cerambycidae | 54 | N |
| マメダルマコガネ | Panelus parvulus (Waterhouse, 1874) | Coleoptera / Scarabaeidae | 59 | N |
| マルガタハナカミキリ | Pachytodes cometes (Bates, 1884) | Coleoptera / Cerambycidae | 69 | N |
| ヒゲナガゴマフカミキリ | Palimna liturata (Bates, 1884) | Coleoptera / Cerambycidae | 72 | N |
| ナガコゲチャケシキスイ | Amphicrossus lewisi Reitter, 1873 | Coleoptera / Nitidulidae | 112 | N |
| オオモモブトシデムシ | Necrodes littoralis (Linnaeus, 1758) | Coleoptera / Staphylinidae | 119 | N |
| ケシゲンゴロウ | Hyphydrus japonicus Sharp, 1873 | Coleoptera / Dytiscidae | 129 | N |
| アオカメノコハムシ | Cassida rubiginosa Müller, 1776 | Coleoptera / Chrysomelidae | 138 | N |
| ジュンサイハムシ | Galerucella nipponensis (Laboissiere, 1922) | Coleoptera / Chrysomelidae | 140 | N |
| コクロシデムシ | Ptomascopus morio Kraatz, 1877 | Coleoptera / Staphylinidae | 147 | N |
| ツブゲンゴロウ | Laccophilus difficilis Sharp, 1873 | Coleoptera / Dytiscidae | 157 | N |
| ヒゲブトゴミムシダマシ | Luprops orientalis (Motschulsky, 1868) | Coleoptera / Tenebrionidae | 161 | N |
| イチゴハムシ | Galerucella grisescens (Joannis, 1865) | Coleoptera / Chrysomelidae | 166 | R |
| ヒメコブオトシブミ | Phymatapoderus pavens Voss, 1926 | Coleoptera / Attelabidae | 169 | R |
| クロツヤキノコゴミムシダマシ | Platydema nigroaenea Motschulsky, 1861 | Coleoptera / Tenebrionidae | 171 | R |
| アオツヤキノコゴミムシダマシ | Platydema marseuli Lewis, 1894 | Coleoptera / Tenebrionidae | 173 | R |
| ヘリグロヒラタケシキスイ | Omosita discoidea (Fabricius, 1775) | Coleoptera / Nitidulidae | 180 | R |
| カメノコデオキノコムシ | Cyparium mikado Achard, 1923 | Coleoptera / Staphylinidae | 182 | R |
| アイノカツオゾウムシ | Lixus maculatus Roelofs, 1873 | Coleoptera / Curculionidae | 184 | R |
| クロズマメゲンゴロウ | Agabus conspicuus Sharp, 1873 | Coleoptera / Dytiscidae | 189 | R |
| マルキマダラケシキスイ | Stelidota multiguttata Reitter, 1877 | Coleoptera / Nitidulidae | 195 | R |
| クロカレキゾウムシ | Acicnemis albofasciata Zherikhin & Egorov, 1990 | Coleoptera / Curculionidae | 196 | R |
| ヒシモンナガタマムシ | Agrilus discalis Saunders, 1873 | Coleoptera / Buprestidae | 207 | R |
| ナミガタチビタマムシ | Trachys griseofasciatus Saunders, 1873 | Coleoptera / Buprestidae | 222 | R |
| ルリエンマムシ | Saprinus splendens (Paykull, 1811) | Coleoptera / Histeridae | 224 | R |
| クロコブゾウムシ | Niphades variegatus J.Faust, 1890 | Coleoptera / Curculionidae | 230 | R |
| エンマムシ | Merohister jekeli (Marseul, 1857) | Coleoptera / Histeridae | 233 | R |
| ウグイスナガタマムシ | Agrilus tempestivus Lewis, 1893 | Coleoptera / Buprestidae | 251 | R |
| ムツモンオトシブミ | Apoderus praecellens Sharp, 1889 | Coleoptera / Attelabidae | 266 | R |
| セアカヒメオトシブミ | Apoderus geminus Sharp, 1889 | Coleoptera / Attelabidae | 267 | R |
| オオオバボタル | Lucidina accensa Gorham, 1883 | Coleoptera / Lampyridae | 280 | SR |
| ホソヒメツヤドロムシ | Zaitzeviaria gotoi (Nomura, 1959) | Coleoptera / Elmidae | 281 | SR |
| キスイモドキ | Byturus affinis Reitter, 1874 | Coleoptera / Byturidae | 284 | SR |
| トホシオサゾウムシ | Aplotes roelofsi L.A.A.Chevrolat, 1885 | Coleoptera / Dryophthoridae | 288 | SR |
| ミツギリゾウムシ | Baryrhynchus poweri Roelofs, 1879 | Coleoptera / Brentidae | 295 | SR |
| コガシラミズムシ | Peltodytes intermedius (Sharp, 1873) | Coleoptera / Haliplidae | 297 | SR |
| クロツヤテントウ | Serangium japonicum Chapin, 1940 | Coleoptera / Coccinellidae | 298 | SR |
| カラカネハマベエンマムシ | Hypocaccus lewisii (J.E.F.Schmidt, 1890) | Coleoptera / Histeridae | 299 | SR |
| キスジミゾドロムシ | Ordobrevia foveicollis (Schönfeldt, 1888) | Coleoptera / Elmidae | 308 | SR |
| セモンホソオオキノコ | Dacne picta Crotch, 1873 | Coleoptera / Erotylidae | 314 | SR |
| ノコギリホソカタムシ | Endophloeus serratus Sharp, 1885 | Coleoptera / Zopheridae | 323 | SR |
| タイショウオオキノコ | Episcapha morawitzi | Coleoptera / Erotylidae | 325 | SSR |
| ハレヤヒメテントウ | Sasajiscymnus hareja (Weise, 1879) | Coleoptera / Coccinellidae | 327 | SSR |
| コミズスマシ | Gyrinus curtus Motschulsky, 1866 | Coleoptera / Gyrinidae | 328 | SSR |
| トビイロマルハナノミ | Scirtes japonicus Kiesenwetter, 1874 | Coleoptera / Scirtidae | 331 | SSR |

### kanji 50 種 (N 10 / R 19 / SR 16 / SSR 5)

| 和名 | 学名 | 目 / 科 | 頻度順位 | レア度 |
|---|---|---|---|---|
| ウスキツバメエダシャク | Ourapteryx nivea (Butler, 1883) | Lepidoptera / Geometridae | 31 | N |
| チャオビコバネナミシャク | Trichopteryx terranea (Butler, 1878) | Lepidoptera / Geometridae | 32 | N |
| モンシロツマキリエダシャク | Xerodes albonotaria (Bremer, 1864) | Lepidoptera / Geometridae | 36 | N |
| キハラゴマダラヒトリ | Spilosoma lubricipeda (Linnaeus, 1758) | Lepidoptera / Erebidae | 41 | N |
| クロキシタアツバ | Hypena amica Butler, 1878 | Lepidoptera / Erebidae | 48 | N |
| クロクモヤガ | Hermonassa cecilia Butler, 1878 | Lepidoptera / Noctuidae | 51 | N |
| フタスジヨトウ | Protomiselia bilinea Hampson, 1905 | Lepidoptera / Noctuidae | 54 | N |
| ヒメサビスジヨトウ | Athetis stellata Moore, 1882 | Lepidoptera / Noctuidae | 55 | N |
| スジベニコケガ | Barsine striata (Bremer & Grey, 1852) | Lepidoptera / Erebidae | 69 | N |
| モンキクロノメイガ | Herpetogramma luctuosalis Guenée, 1854 | Lepidoptera / Crambidae | 71 | N |
| ホシオビホソノメイガ | Nomis albopedalis Motschulsky, 1861 | Lepidoptera / Crambidae | 78 | R |
| シバツトガ | Parapediasia teterellus Zincken, 1821 | Lepidoptera / Crambidae | 81 | R |
| オオトビモンシャチホコ | Phalerodonta manleyi (Leech, 1889) | Lepidoptera / Notodontidae | 130 | R |
| ウスアオオナガウラナミシジミ | Catochrysops panormus (Felder, 1860) | Lepidoptera / Lycaenidae | 144 | R |
| オオエグリシャチホコ | Pterostoma gigantina Staudinger, 1892 | Lepidoptera / Notodontidae | 145 | R |
| ヒメウラナミシジミ | Prosotas nora (Felder, 1860) | Lepidoptera / Lycaenidae | 148 | R |
| カバイロシジミ | Glaucopsyche lycormas (Butler, 1866) | Lepidoptera / Lycaenidae | 149 | R |
| フタテンシロカギバ | Ditrigona virgo (Butler, 1878) | Lepidoptera / Drepanidae | 156 | R |
| ヤスジシャチホコ | Epodonta lineata (Oberthür, 1880) | Lepidoptera / Notodontidae | 164 | R |
| アカウラカギバ | Oreta insignis (Butler, 1877) | Lepidoptera / Drepanidae | 213 | R |
| アヤトガリバ | Habrosyne pyritoides Hufnagel, 1767 | Lepidoptera / Drepanidae | 241 | R |
| プライヤハマキ | Acleris affinatana (Snellen, 1883) | Lepidoptera / Tortricidae | 282 | R |
| ヒメカレハ | Phyllodesma japonica (Leech, 1888) | Lepidoptera / Lasiocampidae | 291 | R |
| クヌギカレハ | Kunugia undans (Walker, 1855) | Lepidoptera / Lasiocampidae | 295 | R |
| トビモンコハマキ | Diplocalyptis congruentana (Kennel, 1901) | Lepidoptera / Tortricidae | 307 | R |
| ヨモギオオホソハマキ | Phtheochroides clandestina Razowski, 1968 | Lepidoptera / Tortricidae | 313 | R |
| ハネモンリンガ | Kerala decipiens Butler, 1879 | Lepidoptera / Nolidae | 369 | R |
| タイワンアオバセセリ | Badamia exclamationis (Fabricius, 1775) | Lepidoptera / Hesperiidae | 375 | R |
| アサマスカシバ | Sesia yezoensis (Hampson, 1919) | Lepidoptera / Sesiidae | 377 | R |
| カクバネヒゲナガキバガ | Lecitholaxa thiodora (Meyrick, 1914) | Lepidoptera / Lecithoceridae | 382 | SR |
| フクズミコスカシバ | Synanthedon fukuzumii Špatenka & Arita, 1992 | Lepidoptera / Sesiidae | 383 | SR |
| ナカムラサキフトメイガ | Lista ficki Christoph, 1881 | Lepidoptera / Pyralidae | 386 | SR |
| アカオビリンガ | Gelastocera exusta Butler, 1877 | Lepidoptera / Nolidae | 389 | SR |
| ヒメアサギマダラ | Parantica aglea (Stoll, 1782) | Lepidoptera / Nymphalidae | 401 | SR |
| ブドウトリバ | Nippoptilia vitis (Sasaki, 1913) | Lepidoptera / Pterophoridae | 405 | SR |
| アカマエアオリンガ | Earias pudicana Staudinger, 1887 | Lepidoptera / Nolidae | 410 | SR |
| タカネコヒゲナガ | Nemophora ochsenheimerella (Hübner, 1816) | Lepidoptera / Adelidae | 411 | SR |
| ゴマフヒゲナガ | Nemophora raddei Rebel, 1901 | Lepidoptera / Adelidae | 414 | SR |
| イヌビワオオハマキモドキ | Saptha divitiosa Walker, 1864 | Lepidoptera / Choreutidae | 450 | SR |
| マダラマルハヒロズコガ | Ippa conspersa (Matsumura, 1931) | Lepidoptera / Tineidae | 458 | SR |
| ヒトスジコスカシバ | Synanthedon multitarsus Špatenka & Arita, 1992 | Lepidoptera / Sesiidae | 463 | SR |
| タカムクカレハ | Cosmotriche lobulina (Denis & Schiffermüller), 1775 | Lepidoptera / Lasiocampidae | 466 | SR |
| テツイロビロウドセセリ | Hasora badra (Moore, 1857) | Lepidoptera / Hesperiidae | 472 | SR |
| サカキツヤコガ | Antispila cleyerella | Lepidoptera / Heliozelidae | 475 | SR |
| シロスジベニマルハキバガ | Promalactis enopisema (Butler, 1879) | Lepidoptera / Oecophoridae | 489 | SR |
| チビトビモントリバ | Bipunctiphorus dissipata (Yano, 1963) | Lepidoptera / Pterophoridae | 499 | SSR |
| アカフツヅリガ | Lamoria glaucalis Caradja, 1925 | Lepidoptera / Pyralidae | 501 | SSR |
| ウスマダラオオヒロズコガ | Morophaga fasciculata Robinson, 1986 | Lepidoptera / Tineidae | 514 | SSR |
| ウスキヒゲナガ | Nematopogon distincta Yasuda, 1957 | Lepidoptera / Adelidae | 519 | SSR |
| ヒメクチバスズメ | Marumba jankowskii Oberthür, 1880 | Lepidoptera / Sphingidae | 535 | SSR |

### eitango 50 種 (N 14 / R 22 / SR 11 / SSR 3)

| 和名 | 学名 | 目 / 科 | 頻度順位 | レア度 |
|---|---|---|---|---|
| ツヤマメヒメハナバチ | Andrena sublevigata Hirashima, 1966 | Hymenoptera / Andrenidae | 59 | N |
| ミツクリフシダカヒメハナバチ | Andrena japonica (Smith, 1873) | Hymenoptera / Andrenidae | 62 | N |
| ワタセヒメハナバチ | Andrena watasei Cockerell, 1913 | Hymenoptera / Andrenidae | 80 | N |
| シブイロカヤキリ | Xestophrys javanicus Redtenbacher, 1891 | Orthoptera / Tettigoniidae | 102 | N |
| クレメンスナガレトビケラ | Rhyacophila clemens Tsuda, 1940 | Trichoptera / Rhyacophilidae | 103 | N |
| アカムシユスリカ | Propsilocerus akamusi (Tokunaga, 1938) | Diptera / Chironomidae | 106 | N |
| ミヤコキンカメムシ | Lampromicra miyakona (Matsumura, 1905) | Hemiptera / Scutelleridae | 107 | N |
| キオビホオナガスズメバチ | Dolichovespula media (Retz., 1783) | Hymenoptera / Vespidae | 108 | N |
| ムスジイトトンボ | Paracercion melanotum (Selys, 1876) | Odonata / Coenagrionidae | 109 | N |
| イブキヒメギス | Eobiana japonica (Bolívar, 1890) | Orthoptera / Tettigoniidae | 110 | N |
| キバラヘリカメムシ | Plinachtus bicoloripes Scott, 1874 | Hemiptera / Coreidae | 111 | N |
| ウスグモスズ | Amusurgus genji (Furukawa, 1970) | Orthoptera / Trigonidiidae | 112 | N |
| シコツナガレトビケラ | Rhyacophila shikotsuensis Iwata, 1927 | Trichoptera / Rhyacophilidae | 113 | N |
| ツヤマルシラホシカメムシ | Eysarcoris annamita | Hemiptera / Pentatomidae | 114 | N |
| クロサナエ | Davidius fujiama Fraser, 1936 | Odonata / Gomphidae | 115 | R |
| アカシマサシガメ | Haematoloecha nigrorufa (Stål, 1867) | Hemiptera / Reduviidae | 116 | R |
| キンイロヤブカ | Aedes vexans (Meigen, 1830) | Diptera / Culicidae | 117 | R |
| エビイロカメムシ | Gonopsis affinis | Hemiptera / Pentatomidae | 118 | R |
| ツヤヒラタハバチ | Onycholyda lucida (Rohwer, 1910) | Hymenoptera / Pamphiliidae | 120 | R |
| ニッポンコハナバチ | Lasioglossum nipponense (Hirashima, 1953) | Hymenoptera / Halictidae | 121 | R |
| リュウキュウベニイトトンボ | Ceriagrion auranticum Fraser, 1922 | Odonata / Coenagrionidae | 122 | R |
| ダーラスナガカメムシ | Neolethaeus dallasi (Scott, 1874) | Hemiptera / Rhyparochromidae | 123 | R |
| オオフタオビドロバチ | Anterhynchium flavomarginatum (Smith, 1852) | Hymenoptera / Eumenidae | 124 | R |
| オオセスジイトトンボ | Paracercion plagiosum (Needham, 1929) | Odonata / Coenagrionidae | 125 | R |
| ムモンウスバキトビケラ | Limnephilus diphyes McLachlan, 1880 | Trichoptera / Limnephilidae | 126 | R |
| クロバネツリアブ | Ligyra tantalus (Fabricius, 1794) | Diptera / Bombyliidae | 127 | R |
| シワクシケアリ | Myrmica kotokui Forel, 1911 | Hymenoptera / Formicidae | 128 | R |
| ミヤマサナエ | Anisogomphus maacki (Selys, 1872) | Odonata / Gomphidae | 129 | R |
| セスジハリバエ | Tachina nupta (Rondani, 1859) | Diptera / Tachinidae | 130 | R |
| リュウキュウアブラゼミ | Graptopsaltria bimaculata Kato, 1925 | Hemiptera / Cicadidae | 131 | R |
| キタササキリモドキ | Tettigoniopsis forcipicercus Yamasaki, 1982 | Orthoptera / Tettigoniidae | 132 | R |
| ユキエグリトビケラ | Chilostigma sieboldi McLachlan, 1876 | Trichoptera / Limnephilidae | 133 | R |
| ミカンコミバエ | Bactrocera dorsalis (Hendel, 1912) | Diptera / Tephritidae | 134 | R |
| オオハラビロトンボ | Lyriothemis elegantissima Selys, 1883 | Odonata / Libellulidae | 135 | R |
| オオモンシロナガカメムシ | Metochus abbreviatus Scott, 1874 | Hemiptera / Rhyparochromidae | 136 | R |
| ケーベルハバチ | Stromboceros koebelei Rohwer, 1910 | Hymenoptera / Tenthredinidae | 137 | R |
| ハラボソトンボ | Orthetrum sabina (Drury, 1773) | Odonata / Libellulidae | 138 | SR |
| ハイイロチビミズムシ | Micronecta sahlbergi (Jakovlev, 1881) | Hemiptera / Micronectidae | 139 | SR |
| スミスハキリバチ | Megachile humilis Smith, 1879 | Hymenoptera / Megachilidae | 140 | SR |
| ヒメクロサナエ | Lanthus fujiacus (Fraser, 1936) | Odonata / Gomphidae | 141 | SR |
| ハナダカカメムシ | Dybowskyia reticulata (Dallas, 1851) | Hemiptera / Pentatomidae | 142 | SR |
| キボシアシナガバチ | Polistes nipponensis Perkins, 1905 | Hymenoptera / Eumenidae | 143 | SR |
| ウシアブ | Tabanus trigonus Coquillett, 1898 | Diptera / Tabanidae | 145 | SR |
| タイリクアキアカネ | Sympetrum depressiusculum (Selys, 1841) | Odonata / Libellulidae | 147 | SR |
| ムネカクトビケラ | Ecnomus tenellus (Rambur, 1842) | Trichoptera / Ecnomidae | 148 | SR |
| ニッポンシロフアブ | Tabanus nipponicus Murdoch & Takahasi, 1969 | Diptera / Tabanidae | 149 | SR |
| ハラアカナナホシキンカメムシ | Calliphara nobilis (Linnaeus, 1763) | Hemiptera / Scutelleridae | 150 | SR |
| オオコシアカハバチ | Siobla ferox (Smith, 1874) Smith, 1874 | Hymenoptera / Tenthredinidae | 151 | SSR |
| ヒゲシロスズ | Polionemobius flavoantennalis (Shiraki, 1911) | Orthoptera / Trigonidiidae | 153 | SSR |
| アワダチソウグンバイ | Corythucha marmorata (Uhler, 1878) | Hemiptera / Tingidae | 154 | SSR |

