# Tekniska krav och arbetsregler

## Genererade symboler och kartbilder

`genererade-symboler-och-kartbilder`: 31 separata transparenta PNG-original
sparas under `assets/original/` med bildpromptpaketets filnamn. Använda
prompter bevaras och manifestet uppdateras per fil. Kontrollera antal, filformat,
alpha, fria kanter och unika filnamn automatiskt; granska motiv, ljusriktning
och symbolernas läsbarhet visuellt. Se [bildleveransen](generated-map-artwork.md).

`spelgrafik-symboler`: BuildingSymbols delar de 24 symbolerna mellan kataloger,
byggnadsköer och identifierad forskning. Fyra befintliga porträtt behålls;
övriga detaljvyer använder symbolen. Bilder är dekorativa vid namngivna val
och ersätts av befintlig SVG-symbol vid laddningsfel.

`spelgrafik-planeter`: Galaxy lämnar planetens miljö i frysta, utforskade
kartobjekt. Okända planeter lämnas fortsatt bort. PlanetImages delas av
HTML-illustrationer, alla fyra kartvyer och sparförhandsvisning. MapArtwork
laddar bilder en gång per kartinstans och ignorerar svar efter dispose.

`spelgrafik-kartstation`: Orbital shipyard använder den genererade bilden i
befintlig markörposition, med urvalsring och samma träffyta. Förstörda stationer
filtreras fortsatt bort. Laddningsfel behåller tidigare kartglyfer.

`python scripts/prepare-game-artwork.py` (Pillow) skapar WebP i klientens
symbol-, planet- och kartkataloger. Alla bilder är högst 512 px, kvalitet 90,
så även detaljvyer för symbolerna förblir skarpa på mobil. Alpha bevaras och PNG-originalen
ändras inte. Vite importerar resurserna med rätt basadress och innehållshash.
Sparformat, MVC-gränser och domänens spelregler ändras inte.

## Genererade skeppssprites

`genererade-skeppssprites`: PNG-original bevaras och optimerade WebP importeras via Vite. HTML och p5 delar ShipImages. Piratens sprite är en presentationsnyckel; sparformat och domänens ShipType ändras inte. Se [skeppsgrafik](ship-artwork.md).

## Enhetliga spelvyer

Krav och status: [enhetliga spelvyer](unified-interface.md).
`gemensam-events-panel` behåller samma DOM-instans i appens nedre rad.
`dragbara-koer` använder QueueView för bygg-, forsknings- och reparationsköer.
Vyn förhandsvisar ordningen och skickar controller-intent först vid släpp.
Pointer capture och dokumentlyssnare hanterar släpp utanför listan.
`omordningsbar-reparationsko` använder move-repair med varv-ID, vrak-ID och
målindex via controller och modell. Befintlig sparad array behåller ordningen;
sparformat och lagringsnycklar ändras inte.

`skeppssprites-pa-kartan` delar ShipImages-registret mellan HTML och p5.
FleetMapLayout beräknar bildpositioner och träffgräns; bilder laddas en gång.
`forskningskamerans-granser` beräknar minzoom och offsetgränser i modellen
från aktuellt träd och viewport. Alla inmatningssätt använder samma modell.
`planetinformation-pa-kartan` använder en fryst läsmodell som kontrollerar
utforskning innan planetfakta hämtas. `bildpromptpaket` har ett granskningsbart
manifest med referenser, användning och filnamn.

## Kompakta vyer och produktionsstatus, 2026-10-27

`dragbara-flottorder`: FleetOrderDrag använder pekarhändelser endast för vänster
musknapp. Sex pixlars horisontell rörelse startar dragning och pekarfångst;
efterföljande klick stoppas före orderknappen eller ruttmenyn. Touch använder
fortsatt webbläsarens inbyggda scroll. AppView bevarar scrollLeft per flott-ID
vid omrendering. Träffytorna är fortsatt minst 44 × 44 px.

`kompakt-forskningstrad`: ResearchTreeLayout och CSS använder 140 × 64 px,
44 px horisontellt mellanrum och minst 24 px vertikalt. Layouten undviker
överlapp även vid delade förkunskaper. Pilar och kameragränser delar måtten.
`forskningens-avslojande` härleds från färdig, köad och återfunnen forskning
samt att alla förkunskaper är färdiga. Anonyma rutor visar inga avslöjande
namn, bilder eller tillgänglighetstexter.

`forskningsdetaljer-vid-val`: AppModel äger sessionsbundet inspectedResearch,
skilt från aktiv forskning. Intent inspect-research går via AppController.
Detaljer visas i HTML-överlägg; endast dess Research-knapp köar. Kö och detaljer
visas en i taget. DiagramNavigation skiljer klick från dragning och pinch.
AppView bevarar kamera, köläge och relevant fokus genom omrenderingar.

`produktionsvalens-statusfarger`: Game härleder ProductionPresence från fysiska
byggnader, lager, flottpositioner och projekt. Aktiva leveransvägar från andra
ägda planeter till vald planet räknas en gång per productionOptions-anrop med
Logistics.path, inklusive flera led. Frakt räknas inte som lager. ProductionOption
exponerar oföränderliga presence, networkCount, queuedLocalCount och
queuedNetworkCount. Lokal förekomst går före nätverk och därefter kö;
köantal finns även på gröna och blå val. Vyn visar engelska statusetiketter,
detaljer och en separat vit valmarkering. Byggregler, sortering och reservationer
ändras inte. Sparformat 12 och lagringsnycklarna behålls.

## Stjärnbild och utzoomning

`stjarnornas-hexutseende`: StarGlyph använder en transparent WebP med plasmayta,
512 × 512 px. Bild och reservsymbol klipps två modellenheter innanför hexens
kant; bildens diameter har ytterligare marginal. Inga spikes ritas.
`stjarnvariation` härleder fem färger och varierad storlek från hexkoordinater.
Luminansfärgade texturer cachas per p5-instans; från zoom 0,65 används textur,
från 0,2 en förenklad glöd och under 0,2 ljuspunkter. Bilden laddas asynkront
i p5:s instans och används även i sparplatsens förhandsvisning. Original och
[bildprompt](star-artwork.md) bevaras i repot. Spardata påverkas inte.

`utokad-utzoomning`: Camera tillåter zoom 0,03–2,5. Under 0,5 utelämnas
okända hexars rutnät; under 0,18 utelämnas övriga rutnätslinjer förutom vald
hex. Under 0,2 visas enbart den valda himlakroppens namn.
Kända områden, stjärnor, terräng och navigering behålls i översikten.

## Utökad galax och terräng, 2026-10-26

`utokad-galax`: den publika klientens nyspelsfabrik skapar en oföränderlig,
reproducerbar värld med radie 100 och 150 system. `galaxarmar` använder
SpiralGalaxyLayout med tre diffusa spiralarmar, 22 system mellan armarna,
minst fem hexstegs avstånd och de tre ursprungliga systemen som ankare.
Små exempelvärldar behålls
som isolerade testfixturer. Galaxy indexerar positioner, stjärnor, planeter och
terräng. p5 ritar endast hexar i skärmytan med marginal.

`asteroidbalten` och `ofarbara-stjarnhexar`: HexNavigation används av Game
för samtliga flottorder och av transporternas tidsprognoser. Sökningen känner
bara stjärnor och redan observerad terräng. Genomförandet validerar verklig
terräng före varje steg. Ett asteroidsteg kostar alla årets 60 tidsenheter;
avbrott, sammanslagning och omladdning får inte skapa ny rörelsebudget.

`nebulosornas-sikt`: Detection räknar siktlinjer, kontrollerar båda sidor av
exakta hexkanter och skiljer observerad terrängyta från synligt innehåll.
Kartminnet bevaras; pirater använder bara aktuell, gemensam sikt.

Sparversion 12 innehåller världens terräng, systemens planetavstånd, känd
terräng och flottans pågående stjärnvarv. Äldre modellformat kan fortfarande
läsas för regressioner. `engangsreset-utokad-galax` rensar webbläsarens tre
spelplatser exakt en gång med markören `spacelords.expanded-galaxy-v12-reset`.
Detta är ett nytt uttryckligt beslut, inte en generell rensningspolicy.

Namnen nedan är stabila referenser i tester, kod och dokumentation.
Produktkraven finns separat i [product-requirements.md](product-requirements.md).

## Patrol och sparformat 11

`flottpatrullering` — **Fullständigt implementerat**: FleetPatrol väljer mål
och patrullpunkt oberoende av p5 och HTML. Game validerar ordern och använder
befintlig effektiv flottfart, gemensam detektionssikt, routing och
TurnSimulation. Jaktbeslut uppdateras mellan hexsteg utan framtida eller
osynliga piratpositioner. Ingen extra rörelsebudget skapas vid orderbyte,
förstärkning, avbrott eller omladdning.

Game.setPatrol, controlleravsikten patrol-fleet och AppModel.patrolFleet
förmedlar ordern. Vyer läser frysta ögonblicksbilder med centrum, härledd
räckvidd och eventuellt piratmål. Samma kompakta orderrad används på Star map
och Fleets. En aktiv patrull är ett uppdrag och ger inget sysslolöshetsbeslut.
Handelstilldelning får ersätta en Patrol-kurs efter övrig validering;
regeln om att andra resande flottor först måste stoppas behålls.

