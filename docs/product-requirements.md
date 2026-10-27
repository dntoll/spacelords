# Produktkrav och status

## Utökad galax

`stjarnornas-hexutseende` ändras 2026-10-27: stjärnor varierar i färg och storlek,
har en livfull, texturerad yta i närbild och hålls innanför hexen. Alla spikes
tas bort. Vid utzoomning förenklas de till glödande kroppar och ljuspunkter.
`utokad-utzoomning` kompletterar `kartnavigation`:
spelaren kan zooma ut till 3 procent och se en renare översikt utan tätt
rutnät eller överlappande namn. Outforskade hexars rutnät försvinner under
50 procent zoom. Nya galaxer får 150 system i oregelbundna spiralarmar.
Detta ersätter den tidigare spikes-regeln och 300 system i nya galaxer.
Befintliga sparade galaxer behålls.

`stjarnvariation`, `galaxarmar`, `dragbara-flottorder`,
`kompakt-forskningstrad`, `forskningens-avslojande`,
`forskningsdetaljer-vid-val` och `produktionsvalens-statusfarger` beskrivs i
[varierad galax och kompakta spelvyer](varied-galaxy-compact-views.md).

Kraven för den större galaxen, stjärnor, planetavstånd, asteroidbälten,
nebulosor och utforskning finns i [galax och terräng](galaxy-terrain.md).
De ersätter tidigare storlek, direkt angränsande planeter och fri passage
genom stjärnhexar. Där anges också den uttryckligen godkända engångsrensningen.

`kompakta-koknappar` — **Fullständigt implementerat**: Research queue och
Build queue har kompakta symbolknappar: ↑ och ↓ flyttar en order, × tar bort
den. Knapparna visar förklarande hjälptexter och har tydliga namn för
skärmläsare. Knapparna behåller minst 44 px klickyta och befintliga regler för
omordning, borttagning och bekräftelse.

Visionen beskrivs i [game-vision.md](game-vision.md). Namnen är stabila referenser.
**Fullständigt implementerat** avser hela det beskrivna kravet, inte hela spelet.
För delvisa krav anges vad som återstår. Exempelvärden är inte beslut om balans.

## Första spelgrunden

`flottpatrullering` — **Fullständigt implementerat**: Flottor med minst en
Fighter kan få ordern Patrol. Hela flottan cirklar runt orderhexens sex
grannhexar och jagar pirater som syns genom spelarens gemensamma sikt, inom
flottans aktuella fart i hex från dess nuvarande position. Motorer och
långsammare medföljande skepp påverkar räckvidden. När ingen giltig pirat finns
återgår flottan till sitt ursprungliga patrullvarv. Patrol består tills den
avbryts, ersätts av en annan order eller flottan saknar Fighters. Ordern och
pågående år bevaras vid omladdning. Se [Space pirates](space-pirates.md).

`byggnadsantal-lokalt-och-globalt` — **Fullständigt implementerat**: Varje
byggnadstyp i Build selection visar antal direkt i den kompakta listan, både
på aktuell planet och totalt på alla spelarens planeter, inklusive den aktuella.
Detaljpanelens Already built visar samma värden. Noll visas när
byggnadstypen saknas. Befintliga byggnader räknas även om de tillfälligt står
stilla eller väntar på rivning; köade projekt räknas först när de är färdiga.

