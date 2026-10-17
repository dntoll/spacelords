# Tekniska krav och arbetsregler

Namnen nedan är stabila referenser i tester, kod och dokumentation.
Produktkraven finns separat i [requirements.md](requirements.md).

| Kravnamn                 | Krav                                                                                                                                                                                                             | Verifiering                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `typescript-projekt`     | Node.js-projekt med strikt TypeScript för server och klient.                                                                                                                                                     | `npm run typecheck`, `npm run build`                       |
| `enkel-utvecklingsstart` | Ett kommando startar klientens utvecklingsserver och servern med automatisk omladdning. Dokumentera installation, adresser och felsökning.                                                                       | `npm run dev`, lokal startkontroll                         |
| `produktionsstart`       | Byggd klient och server kan köras tillsammans utan utvecklingsverktyg.                                                                                                                                           | Utökade HTTP-tester mot byggd server                       |
| `serverstatus`           | Servern erbjuder en enkel statuskontroll utan verksamhetsfunktioner. Okända API-adresser ger 404.                                                                                                                | Enhetstest av statusmodell/controller och utökat HTTP-test |
| `rena-gitfiler`          | Ignorera beroenden, byggresultat, testresultat, lokala inställningar och hemligheter. Checka in låsfil och ofarligt miljöexempel.                                                                                | `.gitignore`, `git status`, `git check-ignore`             |
| `lasbara-kravnamn`       | Ge varje krav ett stabilt, unikt och läsbart namn. Använd samma namn i tester, docs och relevanta kodkommentarer.                                                                                                | Kravgranskning och namngivna tester                        |
| `separerade-kravlistor`  | Börja rotöversikten med vision och kravkategorier. Håll produktkrav korta och otekniska. Lista tekniska krav separat och flytta växande detaljer till `docs/`. Dokumentera alla krav och ifrågasätt motsägelser. | Dokumentationsgranskning, `AGENTS.md`                      |
| `meningsfulla-tester`    | Knyt beteendekrav till enhetstester som skyddar mot felkategorier. Använd andra relevanta kontroller för verktygs- och processkrav.                                                                              | Kravkopplingen nedan och kodgranskning                     |
| `snabb-testsvit`         | Den snabba svitens totala exekvering får ta högst 20 sekunder, inklusive testverktygets start. Avbryt och rapportera fel om gränsen överskrids.                                                                  | `npm test`, tidsbegränsad testprocess                      |
| `utokad-testsvit`        | Ha en separat svit för tester som får ta längre tid, inledningsvis HTTP-integration mot produktionsbygget.                                                                                                       | `npm run test:extended`                                    |
| `tester-i-github`        | Kör lint, typkontroll, formatkontroll, båda testsviterna och bygge vid push och pull request i GitHub Actions.                                                                                                   | `.github/workflows/ci.yml`, `npm run check` lokalt         |
| `regressionstest-forst`  | Reproducera buggar med ett misslyckat test före rättningen. Skriv även tester först för annan implementation när lämpligt.                                                                                       | Commit- och arbetsgranskning                               |
| `mvc-arkitektur`         | Använd MVC på server och klient. Vyer hanterar plattformens in-/utdata, får läsa modellen och skickar ändringsavsikter till controllers. Modeller är objektorienterade med hög sammanhållning och låg koppling.  | Enhets- och typkontroll, arkitekturgranskning              |
| `plantuml-domanmodell`   | Underhåll problemdomänens klasser och relationer i PlantUML. Lägg till domänbegrepp först när krav motiverar dem.                                                                                                | `docs/domain-model.puml`, domängranskning                  |
| `branches-och-commits`   | Arbeta på branches och gör regelbundna commits med tydliga meddelanden.                                                                                                                                          | Git-historik och arbetsregler                              |
| `typescript-lintning`    | Använd ESLint med typescript-eslint och meningsfull typmedveten kontroll.                                                                                                                                        | `npm run lint`                                             |
| `lasbar-kod`             | Använd tydlig namngivning och Clean Code. Kommentarer förklarar motiv, begränsningar och kravkopplingar utan att upprepa koden. Håll formatering konsekvent.                                                     | Kodgranskning och `npm run format:check`                   |

## Koppling mellan beteendekrav och tester

- `tom-startsida`: klienttester verifierar att controllern renderar modellens
  innehåll och att vyn behandlar text som text, även om den innehåller HTML.
  Det skyddar mot bortkopplad rendering och HTML-injektion.
- `mvc-arkitektur`: enhetstest verifierar att modellens läsdata inte kan ändras
  utifrån. Typkontrollen begränsar vyn till modellens läsgränssnitt.
- `serverstatus`: enhetstest verifierar statusmodell och controller oberoende av
  HTTP; integrationstest verifierar routning, JSON och okända API-adresser.
- `produktionsstart`: integrationstest verifierar att byggd startsida och dess
  faktiska JavaScript- och CSS-filer går att hämta med rätt innehållstyp.

Processkrav kan inte bevisas med meningsfulla enhetstester. De följs upp genom
verktygskontroller, CI och granskning enligt tabellen.

## Beslut och ändringar

- 2026-10-17: ESLint med typescript-eslint ersätter det tidigare JSLint-kravet på
  användarens förslag, eftersom projektet ska skrivas i TypeScript.
- 2026-10-17: Läsbara kravnamn och en separat teknisk kravlista tillkommer på
  användarens begäran.