`avstamning-sparkompatibilitet`: sparformat 11 läser fortsatt version 2–10
utan rensning. Fleet.patrol lagrar centrum, nästa grannindex och eventuellt
pirat-ID. Centrum och grannindex valideras, liksom att flottan har Fighter
och inte samtidigt har rutt-, förstärknings- eller utforskningsorder.
Återstående tid och uppskjuten strid använder befintligt avbrottsformat.
Inga sparplatsnycklar eller rensningsmarkörer ändras.

Verifiering av `flottpatrullering`: 17 modelltester samt två controller- och
vytester skyddar order, målval, motorberoende gränser, förstärkning, kartkant,
strid och sparade avbrott. Sex riktade mobilscenarier passerar i Chromium och
WebKit; flottkortens höjd och pekytor kontrolleras och mobilbilder granskas.
`snabb-testsvit`: en första körning överskred tidsgränsen. Patrol-vytesterna
samlas därför i befintlig flottestmiljö; de 14 presentationstesterna i
grouped-events och star-map-trade-view flyttas till den utökade sviten utan
borttagning. Därefter passerar alla 475 snabba tester på 10,46 sekunder
inklusive verktygsstart, av högst 20 sekunder.

## Aktuell sikt och teleskop

`snabb-testsvit`: efter en avbruten körning över 20 sekunder flyttades 44
presentationstester för Research, planetöversikt, kartval och flottfokus till
`tests/extended/`. De kördes separat och godkändes. Snabbsviten behåller alla nya
sikt- och teleskopregler samt centrala användarflöden: 447 tester på 9,97 sekunder
inklusive verktygsstart vid verifieringen. Tidsgränsen är oförändrad.

`aktuell-detektionssikt` beräknas p5-oberoende av Detection utifrån ägda planeter
och flottornas monterade teleskop. MapCell skiljer `explored` från `visible`.
Game filtrerar pirater innan oföränderliga läsdata lämnas till vyerna; träffprovning
och informationspaneler använder samma filtrerade data. Sparplatskartan visar
utforskning, inte bara aktuell sikt. Synfältskanten ritas i p5 instance mode.

`teleskop-i-exploration-ships` lagrar teleskopnivå på ShipUnit. De tre
komponenterna använder ComponentPlanner, planetlager och Logistics med separata
fabriker. Planeringsförsök för olika nivåer ändrar inga lager, reservationer eller ID:n.
`pirat-aterupptackt` jämför nuvarande kontakter med föregående observation.

Sparformat 9 bevarar teleskop och piratkontakter samt om årets ekonomisteg redan
körts. Årssimuleringen har ett avslutande ekonomisteg; upptäckter där kan pausas
och laddas om före finishTurn utan upprepad produktion, tillväxt eller rörelse.
Version 2–8 migreras utan rensning; startskepp och äldre explorers får nivå I.
Gamla produktionsorder behålls med nytt teleskopbehov och ny delplanering där
försörjning finns. Forskningskön kompletteras med den nya förkunskapen. Gamla avbrott med enbart
piratobservationer utanför sikt öppnas med Continue utan falsk piratdialog;
förbrukad rörelse och väntande strid bevaras.

`dubbelklick-bygger-pa-kartan` behåller aktuell sida när ett produktval byter
kategori i en okategoriserad produktionsring. Ett dubbelklick kan därmed inte
beställa en annan produkt efter det första klickets omritning.

## Kartbaserade Route och Production

`route-kartvy`, `produktions-kartvy` och `delad-kartkamera` använder en gemensam
GalaxyMapView-instans mellan map, fleets, route och production. AppModel håller
Camera och tillfälliga kategori-, sid-, alternativ- och projektval. AppController
avbryter gester vid navigation. Production tillåter planetval och kameragester;
rutt- och flottorder hör till andra tillämpliga kartlägen.

`radiella-byggval` använder oföränderliga ProductionOption och
ProductionMapSnapshot. Game använder samma rena ComponentPlanner-planering för
förhandsbedömning och faktisk order. Förhandsbedömning ändrar varken order,
reservationer eller ID-sekvens. Första giltiga byggplats och matchande fabrik
väljs enligt befintliga domänoperationer; simuleringslåset gäller även här.
HTML-vyer rapporterar kart- och kontrollmått till controller; Camera panoreras
minimalt utan automatisk zoom. Smala kartytor använder färre alternativ per
sida. Panelen rullas internt och kontroller har minst 44 px träffyta.

`byggprojektets-forsorjningskedja` använder projekt-ID, ComponentOrder och
Shipment.path. Registrerade leveranser behåller sin faktiska väg även när en
etapp brutits. Beställd produktion utan Shipment får befintlig planerad väg.
Traversal följer produktionsprojekt med besökta ID:n och unika planetroller och
rutt-ID:n; inget leverantörsval görs av läsmodellen. ProjectSupply behåller
projektens textuella försörjningssteg.

`forsorjningsproblem-pa-kartan` bygger på aktiva Decisions och samma
SupplyOverview-bedömning. Tystning och årets överhoppning filtrerar markeringar.
Problemet får navigeringsmarkering i sin lösningsvy: Route för försörjning och
rutter, Production för saknad fabrik och personal/besättning. Tom kö och normal
väntan ger inga röda markeringar. Underliggande status går fortsatt att granska.

`farledskontrast` verifieras mot kartans bakgrund och hexytor med minst 4,5:1
för normal farled. Grundbredden är 2,5 skärmpixlar; markeringar och streckning
kompenserar för zoom. Fleets behåller nedtonade bakgrundsrutter.

SupplyView och SupplySelection är borttagna; SupplyOverview och transportregler
behålls. Inga UI-val införs i GameState och ingen sparformatmigration behövs.
Kravkopplade tester täcker modell, controller, rendering, mobilflöde och sparning.
Full plattformsmatris körs vid separat beställt sluttest för explicit revision.
`snabb-mobilpublicering` följer normalflödet i deployment.md: en vanlig
ändringsbeställning innebär snabbkontroller och driftsättning av den committade
arbetsbranchen, om användaren inte uttryckligen avstår. Detta ersätter den äldre
formuleringen här om separat beställd driftsättning. Omfattande sluttest och
merge till källrepots `main` beställs uttryckligen separat.

## Handelsrutter på Star map

`handelsrutt-skapande-pa-stjarnkartan`, `handelsrutt-val-pa-stjarnkartan` och
`flottilldelning-pa-stjarnkartan` använder oföränderliga läsdata från modellen.
StarMapTrade håller val och förhandsvisningar separat från sparade speldata.
TradeRouteMapLayout gör p5-oberoende träffprovning med 14 skärmpixlar för val
och 20 för tilldelning, oberoende av zoom. Kartans controller skiljer drag från
panorering med befintlig tröskel och avbryter order vid Escape, pekaravbrott
eller en andra touchpunkt. Förväntat avslut av pointer capture efter ett släpp
får inte ta bort ett kvarvarande ruttval.

p5 ritar ruttlinjer och förhandsvisning mellan hexmarkeringar och kartobjekt.
HTML-rutor visar ruttinformation och använder den gemensamma tilldelningsvalideringen. Skapande, tilldelning, frigörande och stängning använder befintliga
domänkommandon. Domänrelationerna och sparformatet ändras inte.

Enhets- och webbläsartester skyddar zoom, överlappningar, träffprioritet,
dragavbrott, ogiltiga släpp, tangentbordsalternativ, verkliga flottpositioner
och återupptagning. Befintliga logistiktester skyddar lossning och stängning.

## Flottadministration på Star map

`planetoppning-i-kartrubrik` använder en gemensam MapLocationHeading i hex-
och flottpanelen. Open planet skickar planetens id till controllern så att
planetinformationen öppnas för rubrikens planet, oberoende av tidigare hexval.
Knappen har kompakt form och minst 44 px klickhöjd. Kartans R-tangent börjar
en handelsrutt utan Create route-knapp; forsknings- och planeringsvillkoren
kontrolleras före avsikten och domänens målvalidering behålls.

`flottadministration`, `flottnamn-direktredigering` och
`flottknappar-pa-kartan` använder gemensamma FleetCard och ShipTransferInput
i kartpanelen och Fleets. FleetMapPanel visar flottorna vid aktuell position
utan att ändra kartans hexval. HTML-panelen visar flottkorten direkt och rullas internt utan separat utfällning eller hjälpruta.
`flottfokuserad-kartvy` och `delad-kartkamera` är **Fullständigt implementerat**.
AppView monterar GalaxyMapView för både Star map och Fleets. Samma Camera i
AppModel används utan återställning vid växling. Skärmens typ styr rendering,
träfftestning och tillåtna ruttgester. Fleets tonar ned himlakroppar och rutter,
döljer planetmärken och använder FleetMapPanel för flottval. Ej valda flottor
får streckade cirklar med zoomkompenserade streck; ritkontextens streckmönster
återställs före skeppen. Himlakropparnas namn ritas med full opacitet utanför
kropparnas nedtonade ritkontext. Ingen separat
minikarta, översiktsvy eller förhandsvisningsfabrik för flottor finns kvar.
Explicit ruttval från flottpanelen öppnar Star map; kartbakgrunden är inaktiv.
Sparformat och domänmodell ändras inte.

AppModel håller ett oföränderligt, tillfälligt namnutkast. AppController
samordnar redigering, validering och sparning genom befintliga Game-kommandon.
En överföring till en ny flotta använder den befintliga sammanhängande
domänhandlingen; kommandot returnerar den mottagande flottans ögonblicksbild.
Inga nya domänbegrepp, relationer eller sparformat tillkommer;
docs/domain-model.puml har granskats och behöver inte ändras.

