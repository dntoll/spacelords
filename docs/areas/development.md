# Utveckling, kvalitet och driftsättning

Arbetsreglerna står i [AGENTS.md](../../AGENTS.md) och de tekniska kraven i
[tekniska krav](../technical-requirements.md). Driftsättningen beskrivs i
[driftsättning](../deployment.md).

## Krav

- **Utveckling och kvalitet:** MVC, TypeScript, ESLint, p5 i instance mode,
  en Vitest-svit utan total tidsgräns och en utökad svit för HTTP-integration
  och webbläsartester i GitHub CI.
  `master-controller`, `use-case-controller`, `modell-facad` och
  `speltexter-i-vy` är **Fullständigt implementerat**: mastern delegerar till
  en controller och en facad per fall, och vyn formulerar spelartexter.
  `mvc-arkitektur` och `vy-plattformsgrans` är **Delvis implementerat**:
  forskningsträdets pekning och kamerorna ligger i vyn, medan stjärnkartans
  pekning fortfarande översätts i mastern. Bordning och strid behåller sin
  bildruteloop. Se [tekniska kraven](../technical-requirements.md).
  `isolerad-bordningsmodul` är **Fullständigt implementerat**: bordningen
  ligger samlad i `src/client/boarding/` och motsvarande kataloger för server,
  delat kartformat och tester. Övrig kod når modulen bara via dess
  `index.js`-filer, och ESLint håller gränsen.
  `isolerad-rymdstridsmodul` är **Fullständigt implementerat** på samma sätt
  för rymdstriden i `src/client/space-battle/` och `tests/space-battle/`.
  `isolerad-rymdkartmodul` och `app-skal` är **Fullständigt implementerat**:
  stjärnkartespelet ligger i `src/client/space-map/`. App-skalet i
  `src/client/app/` binder ihop modulerna, och generisk kod ligger i
  `src/client/common/`. `AppModel` och `AppView` innehåller ännu
  stjärnkartelogik som kan flyttas in i modulen.
  `arkitekturkarta` är **Fullständigt implementerat**: en genererad kodkarta i
  två nivåer ligger i [docs/architecture](../architecture/README.md), och
  `test:tooling` stoppar en inaktuell karta.
  `snabb-testsvit` är **Fullständigt implementerat**: sviten omfattar alla
  Vitest-tester utom `tests/integration` och har ingen total tidsgräns.
  Detta ersätter riktvärdet 20 sekunder och regeln att flytta långsammare
  Vitest-tester till den utökade sviten. Detaljerade vy-, rit- och
  layoutkontroller ingår i samma svit.
  `utokad-testsvit` får ta högst 60 minuter lokalt. Den omfattar
  HTTP-integration och Playwright, inte Vitest-enhetstesterna. Ett
  webbläsarfall tar högst 30 sekunder, eller 180 sekunder när fallet spelar
  igenom flera år; gränserna gäller en ensam körning, och med sex arbetstrådar får Chromium 1,5 gånger och telefon WebKit tre gånger så lång tid. Matrisen är telefon Chromium,
  dator Chromium och telefon WebKit, med sex arbetstrådar. Surfplatta WebKit
  väntar tills fler plattformar väljs. Detta ersätter de fyra profilerna.
  `snabb-mobilpublicering` är **Fullständigt implementerat** och provpublicerat:
  en vanlig ändringsbeställning innebär snabbtest utan Playwright och publicering
  till den enda testdeploymenten, om användaren inte uttryckligen avstår.
  Driftsättningen väntar tills Pages är klar. Därefter testar användaren på
  mobilen. Playwright ligger kvar i den utökade sviten.
  Branchflödet från 2026-11-16 (se [driftsättning](../deployment.md)):
  `gemensam-startpunkt`, `integrationsbranch-development`, `release-till-main`,
  `synlig-byggversion` och `branchoversikt` är **Delvis implementerat**:
  skript, regler och tester finns, men flödet är ännu inte provkört mot origin
  och molndatorn. Arbete utgår alltid från `origin/development`, mergas dit och
  publiceras därifrån. En release på molndatorn kör hela sviten, flyttar `main`
  och mergar rättningarna tillbaka. Appen visar publicerad branch och revision.
  `release-till-main` ersätter `sluttest-fore-merge`.
  `tester-i-github` kör snabbkontroller vid push till `main` och `development`.
  `utforskningsbranch` är **Delvis implementerat**: en utforskningsbranch med
  `exploration.json` tar emot och publicerar sina arbetsbranchar och mergas in
  i `development` bara när användaren ber om det. Skript, regler och tester
  finns. Återstår: provkörning mot origin med `simple_production`.

- **Driftsättning:** endast klientbygget under `spacelords/` i målrepot;
  befintlig webbplats, navigation, DNS och Pages-inställningar bevaras.

- **Utvecklingsstöd:** `manuell-rundstyrning` är **Ej implementerat**:
  under utveckling ska spelåren kunna styras manuellt.

- **Karta och kartfiler:** `p5-karta` är **Fullständigt implementerat**:
  p5.js i instance mode ritar 2D-kartan, och modeller och controllers beror
  inte på p5. Testet `boarding-shipped-maps` kräver bara att de levererade
  bordningskartorna är giltiga; övriga bordningstester använder fixturer.