| Kravnamn                    | Status                     | Krav och återstående arbete                                                                                                                                                                                                                                                                                          |
| --------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fast-exempelvarld`         | Fullständigt implementerat | En återkommande exempelvärld med tre åtskilda stjärnsystem, både gasplaneter och fasta planeter och exakt en ägd hemplanet. En tom sparplats börjar i exempelvärlden; befintliga spel återupptas.                                                                                                                    |
| `hexkarta`                  | Fullständigt implementerat | En stjärna upptar en hexagon och dess planeter varsin direkt grannhexagon, högst en planet per hexagon. Tom rymd skiljer systemen åt.                                                                                                                                                                                |
| `statisk-planetplacering`   | Fullständigt implementerat | Stjärnor och planeter ligger stilla på kartan.                                                                                                                                                                                                                                                                       |
| `lokal-sikt`                | Fullständigt implementerat | Aktuell sikt beräknas från ägda planeter och flottor. Planeter ser normalt 1 hex; teleskopfabriker och monterade skeppsteleskop ger upp till 3 hex. Tidigare utforskning bevaras separat från aktuell sikt.                                                                                                          |
| `synliga-stjarnor`          | Fullständigt implementerat | Alla stjärnpositioner kan ses även utanför den lokala sikten.                                                                                                                                                                                                                                                        |
| `kartnavigation`            | Fullständigt implementerat | Spelaren kan markera rutor, zooma och panorera med mus, touch eller tangentbord. Home återgår till hemplaneten. Kartan saknar kontrollruta för zoom och Homeworld. Dragning ska inte välja en ruta.                                                                                                                  |
| `planetinformation`         | Fullständigt implementerat | Spelaren kan öppna en ägd planet och se namn, ägare, befolkning, gästvänlighet, resurser, byggplatser och byggnader.                                                                                                                                                                                                 |
| `visa-byggalternativ`       | Fullständigt implementerat | Build selection visar en kategoriserad lista med symbol och namn för upplåsta byggnader. Ett val öppnar full information med engångskostnad och personalbehov. Material- och personalbrist visas men hindrar inte köläggning. Beställning eller Back to Building sites återgår till rätt byggplats i Building sites. |
| `forskningsoversikt`        | Fullständigt implementerat | Research visar ett navigerbart träd med valbar forskning, pågående forskning, färdiga upplåsningar och antal arbetande Research stations.                                                                                                                                                                            |
| `vynavigation`              | Fullständigt implementerat | Spelaren kan återgå till kartan från planet- och forskningsinformationen. Vald ruta och kartans läge bevaras tills sidan laddas om.                                                                                                                                                                                  |
| `flera-skarmstorlekar`      | Fullständigt implementerat | Spelet går att använda på mobil, surfplatta och dator.                                                                                                                                                                                                                                                               |
| `direktatkomst-utan-lankar` | Fullständigt implementerat | Appen nås via sin direktadress utan nya länkar eller navigationsval på den befintliga webbplatsen.                                                                                                                                                                                                                   |

## Spelupplevelse

| Kravnamn                    | Status                     | Krav och återstående arbete                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `viewport-game-layout`      | Fullständigt implementerat | Alla vyer fyller skärmen utan sidscroll på mobil, surfplatta och dator, även med större systemtypsnitt på smala skärmar. Avgränsade spelpaneler får ha intern scroll. Kartan tar huvuddelen av skärmen tills spelaren utökar detaljpanelen genom rullning enligt `rullningsbar-kartpanel`.                                                      |
| `focused-interface`         | Fullständigt implementerat | Visa spelinformation och handlingar utan introduktionsrubriker och dekorativa småtexter. Behåll beskrivningar av stjärnor och planeter.                                                                                                                                                                                                         |
| `english-game`              | Fullständigt implementerat | Alla texter, hjälptexter och namn på råvaror i spelet är på engelska.                                                                                                                                                                                                                                                                           |
| `gemensamma-byggnadsbilder` | Fullständigt implementerat | Colony ship factory, Exploration ship factory, Fighter factory och Research station använder var sin tillhandahållen byggnadsbild. Samma bild används i Research, Build selection samt pågående och färdiga byggen i Overview. Hela bilden visas med bevarade proportioner. Gemensam platshållare visas om en bild saknas eller inte kan visas. |
| `kompakta-bygghandlingar`   | Fullständigt implementerat | Byggplatser och byggval har kompakta, innehållsbreda knappar med minst 44 px klickhöjd. Byggande är primär handling, rivning och avbrytning sekundära. Status och fabrikens tillhörande kö framgår tydligt.                                                                                                                                     |

`forsknings-tradnavigation` — **Fullständigt implementerat**: Research är ett
forskningsträd med pilar från förkunskap till beroende teknik. Spelaren kan
panorera, zooma och få en översikt med mus, touch eller tangentbord. Kameran
behålls vid köändringar och navigering mellan vyer. Byggnadsbilder och tydliga
statusar visar valbar, köad, pågående och färdig forskning. Senare forskning
visas anonymt tills dess förkunskaper är klara; köad och återfunnen teknik
förblir identifierad. Val visar detaljer och en separat Research-knapp.
Research queue
behåller omordning och bekräftad borttagning. Detta ersätter den tidigare
listvyn; forskningsreglerna och teknikernas förkunskaper behålls.

`forskningstradets-utrymme` — **Fullständigt implementerat**: Forskningsträdet
fyller återstående Research-yta efter rubrik, eventuell beslutshjälp och rundkontroller. Antal Research stations visas bredvid rubriken
även på smala telefoner med bredare systemtypsnitt,
med stationsinformation tillgänglig vid behov. Inga sidopaneler reserverar utrymme; Events och End turn använder en nedre rad enligt `rundkontroller-pa-fler-vyer`. Research queue visar sitt antal och öppnas vid
behov ovanpå trädet; en öppen kö ligger kvar under omordning och borttagning.
Zoomrutan med plus, minus, procent och anpassning tas bort. Pinch, mushjul och
tangentbordets zoom, panorering och översikt finns kvar.

- 2026-10-21: `forskningstradets-utrymme` ersätter den fasta stations- och
  köpanelen samt zoomrutan i Research. Reglerna i `forskningsoversikt` och
  `forsknings-tradnavigation` behålls.

## Fortsatt spelutveckling

| Kravnamn                          | Status                     | Krav och återstående arbete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stjarnsystem-och-asteroidbalten` | Delvis implementerat       | Stjärnsystem med fasta planeter och gasplaneter finns. Asteroidbälten återstår.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `planetforvaltning`               | Delvis implementerat       | Namn, lager, utvinning, befolkning, byggplatser och byggnader kan förvaltas för egna kolonier. Kolonisation och transportnät finns; ytterligare planetutveckling återstår.                                                                                                                                                                                                                                                                                                                                                             |
| `kolonisation`                    | Fullständigt implementerat | Colonize grundar en ägd koloni på en obebodd planet när ett Colony ship finns där. Exakt ett skepp förbrukas och dess 1 000 personer blir kolonins befolkning. Kolonin börjar med tomt lager, planetens fyndigheter och byggplatser samt imperiets upplåsningar. Planeten och dess grannar utforskas.                                                                                                                                                                                                                                  |
| `befolkningsutveckling`           | Fullständigt implementerat | Efter varje år växer befolkningen med tio procent, skalat efter habitability, efter avdragen skeppsbesättning och upp till planetens befolkningstak.                                                                                                                                                                                                                                                                                                                                                                                   |
| `gastvanlighet`                   | Fullständigt implementerat | Habitability mellan 0 och 100 procent visas och kan förbättras genom terraforming. Befolkningskapacitet, byggplatser och andningsbar atmosfär följer planetens aktuella värde.                                                                                                                                                                                                                                                                                                                                                         |
| `fabrikbyggande`                  | Fullständigt implementerat | Alla upplåsta skepps- och delfabriker kan byggas som permanenta byggnader på tomma byggplatser. Byggorder kan avbrytas och rivning schemaläggas eller ångras.                                                                                                                                                                                                                                                                                                                                                                          |
| `bygga-forskningsstation`         | Fullständigt implementerat | Research station kräver ingen egen forskning och kan byggas flera gånger per planet. Under 80% habitability måste byggplatsen först förberedas med en Dome av rätt typ.                                                                                                                                                                                                                                                                                                                                                                |
| `produktion`                      | Delvis implementerat       | Colony ship, Exploration ship, Fighter och Transport ship byggs i sina fabriker. Utvinningsbyggnader producerar Iron, Water och Oil. Övriga framtida produkter återstår.                                                                                                                                                                                                                                                                                                                                                               |
| `fororeningar`                    | Ej implementerat           | Fabriker kan försämra gästvänligheten genom utsläpp.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `domes-per-byggplats`             | Fullständigt implementerat | Domes ersätter Habitat. Under 80% habitability förbereds varje byggplats med en Dome av rätt planettyp innan den används. En Dome upptar ingen extra plats och behålls vid rivning.                                                                                                                                                                                                                                                                                                                                                    |
| `terraformning`                   | Fullständigt implementerat | Bemannade fabriker ökar habitability med fem procentenheter per fabrik och år upp till 100%. Endast stenplaneter kan omformas. Förbättringar består efter rivning.                                                                                                                                                                                                                                                                                                                                                                     |
| `forskningstrad`                  | Delvis implementerat       | Forskningskö med förkunskaper låser upp fyra skeppsfabriker och Trade logistics. Bättre fabriker, minskade utsläpp och effektivare arbetskraft återstår.                                                                                                                                                                                                                                                                                                                                                                               |
| `arsrundor-och-order`             | Fullständigt implementerat | Spelaren ger order, kan ändra bygg- och flyttorder före årets slut, avslutar året och återgår automatiskt till nästa års planering. Vid upptäcktsavbrott kan spelaren ändra rörelseorder och sedan välja Continue. Colonize grundar kolonin direkt.                                                                                                                                                                                                                                                                                    |
| `manuell-rundstyrning`            | Ej implementerat           | Under utveckling kan spelåren styras manuellt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `flottor`                         | Delvis implementerat       | Flottor kan döpas, delas på samma hexagon och få destinationer från Star map och Fleets. Strid och diplomati återstår.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `arbetskraft-och-besattning`      | Fullständigt implementerat | Byggnader, projekt och skepp reserverar arbetare och besättning.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `skeppstyper`                     | Fullständigt implementerat | Colony ship, Exploration ship, Fighter och Transport ship har fasta roller, fart och besättning. Transport ship ger lastkapacitet.                                                                                                                                                                                                                                                                                                                                                                                                     |
| `flottadministration`             | Fullständigt implementerat | Star map och Fleets visar flottorna vid vald flotta med skeppsbilder. På Star map fungerar även hexval. Ett skepp kan dras eller väljas och flyttas till en lokal eller avlägsen flotta, eller till New fleet. Namnbyte, destinationsorder, Colonize, rutttilldelning och frigörande finns i flottpanelen. Förstärknings- och lastregler behålls.                                                                                                                                                                                      |
| `tomma-flottor`                   | Fullständigt implementerat | Tomma flottor behåller sina namn, saknar position och destination och kan väljas som mottagare av skepp. De visas inte på kartan. Separata knappar för att skapa eller radera tomma flottor ingår inte längre.                                                                                                                                                                                                                                                                                                                         |
| `flottdestinationer`              | Fullständigt implementerat | En destination väljs på Star map eller Fleets, kan ändras eller rensas före årets slut och kan inte ges till en tom flotta eller ersätta ett aktivt ruttuppdrag.                                                                                                                                                                                                                                                                                                                                                                       |
| `kartflottor`                     | Fullständigt implementerat | Varje egen flotta med skepp visas som en separat liten svärm av trianglar, även utanför synlig rymd. Flottor i samma hex placeras jämnt längs en cirkel innanför hexen och behåller sin ordning medan samma flottor finns kvar. Svärmarna anpassas för att rymmas. Skeppstyper har olika storlek. Skeppen pekar mot destinationen och pilen börjar vid flottmarkören. Tomma flottor saknar kartmarkör.                                                                                                                                 |
| `rundsimulering`                  | Fullständigt implementerat | Flottor färdas samtidigt längs kortaste väg enligt långsammaste skeppets fart.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `handelser`                       | Fullständigt implementerat | Events visas tillsammans med End turn i Decisions, Research, planetvyn och på kartan när inget objekt är valt. Listan kan fällas ut och in och anpassas till tillgängligt utrymme. Loggen kan rullas utan att täcka andra kontroller. Flottankomster visar namn och destination; enskilda steg och upptäcktsantal utelämnas. Händelser sparas och visas i kronologisk ordning; listan visar bara senaste året enligt `senaste-aret-i-events`. Efter året följer uppspelning enligt `sekventiella-arshandelser`. Ersätter Turn summary. |
| `skeppsutforskning`               | Fullständigt implementerat | Alla skepp utforskar besökt hexagon permanent. Exploration ship utforskar även sitt aktuella synfält på 1–3 hex beroende på monterat teleskop. Rutor utanför aktuell sikt är mörkare.                                                                                                                                                                                                                                                                                                                                                  |
| `planetbudgetoversikt`            | Fullständigt implementerat | Overview visar planetens lager, utvinning, kvarvarande fyndigheter, aktiv efterfrågan, inkommande last, personal och byggplatser. Detta ersätter årsbudget.                                                                                                                                                                                                                                                                                                                                                                            |
| `civilisationskontakt`            | Ej implementerat           | Flottor kan få order för första kontakt och möten med kända civilisationer.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `multiplayer`                     | Ej implementerat           | Flera spelare kan delta, med riktningen en eller två rundor per verkligt dygn.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `sparat-spel`                     | Fullständigt implementerat | Spelaren kan återuppta varje sparplats efter omladdning. Order, byggnader, köer, forskning, kolonier, flottor, utforskning, händelser och spelår bevaras. Sparning sker automatiskt efter order, upptäcktsavbrott och avslutade rundor. Avbrutna år återupptas med samma återstående förflyttning och uppskjutna strid.                                                                                                                                                                                                                |

