# Taktisk strid

## Manöver, vrak och krock, 2026-11-08

Nya strider använder `maneuverSystem`. Hastighet ligger kvar mellan
aktiveringarna och börjar på 0. Maxhastighet är skeppets rörelsetal, inklusive
ionbonus och bogsering. Äldre pågående strider utan flaggan behåller ett steg
eller en 60°-sväng per rörelsepoäng.

`manoverpoang-och-hastighet`: varje manöverpoäng ändrar hastigheten med +1, 0
eller −1 och väljer sedan vänster, höger eller rakt fram. Små och medelstora
skepp har två manöverpoäng. Transport ship, Armored Transport och Colony ship
har en. Rakt fram flyttar skeppet lika många hex som hastigheten, animerat i
dess riktning. Hastighet 0 rakt fram förbrukar poängen utan förflyttning.

`svang-vid-hastighet`: högre hastighet ger en vidare sväng. Hastighet 0 vrider
60° på plats. Hastighet 1 tar ett steg i den nya riktningen. Högre hastighet
går `ceil(hastighet / 2)` hex i den gamla riktningen och resten i den nya.

`manoverforhandsvisning` ersätts av `hexmal-for-manover`: ett tryck på ett
manöveralternativ visar enligt `skuggad-manovervag` ett skuggat skepp vid varje
steg, samt vapenkonen på slutplatsen. Det verkliga skeppet ligger kvar synligt.
`manoverval-vid-hexkant` placerar riktningar vid motsvarande hexkant. Ett andra
tryck på samma alternativ genomför manövern. `animerad-skeppsforflyttning`
visar mjuk rörelse och svängar, med paus för reaktionsskott.
`ingen-hpsiffra-pa-stridskartan` behåller HP-stapeln utan numerisk etikett.

`avslutad-manoveranimation`: kartan har en tidsgräns som avslutar
manöverpresentationen om webbläsaren inte levererar nästa animationsbildruta.
Den ordinarie animationen fortsätter bildruta för bildruta, medan reservvägen
släpper fram den sparade slutpositionen och nästa stridsorder.

`krock-med-skepp-och-asteroid`: en krock med ett annat skepp stoppar före
överlapp och ger båda skrovskada lika med den åkande skeppets hastighet,
minst 1. En asteroid försvinner, skadar skeppet en gång med samma belopp och
släpper igenom det. Vrak är oframkomliga och ger ingen rammningsskada.

`motor-utslagen-vrak`: en salva som gör minst två skada och innehåller en 6:a
slår ut motorerna. Skeppet blir då ett vrak även om skrov återstår. Krockar
slår inte ut motorerna.

`skrovslut-vrak-eller-splitter`: tar skrovet slut utan motorträff blir skeppet
vrak i 10 procent av fallen och sprängs annars. Ett vrak ritas som sin
skeppstyp men mörkare. Ett sprängt skepp ritas som debris utan spelregler.

`vrak-blockerar-och-sprangs` och `vrak-beskjutning-sista-utvag`: vraket ligger
kvar och blockerar färd. Beskjutning spränger det även vid en miss. Andra
skepp skjuter inte på vrak så länge de kan manövrera eller skjuta på ett
aktivt skepp.

`nasta-skepp-vid-slut-pa-handlingar`: när skeppet varken kan manövrera, skjuta,
reservera Overwatch, docka eller spränga ett vrak går turen vidare.

`ingen-avslut-med-fart-och-manoverpoang`: End ship turn kan inte väljas när
skeppet har fart och minst en manöverpoäng kvar, och en laglig manöver finns.
Hastighet 0, slut på poäng eller en spärrad väg tillåter fortfarande avslut.

`skott-mellan-manoverpoang`: ett skott mellan manöverpoängen avslutar inte
turen. Den kvarvarande poängen måste användas om en laglig manöver finns.
Äldre strider stänger fortfarande rörelsen efter eld när skeppet redan rört sig.

`beskjut-asteroid`: en kanon eller en missilsalva kan riktas mot en asteroid.
Asteroiden sprängs och försvinner. Den blockerar inte sitt eget skott. Andra
asteroider blockerar fortfarande eldlinjen.

`styrning-pa-skrovet` ersätts i nya strider av `hexmal-for-manover`. End ship
turn ligger kvar i skeppets mitt. Utplacering och äldre strider behåller de
större knapparna runt skrovet.

