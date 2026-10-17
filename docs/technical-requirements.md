# Tekniska krav och arbetsregler

Namnen nedan är stabila referenser i tester, kod och dokumentation.
Produktkraven finns separat i [product-requirements.md](product-requirements.md).

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
| `typescript-lintning`    | Fullständigt implementerat | Använd ESLint med typescript-eslint och meningsfull typmedveten kontroll.                                                                                                                                        | `npm run lint`                                             |
| `lasbar-kod`             | Fullständigt implementerat | Använd tydlig namngivning och Clean Code. Kommentarer förklarar motiv, begränsningar och kravkopplingar utan att upprepa koden. Håll formatering konsekvent.                                                     | Kodgranskning och `npm run format:check`                   |

## Koppling mellan beteendekrav och tester

- `english-game` och `focused-interface`: vytester skyddar engelska handlingar,
  synliga modellvärden och beskrivningar av valda himlakroppar.
- `viewport-game-layout`: enhetstester skyddar controllerstyrda flikar;
  browsertester kontrollerar alla vyer utan scroll eller klippta kontroller,
  även i stående och liggande format.
- Spelgrundens kravkoppling beskrivs i [first-iteration.md](first-iteration.md).
- `mvc-arkitektur`: enhetstest verifierar att modellens läsdata inte kan ändras
  utifrån. Typkontrollen begränsar vyn till modellens läsgränssnitt.
- `serverstatus`: enhetstest verifierar statusmodell och controller oberoende av
  HTTP; integrationstest verifierar routning, JSON och okända API-adresser.
- `produktionsstart`: integrationstest verifierar att byggd startsida och dess
  faktiska JavaScript- och CSS-filer går att hämta med rätt innehållstyp.

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
