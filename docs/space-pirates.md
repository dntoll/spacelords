# Space pirates

Nya spel börjar med en Space pirate runt varje stjärna utanför hemsystemet.
Äldre spel får inga pirater. Besegrade pirater återkommer inte.

## Patrullering och sikt

Piraterna går ett steg per spelår runt stjärnans sex grannhexar och stannar i
sitt eget system. De visas som fientliga på Star map och Fleets när deras
nuvarande hex ligger inom aktuell detektionssikt. Tidigare utforskning räcker inte. Piraterna tillhör samma fraktion och anfaller inte
varandra. Spelaren kan läsa information om dem men inte ge dem order.

## Strid

Alla flottor flyttar samtidigt ett hexsteg. Därefter avgörs strider mellan
flottor på samma hex, före anslutning av förstärkningar. Flottor som byter hex
med varandra möts inte. Skilda spelarflottor strider var för sig i stabil
flottordning; deras Fighters räknas inte ihop.

Varje Fighter förstör upp till två pirater. Varje helt par pirater förstör en
Fighter. Förlusterna beräknas samtidigt från antalen före respektive strid.

| Fighters | Pirater | Överlevande Fighters | Överlevande pirater |
| -------- | ------- | -------------------- | ------------------- |
| 1        | 1       | 1                    | 0                   |
| 1        | 2       | 0                    | 0                   |
| 2        | 2       | 1                    | 0                   |
| 2        | 3       | 1                    | 0                   |
| 2        | 5       | 0                    | 1                   |

Kvarvarande pirater förstör flottans Colony ships, Exploration ships och
Transport ships. Om alla pirater förstörs överlever de civila skeppen, även om
alla Fighters också har förstörts. Förstörd last förloras och kan inte levereras.
Besegrade spelarflottor finns kvar som tomma flottor utan position.
Striden redovisas i Events under Combat med plats, deltagare och förluster.

Sikt, teleskop och avbrott vid återupptäckt beskrivs i
[sikt och teleskop](detection-telescopes.md).
