# Produktkrav och status

`kompakta-koknappar` — **Fullständigt implementerat**: Research queue och
Build queue har kompakta symbolknappar: ↑ och ↓ flyttar en order, × tar bort
den. Knapparna visar förklarande hjälptexter och har tydliga namn för
skärmläsare. Knapparna behåller minst 44 px klickyta och befintliga regler för
omordning, borttagning och bekräftelse.

Visionen beskrivs i [game-vision.md](game-vision.md). Namnen är stabila referenser.
**Fullständigt implementerat** avser hela det beskrivna kravet, inte hela spelet.
För delvisa krav anges vad som återstår. Exempelvärden är inte beslut om balans.

## Första spelgrunden

`byggnadsantal-lokalt-och-globalt` — **Fullständigt implementerat**: Varje
byggnadstyp i Build selection visar Already built med antal på aktuell planet
och totalt på alla spelarens planeter, inklusive den aktuella. Noll visas när
byggnadstypen saknas. Befintliga byggnader räknas även om de tillfälligt står
stilla eller väntar på rivning; köade projekt räknas först när de är färdiga.

| Kravnamn                    | Status                     | Krav och återstående arbete                                                                                                                                                                                |
| --------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fast-exempelvarld`         | Fullständigt implementerat | En återkommande exempelvärld med tre åtskilda stjärnsystem, både gasplaneter och fasta planeter och exakt en ägd hemplanet. En tom sparplats börjar i exempelvärlden; befintliga spel återupptas.          |
| `hexkarta`                  | Fullständigt implementerat | En stjärna upptar en hexagon och dess planeter varsin direkt grannhexagon, högst en planet per hexagon. Tom rymd skiljer systemen åt.                                                                      |
| `statisk-planetplacering`   | Fullständigt implementerat | Stjärnor och planeter ligger stilla på kartan.                                                                                                                                                             |
| `lokal-sikt`                | Fullständigt implementerat | Hemplanetens hexagon och dess sex grannar är synliga. Övrigt planetinnehåll är dolt.                                                                                                                       |
| `synliga-stjarnor`          | Fullständigt implementerat | Alla stjärnpositioner kan ses även utanför den lokala sikten.                                                                                                                                              |
| `kartnavigation`            | Fullständigt implementerat | Spelaren kan markera rutor, zooma och panorera med mus, touch eller tangentbord. Home återgår till hemplaneten. Kartan saknar kontrollruta för zoom och Homeworld. Dragning ska inte välja en ruta.        |
| `planetinformation`         | Fullständigt implementerat | Spelaren kan öppna en ägd planet och se namn, ägare, befolkning, gästvänlighet, resurser, byggplatser och byggnader.                                                                                       |
| `visa-byggalternativ`       | Fullständigt implementerat | Build selection visar upplåsta byggnader, engångskostnad och personalbehov. Material- och personalbrist visas men hindrar inte köläggning. Beställning eller Back to Overview återgår till rätt byggplats. |
| `forskningsoversikt`        | Fullständigt implementerat | Research visar ett navigerbart träd med valbar forskning, pågående forskning, färdiga upplåsningar och antal arbetande Research stations.                                                                  |
| `vynavigation`              | Fullständigt implementerat | Spelaren kan återgå till kartan från planet- och forskningsinformationen. Vald ruta och kartans läge bevaras tills sidan laddas om.                                                                        |
| `flera-skarmstorlekar`      | Fullständigt implementerat | Spelet går att använda på mobil, surfplatta och dator.                                                                                                                                                     |
| `direktatkomst-utan-lankar` | Fullständigt implementerat | Appen nås via sin direktadress utan nya länkar eller navigationsval på den befintliga webbplatsen.                                                                                                         |

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
statusar visar valbar, köad, pågående och färdig forskning. Research queue
behåller omordning och bekräftad borttagning. Detta ersätter den tidigare
listvyn; forskningsreglerna och teknikernas förkunskaper behålls.

`forskningstradets-utrymme` — **Fullständigt implementerat**: Forskningsträdet
fyller Research under rubriken. Antal Research stations visas bredvid rubriken
även på smala telefoner med bredare systemtypsnitt,
med stationsinformation tillgänglig vid behov. Ingen nedre panel eller
sidopanel reserverar utrymme. Research queue visar sitt antal och öppnas vid
behov ovanpå trädet; en öppen kö ligger kvar under omordning och borttagning.
Zoomrutan med plus, minus, procent och anpassning tas bort. Pinch, mushjul och
tangentbordets zoom, panorering och översikt finns kvar.

- 2026-10-21: `forskningstradets-utrymme` ersätter den fasta stations- och
  köpanelen samt zoomrutan i Research. Reglerna i `forskningsoversikt` och
  `forsknings-tradnavigation` behålls.

## Fortsatt spelutveckling

| Kravnamn                          | Status                     | Krav och återstående arbete                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `stjarnsystem-och-asteroidbalten` | Delvis implementerat       | Stjärnsystem med fasta planeter och gasplaneter finns. Asteroidbälten återstår.                                                                                                                                                                                                                                                                                                                        |
| `planetforvaltning`               | Delvis implementerat       | Namn, lager, utvinning, befolkning, byggplatser och byggnader kan förvaltas för egna kolonier. Kolonisation och transportnät finns; ytterligare planetutveckling återstår.                                                                                                                                                                                                                             |
| `kolonisation`                    | Fullständigt implementerat | Colonize grundar en ägd koloni på en obebodd planet när ett Colony ship finns där. Exakt ett skepp förbrukas och dess 1 000 personer blir kolonins befolkning. Kolonin börjar med tomt lager, planetens fyndigheter och byggplatser samt imperiets upplåsningar. Planeten och dess grannar utforskas.                                                                                                  |
| `befolkningsutveckling`           | Fullständigt implementerat | Efter varje år växer befolkningen med tio procent, skalat efter gästvänlighet, efter avdragen skeppsbesättning.                                                                                                                                                                                                                                                                                        |
| `gastvanlighet`                   | Delvis implementerat       | Gästvänlighet mellan 0 och 100 procent finns och visas. Förändringar över tid återstår; exempelvärden motsvarar ungefär jorden 100, Mars 25 och Jupiter 0 procent.                                                                                                                                                                                                                                     |
| `fabrikbyggande`                  | Fullständigt implementerat | Alla upplåsta skepps- och delfabriker kan byggas som permanenta byggnader på tomma byggplatser. Byggorder kan avbrytas och rivning schemaläggas eller ångras.                                                                                                                                                                                                                                          |
| `bygga-forskningsstation`         | Fullständigt implementerat | Research station kan byggas från start utan forskning på en ledig ägd byggplats, även flera per planet.                                                                                                                                                                                                                                                                                                |
| `produktion`                      | Delvis implementerat       | Colony ship, Exploration ship, Fighter och Transport ship byggs i sina fabriker. Utvinningsbyggnader producerar Iron, Water och Oil. Övriga framtida produkter återstår.                                                                                                                                                                                                                               |
| `fororeningar`                    | Ej implementerat           | Fabriker kan försämra gästvänligheten genom utsläpp.                                                                                                                                                                                                                                                                                                                                                   |
| `domes-per-byggplats`             | Delvis implementerat       | Domes ersätter Habitat. Under 80% habitability förbereds varje byggplats med en Dome av rätt planettyp innan den används. En Dome upptar ingen extra plats och behålls vid rivning. Utökad verifiering återstår.                                                                                                                                                                                       |
| `terraformning`                   | Delvis implementerat       | Bemannade fabriker ökar habitability med fem procentenheter per fabrik och år upp till 100%. Endast stenplaneter kan omformas. Förbättringar består efter rivning. Utökad verifiering återstår.                                                                                                                                                                                                        |
| `forskningstrad`                  | Delvis implementerat       | Forskningskö med förkunskaper låser upp fyra skeppsfabriker och Trade logistics. Bättre fabriker, minskade utsläpp och effektivare arbetskraft återstår.                                                                                                                                                                                                                                               |
| `arsrundor-och-order`             | Fullständigt implementerat | Spelaren ger order, kan ändra bygg- och flyttorder före årets slut, avslutar året och återgår automatiskt till nästa års planering utan Continue-knapp. Colonize grundar kolonin direkt.                                                                                                                                                                                                               |
| `manuell-rundstyrning`            | Ej implementerat           | Under utveckling kan spelåren styras manuellt.                                                                                                                                                                                                                                                                                                                                                         |
| `flottor`                         | Delvis implementerat       | Flottor kan döpas, delas på samma hexagon och få destinationer från `Star map`. Strid och diplomati återstår.                                                                                                                                                                                                                                                                                          |
| `arbetskraft-och-besattning`      | Fullständigt implementerat | Byggnader, projekt och skepp reserverar arbetare och besättning.                                                                                                                                                                                                                                                                                                                                       |
| `skeppstyper`                     | Fullständigt implementerat | Colony ship, Exploration ship, Fighter och Transport ship har fasta roller, fart och besättning. Transport ship ger lastkapacitet.                                                                                                                                                                                                                                                                     |
| `flottadministration`             | Fullständigt implementerat | Star map visar flottorna vid vald hex med skeppsbilder. Ett skepp kan dras eller väljas och flyttas mellan flottor eller till New fleet. Fleets visar en kompakt översikt med position, order och Show on map. Förstärkningar på avstånd, tomma mottagare och uttrycklig borttagning av tomma flottor behåller sina regler.                                                                            |
| `tomma-flottor`                   | Fullständigt implementerat | Tomma flottor behåller namn och kort, saknar destination och kan tas bort uttryckligen.                                                                                                                                                                                                                                                                                                                |
| `flottdestinationer`              | Fullständigt implementerat | En destination väljs på `Star map`, kan ändras eller rensas före årets slut och kan inte ges till en tom flotta.                                                                                                                                                                                                                                                                                       |
| `kartflottor`                     | Fullständigt implementerat | Varje egen flotta med skepp visas som en separat liten svärm av trianglar, även utanför synlig rymd. Flottor i samma hex placeras jämnt längs en cirkel innanför hexen och behåller sin ordning medan samma flottor finns kvar. Svärmarna anpassas för att rymmas. Skeppstyper har olika storlek. Skeppen pekar mot destinationen och pilen börjar vid flottmarkören. Tomma flottor saknar kartmarkör. |
| `rundsimulering`                  | Fullständigt implementerat | Flottor färdas samtidigt längs kortaste väg enligt långsammaste skeppets fart.                                                                                                                                                                                                                                                                                                                         |
| `handelser`                       | Fullständigt implementerat | Events visas tillsammans med End turn i Decisions och på kartan när inget objekt är valt. Loggen växer med skärmen för fler rader och förblir kompakt på små/låga skärmar. Loggen kan rullas utan att täcka andra kontroller. Flottankomster visar namn och destination; enskilda steg och upptäcktsantal utelämnas. Händelser sparas i kronologisk ordning. Ersätter Turn summary.                    |
| `skeppsutforskning`               | Fullständigt implementerat | Alla skepp synliggör besökt hexagon permanent. `Exploration ship` synliggör även dess grannar.                                                                                                                                                                                                                                                                                                         |
| `planetbudgetoversikt`            | Fullständigt implementerat | Overview visar planetens lager, utvinning, kvarvarande fyndigheter, aktiv efterfrågan, inkommande last, personal och byggplatser. Detta ersätter årsbudget.                                                                                                                                                                                                                                            |
| `civilisationskontakt`            | Ej implementerat           | Flottor kan få order för första kontakt och möten med kända civilisationer.                                                                                                                                                                                                                                                                                                                            |
| `multiplayer`                     | Ej implementerat           | Flera spelare kan delta, med riktningen en eller två rundor per verkligt dygn.                                                                                                                                                                                                                                                                                                                         |
| `sparat-spel`                     | Fullständigt implementerat | Spelaren kan återuppta varje sparplats efter omladdning. Order, byggnader, köer, forskning, kolonier, flottor, utforskning, händelser och spelår bevaras. Sparning sker automatiskt efter order och avslutade rundor.                                                                                                                                                                                  |

## Skeppsbilder och flottbyggare

| Kravnamn                      | Status                     | Krav                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tomma-flottor-utan-position` | Fullständigt implementerat | En ny eller tömd flotta saknar position och kan ta emot skepp från vilken plats som helst. Första skeppet bestämmer positionen. Därefter sker direkt anslutning bara på samma hex; förstärkning på avstånd följer `skepp-till-rorlig-flotta`. Fabriker levererar lokalt eller till tom mottagare. Tomma flottor har ingen kartmarkör och kan inte få destination. Regeln ersätter tidigare krav på samlokalisering även för tomma mottagare. |
| `skeppsbilder`                | Fullständigt implementerat | Colony ship, Fighter och Exploration ship använder var sin frilagd bild från den tillhandahållna skeppsbilden. Bilderna visar flottans skepp både när flottan är markerad på Star map och i Fleets. Stora flottor får en begränsad bildförhandsvisning med tydligt antal ytterligare skepp.                                                                                                                                                  |
| `flottbyggar-minikarta`       | Fullständigt implementerat | Fleets visar en minikarta med vald flottas position tydligt markerad i stjärnkartan, med en förklaring utan positionsmarkör när flottan är tom. Kartan följer flottval och flottans verkliga position utan att ändra Star maps kameravinkel eller val. Endast kända himlakroppar visas.                                                                                                                                                      |

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
| `fabrikskoer` | Fullständigt implementerat | Varje fabrik visar kostnad och en Queue-knapp för sin produkt, samt destinationsflotta för skepp. Alla order hamnar i planetens gemensamma Build queue, inte i egna fabriksköer. Rivningsorder och låsta order spärrar nya beställningar. Befintliga order väntar om nödvändig fabrik saknas. |
| `forska-fram-fabriker` | Fullständigt implementerat | Bemannade Research stations låser upp alla fyra skeppsfabrikerna genom forskningskön och dess förkunskaper. Varje teknik kostar en poäng och högst en slutförs per år. Nya stationer arbetar från nästa år. |
| `kartorderstatus` | Fullständigt implementerat | Star map visar tomma byggplatser (S) och om planetens gemensamma Build queue är tom (Q). Vald planet visar samma information i klartext. |

