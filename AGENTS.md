# Arbetsregler

`agentoberoende-arbetsregler`: denna fil är den gemensamma källan för alla
agenter och verktyg. Agentspecifika filer, exempelvis `CLAUDE.md`, hänvisar hit
i stället för att upprepa reglerna.

## Krav och spårbarhet

- Spara varje nytt eller ändrat krav och uppdatera översikten i `requirements.md`.
- Ge varje krav ett unikt, stabilt och läsbart namn i kebab-case, exempelvis
  `tom-startsida`. Använd samma namn i tester, dokumentation och relevanta
  kodkommentarer. Ändra inte namnet när formuleringen förtydligas.
- Ange status för varje aktivt krav: **Ej implementerat**, **Delvis implementerat**
  eller **Fullständigt implementerat**. Förklara vad som återstår för delvisa krav.
  En informationsvy eller ett inaktivt byggalternativ är inte färdig spelmekanik.
- `requirements.md` börjar med en sammanfattning/vision och därefter en
  sammanfattning av kravkategorierna. Flytta detaljer till egna Markdownfiler i
  `docs/` när översikten växer.
- `docs/product-requirements.md` beskriver produktkraven kortfattat och otekniskt.
  Teknikval, dialoger, implementation och arbetsprocesser hör inte hemma där.
- `docs/technical-requirements.md` listar tekniska krav och arbetsregler separat.
- Ifrågasätt nya krav som motsäger befintliga innan de genomförs. En uttrycklig
  ändring från användaren gäller; dokumentera vilket tidigare krav den ersätter.

## Testning

- Knyt automatiska enhetstester till varje beteendekrav med kravets läsbara namn.
  Varje test ska skydda mot en kategori av fel, inte bara upprepa implementationen.
- Kör alla Vitest-tester utom HTTP-integration i en svit utan total tidsgräns.
  Detta ersätter riktvärdet 20 sekunder och regeln att flytta långsammare
  Vitest-tester till den utökade sviten. HTTP-integration och Playwright hålls
  separat. Kör enhetstesterna vid vanliga ändringar. Hela sviten körs i
  releaseflödet nedan. GitHub Actions kör bara snabbkontrollerna, vid push till
  `main` och `development` (`tester-i-github`).
- Normalläge (`snabb-mobilpublicering`, `integrationsbranch-development`):
  prioritera mobil. När en ändring är klar och committad kör agenten
  `npm run work:merge`. Det kör snabbkontrollerna, mergar arbetsbranchen in i
  `development`, pushar båda och publicerar `development` till den enda
  testdeploymenten. Användaren testar `development` manuellt på mobilen, ofta
  flera features tillsammans. En vanlig ändringsbeställning ger tillstånd till
  detta. Vill användaren testa en feature isolerat publiceras arbetsbranchen
  med `npm run deploy:quick` i stället. Kör riktade regressionstester för
  ändrat beteende; kör inte hela plattformsmatrisen utan nytt skäl.
- Release (`release-till-main`) görs när användaren ber om det, normalt av
  agenten på molndatorn: `npm run release:start` skapar `release/<datum>` från
  `origin/development`. Kör `npm run check`, rätta fel i release-branchen med
  regressionstest först och upprepa tills hela sviten går igenom för exakt
  aktuell revision. `npm run release:finish` flyttar då `main` till den
  revisionen med fast-forward och mergar releasen tillbaka till `development`.
  Användarens beställning av release ger tillstånd till detta. Det ersätter
  `sluttest-fore-merge` med separat ja före merge till `main`.
- Vid en bugg: skriv först ett regressionstest, kör det och verifiera att det
  misslyckas av rätt orsak, och rätta därefter felet.
- Skriv även tester före annan implementation när det är lämpligt.
- Verifiera bygg-, verktygs- och processkrav med lämpliga automatiska kontroller
  och granskning; skapa inte konstlade enhetstester för att läsa konfigurationsfiler.

## Arkitektur och kod

- Använd MVC på server och klient. En master-controller tar emot färdiga
  domänfakta, delegerar till use-case-controllern för fallet och är den enda som
  byter fall. Vyer får läsa modellen men aldrig ändra den.
- En use-case-controller anropar bara sitt falls modell-facad. Den känner inte
  till DOM eller p5. Facaden är enda vägen in i fallet och lämnar strukturerade
  utfall utan visningstext.
- Vyn är lagret mot DOM, p5 och spelaren. Den äger pekning och kamera, kan ha en
  inre kameracontroller och lämnar domänfakta. Den känner inte till
  use-case-controllern. Bordning och strid får en bildruta. Övriga vyer ritas
  när något synligt ändrats. Vyn väljer meningarna spelaren ser.
- Klienten (`app-skal`) består av ett app-skal och tre spelmoduler:
  - `src/client/app/` håller `MasterController`, `AppModel`, `AppView`,
    `ViewContracts`, `PlayerNotice` och `playerNoticeText`. Det binder ihop
    modulerna.
  - `src/client/common/` har generisk kod utan spelkunskap: `dom` och
    `HexCoordinate`.
  - Modulerna är `space-map/` (stjärnkartespelet, `isolerad-rymdkartmodul`),
    `space-battle/` (`isolerad-rymdstridsmodul`) och `boarding/`
    (`isolerad-bordningsmodul`). Var och en har egna `controllers/`,
    `models/`, `views/` och vid behov `assets/`. Testerna ligger i
    `tests/<modul>/{unit,extended,browser}/`.