## Flottfokuserad karta

`flottfokuserad-kartvy` — **Fullständigt implementerat**: Fleets visar flottor,
deras destinationer och en lokal flottpanel. Ej valda flottor har streckade
cirklar, även vid hovring; vald flotta har en heldragen markeringscirkel.
Planeter, stjärnor och handelslinjer visas diskret som orientering och går inte
att välja eller dra. Himlakropparnas namn visas med full tydlighet.
Planeternas informationsmärken döljs. Klick på bakgrunden stänger flottvalet,
även utanför hexområdet. Under destinationsval anger ett giltigt kartklick
i stället destinationen. Escape avbryter tillfälliga val. Drag över en handelslinje
ger en destination och tilldelar aldrig rutten. R-tangenten skapar ingen rutt.
Flottpanelens befintliga åtgärder behålls, inklusive Colonize och rutttilldelning.
Uttryckliga planetlänkar öppnar planeten och ruttlänkar öppnar Star map.
Star map behåller sitt utseende och sina interaktioner.

`delad-kartkamera` — **Fullständigt implementerat**: Star map, Fleets, Route och
Production har samma kamera, zoom och panorering med mus, touch och tangentbord.
Växling avbryter tillfälliga orderval och gester. Flottval bevaras mellan Star map
och Fleets; Production prioriterar planetval. Vid planetval i Production flyttas
kameran bara om byggcirkeln behöver mer plats.
Direktöppning av en bestämd flotta från exempelvis Decisions väljer och centrerar
på den om den har position, utan att återställa zoom.

## Skeppsbilder och flottbyggare

| Kravnamn                      | Status                     | Krav                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tomma-flottor-utan-position` | Fullständigt implementerat | En ny eller tömd flotta saknar position och kan ta emot skepp från vilken plats som helst. Första skeppet bestämmer positionen. Därefter sker direkt anslutning bara på samma hex; förstärkning på avstånd följer `skepp-till-rorlig-flotta`. Fabriker levererar lokalt eller till tom mottagare. Tomma flottor har ingen kartmarkör och kan inte få destination. Regeln ersätter tidigare krav på samlokalisering även för tomma mottagare. |
| `skeppsbilder`                | Fullständigt implementerat | Colony ship, Fighter och Exploration ship använder var sin frilagd bild från den tillhandahållna skeppsbilden. Bilderna visar flottans skepp både när flottan är markerad på Star map och i Fleets. Stora flottor får en begränsad bildförhandsvisning med tydligt antal ytterligare skepp.                                                                                                                                                  |

## Flottval och destinationsdrag

`planetoppning-i-kartrubrik` — **Fullständigt implementerat**: Open planet är
en kompakt knapp bredvid den ägda planetens namn och hexkoordinat överst i
kartpanelen. Den öppnar planeten i rubriken, även när en flotta har valts på
en annan plats än den markerade hexen. Knappen behåller en lättanvänd klickyta.

`flottadministration` visar flottkorten direkt utan Expand fleet panel eller
Help. Detta ersätter den tidigare utfällningen; panelen kan fortsatt rullas.

`flottnamn-direktredigering` — **Fullständigt implementerat**: Flottans namn på Star map
kan redigeras genom dubbelklick. Enter sparar och Escape avbryter. Namnbyte
är också åtkomligt med touch och tangentbord utan dubbelklick.

`flottknappar-pa-kartan` — **Fullständigt implementerat**: Star map saknar knapparna
Set destination och Edit fleet. Flottor organiseras direkt på kartan och
destinationsdrag behålls. Destination ska även kunna väljas utan drag;
möjligheten att rensa en destination behålls.

| Kravnamn               | Status                     | Krav                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flottval-pa-kartan`   | Fullständigt implementerat | Flottor har en cirkulär träffyta med radie en fjärdedel av hexradien. Flottklick väljer flottan och visar dess information utan att ändra vald hex. Vid överlapp väljs närmaste flottmarkör. Hovrad och vald flotta lyser upp med tydligt skilda markeringar. Klick utanför flottorna väljer hexen och lämnar flottvalet. Tomma flottor kan inte väljas på kartan.                                                                                                                             |
| `dra-flottdestination` | Fullständigt implementerat | Under planeringen kan spelaren dra en flotta för att ge en destination. Flottan markeras vid tryck. Efter en liten dragrörelse visas pilen från flottan till hexen närmast pekaren, utan att ändra den sparade ordern eller panorera kartan. Släpp på kartan sparar destinationen. Klick utan drag ger ingen order. Escape, avbruten pekarkontakt, vybyte, tvåfingerzoom eller släpp utanför kartan avbryter och behåller föregående order. Vanligt drag på kartbakgrunden panorerar fortsatt. |

## Byggnader och byggkö

| Kravnamn                        | Status                     | Krav                                                                                                                                                                                                                                                                                 |
| ------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `byggnaders-resursanvandning`   | Fullständigt implementerat | Byggnader visar personalbehov. Material betalas en gång vid byggstart; färdiga byggnader har ingen årlig materialkostnad.                                                                                                                                                            |
| `flera-byggnader-av-samma-typ`  | Fullständigt implementerat | Flera byggnader av samma typ får beställas och finnas på en planet inom antalet byggplatser. Även `Research station` får finnas i flera exemplar.                                                                                                                                    |
| `skepp-i-byggko`                | Fullständigt implementerat | Colony ship, Exploration ship, Fighter och Transport ship kräver motsvarande färdiga fabrik. Skepp delar planetens kö med byggnader och delar. Fabriksbyggen skapar inga automatiska produkter.                                                                                      |
| `skepp-till-destinationsflotta` | Fullständigt implementerat | Varje skeppsorder kan få en tom mottagande flotta eller en flotta vid planeten, både vid beställning och senare i kön. Utan val används planetens hemflotta. Om mottagaren har lämnat planeten eller tagits bort används hemflottan; saknas en hemflotta vid planeten skapas en där. |

| `planetbyggplatser` | Fullständigt implementerat | Varje planet har fasta numrerade byggplatser. Kölagda byggnader reserverar en plats och färdigställs i planetens köordning, högst en per år. Avbrott och rivning ändrar inte andra byggnaders platser. |
| `fabrikskoer` | Fullständigt implementerat | Production samlar fabrikernas produktval per planet, med kostnad, Queue-knapp och destinationsflotta för skepp. Varje produkt visas en gång. Alla order hamnar i planetens gemensamma Build queue. Om alla matchande fabriker ska rivas, eller under simulering, spärras beställning. Personalbrist visas men tillåter köläggning. Befintliga order väntar om nödvändig fabrik saknas. |
| `forska-fram-fabriker` | Fullständigt implementerat | Bemannade Research stations låser upp alla fyra skeppsfabrikerna genom forskningskön och dess förkunskaper. Varje teknik kostar en poäng och högst en slutförs per år. Nya stationer arbetar från nästa år. |
| `kartorderstatus` | Fullständigt implementerat | Star map visar tomma byggplatser (S) och om planetens gemensamma Build queue är tom (Q). Vald planet visar samma information i klartext. |