`flykt-mot-escape-zon`: obeväpnade skepp utan beväpnad eskort söker närmaste
gröna `Escape`-zon och vänder utåt, riktning 1–2 upptill och 4–5 nedtill.
Ett obeväpnat skepp med eskort håller sig undan fienden och lämnar inte kartan.

Detta ersätter i nya strider ett steg per rörelsepoäng, regeln om ingen
tröghet, att skepp och asteroider alltid är oframkomliga, och att varje
förstört skepp lämnar ett bärgningsvrak i `vrak-efter-strid`. Ett sprängt
skepp lämnar inget bärgningsvrak. Ett vrak gör det, även om skrov återstår.
Båda tas bort ur flottan.

## Bordningsskydd och flyktzoner, 2026-11-07

`pirater-skyddar-bordade-skepp` och `flyktzoner-i-rymdstrid` är
**Fullständigt implementerat**.

När ett piratskepp har dockat med ett fientligt skepp väljer övriga pirater
inte det bordade skeppet som mål. Deras soldater ska inte utsättas för den egna
flottans eld. Regeln styr piraternas automatiska beslut; den allmänna
skottmodellen får inget dolt undantag. När dockningen bryts eller bordningen
avgörs kan skeppet väljas som vanligt igen.

Nya stridskartor har tre gröna `Escape`-hexar mitt på överkanten och tre mitt
på nederkanten. De hålls fria från asteroider och används av båda sidor.
Reträtt är fortsatt låst till runda två och kräver en säker strategisk
reträtthex. I nya strider lämnar skeppet med en rak manöver i tillräcklig
hastighet. I äldre strider lämnar ett litet skepp med ett steg utåt. Transport
ship, Armored Transport och Colony ship måste föra hela sitt trehexskrov över
kanten. Under utpassagen är skeppet kvar som mål och kan avsluta sin
aktivering, men det kan inte svänga, skjuta eller docka och får därefter bara
fortsätta rakt ut.

Detta ersätter reträtt genom den egna kortsidan för nya strider. Ett valfritt
fält skiljer den nya kartregeln från äldre pågående strider, som går att spela
färdigt med sin tidigare reträtt och utan rensning av sparningar.

## Skärmfyllande spelgränssnitt, 2026-11-01

`fullskarms-stridskarta`, `skeppsnara-stridskontroller`,
`vapensymboler-i-strid`, `avfyra-pa-markerat-mal` och
`begransad-stridskamera` är **Fullständigt implementerat**.

Kartan fyller hela spelytan. HUD visar runda, aktivt skepp, skrov, rörelse och
mål. Combat details öppnar regler, skeppsdata och tärningslogg ovanpå kartan.
Save and close återgår till Saved games. Utplacering använder skeppsporträtt
med placeringsstatus, två svängknappar, Auto deploy och Start combat.

Fyra symbolknappar ligger runt eget aktivt skepp: Forward vid nosen,
svängarna vid sidorna och End ship turn bakom. De följer riktning och kamera,
har minst 44 pixlars tryckyta och viks inåt vid skärmkanter. De döljs om
skeppet är utanför bilden. Samma regler för rörelse, kollision och tur gäller.

Vapensymbolerna ligger i nederkant och visar valt vapen och ammunition.
Vapenval avfyrar inget. Tryck på ett nytt mål markerar; nästa tryck avfyrar.
Autoaims redan markerade mål kan beskjutas med första trycket. Cannon träffar
valt mål även om spelaren trycker på en annan del av samma stora skrov;
den giltiga valda träffhexen behålls. För Missiles markerar en ny hex området,
med avfyrning först vid nästa tryck på samma hex. Tomma områden är tillåtna.
Enter eller Space på kartan fungerar som tryck på vald träffhex.
Drag, nypzoom, avbrutna gester, mushjul och tryck på överlägg avfyrar aldrig.

