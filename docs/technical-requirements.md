# Tekniska krav och arbetsregler

Namnen nedan är stabila referenser i tester, kod och dokumentation.
Produktkraven finns separat i [product-requirements.md](product-requirements.md).

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
Driftsättning beställs separat och följer normalflödet i deployment.md. En
allmän begäran om test och publicering använder snabbkontroller; omfattande
sluttest beställs uttryckligen separat.

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
till dubbelklick. Orders → Choose destination erbjuder destinationsval med
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

| Kravnamn                 | Status                     | Krav                                                                                                                                                                                                             | Verifiering                                                |
| ------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `typescript-projekt`     | Fullständigt implementerat | Node.js-projekt med strikt TypeScript för server och klient.                                                                                                                                                     | `npm run typecheck`, `npm run build`                       |
| `enkel-utvecklingsstart` | Fullständigt implementerat | Ett kommando startar klientens utvecklingsserver och servern med automatisk omladdning. Dokumentera installation, adresser och felsökning.                                                                       | `npm run dev`, lokal startkontroll                         |
| `produktionsstart`       | Fullständigt implementerat | Byggd klient och server kan köras tillsammans utan utvecklingsverktyg.                                                                                                                                           | Utökade HTTP-tester mot byggd server                       |
| `serverstatus`           | Fullständigt implementerat | Servern erbjuder en enkel statuskontroll utan verksamhetsfunktioner. Okända API-adresser ger 404.                                                                                                                | Enhetstest av statusmodell/controller och utökat HTTP-test |
| `rena-gitfiler`          | Fullständigt implementerat | Ignorera beroenden, byggresultat, testresultat, lokala inställningar och hemligheter. Checka in låsfil och ofarligt miljöexempel.                                                                                | `.gitignore`, `git status`, `git check-ignore`             |
| `lasbara-kravnamn`       | Fullständigt implementerat | Ge varje krav ett stabilt, unikt och läsbart namn. Använd samma namn i tester, docs och relevanta kodkommentarer.                                                                                                | Kravgranskning och namngivna tester                        |
| `separerade-kravlistor`  | Fullständigt implementerat | Börja rotöversikten med vision och kravkategorier. Håll produktkrav korta och otekniska. Lista tekniska krav separat och flytta växande detaljer till `docs/`. Dokumentera alla krav och ifrågasätt motsägelser. | Dokumentationsgranskning, `AGENTS.md`                      |
| `meningsfulla-tester`    | Fullständigt implementerat | Knyt beteendekrav till enhetstester som skyddar mot felkategorier. Använd andra relevanta kontroller för verktygs- och processkrav.                                                                              | Kravkopplingen nedan och kodgranskning                     |
| `snabb-testsvit`         | Fullständigt implementerat | Den snabba svitens totala exekvering får ta högst 20 sekunder, inklusive testverktygets start. Avbryt och rapportera fel om gränsen överskrids.                                                                  | `npm test`, tidsbegränsad testprocess                      |
| `utokad-testsvit`        | Fullständigt implementerat | Ha en separat svit för tester som får ta längre tid, HTTP-integration samt riktiga browserkontroller mot produktionsbygget. CI-jobbet får ta högst 20 minuter inklusive installation av webbläsare.              | `npm run test:extended`                                    |
| `tester-i-github`        | Fullständigt implementerat | Kör snabbkontroller, Pages-bygge och mobilröktest vid push/PR. Kör hela sviten i GitHub Actions vid begärt sluttest för explicit källrevision.                                                                   | `.github/workflows/ci.yml`, `npm run check` lokalt         |
| `regressionstest-forst`  | Fullständigt implementerat | Reproducera buggar med ett misslyckat test före rättningen. Skriv även tester först för annan implementation när lämpligt.                                                                                       | Commit- och arbetsgranskning                               |
| `mvc-arkitektur`         | Fullständigt implementerat | Använd MVC på server och klient. Vyer hanterar plattformens in-/utdata, får läsa modellen och skickar ändringsavsikter till controllers. Modeller är objektorienterade med hög sammanhållning och låg koppling.  | Enhets- och typkontroll, arkitekturgranskning              |
| `plantuml-domanmodell`   | Fullständigt implementerat | Underhåll problemdomänens klasser och relationer i PlantUML. Lägg till domänbegrepp först när krav motiverar dem.                                                                                                | `docs/domain-model.puml`, domängranskning                  |
| `branches-och-commits`   | Fullständigt implementerat | Arbeta på branches och gör regelbundna commits med tydliga meddelanden.                                                                                                                                          | Git-historik och arbetsregler                              |
| `typescript-lintning`    | Fullständigt implementerat | Använd ESLint med typescript-eslint och meningsfull typmedveten kontroll. Undanta genererade bygg-, täcknings- och browserresultat från källkodsgranskningen.                                                    | `npm run lint`                                             |
| `lasbar-kod`             | Fullständigt implementerat | Använd tydlig namngivning och Clean Code. Kommentarer förklarar motiv, begränsningar och kravkopplingar utan att upprepa koden. Håll formatering konsekvent.                                                     | Kodgranskning och `npm run format:check`                   |

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
  Regressionstest kontrollerar att kartan behåller minst 80 procent av
  telefonens skärmyta även med alternativa fontmått; CI verifierar också Linux/WebKit.
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

En runda sparas efter slutförd simulering; vid omladdning mitt i animationen
laddas föregående stabila tillstånd. Sparfel visas och oläsbara platser bevaras
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
  de inträffar; ankomst registreras exakt en gång. Livefaserna är planning och
  simulating. Äldre sparad summary läses som planning och gamla steghändelser
  filtreras bort. Konsolen läser oföränderliga händelser, visar de senaste 100
  med intern scroll och följer nya händelser när spelaren är längst ned.
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

`avstamning-sparkompatibilitet`: Sparversion 6 läser fortsatt version 2–5.
Befintliga skepp får Rocket engine utan lageravdrag; äldre uppnådd forskning
behålls och saknade motorförkunskaper kompletteras. Äldre köade skepp behålls
med synligt motorbehov. Ingen ny rensningsmarkör eller ändrad lagringsnyckel
införs. Laddning av version 2–5 och bevarande av motorbestyckning verifieras automatiskt.

`kompakta-flottkort` behåller fyra skepp per rad även när flera flottkort delar
kartpanelen på dator eller surfplatta. Skeppsknapparnas bredd anpassas till
radens utrymme mellan 44 och 60 px; träffytorna behålls och Engines & speed
förblir åtkomligt. Webbläsarregressionen verifierar radantal, korthöjd och
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
