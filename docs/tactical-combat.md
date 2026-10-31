# Taktisk strid

Spelaren leder varje skepp i en turbaserad strid på en egen hexkarta.
Vapen, manövrering, riktning, skydd och synliga D6-slag avgör utfallet.
Alla flottor på samma Star map-hex deltar tillsammans.

`skeppsval-startar-stridstur` — **Fullständigt implementerat**: under egen
stridstur startar val av ett oanvänt eget skepp dess tur direkt, både på kartan
och i Your ship. Ingen Activate ship-knapp visas. End ship turn avslutar
skeppets tur. Ett valt skepp spelar klart före nästa val, och varje skepp får
fortsatt bara agera en gång per runda. Under fiendens tur eller vid val av
ett redan använt skepp startar ingen ny tur. Utplaceringsval är fria och
pågående sparade skeppsturer återupptas direkt utan ny aktivering.

`stridsorder-utan-mobilscroll` — **Fullständigt implementerat**: Your ship,
svängar, Forward / escape, Weapon, Target, Fire weapon och End ship turn
ligger samlat över kartan på stående mobil. På bredare skärmar ligger de
synligt bredvid kartan. De går att använda utan att rulla till orderpanelen,
även på 320 × 568 och liggande 844 × 390. Kartan använder återstående yta.
Combat details samlar skeppsdata, skottförklaring, tärningslogg och längre regler.

Beställningen 2026-10-31 ersätter den separata aktiveringsknappen och den
rullande orderpanelen under kartan i `vaxelvisa-skeppsaktiveringar` och
`taktisk-stridskarta`. Turordning och stridsregler behålls; sparade spel bevaras.

`skeppets-framat-foljer-spriten` — **Fullständigt implementerat**:
skeppsbildens nos, kartans framåtmarkering, Forward och den främre eldbågen
har samma riktning i alla sex lägen. Det gäller egna skepp och Space pirates,
både vid utplacering och under strid. Reservsymbolen före bildladdning följer
samma riktning. Förtydligandet 2026-10-31 av `stridsutplacering` och
`riktning-och-vapen` rättar den tidigare 90° vridningen av skeppsbilderna.
Stridsregler och sparade riktningar bevaras.

| Krav                           | Status                     | Innehåll                                                                              |
| ------------------------------ | -------------------------- | ------------------------------------------------------------------------------------- |
| `taktisk-stridskarta`          | Fullständigt implementerat | Separat karta, minst 13 × 9 hexar, växer tills alla skepp ryms.                       |
| `gemensamt-stridsdeltagande`   | Fullständigt implementerat | Alla skepp från båda sidors flottor på samma galaxhex deltar.                         |
| `stridsutplacering`            | Fullständigt implementerat | Egen startzon, sex riktningar och Auto deploy. Fiendens placering avslöjas vid start. |
| `vaxelvisa-skeppsaktiveringar` | Fullständigt implementerat | Växelvis ett skepp, ett rörelsemoment och en salva i valfri ordning.                  |
| `riktning-och-vapen`           | Fullständigt implementerat | Fasta vapen, eldbågar, ammunition och svag akter.                                     |
| `skyddande-stridshinder`       | Fullständigt implementerat | Asteroider och större skepp blockerar skott helt.                                     |
| `oppna-stridstarningar`        | Fullständigt implementerat | Initiativ och vapensalvor visar D6-slag.                                              |
| `skeppsvis-retratt`            | Fullständigt implementerat | Enskilda skepp lämnar egen kortsida från runda två. Flottan samlas efteråt.           |
| `sparad-taktisk-strid`         | Fullständigt implementerat | Utplacering, skador, ammunition, aktivering och slump sparas.                         |

## Möte och utplacering

Efter ett gemensamt hexsteg börjar strid när egna skepp och pirater finns på
samma galaxhex. Flottor som byter hex med varandra möts inte. Förstärkningar
förenas efter striden. Möten på olika hexar hanteras ett i taget och året
väntar tills striderna och deras rapporter är färdiga.

Varje skepp är en egen pjäs på en hex. Båda sidor placerar i motsatta ändar.
Spelaren väljer position och riktning eller använder Auto deploy. Fiendens
placering visas när striden börjar. Startzoner och karta växer med flottorna;
inga skepp hålls i reserv. Asteroidgrupper täcker cirka 12 procent av ytan
utanför startzonerna. Alla fria hexar är sammanbundna.

## Runda och manövrering