Kameran styrs med drag och nypzoom; datorns mushjul kan zooma.
Inga kameraknappar eller kamerakommandon på tangentbordet finns.
Minsta zoom visar hela spelplanens omslutande rektangel och fyller skärmen
i minst en riktning. På stående mobil syns då hela bredden med centrerad
rymd ovanför och under. Kameran kan inte zoomas ut så att spelplanen blir
mindre än skärmen i båda riktningarna. Detta ersätter kravet att täcka både
bredd och höjd efter användarens förtydligande av `begransad-stridskamera`.
Om kartan är mindre än skärmen i en riktning centreras den där. Annars
tillåter panorering högst 24 pixlar utanför spelplanens omslutande rektangel.
Största zoom är 3 eller minsta tillåtna zoom om skärmen kräver mer.
Skärmrotation bevarar kamerans mitt och begränsar den på nytt.
Ett aktiverat eller flyttat skepp förs in i bild när kartkanterna medger det,
även för fienden. Mellan sådana ändringar behålls spelarens panorering.
Avfyrning återställer inte kameran.

Detta ersätter orderpanelerna i `stridsorder-utan-mobilscroll` och
Fire weapon i `traffhex-istallet-for-mallista`. `fuskknapp-for-teststrid`
använder nu vanliga asteroider utanför startzonerna. Befintliga sparningar
bevaras utan ändrat format eller rensning.

## Autoaim och stora skrov, 2026-11-01

`autoaim-med-manuellt-mal` — **Fullständigt implementerat**. När siktet saknar
mållåsning väljer Autoaim närmaste träffbara fiende inom vapnets främre båge.
Lika avstånd avgörs av hur rakt framför målet ligger. Spelaren kan klicka på
andra mål eller justera missilernas träffhex. Ett giltigt valt mål behålls.
En låsning tappas när målet inte längre kan träffas; nästa giltiga mål väljs
automatiskt, eller siktet blir utan mål om inget finns.

`stora-skepp-over-flera-hex` — **Fullständigt implementerat**. I nya strider
upptar Transport ship och Colony ship tre hex: mitthexen och en hex framför
respektive bakom. Armored Transport har samma form. Resten upptar en hex.
Alla skrovhex räknas för klick, kollision, räckvidd, träff och befintliga
regler om större skepps skydd. Missiler slår bara en gång per skepp även om
flera av dess hex ingår i området. Automatisk utplacering tar hänsyn till
hela skrovet. Svängar till en överlappande eller ogiltig placering tillåts inte.
I nya strider sker reträtt först när hela skrovet har passerat en markerad
`Escape`-zon, från runda två. Äldre pågående strider behåller kortsideregeln.

Detta ersätter en hex per skepp i `taktisk-stridskarta` och
`stridsutplacering` för nya strider. Äldre pågående strider behåller sina
placeringar och tidigare storlek och går att spela färdigt utan rensning.

## Skott och partiklar, 2026-11-01

`animerade-stridsskott` och `skadepartiklar-i-strid` är **Fullständigt
implementerat**. Cannon och Raider cannon visar projektil och mynningsblixt.
Missiles visar partikelspår och områdesexplosion. Skada ger gnistor och en
träffblixt; förstörda skepp ger explosion och splitter. Effekterna varar
620 ms och klingar av utan bestående rök. Miss ger inget skadepartikelsprut.
Träfftext och tärningslogg behålls. Nästa handling och Battle complete-beskedet
väntar tills effekten avslutats, även efter den sista salvan.

Effekterna följer kartans panorering och zoom. Vid minskad rörelse visas
resultatet direkt med stilla träffmarkering. Omladdning spelar inte gamla
skott igen och påverkar inte tärningar, skador eller ammunition.

Spelaren leder varje skepp i en turbaserad strid på en egen hexkarta.
Vapen, manövrering, riktning, skydd och synliga D6-slag avgör utfallet.
Alla flottor på samma Star map-hex deltar tillsammans.

## Tydlig återkoppling och teststrid, 2026-10-31

- `synligt-stridsresultat` — **Fullständigt implementerat**: senaste salvan visar
  Hit eller Miss, skada, skytt, vapen, mål och återstående skrov eller destroyed
  direkt på kartan. Även den sista salvan visas; Combat details behöver inte öppnas.
- `synligt-stridsslut` — **Fullständigt implementerat**: Battle complete visar
  Victory, Defeat eller Retreat complete samt egna förluster och flydda skepp
  på stridskartan i 2,8 sekunder innan spelet fortsätter automatiskt.
