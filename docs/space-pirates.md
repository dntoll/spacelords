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
Orders-vy från Star map eller Fleets och kräver minst en Fighter. Hela flottan
hålls samlad. Spelaren väljer centrum på kartan och flottan reser dit före
patrulleringen enligt `patrullcentrum-vid-order` från 2026-10-31. Därefter går flottan till
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

Alla flottor flyttar samtidigt ett hexsteg. Därefter börjar taktisk strid
mellan egna och fientliga flottor på samma hex, före anslutning av förstärkningar.
Flottor som byter hex med varandra möts inte. Alla skepp på samma galaxhex
deltar tillsammans på en separat stridskarta.

Spelaren placerar sina skepp, aktiverar dem växelvis med fienden och använder
riktning, vapen och skydd. Öppna D6-slag avgör träffar. Civila skepp är
obeväpnade men kan skyddas och fly. Förstörda skepp lämnar vrak. Se
[taktisk strid](tactical-combat.md) för hela regeluppsättningen.

Detta ersätter den tidigare fasta förlustformeln och separata strider för
spelarflottorna i `flottstrid-per-hex`. Kravnamnet behålls.

Sikt, teleskop och avbrott vid återupptäckt beskrivs i
[sikt och teleskop](detection-telescopes.md).