Båda sidor slår D6 inför varje stridsrunda. Högst börjar; lika slås om.
Sidorna aktiverar växelvis ett valfritt, oanvänt skepp. Varje skepp agerar
en gång per runda. Den sida som har fler skepp fortsätter när motståndaren
har aktiverat alla sina.

En aktivering ger ett sammanhängande rörelsemoment och högst en vapensalva,
i valfri ordning. Ett steg framåt eller en sväng på 60° kostar en rörelsepoäng.
Efter rörelse följd av eld får skeppet inte röra sig igen. Oanvänd rörelse
försvinner. Ingen tröghet, energi eller överreaktionseld ingår.

| Skepp            | Storlek | Skrov | Rörelse |
| ---------------- | ------- | ----: | ------: |
| Fighter          | Small   |     3 |       4 |
| Space pirate     | Small   |     2 |       4 |
| Civilian shuttle | Small   |     3 |       3 |
| Exploration ship | Medium  |     4 |       3 |
| Salvage ship     | Medium  |     5 |       3 |
| Transport ship   | Large   |     6 |       2 |
| Colony ship      | Large   |     8 |       2 |

Minst en Ion pulse engine ger +1 rörelse. Bogsering ger grundrörelse 1 före
motorbonusen. Släp är ingen egen aktiverbar pjäs.

## Vapen, skydd och tärningar

| Vapen         | Bärare       | Räckvidd | Främre båge | Salva                     | Träff |
| ------------- | ------------ | -------- | ----------- | ------------------------- | ----- |
| Cannon        | Fighter      | 1–3 hex  | 120°        | 2D6, obegränsat           | 4+    |
| Missiles      | Fighter      | 2–6 hex  | 60°         | 3D6, två salvor per strid | 4+    |
| Raider cannon | Space pirate | 1–3 hex  | 120°        | 2D6, obegränsat           | 5+    |

Civila skepp är obeväpnade. Varje lyckad tärning ger en skrovskada.
Anfall från målets bakre 120° sänker träffkravet med ett. Bågarnas gränser
ingår. Slagen visas tillsammans med träffkrav, skada och återstående skrov.

Asteroider är ofarbara och oförstörbara och bryter skottlinjen helt.
Skepp är ofarbara; ett mellanliggande skepp blockerar eld om det är större
än den mindre av skytten och målet. Detta gäller båda sidor. Skottlinjen går
mellan hexarnas centrum; även beröring av ett hinders kant blockerar.
Missiler kräver också fri linje. Kartan är synlig: skydd döljer inte pjäser.

## Reträtt och resultat

Från andra stridsrundan kan ett skepp fly med ett steg ut genom sin egen
kortsida. Flydda skepp kan inte angripas. Före striden väljs en säker
grannhex på Star map per flotta: tidigare hex i första hand, annars första
farbara grannhex utan fiender. Pirater måste stanna på sin patrullring.
Saknas säker grannhex visas att reträtt inte är möjlig.

Har något skepp flytt samlas ursprungsflottans alla överlevande på dess
reträtthex efter striden. Order och återstående årsrörelse stoppas. Last
och passagerare i överlevande skepp bevaras. Lastade transportuppdrag pausas
och kan återupptas med Resume orders after retreat. Flottan delas inte.

Striden slutar när ena sidan saknar kvarvarande pjäser. Överlevande får fullt
skrov och ny ammunition efter striden. Förstörda skepp lämnar beständiga vrak
med sin utrustning; last och besättning följer befintliga förlustregler.
En gemensam rapport i Events visar deltagare, förluster, överlevande och flykt.

## Ersatta regler och avgränsning

Detta ersätter uttryckligen den fasta förlustformeln och separata strider
för egna flottor i `flottstrid-per-hex`. Kravnamnet behålls. Civila skepp
förstörs inte automatiskt när pirater överlever. De kan skyddas eller fly.
`stridsrapport-i-dialog`, `vrak-efter-strid` och
`spara-bargning-och-stridsavbrott` behåller sina namn och omfattar det nya flödet.

Inga byggbara vapen, nya skeppstyper, beständiga skrovskador eller nya
reparationsregler ingår. Befintliga sparningar och redan avgjorda rapporter
bevaras utan rensning.

## Verifiering

Kravkopplade modell- och integrationstester skyddar reglerna, individuell
skeppsidentitet, last, köade möten och bakåtkompatibel sparning. Riktade
mobiltester i Chromium och WebKit verifierar utplacering, eld före rörelse,
omladdning mitt i en aktivering och reträtt med fortsatt årssimulering.
Tärningsloggen bevaras även efter striden och kan öppnas i Events.
Manuell mobiltest följer normal snabbpublicering; sluttest och merge beställs separat.
