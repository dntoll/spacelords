# Tekniska krav och arbetsregler

## Beslut före implementation av Single fleet

`single-fleet-beslut-fore-implementation` är **Fullständigt implementerat**
som dokumenterad arbetsregel. Oklara delar av utforskningen `single_fleet`
ska diskuteras med användaren och uttryckligen låsas före berörd
spelimplementation. Agentförslag är inte beslut. Se
[planen och beslutslistan](single-fleet.md#plan-och-beslut-före-implementation).
Spelbeteendena är fortfarande **Ej implementerat**.

## Historiska engångsrensningar i Single fleet

`single-fleet-rensning`: de historiska engångsrensningarna
`engangsreset-terraformning` och `engangsreset-utokad-galax` har tagits bort.
Äldre avsnitt nedan beskriver historiken, inte aktuellt beteende. Även
`guard-routes`, `ombemanning-vid-stangd-farled` och
`automatisk-farledsbemanning` har tagits bort i denna utforskning.
Sparkompatibiliteten för den pågående omställningen är ännu inte färdig.

## Sparformat

`sparformat` (2026-11-21) är **Fullständigt implementerat**: `Game.restore`
laddar bara nuvarande format, version 17, och avvisar äldre versioner med
`This saved game cannot be loaded.` Övergångarna från äldre format är
borttagna efter uttryckligt beslut enligt `avstamning-sparkompatibilitet`.
Meningar nedan om hur äldre format läses beskriver hur de nuvarande fälten
kom till; de gäller inte längre som laddningsstöd.

## Stridens karta och kontroller, 2026-11-01

- `skuggad-manovervag`, `manoverval-vid-hexkant` och
  `animerad-skeppsforflyttning`: vyn får en oföränderlig följd av positioner
  och riktningar. Den ritar genomskinliga kopior utan att flytta modellen och
  interpolerar animationen mellan stegen. Val placeras vid respektive hexkant
  och hålls åtkomliga även när flera alternativ delar riktning.

- `hexmal-for-manover` och `overwatch-i-rymdstrid`: modellen lämnar lagliga
  manöveralternativ och lagrar valfritt reserverat vapen och skottrunda per
  skepp. Äldre sparningar utan dessa fält fortsätter fungera. Vyn äger
  förhandsvisningen; reaktionsskott prövas mot vanliga skottregler vid varje
  förflyttningssteg och sparas i manöverns uppspelningsunderlag.

- `fullskarms-stridskarta` och `skeppsnara-stridskontroller`: p5 ritar kartan;
  HTML lägger HUD och tillgängliga symbolknappar ovanpå. BattleMapView lämnar
  en oföränderlig kameraögonblicksbild. Samma projektion placerar kontrollerna
  runt ShipFootprint, med inåtfällning vid kanter och minst 44 pixlars tryckyta.
  Placeringen undviker andra synliga skrovs tryckytor där plats finns,
  även vid den nya minsta zoomnivån.
- `vapensymboler-i-strid` och `avfyra-pa-markerat-mal`: vyn håller tillfälligt
  vapen och mål. Avfyrning går som battle-command till controller och modell
  och kontrolleras mot TacticalBattle. Kamera- och avbrutna pekargester
  konsumerar trycket även sedan ett finger lämnat en nypgest.
- `begransad-stridskamera`: BattleCameraController hanterar kamera oberoende
  av p5 och spelmodellen. Minsta skala är den mindre av visningsytans
  bredd/kartbredd och höjd/karthöjd, så hela kartan ryms och minst en axel
  fylls. Detta ersätter tidigare minsta skala som fyllde båda axlarna.
  En axel där kartan ryms centreras; en större axels panorering begränsas
  till 24 pixlars kant utanför kartans omslutande rektangel.
  Resize bevarar världscentrum och begränsar skalan på nytt. Kameran sparas
  inte i speldata. Aktivering och position ändrar fokus; eld gör det inte.
- `fuskknapp-for-teststrid`: samma asteroidgenerering som ordinarie strider
  används. Startzonerna hålls fria. Sparformatet ändras inte.
- `snabb-testsvit`: fyra arbetstrådar återanvänds per testmiljö. Detta ersätter
  tre arbetstrådar för att hålla 20-sekundersgränsen med den utökade
  stridstäckningen. Samma tester behålls; tidsgränsen ändras inte.

## Autoaim och flerrutiga skrov, 2026-11-01

- `autoaim-med-manuellt-mal`: TacticalBattle lämnar läsfrågor för giltig
  träffhex och automatiskt målval. Befintliga regler för vapen, ammunition,
  räckvidd, båge och skottlinje avgör kandidaterna. Avstånd till närmaste
  träffbara skrovhex kommer först, därefter riktning och stabil skeppsidentitet.
  Vyn behåller endast tillfälligt sikte och målval och ändrar inte spelmodellen.
- `stora-skepp-over-flera-hex`: ShipFootprint är oberoende av p5 och beräknar
  alla skrovhex från mittposition, riktning och stridens storleksregel. Samma
  geometri används av utplacering, återläsning, förflyttning, sväng, AI,
  räckvidd, skydd, missilområde, klickval och rendering. Missilområdet
  grupperas per skeppsidentitet så att ett skrov inte skadas flera gånger.
- Nya BattleState sparar det valfria fältet largeShipFootprints: true.
  Saknat fält behåller den tidigare enhexgeometrin för pågående strider.
  Mittposition och sex riktningar behålls. Sparversionen ändras inte och
  inga sparningar rensas. Nya strider använder alltid den nya geometrin.
- `fuskknapp-for-teststrid`: teststriden använder samma utplaceringsfas och
  geometri som ordinarie strider. Transport ship och Colony ship ingår;
  inga sparplatser skrivs.

## Bordningsskydd och flyktzoner, 2026-11-07

- `pirater-skyddar-bordade-skepp`: TacticalBattle skiljer AI:s skottkandidater
  från modellens allmänna träffregler. Ett mål vars dockningspartner tillhör
  den automatiska sidan tas bort från direkta mål och områdessalvor som skulle
  träffa det. Upplåsning och avgjord bordning återställer vanligt målval.
- `flyktzoner-i-rymdstrid`: nya BattleState har det valfria fältet
  `escapeZones: true`. De sex zonerna härleds från kartans mittkolumn och dess
  grannar på första och sista raden och undantas från asteroidgenerering.
  BattleMapView ritar grön hex och engelsk `Escape`-text.
- Ett delvis utpasserat trehexskepp sparar valfritt `escapeEdge` på BattlePiece.
  Dess skrov får ligga delvis utanför just denna över- eller nederkant, men
  minst en skrovhex måste finnas kvar på kartan. Sväng, eld och dockning spärras;
  skeppet är fortsatt ett giltigt mål. När sista skrovhexen lämnar sätts vanlig
  `escaped`-status. Kontroller förankras mot den del av skrovet som ännu syns.
- Fälten är additiva och sparversion 14 behålls. Saknat `escapeZones` ger den
  äldre kortsideregeln för en redan pågående strid; inga sparplatser rensas.

## Händelsebilder och stridspresentation, 2026-11-01

- `bilder-i-events`: GameEvent får valfria oföränderliga EventLine-rader och
  typade EventIllustration-referenser. Domänmodellen lagrar inga bildadresser.
  Gemensam HTML-rendering väljer befintliga tillgångar för lista och annons.
  Ursprunglig text behålls. Dekorativa illustrationer läses inte dubbelt.
- `delproduktion-med-sammanhang`: huvudbeställning och komponentbehov hämtas
  från ComponentOrder före completeComponent. Färdiga reservationer räknas
  utan dubbelräkning av transporter. Kontexten sparas som historisk ögonblicksbild.
- `flottor-fore-planetdetaljer`: hexpanelen bygger separata flottdelar och
  planetdelar; planetens rubrik tillhör planetdelen.
- `animerade-stridsskott` och `skadepartiklar-i-strid`: TacticalBattle lämnar
  en typad BattleShot med avfyrningsposition, vapen, mål och skaderesultat.
  Controller samordnar effekten genom ett asynkront vygränssnitt och spärrar
  stridshandlingar under presentationen. P5-vyn använder högst 128 partiklar
  och beställer bildrutor bara medan effekten lever. Effekterna använder inte
  spelmodellens slumpgenerator. Vyavslut rensar bildrutor och väntande löften.
- Nya sparfält är valfria. Sparversionen behålls; äldre händelser och strider
  fungerar utan migrering eller rensning. Första renderingen spelar inte
  föregående BattleShot igen.

## Kartans prestanda

`responsiv-stjarnkarta` och `rumsligt-kartindex` är **Fullständigt implementerat**.
MasterController återanvänder senast presenterade läsmodell under ren navigation.
AppModel levererar en ny oföränderlig presentation utan att beräkna om
imperiets ekonomi. AppView uppdaterar kamera och byggvalens position;
GalaxyMapView samlar omritningar per bildruta och använder MapViewport
med binärsökning i sorterade hexrader. Indexet följer kartögonblicksbildens
identitet och innehåller bara redan tillåten kartkunskap. Domänmodellen
är oberoende av p5. Sparformat och galaxstorlek ändras inte.
Se [orsak, mätning och tester](map-performance.md).

## Direkta stridsorder

`skeppsval-startar-stridstur`: BattleView skickar aktiveringsavsikten från
ett uttryckligt skeppsval. MasterController samordnar modelländring och ny vy,
och AppModel sparar omedelbart. Rendering startar aldrig en aktivering.
Behöriga val kräver egen tur, oanvänt eget skepp och ingen pågående
aktivering. Domänens aktiveringsregler och sparformat är oförändrade.

`stridsorder-utan-mobilscroll`: primära kontroller ligger före kartan i DOM.
CSS placerar dem över kartan på stående mobil och bredvid på bredare skärmar.
Utfällbar information har separat rullning; orderpanelen behöver ingen
rullning. Regressionstester skyddar kart- och listval, spärrade val, omedelbar
sparning och återupptagen tur. Mobiltester mäter att alla order ryms i
320 × 568, 393 × 851 och 844 × 390 och att kartan fortfarande är synlig.

## Bordningsstrid

Kampanjbordning ägs av `TurnSimulation` via `BoardingEngagement`, samma plats
som `tacticalBattles`. `TacticalBattle` tar `dock`, låser paret och ritar
bryggan; `Game.commandBattle` / `commandBoarding` växlar på två-rundersskiftet.
`AppView` visar `BoardingView` när kampanjens `boardingBattle` finns och
`BattleView` annars. Sparformatet är `GameState.version` 14; piratflottor får
`transports` och `hold` additivt. Avbrutna rymdstrider utan boardingfält förblir
giltiga.

Boardingmodellen har egna frysta snapshots, typade kommandon, deterministiskt
slumptillstånd, kartparser, siktberäkning, pathfinding och AI. Kartdefinitionen
är en rå lagerindelad textresurs per skeppstyp; `BoardingComposer` lägger två
skrov och en brygga i samma koordinatsystem. `dockning-sida-vid-sida`:
`composeBoardingInteriors` vänder ett skepp upp och ned när dess airlock
vetter bort, och bildens `flipAboutY` vänder skeppsbilden kring samma linje.
Avståndet växer så att inga kolumner överlappar. Kartreglerna
(`src/shared/boarding/map-rules.ts`) delas av editor, composer och tester.
`avbryt-gammal-bordning-vid-laddning`: `SavedBoardingEngagement.layout` är
`side-by-side`; en sparad bordning utan fältet avslutas som `aborted` och
`Game` frikopplar skeppen direkt vid laddning. Sparversionen är oförändrad.
`testbordning-med-tva-skepp`: `BoardingBattleState.test` anger det valda
skeppet, och `boardingMapForState` bygger om samma karta. Testreglerna
(Bridge, Engineering och reaktorn) gäller bara det bordade skeppet.
`landgang-med-bordningsstart`: längden sparas additivt i stridens snapshot;
saknas fältet används sex rutor för att bevara äldre pågående bordningar.

AppModel äger fortfarande den fristående testsessionen från huvudmenyn.
`boarding-command` samordnas av MasterController och en separat
`BoardingView`; vyn får bara läsa snapshot och skicka intents. AP-färgad
vägvisning beräknas ur pathfinding utan att mutera striden. Stegvis gång är
presentation: modellen samlar synliga rutor efter varje vändning och steg för
spelaren och för synliga försvarare och civilister, och vyn animerar mellan
dem. Vyn köar en ny presentation medan en animation pågår så att AI-steg inte
avbryter den. En presentation som redan visats till slutläget spelas inte om.
Kampanjbordning skapar `BoardingMapView` med den sammansatta kartan. En ny
fiende i sidans sikt avbryter resterande steg i samma kommando. Synfältet är 180 grader (cosinus 0 mot siktlinjen). Personer
blockerar inte sikt men blockerar skottlinjer; döda och utslagna upptar inte
rutan för skott eller förflyttning. Overwatch avfyras bara när
skottet är fritt. Sikt- och eldrutor för den aktiva spelarsoldaten beräknas i
modellen och ritas som kanter i vyn. Skottanimation
är presentation separat från snapshot. Andra klicket på vald destination
skickar `move`; andra klicket på en angränsande vald dörr skickar `door` eller
`hack`.
Byte av egen soldat sker med kommandot `select` och sparar kvarvarande AP. P5-kartan använder
instance mode och innehåller ingen domänmutation. Golvgrafik är kvadratiska
yttexturer; vyn äger den klassiska 2:1-projektionen och lägger texturen affint
på rutans exakta diamant. Genererad eller målad grafik ska därför vara
ovanifrån-ytor, inte färdiga isometriska diamanter. Väggar använder en lång
fasadtextur; vyn klipper ut en ruta i taget längs en sammanhängande q- eller
r-sträcka och lägger utklippet affint på blockets synliga sidor. `Half cover`
är visuellt hälften så hög som en vägg. Testsessionen från menyn får inte anropa
SaveRepository eller ändra kampanjens `TacticalBattle`, `TurnSimulation` eller
sparplatser.

Snabba kravnamngivna tester skyddar parser, AP, initiativ, sikt, strid,
miljöobjekt, effekter och AI med deterministisk slump. Jsdom-tester skyddar
intentgränsen. Ett riktat Playwright-scenario ingår i snabb mobilkontroll och
verifierar även att localStorage förblir oförändrad. Se
[bordningsstrid](boarding/boarding-combat.md).

## Skeppsbildernas riktning i strid

`skeppets-framat-foljer-spriten`: BattleMapView utgår från att samtliga
skeppsbilder har nosen åt höger, precis som på Star map. Samma rotation
används för bild, framåtmarkering och reservtriangel. Regressionstest av
ritanrop jämför nos och markering med faktisk Forward-förflyttning för varje
skeppstyp i sex riktningar samt kontrollerar eldbågens mittlinje.
Riktat mobilflöde verifierar skott, framåtförflyttning och omladdning.
Modellens riktningar och sparformat ändras inte.

## Färger för forskningsstatus

`forskningsstatus-med-tydliga-farger`: befintlig status i forskningsträdets
läsmodell styr CSS-färgerna. Valets genomskinliga knapp bevarar nodens
statusfärg. Enhetstest skyddar skillnaden mellan färdig forskning, köstatus
och okänd teknik. Riktade mobiltester kontrollerar verkliga renderade färger
före och efter val i Chromium och WebKit. Inga modell- eller sparändringar.

## Genererade symboler och kartbilder

`genererade-symboler-och-kartbilder`: 31 separata transparenta PNG-original
sparas under `assets/original/` med bildpromptpaketets filnamn. Använda
prompter bevaras och manifestet uppdateras per fil. Kontrollera antal, filformat,
alpha, fria kanter och unika filnamn automatiskt; granska motiv, ljusriktning
och symbolernas läsbarhet visuellt. Se [bildleveransen](generated-map-artwork.md).

`spelgrafik-symboler`: CatalogControls ger varje identifierad teknik en
dekorativ SVG-symbol i trädet, kön och detaljerna. Byggnadssymbolerna och
byggnadsporträtten är borttagna med fabrikerna (`single-fleet-rensning`).

`spelgrafik-planeter`: Galaxy lämnar planetens miljö i frysta, utforskade
kartobjekt. Okända planeter lämnas fortsatt bort. PlanetImages delas av
HTML-illustrationer, alla fyra kartvyer och sparförhandsvisning. MapArtwork
laddar bilder en gång per kartinstans och ignorerar svar efter dispose.

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
`dragbara-koer` använder QueueView för forskningskön.
Vyn förhandsvisar ordningen och skickar controller-intent först vid släpp.
Pointer capture och dokumentlyssnare hanterar släpp utanför listan.

`skeppssprites-pa-kartan` delar ShipImages-registret mellan HTML och p5.
FleetMapLayout beräknar bildpositioner och träffgräns; bilder laddas en gång.
`forskningskamerans-granser` beräknar minzoom och offsetgränser i modellen
från aktuellt träd och viewport. Alla inmatningssätt använder samma modell.
`planetinformation-pa-kartan` använder en fryst läsmodell som kontrollerar
utforskning innan planetfakta hämtas. `bildpromptpaket` har ett granskningsbart
manifest med referenser, användning och filnamn.

## Kompakta vyer, 2026-10-27

`dragbara-flottorder`: FleetOrderDrag använder pekarhändelser endast för vänster
musknapp. Sex pixlars horisontell rörelse startar dragning och pekarfångst;
efterföljande klick stoppas före orderknappen eller ruttmenyn. Touch använder
fortsatt webbläsarens inbyggda scroll. AppView bevarar scrollLeft per flott-ID
vid omrendering. Träffytorna är fortsatt minst 44 × 44 px.

`kompakt-forskningstrad`: ResearchTreeLayout och CSS använder 108 × 36 px,
24 px horisontellt mellanrum och minst 12 px vertikalt. Layouten undviker
överlapp även vid delade förkunskaper. Pilar och kameragränser delar måtten.
Den synliga nodtiteln använder högst två rader. Full teknikidentitet behålls i intent, dataattribut, aria-label och
detaljpanelen. aria-description och title visar status. Noderna använder olika
bakgrundsfärger; färdiga visar ✓, pågående ▶ och köade sin köposition.
`forskningens-avslojande` härleds från färdig och köad forskning
samt att alla förkunskaper är färdiga. Anonyma rutor visar inga avslöjande
namn, bilder eller tillgänglighetstexter.

`forskningsdetaljer-vid-val`: AppModel äger sessionsbundet inspectedResearch,
skilt från aktiv forskning. Intent inspect-research går via MasterController.
Detaljer visas i en fast HTML-del utanför trädets kamera. Vid högst 640 px bredd
ligger den under trädet och använder högst 32 procent av panelhöjden och 88 px;
annars ligger den bredvid. En 32 px hög Research-knapp med innehållsbredd ligger
bredvid rubriken. Beskrivning och samlad metadata följer direkt under och rullas
separat vid behov. En tom detaljdel behåller samma yta utan val. AppView uppdaterar
detaljer och valmarkering utan att ersätta trädets pekarmål. Research queue
ligger ovanpå trädytan och kan visas samtidigt. DiagramNavigation skiljer klick
från dragning och pinch.
AppView bevarar kamera, köläge och relevant fokus genom omrenderingar.

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

## Aktuell sikt och teleskop

`snabb-testsvit`: efter en avbruten körning över 20 sekunder flyttades 44
presentationstester för Research, planetöversikt, kartval och flottfokus till
`tests/extended/`. De kördes separat och godkändes. Snabbsviten behåller alla nya
sikt- och teleskopregler samt centrala användarflöden: 447 tester på 9,97 sekunder
inklusive verktygsstart vid verifieringen. Tidsgränsen är oförändrad.

`aktuell-detektionssikt` beräknas p5-oberoende av Detection utifrån
flottornas monterade teleskop. MapCell skiljer `explored` från `visible`.
Game filtrerar pirater innan oföränderliga läsdata lämnas till vyerna; träffprovning
och informationspaneler använder samma filtrerade data. Sparplatskartan visar
utforskning, inte bara aktuell sikt. Synfältskanten ritas i p5 instance mode.

Sparformatet bevarar teleskop och piratkontakter. Upptäckter kan pausas och
laddas om före finishTurn utan upprepad rörelse.

## Flottkort och namn på Star map

AppModel håller ett oföränderligt, tillfälligt namnutkast. MasterController
samordnar redigering, validering och sparning genom befintliga Game-kommandon.
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
hexval, avbrott, namnredigering, fokus, destinationsval, kameracentrering
och sparade spel.
fleet-map-overflow verifierar 25 flottor på samma hex, begränsad
skeppsförhandsvisning och åtkomligt flottval på alla skärmprofiler.
Webbläsartesterna följer hela kartflödet i Chromium och WebKit och provar
native touch i mobil Chromium. Befintliga flott- och sparplatstester behåller skyddet för spelreglerna. Båda testsviterna omfattas
fortsatt av befintlig GitHub CI.

## Tekniska krav

| Kravnamn                         | Status                     | Krav                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Verifiering                                                                                       |
| -------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `typescript-projekt`             | Fullständigt implementerat | Node.js-projekt med strikt TypeScript för server och klient. Använd Node.js 26 (LTS); detta ersätter Node.js 24.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `npm run typecheck`, `npm run build`                                                              |
| `enkel-utvecklingsstart`         | Fullständigt implementerat | Ett kommando startar klientens utvecklingsserver och servern med automatisk omladdning. Dokumentera installation, adresser och felsökning.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `npm run dev`, lokal startkontroll                                                                |
| `produktionsstart`               | Fullständigt implementerat | Byggd klient och server kan köras tillsammans utan utvecklingsverktyg.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Utökade HTTP-tester mot byggd server                                                              |
| `serverstatus`                   | Fullständigt implementerat | Servern erbjuder en enkel statuskontroll utan verksamhetsfunktioner. Okända API-adresser ger 404.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Enhetstest av statusmodell/controller och utökat HTTP-test                                        |
| `rena-gitfiler`                  | Fullständigt implementerat | Ignorera beroenden, byggresultat, testresultat, lokala inställningar och hemligheter. Checka in låsfil och ofarligt miljöexempel.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `.gitignore`, `git status`, `git check-ignore`                                                    |
| `lasbara-kravnamn`               | Fullständigt implementerat | Ge varje krav ett stabilt, unikt och läsbart namn. Använd samma namn i tester, docs och relevanta kodkommentarer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Kravgranskning och namngivna tester                                                               |
| `separerade-kravlistor`          | Fullständigt implementerat | Börja rotöversikten med vision och kravkategorier. Håll produktkrav korta och otekniska. Lista tekniska krav separat och flytta växande detaljer till `docs/`. Dokumentera alla krav och ifrågasätt motsägelser.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Dokumentationsgranskning, `AGENTS.md`                                                             |
| `meningsfulla-tester`            | Fullständigt implementerat | Knyt beteendekrav till enhetstester som skyddar mot felkategorier. Använd andra relevanta kontroller för verktygs- och processkrav.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Kravkopplingen nedan och kodgranskning                                                            |
| `snabb-testsvit`                 | Fullständigt implementerat | Kör alla Vitest-tester utom `tests/integration` i en svit utan total tidsgräns. Detta ersätter riktvärdet 20 sekunder och regeln att flytta långsammare Vitest-tester till den utökade sviten. Ett enskilt test avbryts efter 15 sekunder.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `npm test`                                                                                        |
| `utokad-testsvit`                | Fullständigt implementerat | Ha en separat lokal svit för HTTP-integration och Playwright mot produktionsbygget. Vitest-enhetstester ingår inte. Ett webbläsarfall tar högst 30 sekunder och ett långt spelscenario högst 180 sekunder i Chromium; gränserna gäller en ensam körning, och med sex arbetstrådar får Chromium 1,5 gånger och telefon WebKit tre gånger så lång tid. Steget får ta högst 60 minuter. GitHub startar inte sviten.                                                                                                                                                                                                                                                                                                                                                                                                                          | `npm run test:extended`                                                                           |
| `tester-i-github`                | Fullständigt implementerat | Kör snabbkontroller och Pages-bygge vid push till `main` och `development`. Arbetsbranchar och pull requests startar inget. Playwright körs i releaseflödet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `.github/workflows/ci.yml`, `npm run check` lokalt                                                |
| `regressionstest-forst`          | Fullständigt implementerat | Reproducera buggar med ett misslyckat test före rättningen. Skriv även tester först för annan implementation när lämpligt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Commit- och arbetsgranskning                                                                      |
| `mvc-arkitektur`                 | Delvis implementerat       | Använd MVC på server och klient. En master-controller tar emot domänfakta och är den enda som byter fall. Use-case-controllers anropar bara sin modell-facad. Vyer läser modellen, lämnar domänfakta och ändrar den inte. Stjärnkartans pekhändelser översätts fortfarande i mastern.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Enhets- och typkontroll, arkitekturgranskning                                                     |
| `app-skal`                       | Fullständigt implementerat | Klienten består av app-skalet `src/client/app/`, den generiska `src/client/common/` och spelmodulerna `space-map`, `space-battle` och `boarding`. Skalet (`MasterController`, `AppModel`, `AppView`, `ViewContracts`, `PlayerNotice`, `playerNoticeText`) importerar modulerna bara via deras `{models,views,controllers}/index.js`. `common/` (`dom`, `HexCoordinate`) importerar inget utanför sig själv. En modul får utanför sig själv nå `AppModel`, `ViewContracts`, `common/` och andra modulers `models`- och `views`-index. Varje moduls extra undantag står i `featureModules`. Detta ersätter regeln om en underkatalog per fall direkt under `src/client/{controllers,models,views}`; fallen ligger nu i modulerna. `AppModel` och `AppView` innehåller fortfarande stjärnkartelogik som kan flyttas till `space-map` senare. | ESLint `no-restricted-imports` i `eslint.config.mjs`, `npm run lint`                              |
| `isolerad-rymdkartmodul`         | Fullständigt implementerat | Stjärnkartespelet är modulen `src/client/space-map/` med `controllers/`, `models/`, `views/`, `assets/` och `storage/`, ett fall per underkatalog. Turordning och händelser ligger i fallet `turn`. Testerna ligger i `tests/space-map/{unit,extended,browser}/`; dokumentationen ligger kvar i `docs/`. Utöver det gemensamma får modulen använda `PlayerNotice`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | ESLint `no-restricted-imports` i `eslint.config.mjs`, `npm run lint`                              |
| `isolerad-rymdstridsmodul`       | Fullständigt implementerat | Rymdstriden (`Battle`) är modulen `src/client/space-battle/` med `controllers/`, `models/`, `views/` och `assets/`. Den rymmer `TacticalBattle`, `Docking`, manövrer och skeppsavtryck. Testerna ligger i `tests/space-battle/{unit,extended,browser}/`. `ShipType`, `ShipImages` och `ShipView` hämtas via `space-map`-index. `FleetCombat`, stjärnkartans automatiska stridsresultat, hör till `space-map`.                                                                                                                                                                                                                                                                                                                                                                                                                             | ESLint `no-restricted-imports` i `eslint.config.mjs`, `npm run lint`                              |
| `isolerad-bordningsmodul`        | Fullständigt implementerat | Bordningen är modulen `src/client/boarding/` med `controllers/`, `models/{battle,editor,map}/`, `views/{battle,editor,rendering}/`, `assets/` och `maps/`. Serverns kart-API ligger i `src/server/boarding/`, kartformatet i `src/shared/boarding/` och testerna i `tests/boarding/{unit,extended,browser}/`. Utöver det gemensamma får modulen använda `playerNoticeText` och `src/shared/boarding/`.                                                                                                                                                                                                                                                                                                                                                                                                                                    | ESLint `no-restricted-imports` i `eslint.config.mjs`, `npm run lint`                              |
| `arkitekturkarta`                | Fullständigt implementerat | En hierarkisk kodkarta i PlantUML i `docs/architecture/`: `overview.puml` visar app-skal, `common/`, moduler, `src/shared` och server med faktiska importer, och en fil per modul visar fallen, deras lager, publika index-yta och beroenden. `scripts/architecture-map.mjs` genererar kartan från `architecture.config.mjs` och importerna; samma lista styr ESLint-gränserna. Agenter läser kartan före strukturella ändringar och kör `npm run architecture:map` efter dem.                                                                                                                                                                                                                                                                                                                                                            | `tests/tooling/architecture-map.test.mjs` i `npm run test:tooling`                                |
| `master-controller`              | Fullständigt implementerat | En master tar emot avsikter, delegerar till rätt use-case-controller och är den enda som byter fall. Pågående år samordnas här.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Enhetstest `master-controller`, arkitekturgranskning                                              |
| `use-case-controller`            | Fullständigt implementerat | Star map, Research, Fleets, Production, Turn, Saves, Battle, Boarding och den lokala karteditorn har varsin controller. Den känner inte till DOM eller p5. HTTP mot `/api/boarding-maps` stannar i editorkontrollern.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Enhetstest `use-case-controller`                                                                  |
| `lokal-bordningskarteditor`      | Fullständigt implementerat | `GET` och `PUT` för bordningskartor kopplas in före API:ts 404-svar. JSON-tolkning gäller bara skrivningen. Katalogen hämtas endast i den lokala servermiljön; det statiska Pages-bygget anropar inte det lokala API:t. Knappen `Ship layouts` visas bara när katalogsvaret har minst en karta. En sparning behåller `[lights]` och övriga lager.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Enhetstester `lokal-bordningskarteditor`, utökat HTTP-test och mobiltest `snabb-mobilpublicering` |
| `isometrisk-bordningskarteditor` | Fullständigt implementerat | Editorns `Isometric` använder bordningsstridens projektion, golv- och väggtexturer och upphöjda barriärer. `Top-down` används för spritejustering. Penslar, storlek, undo och spara fungerar i båda vyerna.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Enhetstest `isometrisk-bordningskarteditor`                                                       |
| `modell-facad`                   | Fullständigt implementerat | Varje fall har en facad som är enda vägen in och bara visar det fallet får läsa och ändra. Ett fall öppnar inte ett annat.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Enhetstest `modell-facad`                                                                         |
| `vy-plattformsgrans`             | Delvis implementerat       | Vyn äger DOM, p5 och kamera och kan ha en inre kameracontroller. Forskningsträdets pekning blir pan och zoom i vyn. Stjärnkartans pekning översätts fortfarande i mastern, eftersom flottval, destinationer och hexval möts där. Bordning och strid ritas per bildruta. Övriga vyer ritas när något synligt ändrats.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Enhetstest `vy-plattformsgrans`, kartans `noLoop`                                                 |
| `speltexter-i-vy`                | Fullständigt implementerat | Fel, bekräftelser och upptäcktsbesked är strukturerade utfall. Vyn väljer meningen. Utfallet skrivs inte in i sparningen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Enhetstest `speltexter-i-vy` och vytester av formuleringen                                        |
| `plantuml-domanmodell`           | Fullständigt implementerat | Underhåll problemdomänens klasser och relationer i PlantUML. Lägg till domänbegrepp först när krav motiverar dem.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `docs/domain-model.puml`, domängranskning                                                         |
| `branches-och-commits`           | Fullständigt implementerat | Arbeta på branches och gör regelbundna commits med tydliga meddelanden. Varje agent använder eget branchprefix, exempelvis `codex/` och `claude/`. Branchstrategin i övrigt ska diskuteras på nytt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Git-historik och arbetsregler                                                                     |
| `agentoberoende-arbetsregler`    | Fullständigt implementerat | `AGENTS.md` är gemensam källa för arbetsreglerna så att olika agenter och verktyg kan utvärderas och jämföras. Agentspecifika filer, som `CLAUDE.md`, hänvisar dit utan egna kopior.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `CLAUDE.md`, `AGENTS.md`                                                                          |
| `typescript-lintning`            | Fullständigt implementerat | Använd ESLint med typescript-eslint och meningsfull typmedveten kontroll. Undanta genererade bygg-, täcknings- och browserresultat från källkodsgranskningen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `npm run lint`                                                                                    |
| `lasbar-kod`                     | Fullständigt implementerat | Använd tydlig namngivning och Clean Code. Kommentarer förklarar motiv, begränsningar och kravkopplingar utan att upprepa koden. Håll formatering konsekvent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Kodgranskning och `npm run format:check`                                                          |

## Koppling mellan beteendekrav och tester

- `engangsreset-ekonomi`: **Fullständigt implementerat**. Den tidigare leveransen
  av ekonomiversion 2 raderade de tre äldre version 1-sparplatserna efter uttryckligt användarbeslut.
  Version 2 använder egna nycklar och återställs inte vid omladdning.
  Framtida formatändringar kräver bevarande eller nytt uttryckligt beslut.

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
- `mvc-arkitektur`: enhetstest verifierar att modellens läsdata inte kan ändras
  utifrån. Typkontrollen begränsar vyn till modellens läsgränssnitt.
  `master-controller`, `use-case-controller` och `modell-facad` skyddar att ett
  fall inte öppnar ett annat och att facaden saknar de andra fallens kommandon.
  `speltexter-i-vy` skyddar att ett utfall inte bär visningstext; vyn låser
  formuleringen. Forskningsträdets pekning blir pan och zoom i vyn.
  Stjärnkartans pekhändelser går fortfarande till mastern.
- `serverstatus`: enhetstest verifierar statusmodell och controller oberoende av
  HTTP; integrationstest verifierar routning, JSON och okända API-adresser.
- `produktionsstart`: integrationstest verifierar att byggd startsida och dess
  faktiska JavaScript- och CSS-filer går att hämta med rätt innehållstyp.

- `kartflottor`, `flottval-pa-kartan`, `dra-flottdestination` och
  `vald-flotta-visar-destinationspil`: gemensam
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
  flottkartan. Skeppsöverföring mellan flottor är borttagen
  (`single-fleet-rensning`). Browsertester verifierar riktig bildladdning,
  gemensamt kameraläge och rörelse på flottkartan.
  Se [skeppsgrafik](ship-artwork.md) för original, friläggning och webbversioner.
  `tomma-flottor-utan-position` gör flottans position valfri i domänmodellen.
  En flotta utan skepp saknar position och färdorder.

Processkrav kan inte bevisas med meningsfulla enhetstester. De följs upp genom
verktygskontroller, CI och granskning enligt tabellen.

## Driftsättning

| Kravnamn                         | Status                     | Krav                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Verifiering                                                                         |
| -------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `pages-underkatalog`             | Fullständigt implementerat | Klienten ska kunna publiceras som statiska filer i `spacelords/` i `dntoll/dntoll.github.io`, på `https://curiousengineerstudio.se/spacelords/`. Alla klientresurser använder rätt basadress. Node-servern ingår inte i Pages-driften.                                                                                                                                                                                                                                | `npm run build:pages`, integrationstestet `pages-underkatalog` i den utökade sviten |
| `bevara-befintlig-webbplats`     | Fullständigt implementerat | En driftsättning får endast ändra `spacelords/`. Bevara andra projekt, startsidan, navigationen, rotfiler, domän och befintlig Pages-konfiguration. Undvik samtidighetskonflikter med andra publiceringar.                                                                                                                                                                                                                                                            | Avgränsad diff i målrepot och kontroll före/efter publicering enligt instruktionen  |
| `hemlighetsfri-publicering`      | Fullständigt implementerat | Båda repona och byggresultatet är publika. Publicera inga hemligheter i filer, byggvariabler eller loggar. Eventuell framtida CI-autentisering hålls separat från källkod och klientbygge.                                                                                                                                                                                                                                                                            | Granskning av bygginnehåll, staged diff och eventuell framtida CI-konfiguration     |
| `dokumenterad-driftsattning`     | Fullständigt implementerat | Bevara en verifierbar instruktion för bygge, avgränsad publicering, kontroll och återställning. Normalläget automatiserar lokal publicering; CI publicerar inget.                                                                                                                                                                                                                                                                                                     | `docs/deployment.md` och hänvisning i `AGENTS.md`                                   |
| `gemensam-startpunkt`            | Delvis implementerat       | Allt arbete finns på origin. Nytt arbete utgår från `origin/development` via `work:start`. Publicering och merge vägras från en branch som saknar senaste `origin/development`, eller `origin/main` för en release. Återstår: provkörning på alla tre datorer.                                                                                                                                                                                                        | Verktygstester `gemensam-startpunkt`                                                |
| `integrationsbranch-development` | Delvis implementerat       | `work:merge` kör snabbkontrollerna, skapar en `--no-ff`-merge med arbetsbranchens testade träd, pushar arbetsbranch och `development` atomiskt och publicerar `development`. Återstår: skapa `development` på origin och provpublicera.                                                                                                                                                                                                                               | Verktygstester `integrationsbranch-development`                                     |
| `release-till-main`              | Delvis implementerat       | `release:start` skapar `release/<datum>` från `development`. `npm run check` registrerar godkänd hel svit för en ren revision. `release:finish` flyttar `main` med fast-forward bara till den revisionen och mergar releasen tillbaka till `development`. Ersätter `sluttest-fore-merge`. Återstår: första release på molndatorn.                                                                                                                                     | Verktygstester `release-till-main`                                                  |
| `synlig-byggversion`             | Delvis implementerat       | Bygget bäddar in branch, revision och byggtid. `Saved games` och tooltipen på `SPACELORDS` visar dem, och `deployment.json` anger branch. Återstår: provpublicering.                                                                                                                                                                                                                                                                                                  | Enhetstester `synlig-byggversion`                                                   |
| `branchoversikt`                 | Fullständigt implementerat | `branches:status` visar osläppta commits i `development` och branchar på origin med commits som saknas i `development`.                                                                                                                                                                                                                                                                                                                                               | Verktygstest `branchoversikt`                                                       |
| `utforskningsbranch`             | Delvis implementerat       | En utforskningsbranch bär `exploration.json`. `work:start --from` startar arbete från den, `work:merge` och `deploy:quick` använder den som bas och mål, och `work:merge` vägrar merga utforskningen själv till `development`. Att ta bort markören på en arbetsbranch är beslutet att merga. `branches:status` listar utforskningar separat. Ersätter för dessa branchar regeln att allt utgår från och mergas till `development`. Återstår: provkörning mot origin. | Verktygstester `utforskningsbranch`                                                 |

Produktkravet `direktatkomst-utan-lankar` verifieras genom att driftsättningsdiffen
bara omfattar appens egen katalog. Startsida och navigation ska inte ändras.
Inga konstlade enhetstester behövs för en dokumenterad publiceringsprocess.

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
startplanet, forskning, flottor med färdriktning, utforskade hexagoner, händelser, år och fas.
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

- `handelser` och `arsrundor-och-order`: domänmodellen publicerar händelser när
  de inträffar; ankomst registreras exakt en gång. Livefaserna är planning, simulating och interrupted. Äldre sparad summary läses som planning och gamla steghändelser
  filtreras bort. Konsolen läser oföränderliga händelser, visar ett begränsat historikfönster
  utan att klippa senaste året och rullas enligt `senaste-aret-i-events`.
  Händelsehistoriken sparas i sin helhet. Tester skyddar fasväxling, ordning,
  ankomst, sparkompatibilitet, tillgänglig logg och små skärmar.

2026-10-21: `utokad-testsvit` får 20 minuters jobbtid i GitHub CI. Den tidigare
tiominutersgränsen avbröt körningen utan testfel efter att installation,
byggen och delar av de fyra webbläsarprofilerna passerat. Ändringen gäller
hela CI-jobbet; `snabb-testsvit` behåller sin gräns på 20 sekunder.

2026-11-11: Ett webbläsarfall tar högst 30 sekunder. Årskedjor som mättes över
den tiden tar högst 90 sekunder. CI-jobbets 20 minuter behålls och är inte ett
takt per fall. När ett stegs tidsgräns slår till avslutas hela processträdet,
så att förhandsvisningen inte blir kvar på porten.

2026-11-14: `utokad-testsvit` ändrades på användarens begäran. Telefon WebKit
är ungefär tre gånger långsammare än Chromium på Windows, och hela Playwright-
körningen på tre plattformar tar omkring 25 minuter. Ett långt spelscenario får
högst 180 sekunder i Chromium, med sex arbetstrådar får Chromium 1,5 gånger och telefon WebKit tre gånger varje gräns, och det
lokala steget får 60 minuter. Detta ersätter 90 sekunder per årskedja och 20
minuter per steg.

2026-11-11: `snabb-testsvit` har ingen total tidsgräns och omfattar
`tests/unit` och `tests/extended`. Detta ersätter riktvärdet 20 sekunder och
regeln att flytta Vitest-tester till den utökade sviten. `utokad-testsvit`
behåller HTTP-integration och Playwright.

2026-11-11: `snabb-mobilpublicering` väntar på Pages och lämnar den manuella
testen till användaren. Detta ersätter livejämförelse av publicerade filer och
Playwright i driftsättningen. Playwright ligger kvar i `utokad-testsvit`.

2026-11-11: `browserverifiering` kör telefon Chromium, dator Chromium och telefon
WebKit med sex arbetstrådar. Surfplatta WebKit väntar tills fler plattformar
väljs. Detta ersätter de fyra profilerna och två arbetstrådar. Produktmålet
att spelet ska gå att använda på surfplatta ligger kvar.

- `fokuserat-kartval`: enhetstester kontrollerar växlingen mellan tomma
  rutor, himlakroppar och flottor samt rundknappens indata och spärr under
  simulering. Webbläsartester kontrollerar nedre panelens utrymme och att
  Events och End turn går att använda utan sidscroll på telefon och i
  liggande format.

- `forskningstradets-utrymme`: enhetstester skyddar borttagna zoomkontroller och öppen kö vid orderändringar. Webbläsartester
  kontrollerar trädets tillgängliga yta i stående och liggande format,
  oförändrad trädyta när kön öppnas samt pinch, mushjul och tangentbord.

## Sparkompatibilitet och flottkort

`avstamning-sparkompatibilitet`: framtida inkompatibla ändringar av sparade
spel stäms av med användaren. Sparformatet är version 18 enligt
`sparformat`; äldre versioner avvisas.

`kompakta-flottkort` behåller fyra skepp per rad även när flera flottkort delar
kartpanelen på dator eller surfplatta. Skeppsknapparnas bredd anpassas till
radens utrymme mellan 44 och 60 px; träffytorna behålls. En effektiv fart visas
för hela flottan; Engines & speed tas bort från flottkorten enligt ändringen
2026-10-25. Standardkort med fyra skepp och stängda menyer är högst 140 px
höga vid minst 220 px kortbredd. Webbläsarregressionen verifierar radantal, korthöjd och
kontrollernas träffytor.

`senaste-aret-i-events` bevarar konsolen ansluten när vyn renderas om. Nya poster rullar listan till slutet. Läsposition mellan vyer
bevaras bara när samma poster visas. `utvikbara-events` använder HTML details/summary och
tillfälligt presentationstillstånd i AppView. Utfällning rullar till senaste
händelserna. Höjd begränsas av sidans och skärmens utrymme, med intern scroll.
Research behålls under startTurn.

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

`snabb-testsvit`: sviten behåller spelregler, sparning, rörelse och centrala
användarflöden. De detaljerade ritlager-, kontrast-, streckmönster- och
Research-layoutkontrollerna ligger kvar i `tests/extended/` och körs i samma
svit. Inga tester tas bort.

## Stegvis simulering och upptäcktsavbrott

`upptacktsavbrott`, `stjarnupptackt-utan-avbrott`,
`order-under-upptacktsavbrott` och `spara-avbrutet-ar`:
Game äger en TurnSimulation med återstående rörelse, upptäckter och en markering
för uppskjuten stridsbehandling. Utforskade stjärnor loggas men ingår inte i
avbrottets Handle/Ignore. Controller begär nästa TurnFrame, animerar
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

`forskningstradets-utrymme`: trädet fyller ytan; native
touch-regressionen kontrollerar både tillgänglig höjd och zoom/panorering.

`symbolbaserade-kataloger`: återgång från detaljer bevarar vald posts
fokus även när WebKit släpper fokus före Back-handlingen. Vyn sparar
återgångsmålet från indata, oberoende av webbläsarens aktiva element.
Regressionstestet verifierar förlorat fokus före klicket.

## Uppspelning av avslutat år

`end-turn-vid-kartval`, `sekventiella-arshandelser`, `handelser-pa-kartan`
och ändringen av `senaste-aret-i-events` är **Fullständigt implementerat**.
AppModel äger ett separat EventPlayback med frysta ögonblicksbilder.
MasterController driver de automatiska stegen och städar timern vid dispose.
Vyer skickar intents och ändrar aldrig modellen. Under presentationen spärras
andra spelhandlingar. Kontrollmenyn med Pause/Play, Next och Skip är borttagen.
Detta ersätter den tidigare timern på 1,5 sekunder och dess kontroll-intents.

Simuleringen avslutas och sparas innan uppspelningen börjar. Spelregler,
årsnummer och ekonomi ändras inte av uppspelningen. Den är sessionsbunden
och återupptas inte efter omladdning; den fullständiga senaste årsloggen visas
i stället. Upptäckts- och stridsavbrott behåller befintlig sparning och
fortsättning; en återläst avbruten runda får sin normala uppspelning vid avslut.

GameEvent får valfria frysta q/r-koordinater vid händelsens uppkomst. Händelsepositionen beror inte på ett senare objekts position
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

## Flottpresentation och händelseannonsering

### Geografisk ordning

TurnMovementPlayback lägger varje synligt spår i en egen grupp och sorterar
grupperna geografiskt efter startplatsen, från vänster till höger och vid
samma horisontella läge nerifrån och upp (`geografisk-arsuppspelning`). Den
samtidiga presentationen av autonoma flottor är borttagen med de automatiska
orderna (`single-fleet-rensning`). AppModel lämnar frysta turnMovements till
vyerna; sikt uppdateras när markören passerar hexkanten. Destinationspilar
begränsas till flottan som rör sig och till vald flotta, och döljs under
händelser. Kameran står stilla under färden. Domänmodell och sparformat
ändras inte.

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

MasterController inväntar kamerafaserna före skeppets första rörelsesteg.
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

## Snabbsvitens utrymme 2026-10-30

`snabb-testsvit`: en diagnostisk körning godkände alla 579 tester men tog
23,22 sekunder. 23 detaljerade vytester för spelgrafik, planetundersidor och
forskningsdetaljer flyttas därför till `tests/extended/`, utan borttagning
eller ändrade testfall. De ingår fortsatt i CI:s begärda sluttest.
Spelregler, centrala användarflöden och de nya regressionstesterna för
`grupperade-transporthandelser` och `ett-meddelande-per-skeppsbygge` behålls
snabba. Därefter passerade 556 tester på 19,25 sekunder inklusive start.
20-sekundersgränsen är oförändrad.

## Taktisk strid och sparkompatibilitet

`taktisk-stridskarta`, `gemensamt-stridsdeltagande` och
`sparad-taktisk-strid`: TacticalBattle håller regler, individuella skepp,
D6-slump och fiendebeslut oberoende av p5 och DOM. Game upptäcker samtidiga
möten och tillämpar varje resultat exakt en gång före fortsatt årssimulering.
Controller samordnar sparning och fiendens aktivering. BattleView använder
frysta läsmodeller och skickar kommandon; BattleMapView använder p5 i instance mode.

Sparversion 14 lägger till piratlastfartyg, `hold` och `BoardingEngagement`
additivt. Version 13 och äldre läses utan rensning.

Sparversion 13 utökar tidigare format med strider, möteskö, tidigare
flottpositioner och pausade transportorder. Utplacering, skrov, ammunition,
riktning, använd aktivering, logg och slumpgeneratorns tillstånd bevaras.
Äldre sparningar och redan avgjorda rapporter läses utan rensning. Skeppens
identiteter stäms av mot deltagande flottor före återupptagning.

`utforskade-stridsuppgraderingar`, `missilernas-omradeseffekt` och
`traffhex-istallet-for-mallista`: skeppsenheten kan bära `missiles` 0 eller 2
och `armored`. Saknat missilfält på en Fighter betyder de två salvor som gällde
tidigare. Nya Fighters sparas med 0 tills Upgrade sätter 2. Stridspjäsen kan
bära `hasMissiles` och `armored`. Saknade fält i en pågående strid betyder att
en Fighter har avfyrare och att skrovet är opansrat. Eldkommandot siktar mot
en hex. Sparversionen är oförändrad och inga sparningar rensas.

`manoverpoang-och-hastighet`: nya strider sparar `maneuverSystem`, `speed` och
`lastManeuver` additivt. Status kan vara `wreck`. Saknad `maneuverSystem`
behåller den tidigare rörelsen. Sparversionen ändras inte och inga sparningar
rensas. En salva som gör minst två skada och innehåller en 6:a slår ut
motorerna. Vrakslaget vid skrovslut är ett sidokast som inte flyttar
vapentärningarna.

`snabb-testsvit`: testprocesser återanvänds per miljö med isolate: false.
Befintlig rensning av mocks och testernas återställning av klockor och DOM
behålls. Detta minskar startkostnaden per testfil utan att flytta bort
beteendetester. Riktade stridstester på telefon ingår i snabbpublicering för
Chromium och WebKit.

## Enhetstester utan total tidsgräns

`snabb-testsvit`: sviten har ingen total tidsgräns. Detta ersätter riktvärdet
20 sekunder, inklusive regeln att det bara var ett riktvärde, och regeln att
flytta långsammare Vitest-tester till den utökade sviten. `tests/unit` och
`tests/extended` körs tillsammans. `tests/integration` och Playwright stannar i
`utokad-testsvit`. Ett enskilt Vitest-test avbryts efter 15 sekunder så att ett
låst test inte väntar obegränsat. Testfel stoppar flödet. Enhetstesterna körs
vid vanliga ändringar; den långa sviten körs vid begärd omfattande testning.

`snabb-mobilpublicering`: Playwrights testmiljö omvandlar import av karttext
med `?raw` till samma textinnehåll som Vite. Det gör att testfixturer som
använder domänmodellen kan laddas utan att kartfiler tolkas som JavaScript.
Den befintliga kontrollen av mobiltesternas urval skyddar även inläsningen.

`snabb-mobilpublicering`: publiceringsgranskningen tillåter blanksteg i
genererade klientfiler eftersom de kan vara del av strängar. Kontroll av
konfliktmarkörer, publiceringskatalog och filinnehåll behålls.

## Raptor-grafik

`egen-raptor-grafik`: ShipImages tillhandahåller en egen transparent WebP-bild för Raptor.

## Dockningskorridor

`dockningskorridor-sprite`: Stridskartan laddar en transparent sprite och ritar den en gång mellan varje dockat par, bakom skeppen och roterad längs linjen mellan dem. Den tidigare linjen används om bilden inte laddas.

## Isometriska bordningsobjekt

`forsvarare-och-civilister`: bordningsvyn tömmer väntande tillstånd i ordning
efter en presentation och pausar kön om nästa tillstånd startar en ny
animation. En statisk uppdatering får inte lämna senare turer kvar i kön.

`formbar-skeppskontur`: `O` i terränglagret betecknar tom rymd; den saknas i
domänens terräng och skapar inga features. `Outside` rensar redigerade lager
atomiskt med undo. Kartformatet behåller övriga befintliga symboler.

`redigerbara-bordningslampor`: editorn redigerar det befintliga valfria
`[lights]`-lagret med samma lampmodell som spelet. Golv som ersätts tar bort
sin lampa i samma kommando. `kategoriserad-bordningspalett` grupperar
verktygen och visar hjälpen även vid tangentbordsfokus.
`lokal-bordningskarteditor`: Pages-bygget anropar inte det lokala kart-API:t;
rotbygget kan fortfarande upptäcka en tillgänglig lokal server.

`rumsspecifika-bordningstexturer`: golv och de två synliga väggsidorna väljer
bild från respektive intilliggande rumsruta. Okänd interiör avslöjas inte.
`texturerad-vaggovansida` använder en separat bild även på väggsnitt.
`isometrisk-skeppsreferens` projicerar befintlig spritejustering på 2:1-planet.
`skeppsbild-under-bordning`: `parseBoardingMap(source, ship)` ger
`BoardingMap.pictures` när kartan har `spriteX`, `spriteY` och `spriteScale`;
`composeBoardingMaps` förskjuter anfallarens bild i r och speglar försvararens
med x' = bredd − x − skala. `BoardingMapView` ritar bilderna med
`boardingSpritePlaneTransform` och gråton 150 före golvlagret.
`hogupplost-skeppsbild-i-bordning`: bordningsvyerna laddar
`SHIP_BOARDING_IMAGES` (`*-boarding-hd.webp`) i stället för `SHIP_SPRITES`.
Bilderna måste ha samma proportioner som spritarna, eftersom `spriteX`,
`spriteY` och `spriteScale` justerades mot dem; testet läser WebP-huvudena.
`illustrerade-bordningshandlingar` använder atlasen `actions-distinct-v4.png`
med samma 4 × 3-rutnät som tidigare.
`spelidentisk-bordningseditor` återanvänder bildregister, mått, ljusberäkning
och väggsnitt samt den gemensamma ytprojektionen för golv och väggar.

`helskarms-bordningseditor`: editorsidan är enda barnet i `#app`, så klassen
`has-boarding-editor` ger griden en enda rad. Canvasen är absolut placerad i
sin behållare så att den inte kan driva ResizeObserver till långsam tillväxt.
`zooma-panorera-bordningseditor`: kameran är vytillstånd i
`BoardingEditorMapView`; modellen påverkas inte. `kamera-utan-lage-i-editor`:
`editorPressMovesView` avgör per tryck om vyn flyttas, och
`editorWheelZoomFactor` gör zoomsteget proportionellt mot hjulets utslag.
Omritning under panorering sker högst en gång per bildruta. Vyn passas in igen bara när
skepp, vy eller rutnätsstorlek ändras, eller vid storleksändring innan
spelaren har flyttat kameran. Nyp zoomar runt fingrarnas mittpunkt.
`direkt-penselstreck-i-editor`: `boardingEditorStrokePreview` använder samma
penselregel som `BoardingEditor.paintStroke`, så förhandsvisningen under
draget blir exakt det som sparas som ett ångra-steg när knappen släpps.
Tester: `helskarms-bordningseditor`, `zooma-panorera-bordningseditor` och
`direkt-penselstreck-i-editor`.

`skeppsbild-last-till-skeppsaxeln`: skeppsaxeln är `y = height / 2` i
rutenheter, eftersom alla skeppsbilder ligger med längdriktningen längs `q`.
`BoardingEditor.setSpriteTransform` tar bara `x` och `scale`; modellen räknar
`spriteY` så att bildens mittlinje ligger på axeln. Bildens proportioner
rapporteras av vyn med `editor-picture-aspect` när bilden laddats och glöms
vid byte av skepp. Tills de är kända behålls sparat `spriteY`. När `Adjust
sprite` startar flyttas en bild utanför axeln dit i ett ångra-steg, och en
höjdändring av rutnätet flyttar bilden med axeln i samma ångra-steg.
`spriteZoomAlongAxis` zoomar runt pekarens eller fingrarnas `x` och håller
punkten kvar även vid skalgränserna 1 och 128. Två fingrar i justeringsläget
skjuter och zoomar bilden i stället för kameran. Filformatet är oförändrat.
Tester: `skeppsbild-last-till-skeppsaxeln` med egen fixturkarta.
Snabbsviten överskred först 20 sekunder under parallella kontroller; den tyngre
taktiska integrationsfilen flyttades till den utökade sviten. Därefter
passerade snabbsviten med 758 tester på 14,70 sekunder utan parallell belastning.

`dorrar-som-tunna-vaggar`: `BoardingMap.doorAxis` härleder dörrens tunna axel ur kartans väggar, och samma regel används av spel- och redigeringsvyn. Siktgeometrin tar emot `true` för hel ruta eller `'q'`/`'r'` för en skiva en tredjedel ruta tjock; strålen träffar skivan där den korsar bandet inom rutan. Dörrtexturerna `door-face.png` och `door-face-locked.png` sträcks över hela väggsidan. De gamla dörrbilderna har tagits bort ur klienten men bildberedningsskriptet och dess genererade mått är orörda.

`isometriska-bordningsobjekt`: originalbilder sparas separat från klientens beskurna WebP-filer. `scripts/prepare-boarding-objects.py` beskär transparens och exporterar vid tre gånger spelets grundupplösning; dörrpar delar beskärning så att ramen inte flyttar sig. Vyn ritar objekten ovanpå golvet i proportioner anpassade till 64 × 32-rutorna, bevarar reservvisning och visar bara kända objekt. Dörrriktningen härleds från ursprunglig omgivande väggterräng utan att ändra sparformatet.

## Meterskala och väggskymning i bordning

- `kameravinkel-60-i-bordning` / `airlock-i-60-graders-perspektiv`: BoardingScale härleder projektionen från `BOARDING_CAMERA_ELEVATION` (60°): diamanten blir 64 × 64·sin 60° = 32√3 och höjdmetern (64/√2)·cos 60°. Figurarket och objekten `crate` och `reactor` kommer från originalen i `assets/original/boarding/60deg/`. `scripts/prepare-boarding-characters.py` skär ut 5 × 7-rutnätet och ger hela arket en gemensam skala. `scripts/prepare-boarding-objects.py` skalar fristående objekt proportionerligt och förankrar dem i fotavtryckets sidohörn; airlocken får dessutom en affin skjuvning som lägger dess golvkant på den exakta axeln med lutningen sin 60°. Dörrar och Half cover byggs som geometri i projektionen. Golvellipser och fotavtryck följer `BOARDING_GROUND_RATIO`. Ersätter `isometri-3-2-i-bordning`.

- `sprites-for-breach-och-escape-pod`: `BoardingObjectArtwork` väljer separata WebP-bilder för breach, intakt escape pod och använd podlucka. Evakuering via en escape pod sätter feature-fältet `destroyed`, som redan finns i sparade strider; därför behövs inget nytt sparfält. Civilistfasen väljer bara oförbrukade poddar.
- `rumsspecifikt-half-cover`: `boardingCoverStyle` väljer texturparet side/top utifrån `BoardingMap.roomAt`. Geometri, kollisionsyta, höjd, ljus och skyddsregler är oförändrade.
- `galley-rum-i-bordning`: rumslagrets `G` parsas som `galley`. `BoardingSurfaceArtwork` ger rummet egna golv- och väggbilder, och editorn erbjuder penseln `Galley`. `scripts/prepare-boarding-surfaces.py` bygger både rummets ytor och Half cover-texturerna från originalen.
- `meterskala-i-bordning`: BoardingScale samlar metermåtten och projektionen. Golvets axlar projiceras som (32, 16√3) respektive (-32, 16√3) och en höjdmeter som (0, -16√2). Kamerans höjdmarginal härleds från väggens höjd. Figurernas bild- och klickrektanglar delar samma mått, och skotteffekter använder gemensam vapenhöjd.
- `isometriska-bordningsobjekt`: bildberedningen mäter öppna dörrars fria öppning och golvförankring samt kalibrerar dörrarnas baslinje till 2:1-projektionen. Öppet och stängt delar beskärning och omvandling. BoardingSpriteMetrics genereras av bildberedningsskriptet och delas av ritningen; originalen bevaras. Kör `python3 scripts/prepare-boarding-objects.py` och därefter Prettier på den genererade TypeScript-filen.
- `genomskinliga-skymmande-vaggar`: BoardingWallVisibility jämför väggens projicerade silhuett med upptäckta golvdiamanter bakom väggen. Polygonöverlapp med positiv yta ger renderad höjd 0,4 m, annars 2,4 m. Den kvarvarande väggen är ogenomskinlig och har en separat snittyta med metallkant, kärna och ribbor. Detta ersätter den tidigare opaciteten 0,35 efter uttrycklig beställning. Resultat cachas per vägg och tillstånd. Figurval använder silhuetten för den renderade höjden. En gemensam målarlista sorterar väggar, objekt och figurer efter golvdjup, även under rörelse; statusmarkörer ritas ovanpå. Väggsnittet gäller både texturerade väggar och reservgeometri. Ursprunglig terräng används fortsatt för dörrriktning; inga nya sparfält tillkommer.
- `tunna-innervaggar`: terrängtecknen `Q` och `R` är fullhöga tunna väggar med tjocklek längs q respektive r. Rutan delas i tre band om 1/3 m. Det inre bandet använder rutans rumstextur, mitten ritas med befintlig väggfasad och `wall-top`, och det yttre bandet använder grannens golvtextur med samma texeltäthet när grannen är golv eller tunn vägg och den sidan är känd. `Outside`, vägg och ytterskrov ger inget yttre golv. Silhuetten för väggsnittet är den tunna väggen i full höjd. Feature-kind `thin-wall` blockerar gång, sikt, skott och ljus med 10 träffpunkter. Förstörd vägg släpper sikt och skott; terrängen gör rutan fortsatt ogångbar.
- `halvhog-tunn-vagg`: tecknen `q` och `r` är samma geometri på 1,2 m. De deltar inte i väggsnittet. De blockerar gång men inte sikt, skott eller ljus, ger samma skyddsbonus som `Half cover` och har 6 träffpunkter. När de förstörs blir rutan gångbar. Befintligt `Half cover`-objekt `C` behålls. Lampor kräver fortsatt vanligt golv. Inga befintliga kartor ändras.
- `sammanfogade-tunna-vaggar`: `BoardingMap` beräknar en form per tunn vägg ur grannarna i de fyra riktningarna. Armar går mot terräng som inte är golv (vägg, skrov, tunna väggar av båda höjderna) och mot dörrar vars axel pekar mot väggen. Formen är 1–3 icke överlappande plattor (`BoardingThinPiece`: axel och spann), ordnade bakifrån för isometrin; utan armar blir det en pelare på 1/3 × 1/3. Sikt, granatkast, ljuskartans blockerare och skuggor, väggsnitt och ritning använder plattorna. En rak platta över hela rutan behåller golvbanden från `tunna-innervaggar`; andra former visar rutans eget golv. Formen sparas inte i stridsläget utan räknas om från kartan vid laddning, så sparade strider är kompatibla. `Q`/`R` och `q`/`r` betyder nu samma vägg; editorn skriver `Q` och `q`, och befintliga kartor med `R` och `r` laddas oförändrat. Bokstavens axel finns kvar i sparade strider som reserv.
- `fonster-pa-halvhog-vagg` / `helhogt-fonster`: terrängtecknet `W` ger terrängen `window` och feature-kind `window` (1 träffpunkt) med samma sammanfogade plattor som tunna väggar. Halvhöga tunna väggar har alltid glas; körtidsfältet `shattered` markerar krossat glas, och ett krossat fönster är `destroyed`. Helt glas ingår i granatens hinder (`#stopsGrenade`, kast och spridning) men inte i sikt, skott eller sprängverkan. Helt fönster blockerar gång och rök; `#canStand` godtar `window` så att ett krossat fönster är gångbart. Glas ritas som genomskinliga plattor (`paintIsoGlass`) från 1,2 m respektive golvet upp till 2,4 m. Sparade strider saknar `shattered` och läses som helt glas; inga sparfält tas bort.
- `krossbart-glas`: `boardingSegmentSolids` går längs skottets linje från skyttens till målets rutcentrum och krossar varje helt glas vars plattor linjen korsar, vid träff och miss. Skada på en halvhög vägg sätter `shattered`. Vyn startar partikeleffekten `glass` när ett känt fönster förstörs eller ett glas övergår till `shattered`.
- `glas-krossas-nar-skottet-passerar`: `boardingSegmentSolids` anger för varje korsat glas andelen `at` av linjen fram till träffpunkten. `BoardingShot.panes` bär glasets id och `at`. Under skottanimationen visar kartvyn via `boardingShotGlassState` varje ruta som kulan nått (`at` ≤ animationens framsteg) som krossad och startar effekten där, så slutläget efter skottet inte startar den igen.
- `glas-tintar-ljus`: `boardingLightGlass` listar helt glas. För varje lampa multipliceras ljuset med `BOARDING_GLASS_TINT` i området bakom glaset sett från lampan, inom lampans siktpolygon. Glaslistan ingår i ljuskartans signatur.
- `tunna-fonster`: `paintIsoGlass` ritar glaset 2 cm tjockt och flyttar fogarnas ändar från väggens halva tjocklek till glasets, så hörn möts utan glipa. Rutor med `High window pane` visar hela golvet i stället för golvbanden. Glasets fotavtryck i modellen, ljuskartan och skottlinjen är oförändrat.

## Ljusberäkning i bordning

- `ljuskallestyrd-bordningsbelysning`: BoardingMap har en oföränderlig lista av BoardingLight. Det valfria `[lights]`-lagret använder `L` och `-`; befintliga kartor utan lagret fungerar med ambientljus. BoardingComposer transformerar lampornas koordinater tillsammans med skeppen och lägger till dockningskorridorens lampa. Inga nya sparfält eller migrationer behövs.
- `vertexljus-i-bordning`: BoardingLighting är en p5-oberoende beräkningsklass i vylagret. Ljus är ambient 0,65 plus summerade lampbidrag: intensitet × (1 − avstånd/räckvidd)² × positiv skalärprodukt mellan ytnormal och ljusriktning, begränsat till 1. Segment mot fullhöga blockerande rutvolymer hanterar även tangering i hörn. Ytans egen vägg undantas vid ljusprov på dess synliga ytor; små förskjutningar håller golvprov innanför golvrutan. BoardingLightPainter interpolerar fyra vertexvärden över två trianglar i en cachad 64 × 64-mask, applicerad med Canvas multiply efter texturen eller reservgeometrin. Ljuscachar återställs vid förändrade barriärer eller rök, inte vid sikt, figurval, panorering eller zoom.
- `tileljus-for-sprites`: separata mittpunktsprov på golvnivå styr tint för personer, föremål och airlock. Rörelse interpolerar start- och målvärde. Befintlig statustint och alpha kombineras med ljuset; HUD och taktiska markeringar påverkas inte. Även reservfigurer och reservobjekt får rutans ljus.

Ny ljussättning planeras i [ljussättning i bordning](boarding/boarding-lighting.md). Kraven där är **Ej implementerat**, utom `ljuskarta-i-bordning` som är **Delvis implementerat** (golv klart, väggar återstår):

- `ljuskarta-i-bordning`: färgad ljuskarta i rutnätets koordinater med flera texlar per ruta, byggd av 2D-synlighetspolygoner per ljuskälla mot väggar, stängda dörrar och rök, och multiplicerad över golvet med golvets affina transform. Väggytor hämtar ljus från ljuskartan. Ersätter `vertexljus-i-bordning`. Implementerat för golv i `BoardingLightMap`: 16 texlar per ruta och en texels kant, ambient som grundfärg och per lampa en cachad falloffbild med samma formel som rutljuset, klippt till synlighetspolygonen och adderad med `lighter`. Varje golvyta multipliceras med sin rutas del av kartan, med en texels marginal för sömlös filtrering. Tunna väggar blockerar bara sitt mittband. Polygonerna för de levererade kartorna tar 2–4 ms i Node, mot 2–6 ms för det tidigare hörnljuset på golven.
- `skuggor-fran-figurer-och-foremal`: `boardingLightOccluders` ger fotavtryck med höjd för aktiva och nedslagna figurer (1,8, 1,2 eller 0,72 m), `Half cover` (1,2 m), reaktorn (1,8 m) och låga tunna väggar (1,2 m). `boardingShadowPolygon` behandlar lampan som en skiva med radien 0,3 m: kärnskuggan är det konvexa höljet av fotavtrycket (runt för figurer) och fotavtryckets topp projicerad H/(H−h) gånger längre bort, krympt med a·h/(H−h) åt varje håll ned till en punkt och avslutad vid lampans räckvidd. En figur rakt under en lampa får därför bara en rund skugga vid fötterna. Varje lampa ritas i en egen bild där skuggorna stansas ut med `destination-out` innan bilden adderas, så en skugga aldrig släcker en annan lampas ljus. Figurernas skuggor sköts av `jamn-ljuskarta-under-forflyttning` nedan.
- `jamn-ljuskarta-under-forflyttning`: `BoardingLightMap` sparar per lampa en bild klippt till synlighetspolygonen, tonad av glas och med fasta föremåls skuggor utstansade. Den byggs bara om när `boardingStaticLightSignature` (barriärer, fasta föremål och glas) ändras. `BoardingLightRefresh` håller reda på vilka figurskuggor varje lampa senast ritades med, avrundade till texelrutnätet, och ger de lampor som når en figur som flyttat sig minst en texel samt det område av kartan som ska sättas ihop igen. Där fylls ambient och alla lampor som når området adderas på nytt. Medan en förflyttning pågår ritas skuggorna med `BOARDING_DRAFT_LIGHT_TEXELS` (8) texlar per ruta och skalas upp; när den är klar ritas de med 16. Golvlagret delas i oupplysta golv, som bara ritas om när mängden någonsin sedda rutor ändras, och ett upplyst lager där ljuskartan multipliceras med en enda `drawImage` och golvens samlade klippbana, bara inom det ändrade området. Ersätter att `boardingLightMapSignature` byggde om ljuskarta och golvlager vid varje steg. I testbordningen på dator gick ett steg från 7–17 ms för ljuskartan och 4–8 ms för golvlagret till 0,1–2 ms respektive 0,1–0,3 ms. Det ändrade området är en skärmrektangel kring lampornas kvadrat, som på skärmen är en romb. Ljuskartan multiplicerades först bara över kvadraten, så rektangelns hörn fick oupplyst golv som blinkade ljust under förflyttning på stora skepp. `boardingLightMapAreaFor` räknar nu tillbaka rektangelns fyra hörn till texlar, med en ruta extra på varje sida.
- `skuggor-mellan-rutor`: `boardingMovingLightFigures` interpolerar figurernas positioner med samma andel som spritarna, och `BoardingMapView` uppdaterar ljuskartan med dem varje bildruta.
- `ljusniva-per-ruta`: ljusnivån per ruta beräknas i modellen från tända lampor, bärbart ljus och brand, utan blinkning, mynningsblixt eller mörkerinställning.
- `dynamiskt-bordningsljus`: ett statiskt lager med hög upplösning byggs om vid ändrade lampor eller barriärer; ett dynamiskt lager med lägre upplösning ritas om när rörliga eller blinkande ljus ändras. Upplösningarna mäts fram på mobil.
- `tandbara-lampor`: lampornas tillstånd blir ett nytt fält i sparad strid och stäms av enligt `avstamning-sparkompatibilitet` innan det införs.

Kravkopplade enhetstester skyddar ljusblockering, ambient, falloff, kartformat, komposition, mittpunktsljus och interpolation. Riktade renderingstester skyddar väggsnitt, klick och oberoende från aktuell sikt. Kampanjtest verifierar återläsning utan nya sparfält.

Snabbsvitens körning 2026-11-04 passerade med 788 tester på 24,37 s. De längre fallen för flottadministration, komponentnätverk och beslutsvyer flyttades därefter till den utökade sviten. Centralt skydd för dessa områden finns kvar genom bland annat flottinteraktion, leveransplanering och väntande beslut. De nya ljus- och väggtesten ligger kvar i snabbsviten; tidigare godkända tester behöver inte köras om enbart på grund av flytten.

`tydlig-bordningsstatus`: boarding-testet i webbläsaren pausar den styrda klockan innan AI-turen börjar. Den tillfälliga statusen verifieras innan klockan stegas fram för stridsloggen; därmed hinner en snabb AI-tur inte avslutas medan WebKit öppnar `Combat details`.

## Bordning: åtta riktningar och figurbilder

`actionpoints-och-riktad-forflyttning`, `bordningsfigurer-fran-spritesheet`,
`utslagna-bordningsfigurer`, `bordning-utan-riktningspilar`,
`bordning-utan-sikt-och-eldrutor`, `senast-sedd-fiende-med-fragetecken`,
`traffchans-vid-synliga-fiender`, `automatisk-bordningstur-vid-tom-ap` och
`hukning-minskar-skottchans` — **Fullständigt implementerat**.

- Sparade riktningar 0–3 behåller sin betydelse. Diagonaler använder 4–7 och
  vändningar följer en uttrycklig cyklisk ordning. Ingen sparrensning behövs.
- Varje delsteg i `BoardingPath` bär sin verkliga AP-kostnad, gemensam för
  förhandsvisning och utförande hos soldater, försvarare och civilister.
- Modellen lämnar oföränderliga målindikatorer; vyn beräknar inga stridsregler.
- Turbyte görs vid kommandots slut, efter stridsutfall, inte när AP debiteras
  eller under en intern overwatchreaktion. Vyn köar efterföljande animationer.
  Skottets presentationsindex placerar projektilen före efterföljande
  civiliströrelse och skadebild, även när sista skottet avslutar rundan.
- Genererade original och prompter sparas i repot. `scripts/prepare-boarding-characters.py`
  packar ett transparent WebP-bildark och typade källrektanglar. Spegling sker
  endast i vyn. De tre liggande källorna packas i en egen rad och används
  riktningsoberoende för statusarna `incapacitated` och `dead`. Renderingen och
  figurernas klickytor använder samma bildgränser. Alla poser delar fotpunkten
  i rutans mitt; skugga och valring använder samma punkt.
- BoardingMapView ritar inga riktningslinjer och tar inte längre emot sikt- och
  eldrutor från BoardingView. Modellens sikt- och eldberäkningar behålls för
  reglerna. Last known-poster filtreras mot personstatus och rensas när deras
  gamla ruta ingår i aktuell sikt utan att personen står kvar. Ändringen kräver
  inga nya sparfält.

## Automatisk bordningskamera

`kamerafokus-vid-bordningssoldatbyte` och
`kameraoverblick-vid-synlig-bordningsrorelse` är **Fullständigt implementerat**.
BoardingCameraController beräknar oföränderliga kamerafaser oberoende av p5.
BoardingView mäter fri kartyta utanför HUD, handlingsknappar, stridsdetaljer,
zoom och förklaring. BoardingMapView projicerar figurernas bildrektanglar och
HP/AP till världsmått. En anpassad marginal på högst 24 skärmpixlar bevaras.
Soldatfokus är en fas som centrerar den valda soldaten på den fria ytan i
spelarens zoom, 300 ms med mjuk interpolation. Zoomen är ett enda tal och
ändras av hjul, nyp, tangenter och Fit. En presentation sparar panoreringen
vid starten. Skott, synlig rörelse och nya ljud för spelaren använder samma
inramning: en fas panorerar till mitten av alla punkters gemensamma rektangel
och zoomar ut bara om rektangeln inte ryms i aktuell zoom, utan att ändra
spelarens zoom. Mellan stegen i
samma uppspelning återgår kameran inte. När uppspelningen är klar återställs
panoreringen och spelarens zoom, utom när en ny egen soldat ska fokuseras.
Tillfällig automatisk zoom kan underskrida den manuella miniminivån för att
rymma avlägsna figurer.

Översikten härleds ur synliga personer i presentationens snapshots och ur nya
ljudmarkörer för spelaren.
BoardingBattle.playerObserversOf använder modellens verkliga siktregler utan
att ändra striden. Både synliga ändpunkter och deras observatörer ramas in
före steget. BoardingView inväntar kameran före figuranimationen och fokuserar
nästa egna soldat efter avslutad handling. Skottets presentationIndex behåller
ordningen före efterföljande rörelse.

Manuella kameragester och Fit avbryter väntande faser och hämmar återstående
automatik i aktuell presentation. Resize och dispose avslutar kamerans löften;
versionskontroll avvisar gamla callbacks. En reservtimer avslutar faser även
när bakgrundsflikar stryper requestAnimationFrame. prefers-reduced-motion
hoppar till sista kamerafasen. Kameran är presentation utan nya sparfält.
Kravnamngivna enhetstester skyddar geometri, siktsammansättning och ordning;
riktade vytester skyddar avbrott och mobiltester verifierar fokus utanför bild.

`kantindikator-for-synlig-fiende` är **Fullständigt implementerat**.
BoardingTargetIndicatorLayout klämmer mål utanför den fria kartytan till
närmaste punkt innanför kanten (ersätter projektionen längs strålen från
kartytans mitt, som kunde placera etiketten långt från målet), håller
crosshair och procent innanför en
22-pixlarsmarginal och särar mål på samma kant. Layouten är p5-oberoende och
ger även klickrektanglar. BoardingMapView skickar klicket som ett särskilt
markeringsläge till BoardingView, vilket förhindrar att ett redan markerat mål
skjuts. BoardingCameraController panorerar därefter målfiguren till den fria
kartytans mitt under 300 ms med exakt bevarad zoom. Manuell kameraavbrytning och
minskad rörelse använder samma regler som övriga automatiska kameraflöden.