- `automatiskt-skeppsval-i-strid` — **Fullständigt implementerat**: när spelarens
  sida får turen väljs och aktiveras ett tillgängligt eget skepp, beväpnade först.
  En redan påbörjad sparad aktivering fortsätter utan nytt val eller nya slag.
  Detta ersätter kravet på ett manuellt första val i `skeppsval-startar-stridstur`.
  End ship turn behålls och varje skepp agerar fortsatt högst en gång per runda.
- `synliga-fiendemanovrer` — **Fullständigt implementerat**: fiendens aktivering,
  varje enskild sväng, hexsteg, salva och turavslut visas separat med paus mellan
  stegen. Samma rörelseregler gäller båda sidor, även efter omladdning.
- `fuskknapp-for-teststrid` — **Fullständigt implementerat**: Test battle (cheat)
  i huvudmenyn börjar med utplacering av små skepp samt Transport ship och
  Colony ship och vanliga asteroider. Den kan upprepas, avslutas till menyn och ändrar inga sparplatser.
  Detta ersätter färdig placering och omedelbar stridsstart.
- `stridsrapport-i-dialog` — **Fullständigt implementerat**, ändrat krav:
  rapportens informationsruta och Handle/Ignore-val efter striden tas bort.
  Resultatet visas på stridskartan och rapport med tärningslogg bevaras i Events.
  Året fortsätter automatiskt när övriga upptäckter är hanterade. Detta ersätter
  rapportdialogen i `gemensamt-handelseflode` och tidigare rapportval i detta krav.

Sparformat och befintliga sparningar bevaras.

`skeppsval-startar-stridstur` — **Fullständigt implementerat**, med automatiskt
förstaval enligt `automatiskt-skeppsval-i-strid` ovan: under egen
stridstur startar val av ett oanvänt eget skepp på kartan dess tur direkt.
Ingen Activate ship-knapp visas. End ship turn avslutar
skeppets tur. Ett valt skepp spelar klart före nästa val, och varje skepp får
fortsatt bara agera en gång per runda. Under fiendens tur eller vid val av
ett redan använt skepp startar ingen ny tur. Utplaceringsval är fria och
pågående sparade skeppsturer återupptas direkt utan ny aktivering.

`stridsorder-utan-mobilscroll` — **Fullständigt implementerat**, ändrat krav:
orderpanelen ersätts av knappar runt skeppet och vapensymboler i nederkant.
Kartan fyller hela skärmen, även på 320 × 568 och liggande 844 × 390.
Combat details samlar skeppsdata, skottförklaring, tärningslogg och längre regler.
Detta ersätter panelplaceringen från 2026-10-31. Turordning och stridsregler
behålls; sparade spel bevaras.

`skeppets-framat-foljer-spriten` — **Fullständigt implementerat**:
skeppsbildens nos, kartans framåtmarkering, Forward och den främre eldbågen
har samma riktning i alla sex lägen. Det gäller egna skepp och Space pirates,
både vid utplacering och under strid. Reservsymbolen före bildladdning följer
samma riktning. Förtydligandet 2026-10-31 av `stridsutplacering` och
`riktning-och-vapen` rättar den tidigare 90° vridningen av skeppsbilderna.
Stridsregler och sparade riktningar bevaras.

| Krav                              | Status                     | Innehåll                                                                                     |
| --------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| `taktisk-stridskarta`             | Fullständigt implementerat | Separat karta, minst 13 × 9 hexar, växer tills alla skepp ryms.                              |
| `gemensamt-stridsdeltagande`      | Fullständigt implementerat | Alla skepp från båda sidors flottor på samma galaxhex deltar.                                |
| `stridsutplacering`               | Fullständigt implementerat | Egen startzon, sex riktningar och Auto deploy. Fiendens placering avslöjas vid start.        |
| `vaxelvisa-skeppsaktiveringar`    | Fullständigt implementerat | Växelvis ett skepp, ett rörelsemoment och en salva i valfri ordning.                         |
| `riktning-och-vapen`              | Fullständigt implementerat | Fasta vapen, eldbågar, ammunition och svag akter.                                            |
| `skyddande-stridshinder`          | Fullständigt implementerat | Asteroider och större skepp blockerar skott helt.                                            |
| `oppna-stridstarningar`           | Fullständigt implementerat | Initiativ och vapensalvor visar D6-slag.                                                     |
| `skeppsvis-retratt`               | Fullständigt implementerat | Enskilda skepp lämnar markerad över- eller nederkant från runda två. Flottan samlas efteråt. |
| `sparad-taktisk-strid`            | Fullständigt implementerat | Utplacering, skador, ammunition, aktivering och slump sparas.                                |
| `utforskade-stridsuppgraderingar` | Fullständigt implementerat | Missiler och pansarskrov forskas fram och monteras med Upgrade.                              |
| `missilernas-omradeseffekt`       | Fullständigt implementerat | Missiler träffar vald hex och alla grannhexar. En Fighter har två salvor.                    |
| `traffhex-istallet-for-mallista`  | Fullständigt implementerat | Skott siktas mot en hex på kartan. Ingen mållista.                                           |