Vyn bevarar fokus, markörläge och rullning vid återrendering.
Vid flottval rullas flottans namn fram även i långa lokala listor på båda kartvyerna.
Programmatisk borttagning av ett namnfält skiljs från användarens fokusbyte.
Det senare avbryter utkastet utan att förstöra kontrollen som tar emot nästa
klick. Enter sparar, Escape avbryter, och F2 eller namnknappen ger alternativ
till dubbelklick. Move-symbolen erbjuder Choose destination med
hexväljare eller kartan utan drag.

Enhetstesterna i fleet-map-management skyddar lokal gruppering, oförändrat
hexval, skapande med ett skepp, avbrott, namnredigering, fokus, destinationsval,
kameracentrering, avlägsna förstärkningar, ruttspärrar och sparade spel.
fleet-map-overflow verifierar 25 flottor på samma hex, begränsad
skeppsförhandsvisning och åtkomligt flottval på alla skärmprofiler.
Webbläsartesterna följer hela kartflödet i Chromium och WebKit och provar
native touch i mobil Chromium. Befintliga flott-, handels-, bygg- och
sparplatstester behåller skyddet för spelreglerna. Båda testsviterna omfattas
fortsatt av befintlig GitHub CI.

## Tekniska krav

| Kravnamn                 | Status                     | Krav                                                                                                                                                                                                                                  | Verifiering                                                |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `typescript-projekt`     | Fullständigt implementerat | Node.js-projekt med strikt TypeScript för server och klient.                                                                                                                                                                          | `npm run typecheck`, `npm run build`                       |
| `enkel-utvecklingsstart` | Fullständigt implementerat | Ett kommando startar klientens utvecklingsserver och servern med automatisk omladdning. Dokumentera installation, adresser och felsökning.                                                                                            | `npm run dev`, lokal startkontroll                         |
| `produktionsstart`       | Fullständigt implementerat | Byggd klient och server kan köras tillsammans utan utvecklingsverktyg.                                                                                                                                                                | Utökade HTTP-tester mot byggd server                       |
| `serverstatus`           | Fullständigt implementerat | Servern erbjuder en enkel statuskontroll utan verksamhetsfunktioner. Okända API-adresser ger 404.                                                                                                                                     | Enhetstest av statusmodell/controller och utökat HTTP-test |
| `rena-gitfiler`          | Fullständigt implementerat | Ignorera beroenden, byggresultat, testresultat, lokala inställningar och hemligheter. Checka in låsfil och ofarligt miljöexempel.                                                                                                     | `.gitignore`, `git status`, `git check-ignore`             |
| `lasbara-kravnamn`       | Fullständigt implementerat | Ge varje krav ett stabilt, unikt och läsbart namn. Använd samma namn i tester, docs och relevanta kodkommentarer.                                                                                                                     | Kravgranskning och namngivna tester                        |
| `separerade-kravlistor`  | Fullständigt implementerat | Börja rotöversikten med vision och kravkategorier. Håll produktkrav korta och otekniska. Lista tekniska krav separat och flytta växande detaljer till `docs/`. Dokumentera alla krav och ifrågasätt motsägelser.                      | Dokumentationsgranskning, `AGENTS.md`                      |
| `meningsfulla-tester`    | Fullständigt implementerat | Knyt beteendekrav till enhetstester som skyddar mot felkategorier. Använd andra relevanta kontroller för verktygs- och processkrav.                                                                                                   | Kravkopplingen nedan och kodgranskning                     |
| `snabb-testsvit`         | Fullständigt implementerat | Den snabba svitens totala exekvering får ta högst 20 sekunder, inklusive testverktygets start. Avbryt vid överskriden gräns och flytta tester med lägre regressionsvärde till den utökade sviten, som körs först vid begärt sluttest. | `npm test`, tidsbegränsad testprocess                      |
| `utokad-testsvit`        | Fullständigt implementerat | Ha en separat svit för tester som får ta längre tid, HTTP-integration samt riktiga browserkontroller mot produktionsbygget. CI-jobbet får ta högst 20 minuter inklusive installation av webbläsare.                                   | `npm run test:extended`                                    |
| `tester-i-github`        | Fullständigt implementerat | Kör snabbkontroller, Pages-bygge och mobilröktest vid push/PR. Kör hela sviten i GitHub Actions vid begärt sluttest för explicit källrevision.                                                                                        | `.github/workflows/ci.yml`, `npm run check` lokalt         |
| `regressionstest-forst`  | Fullständigt implementerat | Reproducera buggar med ett misslyckat test före rättningen. Skriv även tester först för annan implementation när lämpligt.                                                                                                            | Commit- och arbetsgranskning                               |
| `mvc-arkitektur`         | Fullständigt implementerat | Använd MVC på server och klient. Vyer hanterar plattformens in-/utdata, får läsa modellen och skickar ändringsavsikter till controllers. Modeller är objektorienterade med hög sammanhållning och låg koppling.                       | Enhets- och typkontroll, arkitekturgranskning              |
| `plantuml-domanmodell`   | Fullständigt implementerat | Underhåll problemdomänens klasser och relationer i PlantUML. Lägg till domänbegrepp först när krav motiverar dem.                                                                                                                     | `docs/domain-model.puml`, domängranskning                  |
| `branches-och-commits`   | Fullständigt implementerat | Arbeta på branches och gör regelbundna commits med tydliga meddelanden.                                                                                                                                                               | Git-historik och arbetsregler                              |
| `typescript-lintning`    | Fullständigt implementerat | Använd ESLint med typescript-eslint och meningsfull typmedveten kontroll. Undanta genererade bygg-, täcknings- och browserresultat från källkodsgranskningen.                                                                         | `npm run lint`                                             |
| `lasbar-kod`             | Fullständigt implementerat | Använd tydlig namngivning och Clean Code. Kommentarer förklarar motiv, begränsningar och kravkopplingar utan att upprepa koden. Håll formatering konsekvent.                                                                          | Kodgranskning och `npm run format:check`                   |

## Koppling mellan beteendekrav och tester

- `engangsreset-ekonomi`: **Fullständigt implementerat**. Den tidigare leveransen
  av ekonomiversion 2 raderade de tre äldre version 1-sparplatserna efter uttryckligt användarbeslut.
  Version 2 använder egna nycklar och återställs inte vid omladdning.
  Framtida formatändringar kräver bevarande eller nytt uttryckligt beslut.
- Ekonomi, forskningsordning, rutter, last, reservationer och överhoppade beslut
  ingår i sparformat version 3. Version 2 migreras utan att spel tas bort.
  Modellerna PlanetEconomy, ResearchPlan,
  Logistics och DecisionBoard hålls oberoende av HTML och p5.
- `utvinningsbara-resurser`, `utvinningsbyggnader`, `planetlager`,
  `planetbyggnadsko`, `forskningsko`, `forskningsberoenden`, `transportfabrik`,
  `handelsnatverk`, `flera-ruttflottor`, `fysisk-frakt`,
  `automatisk-resursforsorjning`, `beslutslista`, `hoppa-over-beslut` och
  `rundvarning` skyddas av modell-, vy- och browsertester.
  Utökad verifiering följer kedjan från nytt spel till försörjd koloni.
  Äldre hänvisningar till årsbudget nedan är historik; planetlager ersätter dem.

- `english-game` och `focused-interface`: vytester skyddar engelska handlingar,
  synliga modellvärden och beskrivningar av valda himlakroppar.
- `viewport-game-layout`: enhetstester skyddar controllerstyrd navigation mellan Overview och Build selection;
  browsertester kontrollerar alla vyer utan scroll eller klippta kontroller,
  även i stående och liggande format.
  Mobilnavigationen får egen bredd oberoende av logotypens fontmått.
  Regressionstest kontrollerar att kartan fyller ytan mellan navigationen och
  den gemensamma Events-raden, även med alternativa fontmått. Det ersätter
  tidigare 80 procent av hela telefonens skärmyta eftersom raden nu reserverar
  utrymme enligt `gemensam-events-panel`; CI verifierar också Linux/WebKit.
- Spelgrundens kravkoppling beskrivs i [first-iteration.md](first-iteration.md).
- `mvc-arkitektur`: enhetstest verifierar att modellens läsdata inte kan ändras
  utifrån. Typkontrollen begränsar vyn till modellens läsgränssnitt.
- `serverstatus`: enhetstest verifierar statusmodell och controller oberoende av
  HTTP; integrationstest verifierar routning, JSON och okända API-adresser.
- `produktionsstart`: integrationstest verifierar att byggd startsida och dess
  faktiska JavaScript- och CSS-filer går att hämta med rätt innehållstyp.

- `byggnaders-resursanvandning`: vytest kontrollerar drift per färdig byggnad.
- `flera-byggnader-av-samma-typ`, `planetbyggplatser`, `fabrikskoer`, `skepp-i-byggko` och
  `skepp-till-destinationsflotta`: modelltester kontrollerar köordning över år,
  budgetblockering, avbrott, byggplatser, mottagarval och reservbeteende.
  Vytester kontrollerar controllerstyrda knappar, dragning och mottagarval;
  browsertester kontrollerar beställning, omordning och färdigställning.
- `forska-fram-fabriker`, `kolonisation` och `kartorderstatus`: modelltester
  kontrollerar upplåsning, forskningsförutsättningar, kolonibildning, ägarskap
  och orderräkning. Vy- och browsertester följer hela kedjan från forskning
  till ny koloni; kartvyns markeringar kontrolleras separat.

