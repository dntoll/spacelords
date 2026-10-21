# Tekniska krav och arbetsregler

Namnen nedan är stabila referenser i tester, kod och dokumentation.
Produktkraven finns separat i [product-requirements.md](product-requirements.md).

## Supply & production

De sex kraven i [försörjningsvyn](supply-production.md) använder SupplyOverview
för gemensam, plattformsoberoende bedömning. Game exponerar oföränderliga
leveransdata och SupplySelection håller tillfällig sökning och expansion separat
från sparade speldata. Vyn läser ögonblicksbilder och skickar avsikter via
AppController. Materialrader skapas från data utan fem fasta materialfält.

Enhetstester skyddar reservationer, delvis täckta behov, ändliga fyndigheter,
framtida projekt, produktionsförmåga, omlastning, avbrutna projekt, brutna kedjor,
skrivskydd och 300 material. Vytester skyddar urval och fokus vid återrendering.
Webbläsartester verifierar navigation, lager, sökning, leveranser, sparade spel,
intern rullning och minst 44 px höga kontroller på telefon, surfplatta och dator.

Ingen ändring av sparformat eller transportregler behövs. TradeAssignment
innehåller den tilldelningsvalidering som Star map tidigare delade med grafen.

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

`flottadministration`, `flottnamn-direktredigering` och
`flottknappar-pa-kartan` använder gemensamma FleetCard och ShipTransferInput
i kartpanelen och Fleets. FleetMapPanel visar flottorna vid aktuell position
utan att ändra kartans hexval. HTML-panelen kan förstoras och rullas internt.
Fleets har kompakta skeppsförhandsvisningar, aktuell position och Show on map;
den befintliga minikartan och hanteringen av tomma flottor behålls.

AppModel håller ett oföränderligt, tillfälligt namnutkast. AppController
samordnar redigering, validering och sparning genom befintliga Game-kommandon.
En överföring till en ny flotta använder den befintliga sammanhängande
domänhandlingen; kommandot returnerar den mottagande flottans ögonblicksbild.
Inga nya domänbegrepp, relationer eller sparformat tillkommer;
docs/domain-model.puml har granskats och behöver inte ändras.

Vyn bevarar fokus, markörläge, panelstorlek och rullning vid återrendering.
Vid flottval rullas flottans namn fram även i långa listor och efter Show on map.
Programmatisk borttagning av ett namnfält skiljs från användarens fokusbyte.
Det senare avbryter utkastet utan att förstöra kontrollen som tar emot nästa
klick. Enter sparar, Escape avbryter, och F2 eller namnknappen ger alternativ
till dubbelklick. Orders → Choose destination erbjuder destinationsval med
hexväljare, Known objects eller kartan utan drag.

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
| `utokad-testsvit`        | Fullständigt implementerat | Ha en separat svit för tester som får ta längre tid, HTTP-integration samt riktiga browserkontroller mot produktionsbygget.                                                                                      | `npm run test:extended`                                    |
| `tester-i-github`        | Fullständigt implementerat | Kör lint, typkontroll, formatkontroll, båda testsviterna och bygge vid push och pull request i GitHub Actions.                                                                                                   | `.github/workflows/ci.yml`, `npm run check` lokalt         |
| `regressionstest-forst`  | Fullständigt implementerat | Reproducera buggar med ett misslyckat test före rättningen. Skriv även tester först för annan implementation när lämpligt.                                                                                       | Commit- och arbetsgranskning                               |
| `mvc-arkitektur`         | Fullständigt implementerat | Använd MVC på server och klient. Vyer hanterar plattformens in-/utdata, får läsa modellen och skickar ändringsavsikter till controllers. Modeller är objektorienterade med hög sammanhållning och låg koppling.  | Enhets- och typkontroll, arkitekturgranskning              |
| `plantuml-domanmodell`   | Fullständigt implementerat | Underhåll problemdomänens klasser och relationer i PlantUML. Lägg till domänbegrepp först när krav motiverar dem.                                                                                                | `docs/domain-model.puml`, domängranskning                  |
| `branches-och-commits`   | Fullständigt implementerat | Arbeta på branches och gör regelbundna commits med tydliga meddelanden.                                                                                                                                          | Git-historik och arbetsregler                              |
| `typescript-lintning`    | Fullständigt implementerat | Använd ESLint med typescript-eslint och meningsfull typmedveten kontroll. Undanta genererade bygg-, täcknings- och browserresultat från källkodsgranskningen.                                                    | `npm run lint`                                             |
| `lasbar-kod`             | Fullständigt implementerat | Använd tydlig namngivning och Clean Code. Kommentarer förklarar motiv, begränsningar och kravkopplingar utan att upprepa koden. Håll formatering konsekvent.                                                     | Kodgranskning och `npm run format:check`                   |

## Koppling mellan beteendekrav och tester

- `engangsreset-ekonomi`: **Fullständigt implementerat**. Just denna leverans
  raderar de tre äldre version 1-sparplatserna efter uttryckligt användarbeslut.
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

- `skeppsbilder`, `flottadministration` och `flottbyggar-minikarta`: samma
  optimerade transparenta WebP-bilder används i kartans flottpanel och
  flottbyggaren. Modellens tillfälliga överföringsval är skrivskyddat för vyerna;
  överföringar går genom controller och befintlig domänvalidering. Vyn hanterar
  musdrag, touch och tangentbord. Enhetstester skyddar exakt en överföring,
  tomma mottagare, olika positioner, låsta order och begränsade stora bildlistor.
  Minikartan använder en separat skrivskyddad p5-instans som avvecklas vid
  vybyte och återrendering. Browsertester verifierar riktig bildladdning,
  minikartans positionsmarkör, bibehållen huvudkamera och native touchdrag.
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
| `dokumenterad-driftsattning` | Fullständigt implementerat | Bevara en verifierbar instruktion för bygge, avgränsad publicering, kontroll och återställning. Instruktionen innebär inte automatisk publicering.                                                                                     | `docs/deployment.md` och hänvisning i `AGENTS.md`                                   |

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
  version 3 använder en enda projektlista per koloni. Version 2 läses från samma
  sparplatsnycklar; planetens och fabrikernas gamla köer vävs ihop efter
  projektidentifierare, med bibehållen ordning inom varje gammal kö. Gamla
  projektidentifierare och leveransreservationer bevaras. Saknade delposter i
  gamla lager fylls med noll. Upprepad återläsning ändrar inte kön. Automatisk
  rensning av sparplatser tillkommer inte. Modelltester täcker migreringen.

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
