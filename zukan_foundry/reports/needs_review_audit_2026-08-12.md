# needs_review 監査 (教科 seeds 219 件)

- 日付: 2026-08-12
- 対象: seeds.jsonl 2,300 件の offline 判定で needs_review となった 219 件。理由は全件 fuzzy_similarity (reserve 内の学名類似ペア)
- 監査の問い: 各ペアは「別種 (両方前進可)」か「同一種の重複 (片方 reject)」か
- 振り分け基準: 和名が同一、または種小名の類似度 > 0.85 を「真の重複疑い (B 群)」、それ以外 (和名も種小名も別) を「別種見込み (A 群)」とした

## A 群: 別種見込み 214 件 — 一括クリア推奨

和名も種小名も異なる近縁ペア。fuzzy 検出器が学名全文字列 (著者名含む) の類似に反応したもの。

| 対象 | 相手 | score |
|---|---|---|
| Tenodera angustipennis Saussure, 1869 [カマキリ] | Statilia maculata Thunberg, 1784 [コカマキリ] | 0.89 |
| Phraortes yonaguniensis Saito, 2015 [ヨナグニエダナナフシ] | Phraortes kumensis Saito, 2015 [クメジマエダナナフシ] | 0.86 |
| Halovelia septentrionalis Esaki, 1926 [ケシウミアメンボ] | Halobates japonicus Esaki, 1924 [ウミアメンボ] | 0.86 |
| Pentatoma japonica (Distant, 1882) [ツノアオカメムシ] | Glaucias subpunctatus (Walker, 1867) [ツヤアオカメムシ] | 0.88 |
| Carabus vanvolxemi Putzeys, 1875 [ホソアカガネオサムシ] | Carabus granulatus Linnaeus, 1758 [アカガネオサムシ] | 0.89 |
| Andrena sublevigata Hirashima, 1966 [ツヤマメヒメハナバチ] | Andrena kaguya Hirashima, 1965 [カグヤマメヒメハナバチ] | 0.86 |
| Agabus japonicus Sharp, 1873 [マメゲンゴロウ] | Rhantus suturalis (W.S.MacLeay, 1825) [ヒメゲンゴロウ] | 0.86 |
| Anisops ogasawarensis Matsumura, 1915 [コマツモムシ] | Notonecta triguttata Motschulsky, 1861 [マツモムシ] | 0.91 |
| Wagimo signata (Butler, 1881) [ウラミスシジミ] | Lampides boeticus (Linnaeus, 1767) [ウラナミシジミ] | 0.86 |
| Paracercion melanotum (Selys, 1876) [ムスジイトトンボ] | Paracercion hieroglyphicum (Brauer, 1865) [セスジイトトンボ] | 0.88 |
| Eysarcoris annamita [ツヤマルシラホシカメムシ] | Eysarcoris guttigerus (Thunberg, 1783) [マルシラホシカメムシ] | 0.91 |
| Haematoloecha nigrorufa (Stål, 1867) [アカシマサシガメ] | Sphedanolestes impressicollis (Stål, 1861) [シマサシガメ] | 0.86 |
| Pterostichus adstrictus Eschscholtz, 1823 [エゾマルガタナガゴミムシ] | Pterostichus subovatus (Motschulsky, 1861) [マルガタナガゴミムシ] | 0.91 |
| Paracercion plagiosum (Needham, 1929) [オオセスジイトトンボ] | Paracercion hieroglyphicum (Brauer, 1865) [セスジイトトンボ] | 0.89 |
| Anisogomphus maacki (Selys, 1872) [ミヤマサナエ] | Asiagomphus melaenops (Selys, 1854) [ヤマサナエ] | 0.91 |
| Chilostigma sieboldi McLachlan, 1876 [ユキエグリトビケラ] | Nemotaulius admorsus (McLachlan, 1866) [エグリトビケラ] | 0.88 |
| Synuchus melantho (Bates, 1883) [コクロツヤヒラタゴミムシ] | Synuchus nitidus (Motschulsky, 1862) [オオクロツヤヒラタゴミムシ] | 0.88 |
| Lyriothemis elegantissima Selys, 1883 [オオハラビロトンボ] | Lyriothemis pachygastra (Selys, 1878) [ハラビロトンボ] | 0.88 |
| Polistes nipponensis Perkins, 1905 [キボシアシナガバチ] | Polistes rothneyi Cameron, 1900 [キアシナガバチ] | 0.88 |
| Eysarcoris ventralis (Westwood, 1837) [シラホシカメムシ] | Eysarcoris guttigerus (Thunberg, 1783) [マルシラホシカメムシ] | 0.89 |
| Andrena hikosana Hirashima, 1957 [ヒコサンマメヒメハナバチ] | Andrena tsukubana Hirashima, 1957 [コガタウツギヒメハナバチ] | 0.86 |
| Nomada okubira Tsuneki, 1973 [コキマダラハナバチ] | Nomada ginran Tsuneki, 1973 [ギンランキマダラハナバチ] | 0.87 |
| Ussuriana stygiana (Butler, 1881) [ウラキンシジミ] | Curetis acuta Moore, 1877 [ウラギンシジミ] | 0.86 |
| Andrena sasakii Cockerell, 1913 [ササキヒメハナバチ] | Andrena watasei Cockerell, 1913 [ワタセヒメハナバチ] | 0.87 |
| Paratettix histricus (Stål, 1861) [ミナミハネナガヒシバッタ] | Euparatettix insularis Bey-Bienko, 1951 [ハネナガヒシバッタ] | 0.86 |
| Riptortus linearis (Fabricius, 1775) [キスジホソヘリカメムシ] | Riptortus pedestris (Fabricius, 1775) [キボシホソヘリカメムシ] | 0.88 |
| Hemicordulia okinawensis Asahina, 1947 [リュウキュウトンボ] | Matrona japonica (Förster, 1897) [リュウキュウハグロトンボ] | 0.86 |
| Hoplia communis Waterhouse, 1875 [アシナガコガネ] | Ectinohoplia obducta (Motschulsky, 1857) [ヒメアシナガコガネ] | 0.88 |
| Andrena komachi Hirashima, 1965 [コマチマメヒメハナバチ] | Andrena kaguya Hirashima, 1965 [カグヤマメヒメハナバチ] | 0.85 |
| Coenagrion ecornutum (Selys, 1872) [キタイトトンボ] | Ceriagrion melanurum Selys, 1876 [キイトトンボ] | 0.92 |
| Nehalennia speciosa (Charpentier, 1840) [カラカネイトトンボ] | Cordulia aenea (Linnaeus, 1758) [カラカネトンボ] | 0.88 |
| Pyrellia vivida Robineau-Desvoidy, 1830 [コミドリイエバエ] | Neomyia timorensis (Robineau-Desvoidy, 1830) [ミドリイエバエ] | 0.93 |
| Lestes dryas Kirby, 1890 [エゾアオイトトンボ] | Coenagrion lanceolatum (Selys, 1872) [エゾイトトンボ] | 0.88 |
| Orthetrum pruinosum (Burmeister, 1839) [コフキショウジョウトンボ] | Crocothemis servilia (Drury, 1773) [ショウジョウトンボ] | 0.86 |
| Urostylis striicornis Scott, 1874 [サジクヌギカメムシ] | Urostylis westwoodii Scott, 1874 [クヌギカメムシ] | 0.88 |
| Cletus schmidti Kiritshenko, 1916 [ハリカメムシ] | Cletus punctiger (Dallas, 1852) [ホソハリカメムシ] | 0.86 |
| Andrena hebes Pérez, 1905 [ヤヨイヒメハナバチ] | Andrena luridiloma Strand, 1915 [シロヤヨイヒメハナバチ] | 0.90 |
| Hesperocorixa distanti (Kirkaldy, 1899) [ミズムシ] | Sigara substriata (Uhler, 1897) [コミズムシ] | 0.89 |
| Carabus opaculus Putzeys, 1875 [ヒメクロオサムシ] | Carabus albrechti A.Morawitz, 1862 [クロオサムシ] | 0.86 |
| Chlaenius micans (Fabricius, 1792) [オオアトボシアオゴミムシ] | Chlaenius naeviger A.Morawitz, 1862 [アトボシアオゴミムシ] | 0.91 |
| Urostylis annulicornis Scott, 1874 [ヘラクヌギカメムシ] | Urostylis westwoodii Scott, 1874 [クヌギカメムシ] | 0.88 |
| Mystacides pacificus Mey, 1991 [キタアオヒゲナガトビケラ] | Mystacides azureus (Linnaeus, 1761) [アオヒゲナガトビケラ] | 0.91 |
| Parnassius stubbendorfii Ménétriés, 1849 [ヒメウスバアゲハ] | Parnassius glacialis Butler, 1866 [ウスバアゲハ] | 0.86 |
| Pseudocopera rubripes (Navás, 1934) [オオモノサシトンボ] | Pseudocopera annulata (Selys, 1863) [モノサシトンボ] | 0.88 |
| Epitheca bimaculata (Charpentier, 1825) [オオトラフトンボ] | Epitheca marginata (Selys, 1883) [トラフトンボ] | 0.86 |
| Aphonoides japonicus (Shiraki, 1930) [マツムシモドキ] | Aphonoides rufescens Ichikawa, 2001 [アカマツムシモドキ] | 0.88 |
| Andrena valeriana Hirashima, 1957 [ヒロヅキバナヒメハナバチ] | Andrena knuthi Alfken, 1900 [キバナヒメハナバチ] | 0.86 |
| Brachythemis contaminata (Fabricius, 1793) [ヒメキトンボ] | Diplacodes trivialis (Rambur, 1842) [ヒメトンボ] | 0.91 |
| Dimorphopterus pallipes (Distant, 1883) [コバネナガカメムシ] | Macropes obnubilus (Distant, 1883) [ホソコバネナガカメムシ] | 0.90 |
| Heteropternis rufipes (Shiraki, 1910) [アカアシバッタ] | Stenocatantops mistshenkoi Willemse, 1968 [アカアシホソバッタ] | 0.88 |
| Andrena prostomias Pérez, 1905 [ウツギヒメハナバチ] | Andrena tsukubana Hirashima, 1957 [コガタウツギヒメハナバチ] | 0.86 |
| Pseudagrion microcephalum (Rambur, 1842) [アオナガイトトンボ] | Pseudagrion pilidorsum (Brauer, 1868) [アカナガイトトンボ] | 0.89 |
| Nipponomeconema musashiense Yamasaki, 1983 [ムサシセモンササキリモドキ] | Nipponomeconema mutsuense Yamasaki, 1983 [ムツセモンササキリモドキ] | 0.93 |
| Hemicordulia ogasawarensis Oguma, 1913 [オガサワラトンボ] | Ischnura ezoin (Asahina, 1952) [オガサワライトトンボ] | 0.89 |
| Euparatettix tricarinatus (Bolívar, 1887) [ホソハネナガヒシバッタ] | Euparatettix insularis Bey-Bienko, 1951 [ハネナガヒシバッタ] | 0.90 |
| Hydrobasileus croceus (Brauer, 1867) [オオキイロトンボ] | Sympetrum uniforme (Selys, 1883) [オオキトンボ] | 0.86 |
| Panaorus japonicus (Stal, 1874) [シロヘリナガカメムシ] | Aenaria lewisi (Scott, 1874) [シロヘリカメムシ] | 0.89 |
| Platygavialidium formosanum (Tinkham, 1936) [イボトゲヒシバッタ] | Criotettix japonicus (Haan, 1843) [トゲヒシバッタ] | 0.88 |
| Paraplea indistinguenda (Matsumura, 1905) [ヒメマルミズムシ] | Paraplea japonica (Horváth, 1904) [マルミズムシ] | 0.86 |
| Sastragala scutellata (Scott, 1874) [モンキツノカメムシ] | Sastragala esakii Hasegawa, 1959 [エサキモンキツノカメムシ] | 0.86 |
| Orthetrum glaucum (Brauer, 1865) [タイワンシオカラトンボ] | Orthetrum luzonicum (Brauer, 1868) [ホソミシオカラトンボ] | 0.88 |
| Ischnura aurora (Brauer, 1865) [キバライトトンボ] | Ceriagrion melanurum Selys, 1876 [キイトトンボ] | 0.86 |
| Fromundus pygmaeus (Dallas, 1851) [ヒメツチカメムシ] | Elasmucha putoni Scott, 1874 [ヒメツノカメムシ] | 0.88 |
| Onthophagus ater Waterhouse, 1875 [クロマルエンマコガネ] | Onthophagus atripennis Waterhouse, 1875 [コブマルエンマコガネ] | 0.89 |
| Orthetrum internum McLachlan, 1894 [タイワンシオヤトンボ] | Orthetrum glaucum (Brauer, 1865) [タイワンシオカラトンボ] | 0.86 |
| Diestrammena gigas Sugimoto & Ichikawa, 2003 [アマミマダラカマドウマ] | Diestrammena itodo Sugimoto & Ichikawa, 2003 [ハヤシウマ] | 0.91 |
| Ledropsis discolor (Uhler, 1896) [コミミズク] | Ledra auditura Walker, 1858 [ミミズク] | 0.89 |
| Indolestes boninensis (Asahina, 1952) [オガサワラアオイトトンボ] | Ischnura ezoin (Asahina, 1952) [オガサワライトトンボ] | 0.91 |
| Andrena nawai Cockerell, 1913 [ナワヒメハナバチ] | Andrena watasei Cockerell, 1913 [ワタセヒメハナバチ] | 0.90 |
| Polistes riparius Sk.Yamane & Soi.Yam., 1987 [トガリフタモンアシナガバチ] | Polistes chinensis (Fabricius, 1793) [フタモンアシナガバチ] | 0.87 |
| Tettigoniopsis iyoensis Kano & Kawakita, 1987 [イヨササキリモドキ] | Tettigoniopsis hiurai Kano & Kawakita, 1984 [ハダカササキリモドキ] | 0.86 |
| Menida musiva (JakovLev, 1867) [ナカボシカメムシ] | Urochela luteovaria [ナシカメムシ] | 0.86 |
| Ochterus marginatus (Latreille, 1804) [メミズムシ] | Hesperocorixa distanti (Kirkaldy, 1899) [ミズムシ] | 0.89 |
| Geocoris proteus Distant, 1883 [ヒメオオメカメムシ] | Geocoris varius (Uhler, 1860) [オオメカメムシ] | 0.88 |
| Goniogryllus sexspinosus Ichikawa, 1987 [ハネナシコオロギ] | Nippancistroger testaceus (Matsumura & Shiraki, 1908) [ハネナシコロギス] | 0.88 |
| Isodontia nigella (F.Smith, 1856) [コクロアナバチ] | Sphex argentatus Fabricius, 1787 [クロアナバチ] | 0.92 |
| Ptomascopus morio Kraatz, 1877 [コクロシデムシ] | Nicrophorus concolor (Kraatz, 1877) [クロシデムシ] | 0.92 |
| Dolichovespula pacifica (Bir., 1930) [シロオビホオナガスズメバチ] | Dolichovespula media (Retz., 1783) [キオビホオナガスズメバチ] | 0.88 |
| Andrena okinawana Matsumura & Uchida, 1926 [ミナミキバナヒメハナバチ] | Andrena knuthi Alfken, 1900 [キバナヒメハナバチ] | 0.86 |
| Cosmetura amamiensis Kano & Tominaga, 1988 [アマミコバネササキリモドキ] | Cosmetura fenestrata Yamasaki, 1983 [コバネササキリモドキ] | 0.87 |
| Laccophilus difficilis Sharp, 1873 [ツブゲンゴロウ] | Noterus japonicus Sharp, 1873 [コツブゲンゴロウ] | 0.93 |
| Acanthosoma forficula Jakovlev, 1880 [ヒメハサミツノカメムシ] | Acanthosoma labiduroides Jakovlev, 1880 [ハサミツノカメムシ] | 0.90 |
| Tettigoniopsis kongozanensis Kano & Kawakita, 1984 [ヒトコブササキリモドキ] | Tettigoniopsis iyoensis Kano & Kawakita, 1987 [イヨササキリモドキ] | 0.88 |
| Gerris lacustris (Linnaeus, 1758) [キタヒメアメンボ] | Gerris latiabdominis Miyamoto, 1958 [ヒメアメンボ] | 0.86 |
| Andrena takachihoi Hirashima, 1964 [タカチホヒメハナバチ] | Andrena komachi Hirashima, 1965 [コマチマメヒメハナバチ] | 0.86 |
| Platydema marseuli Lewis, 1894 [アオツヤキノコゴミムシダマシ] | Platydema nigroaenea Motschulsky, 1861 [クロツヤキノコゴミムシダマシ] | 0.86 |
| Tetrix minor Ichikawa, 1993 [ヒメヒシバッタ] | Tetrix macilenta Ichikawa, 1993 [ヤセヒシバッタ] | 0.86 |
| Andrena fukuokensis Hirashima, 1952 [キアシヒメハナバチ] | Andrena ezoensis Hirashima, 1965 [エゾヒメハナバチ] | 0.87 |
| Andrena kerriae Hirashima, 1965 [ヤマブキヒメハナバチ] | Andrena kaguya Hirashima, 1965 [カグヤマメヒメハナバチ] | 0.85 |
| Agabus conspicuus Sharp, 1873 [クロズマメゲンゴロウ] | Agabus japonicus Sharp, 1873 [マメゲンゴロウ] | 0.88 |
| Canthophorus niveimarginatus Scott, 1874 [シロヘリツチカメムシ] | Aenaria lewisi (Scott, 1874) [シロヘリカメムシ] | 0.89 |
| Camponotus vitiosus [ウメマツオオアリ] | Vollenhovia emeryi Wheeler, 1906 [ウメマツアリ] | 0.86 |
| Microporus nigrita (J.C.Fabricius, 1794) [マルツチカメムシ] | Megacopta punctatissima [マルカメムシ] | 0.86 |
| Halobates micans Eschscholtz, 1822 [ツヤウミアメンボ] | Halobates japonicus Esaki, 1924 [ウミアメンボ] | 0.86 |
| Crossocerus cetratus (Shuckard, 1837) [ヒラアシギングチ] | Crossocerus capitosus (Shuckard, 1837) [アタマギングチ] | 0.88 |
| Elasmucha dorsalis (Jakovlev, 1876) [アカヒメツノカメムシ] | Elasmucha putoni Scott, 1874 [ヒメツノカメムシ] | 0.89 |
| Andrena hondoica Hirashima, 1962 [カオジロヒメハナバチ] | Andrena benefica Hirashima, 1962 [ウズキヒメハナバチ] | 0.88 |
| Adelphocoris variabilis (Uhler, 1897) [フタモンカスミカメ] | Apolygus hilaris (Horvath, 1905) [フタモンアカカスミカメ] | 0.90 |
| Onthophagus fodiens Waterhouse, 1875 [フトカドエンマコガネ] | Onthophagus atripennis Waterhouse, 1875 [コブマルエンマコガネ] | 0.88 |
| Andrena kamikochiana Hirashima, 1963 [タカネヒメハナバチ] | Andrena subopaca Nylander, 1848 [タカネマメヒメハナバチ] | 0.90 |
| Poecilus samurai (Lutshnik, 1916) [オオキンナガゴミムシ] | Poecilus versicolor (Sturm, 1824) [キンナガゴミムシ] | 0.89 |
| Andrena togashii Tadauchi & Hirashima, 1984 [トガシヒメハナバチ] | Andrena yamato Tadauchi & Hirashima, 1983 [ヤマトヒメハナバチ] | 0.86 |
| Pterostichus japonicus (Motschulsky, 1861) [オオクロナガゴミムシ] | Pterostichus subovatus (Motschulsky, 1861) [マルガタナガゴミムシ] | 0.86 |
| Ninomimus flavipes (Matsumura, 1913) [ホソメダカナガカメムシ] | Chauliops fallax Scott, 1874 [メダカナガカメムシ] | 0.90 |
| Thlaspida cribrosa (Boheman, 1855) [イチモンジカメノコハムシ] | Piezodorus hybneri (Gmelin, 1790) [イチモンジカメムシ] | 0.86 |
| Merohister jekeli (Marseul, 1857) [エンマムシ] | Margarinotus niponicus (Lewis, 1895) [コエンマムシ] | 0.91 |
| Scudderocoris albomarginatus (Scott, 1874) [ヒョウタンナガカメムシ] | Horridipamera lateralis (Scott, 1874) [キベリヒョウタンナガカメムシ] | 0.88 |
| Coptosoma parvipicta Montandon, 1892 [タデマルカメムシ] | Megacopta punctatissima [マルカメムシ] | 0.86 |
| Niphe elongata (Dallas, 1851) [イネカメムシ] | Scotinophara lurida (Burmeister, 1834) [イネクロカメムシ] | 0.86 |
| Amara gigantea (Motschulsky, 1844) [オオマルガタゴミムシ] | Amara chalcites Dejean, 1828 [マルガタゴミムシ] | 0.89 |
| Mocis undata (Fabricius, 1775) [オオウンモンクチバ] | Mocis annetta Butler, 1878 [ウンモンクチバ] | 0.88 |
| Coelioxys hosoba Nagase, 2003 [ホソバトガリハナバチ] | Coelioxys hiroba Nagase, 2003 [ヒロバトガリハナバチ] | 0.93 |
| Pseudoregma bambucicola (Takahashi, 1921) [タケツノアブラムシ] | Melanaphis bambusae (Fullaway, 1910) [タケノアブラムシ] | 0.94 |
| Chlaenius circumdatus Brullé, 1835 [コキベリアオゴミムシ] | Chlaenius inops Chaudoir, 1856 [ヒメキベリアオゴミムシ] | 0.86 |
| Amara simplicidens A.Morawitz, 1863 [コマルガタゴミムシ] | Amara chalcites Dejean, 1828 [マルガタゴミムシ] | 0.94 |
| Colobopterus quadratus (Reiche, 1850) [オオマグソコガネ] | Phaeaphodius rectus (Motschulsky, 1866) [マグソコガネ] | 0.86 |
| Oodes desertus Motschulsky, 1858 [トックリゴミムシ] | Pterostichus haptoderoides Tschitscherine, 1889 [トックリナガゴミムシ] | 0.89 |
| Dindica virescens (Butler, 1878) [ウスアオシャク] | Parabapta clarissa (Butler, 1878) [ウスアオエダシャク] | 0.88 |
| Harpalus capito A.Morawitz, 1862 [オオゴモクムシ] | Harpalus eous Tschitscherine, 1901 [オオズケゴモクムシ] | 0.88 |
| Maladera japonica (Motschulsky, 1860) [ビロウドコガネ] | Maladera orientalis (Motschulsky, 1857) [ヒメビロウドコガネ] | 0.88 |
| Amphipyra pyramidea (Linnaeus, 1758) [シマカラスヨトウ] | Amphipyra livida (Denis & Schiffermüller), 1775 [カラスヨトウ] | 0.86 |
| Trichopteryx hemana (Butler, 1878) [シタコバネナミシャク] | Trichopteryx terranea (Butler, 1878) [チャオビコバネナミシャク] | 0.91 |
| Endropiodes indictinaria (Bremer, 1864) [モミジツマキリエダシャク] | Xerodes rufescentaria (Motschulsky, 1861) [ミスジツマキリエダシャク] | 0.92 |
| Amara congrua A.Morawitz, 1862 [ニセマルガタゴミムシ] | Amara chalcites Dejean, 1828 [マルガタゴミムシ] | 0.89 |
| Catocala actaea Felder & Rogenhofer, 1874 [コシロシタバ] | Catocala patala Felder & Rogenhofer, 1874 [キシタバ] | 0.95 |
| Phalerodonta manleyi (Leech, 1889) [オオトビモンシャチホコ] | Drymonia japonica (Wileman, 1911) [コトビモンシャチホコ] | 0.86 |
| Melolontha frater Arrow, 1913 [オオコフキコガネ] | Melolontha japonica Burmeister, 1855 [コフキコガネ] | 0.86 |
| Amara macronota (Solsky, 1875) [ナガマルガタゴミムシ] | Amara chalcites Dejean, 1828 [マルガタゴミムシ] | 0.89 |
| Prosotas nora (Felder, 1860) [ヒメウラナミシジミ] | Lampides boeticus (Linnaeus, 1767) [ウラナミシジミ] | 0.88 |
| Chlaenius nigricans Wiedemann, 1821 [オオキベリアオゴミムシ] | Chlaenius circumdatus Brullé, 1835 [コキベリアオゴミムシ] | 0.86 |
| Eustroma melancholica (Butler, 1878) [ハガタナミシャク] | Ecliptopera umbrosaria (Motschulsky) [オオハガタナミシャク] | 0.89 |
| Rhynchaglaea scitula Butler, 1879 [チャマダラキリガ] | Rhynchaglaea fuscipennis Sugi, 1958 [クロチャマダラキリガ] | 0.89 |
| Gonocephalum coriaceum Motschulsky, 1857 [コスナゴミムシダマシ] | Gonocephalum pubens [オオスナゴミムシダマシ] | 0.86 |
| Cassida rubiginosa Müller, 1776 [アオカメノコハムシ] | Cassida nebulosa Linnaeus, 1758 [カメノコハムシ] | 0.88 |
| Anisodactylus sadoensis Schauberger, 1932 [オオホシボシゴミムシ] | Anisodactylus punctatipennis A.Morawitz, 1862 [ホシボシゴミムシ] | 0.89 |
| Arhopalus coreanus (Sharp, 1905) [サビカミキリ] | Mesosella simiola Bates, 1884 [クワサビカミキリ] | 0.86 |
| Meligethes flavicollis Reitter, 1873 [ムネアカチビケシキスイ] | Meligethes denticulatus (Heer, 1841) [キムネチビケシキスイ] | 0.86 |
| Phyllopertha irregularis Waterhouse, 1875 [キスジコガネ] | Mimela testaceipes (Motschulsky, 1860) [スジコガネ] | 0.91 |
| Synegia hadassa (Butler, 1878) [ハグルマエダシャク] | Synegia esther Butler, 1881 [クロハグルマエダシャク] | 0.90 |
| Episcaphium semirufum Lewis, 1893 [アカバデオキノコムシ] | Scaphidium reitteri Lewis, 1879 [ヘリアカデオキノコムシ] | 0.86 |
| Zaitzevia rivalis Nomura, 1963 [ミゾツヤドロムシ] | Zaitzevia nitida Nomura, 1963 [ツヤドロムシ] | 0.86 |
| Alcis medialbifera Inoue, 1972 [ヒメナカウスエダシャク] | Alcis angulifera (Butler, 1878) [ナカウスエダシャク] | 0.90 |
| Uraecha bimaculata Thomson, 1864 [ヤハズカミキリ] | Mesechthistatus binodosus (Waterhouse, 1881) [コブヤハズカミキリ] | 0.88 |
| Taeniophila unio (Oberthür, 1880) [ミスジシロエダシャク] | Cabera purus (Butler, 1878) [コスジシロエダシャク] | 0.90 |
| Catocala bella Butler, 1877 [ノコメキシタバ] | Catocala nivea Butler, 1877 [シロシタバ] | 0.89 |
| Melanaema venata Butler, 1877 [オオベニヘリコケガ] | Miltochrista miniata (Forster, 1771) [ベニヘリコケガ] | 0.88 |
| Phyllopertha intermixta (Arrow, 1913) [アオウスチャコガネ] | Phyllopertha diversa Waterhouse, 1875 [ウスチャコガネ] | 0.88 |
| Spilarctia obliquizonata (Miyake, 1910) [フトスジモンヒトリ] | Spilarctia seriatopunctata (Motschulsky, 1860) [スジモンヒトリ] | 0.88 |
| Parapsestis argenteopicta (Oberthür, 1879) [ギンモントガリバ] | Thyatira batis (Linnaeus, 1758) [モントガリバ] | 0.86 |
| Trachys griseofasciatus Saunders, 1873 [ナミガタチビタマムシ] | Trachys yanoi Kurosawa, 1959 [ヤノナミガタチビタマムシ] | 0.91 |
| Orthosia gothica Linnaeus, 1758 [カシワキリガ] | Conistra ardescens (Butler, 1879) [カシワオビキリガ] | 0.86 |
| Pogonopygia nigralbata Warren, 1894 [クロフオオシロエダシャク] | Metabraxas clerica Butler, 1881 [オオシロエダシャク] | 0.86 |
| Niphades variegatus J.Faust, 1890 [クロコブゾウムシ] | Episomus turritus (Gyllenhal, 1833) [シロコブゾウムシ] | 0.88 |
| Nicrophorus tenuipes (Lewis, 1887) [ヒメクロシデムシ] | Nicrophorus concolor (Kraatz, 1877) [クロシデムシ] | 0.86 |
| Gametis forticula (Janson, 1881) [アオヒメハナムグリ] | Cetonia roelofsi Harold, 1880 [アオハナムグリ] | 0.88 |
| Chiasmia hebesata (Walker, 1861) [ウスオエダシャク] | Parabapta clarissa (Butler, 1878) [ウスアオエダシャク] | 0.94 |
| Necrodes nigricornis Harold, 1875 [モモブトシデムシ] | Necrodes littoralis (Linnaeus, 1758) [オオモモブトシデムシ] | 0.89 |
| Myrteta angelica Butler, 1915 [クロミスジシロエダシャク] | Taeniophila unio (Oberthür, 1880) [ミスジシロエダシャク] | 0.91 |
| Calleida onoha Bates, 1873 [アオアトキリゴミムシ] | Lachnolebia cribricollis (A.Morawitz, 1862) [キクビアオアトキリゴミムシ] | 0.87 |
| Catocala jonasii Butler, 1877 [ジョナスキシタバ] | Catocala nivea Butler, 1877 [シロシタバ] | 0.86 |
| Odontopera aurata (Prout, 1915) [キイロエグリヅマエダシャク] | Odontopera arida (Butler, 1878) [エグリヅマエダシャク] | 0.87 |
| Lebia duplex Bates, 1883 [ハネビロアトキリゴミムシ] | Lebia calycophora Schmidt-Goebel, 1846 [ホシハネビロアトキリゴミムシ] | 0.92 |
| Eupithecia proterva Butler, 1878 [ウスカバナミシャク] | Eupithecia clavifera Inoue, 1955 [モンウスカバナミシャク] | 0.90 |
| Demetrias marginicollis Bates, 1883 [ミズギワアトキリゴミムシ] | Apristus grandis Andrewes, 1937 [ミズアトキリゴミムシ] | 0.91 |
| Dysstroma citrata (Linnaeus, 1761) [ツマキナカジロナミシャク] | Melanthia procellata (Denis & Schiffermüller), 1775 [ナカジロナミシャク] | 0.86 |
| Endotricha icelusalis Walker, 1859 [オオウスベニトガリメイガ] | Endotricha olivacealis Bremer, 1864 [ウスベニトガリメイガ] | 0.91 |
| Bizia aexaria Walker, 1860 [ツマトビキエダシャク] | Spilopera debilis (Butler, 1878) [ツマトビシロエダシャク] | 0.86 |
| Orthosia carnipennis Butler, 1878 [アカバキリガ] | Orthosia evanida Butler, 1879 [カバキリガ] | 0.91 |
| Cychramus variegatus (Herbst, 1792) [ヨツボシセマルケシキスイ] | Glischrochilus japonius (Motschulsky, 1858) [ヨツボシケシキスイ] | 0.86 |
| Zaitzeviaria gotoi (Nomura, 1959) [ホソヒメツヤドロムシ] | Zaitzeviaria ovata (Nomura, 1959) [マルヒメツヤドロムシ] | 0.91 |
| Heterarmia charon (Butler, 1878) [ナミガタエダシャク] | Hypomecis lunifera (Butler, 1878) [オオバナミガタエダシャク] | 0.86 |
| Ercheia niveostrigata Warren, 1913 [モンシロムラサキクチバ] | Ercheia umbrosa Butler, 1881 [モンムラサキクチバ] | 0.90 |
| Trachys variolaris Saunders, 1873 [ダンダラチビタマムシ] | Trachys auricollis Saunders, 1873 [クズノチビタマムシ] | 0.91 |
| Parabolitophagus felix [カブトゴミムシダマシ] | Luprops orientalis (Motschulsky, 1868) [ヒゲブトゴミムシダマシ] | 0.86 |
| Anomala geniculata (Motschulsky, 1866) [ヒメサクラコガネ] | Anomala daimiana Harold, 1877 [サクラコガネ] | 0.86 |
| Chlaenius suvorovi (Semenov, 1912) [チビアオゴミムシ] | Chlaenius pallipes (Gebler, 1823) [アオゴミムシ] | 0.86 |
| Mimela holosericea (Fabricius, 1787) [キンスジコガネ] | Phyllopertha irregularis Waterhouse, 1875 [キスジコガネ] | 0.92 |
| Phialodes rufipennis Roelofs, 1874 [アシナガオトシブミ] | Henicolabus lewisi Voss, 1925 [ルイスアシナガオトシブミ] | 0.86 |
| Parapercnia giraffata Guenée, 1857 [オオゴマダラエダシャク] | Biston panterinaria (Bremer & Grey, 1853) [キオビゴマダラエダシャク] | 0.87 |
| Parantica aglea (Stoll, 1782) [ヒメアサギマダラ] | Parantica sita (Kollar, 1844) [アサギマダラ] | 0.86 |
| Gonocephalum persimile [ヒメスナゴミムシダマシ] | Gonocephalum coriaceum Motschulsky, 1857 [コスナゴミムシダマシ] | 0.86 |
| Mocis ancilla Warren, 1913 [ニセウンモンクチバ] | Mocis annetta Butler, 1878 [ウンモンクチバ] | 0.88 |
| Photoscotosia lucicolens (Butler, 1878) [オオネグロウスベニナミシャク] | Photoscotosia atrostrigata (Bremer, 1864) [ネグロウスベニナミシャク] | 0.92 |
| Gyrinus curtus Motschulsky, 1866 [コミズスマシ] | Gyrinus japonicus Sharp, 1873 [ミズスマシ] | 0.91 |
| Cnethodonta japonica Sugi, 1980 [シロシャチホコ] | Ellida viridimixta (Bremer, 1861) [シロテンシャチホコ] | 0.88 |
| Glyptotrox opacotuberculatus (Motschulsky, 1860) [ヒメコブスジコガネ] | Mimela flavilabris (Waterhouse, 1875) [ヒメスジコガネ] | 0.88 |
| Naxa seriaria (Motschulsky, 1866) [ホシシャク] | Paraserica grisea (Motschulsky, 1866) [ハイイロビロウドコガネ] | 0.86 |
| Sypnoides picta [シラフクチバ] | Daddala lucilla (Butler, 1881) [オオシラフクチバ] | 0.86 |
| Stomis prognathus Bates, 1883 [キバナガゴミムシ] | Poecilus versicolor (Sturm, 1824) [キンナガゴミムシ] | 0.88 |
| Parectropis similaria (Hufnagel, 1767) [シロモンキエダシャク] | Proteostrenia leda (Butler, 1878) [シロモンクロエダシャク] | 0.86 |
| Habrosyne fraterna Moore, 1888 [オオアヤトガリバ] | Habrosyne pyritoides Hufnagel, 1767 [アヤトガリバ] | 0.86 |
| Phthonosema invenustaria (Leech, 1891) [トビネオオエダシャク] | Biston robustum Butler, 1879 [トビモンオオエダシャク] | 0.86 |
| Drymonia dodonides Staudinger, 1892 [トビモンシャチホコ] | Drymonia japonica (Wileman, 1911) [コトビモンシャチホコ] | 0.95 |
| Orthosia limbata Butler, 1879 [シロヘリキリガ] | Orthosia lizetta Butler, 1878 [クロミミキリガ] | 0.86 |
| Platycerota incertaria (Leech, 1891) [ツマキエダシャク] | Bizia aexaria Walker, 1860 [ツマトビキエダシャク] | 0.89 |
| Inurois tenuis Butler, 1879 [ホソウスバフユシャク] | Inurois fletcheri Inoue, 1954 [ウスバフユシャク] | 0.89 |
| Coraebus hastanus Gory & Laporte, 1839 [ミドリナカボソタマムシ] | Coraebus niponicus Lewis, 1894 [ルリナカボソタマムシ] | 0.86 |
| Pseudoodes vicarius (Bates, 1873) [オオトックリゴミムシ] | Oodes desertus Motschulsky, 1858 [トックリゴミムシ] | 0.89 |
| Nebrioporus simplicipes (Sharp, 1884) [シマチビゲンゴロウ] | Oreodytes kanoi (Kamiya, 1938) [カノシマチビゲンゴロウ] | 0.90 |
| Macroscelesia japona (Hampson, 1919) [モモブトスカシバ] | Melittia sangaica Moore, 1877 [オオモモブトスカシバ] | 0.89 |
| Platambus optatus (Sharp, 1884) [ホソクロマメゲンゴロウ] | Agabus conspicuus Sharp, 1873 [クロズマメゲンゴロウ] | 0.86 |
| Rhyparus helophoroides Fairmaire, 1893 [ヒメセスジカクマグソコガネ] | Rhyparus azumai Nakane, 1956 [セスジカクマグソコガネ] | 0.92 |
| Xestia dilatata Butler, 1879 [ウスチャヤガ] | Diarsia deparca Butler, 1879 [コウスチャヤガ] | 0.92 |
| Carabus harmandi Lapouge, 1909 [ホソヒメクロオサムシ] | Carabus opaculus Putzeys, 1875 [ヒメクロオサムシ] | 0.89 |
| Xanthia togata Esper [キイロキリガ] | Clavipalpula aurariae Oberthür, 1880 [キンイロキリガ] | 0.92 |
| Endropiodes abjecta (Butler, 1879) [ツマキリエダシャク] | Xerodes rufescentaria (Motschulsky, 1861) [ミスジツマキリエダシャク] | 0.86 |
| Paradarisa chloauges Prout, 1927 [ヒロバウスアオエダシャク] | Parabapta clarissa (Butler, 1878) [ウスアオエダシャク] | 0.86 |
| Euops punctatostriata Schilsky, 1903 [ルリオトシブミ] | Euops splendida Dalla Torre & Voss, 1930 [カシルリオトシブミ] | 0.88 |
| Archips oporana (Linnaeus, 1758) [マツアトキハマキ] | Archips audax Razowski, 1977 [アトキハマキ] | 0.86 |
| Cryptochorina amphidasyaria (Oberthür, 1880) [ヒゲマダラエダシャク] | Abraxas niphonibia Wehrli, 1935 [ヒメマダラエダシャク] | 0.90 |
| Platydema kurama Nakane, 1963 [マルツヤキノコゴミムシダマシ] | Platydema nigroaenea Motschulsky, 1861 [クロツヤキノコゴミムシダマシ] | 0.86 |
| Fascellina chromataria Walker, 1860 [エグリエダシャク] | Odontopera arida (Butler, 1878) [エグリヅマエダシャク] | 0.89 |
| Chlaenius abstersus Bates, 1873 [アカガネアオゴミムシ] | Myas cuprescens (Motschulsky, 1857) [アカガネオオゴミムシ] | 0.90 |
| Lema concinnipennis Baly, 1865 [キバラルリクビボソハムシ] | Lema cirsicola [ルリクビボソハムシ] | 0.86 |

