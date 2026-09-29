# コスタリカ遠征 I 取り直し round の目視検品 (2026-09-29)

8/18 の検品で指摘のあった 28 種を、Wikimedia と Wikipedia を飛ばして取り直した (`run_refetch.log`)。20 種が品質ゲートを通って置き換わり、8 種は候補が無く旧カードのまま (acanthops_godmani、graphocephala_albomaculata、vates_pectinicornis、tithrone_roseipennis、oncotophasma_martini、prisopus_biolleyi、scione_maculipennis、leptonema_albovirens)。

置き換わった 20 種の新しいカードを 216px の縮小画像で見た。判定は OK / 要確認 / 不可 の 3 区分。`make_review.py` はこの表を読んで確認ページに出す。

| species_id | 判定 | 根拠 |
|---|---|---|
| caligo_atreus | 不可 | 背面と腹面の 2 個体を縦に並べた合成。8/18 と同じ型 (YPM) |
| mecistogaster_ornata | OK | 長い腹部を含む全身 (USNM) |
| umbonia_crassicornis | 不可 | 棘のある植物の茎に小さな個体が並ぶだけで、ツノゼミの形が判別できない (iNat) |
| eacles_imperialis | OK | 翅を広げた全身 (iNat) |
| siproeta_stelenes | 不可 | 背面と腹面の合成 (YPM) |
| euglossa_imperialis | 要確認 | 頭部の拡大だけで全身が写らない (USNM) |
| hetaerina_titia | OK | 全身。右上に小さなラベルが写る (USNM) |
| lirometopum_coronatum | 要確認 | 全身は写るが、翅が短く幼虫の疑い (iNat) |
| anartia_jatrophae | OK | 全身 (iNat) |
| urbanus_proteus | 不可 | 標本ラベルのみで個体が写らない (RMNH の部分ラベル) |
| astraptes_fulgerator | 不可 | ラベル 2 枚のみ (RMNH) |
| trigona_fulviventris | 要確認 | 姿勢が崩れて体の形が判別しにくい (NHMUK) |
| orsilochides_variabilis | OK | 全身 (iNat) |
| augocoris_gomesii | OK | 全身 (iNat) |
| cyclocephala_lunulata | OK | 全身 (iNat) |
| eurysternus_caribaeus | OK | 全身 (iNat) |
| argia_oenea | 不可 | ラベルカードが大半で個体は小さい (USNM) |
| metriophasma_diocles | OK | 全身 (iNat) |
| sargus_fasciatus | OK | 全身 (iNat) |
| nectopsyche_punctata | 不可 | ラベルが大半で個体は小さい (NHMUK) |

## 所見

- 品質ゲートは、ラベルだけの写真 (RMNH の部分ラベル) と、2 個体を並べた合成 (YPM の背面と腹面) を通した。台帳の写真収集 3 (部分ラベルと接触個体の検出) が塞がっていない穴そのもの。
- urbanus_proteus と astraptes_fulgerator は、取り直しで以前 (8/18 に指摘ありの旧カード) より悪いカードに置き換わった。
- 同じ取得元を引き続ける限り再び同じ不良へ戻るので、残りは `--skip-sources museum` で iNat に寄せるか、差し替え予備の種へ回すのがよい。