Den nya ekonomin ersätter årlig materialbudget och parallella planetbyggen.
Byggnader, delar och skepp delar planetens enda kö. Se [ekonomi och logistik](economy-logistics.md).

## Ekonomi, transport och beslutsstöd

[Supply & production](supply-production.md) ersätter den separata handelsgrafen
med en planet- och projektöversikt, försörjningsstatus, materialdetaljer,
leveransflöden, produktionsförmåga och materialsökning. Krav och status finns i
den länkade beskrivningen. Endast första projektet i Build queue styr behoven.

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
även under kommande rundor. Det undantas från Next decision, beslutsräknaren
och rundvarningen. Beslutet ligger kvar i Decisions med Unmute, även när det
tillfälligt inte längre är aktuellt. Unmute återaktiverar aktuella påminnelser
direkt. Inställningen sparas per spel och gäller samma beslut för samma
flotta, planet eller rutt; andra beslut påverkas inte. Skip this turn behåller
sin betydelse för enbart innevarande runda.

| Kravnamn               | Status                     | Krav                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `gemensam-planetko`    | Fullständigt implementerat | Varje planet har exakt en Build queue för byggnader, delar och skepp, utan fast kögräns. Högst ett projekt färdigställs per planet och år. Flera fabriker ger fler produktval, inte parallella köer.                                                                                                                                             |
| `delfabriker`          | Fullständigt implementerat | Rocket engine factory och Weapons module factory kan forskas fram och byggas. De tillverkar var sin del i den gemensamma kön och behöver personal. Tillverkade delar läggs i planetens lager.                                                                                                                                                    |
| `skeppsdelar`          | Fullständigt implementerat | En Fighter kräver en Rocket engine och en Weapons module utöver material och besättning. Delarna förbrukas en gång vid skeppsbygget. De kan lagras och fraktas genom handelsnätverket. Övriga skeppsrecept är oförändrade.                                                                                                                       |
| `automatiska-delorder` | Fullständigt implementerat | Saknade delar beställs automatiskt, i första hand från lokal produktion och annars från lager eller delfabriker genom aktiva handelsrutter. Kortast uppskattade leveranstid avgör leverantör. Befintlig försörjning räknas av och varje del reserveras för sin order. Om någon del inte kan ordnas avvisas hela beställningen med en förklaring. |