Den nya ekonomin ersätter årlig materialbudget och parallella planetbyggen.
Byggnader, delar och skepp delar planetens enda kö. Se [ekonomi och logistik](economy-logistics.md).

## Ekonomi, transport och beslutsstöd

[Route och Production](route-production.md) ersätter Supply & production
med kartbaserad rutt- och produktionshantering. De tidigare kraven
`forsorjningsoversikt`, `relevanta-material` och `materialoversikt` ersätts.
[Försörjningsreglerna](supply-production.md) för status, verkliga leveranser
och produktionsförmåga gäller fortsatt. Planetens första projekt styr dess
övergripande försörjningsstatus; vald köpost styr kartans visade kedja.

Star map hanterar fortsatt skapande, val och stängning av rutter samt tilldelning
eller frigörande av flottor. De befintliga Star map-kraven gäller fortsatt;
se [beteenden och status](star-map-trade.md).

`ruttflotta-till-narmaste-andplanet` — **Fullständigt implementerat**:
en ledig transportflotta kan tilldelas en rutt från valfri position. Den reser
först till närmaste ändplanet och börjar därefter frakta material. Vid lika
avstånd används ruttens första ändplanet. Resan sker även utan väntande frakt
och sparas vid omladdning. Detta ersätter det tidigare kravet på att stå vid
en ändplanet vid tilldelning; andra uppdrag måste fortfarande avslutas först.

`synliga-handelsrutter` — **Fullständigt implementerat**: Handelsrutter syns
även inne i markerade hexrutor. Markeringen får inte dölja rutten. Planeter,
flottor och kartans informationsmärken förblir tydliga ovanpå linjerna.

`tysta-beslut` — **Fullständigt implementerat**: Mute tystar ett enskilt beslut
även under kommande rundor. Det undantas från flikmarkeringar, beslutsräknaren
och rundvarningen. Beslutet ligger kvar i Decisions med Unmute, även när det
tillfälligt inte längre är aktuellt. Unmute återaktiverar aktuella påminnelser
direkt. Inställningen sparas per spel och gäller samma beslut för samma
flotta, planet eller rutt; andra beslut påverkas inte. Skip this turn behåller
sin betydelse för enbart innevarande runda.

`beslutsmarkering-pa-flikar` är **Fullständigt implementerat**: Research, Fleets,
Route och Production visar ! när det finns ett aktivt, otystat och inte
överhoppat beslut som hanteras där. Markeringen följer samma mål som Review:
forskning → Research; flottorder → Fleets; rutter och försörjning → Route;
byggval, saknad fabrik och personal → Production. Flera beslut på samma flik
ger en gemensam markering, som finns kvar tills alla dessa beslut är lösta,
överhoppade eller tystade. Markeringarna uppdateras direkt på alla skärmar och
vid inläsning av sparat spel. Detta utökar den tidigare flikmarkeringen för
endast kartans försörjningsproblem.

`tystade-beslut-sist` är **Fullständigt implementerat**: Decisions visar tystade
beslut efter övriga beslut, även när de tillfälligt inte längre är aktuella.
Den inbördes ordningen behålls inom grupperna. Unmute flyttar ett aktuellt
beslut till dess vanliga plats. Review, Skip this turn, Mute och Unmute finns
kvar per beslut. Next decision är borttagen efter uttrycklig ändring och
ersätter det tidigare knappkravet under `beslutslista`.

| Kravnamn               | Status                     | Krav                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `gemensam-planetko`    | Fullständigt implementerat | Varje planet har exakt en Build queue för byggnader, delar och skepp, utan fast kögräns. Högst ett projekt färdigställs per planet och år. Flera fabriker ger fler produktval, inte parallella köer.                                                                                                                                                                                                                           |
| `delfabriker`          | Fullständigt implementerat | Rocket engine factory, Ion pulse engine factory, Weapons module factory samt Telescope I factory, Telescope II factory och Telescope III factory kan forskas fram och byggas. De tillverkar var sin del i den gemensamma kön och behöver personal. Tillverkade delar läggs i planetens lager.                                                                                                                                  |
| `skeppsdelar`          | Fullständigt implementerat | Alla skepp kräver motorer: Colony ship tre, Exploration ship två, Transport ship och Fighter en. Fighter kräver även en Weapons module och Exploration ship ett tillverkat teleskop utöver material och besättning. Delarna förbrukas en gång vid skeppsbygget. De kan lagras och fraktas genom handelsnätverket.                                                                                                              |
| `automatiska-delorder` | Fullständigt implementerat | Saknade delar beställs automatiskt genom aktiva handelsrutter. Motorer tas först ur lokalt lager, därefter befintlig försörjning och fjärrlager före ny produktion. Weapons module prioriterar fortsatt lokal produktion. Kortast uppskattade leveranstid avgör leverantör. Befintlig försörjning räknas av och varje del reserveras för sin order. Om någon del inte kan ordnas avvisas hela beställningen med en förklaring. |

`streckade-rutter-utan-transporter` — **Fullständigt implementerat**:
Handelsrutter utan aktiv transport visas streckade på Star map. När en
transportflotta tilldelas blir linjen heldragen; när den sista aktiva
transportflottan frigörs blir linjen streckad. En flotta på väg till rutten
räknas som tilldelad, men en flotta som begärt Release gör det inte.
Stängande rutter visas fortsatt streckade.

2026-10-23: `automatiska-delorder` ersätter den tidigare regeln som tillät
beställningar utan möjlig delförsörjning. För Weapons module har lokal delfabrik företräde framför
fjärrlager. Motorernas nya regler nedan ersätter detta företräde för motorer. Utan lokal fabrik används först tillgängliga fjärrlager, därefter
tidigare obokad delproduktion eller nya order hos närmaste producent.
Varje ruttlänk behöver en tilldelad transportflotta. Material- och personalbrist
får innebära väntan. Avbeställning behåller delorder för annan användning;
senare transportbortfall blockerar försörjningen men raderar inte huvudordern.