- `visa-byggalternativ`, `planetbudgetoversikt` och `gemensamma-byggnadsbilder`:
  vytester skyddar sökning, kostnadsstatus, återgång till rätt plats,
  budgetproportioner, rivningsreservationer och bilders reservvisning.
  `kompakta-bygghandlingar` och `fabrikskoer` verifieras i webbläsare med
  innehållsbreda knappar, minst 44 px klickhöjd och fabrik/beställning sida vid sida från
  720 px panelbredd, annars staplade. Scrolläge och tangentbordsfokus verifieras.
  Originalbilder behålls i `assets/original/buildings/`. Webbversionerna är
  512 × 512 px WebP (kvalitet 85) i `src/client/assets/buildings/` och importeras
  genom Vite, som ger byggda bilder rätt basadress och innehållshash.
  Bildkopplingar ligger i vylagret; inga nya
  domänbegrepp eller domänrelationer tillkommer.

- `kartflottor`, `flottval-pa-kartan` och `dra-flottdestination`: gemensam
  p5-oberoende geometri används för ritning och träfftestning. Modellens
  skrivskyddade ögonblicksbild skiljer hovring, vald flotta och tillfällig
  destination från sparad order. Controllers skiljer flottgest från panorering
  och tvåfingerzoom. Enhetstester skyddar cirkelplacering, tomma flottor,
  överlappande träffytor, zoom/panorering, markering, förhandsvisning och avbrott.
  Browsertester verifierar flottval, separata flottor, pilförhandsvisning,
  oförändrad vald hex och Escape i Chromium och WebKit på fyra skärmprofiler.
  Inga nya domänbegrepp eller relationer införs; domänmodellen är oförändrad.

- `skeppsbilder`, `flottadministration` och `flottfokuserad-kartvy`: samma
  optimerade transparenta WebP-bilder används i kartans flottpanel och
  flottkartan. Modellens tillfälliga överföringsval är skrivskyddat för vyerna;
  överföringar går genom controller och befintlig domänvalidering. Vyn hanterar
  musdrag, touch och tangentbord. Enhetstester skyddar exakt en överföring,
  tomma mottagare, olika positioner, låsta order och begränsade stora bildlistor.
  Browsertester verifierar riktig bildladdning, gemensamt kameraläge,
  rörelse, överföringar och native touchdrag på flottkartan.
  Se [skeppsgrafik](ship-artwork.md) för original, friläggning och webbversioner.
  `tomma-flottor-utan-position` gör flottans position valfri i domänmodellen.
  Första överföringen eller fabriksleveransen sätter positionen; sista skeppet
  släpper position och färdorder även vid kolonisation. Äldre sparade tomma
  flottors position normaliseras vid inläsning. Enhetstester skyddar dessa
  övergångar, samtidiga leveranser från olika planeter och sparformatet.

Processkrav kan inte bevisas med meningsfulla enhetstester. De följs upp genom
verktygskontroller, CI och granskning enligt tabellen.

## Driftsättning

| Kravnamn                     | Status                     | Krav                                                                                                                                                                                                                                   | Verifiering                                                                         |
| ---------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `pages-underkatalog`         | Fullständigt implementerat | Klienten ska kunna publiceras som statiska filer i `spacelords/` i `dntoll/dntoll.github.io`, på `https://curiousengineerstudio.se/spacelords/`. Alla klientresurser använder rätt basadress. Node-servern ingår inte i Pages-driften. | `npm run build:pages`, integrationstestet `pages-underkatalog` i den utökade sviten |
| `bevara-befintlig-webbplats` | Fullständigt implementerat | En driftsättning får endast ändra `spacelords/`. Bevara andra projekt, startsidan, navigationen, rotfiler, domän och befintlig Pages-konfiguration. Undvik samtidighetskonflikter med andra publiceringar.                             | Avgränsad diff i målrepot och kontroll före/efter publicering enligt instruktionen  |
| `hemlighetsfri-publicering`  | Fullständigt implementerat | Båda repona och byggresultatet är publika. Publicera inga hemligheter i filer, byggvariabler eller loggar. Eventuell framtida CI-autentisering hålls separat från källkod och klientbygge.                                             | Granskning av bygginnehåll, staged diff och eventuell framtida CI-konfiguration     |
| `dokumenterad-driftsattning` | Fullständigt implementerat | Bevara en verifierbar instruktion för bygge, avgränsad publicering, kontroll och återställning. Normalläget automatiserar lokal publicering; CI publicerar inget.                                                                      | `docs/deployment.md` och hänvisning i `AGENTS.md`                                   |

Produktkravet `direktatkomst-utan-lankar` verifieras genom att driftsättningsdiffen
bara omfattar appens egen katalog. Startsida och navigation ska inte ändras.
Inga konstlade enhetstester behövs för en dokumenterad publiceringsprocess.

## Beslut och ändringar

- 2026-10-17: ESLint med typescript-eslint ersätter det tidigare JSLint-kravet på
  användarens förslag, eftersom projektet ska skrivas i TypeScript.
- 2026-10-17: Läsbara kravnamn och en separat teknisk kravlista tillkommer på
  användarens begäran.
- 2026-10-17: GitHub Pages blir mål för den statiska klienten under `/spacelords/`.
  Lokal Node-drift finns kvar; Pages kan inte köra servern. Befintlig webbplats
  och andra projekt ska bevaras och inga länkar till appen ska läggas till där.

## Första spelgrunden

| Kravnamn             | Status                     | Krav                                                                                                                                                                                                           | Verifiering                                               |
| -------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `p5-karta`           | Fullständigt implementerat | p5.js 2.3.4 i instance mode renderar en 2D-karta. Modeller och controllers beror inte på p5. HTML används för övriga vyer. Rita om vid förändring och städa instansen vid vybyte.                              | Enhetstester av modeller och browsertester av renderingen |
| `kravstatus`         | Fullständigt implementerat | Aktiva produktkrav och tekniska krav har en av de tre beslutade statusarna, med återstående arbete för delvisa krav. Processkravens status avser det stöd som finns i repot; efterlevnad granskas fortlöpande. | Kravlistor och AGENTS.md                                  |
| `browserverifiering` | Fullständigt implementerat | Den utökade sviten kontrollerar mus, touch, canvasstorlek, vybyten och olika skärmstorlekar mot Pages-bygget med Playwright.                                                                                   | Browsertester i lokal körning och GitHub CI               |

2026-10-17: Spelvisionen ersätter den tomma startsidan. p5.js väljs i stället
för planförslagets SVG. Se [första iterationen](first-iteration.md) för
avgränsning och tekniska beslut. Ingen ny driftsättning ingår.

## Språk och spelyta

| Kravnamn                           | Status                     | Krav                                                                                                                                                                                           | Verifiering                                    |
| ---------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `english-code-and-docs-convention` | Fullständigt implementerat | Kod, identifierare och kodkommentarer är på engelska. Dokumentation är på svenska med engelska namn och etiketter för sådant som finns direkt i spelet. Befintliga kravnamn är stabila.        | Kod- och dokumentationsgranskning, `AGENTS.md` |
| `distinct-requirement-documents`   | Fullständigt implementerat | Endast rotöversikten heter `requirements.md`. Produktkrav finns i `docs/product-requirements.md` och teknik i `docs/technical-requirements.md`. Länkar och arbetsregler följer samma struktur. | Dokumentations- och länkgranskning             |

2026-10-17: Språkregeln ersätter tidigare svenska speltexter. Skärmfyllande vyer
ersätter den tidigare staplade mobillayouten. Webbläsarens helskärmsläge krävs inte.

## Tillfällig spellagring

| Kravnamn                | Status                     | Krav                                                                                                                                                                                          | Verifiering                                           |
| ----------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `frontend-backend-mock` | Fullständigt implementerat | Spellagring sker tills vidare i frontend bakom ett injicerat `SaveRepository`-gränssnitt. Versionerade, serialiserbara speldata skiljs från skrivskyddade vydata och från webbläsarlagringen. | Modell-, controller- och browsertester i `save-slots` |

`BrowserSaveRepository` är en lokal mock med en `localStorage`-nyckel per plats.
`Game.exportState()` och `Game.restore()` bevarar värld, identifierarsekvens,
kolonier, befolkning, byggnader, rivningsorder, gemensamma produktionsköer, forskning,
flottor med färdriktning, utforskade hexagoner, händelser, år och fas.
Modellerna beror inte på webbläsare eller p5. Förhandsvisningar får bara
skrivskyddade, utforskade kartceller och använder p5 i instance mode.

En runda sparas efter slutförd simulering och vid upptäcktsavbrott; vid omladdning
mitt i animationen laddas föregående stabila planering eller avbrott. Sparfel visas och oläsbara platser bevaras
tills spelaren bekräftar tömning. Senaste speldatum uppdateras när ett spel startas,
ändras eller lämnas. Kameraläge och tillfälliga menyval återställs vid återupptagning.

Framtida multiplayer behöver en asynkron serveradapter, autentisering,
serverauktoritativa order och samtidighetskontroll. Det synkrona lokala gränssnittet
är en avgränsad mock, inte en färdig multiplayerbackend. Spel delas ännu inte mellan
webbläsare eller enheter. Flera samtidiga flikar samordnas inte i detta steg.

Tester för `sparat-spel`, `tre-sparplatser`, `sparplats-utforskad-karta` och
`tomm-sparplats` skyddar återupptagning, oberoende spel, filtrering av dold rymd,
varningsdialog, avbrott, lagringsfel och radering av en enda plats.