`streckade-rutter-utan-transporter` — **Fullständigt implementerat**:
Handelsrutter utan aktiv transport visas streckade på Star map. När en
transportflotta tilldelas blir linjen heldragen; när den sista aktiva
transportflottan frigörs blir linjen streckad. En flotta på väg till rutten
räknas som tilldelad, men en flotta som begärt Release gör det inte.
Stängande rutter visas fortsatt streckade.

2026-10-23: `automatiska-delorder` ersätter den tidigare regeln som tillät
beställningar utan möjlig delförsörjning. Lokal delfabrik har företräde framför
fjärrlager. Utan lokal fabrik används först tillgängliga fjärrlager, därefter
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
| `forskningsko`                 | Fullständigt implementerat | Flera tekniker kan planeras och omordnas. Borttagning av förkunskap och dess beroende köposter bekräftas först.                                                                                                                                                                                                                                                                     |
| `forskningsberoenden`          | Fullständigt implementerat | Val av senare teknik lägger automatiskt in saknade förkunskaper i rätt ordning utan dubbletter. Allt byggbart kan nås genom forskning.                                                                                                                                                                                                                                              |
| `transportfabrik`              | Fullständigt implementerat | Transport ship factory bygger riktiga Transport ships som kan ingå i vanliga flottor.                                                                                                                                                                                                                                                                                               |
| `handelsnatverk`               | Fullständigt implementerat | Trade routes är dubbelriktade länkar mellan två ägda planeter. Länkar bildar ett nätverk.                                                                                                                                                                                                                                                                                           |
| `flera-ruttflottor`            | Fullständigt implementerat | Flera flottor kan tilldelas samma rutt. En flotta tjänstgör på högst en rutt. Vid Release lämnar den efter pågående resa och lossning. Sista Transport ship kan lämna enligt `skepp-ur-olastad-ruttflotta`.                                                                                                                                                                         |
| `forstarka-ruttflotta`         | Fullständigt implementerat | En flotta utan ruttuppdrag kan skicka skepp till en ruttflotta utan att avbryta rutten eller påverka last och färdorder. Skeppen ansluter när de möts på samma hex. Skepp kan lämna en olastad ruttflotta enligt `skepp-ur-olastad-ruttflotta`.                                                                                                                                     |
| `skepp-ur-olastad-ruttflotta`  | Fullständigt implementerat | Skepp får lämna en Trade fleet endast när hela flottan saknar last. Detta gäller alla skeppstyper, lokala flyttar, förstärkningar på avstånd och skapande av New fleet. Rutten fortsätter så länge transportskepp återstår. När sista Transport ship lämnar frigörs flottan från rutten; kvarvarande skepp behåller position och pågående färd. En helt tom flotta saknar position. |
| `flottans-handelsrutt`         | Fullständigt implementerat | Varje tilldelad flotta visar sin Trade route med båda ändplaneternas namn i Fleets, även medan den väntar på att lämna rutten.                                                                                                                                                                                                                                                      |
| `skepp-till-rorlig-flotta`     | Fullständigt implementerat | Skepp som skickas till en avlägsen flotta reser som en separat grupp med status En route och följer målflottans rörelser tills de möts. Fart och avstånd gäller; långsammare skepp är inte garanterade att hinna ikapp. Ordern sparas, kan avbrytas eller ersättas. Om målet försvinner eller blir tomt stannar gruppen för nya order.                                              |
| `fysisk-frakt`                 | Fullständigt implementerat | Last flyttas med flottor på kartan och lastas om vid mellanplaneter. Kapacitet, position och avstånd påverkar leveranstiden.                                                                                                                                                                                                                                                        |
| `automatisk-resursforsorjning` | Fullständigt implementerat | Aktiva köprojekt beställer saknat material från nätverkets tillgängliga överskott. Lager och inkommande leveranser räknas av utan dubbelbokning.                                                                                                                                                                                                                                    |
| `beslutslista`                 | Fullständigt implementerat | Decisions och Next decision samlar obesvarade val och försörjningsproblem. Tom produktionskö ger ett gemensamt val per planet, inte en påminnelse per fabrik. Saknad fabrik för köad produktion ger ett beslut. Normal leveransväntan visas som status.                                                                                                                             |
| `hoppa-over-beslut`            | Fullständigt implementerat | Skip this turn låter spelaren avstå från ett val utan ny varning samma år.                                                                                                                                                                                                                                                                                                          |
| `rundvarning`                  | Fullständigt implementerat | End turn visar kvarvarande beslut tillsammans. Spelaren kan återgå eller välja End turn anyway.                                                                                                                                                                                                                                                                                     |