## Möte och utplacering

Efter ett gemensamt hexsteg börjar strid när egna skepp och pirater finns på
samma galaxhex. Flottor som byter hex med varandra möts inte. Förstärkningar
förenas efter striden. Möten på olika hexar hanteras ett i taget och året
väntar tills striderna och slutåterkopplingen är färdiga.

Varje skepp är en egen pjäs; stora skrov upptar tre hex i nya strider.
Båda sidor placerar i motsatta ändar.
Spelaren väljer position och riktning eller använder Auto deploy. Fiendens
placering visas när striden börjar. Startzoner och karta växer med flottorna;
inga skepp hålls i reserv. Asteroidgrupper täcker cirka 12 procent av ytan
utanför startzonerna. Alla fria hexar är sammanbundna.

## Runda och manövrering

Båda sidor slår D6 inför varje stridsrunda. Högst börjar; lika slås om.
Sidorna aktiverar växelvis ett valfritt, oanvänt skepp. Varje skepp agerar
en gång per runda. Den sida som har fler skepp fortsätter när motståndaren
har aktiverat alla sina.

En aktivering ger högst en vapensalva och, i nya strider, de manöverpoäng som
beskrivs överst. I äldre strider utan `maneuverSystem` kostar ett steg framåt
eller en sväng på 60° en rörelsepoäng. Efter rörelse följd av eld får skeppet
inte röra sig igen. Oanvänd rörelse försvinner.

| Skepp             | Storlek | Skrov | Rörelse |
| ----------------- | ------- | ----: | ------: |
| Fighter           | Small   |     3 |       4 |
| Armored Fighter   | Small   |     5 |       4 |
| Space pirate      | Small   |     2 |       4 |
| Civilian shuttle  | Small   |     3 |       3 |
| Exploration ship  | Medium  |     4 |       3 |
| Salvage ship      | Medium  |     5 |       3 |
| Transport ship    | Large   |     6 |       2 |
| Armored Transport | Large   |     9 |       2 |
| Colony ship       | Large   |     8 |       2 |

Minst en Ion pulse engine ger +1 rörelse. Bogsering ger grundrörelse 1 före
motorbonusen. Släp är ingen egen aktiverbar pjäs.

## Vapen, skydd och tärningar

| Vapen         | Bärare                     | Räckvidd | Främre båge | Salva                               | Träff |
| ------------- | -------------------------- | -------- | ----------- | ----------------------------------- | ----- |
| Cannon        | Fighter, Armored Fighter   | 1–3 hex  | 120°        | 2D6, obegränsat                     | 4+    |
| Missiles      | Fighter med uppgraderingen | 2–6 hex  | 60°         | 3D6 per skepp i området, två salvor | 4+    |
| Raider cannon | Space pirate               | 1–3 hex  | 120°        | 2D6, obegränsat                     | 5+    |

Civila skepp är obeväpnade. Armored Fighter och Armored Transport är samma
skeppstyper med pansarskrov. Last, storlek och fart är oförändrade. Pansaret
och missilerna monteras med Upgrade efter forskning. En ny Fighter börjar utan
missiler. En Fighter i ett äldre sparat spel, där fältet saknas, behåller två
salvor.

`traffhex-istallet-for-mallista`: Autoaim föreslår mål och spelaren kan ändra
träffhex på kartan. Tryck på redan markerat mål avfyrar enligt
`avfyra-pa-markerat-mal`. Det finns ingen mållista. Cannon och Raider cannon
kräver ett fientligt skepp på hexen. Missiler kan sikta på en tom hex.

