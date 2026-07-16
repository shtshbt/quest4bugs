# Chameleon balance trace

This deterministic trace uses the production `Q4BBattle.damage`, `Q4BBattle.bossDamage`, and Chameleon color-state functions. Every answer is correct. No party member has the `legendary` tag and no fossil equipment is worn.

Party order:

1. `queen_alexandras_birdwing`, SS, kanji, HP 20
2. `morpho_butterfly`, SS, kanji, HP 20
3. `hercules_beetle`, SS, keisan, HP 20
4. `rainbow_stag_beetle`, SS, keisan, HP 20
5. `mukashi_tonbo`, SS, eitango, HP 20
6. `gunki_oo_ari`, SS, eitango, HP 20

The Chameleon starts at HP 160. Its type remains fixed for one attack and one defense answer, then changes before the next attack.

| Action | Phase | Member | Chameleon type | Production calculation | Result |
|---:|---|---|---|---|---|
| 1 | attack | queen | kanji | `damage(kanji, kanji) = 10` | boss 160 to 150 |
| 2 | defense | queen | kanji | `bossDamage(true, kanji, kanji) = 7` | ally 20 to 13 |
| 3 | attack | queen | keisan | `damage(kanji, keisan) = 20` | boss 150 to 130 |
| 4 | defense | queen | keisan | `bossDamage(true, kanji, keisan) = 5` | ally 13 to 8 |
| 5 | attack | queen | eitango | `damage(kanji, eitango) = 5` | boss 130 to 125 |
| 6 | defense | queen | eitango | `bossDamage(true, kanji, eitango) = 9` | ally 8 to 0 |
| 7 | attack | morpho | kanji | `damage(kanji, kanji) = 10` | boss 125 to 115 |
| 8 | defense | morpho | kanji | `bossDamage(true, kanji, kanji) = 7` | ally 20 to 13 |
| 9 | attack | morpho | keisan | `damage(kanji, keisan) = 20` | boss 115 to 95 |
| 10 | defense | morpho | keisan | `bossDamage(true, kanji, keisan) = 5` | ally 13 to 8 |
| 11 | attack | morpho | eitango | `damage(kanji, eitango) = 5` | boss 95 to 90 |
| 12 | defense | morpho | eitango | `bossDamage(true, kanji, eitango) = 9` | ally 8 to 0 |
| 13 | attack | hercules | kanji | `damage(keisan, kanji) = 5` | boss 90 to 85 |
| 14 | defense | hercules | kanji | `bossDamage(true, keisan, kanji) = 9` | ally 20 to 11 |
| 15 | attack | hercules | keisan | `damage(keisan, keisan) = 10` | boss 85 to 75 |
| 16 | defense | hercules | keisan | `bossDamage(true, keisan, keisan) = 7` | ally 11 to 4 |
| 17 | attack | hercules | eitango | `damage(keisan, eitango) = 20` | boss 75 to 55 |
| 18 | defense | hercules | eitango | `bossDamage(true, keisan, eitango) = 5` | ally 4 to 0 |
| 19 | attack | rainbow | kanji | `damage(keisan, kanji) = 5` | boss 55 to 50 |
| 20 | defense | rainbow | kanji | `bossDamage(true, keisan, kanji) = 9` | ally 20 to 11 |
| 21 | attack | rainbow | keisan | `damage(keisan, keisan) = 10` | boss 50 to 40 |
| 22 | defense | rainbow | keisan | `bossDamage(true, keisan, keisan) = 7` | ally 11 to 4 |
| 23 | attack | rainbow | eitango | `damage(keisan, eitango) = 20` | boss 40 to 20 |
| 24 | defense | rainbow | eitango | `bossDamage(true, keisan, eitango) = 5` | ally 4 to 0 |
| 25 | attack | mukashi | kanji | `damage(eitango, kanji) = 20` | boss 20 to 0 |

Result: victory after 25 player actions. The fifth member delivers the final hit and the sixth remains unused. This proves that neither all six legendary insects nor full-slot fossil equipment is required.