| Kravnamn                       | Status                     | Krav                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utvinningsbara-resurser`      | Fullständigt implementerat | Planeter har ändliga fyndigheter av Iron, Water och Oil. Utvinning minskar fyndigheten och ökar lagret lika mycket.                                                                                                                                                                                                                                                                 |
| `utvinningsbyggnader`          | Fullständigt implementerat | Iron mine, Water extractor och Oil extractor behöver personal och producerar från året efter färdigställande.                                                                                                                                                                                                                                                                       |
| `planetlager`                  | Fullständigt implementerat | Varje koloni har obegränsat lokalt lager som bevaras mellan år. Ny koloni börjar utan material.                                                                                                                                                                                                                                                                                     |
| `planetbyggnadsko`             | Fullständigt implementerat | Byggnadsorder ingår i planetens gemensamma kö tillsammans med delar och skepp. Order kan omordnas eller avbrytas. Ett blockerat förstaprojekt släpper inte förbi senare projekt; material betalas bara när projektet faktiskt byggs.                                                                                                                                                |
| `forskningsko`                 | Fullständigt implementerat | Med en färdig Research station kan flera tekniker planeras och omordnas. Borttagning av förkunskap och dess beroende köposter bekräftas först.                                                                                                                                                                                                                                      |
| `forskningsberoenden`          | Fullständigt implementerat | Val av senare teknik lägger automatiskt in saknade förkunskaper i rätt ordning utan dubbletter. Allt byggbart kan nås genom forskning.                                                                                                                                                                                                                                              |
| `transportfabrik`              | Fullständigt implementerat | Transport ship factory bygger riktiga Transport ships som kan ingå i vanliga flottor.                                                                                                                                                                                                                                                                                               |
| `handelsnatverk`               | Fullständigt implementerat | Trade routes är dubbelriktade länkar mellan två ägda planeter. Länkar bildar ett nätverk.                                                                                                                                                                                                                                                                                           |
| `flera-ruttflottor`            | Fullständigt implementerat | Flera flottor kan tilldelas samma rutt. En flotta tjänstgör på högst en rutt. Vid Release lämnar den efter pågående resa och lossning. Sista Transport ship kan lämna enligt `skepp-ur-olastad-ruttflotta`.                                                                                                                                                                         |
| `forstarka-ruttflotta`         | Fullständigt implementerat | En flotta utan ruttuppdrag kan skicka skepp till en ruttflotta utan att avbryta rutten eller påverka last och färdorder. Skeppen ansluter när de möts på samma hex. Skepp kan lämna en olastad ruttflotta enligt `skepp-ur-olastad-ruttflotta`.                                                                                                                                     |
| `skepp-ur-olastad-ruttflotta`  | Fullständigt implementerat | Skepp får lämna en Trade fleet endast när hela flottan saknar last. Detta gäller alla skeppstyper, lokala flyttar, förstärkningar på avstånd och skapande av New fleet. Rutten fortsätter så länge transportskepp återstår. När sista Transport ship lämnar frigörs flottan från rutten; kvarvarande skepp behåller position och pågående färd. En helt tom flotta saknar position. |
| `flottans-handelsrutt`         | Fullständigt implementerat | En tilldelad flotta visas som Route Terra <> Vesta överallt, även medan den väntar på att lämna rutten. Flottans eget namn återkommer efter frigöring.                                                                                                                                                                                                                              |
| `skepp-till-rorlig-flotta`     | Fullständigt implementerat | Skepp som skickas till en avlägsen flotta reser som en separat grupp med status En route och följer målflottans rörelser tills de möts. Fart och avstånd gäller; långsammare skepp är inte garanterade att hinna ikapp. Ordern sparas, kan avbrytas eller ersättas. Om målet försvinner eller blir tomt stannar gruppen för nya order.                                              |
| `fysisk-frakt`                 | Fullständigt implementerat | Last flyttas med flottor på kartan och lastas om vid mellanplaneter. Kapacitet, position och avstånd påverkar leveranstiden.                                                                                                                                                                                                                                                        |
| `automatisk-resursforsorjning` | Fullständigt implementerat | Aktiva köprojekt beställer saknat material från nätverkets tillgängliga överskott. Lager och inkommande leveranser räknas av utan dubbelbokning.                                                                                                                                                                                                                                    |
| `beslutslista`                 | Fullständigt implementerat | Decisions samlar obesvarade val och försörjningsproblem; varje beslut har Review. Tom produktionskö ger ett gemensamt val per planet, inte en påminnelse per fabrik. Saknad fabrik för köad produktion ger ett beslut. Normal leveransväntan visas som status.                                                                                                                      |
| `hoppa-over-beslut`            | Fullständigt implementerat | Skip this turn låter spelaren avstå från ett val utan ny varning samma år.                                                                                                                                                                                                                                                                                                          |
| `rundvarning`                  | Fullständigt implementerat | End turn visar kvarvarande beslut tillsammans. Spelaren kan återgå eller välja End turn anyway.                                                                                                                                                                                                                                                                                     |

`beslut-vantar-pa-paborjad-atgard` — **Fullständigt implementerat**:
Decisions upprepar inte ett produktions- eller transportval när relevant
forskning eller produktion redan ligger i kö. Väntan visas som status. Nästa
manuella steg, ett tilldelningsbart Transport ship och kvarstående grundproblem
ger beslut. Detta förtydligar `beslutslista`. Personal, varv och bärgning
behåller sina tidigare regler. Se [väntan och beslut](events-and-guidance.md).

## Ändringshistorik

- 2026-10-25: `beslut-vantar-pa-paborjad-atgard` förtydligar `beslutslista`:
  köad forskning och produktion ska inte kräva samma beslut igen. Nästa val
  och kvarstående grundproblem ska fortsatt uppmärksammas.

- 2026-10-24: `flottfokuserad-kartvy` förtydligas: ej valda flottor får
  streckade cirklar och himlakropparnas namn visas med full tydlighet. Detta
  ersätter den tidigare nedtoningen av namn; himlakropparna är fortsatt inaktiva.

- 2026-10-24: `flottfokuserad-kartvy` och `delad-kartkamera` ersätter
  den kompakta översikten och Show on map-delen av `flottadministration`, samt
  det tidigare kravet `flottbyggar-minikarta`. Separat skapande, kortvisning och
  borttagning av tomma flottor i `tomma-flottor` ersätts efter uttrycklig beställning.
  Befintliga tomma flottor och deras mottagarregler bevaras. Minikartekravet är
  historiskt och inte längre aktivt.

- 2026-10-23: `forsorjningsstatus`, `leveransfloden`,
  `automatisk-resursforsorjning` och `beslutslista` förtydligas: en aktiv
  transportkedja reserverar tillgängligt material redan under planeringen.
  Täckta behov visas som Waiting och Awaiting pickup utan försörjningsbeslut.
  Kvarstående brist kräver fortsatt beslut; skeppen lastas när året genomförs.

- 2026-10-21: `skepp-ur-olastad-ruttflotta` ersätter efter användarens uttryckliga
  ändring spärren mot alla uttag ur aktiva ruttflottor i `forstarka-ruttflotta`.
  Uttag tillåts när hela flottan är olastad; sista Transport ship frigör
  flottan från ruttuppdraget.

- 2026-10-21: `handelsrutt-val-pa-stjarnkartan` och
  `flottilldelning-pa-stjarnkartan` ändras så att ruttpanelen bara listar redan
  tilldelade flottor. Den globala Assign fleet-listan tas bort efter användarens
  uttryckliga ändring. Flottmarkörer dras till ruttlinjen för tilldelning;
  tangentbordsalternativet finns vid vald flotta.

- 2026-10-21: `planetoppning-i-kartrubrik` ersätter den stora fristående
  Open planet-knappen. `flottadministration` visar korten utan Expand fleet panel
  eller Help. Knappen Create route i `handelsrutt-skapande-pa-stjarnkartan`
  tas bort efter användarens uttryckliga ändring; kartdrag och tangentbordets R
  behåller ruttskapandet.

- 2026-10-21: `flottadministration` ändras från separat flottbyggare i Fleets
  till lokal hantering och skapande på Star map. `flottnamn-direktredigering`
  ersätter separat namnbyte för kartans flottor. `flottknappar-pa-kartan`
  ersätter den tidigare uttryckliga bevaringen av Set destination och vägen
  via Edit fleet. Ändringarna är implementerade; Fleets behåller en kompakt
  översikt med positioner, order, Show on map och minikarta.
  Förstärkningar på avstånd, tomma flottor och ruttregler behålls.

- 2026-10-20: Användarens uttryckliga ändring `gemensam-planetko` ersätter
  separata femplatsköer och parallell produktion i `fabrikskoer`, samt uppdelningen
  mellan byggnads- och skeppskö i `skepp-i-byggko` och `planetbyggnadsko`.
  `delfabriker`, `skeppsdelar` och `automatiska-delorder` tillkommer. Befintliga
  sparade order bevaras när köerna slås ihop. Avbrutet skeppsbygge tar inte bort
  redan beställda delar; de kan lagras eller användas till en annan order.

- 2026-10-19: `skepp-till-rorlig-flotta` ersätter samlokaliseringsspärren i
  `flottadministration` med fysisk förföljelse på avstånd. Samma hex och tom
  mottagarflotta ger fortfarande direkt anslutning. `forstarka-ruttflotta` och
  `flottans-handelsrutt` tillkommer; ruttflottans automatiska uppdrag behålls.

- 2026-10-17: `tom-startsida` ersätts av den beslutade spelvisionen och kraven
  ovan. Den tomma startsidan är inte längre ett aktivt produktkrav.
- Första iterationen omfattar enbart karta, navigation och läsbara vyer.
  Tillgängliga byggalternativ innebär inte fungerande byggorder.

- 2026-10-17: Användaren ersätter webbsidelayouten med skärmfyllande spelvyer utan
  scroll. Engelska ersätter svenska i spelet. Beskrivningar av himlakroppar behålls.
- 2026-10-17: Produktkravsfilen heter `product-requirements.md` för att skiljas från
  rotens kravöversikt. Innehåll och stabila kravnamn behålls.

### Förflyttning längs hexvägar

- `rakare-hexforflyttning` — **Fullständigt implementerat**: Flottor följer en
  kortaste hexväg där de två riktningarna fördelas jämnt längs linjen mot målet.
  Vid lika många steg i riktningarna växlar flottan mellan dem; annars sprids
  stegen i den mindre vanliga riktningen längs vägen.

- 2026-10-18: `flera-byggnader-av-samma-typ` ersätter unikhetsbegränsningen i
  `bygga-forskningsstation`. `gemensam-byggko` och `skepp-i-byggko` ersätter
  samtidig färdigställning av alla projekt samt separata Fighter-order.
  `skepp-till-destinationsflotta` ersätter automatisk placering i en Reserve-flotta.

- 2026-10-18: Användarens nya byggsystem ersätter `gemensam-byggko` med
  `planetbyggplatser` och `fabrikskoer`. `skepp-i-byggko` gäller nu enbart
  skepp i respektive shipyard. Alla skeppsfabriker är permanenta och ger inga
  automatiska skepp vid färdigställning. Skeppens produktionskostnader är
  separata från fabrikernas drift. `forska-fram-fabriker` ersätter omedelbart
  tillgängliga fabriker och den tidigare inaktiva forskningsinformationen.
  `kolonisation` omfattar nu fungerande kolonisering. `kartorderstatus` tillkommer.

- 2026-10-19: Overview samlar byggplatser, fabriksköer och bygghandlingar och
  ersätter Construction-fliken. Egen Build selection med sökbart kortrutnät
  ersätter den inbäddade byggmenyn i `visa-byggalternativ`. Resursstaplar ersätter
  resursraderna i `planetbudgetoversikt`. `gemensamma-byggnadsbilder` och
  `kompakta-bygghandlingar` tillkommer. Årsbudget och köregler behålls.

- 2026-10-19: `kartflottor` ersätter radplacering med cirkelplacering innanför
  hexen. `flottval-pa-kartan` och `dra-flottdestination` tillkommer. Flottval
  prioriteras framför hexval inom träffytan. Kartbakgrundens panorering och det
  befintliga destinationsvalet via Set destination behålls.

- 2026-10-19: `gemensamma-byggnadsbilder` omfattar de fyra tillhandahållna
  byggnadsbilderna och utökas till Research. Bilderna ersätter tidigare
  platshållare; reservvisning behålls för saknade eller oladdbara bilder.

## Sparplatser

| Kravnamn                    | Status                     | Krav och återstående arbete                                                                                                                                                                                                             |
| --------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tre-sparplatser`           | Fullständigt implementerat | Första sidan visar tre separata sparplatser med senaste speldatum och en knapp för att starta eller återuppta respektive spel. Tomma platser visar att inget spel finns. Spelaren kan återvända till `Saved games` via spelets logotyp. |
| `sparplats-utforskad-karta` | Fullständigt implementerat | Varje sparat spel visar en översiktskarta över sin utforskade rymd, med kända stjärnor och planeter inom det utforskade området. Tomma platser visar ingen värld.                                                                       |
| `tomm-sparplats`            | Fullständigt implementerat | En sparplats kan tömmas separat. En varningsdialog kräver uttrycklig bekräftelse och förklarar att all utveckling i platsen raderas permanent. `Cancel` och Escape behåller spelet.                                                     |