- `fabrikskoer`: fabriker visar beställningskontroller, inte egna köer.
  Controllers skickar order till planetens enda produktionskö. Modellen
  validerar rätt färdig fabrik och destination; låsta order och rivning spärras.

- `bevara-aldre-produktionskoer` — **Fullständigt implementerat**: sparformat
  version 4 använder en enda projektlista per koloni, liksom version 3. Version 2 läses från samma
  sparplatsnycklar; planetens och fabrikernas gamla köer vävs ihop efter
  projektidentifierare, med bibehållen ordning inom varje gammal kö. Gamla
  projektidentifierare och leveransreservationer bevaras. Saknade delposter i
  gamla lager fylls med noll. Upprepad återläsning ändrar inte kön. Automatisk
  rensning av sparplatser infördes inte i version 4. Modelltester täcker
  migreringen. Version 5 har ett separat uttryckligt undantag enligt
  `engangsreset-terraformning` nedan.

- `gemensam-planetko`, `skeppsdelar`, `delfabriker` och `automatiska-delorder`
  skyddas av modelltester för en färdig order per år, reservationer, automatisk
  delplanering, fabriksbrist, deltransporter och sparning, samt webbläsartester
  som forskar fram fabrikerna och tillverkar en Fighter genom hela kedjan.

- `handelser` och `arsrundor-och-order`: domänmodellen publicerar händelser när
  de inträffar; ankomst registreras exakt en gång. Livefaserna är planning, simulating och interrupted. Äldre sparad summary läses som planning och gamla steghändelser
  filtreras bort. Konsolen läser oföränderliga händelser, visar ett begränsat historikfönster
  utan att klippa senaste året och rullas enligt `senaste-aret-i-events`.
  Händelsehistoriken sparas i sin helhet. Tester skyddar fasväxling, ordning,
  ankomst, sparkompatibilitet, tillgänglig logg och små skärmar.

- `skepp-ur-olastad-ruttflotta`: samma läsbara validering används för skeppsval,
  klickflytt, dragning och domänens order. Game kontrollerar aktuell last före
  mutation, inklusive skapande av nya flottor. När sista Transport ship lämnar
  tas ruttuppdrag och Release-begäran bort och stängande rutter städas.
  Modelltester skyddar last, oförändrat tillstånd vid avslag, fysisk resa,
  lossning, väntande lagergods och sparning. Vy- och webbläsartester täcker
  spärrade lastade flottor, dragning och New fleet för olastade flottor.

2026-10-21: `utokad-testsvit` får 20 minuters jobbtid i GitHub CI. Den tidigare
tiominutersgränsen avbröt körningen utan testfel efter att installation,
byggen och delar av de fyra webbläsarprofilerna passerat. Ändringen gäller
hela CI-jobbet; `snabb-testsvit` behåller sin gräns på 20 sekunder.

- `fokuserat-kartval` och `rundkontroller-i-decisions`: enhetstester kontrollerar
  växlingen mellan tomma rutor, himlakroppar, flottor och handelsrutter samt
  rundknappens indata och spärr under simulering. Webbläsartester kontrollerar
  nedre panelens utrymme och att Events och End turn går att använda i Decisions
  utan sidscroll på telefon och i liggande format.

- `forskningstradets-utrymme`: enhetstester skyddar stationsantalets placering,
  borttagna zoomkontroller och öppen kö vid orderändringar. Webbläsartester
  kontrollerar trädets tillgängliga yta i stående och liggande format,
  oförändrad trädyta när kön öppnas samt pinch, mushjul och tangentbord.

## Automatiska delorder genom handelsnätverket

`automatiska-delorder` — **Fullständigt implementerat**: `ComponentPlanner`
tar fram en plan med privata tillgänglighetspooler och en lokal ID-sekvens.
`Game` validerar hela planen innan köer, reservationer och ID-sekvens ändras.
Alla produktionsorder använder samma planeringsingång och befintliga recept.
Controllers och vyer behåller MVC-gränserna.

Sparformat version 4 innehåller `componentOrders`, som kopplar huvudprojekt,
del, mängd, källa, aktuell lagerplats och eventuell produktionsorder.
`Shipment.componentOrderId` kopplar fysisk frakt till reservationen. Delar
reserveras även för senare köprojekt och efter lossning fram till förbrukning.
Avbrutna huvudorder släpper reservationer; delproduktion behålls och lastat
gods följer tidigare avbrottsregler. Version 2 och 3 läses utan automatisk
nybeställning eller radering. Sparplatsnycklarna ändras inte.

Kartornas försörjningsläsmodeller får skrivskyddade mängder för beställd produktion och
aktuella hinder. Framtida produktion blir aldrig en fiktiv Shipment.
`streckade-rutter-utan-transporter` — **Fullständigt implementerat**:
`TradeRouteSnapshot.hasActiveTransport` använder samma transportvillkor som
ruttsökningen. p5-vyn använder detta värde för zoomoberoende streckning och
återställer canvasens linjemönster efter ritning.

Kravkopplade modelltester skyddar avslag utan delvisa ändringar, prioritering,
leveranstider och likafall, reservationer, omordning, avbeställning, omlastning,
sparning och faktisk färdigställning. Vytester skyddar streckningen vid flera
zoomnivåer. Browsertester verifierar beställning genom controller, synlig
väntan och fel, sparning och hela produktionskedjan. Snabbsviten behåller
20-sekundersgränsen; den utökade sviten kör bygg- och browsertester i CI.

## Terraforming och engångsrensning

- `engangsreset-terraformning` — **Fullständigt implementerat**: efter uttryckligt
  användarbeslut 2026-10-24 töms de tre befintliga testsparplatserna en gång.
  Markören `spacelords.terraforming-v5-reset` förhindrar upprepad rensning.
  Annan webbläsarlagring lämnas kvar.
- `avstamning-sparkompatibilitet` — **Fullständigt implementerat**: arbetsregeln
  finns i AGENTS.md. Beslutet ersätter äldre bevarandekrav enbart för denna leverans. Fråga
  användaren på nytt vid framtida inkompatibla ändringar; testsparningarnas
  nuvarande status är inte ett generellt tillstånd att radera spel.
- Sparformat version 5 lagrar planetens aktuella habitability och
  Dome-förberedelser per plats. Nya spel och köade Dome-projekt ska överleva
  omladdning. Tidigare modellformat kan fortsatt läsas för regressionstester;
  ingen migrering av användarens äldre testspel ingår i leveransen.
- PlanetEnvironment beräknar kapacitet oberoende av HTML och p5. Game samordnar
  utveckling, upptäckt och byggvalidering. Vyer läser skrivskyddade snapshots
  och skickar order genom controllers. Forskningsträdets vy och kamera får
  samma upptäckta teknikmängd.
- Modelltester i `terraforming` använder kravnamnen `terraformning`,
  `planettypsforskning`, `domes-per-byggplats`, `andningsbar-atmosfar`,
  `habitability-kapacitet` och `engangsreset-terraformning`. Browserflödet
  verifierar forskning, Dome, fabrik, atmosfärgräns och sparning på mobil och dator.

- Det längre browserflödet för `skepp-till-rorlig-flotta` har 60 sekunders
  tidsbudget för två rundor, omladdning och kartinteraktioner i WebKit.
  Kontrollerna och CI-jobbets gräns på 20 minuter behålls.

### Verifiering 2026-10-24

- Snabbsviten: 319 godkända tester på 14,43 sekunder av högst 20.
  Formatkontroll, ESLint, typkontroll, båda byggena och fem integrationstester
  är godkända.
- Den fullständiga lokala browserkörningen tog 22,5 minuter: 242 godkända,
  25 plattformsanpassat överhoppade och ett tidsgränsfall i flottflödet.
  Efter justerad tidsbudget passerade tolv riktade tester mot slutbygget:
  terraforming, planet-/forskningsvyer och flottflödet på samtliga fyra profiler.
  CI-jobbets gräns är fortsatt 20 minuter; denna lokala körning verifierar
  inte CI:s exekveringstid.

## Snabb mobilpublicering och sluttest

Beslut 2026-10-24: `snabb-mobilpublicering` ersätter tidigare krav på fullständigt
`check` inför varje driftsättning. `tester-i-github` behåller sitt namn men
ersätter kravet på långsam svit vid varje push/PR med snabbkontroller vid push/PR
och manuellt startat sluttest för exakt källrevision. Båda sviterna finns kvar i
GitHub CI; 20-sekundersgränsen gäller fortsatt hela snabbsviten och sluttestjobbet
har fortsatt högst 20 minuter inklusive installation.

- `snabb-mobilpublicering` — **Fullständigt implementerat**: `check:quick` kontrollerar
  kvalitet, typer, snabbsvit, Pages-bygge, publiceringsskydd, Pages-integration och
  kort mobiltest i Chromium och WebKit. `deploy:quick` kräver ren arbetsbranch,
  pushar exakt källrevision och publicerar enbart `spacelords/` via isolerad
  checkout och vanlig push. Den sparar rapport och kontrollerar Pages, livefiler
  och mobilnavigation. Normalflödet är verifierat mot liveadressen; snabb-CI har
  också passerat. Gles hämtning av aktuell revision undviker webbplatsrepots
  övriga innehåll och historik.
- `sluttest-fore-merge` — **Delvis implementerat**: hela sviten är förberedd för
  manuell CI-start med låst källrevision. Separat ja krävs efter godkänt sluttest
  innan merge till källrepots `main`. Första aktivering på defaultbranch och
  verklig manuell CI-körning återstår; införandeundantaget finns i
  `docs/deployment.md`. Inga branchskydd eller Pages-inställningar ändras.