`missilernas-omradeseffekt`: en missilsalva träffar alla aktiva skepp på
träffhexen och de sex grannhexarna, även egna. Varje träffat skepp slås för
sig. En tom yta förbrukar salvan utan tärningsslag. Fri skottlinje krävs till
träffhexen. Skepp i området träffas även om de ligger utanför vapnets båge
eller en hex bortom maxräckvidden.

Varje lyckad tärning ger en skrovskada.
Anfall från målets bakre 120° sänker träffkravet med ett. Bågarnas gränser
ingår. Slagen visas tillsammans med träffkrav, skada och återstående skrov.

Asteroider bryter skottlinjen helt. I nya strider kan ett skepp köra in i en
asteroid: asteroiden försvinner och skeppet tar krockskada. I äldre strider är
asteroider ofarbara och oförstörbara. Skepp blockerar eld om det är större
än den mindre av skytten och målet. Detta gäller båda sidor. Skottlinjen går
mellan hexarnas centrum; även beröring av ett hinders kant blockerar.
Missiler kräver också fri linje. Kartan är synlig: skydd döljer inte pjäser.

## Reträtt och resultat

Från andra stridsrundan kan ett skepp fly genom någon av de sex markerade
`Escape`-hexarna på över- och nederkanten. Hela skrovet måste lämna kartan;
ett delvis utpasserat stort skepp kan fortfarande angripas men är låst till
fortsatt rak reträtt. Flydda skepp kan inte angripas. Före striden väljs en säker
grannhex på Star map per flotta: tidigare hex i första hand, annars första
farbara grannhex utan fiender. Pirater måste stanna på sin patrullring.
Saknas säker grannhex visas att reträtt inte är möjlig.

Har något skepp flytt samlas ursprungsflottans alla överlevande på dess
reträtthex efter striden. Order och återstående årsrörelse stoppas. Last
och passagerare i överlevande skepp bevaras. Lastade transportuppdrag pausas
och kan återupptas med Resume orders after retreat. Flottan delas inte.

Striden slutar när ena sidan saknar aktiva skepp. Vrak räcker inte för att
hålla striden igång. Överlevande får fullt skrov och ny ammunition efter
striden. Ett skepp som slutar som vrak lämnar ett beständigt bärgningsvrak med
sin utrustning. Ett sprängt skepp gör det inte. Last och besättning följer
befintliga förlustregler. En gemensam rapport i Events visar deltagare,
förluster, överlevande och flykt.

## Ersatta regler och avgränsning

Detta ersätter uttryckligen den fasta förlustformeln och separata strider
för egna flottor i `flottstrid-per-hex`. Kravnamnet behålls. Civila skepp
förstörs inte automatiskt när pirater överlever. De kan skyddas eller fly.
`stridsrapport-i-dialog`, `vrak-efter-strid` och
`spara-bargning-och-stridsavbrott` behåller sina namn och omfattar det nya flödet.

`Raptor` är en liten trupptransport med light cannon. Missiler och pansarskrov
är uppgraderingar av Fighter och Transport ship. Befintliga sparningar och
redan avgjorda rapporter bevaras utan rensning.
Test battle behåller två missilsalvor på sina Fighters så att vapnet kan prövas.

## Dockning och bordning

`docka-babord-styrbord` och `lassta-dockade-skepp` är **Fullständigt
implementerat**. `Dock` är en stridsorder i stället för skott när ett
`Space pirate` eller `Raptor` har kontakt längs babord eller styrbord mot ett
bordningsbart skepp. Nos mot nos och T-kollision är otillåtna. Dockade skepp
är låsta, ritas med en brygga och den pågående rymdrundan körs färdigt innan
bordning. Därefter växlar `bordning-tva-rundor-skift` två rundor i taget.
Se [bordningsstrid](boarding/boarding-combat.md).

## Verifiering

Kravkopplade modell- och integrationstester skyddar reglerna, individuell
skeppsidentitet, last, köade möten och bakåtkompatibel sparning. Riktade
mobiltester i Chromium och WebKit verifierar utplacering, eld före rörelse,
omladdning mitt i en aktivering och reträtt med fortsatt årssimulering.
Tärningsloggen bevaras även efter striden och kan öppnas i Events.
Manuell mobiltest följer normal snabbpublicering; sluttest och merge beställs separat.