2026-10-19: `sparat-spel` och `tre-sparplatser` ersätter delen av
`fast-exempelvarld` som återställde världen vid omladdning. Spel sparas tills
spelaren tömmer platsen eller webbläsarens lagring rensas. Multiplayer är fortsatt
framtida spelmekanik.

- 2026-10-19: `flottadministration` ersätter sifferkolumnerna för skeppstyper med
  en gemensam bildruta per flotta. `skeppsbilder` och `flottbyggar-minikarta`
  tillkommer. Regeln om överföring mellan samlokaliserade flottor behålls.

- 2026-10-19: `tomma-flottor-utan-position` ersätter samlokaliseringskravet för tomma mottagande flottor. Första skeppet bestämmer positionen; sista skeppets avfärd släpper den. Äldre sparade tomma flottor följer samma regel.

- 2026-10-19: `fabrikskoer` ändras så att skeppsbeställningen alltid visas ovanför respektive kö. Fabrikens Build-knapp och utfällbara beställningsmeny ersätts.

- 2026-10-19: `handelser` ersätter Turn summary med en liten händelsekonsol ovanför End turn. `arsrundor-och-order` återgår automatiskt till planering utan Continue. Ankomstbesked ersätter förflyttningssteg och löpande upptäcktsantal.

- 2026-10-19: Utvinningsbar ekonomi och planetlager ersätter `arsbudget` och återkommande materialkostnader. `planetbyggnadsko` ersätter parallellt färdigställande i `planetbyggplatser`. Forskningskö, transportfabrik, automatiskt försörjningsnät och beslutsstöd tillkommer. Piratrån och eskortskydd återstår för en senare iteration.

### Kartans utrymme på telefon