## B 群: 真の重複疑い 5 件 — 個別監査

### B1: taxon_000596
- 対象: Asiagomphus yayeyamensis (Matsumura, 1926) [ヤエヤマサナエ] (教科案: eitango)
- 相手: Leptogomphus yayeyamensis Matsumura, 1926 [ヒメホソサナエ] (status: taxonomy_resolved)
- score: 0.87
- 判定: 別種、両方前進可 (2026-08-12 user 監査済み)

### B2: taxon_001027
- 対象: Eurystylus coelestialium (Kirkaldy, 1902) [メンガタカスミカメ] (教科案: eitango)
- 相手: Trigonotylus caelestialium (Kirkaldy, 1902) [アカヒゲホソミドリカスミカメ] (status: taxonomy_resolved)
- score: 0.86
- 判定: 別種、両方前進可 (2026-08-12 user 監査済み)

### B3: taxon_001695
- 対象: Enochrus japonicus (Sharp, 1873) [キベリヒラタガムシ] (教科案: keisan)
- 相手: Noterus japonicus Sharp, 1873 [コツブゲンゴロウ] (status: taxonomy_resolved)
- score: 0.85
- 判定: 別種、両方前進可 (2026-08-12 user 監査済み)

### B4: taxon_002242
- 対象: Ozotomerus japonicus Sharp, 1891 [ウスモンツツヒゲナガゾウムシ] (教科案: keisan)
- 相手: Noterus japonicus Sharp, 1873 [コツブゲンゴロウ] (status: taxonomy_resolved)
- score: 0.85
- 判定: 別種、両方前進可 (2026-08-12 user 監査済み)

### B5: taxon_002300
- 対象: Hermonassa arenosa Butler, 1881 [ホシボシヤガ] (教科案: kanji)
- 相手: Herminia arenosa Butler, 1878 [ウスキミスジアツバ] (status: taxonomy_resolved)
- score: 0.87
- 判定: 別種、両方前進可 (2026-08-12 user 監査済み)

## 監査結果 (2026-08-12 確定)

- A 群 214 件: 一括クリア承認 (user)。全ペア別種。
- B 群 5 件: 個別確認の上、全件「別種・両方前進可」(user)。
- 帰結: needs_review 219 件はすべて解除対象。resolved は 1,432 から 1,651 へ増加する (教科別バッファ増)。
- 反映: reserve パイプラインへの解除機構 (レビュー済み判定の永続化) は実装フォローアップ。それまで本書が正典。