- `avstamning-sparkompatibilitet` förtydligas: användaren accepterar förlust av
  sparningar efter ny fråga inför varje inkompatibel ändring. Ingen generell
  rensning införs med snabbflödet.

Automatiska verktygskontroller i `tests/tooling/` använder tillfälliga Git-repon
för avgränsning, okända filer, symboliska länkar, revisioner, avbrutna kontroller
och samtidiga publiceringar. Mobiltestet använder kravnamnen
`snabb-mobilpublicering`, `viewport-game-layout` och `sparat-spel`. Processkravet
på begäran och mergegodkännande verifieras genom arbetsregler och granskning.

### Verifiering av normalflödet 2026-10-24

`deploy:quick` publicerade källrevision `1120d5104cfdc70aaef46f9f35be13ef644ccacf`
och avslutades med `verified`. Snabbkontrollerna tog 56,88 sekunder;
hela flödet tog 140,25 sekunder inklusive Git, Pages och livekontroll.
328 enhetstester passerade på 15,46 sekunder inklusive verktygsstart,
nio verktygskontroller och Pages-integration passerade. Två mobiltester
passerade före publicering och två korta mobilkontroller passerade live.
Kloning och sparse checkout tog tillsammans 3,18 sekunder.

[Snabb-CI](https://github.com/dntoll/spacelords/actions/runs/40069893096) är
verifierad separat. [Pages](https://github.com/dntoll/dntoll.github.io/actions/runs/40070361118)
lyckades; tolv livefiler matchade bygget och revisionsmetadata. Sluttest och merge
har inte beställts eller genomförts; inga nya tider för hela sluttestsviten finns.

## Motorbestyckning och sparkompatibilitet

`automatisk-motormontering` — **Fullständigt implementerat**: Modellen bevarar varje
skepps stabila id och installerade motorer. Vyer får oföränderliga
ögonblicksbilder och skickar individuella skeppsval via controller.
Motorer och fart verifieras vid flytt, förstärkning, sammanslagning och kolonisering.

`avstamning-sparkompatibilitet`: Sparversion 8 läser fortsatt version 2–7.
Befintliga skepp får Rocket engine utan lageravdrag; äldre uppnådd forskning
behålls och saknade motorförkunskaper kompletteras. Äldre köade skepp behålls
med synligt motorbehov. Ingen ny rensningsmarkör eller ändrad lagringsnyckel
införs. Laddning av version 2–5 och bevarande av motorbestyckning verifieras automatiskt.

`kompakta-flottkort` behåller fyra skepp per rad även när flera flottkort delar
kartpanelen på dator eller surfplatta. Skeppsknapparnas bredd anpassas till
radens utrymme mellan 44 och 60 px; träffytorna behålls. En effektiv fart visas
för hela flottan; Engines & speed tas bort från flottkorten enligt ändringen
2026-10-25. Standardkort med fyra skepp och stängda menyer är högst 140 px
höga vid minst 220 px kortbredd. Webbläsarregressionen verifierar radantal, korthöjd och
kontrollernas träffytor.

`dome-fore-fabriksforslag` använder Game.productionGuidance och samma skrivskyddade
byggplatsdata som produktionsalternativen. Ledig förberedd plats, tom plats som
behöver Dome, köad Dome och upptagna platser skiljs åt i modellen. Fabriker och
vanliga byggnader erbjuds endast med en ledig förberedd plats; Dome-alternativ
prioriteras när lediga oförberedda platser finns. Befintliga fabrikers produkter
påverkas inte. Kartan och planetens Production-undersida läser samma oföränderliga
ProductionGuidance; alla val och beställningar går genom controller. Sparformat,
forskning och Domes-per-byggplats-regler ändras inte.

`unika-flottnamn` valideras i Game vid namnbyte och används vid all automatisk
namngivning. Inläsning normaliserar äldre dubbletter utan att ändra flott-ID,
skepp, order eller sparformat. `rutt-eskortfordelning` använder samma
TradeAssignment-validering i modell och förhandsvisning. Game fördelar Fighters
via befintlig transferShips och fysisk FleetPursuit; skeppsenheter och motorer
bevaras. Fördelningen räknar även väntande förstärkningar och muterar först efter
validering. Kapacitet och leveranser använder fortfarande enbart Transport ship.
`ruttflottor-pa-kartan` använder FleetMapLayout för både p5-rendering och
träfftest. Endast Route skickar in rutter för mittpunktsplacering. Kamerazoom
styr avstånd och träffradie. Flottornas verkliga positioner ändras inte av vyn.

`forskning-kraver-station` valideras i Game.selectResearch innan ResearchPlan
lägger till tekniken eller dess förkunskaper. ResearchSnapshot exponerar
queueBlockedReason från färdiga, ägda stationer utan rivningsorder. Samma
läsmodell spärrar knappar och styr Decisions. Operating stations räknas fortsatt
separat för framsteg. Befintliga sparningar och forskningsköer bevaras utan
formatändring eller rensning.

`dubbelklick-bygger-pa-kartan` använder en controlleravsikt med explicit
produkttyp och befintliga beställningsoperationer i modellen. HTML-knapparna i
byggcirkeln bevaras vid enbart ändrat val så att webbläsarens dubbelklick kan
registreras; aria-pressed uppdateras utan att ersätta knapparna. Två efterföljande
tryck på samma alternativ inom 500 ms beställer en gång även i WebKit, och
den efterföljande syntetiska dubbelklickshändelsen skapar ingen extra order.
Hovring behåller minst 4,5:1 kontrast mellan byggvalets text och bakgrund.
`byggknapp-vid-titel` använder en gemensam flexrad för titel och Build i kartans
byggdetaljer. Kostnader och hinder finns nedanför och ingen ny köbegränsning
införs.

`beslutsmarkering-pa-flikar` använder decisionScreen i modellen som gemensam
målfunktion för Review och navigeringsmarkeringar. AppReadModel exponerar en
oföränderlig lista attentionScreens som härleds från needsAttention. Kartans
problemmarkeringar behåller sin avgränsning; byggval och lediga flottor ger
flikmarkeringar och riktad gul vägledning enligt `beslutsvagledning-i-vyn`;
röda problemringar behåller sin tidigare betydelse. Vyn lägger till ! samt
Needs attention för tillgänglighet på varje berörd flik. Ingen ny data sparas.
`tystade-beslut-sist` grupperas stabilt i DecisionBoard innan oföränderliga
ögonblicksbilder skapas. Next decision tas bort från vy, controller och
avsiktskontrakt; Review går fortsatt genom befintliga navigeringshandlingar.

`produktionsval-efter-forekomst` härleds i Game.productionOptions från färdiga
byggnader, lagrade Domes, komponentlager/frakt och befintliga flottor.
`produktionsberoenden-i-byggval` härleds från projectDefinition.parts och
fabrikens produktrecept samt BUILDINGS.component. Alternativa motorfabriker
behandlas som ett gemensamt behov. Endast färdiga fabriker utan rivningsorder
uppfyller producentbedömningen. ProductionPriorities använder en stabil
beroendeordning med förekomstgrupper som prioritet; en cirkel bryts
förutsägbart så att inga val försvinner eller låser traverseringen.
ProductionOption exponerar oföränderliga antal och dependencyWarning. Vyn
visar !, tillgänglig förklaring och vald varning, men ändrar inte domänregler
eller spärrar Build på grund av rådgivningen. Befintliga controllers,
validering, kategorier och sidor återanvänds. Granskning ändrar inte sparat spel,
order, reservationer eller ID-sekvens. Sparformatet ändras inte.

`senaste-aret-i-events` bevarar Decisions-konsolen ansluten när beslutslistan
renderas om. Ändrat år följer alltid slutet; uppdateringar inom samma år
respekterar läsposition. `utvikbara-events` använder HTML details/summary och
tillfälligt presentationstillstånd i AppView. Utfällning rullar till senaste
händelserna. Höjd begränsas av sidans och skärmens utrymme, med intern scroll.
`rundkontroller-pa-fler-vyer` återanvänder TurnActionsView och befintliga
controllerhandlingar. Research och planetvyn behålls under startTurn.

`beslutsvagledning-i-vyn` använder en separat vy för åtgärdstext, Show och
HTML-markeringar. needsAttention och decisionScreen är gemensamma med
navigeringen. p5 ritar ringar från samma aktiva beslut och gemensam
FleetMapLayout; markerade skepp och planeter behåller korrekt träfftest.
Varken guidning, utfällning eller läsposition skapar nya domänorder,
reservationer, sparfält eller ID:n. Befintliga sparningar bevaras.

## Space pirates och strid

- `rymdpiraters-sparning`: sparformat 7 har en uttrycklig lista `pirates`.
  Format 2–6 läses utan pirater; ingen sparplats rensas. En tom lista betyder
  att inga pirater finns kvar. Varje piratflotta sparar identitet, hemsystem,
  position och antal. Ogiltiga positioner, antal och dubbla flottidentiteter avvisas.
- `flottstrid-per-hex`: rörelseprognosen och genomförandet använder samma
  stridsresultat. Oföränderliga TurnFrame innehåller rörelser och stridsresultat.
  Prognosen tar bort förluster före nästa steg och före förstärkningsanslutning;
  förstörda skepp kan inte fortsätta färden. Kvarvarande rörelsebudget ökas inte
  av förluster. Förluster väljs efter stabilt skepps-ID och flottordning efter
  stabilt flott-ID. Flottantal och individuella skepp uppdateras tillsammans.
- `rymdpirater-per-stjarna` och `rymdpiraters-patrullering`: PirateFleet och
  FleetCombat är oberoende av p5. Pirater lagras separat från spelarflottorna.
  Vyer får enbart synliga, oföränderliga ögonblicksbilder och kan inte styra
  pirater. Starthex är stjärnans första granne enligt HexCoordinate; patrullen
  följer samma grannordning. Piratrörelser utökar inte spelarens utforskade karta.

`snabb-testsvit`: snabbsviten använder tre isolerade testworkers och behåller
spelregler, sparning, rörelse och centrala användarflöden. De detaljerade
ritlager-, kontrast-, streckmönster- och Research-layoutkontrollerna ligger i
`tests/extended/`: de har lägre regressionsvärde vid vanliga speländringar än
beteendetesterna. Inga tester tas bort. Den utökade sviten upptäcker dem via
`vitest.extended.config.ts` och kör dem först vid separat begärt sluttest.
20-sekundersgränsen inkluderar fortsatt verktygsstarten.

## Stegvis simulering och upptäcktsavbrott

`upptacktsavbrott`, `order-under-upptacktsavbrott` och `spara-avbrutet-ar`:
Game äger en TurnSimulation med återstående rörelse, upptäckter och en markering
för uppskjuten stridsbehandling. Controller begär nästa TurnFrame, animerar
steget och lämnar tillbaka det till modellen exakt en gång. Rörelse och strid
är separata steg. Nya objekt upptäcks efter samtidig rörelse, före strid.
Continue behandlar redan uppkommen strid innan nya order kan flytta flottorna.
Sammanslagningar använder minsta återstående rörelse; pirater får ett steg per år.
Byggande och forskning avslutas exakt en gång vid årets slut.

Sparformat 8 innehåller kända objektidentiteter, utforskningsuppdrag och den
avbrutna sessionen. Äldre versioner får sin nu synliga information som utgångspunkt
utan retroaktiva dialoger. Inga sparplatsnycklar eller rensningsmarkörer ändras.
Avbrott och ändrade order sparas före fortsatt simulering. Vyer får frysta
ögonblicksbilder, inklusive vilka flottor som får rörelseorder. Behörigheten
kontrolleras även i domänmodellen. Rutt-, last- och motorregler gäller fortsatt.

`produktionsorder-aterkoppling`: beställning returnerar huvudprojektets id och
köplats, även om automatiska delorder har lagts före det. AppModel förmedlar
ett oföränderligt kvitto och controller styr dess tresekunderstid. Vyn använder
role=status. Musens dubbelklick och touchens dubbeltryck delar befintlig
engångsbeställning. Fel ger ingen lyckad bekräftelse.

Modell-, controller-, vy- och webbläsartester använder kravnamen och skyddar
utforskning, direkta kontakter, paus/återupptagning, orderbehörighet, omladdning,
köåterkoppling och kortens mått. Båda befintliga CI-sviterna behålls.

2026-10-25: `utokad-testsvit` startar npm via Node och npm:s CLI på Windows,
där npm.cmd annars inte kan startas med execFile/spawn utan skal. Unix behåller
vanlig npm-start. Startfel skrivs till stegets logg. Verktygstesterna verifierar
verklig npm-start och fortsatt stopp vid fel. Länkskyddet testas med junctions
på Windows utan krav på administratörsrättigheter och med symboliska länkar
på Unix. Ingen publicering mot verkliga repon ingår i dessa tester.

`forskningstradets-utrymme`: varningen om saknad Research station är ett
överlägg utan att reservera någon innehållsrad. Trädet fyller ytan även utan stationer; native
touch-regressionen kontrollerar både tillgänglig höjd och zoom/panorering.

`symbolbaserade-kataloger`: återgång från detaljer bevarar vald posts
fokus även när WebKit släpper fokus före Back-handlingen. Vyn sparar
återgångsmålet från indata, oberoende av webbläsarens aktiva element.
Regressionstestet verifierar förlorat fokus före klicket.

### Verifiering 2026-10-25

- Snabbsviten omfattar 465 enhetstester och behåller gränsen 20 sekunder.
- Typkontroll, ESLint, Prettier, klient/server-bygge och Pages-bygge kontrolleras.
- Den utökade körningen omfattar 25 integrations-/utökade tester och 10
  verktygstester. Windows-starten av npm och länkskyddet har verifierats.
- Alla 340 webbläsarscenarier kördes i de fyra befintliga profilerna. Efter
  rättningar och riktade omkörningar är 312 scenarier godkända; 28 hoppas över
  enligt befintliga villkor för mus, touch och webbläsarprofil.
- En sista körning av 24 scenarier verifierar den färdiga versionens flottkort,
  produktionskvitton, utforskning, ruttmenyer och sparade upptäcktsavbrott. Handle provas
  även i liggande läge. Ingen driftsättning har gjorts.

Namnknappen i `kompakta-flottkort` behåller minst 88 px bredd. Ruttsymbolen
delar den horisontellt rullbara orderraden för att ge namnet mer utrymme.

### Bärgning och sparformat 10

`spara-bargning-och-stridsavbrott`: format 10 läser även format 2–9 utan rensning.
Äldre spel får inga retroaktiva vrak. Vrakets ShipUnit, exklusiva reservationer,
släp, stationer, ordnade reparationsköer, forskningsfynd och stridsrapporter sparas. Inkonsekvent
dockning, fel motorantal och okända fynd avvisas.

`bogsering-av-vrak`: årssimuleringen räknar 60 tidsenheter per flotta. Ett steg
kostar 60/farten vid steget. Ändrad fart vid upphämtning, lossning eller reparation
ger ingen ny tidsbudget. Äldre sparningars återstående hexantal omvandlas till tid.

`stridsrapport-i-dialog`: alla strider i samma samtidiga steg avgörs innan paus.
Controller sparar resultaten före visning. Handle ger orderbehörighet; Continue
återupptar kvarvarande rörelse och applicerar årets ekonomi exakt en gång.

`orbitalt-varv` och `automatisk-vrakreparation`: stationens grannhex reserveras
vid köläggning. Reparationsköer är separata från planetens Build queue och behandlas
i stabil varvsordning efter ordinarie produktion. Material och personer debiteras
först vid färdig reparation; inga nya komponenter tillverkas för det gamla skrovet.
Salvage håller vrak, dockning och order samlade. Vyer läser frysta ögonblicksbilder.
Kartmarkörer och träffytor delar geometri; order nås också utan dragning.

Riktade modelltester och mobiltester i Chromium och WebKit skyddar bärgning,
bogseringens fart, varvsplacering, reparation, förstörelse, återuppbyggnad,
forskningsundantag och omladdning. Snabbsvitens gräns på 20 sekunder gäller fortsatt.

## Beslut som väntar på påbörjade åtgärder

`beslut-vantar-pa-paborjad-atgard` bedöms i modellen från befintliga köer,
forskningsmål, rutter, leveranser och lager. Samma bedömning används för
Decisions, produktionsvägledning, försörjningsöversikten och projektens steg.
Bedömningen utför inga order och ändrar inga verkliga lager, reservationer
eller transportvägar. Tillgängligt lager för väntande transport räknas bara
en gång i en stabil projektordning; senare projekt får inte lovas samma mängd.

Vyerna läser oföränderliga ögonblicksbilder. Vänteskäl lagras inte i sparningen;
de beräknas på nytt efter köändring och omladdning. Befintliga besluts-ID:n,
Mute-inställningar och sparformat behålls. Det nya grundbeslutet
`research-stalled` används när köad forskning saknar Research station och
ingen ersättning har beställts.

## Uppspelning av avslutat år

`end-turn-vid-kartval`, `sekventiella-arshandelser`, `handelser-pa-kartan`
och ändringen av `senaste-aret-i-events` är **Fullständigt implementerat**.
AppModel äger ett separat EventPlayback med frysta ögonblicksbilder.
AppController driver de automatiska stegen och städar timern vid dispose.
Vyer skickar intents och ändrar aldrig modellen. Under presentationen spärras
andra spelhandlingar. Kontrollmenyn med Pause/Play, Next och Skip är borttagen.
Detta ersätter den tidigare timern på 1,5 sekunder och dess kontroll-intents.

Simuleringen avslutas och sparas innan uppspelningen börjar. Spelregler,
årsnummer och ekonomi ändras inte av uppspelningen. Den är sessionsbunden
och återupptas inte efter omladdning; den fullständiga senaste årsloggen visas
i stället. Upptäckts- och stridsavbrott behåller befintlig sparning och
fortsättning; en återläst avbruten runda får sin normala uppspelning vid avslut.

GameEvent får valfria frysta q/r-koordinater vid händelsens uppkomst, även genom
LogisticsPort. Händelsepositionen beror inte på ett senare objekts position
eller existens. Äldre händelser utan koordinater läses utan migrering eller
rensning. Händelser med ogiltig valfri position behåller sin text utan kartmål.
Globala forskningshändelser får ingen konstruerad position. p5 i instance mode
ritar ring och etikett från läsmodellen; HTML visar lista och kontroller.

Uppspelningens kamera är separat från planeringskameran. Föregående vy,
giltiga val och kamerans exakta centrum och zoom återställs vid avslut.
Orienteringsbyte ändrar layout utan att återställa aktuell händelse.
Listan växer med senaste årets innehåll och rullas internt vid maxhöjd.
Enhetstester skyddar ordning, timer, spärrar, sparkompatibilitet, positioner
och återställning. Riktade mobiltester skyddar stående/liggande layout,
kartmarkering, kontroller, rullning och omladdning i Chromium och WebKit.

## Seriell flottpresentation och händelseannonsering

`en-flotta-i-taget`, `osynliga-flottor-utan-animation` och
`handelseannonsering` är **Fullständigt implementerat**.
TurnMovementPlayback samlar synliga förflyttningssteg fram till nästa
upptäckts-/stridsavbrott eller årets avslut och grupperar dem per flotta.
Alla steg tillämpas i simuleringens ordning exakt en gång. Resultatet sparas
innan presentationen börjar. Flottornas visade färder ändrar inga order,
rörelsebudgetar eller stridsresultat och sparas inte som pågående spelmekanik.

Kontrollern visar hela en flottas inspelade färd före nästa. Endast egna
flottor eller fientliga steg som finns i siktsnapshoten både före och efter
steget lämnas till animationen. Dolda steg får ingen timer eller kameraflytt.
AppModel lämnar en fryst läsmodell för presentationen, och vyerna interpolerar
en markör med stillastående tillfällig kamera. Varje hexsteg tar 400 ms.
Vid dispose avbryts requestAnimationFrame och väntande animationslöften löses.

### Händelseanpassad kamera

`handelseanpassad-kartkamera` och `stillastaende-kamera-vid-forflyttning`
är **Fullständigt implementerat**.
Detta ersätter kameraföljningen i `en-flotta-i-taget` från 2026-10-30.
CameraFraming beräknar oföränderliga kamerafaser från världspunkter och fri
kartrektangel, oberoende av p5. En färds samtliga inspelade synliga ändpunkter
ingår, så även mellanliggande svängar ryms. Dolda rörelser ingår aldrig.

Utzoomning kring aktuellt centrum tar 300 ms och hoppas över när målen redan
syns. Därefter panoreras och zoomas kameran samtidigt under 450 ms till
största inramning upp till zoom 1. Hexarnas utbredning och 24 skärmpixlars
marginal ingår; på extremt små ytor minskas marginalen till en fjärdedel av
ytans mått. Zoom interpoleras logaritmiskt och båda faserna använder mjuk
acceleration och inbromsning. Målområdets skärmläge interpoleras så att målen
förblir synliga även under en stor samtidig panorering och inzoomning.
Uppspelningskameran får underskrida den manuella
minzoomen för att hela färden ska rymmas. Spelarens zoomgränser ändras inte.

AppController inväntar kamerafaserna före skeppets första rörelsesteg.
Vyns animationsklocka rapporterar progression; controllern uppdaterar modellen
och vyn renderar dess läsmodell. GalaxyMapView ändrar enbart skeppsmarkörens
position under färden. Kameran är gemensam genom rörelser och efterföljande
händelser och är separat från planeringskameran. EventPlayback får den
sessionsbundna fasen framing före announcing eller awaiting-choice; lästid
och beslut börjar efter inramningen. Globala och äldre positionslösa
händelser får ingen kamerafas.

Storleksändring räknar om aktuell inramning. Under pågående kamerarörelse
avvisas gamla callbacks och den gamla kamerafasen avslutas; under
skeppsrörelse eller annonsering tillämpas den
nya inramningen direkt utan att uppspelningen startas om. Vid minskad rörelse
tillämpas slutläget direkt. Dispose avbryter animationsklockan och löser dess
väntande löfte utan fortsatt modelluppdatering. Sparformat och domänmodell
ändras inte. Enhets- och riktade mobiltester skyddar inramning, stillastående
kamera, kontinuitet, rotation, minskad rörelse, beslut och återställning.

EventPlayback har stegen announcing (1 400 ms) och filing (450 ms).
AppView visar den aktuella texten i ett fast HTML-lager ovanpå gränssnittet,
med platsbundna händelsers textruta 82 px under kartpunktens centrum. Därmed
lämnas både markeringsring och Event-etikett fria. Kartytans faktiska
skärmrektangel, händelseposition och aktuell kamera bestämmer placeringen;
bredden begränsas till kartytan med 16 px sidmarginal. Vid högst 360 px
skärmhöjd används mindre text och padding samt 74 px avstånd för att rutan
ska rymmas under etiketten även på en kort liggande mobil. Globala händelser
behåller skärmcentrum. Detta förtydligar `handelseannonsering` och
`handelser-pa-kartan` 2026-10-27 och ersätter tidigare central placering av
alla händelser. AppView beräknar destinationen från en osynlig platshållare i loggen och använder en
CSS-övergång för att flytta texten dit. Bara redan färdigannonserade händelser
har synliga rader i loggen. ResizeObserver räknar om ursprung och landningspunkt vid
orienterings- och storleksändring. prefers-reduced-motion utelämnar
markörinterpolation och textförflyttning men behåller lästid och årsresultat.

Placeringen under händelseplatsen skyddas av ett regressionstest som först
misslyckades med skärmcentreringen. Riktade tester verifierar kamerakoordinater,
globala händelser, fortsatt flytt till loggen och minskad rörelse. Webbläsarflödet
kontrollerar stående, liggande och kort liggande format i telefon Chromium,
telefon WebKit och desktop Chromium. Sparformat och årsresultat ändras inte.

Arbetet görs på `codex/cinematic-turn-events` från `7f1a241`. Tidigare
presentation finns kvar på `codex/decisions-pending-actions`; grenbytet
kräver ingen ändring eller rensning av sparade spel. Detta möjliggör återgång
om användaren föredrar den tidigare presentationen.

## Gemensamt händelseflöde

`gemensamt-handelseflode` — **Fullständigt implementerat**. EventPlayback
använder samma kö för vanliga händelser och avbrott. Steget awaiting-choice
saknar timer; först ett uttryckligt Handle eller Ignore påbörjar filing.
Avklarade händelser återanvänds som historik i nästa delkö och annonseras inte
igen efter årets slut. Avslutad presentation återupptar simuleringen bara när
avbrottet inte längre väntar på hantering eller fler händelseval.

Discovery och BattleReport har valfri eventId. TurnSimulation sparar
presentedEventIds och valfri activeEventId som tillägg till version 12; äldre
sparningar utan fälten accepteras. Äldre avbrott kopplas till sina befintliga
händelser genom deras plats och ursprungliga ordningsföljd. Saknade
händelsepositioner kompletteras från det sparade avbrottet. Val sparas före
filing och hantering återställs även vid omladdning under animationen. Vyerna
läser frysta presentationer och skickar val till kontrollern.

Interaktiva händelser ramas in högre på kartan för att lämna plats under
markeringsringen. Information rullas internt, medan Handle och Ignore har
minst 44 px träffyta och ligger utanför rullningen. Vid högst 360 px höjd döljs
varumärkesraden tillfälligt; navigation och End turn förblir synliga.

## Bärgningsval från flottan

`bargningsorder-fran-flotta` använder befintlig SalvageOrder och samma
kapacitetsbedömning för flottans knapp, vrakpanelen och dragning. Vrakets
identitet väljs vid avslutat klick, så flera vrak i samma hex inte blandas
ihop eller ersätts av en vanlig flyttorder. Valet går via controller och
order sparas efter målvalet. Sparformatet ändras inte.

## Sparad koloniseringsorder

`koloniseringsorder`: Fleet har det valfria fältet colonizationTargetId i
befintligt sparformat version 12. Äldre sparningar utan fältet läses som
tidigare; ingen rensning eller inkompatibel migrering görs. Återläsningen
validerar planet, Colony ship och oförenliga uppdrag. Game samordnar färd,
strid och grundning; vyerna väljer planet och skickar avsikter via controller.
Den befintliga metoden för kolonigrundning återanvänds för skeppsförbrukning,
befolkning, lager och kartminne. Nya kolonier bidrar direkt till aktuell sikt.

## Snabbsvitens utrymme 2026-10-30

`snabb-testsvit`: en diagnostisk körning godkände alla 579 tester men tog
23,22 sekunder. 23 detaljerade vytester för spelgrafik, planetundersidor och
forskningsdetaljer flyttas därför till `tests/extended/`, utan borttagning
eller ändrade testfall. De ingår fortsatt i CI:s begärda sluttest.
Spelregler, centrala användarflöden och de nya regressionstesterna för
`grupperade-transporthandelser` och `ett-meddelande-per-skeppsbygge` behålls
snabba. Därefter passerade 556 tester på 19,25 sekunder inklusive start.
20-sekundersgränsen är oförändrad.

## Sparade automatiska uppdrag

`automatisk-bargning`, `automatisk-rutttilldelning` och
`forskade-automatiska-order`: Fleet har ett valfritt automation-fält med
värdet salvage eller transport i befintlig sparversion 12. Saknat fält
behåller äldre beteende. Återläsningen validerar skeppstyp och oförenliga
uppdrag. Ingen sparning rensas. Tidigare aktiva Patrol- och Explore-order
får fortsätta; forskningskontrollen gäller nya order.

Game samordnar målval, SalvageOrder och vanlig Logistics-tilldelning.
Forskning kontrolleras i modellen samt visas i vyerna. Vyerna läser
ögonblicksbilder och skickar order genom controller. Order sparas efter
knapptryck. Nya ordertekniker är inga byggnadsalternativ. Den befintliga
rörelsebudgeten återanvänds utan extra steg vid byte mellan hämtning och
leverans.