| Kravnamn                     | Status                     | Krav                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fokuserat-kartval`          | Fullständigt implementerat | Star map saknar menyn med himlakroppar, förklaringsrutan för S/Q och kontrollrutan med Homeworld, zoomnivå och plus/minus. Tomma rutor utan flottor visar ingen informationspanel eller texten Empty space/Unexplored space. Himlakroppar, flottor, handelsrutter och pågående destinationsval visar sina uppgifter i den undre delen på små eller låga skärmar, med intern rullning vid behov. Events kan döljas medan ett sådant val visas. End turn förblir synlig med egen plats enligt `end-turn-vid-kartval`. Loggen bevarar läsposition inom året men visar senaste året efter End turn. |
| `rundkontroller-i-decisions` | Fullständigt implementerat | Decisions visar också Events och End turn. Årets uppspelning visar kartan tillfälligt och återgår sedan till Decisions. Rundknappen är spärrad under simulering och uppspelning och samma beslutsvarning gäller som på kartan.                                                                                                                                                                                                                                                                                                                                                                  |

- 2026-10-21: `fokuserat-kartval` ersätter kontrollrutan och objektmenyn i
  `kartnavigation` samt den ständigt synliga händelsekonsolen i `handelser`.
  S/Q-markeringarna och vald planets orderstatus i `kartorderstatus` behålls,
  men förklaringsrutan på kartan tas bort. `rundkontroller-i-decisions`
  ger tillgång till rundstyrning även när kartan visar ett objekt.

`rullningsbar-kartpanel` — **Fullständigt implementerat**: På små eller låga
skärmar växer detaljpanelen för vald hex, flotta eller handelsrutt när spelaren
börjar dra uppåt eller rulla nedåt. Panelens överkant flyttas först upp utan
att innehållet rullas. Först när panelen nått maximal höjd börjar innehållet
rulla; kort innehåll behöver inte rullas när allt ryms. Vid återgång rullas
innehållet först till toppen, därefter krymper panelen och kartan får tillbaka
sitt utrymme. Detta ersätter beteendet med samtidig förstoring och rullning
som infördes 2026-10-22.
Panelen lämnar alltid en del av kartan synlig och hela innehållet kan nås.
Detta utökar `fokuserat-kartval` och ersätter dess fasta panelhöjd vid rullning.

## Kompakta flottkort

`kompakta-flottkort` är **Fullständigt implementerat**. Star map och Fleets
visar små skeppsrutor och flottkort med tätare avstånd så att fler flottor ryms
samtidigt, även på mobil. Fyra skepp ryms på en rad i kartans flottkort på
vanliga mobilskärmar och i smala flottkort på dator och surfplatta. Standardkort
med fyra skepp är högst 140 px höga vid minst 220 px kortbredd. Namn, skepp och
en enda faktisk flottfart, exempelvis S: 2 hex, visas. Position och motorinformation
utelämnas; destination och uppdragsdetaljer finns i hjälptext. Order, namnbyte och skeppsöverföring är fortsatt åtkomliga
med pekytor på minst 44 pixlar i höjd.

## Terraforming och planetkapacitet

Se [Terraforming och Domes](terraforming.md) för sammanhängande spelregler.

| Krav                     | Status                     | Beskrivning                                                                                                                                                                  |
| ------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `planettypsforskning`    | Fullständigt implementerat | Ice, Desert, Ocean och Toxic har varsin Dome-teknik följd av en terraformingteknik. Båda visas när en planet av typen blir synlig.                                           |
| `andningsbar-atmosfar`   | Fullständigt implementerat | Stenplaneter har andningsbar atmosfär från 80% habitability och behöver då inga Domes.                                                                                       |
| `habitability-kapacitet` | Fullständigt implementerat | Habitability begränsar befolkningen linjärt upp till 20 000 och andelen tillgängliga byggplatser. Golvet är 1 000 personer och en plats där planeten har byggplatspotential. |

2026-10-24: `domes-per-byggplats` ersätter det tidigare oimplementerade
`habitat` efter uttryckligt användarbeslut. `planetbyggplatser` behåller fasta
platsnummer men antalet användbara platser styrs nu av `habitability-kapacitet`.

## Planetens undersidor

| Kravnamn                      | Status                     | Produktkrav                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `planetundersidor`            | Fullständigt implementerat | Planet öppnas på Overview och har fyra undersidor: Overview, Building sites, Build queue och Production. Overview visar planetfakta, resurser, komponentlager och antal befintliga byggnader per typ. Val, fokus och rulläge bevaras vid uppdatering och byte mellan undersidor.                                                                                                                                                               |
| `byggplatsrutnat`             | Fullständigt implementerat | Building sites visar numrerade byggplatser i ett rutnät med byggnader, pågående byggen, Domes och låsta platser. Byggval, avbrott och rivning finns här. Produkter beställs i Production. Build selection återgår till den valda byggplatsen.                                                                                                                                                                                                  |
| `projektens-forsorjningssteg` | Fullständigt implementerat | Varje projekt i Build queue visar utfällbara materialbehov och steg för tillgång, utvinning, beställd delproduktion och transport. Första projektets detaljer är öppna från början. Kopplad delproduktion visar även sina råvarubehov. Mängder, status, hinder, aktuell transportplats och nästa etapp framgår. Länkar öppnar berörd planet, köpost, rutt eller flotta. Lokala delorder har egna köplatser och refereras under huvudprojektet. |
| `planetgemensamt-produktval`  | Fullständigt implementerat | Production har kategorierna Ships och Components med symbolknappar och en produktlista med symbol och namn utifrån planetens färdigbyggda fabriker. Ett produktval öppnar full information och beställning. Flera likadana fabriker ger ett produktval. Spelaren kan köa en produkt åt gången, välja destinationsflotta för skepp och behålla valen mellan beställningar.                                                                      |
| `kompakt-produktionsko`       | Fullständigt implementerat | Production visar en kompakt Build queue i verklig ordning. Endast intilliggande likadana projekt med samma destination och byggplats grupperas. I planetvyn öppnar ett tryck gruppens första projekt i hela kön, där order kan ändras. Kartans Production visar i stället en rad per projekt med val av försörjningskedja och direkta ↑, ↓ och ×.                                                                                              |

2026-10-24: `planetundersidor`, `byggplatsrutnat` och
`planetgemensamt-produktval` ersätter den samlade hanteringen i Overview och
fabriksvisa beställningar i `fabrikskoer`. `visa-byggalternativ` återgår nu till
Building sites. `gemensam-planetko`, automatiska delorder och sparade order
behålls. Den detaljerade planetkön omfattar alla projekt; Route visar försörjningsstatus
för planetens första projekt och Production kan visa varje projekts kedja.

## Kategorier och detaljer i bygg- och produktval

| Kravnamn                   | Status                     | Produktkrav                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `byggkategorier`           | Fullständigt implementerat | Build selection filtreras med All, Resources, Research, Shipyards, Components och Terraforming. Endast kategorier med upplåsta byggalternativ visas, utöver All. Sökning gäller inom vald kategori. Ny byggplats börjar med All och tom sökning.                                                                                                                                                                                                                                                                                                                     |
| `symbolbaserade-kataloger` | Fullständigt implementerat | Kategorier väljs med symbolknappar med namn i hjälptext och för tangentbord och skärmläsare. Byggnader och produkter visas i kompakta listor med symbol och namn. Ett tryck öppnar full information för en post, med beskrivning, kostnader, personalbehov, relevanta material och tillgänglighet. Byggnader visar antal på planeten och i imperiet; skepp visar hastighet, besättning, delar och destinationsflotta. Beställning kräver en separat Build- eller Queue-knapp. Back to buildings respektive Back to products återgår till listan med fokus på posten. |

2026-10-24: `byggkategorier` och `symbolbaserade-kataloger` ersätter de
ständigt utfällda byggkorten i `visa-byggalternativ` och rullgardinsvalen i
`planetgemensamt-produktval`. Den kompakta byggkön och alla orderregler behålls.
Tillfälliga kategori-, sök- och detaljval skriver inte om sparade spel.

2026-10-24: `byggnadsantal-lokalt-och-globalt` omfattar även den kompakta
bygglistan. Antalen visas utan att spelaren behöver öppna detaljpanelen och
har samma betydelse och avgränsning som där.

## Skeppsmotorer

`motorbehov-for-alla-skepp` — **Fullständigt implementerat**: Colony ship kräver tre
motorer, Exploration ship två, Transport ship och Fighter en. Rocket engine
factory forskas fram före alla skeppsfabriker.

`ion-pulse-engine` — **Fullständigt implementerat**: Ion pulse engine factory forskas
fram efter Rocket engine factory. Den kostar 16 Iron, 8 Water och 4 Oil och
behöver 300 personal. En motor kostar 6 Iron, 2 Water och 2 Oil. Minst en Ion
pulse engine ger skeppet +1 fart. Flottan följer sitt långsammaste skepp.

`automatisk-motormontering` — **Fullständigt implementerat**: Motorer monteras från
byggplanetens tillgängliga lager vid byggstart. Ion väljs först och blandning
är tillåten. Saknade motorer ordnas från tillgängliga lager och därefter
fabriker med kortast beräknad transporttid, oavsett motortyp. Ion har företräde
vid lika tid. Redan reserverade delar skyddas. Installerade motorer följer
skeppet vid flottflytt och sparning; befintliga skepp uppgraderas inte.

2026-10-24: Motorreglerna ersätter tidigare oförändrade recept för andra skepp
än Fighter samt företrädet för lokal motorproduktion framför fjärrlager.

## Kartbaserade Route och Production

Se [Route och Production](route-production.md) för de fullständigt implementerade
kraven `farledskontrast`, `route-kartvy`, `produktions-kartvy`,
`radiella-byggval`, `kompakt-produktionsko`, `byggprojektets-forsorjningskedja`
och `forsorjningsproblem-pa-kartan` samt ersatta gränssnittskrav.
Planetvyns befintliga kategorier, destinationsval och kögruppering behålls.
`dome-fore-fabriksforslag` är **Fullständigt implementerat**: båda Production-vyerna
leder till rätt Dome när en tom plats behöver förberedas och föreslår fabriker
först när en förberedd byggplats finns. Se kartkraven för väntan, forskning och
upptagna platser.

## Ruttflottor och eskort

`unika-flottnamn`, `rutt-eskortfordelning` och `ruttflottor-pa-kartan` är
**Fullständigt implementerat**. Varje flotta har ett unikt namn. Fighters kan
ansluta som eskort till en rutt med aktiv transport och fördelas jämnt mellan
transportflottorna med hänsyn till befintliga eskorter. Skepp på annan plats
måste först resa till sin flotta. Route visar tilldelade flottor vid ruttens mitt
med sina namn; lediga transportflottor visas lila för att vara lätta att hitta.
Star map och Fleets visar fortsatt verkliga positioner. Detta utökar tidigare
kravet på transportskepp i den tilldelade ursprungsflottan och ersätter Route-vyns
fysiska placering av tilldelade flottmarkörer. Se
[kartkraven](route-production.md#flottor-på-rutter) för fullständig avgränsning.

## Forskning kräver station

`forskning-kraver-station` är **Fullständigt implementerat**. En färdig, ägd
Research station som inte är markerad för rivning krävs för att köa forskning,
även när förkunskaper behöver läggas till automatiskt. En station som bara är
beställd räcker inte. Endast fungerande stationer ger forskningsframsteg.
Personalbrist stoppar framsteg men hindrar inte köläggning när stationen finns.
Utan station är forskningsvalen spärrade och vyn förklarar vad som saknas.
Decisions föreslår inte att välja forskning innan en station finns. Befintliga
forskningsköer bevaras om stationer försvinner och väntar tills driften återupptas;
kön kan fortfarande ordnas och poster tas bort. Detta ersätter tidigare fri
köläggning före stationens färdigställande under `forskningsko` och behåller
`forska-fram-fabriker` för framsteg och förkunskaper.

`dubbelklick-bygger-pa-kartan` och `byggknapp-vid-titel` är
**Fullständigt implementerat**: i Production ger enkelklick byggdetaljer,
dubbelklick eller dubbeltryck beställer en gång och Build visas bredvid titeln
före detaljerna. Befintliga kostnader, köregler och hinder gäller fortsatt.

## Prioriterade byggval

`produktionsval-efter-forekomst` och `produktionsberoenden-i-byggval` är
**Fullständigt implementerat**. Kartans Production visar först sådant som
saknas i hela riket, därefter sådant som saknas på vald planet och sist sådant
som finns där. Saknade komponentfabriker visas före byggval som behöver deras
produktion. Ett ! på det beroende valet förklarar vilken producent som saknas.
En av de två motorfabrikerna räcker för motorbehovet. Bedömningen gäller färdiga
producenter i riket, medan faktiska order fortfarande behöver fungerande
försörjning. Varningen hindrar inte själva fabriksbygget och lägger inte till
nya byggkostnader. Köade fabriker räknas inte som färdiga. Se
[kartkraven](route-production.md#ordning-och-produktionsberoenden) för omfattning,
inventering och ersatt katalogordning.

## Events och vägledning i vyerna

| Kravnamn                          | Status                     | Krav                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `end-turn-vid-kartval`            | Fullständigt implementerat | End turn syns och har egen plats även när en planet, flotta, handelsrutt eller destination är vald. Informationspanelen kan rullas utan att täcka knappen.                                                                                                                                                                                                         |
| `sekventiella-arshandelser`       | Fullständigt implementerat | Efter avslutat år annonseras händelser en i taget i den ordning de inträffade. Varje text flyttas sedan till Events innan nästa visas. Presentationen går automatiskt utan Pause/Play, Next eller Skip. End turn är spärrad medan presentationen pågår. Upptäckts- och stridsavbrott behålls före årets avslut.                                                    |
| `handelser-pa-kartan`             | Fullständigt implementerat | Kartan visar och markerar platsen för aktuell händelse. Globala händelser saknar kartmarkering. Listan ligger under kartan på stående mobil och bredvid på liggande mobil och bredare skärmar. Efter uppspelningen återställs tidigare vy, giltiga val och kamera.                                                                                                 |
| `en-flotta-i-taget`               | Fullständigt implementerat | En synlig flottmarkör åt gången följer sin färd med kameran i fokus. Hela den visade färden slutförs innan nästa flottmarkör rör sig. Spelets förflyttning, upptäckter och strider behåller sina regler.                                                                                                                                                           |
| `osynliga-flottor-utan-animation` | Fullständigt implementerat | Dolda flottors förflyttningar animeras inte och ger ingen kameraflytt eller animationsväntan. Fientliga steg visas bara när båda ändarna är synliga.                                                                                                                                                                                                               |
| `handelseannonsering`             | Fullständigt implementerat | Platsbundna händelsers text och textruta visas under den markerade platsen så att platsen förblir synlig, även efter skärmrotation. Globala händelser visas mitt på skärmen. Efter en kort lästid flyttas texten till Events och blir en rad där. Därefter visas nästa händelse. Vid minskad rörelse behålls information och resultat utan förflyttningsanimation. |

Ändring 2026-10-27: den tidigare menyn med Pause/Play, Next och Skip tas bort
på uttrycklig beställning. `handelseannonsering` ersätter det tidigare
1,5-sekunderssteget i `sekventiella-arshandelser`.

Ändring 2026-10-26: `handelser-grupperade-per-ar-och-typ` ersätts av
`sekventiella-arshandelser`. Events visar bara senaste året i händelseordning,
även Population changes med +0. Äldre händelser behålls i sparningen. Listans
storlek följer årets innehåll och tillgänglig plats, med intern rullning när
det behövs. `end-turn-vid-kartval` ersätter döljandet av End turn i
`fokuserat-kartval`. Årets resultat bevaras även om sidan laddas om under
presentationen. Äldre sparade spel fungerar fortsatt utan rensning.

`senaste-aret-i-events`, `utvikbara-events`, `rundkontroller-pa-fler-vyer` och
`beslutsvagledning-i-vyn` är **Fullständigt implementerat**. Events visar
senaste året efter End turn och kan fällas ut för att visa hela året när det
får plats. Research och planetvyn har också Events och End turn. En flik med !
ger konkret vägledning i sin vy: rätt objekt och kontroller markeras med färg,
Show öppnar rätt mål och kort hjälp förklarar vad spelaren kan göra.
Tystade, överhoppade och lösta beslut ger ingen sådan markering.
Se [utförliga krav och ersatta gränssnittskrav](events-and-guidance.md).

## Space pirates

Siktreglerna och teleskopkedjan förtydligas i [sikt och teleskop](detection-telescopes.md).
Aktuell sikt ersätter tidigare utforskning som villkor för att se pirater.

| Krav                        | Status                     | Beteende                                                                                                                                                                                                |
| --------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rymdpirater-per-stjarna`   | Fullständigt implementerat | Ett nytt spel börjar med en Space pirate vid varje stjärna utanför hemsystemet. Pirater är fientliga och kan bara inspekteras inom aktuell detektionssikt på Star map och Fleets.                       |
| `rymdpiraters-patrullering` | Fullständigt implementerat | Pirater går ett hexsteg per år runt sin stjärna och lämnar aldrig systemet. Besegrade pirater återkommer inte.                                                                                          |
| `flottstrid-per-hex`        | Fullständigt implementerat | Efter varje samtidigt hexsteg strider flottorna var för sig. Varje Fighter förstör upp till två pirater; varje par pirater förstör en Fighter. Kvarvarande pirater förstör civila skepp och deras last. |
| `rymdpiraters-sparning`     | Fullständigt implementerat | Äldre spel får inga pirater. Nya spel bevarar piraternas position och förluster efter omladdning.                                                                                                       |