- Lägg en underkatalog per fall under modulens `controllers`, `models` och
  `views`. Delade modellfiler ligger kvar i modulens `models` tills bara de
  återstår.
- Kod utanför en modul importerar den bara via
  `<modul>/{models,views,controllers}/index.js`. En modul får utanför sig själv
  bara nå `AppModel`, `ViewContracts`, `common/` och andra modulers
  `models`- och `views`-index. Undantagen listas i `featureModules` i
  `architecture.config.mjs`, och ESLint håller gränserna.
- Kodkartan (`arkitekturkarta`) i `docs/architecture/` genereras från samma
  lista och från importerna. Läs `docs/architecture/overview.puml` och berörd
  moduls diagram innan strukturella ändringar. Kör `npm run architecture:map`
  efter ändrade importer, filer eller fall och committa diagrammen med koden.
  `test:tooling` misslyckas när kartan är inaktuell.
- Modellera objektorienterat med hög sammanhållning och låg koppling. Ge vyer
  enbart läsgränssnitt eller oföränderliga ögonblicksbilder av modellerna.
- Underhåll problemdomänens klasser och relationer i PlantUML i
  `docs/domain-model.puml`. Hitta inte på domänbegrepp innan produktkrav finns.
- Använd ESLint med typescript-eslint. Detta ersätter användarens ursprungliga
  JSLint-val efter uttrycklig ändring i samtalet.
- Använd p5.js i instance mode för 2D-kartan. Håll domänmodell, hexgeometri och
  controllers oberoende av p5. Övriga vyer och kontroller använder vanlig HTML.
- Använd tydliga namn och Clean Code. Kommentera bara när kommentaren tillför
  något, exempelvis kravkoppling, motiv eller en oväntad begränsning.

## Språk

- Kod, identifierare, kodkommentarer och alla texter i spelet ska vara på engelska,
  inklusive hjälptexter, tillgänglighetstexter och exempelvärldens namn på råvaror.
- Dokumentation skrivs på svenska. Återge namn, begrepp och etiketter som finns
  direkt i spelet på engelska även där, exempelvis `Star map`, `Resources` och
  `Research station`. Befintliga stabila kravnamn behålls för spårbarhet.

## Sparkompatibilitet

- `avstamning-sparkompatibilitet`: stäm av med användaren på nytt inför framtida
  inkompatibla ändringar av sparade spel. Engångsrensningen för terraforming är
  uttryckligen godkänd endast för denna leverans, även om nuvarande spel är tester.

## Git

- Allt arbete finns på origin. Inget får finnas bara på en lokal dator.
- `gemensam-startpunkt`: börja varje uppdrag med `npm run work:start -- <prefix>/<ämne>`.
  Det hämtar origin och skapar branchen från `origin/development`. I en ny
  worktree som redan har en egen branch räcker `npm run work:start`. Det
  flyttar branchen fram till `origin/development`. Utgå aldrig från en lokal
  `main` eller en annan agents branch.
- Branchar: `main` innehåller bara revisioner som klarat hela sviten och ändras
  bara av `release:finish`. `development` är integrationsbranchen och ändras
  via `work:merge` och `release:finish`. Arbetsbranchar har agentens prefix,
  exempelvis `codex/` för Codex och `claude/` för Claude Code. Release-branchar
  heter `release/<datum>`. Pusha aldrig direkt till `main` eller `development`,
  och använd aldrig force-push mot dem.
- Innehåller arbetsbranchen inte senaste `origin/development` vägrar
  skripten publicera eller merga. Kör då `git merge origin/development`, lös
  konflikter och kör snabbkontrollerna igen.
- Pusha arbetsbranchen när du är klar, även om den inte mergas än.
  `npm run branches:status` (`branchoversikt`) visar branchar på origin med
  commits som saknas i `development`.
- Gör regelbundna, sammanhängande commits med tydliga commitmeddelanden.
- Kör relevanta kontroller före commit. Bevara användarens befintliga ändringar.

## Driftsättning

- Läs och följ `docs/deployment.md` inför driftsättning. Målet är
  `https://curiousengineerstudio.se/spacelords/`, med enbart klientbygget i
  `spacelords/` i `dntoll/dntoll.github.io`.
- Ändra aldrig andra publiceringskataloger, startsida, navigation, rotens
  `CNAME`, DNS eller Pages-inställningar för att publicera Spacelords. Skapa inga
  länkar till appen från den befintliga webbplatsen.
- Båda repona och allt klientinnehåll är publika. Lägg aldrig hemligheter i kod,
  dokumentation, byggfiler, webbläsarvariabler eller loggar.
- Det finns en enda testdeployment. Senaste publicering vinner, och appen visar
  branch, kort revision och byggtid på `Saved games` (`synlig-byggversion`).
- Normalläget innebär publicering av `development` via `work:merge` efter vanliga
  ändringsbeställningar, om användaren inte uttryckligen avstår. Att enbart
  förbereda ett bygge eller redigera driftsättningsinstruktionen innebär inte
  att publicera.
- Publicering till webbplatsrepots `main` är separat från källrepots `main`.
  En release publiceras bara om användaren vill testa den manuellt. Fråga
  fortsatt inför varje inkompatibel ändring av sparade spel.
