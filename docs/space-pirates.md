# Space pirates

Nya spel börjar med en Space pirate runt varje stjärna utanför hemsystemet.
Äldre spel får inga pirater. Besegrade pirater återkommer inte.

## Patrullering och sikt

Piraterna går ett steg per spelår runt stjärnans sex grannhexar och stannar i
sitt eget system. De visas som fientliga på Star map och Fleets när deras
nuvarande hex ligger inom aktuell detektionssikt. Tidigare utforskning räcker inte. Piraterna tillhör samma fraktion och anfaller inte
varandra. Spelaren kan läsa information om dem men inte ge dem order.

## Spelarens Patrol

`flottpatrullering` — **Fullständigt implementerat**: Patrol ges från flottans
orderrad på Star map eller Fleets och kräver minst en Fighter. Hela flottan
hålls samlad. Hexen där ordern ges blir fast centrum; flottan går först till
dess första grannhex och fortsätter runt de sex grannhexarna i fast ordning
med sin vanliga fart. Vid kartkanten utelämnas grannhexar utanför kartan och
flottan tar en vanlig väg mellan återstående patrullpunkter.

En pirat kan jagas om den både syns genom någon av spelarens flottor eller
planeter och ligger inom patrullens räckvidd. Räckvidden är flottans effektiva
fart, mätt i hex från flottans nuvarande position. En ensam Fighter med Rocket
engine når 3 hex, med Ion pulse engine 4 hex. Långsammare medföljande skepp
begränsar både fart och räckvidd. Patrol ger ingen extra detektionssikt.

Närmaste giltiga pirat väljs. Vid lika avstånd används stabil piratidentitet.
Flottan behåller målet medan det är giltigt och uppdaterar jakten mot dess
synliga position efter varje hexsteg. Jakten kan fortsätta långt bort från
centrum, men ingen dold position eller framtida piratrörelse används. Ett mål
som förstörs, lämnar räckvidden eller blir osynligt överges. Finns ingen annan
giltig pirat återgår flottan till närmaste patrullpunkt och fortsätter varvet
runt sitt ursprungliga centrum.

Patrol använder samma rörelsebudget, upptäcktsavbrott och stridsregler som
andra order. Cancel patrol stoppar ordern; ny destination, Explore,
bärgningsorder eller handelstilldelning ersätter den. Ruttflottor måste först
frigöras enligt vanliga regler. Om sista Fightern lämnar eller förstörs
stoppas patrullen och dess kurs rensas. Förstärkningar behåller
mottagarflottans patrull; nya grupper ärver ingen patrull. Ett nytt tryck på
aktiv Patrol flyttar inte centrum.

Patrullstatus visar centrum, räckvidd och pågående jakt i flottans hjälptext,
med kompakt status i flottkortet. Ordern, patrullpunkten och återstående
rörelse bevaras vid omladdning, även under upptäckts- och stridsavbrott.
Äldre sparningar bevaras utan att få någon Patrol-order automatiskt.

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