Se [Space pirates](space-pirates.md) för stridsregler och exempel.

## Utforskning och upptäcktsavbrott

De nya kraven och förtydligandena finns i [utforskning och upptäckter](exploration-interruptions.md).
Den sammanhängande kravlistan anger status för `flottorder-som-symboler`,
`produktionsorder-aterkoppling`, `automatisk-hexutforskning`,
`automatisk-stjarnutforskning`, `upptacktsavbrott`,
`order-under-upptacktsavbrott` och `spara-avbrutet-ar`.

## Bärgning och varv

Kraven `stridsrapport-i-dialog`, `vrak-efter-strid`, `bargningsskepp`,
`bargningsorder`, `bogsering-av-vrak`, `orbitalt-varv`, `automatisk-vrakreparation`,
`forstort-varv`, `forskning-fran-bargade-delar`, `upptackbara-vrak` och
`spara-bargning-och-stridsavbrott` är **Fullständigt implementerat**.

Spelaren får läsa stridsresultatet innan året fortsätter. Förlorade skepp lämnar
vrak. Salvage ships kan hämta dem till orbitala varv, där skeppen repareras med
nya besättningar och en tredjedel av råvarukostnaden. Varv och bärgningsskepp har
egen forskning och planetanläggningar. Bogsering sänker flottans fart. Pirater
kan förstöra varvsstationer som sedan kan återuppbyggas.

Hemförda okända komponenter öppnar forskning på motsvarande fabrik utan de
vanliga förkunskaperna. Tekniken måste fortfarande forskas fram. Nya spel har
avancerade explorer-vrak att hitta; befintliga sparningar bevaras.
Se [krav och balansvärden](salvage-shipyards.md).