## Ändringshistorik

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

| Kravnamn                     | Status                     | Krav                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fokuserat-kartval`          | Fullständigt implementerat | Star map saknar menyn med himlakroppar, förklaringsrutan för S/Q och kontrollrutan med Homeworld, zoomnivå och plus/minus. Tomma rutor utan flottor visar ingen informationspanel eller texten Empty space/Unexplored space. Himlakroppar, flottor, handelsrutter och pågående destinationsval visar sina uppgifter i den undre delen på små eller låga skärmar, med intern rullning vid behov. Events och End turn döljs medan ett sådant val visas och återkommer när en tom ruta väljs. Loggen följer de senaste händelserna om spelaren inte har rullat till äldre händelser. |
| `rundkontroller-i-decisions` | Fullständigt implementerat | Decisions visar också Events och End turn och ligger kvar när året genomförs. Rundknappen är spärrad medan året genomförs och samma beslutsvarning gäller som på kartan.                                                                                                                                                                                                                                                                                                                                                                                                          |

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
vanliga mobilskärmar. Namn, position, skeppstyper, destination och ruttuppdrag
är fortsatt synliga. Order, namnbyte och skeppsöverföring är fortsatt åtkomliga
med pekytor på minst 44 pixlar i höjd.

## Terraforming och planetkapacitet

Se [Terraforming och Domes](terraforming.md) för sammanhängande spelregler.

| Krav                     | Status               | Beskrivning                                                                                                                                                                                               |
| ------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `planettypsforskning`    | Delvis implementerat | Ice, Desert, Ocean och Toxic har varsin Dome-teknik följd av en terraformingteknik. Båda visas när en planet av typen blir synlig. Utökad verifiering återstår.                                           |
| `andningsbar-atmosfar`   | Delvis implementerat | Stenplaneter har andningsbar atmosfär från 80% habitability och behöver då inga Domes. Utökad verifiering återstår.                                                                                       |
| `habitability-kapacitet` | Delvis implementerat | Habitability begränsar befolkningen linjärt upp till 20 000 och andelen tillgängliga byggplatser. Golvet är 1 000 personer och en plats där planeten har byggplatspotential. Utökad verifiering återstår. |

2026-10-24: `domes-per-byggplats` ersätter det tidigare oimplementerade
`habitat` efter uttryckligt användarbeslut. `planetbyggplatser` behåller fasta
platsnummer men antalet användbara platser styrs nu av `habitability-kapacitet`.
