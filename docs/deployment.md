# Driftsättning av Spacelords

Läs instruktionen inför varje driftsättning. Arbetsflödet nedan gäller från
2026-10-24 och ersätter kravet på fullständigt `check` inför varje publicering.
Äldre leveransanteckningar längre ned beskriver det dåvarande flödet.

## Normalläge: ändring, snabbtest, publicering, manuell mobiltest

En vanlig ändringsbeställning ger tillstånd att publicera den committade
arbetsbranchen, om användaren inte avstår. Källrepots `main` ändras först efter
separat sluttest och godkännande. Prioritera mobil; användaren testar sedan på
sin telefon och kan beställa ändringar eller mer omfattande tester.

Använd Node.js 24. Installera beroenden med `npm ci` när låsfilen ändrats eller
beroenden saknas. Installera webbläsarna vid behov:

```sh
npx playwright install --with-deps chromium webkit
```

Skriv kravkopplade tester för ändrat beteende. Vid bugg ska regressionstestet
först misslyckas av rätt orsak. Kör relevanta kontroller före commit och committa
bara avsedda ändringar på en arbetsbranch. Publicera sedan med:

```sh
npm run deploy:quick
```

Kommandot kräver ren arbetsbranch, inklusive inga ocommittade nya filer.
Det kör `check:quick`: formatkontroll, ESLint, snabbsviten, en typkontroll,
Pages-bygge, automatiska publiceringsskydd, Pages-integration och korta
mobiltester i Chromium och WebKit. Enhetstestsviten har fortsatt högst
20 sekunders total exekveringstid; hela flödet har ingen sådan tidsgräns.
Mobiltesterna använder isolerad webbläsarlagring och rör inte spelarens sparningar.

Publiceringsskriptet:

1. Fryser och kontrollerar källrevisionen och sparar det testade klientbygget.
2. Pushar den exakta källrevisionen till arbetsbranchen med befintlig SSH.
3. Hämtar webbplatsrepots aktuella `main` med `--depth 1`, `--filter=blob:none`
   och sparse checkout för `spacelords/` till en separat tillfällig katalog.
   Skapar en deploybranch. Okända filer, fel appinnehåll och symboliska länkar
   avvisas. Övriga kataloger bevaras i Git-trädet utan att laddas ned.
4. Ersätter endast `spacelords/`, lägger till `deployment.json` med
   källrevision och kontrollsummor, granskar diffens avgränsning och committar.
5. Hämtar aktuell `origin/main`. Andra projekts samtidiga ändringar bevaras med
   rebase; ändrad `spacelords/` avbryter publiceringen för granskning.
6. Använder dokumenterad vanlig push från den granskade deploybranchen till
   webbplatsrepots `main`, med befintlig SSH. Ingen force-push eller ändring av
   branchskydd görs. Avvisad push kräver ny granskning.
7. Följer Pages-körningen för deployrevisionen, kontrollerar alla livefilers
   byteinnehåll, HTML/JS/CSS-typer och omdirigeringen `/spacelords`.
8. Kontrollerar att startsidan och tidigare kontrolladresser är oförändrade och
   kör en kort mobilkontroll mot liveadressen i båda webbläsarmotorerna.

Kompakt rapport med revisioner, tider, filkontrollsummor, Pages-länk och utfall
finns i `dist/deployments/<revision>-<tid>/report.json`. Stegloggar ligger bredvid,
kontrolloggar i `dist/checks/`. Dessa filer är ignorerade av Git. Läs fullständiga
loggar, spår och skärmbilder vid fel; läs inte om lyckade körningar utan skäl.
Vid avbrott efter push kan publicering redan pågå: kontrollera rapporten och
Pages innan du försöker igen. Ett misslyckat livetest innebär inte återställning.

`npm run check:quick` kör samma förkontroller utan publicering. Dela resultat
mellan körningar bara när källrevision och byggresultat är oförändrade. GitHub
kör snabbkontroller vid push/PR, men lokal publicering väntar inte på en
upprepning av samma kontroller i CI. GitHub CI publicerar inget.

## Begärt sluttest och merge

När användaren ber om sluttest startas workflowet `CI` manuellt i GitHub Actions
med `revision` satt till hela aktuell käll-SHA och workflowets branch satt till
arbetsbranchen. Jobbet `Final tests` checkar ut och verifierar denna revision och
kör `npm run check`: kvalitetskontroller, snabbsvit, båda byggena, alla
integrationstester och hela webbläsarsviten. Matrisen är telefon Chromium,
telefon WebKit, surfplatta WebKit och dator Chromium. Jobbgränsen är fortsatt
20 minuter inklusive installation. Loggar och felunderlag sparas som artefakter.

`workflow_dispatch` blir tillgängligt när workflowändringen finns på GitHubs
defaultbranch. Vid införandet måste denna första version därför sluttestas
med `npm run check` lokalt och CI:s tillgängliga kontroller redovisas innan
användaren tillfrågas om första merge. Detta undantag gäller enbart införandet;
merge får inte ske automatiskt för att aktivera workflowet.

Efter godkänt sluttest redovisas testad SHA, CI-länk och relevanta överhoppade
fall. Fråga därefter om merge till källrepots `main`. Ett separat ja krävs för
den testade revisionen. Kontrollera åter aktuell branchrevision, CI-resultat och
att inga konfliktlösningar eller andra ändringar tillkommit före merge.
Ändrad källrevision kräver nytt sluttest. Samma godkända fullständiga körning
behöver inte upprepas lokalt.

Om fel upptäcks: regressionstest, rättning, snabbtest och ny publicering.
Låt användaren testa manuellt igen och invänta ny begäran om sluttest. Fråga vid
behov om förändrat beteende eller större omfattning. En oförändrad, redan
publicerad revision publiceras inte igen enbart för att sluttestet lyckats.

## Avgränsning och sparade spel

- Publik adress: `https://curiousengineerstudio.se/spacelords/`.
- Källa: `dntoll/spacelords`. Publicera enbart klientinnehållet i `dist/pages/`
  samt skriptets ofarliga revisionsmetadata till `spacelords/` i
  `dntoll/dntoll.github.io`. Node/Express körs inte i GitHub Pages.
- Bevara alla andra kataloger, startsida, navigation, rotens `CNAME`, `.nojekyll`,
  DNS och Pages-inställningar. Skapa inga länkar till appen på webbplatsen.
- Publicera aldrig serverbygge, källkod, dokumentation, Git-metadata,
  autentiseringsmaterial eller miljöfiler. Publika filnamn tillåts uttryckligen i
  skriptet; utöka granskningen när nya typer av klientresurser införs.
- Befintlig SSH och credential manager används. Inga nya CI-hemligheter behövs.
  Ett repos `GITHUB_TOKEN` ger inte skrivbehörighet till ett annat repo.
- `avstamning-sparkompatibilitet` gäller fortsatt: fråga inför varje framtida
  inkompatibel sparändring och förklara vad som raderas eller ersätts.
  Normalläget innebär inte ett generellt tillstånd att radera sparningar.
- Publicering till webbplatsrepots `main` och merge till källrepots `main` är
  två separata åtgärder. Det senare kräver godkänt sluttest och separat ja.

## Återställning

Rapporten sparar webbplatsrepots tidigare revision och deploycommit. Skapa en
ny branch från aktuell `main` i en separat checkout. Återställ enbart
`spacelords/` från den tidigare revisionen, eller revertera deploycommitten om
inga senare ändringar av katalogen riskerar att gå förlorade. Granska att diffen
bara omfattar appen, committa och publicera med vanlig push enligt samma
avgränsning. Följ Pages och verifiera liveadressen. Återställ aldrig hela
webbplatsrepot och använd inte force-push.

## Tidigare leveranser

## Första driftsättningen: 2026-10-17

- Publicerad klientrevision: `4461af5` i `dntoll/spacelords`.
- Målrepots tidigare revision: `75622c666eb39a2c4648355d66647857e9524e06`.
- Deploycommit: `57849f32023e5951df81def7454e34b17026ad3e`. Committen lägger
  endast till `spacelords/index.html` och två filer i `spacelords/assets/`.
- Befintligt branchbaserat Pages-flöde bekräftades genom tidigare lyckad
  `pages build and deployment` på `main`. Inga Pages-inställningar ändrades.
- PR-integrationen gav ett behörighetsfel. Efter granskad arbetsbranch och ny
  kontroll mot aktuell `main` användes reservvägen: en vanlig fast-forward-push
  via befintlig SSH-autentisering. Ingen force-push eller behörighetsändring.
- [Pages-körningen](https://github.com/dntoll/dntoll.github.io/actions/runs/39049665491)
  lyckades. Liveadressen `/spacelords/` visar rubriken Spacelords, även verifierat
  i webbläsare. `/spacelords` leder vidare till `/spacelords/`.
- Publicerad HTML, JavaScript och CSS gav HTTP 200, rätt innehållstyper och
  exakt samma innehåll som det verifierade Pages-bygget.
- Kontrollsummor före/efter var identiska för `/`, `/MachineBloom/`,
  `/Defence-Grid/test/`, `/styles.css` och `/i18n.js`. Inga länkar eller
  navigationsval lades till på den befintliga webbplatsen.
- Källrepots tre ursprungliga commits pushades till `main` och arbetsbranchen.
  Båda [CI-körningarna](https://github.com/dntoll/spacelords/actions/runs/39049517862)
  [lyckades](https://github.com/dntoll/spacelords/actions/runs/39049519098).

## Driftsättning: 2026-10-18

- Publicerad klientrevision: `a37d7e82bbaeb80afdf129b43e4777f983ee26e9`
  i `dntoll/spacelords`, fast-forward-mergad till `main`.
- Målrepots tidigare revision: `57849f32023e5951df81def7454e34b17026ad3e`.
- Deploycommit: `4b56017a558b7c407c26a71ad1394be02c25014e`. Endast
  `spacelords/` ändrades; dess tre filer motsvarar exakt Pages-bygget.
  Kontrollsummorna för samtliga 281 övriga webbplatsfiler var oförändrade.
- Formatering, ESLint, typkontroll, båda byggena, 50 snabba tester, fem
  integrationstester och 45 browsertester passerade. Sju plattformsberoende
  browsertester hoppades över enligt testernas villkor. En befintlig preview
  använde port 4178, så browsertesterna kördes med samma inställningar på 4189.
- [Källrepots CI på `main`](https://github.com/dntoll/spacelords/actions/runs/39101924167)
  lyckades för den publicerade klientrevisionen.
- Före publiceringen hittade befintligt regressionstest för
  `viewport-game-layout` att större systemtypsnitt vid 320 pixlars bredd kunde
  bredda hela appen. Felet reproducerades före rättningen och testet passerade
  därefter i Chromium och WebKit.
- PR-integrationen gav HTTP 403. Den dokumenterade reservvägen användes:
  granskad arbetsbranch och vanlig fast-forward-push via befintlig SSH.
- [Pages-körningen](https://github.com/dntoll/dntoll.github.io/actions/runs/39101956647)
  lyckades. Livekontrollen verifierade att `/spacelords` leder till
  `/spacelords/` och att HTML, JavaScript och CSS gav HTTP 200 med rätt
  innehållstyper och exakt samma innehåll som bygget.
- En mobil Chromium-kontroll av liveadressen visade karta och planetvy utan
  JavaScriptfel eller HTTP-fel. Klientresurserna hämtades enbart under
  `/spacelords/assets/`.
- Kontrollsummorna för `/`, `/MachineBloom/`, `/Defence-Grid/test/`,
  `/styles.css` och `/i18n.js` var identiska före och efter publiceringen.
  Inga länkar, navigationsval, DNS- eller Pages-inställningar ändrades.

## Driftsättning av byggkö: 2026-10-18

- Publicerad klientrevision: `b0c4f95ed8df52d896b38c4659a6990e505d6a02`
  från arbetsbranchen `codex/game-viewport-and-english` i `dntoll/spacelords`.
- Målrepots tidigare revision: `4b56017a558b7c407c26a71ad1394be02c25014e`.
- Deploycommit: `1622a70d50e173e5a7ec1d525f548126c874642d` på arbetsbranchen
  `codex/deploy-spacelords-b0c4f95`, publicerad till målrepots `main`.
- Endast `spacelords/` ändrades. Klientens tre filer motsvarar exakt det
  verifierade Pages-bygget; samtliga 281 övriga webbplatsfiler är oförändrade.
- Formatering, lint, typkontroll, båda byggena, 62 snabba tester, fem
  integrationstester och 49 browsertester passerade. Sju plattformsberoende
  browsertester hoppades över enligt deras villkor. Två ytterligare mobiltester
  passerade mot den isolerade publiceringskopian. Samma två mobiltester
  passerade därefter mot liveadressen: skärmfyllande karta samt beställning,
  omordning och skeppsleverans till vald flotta.
- PR-integrationen gav HTTP 403. Den dokumenterade reservvägen användes efter
  förnyad kontroll mot aktuell `origin/main`: vanlig fast-forward-push via SSH.
- [Pages-körningen](https://github.com/dntoll/dntoll.github.io/actions/runs/39114648492)
  lyckades. Publicerad HTML, JavaScript och CSS gav HTTP 200 med rätt
  innehållstyper och exakt samma innehåll som bygget. `/spacelords` leder till
  `/spacelords/`.
- Kontrollsummorna för `/`, `/MachineBloom/`, `/Defence-Grid/test/`,
  `/styles.css` och `/i18n.js` är identiska före och efter publiceringen.
  Inga länkar, navigationsval, DNS- eller Pages-inställningar ändrades.

## Driftsättning av byggplatser och forskning: 2026-10-18

- Publicerad klientrevision: `c0672e5ea610cfba137264ea851d47c858f680cd`
  från `codex/game-viewport-and-english` i `dntoll/spacelords`.
  Versionen innehåller separata flottmarkörer, byggplatser, fabriksköer,
  fabriksforskning och kolonisation.
- Målrepots tidigare revision: `1622a70d50e173e5a7ec1d525f548126c874642d`.
- Deploycommit: `9f7e388244ce246454b40f57a7f3b01ed872983f` på
  `codex/deploy-spacelords-c0672e5`, publicerad till målrepots `main`.
- Endast de tre klientfilerna under `spacelords/` ändrades och de motsvarar
  exakt Pages-bygget. Samtliga 281 övriga filers Git-objekt är oförändrade.
  Den isolerade publiceringskopians startsidor och rotresurser motsvarar
  kontrollsummorna från den befintliga webbplatsen före publiceringen.
- Node.js 24, `npm ci` och hela `npm run check` passerade: formatering, lint,
  typkontroll, båda byggena, 80 snabba tester, fem integrationstester och
  49 browsertester. Sju plattformsberoende browsertester hoppades över enligt
  deras villkor. [Källrevisionens CI](https://github.com/dntoll/spacelords/actions/runs/39130489749)
  lyckades också.
- Två mobiltester passerade både mot publiceringskopian och liveadressen:
  karta samt hela kedjan Research station, fabriksforskning, skeppsproduktion
  till vald flotta och kolonisation av Vesta.
- PR-integrationen gav HTTP 403. Efter ny kontroll av `origin/main`,
  föräldrarelation och avgränsad diff användes instruktionens reservväg:
  vanlig fast-forward-push via befintlig SSH-autentisering.
- [Pages-körningen](https://github.com/dntoll/dntoll.github.io/actions/runs/39135203054)
  lyckades. Publicerad HTML, JavaScript och CSS motsvarar exakt bygget.
  Klientresurserna gav HTTP 200 med rätt innehållstyper under
  `/spacelords/assets/`. `/spacelords` leder till `/spacelords/`.
- Kontrollsummorna för `/`, `/MachineBloom/`, `/Defence-Grid/test/`,
  `/styles.css` och `/i18n.js` är identiska före och efter publiceringen.
  Inga länkar, navigationsval, DNS- eller Pages-inställningar ändrades.

## Referenser

- [Vite: statisk driftsättning och basadress](https://vite.dev/guide/static-deploy.html)
- [GitHub Pages: statisk hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages: publiceringskälla och tokenbegränsningar](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Vite: publika miljövariabler](https://vite.dev/guide/env-and-mode.html)

## Driftsättning av sparplatser, Fleet builder och händelsekonsol: 2026-10-19

- Publicerad klientrevision: `64abd0038dab84c155bc39e271eb1aeb09f74108`
  från `codex/game-viewport-and-english` i den lokala källkopian.
- Målrepots tidigare revision: `9f7e388244ce246454b40f57a7f3b01ed872983f`.
- Deploycommit: `6b78833e810f8d0f0f19ffd8bbace537b941bc89` på
  `codex/deploy-spacelords-64abd00`, publicerad till målrepots `main`.
- Endast `spacelords/` ändrades. Samtliga 281 övriga filers Git-objekt är
  oförändrade. Publiceringskopians befintliga sidor motsvarade liveinnehållet
  med hänsyn till lokala Windows-radslut.
- `npm ci` och hela `npm run check` passerade: formatering, lint,
  typkontroll, båda byggena, 141 snabba tester, fem integrationstester och
  106 browsertester. Tio plattformsberoende browsertester hoppades över enligt
  testernas villkor. Den ursprungliga Node-miljön var 24.7.0; snabbsviten,
  Pages-bygget och integrationstesterna verifierades även med Node 24.19.0.
- Sju mobiltester passerade mot både publiceringskopian och liveadressen:
  Fleet builder, forskning/produktion/kolonisation, sparplatser,
  händelsekonsolen i tre skärmstorlekar samt skärmfyllande karta.
- PR-integrationen gav HTTP 403. Instruktionens reservväg användes efter
  förnyad kontroll av aktuell `origin/main`, föräldrarelation och avgränsad diff:
  vanlig fast-forward-push via befintlig SSH-autentisering.
- [Pages-körningen](https://github.com/dntoll/dntoll.github.io/actions/runs/39268463313)
  lyckades. Alla tio publicerade klientfiler gav HTTP 200, rätt innehållstyper
  och exakt samma byteinnehåll som Pages-bygget. `/spacelords` leder vidare
  till `/spacelords/`.
- Kontrollsummorna för `/`, `/MachineBloom/`, `/Defence-Grid/test/`,
  `/styles.css` och `/i18n.js` var identiska före och efter publiceringen.
  Inga länkar, navigationsval, DNS- eller Pages-inställningar ändrades.

## Driftsättning av resursutvinning, handelsnät och beslut: 2026-10-19

- Publicerad klientrevision: `c04132e1fc43b7c238be9d85da1c76fb11f0640d`
  från `codex/resource-logistics-decisions` i `dntoll/spacelords`.
  Källrepots `main` och den tidigare arbetsbranchen är oförändrade.
- Målrepots tidigare revision: `6b78833e810f8d0f0f19ffd8bbace537b941bc89`.
  Publicerad deployrevision: `b6dfc1e1014a3c61b67c00ca0f4f75156aa8b56c`
  på `codex/deploy-spacelords-logistics-20261019`. Publiceringsändringen
  består av två sammanhängande appcommits, `e42ef63` och `b6dfc1e`.
- Endast `spacelords/` ändrades. Samtliga 281 övriga webbplatsfilers Git-objekt
  är oförändrade. Alla elva klientfiler och appens startsida motsvarar exakt
  det verifierade Pages-bygget, även hämtade från liveadressen med rätt
  innehållstyper. `/spacelords` ger HTTP 301 till `/spacelords/`.
- Ren beroendeinstallation och hela `npm run check` passerade: formatering,
  ESLint, typkontroll, båda byggena, 156 snabba tester inom 20 sekunder,
  fem integrationstester och 114 browsertester. Tio plattformsberoende
  browsertester hoppades över enligt sina villkor. Installationen rapporterade
  inga kända sårbarheter.
- [Källrevisionens CI](https://github.com/dntoll/spacelords/actions/runs/39305920143)
  lyckades. Föregående CI-körning hittade att Linux/WebKits fontmått kunde
  få mobilnavigationen att ta för stor höjd. Felet verifierades före
  CSS-rättningen; ett ytterligare fontregressionstest och det ursprungliga
  kravet på minst 80 procents kartyta passerar nu.
- Sex mobiltester passerade mot både den isolerade publiceringskopian och
  liveadressen i Chromium och WebKit. De följer hela kedjan från nytt spel
  via utvinning, forskningskö, fabriker och kolonisation till ett automatiskt
  försörjt bygge och återupptagen rutt efter omladdning. Kartans yta och
  alternativa fontmått kontrolleras samtidigt.
- PR-integrationen gav HTTP 403. Efter ny kontroll av aktuell `origin/main`,
  föräldrarelation, ren checkout och avgränsad diff användes instruktionens
  reservväg: vanlig fast-forward-push med befintlig SSH-autentisering.
  Ingen force-push eller behörighetsändring gjordes.
- [Pages-körningen](https://github.com/dntoll/dntoll.github.io/actions/runs/39306957969)
  lyckades. Kontrollsummorna för `/`, `/MachineBloom/`, `/Defence-Grid/test/`,
  `/styles.css` och `/i18n.js` är identiska före och efter publiceringen.
  Inga länkar, navigationsval, DNS- eller Pages-inställningar ändrades.
- `engangsreset-ekonomi`: äldre version 1-sparplatser raderas en gång när
  den nya klienten öppnas, enligt uttryckligt användarbeslut för denna leverans.
  Version 2-spel bevaras vid omladdning. Framtida uppdateringar får inte anta
  tillåtelse att radera spel. Piratrån och eskortskydd ingår inte ännu.

För att återställa hela föregående publicerade version: återställ enbart
`spacelords/` från `6b78833e810f8d0f0f19ffd8bbace537b941bc89` på en ny branch
från aktuell `main`, med samma avgränsade gransknings- och publiceringsflöde.
Att enbart revertera den sista CSS-committen återställer inte den gamla ekonomin.

## Driftsättning av gemensam byggkö, komponenter och förstärkningar: 2026-10-20

- Publicerad klientrevision: `1af48d2e3eaf6c219c8455d88efaa9e23a787577`
  från `codex/resource-logistics-decisions` i `dntoll/spacelords`.
  Även föregående funktionscommit `04acf91` ingår. Källrepots `main` är
  oförändrad; ändringarna har pushats till testbranchen.
- Målrepots tidigare revision: `b6dfc1e1014a3c61b67c00ca0f4f75156aa8b56c`.
  Deploycommit: `a7d4e32250bd3817946794162cdcb50f3372b280` från
  `codex/deploy-spacelords-1af48d2`, publicerad till målrepots `main`.
  Endast `spacelords/` ändrades. Samtliga 281 övriga webbplatsfilers Git-objekt
  är oförändrade, även jämfört med aktuell `origin/main` före publiceringen.
- Ren installation med Node.js 24.19.0 och hela `npm run check` passerade:
  formatering, ESLint, typkontroll, båda byggena, 180 snabba tester på
  7,21 sekunder, fem integrationstester och 122 browsertester. Tio
  plattformsberoende browsertester hoppades över enligt sina villkor.
  Installationen rapporterade inga kända sårbarheter.
- [Källrevisionens CI](https://github.com/dntoll/spacelords/actions/runs/39370612412)
  och [Pages-körningen](https://github.com/dntoll/dntoll.github.io/actions/runs/39371112422)
  lyckades. PR-integrationen gav HTTP 403. Instruktionens reservväg användes
  efter förnyad kontroll av aktuell `origin/main`, föräldrarelation, ren
  publiceringskopia och avgränsad diff: vanlig fast-forward-push via befintlig
  SSH-autentisering. Ingen force-push eller behörighetsändring gjordes.
- Tio mobiltester passerade både mot hela den isolerade publiceringskopian och
  liveadressen i Chromium och WebKit. De verifierar en gemensam Build queue,
  forskning av komponentfabriker, automatiska delorder före Fighter, sparning,
  förstärkningar som hinner ifatt rörliga flottor, flottans Trade route och
  automatisk försörjning genom handelsnätet. Kartans yta och alternativa
  fontmått kontrolleras också.
- Alla elva publicerade klientfiler gav HTTP 200 med rätt innehållstyper och
  exakt samma byteinnehåll som Pages-bygget och de granskade Git-objekten.
  `/spacelords` ger HTTP 301 till `/spacelords/`. Separata mobilkontroller av
  nytt spel, karta och planetvy gav inga JavaScript- eller HTTP-fel och inga
  anrop till rotens `/assets/` eller `/api/`.
- Kontrollsummorna för `/`, `/MachineBloom/`, `/Defence-Grid/test/`,
  `/styles.css` och `/i18n.js` var identiska före och efter publiceringen.
  Inga länkar, navigationsval, DNS- eller Pages-inställningar ändrades.
- Befintliga version 2-spel migreras utan radering till den gemensamma kön.
  Nya sparningar har version 3. Vid återställning av klienten till föregående
  publicering måste sparningarna säkerhetskopieras och kompatibiliteten
  hanteras separat: den äldre klienten kan inte läsa version 3.

För att återställa föregående klientbygge: återställ enbart `spacelords/` från
`b6dfc1e1014a3c61b67c00ca0f4f75156aa8b56c` på en ny branch från aktuell
`main`, med samma avgränsade gransknings- och publiceringsflöde. Detta återställer
inte automatiskt version 3-sparningar till det äldre formatet.

## Driftsättning av handelsgraf och kompakta spelkontroller: 2026-10-20

- Publicerad klientrevision: `e25cd07` från `codex/trade-route-graph` i
  `dntoll/spacelords`. Källändringen är pushad; källrepots `main` är oförändrad.
- Målrepots tidigare revision: `a7d4e32250bd3817946794162cdcb50f3372b280`.
  Deploycommit: `2299125cc04ce41e263ff4f6cf2e569bd4acd34a` från
  `codex/deploy-spacelords-e25cd07`, publicerad till målrepots `main`.
- Endast `spacelords/` ändrades. Samtliga 281 övriga webbplatsfilers Git-objekt
  är oförändrade. Aktuell `origin/main`, föräldrarelation, ren publiceringskopia
  och avgränsad diff verifierades före publiceringen.
- Ren installation med Node.js 24.19.0 och hela `npm run check` passerade:
  formatering, ESLint, typkontroll, båda byggena, 203 snabba tester inom
  20 sekunder, fem integrationstester och 175 webbläsartester. De 25
  plattformsberoende testerna hoppades över enligt sina villkor.
- [Källrevisionens CI](https://github.com/dntoll/spacelords/actions/runs/39447723910)
  och [Pages-körningen](https://github.com/dntoll/dntoll.github.io/actions/runs/39449229505)
  lyckades. PR-integrationen gav HTTP 403. Instruktionens reservväg användes:
  vanlig fast-forward-push med befintlig SSH-autentisering, utan force-push
  eller ändrade behörigheter.
- Fyra mobilkontroller passerade mot både hela publiceringskopian och
  liveadressen i Chromium och WebKit. De verifierar val av planeter och flottor,
  tilldelning och frigörande, sparning samt ruttflottornas ankare vid ruttens
  mittpunkt och verkliga position i detaljpanelen.
- Alla elva publicerade klientfiler motsvarar exakt det verifierade bygget.
  `/spacelords` leder vidare till `/spacelords/`. Kontrollsummorna för `/`,
  `/MachineBloom/`, `/Defence-Grid/test/`, `/styles.css` och `/i18n.js` är
  identiska före och efter publiceringen. Inga länkar, navigationsval, DNS-
  eller Pages-inställningar ändrades.

## Driftsättning av flotthantering på Star map: 2026-10-21

- Publicerad klientrevision: `c67a8f3668c54c02cc220622d2a594578faea2c6`
  från `codex/fleet-map-plan` i `dntoll/spacelords`. Källändringarna är
  pushade till arbetsbranchen; källrepots `main` är oförändrad.
- Målrepots tidigare revision: `2299125cc04ce41e263ff4f6cf2e569bd4acd34a`.
  Deploycommit: `c38283c3ea86b536970215d32baa74038a72698b` från
  `codex/deploy-spacelords-c67a8f3`, publicerad till målrepots `main`.
  Endast `spacelords/` ändrades. Alla elva klientfiler motsvarar exakt bygget
  och samtliga 281 övriga webbplatsfilers Git-objekt är oförändrade.
- Ren installation och hela `npm run check` passerade: formatering, ESLint,
  typkontroll, båda byggena, 250 snabba tester på 11,59 sekunder,
  fem integrationstester och 198 webbläsartester. De 22 plattformsberoende
  testerna hoppades över enligt sina villkor.
- [Källrevisionens CI](https://github.com/dntoll/spacelords/actions/runs/39623295682)
  passerade kvalitetskontrollerna, snabbsviten, byggena och integrationstesterna,
  men det utökade jobbet avbröts vid tiominutersgränsen utan rapporterade
  testfel. `96a4a97` höjer jobbets tidsgräns till 20 minuter utan ändrad
  klientkod. [Omkörningen](https://github.com/dntoll/spacelords/actions/runs/39625205414)
  pågår vid liveverifieringen; dess slutresultat är ännu inte bekräftat.
  Den lokala fullständiga körningen och publiceringskontrollerna är godkända.
- PR-integrationen gav HTTP 403. Efter ny kontroll av aktuell `origin/main`,
  föräldrarelation, ren publiceringskopia och avgränsad diff användes
  instruktionens reservväg: vanlig fast-forward-push med befintlig SSH.
  Ingen force-push eller behörighetsändring gjordes.
- [Pages-körningen](https://github.com/dntoll/dntoll.github.io/actions/runs/39625295603)
  lyckades. Alla elva publicerade klientfiler gav HTTP 200, rätt innehållstyper
  och exakt samma byteinnehåll som bygget. `/spacelords` ger HTTP 301 till
  `/spacelords/`.
- Fyra mobilkontroller passerade både mot hela publiceringskopian och
  liveadressen i Chromium och WebKit. De verifierar New fleet från en olastad
  Trade fleet, bibehållet ruttuppdrag, lastspärr, sparning, återupptagning,
  kartpanelen och skärmytan utan JavaScript- eller HTTP-fel. Klientanrop till
  rotens `/assets/` eller `/api/` förekom inte.
- Kontrollsummorna för `/`, `/MachineBloom/`, `/Defence-Grid/test/`,
  `/styles.css` och `/i18n.js` är identiska före och efter publiceringen.
  Samma innehåll verifierades via HTTP i publiceringskopian. Inga länkar,
  navigationsval, DNS- eller Pages-inställningar ändrades.

Återställ vid behov enbart `spacelords/` från
`2299125cc04ce41e263ff4f6cf2e569bd4acd34a` på en ny branch från aktuell
`main`, med samma granskade publiceringsflöde.

## Driftsättning av mobilkarta och Research: 2026-10-21

- Publicerad klientrevision: `b763f47e487b5f8b9f5f80b497b2a0e85f7e1309`
  från `codex/mobile-map-selection` i `dntoll/spacelords`. Källändringarna är
  pushade till arbetsbranchen; källrepots `main` är oförändrad.
- Målrepots tidigare revision: `c38283c3ea86b536970215d32baa74038a72698b`.
  Publiceringsrevision: `5d0a7917af3c7ac0b452fa998031b1e8b13b0841` från
  `codex/deploy-spacelords-0d43c45`. Den omfattar appcommits `8d8e8fb` och
  `5d0a791`. Endast `spacelords/` ändrades; samtliga 281 övriga filers
  Git-objekt och publiceringskopians filinnehåll är oförändrade.
- Ren installation och hela `npm run check` passerade: formatering, ESLint,
  typkontroll, båda byggena, 259 snabba tester på 14,75 sekunder,
  fem integrationstester och 214 webbläsartester. De 22 plattformsberoende
  testerna hoppades över enligt sina villkor.
- GitHub CI hittade därefter att stationsantalet kunde radbrytas under Research
  vid 320 pixlars bredd med Linuxmiljöns fontmått. Ett nytt regressionstest med
  bredare typsnitt reproducerade felet före rättningen. Efter CSS-rättningen
  passerade samtliga 16 Research-layouttester i fyra webbläsarprofiler,
  formatering, lint, typkontroll, båda byggena och fem integrationstester.
- Två mobilkontroller passerade mot den isolerade publiceringskopian i Chromium
  och WebKit: kartval, dolda och synliga rundkontroller, Research, forskningskö
  och Decisions. Skärmbilder granskades. Inga JavaScript- eller HTTP-fel,
  rotanrop till `/assets/` eller `/api/`, eller dokumentöverflöden påvisades.
  WebKit fastnade vid sidladdning på separat testport 4190; samma kopia och
  tester passerade på den ordinarie testporten 4178.
- PR-integrationen gav HTTP 403. Efter ny kontroll av aktuell `origin/main`,
  föräldrarelation, ren publiceringskopia och avgränsad diff användes den
  dokumenterade reservvägen: vanlig fast-forward-push via befintlig SSH.
  Ingen force-push eller behörighetsändring gjordes.
- [Pages-körningen](https://github.com/dntoll/dntoll.github.io/actions/runs/39657359401)
  lyckades. Samtliga elva publicerade klientfiler gav HTTP 200, rätt
  innehållstyper och exakt samma byteinnehåll som Pages-bygget.
  `/spacelords` leder vidare till `/spacelords/`.
- Samma två mobilkontroller passerade mot liveadressen i Chromium och WebKit,
  utan JavaScript- eller HTTP-fel. Kontrollsummorna för `/`, `/MachineBloom/`,
  `/Defence-Grid/test/`, `/styles.css` och `/i18n.js` är identiska före och
  efter publiceringen. Inga länkar, navigationsval, DNS- eller
  Pages-inställningar ändrades.
- [Källrevisionens CI](https://github.com/dntoll/spacelords/actions/runs/39657106395)
  har passerat kvalitetskontroller och snabbtester; det utökade jobbet pågår
  vid liveverifieringen. Dess slutresultat är ännu inte bekräftat. Den lokala
  fullständiga körningen, den riktade omkörningen efter CSS-rättningen och
  publiceringskontrollerna är godkända.

Återställ vid behov enbart `spacelords/` från
`c38283c3ea86b536970215d32baa74038a72698b` på en ny branch från aktuell
`main`, med samma granskade publiceringsflöde.

## Driftsättning av rullningsbar kartpanel: 2026-10-22

- Publicerad klientrevision: `31bbf7b9eda6a27a4b406de485d26cfa72114939`
  från `codex/mobile-map-selection` i `dntoll/spacelords`. Arbetsbranchen är
  pushad; källrepots `main` är oförändrad.
- Målrepots tidigare revision: `5d0a7917af3c7ac0b452fa998031b1e8b13b0841`.
  Deploycommit: `fc8d32f41614e7dd3b5cc9d6a66ad33e1f9969d5` från
  `codex/deploy-spacelords-31bbf7b`, publicerad till målrepots `main`.
  Endast `spacelords/` ändrades. Samtliga 281 andra filers Git-objekt är
  oförändrade, verifierat mot aktuell `origin/main` före publiceringen.
- Formatering, ESLint, typkontroll, båda byggena, 262 snabba tester på
  13,50 sekunder och fem integrationstester passerade. Webbläsarsvitens
  226 aktiva testfall passerade efter riktade omkörningar; 22
  plattformsberoende fall hoppades över. Testerna anpassades till att Playwright
  saknar native mushjul i mobil WebKit och till panelens begränsade tillväxt
  med kort innehåll. Ett befintligt förstärkningstest nådde 30-sekundersgränsen
  i full körning och passerade isolerat på 16,1 sekunder.
- Åtta paneltester passerade mot både den isolerade publiceringskopian och
  liveadressen i Chromium och WebKit för telefon, surfplatta och dator. De verifierar hex- och flottval,
  växande panel, åtkomst till botteninnehållet, återgång vid toppen,
  bibehållen kamera och frånvaro av dokumentöverflöde. Native fingersvepning
  verifierades också i emulerad Android/Chromium före publiceringen.
- PR-integrationen gav HTTP 403. Den dokumenterade reservvägen användes efter
  kontroll av ren checkout, föräldrarelation och avgränsad diff: vanlig
  fast-forward-push via befintlig SSH, utan force-push eller behörighetsändring.
- [Pages-körningen](https://github.com/dntoll/dntoll.github.io/actions/runs/39852815446)
  lyckades. Alla elva publicerade klientfiler gav HTTP 200, rätt innehållstyper
  och exakt samma byteinnehåll som Pages-bygget. `/spacelords` leder vidare
  till `/spacelords/`.
- Kontrollsummorna för `/`, `/MachineBloom/`, `/Defence-Grid/test/`,
  `/styles.css` och `/i18n.js` är identiska före och efter publiceringen.
  Inga länkar, navigationsval, DNS- eller Pages-inställningar ändrades.
- [Källrevisionens CI](https://github.com/dntoll/spacelords/actions/runs/39852106833)
  pågår vid liveverifieringen; dess slutresultat är ännu inte bekräftat.

Återställ vid behov enbart `spacelords/` från
`5d0a7917af3c7ac0b452fa998031b1e8b13b0841` på en ny branch från aktuell
`main`, med samma granskade publiceringsflöde.

## Rättning av förstoring före rullning: 2026-10-23

- Publicerad klientrevision: `3b00aec20bcd0859ad6837d97a62400beb7477bc`
  från `codex/mobile-map-selection`. Ändringen är pushad; källrepots `main`
  är oförändrad. Kravet `rullningsbar-kartpanel` förtydligas: rörelsen förstorar
  först panelen utan att ändra innehållets rullningsläge. Först vid maximal
  höjd rullas resterande rörelse. Vid återgång rullas innehållet till toppen
  innan panelen krymper.
- Målrepots tidigare revision: `fc8d32f41614e7dd3b5cc9d6a66ad33e1f9969d5`.
  Deploycommit: `bacb505497f817f7072aa669707686e7545c475e` från
  `codex/deploy-spacelords-expand-first`, publicerad till målrepots `main`.
  Endast appens HTML och JavaScript ändrades under `spacelords/`.
  Samtliga 281 övriga webbplatsfilers Git-objekt är oförändrade.
- Regressionstester reproducerade felet före rättningen. Formatering, ESLint,
  typkontroll, båda byggena, 265 snabba tester på 13,50 sekunder och fem
  integrationstester passerade. Den riktade utökade körningen omfattade
  kartpanel, flottval, långa listor och flottadministration: 38 tester
  passerade i Chromium och WebKit; sex plattformsberoende tester hoppades över.
- Nio paneltester passerade mot både den isolerade publiceringskopian och
  liveadressen, med tre plattformsberoende överhoppningar per körning. Native Android/Chromium-svepning
  verifierar att innehållet står stilla under förstoringen och först rullas
  när höjden inte kan öka mer. Enhetstester täcker även återgång, kort innehåll,
  tangentbord, avbruten kontakt, fler fingrar och opåverkad skeppsflytt.
- PR-integrationen gav HTTP 403. Den dokumenterade reservvägen användes efter
  kontroll av aktuell `origin/main`, föräldrarelation, ren checkout och diff:
  vanlig fast-forward-push med befintlig SSH, utan force-push.
- [Pages-körningen](https://github.com/dntoll/dntoll.github.io/actions/runs/39907824130)
  lyckades. Samtliga elva livefiler gav HTTP 200, rätt innehållstyper och
  identiskt byteinnehåll med Pages-bygget. `/spacelords` leder vidare till
  `/spacelords/`. Kontrollsummorna för `/`, `/MachineBloom/`,
  `/Defence-Grid/test/`, `/styles.css` och `/i18n.js` är oförändrade.
  Inga länkar, navigationsval, DNS- eller Pages-inställningar ändrades.
- [Källrevisionens CI](https://github.com/dntoll/spacelords/actions/runs/39907705543)
  pågår vid liveverifieringen; slutresultatet är ännu inte bekräftat.

Återställ vid behov enbart `spacelords/` från
`fc8d32f41614e7dd3b5cc9d6a66ad33e1f9969d5` på en ny branch från aktuell
`main`, med samma granskade publiceringsflöde.

## Driftsättning av automatiska delorder: 2026-10-23

- Publicerad klientrevision: `aa57c5c5f2dac78fe5d214a1512b4ac6d3450c37`
  från `codex/network-component-orders`. Arbetsbranchen är pushad;
  källrepots `main` är oförändrad. Publiceringen omfattar automatiska
  delorder genom handelsrutter och reservation av leveranser under planeringen.
- Målrepots tidigare revision: `bacb505497f817f7072aa669707686e7545c475e`.
  Deploycommit: `87adc361d7a397abac6f6a0f935aca42173d03c1` från
  `codex/deploy-spacelords-aa57c5c`, publicerad till målrepots `main`.
  Endast appens HTML och JavaScript ändrades under `spacelords/`.
  Samtliga 281 övriga webbplatsfilers innehåll och Git-objekt är oförändrade.
- Ren installation och verifiering kördes i en separat källkopia eftersom
  en laddad beroendefil var låst i arbetskatalogen. Arbetskatalogens beroenden
  återställdes därefter till låsfilens exakta versioner. Formatering, ESLint,
  typkontroll, båda byggena, 299 snabba tester på 15,19 sekunder och fem
  integrationstester passerade.
- Ett befintligt test för `rullningsbar-kartpanel` reproducerade ett felaktigt
  antagande: kort innehåll ryms helt efter förstoring och behöver då inte
  rullas. Sveptestet använder nu samma långa flottlista som övriga paneltester.
  Felet verifierades före testrättningen; förstoring före rullning passerade
  därefter med native Android/Chromium-inmatning. Spelmekaniken ändrades inte.
- [Källrevisionens CI](https://github.com/dntoll/spacelords/actions/runs/39976804939)
  lyckades före publiceringen. Den utökade sviten passerade 235 aktiva
  webbläsartester; 25 plattformsberoende fall hoppades över enligt sina villkor.
- Samma 25 riktade tester passerade mot både den isolerade publiceringskopian
  och liveadressen i Chromium och WebKit för telefon, surfplatta och dator.
  Tre plattformsberoende fall hoppades över per körning. Testerna verifierar
  kartpanel, delproduktion via handelsrutter, avvisade delorder, sparade spel
  och leveransstatus i Supply & production.
- PR-integrationen gav HTTP 403. Efter ny kontroll av aktuell `origin/main`,
  föräldrarelation, ren publiceringskopia och avgränsad diff användes den
  dokumenterade reservvägen: vanlig fast-forward-push med befintlig SSH,
  utan force-push eller behörighetsändring.
- [Pages-körningen](https://github.com/dntoll/dntoll.github.io/actions/runs/39979084581)
  lyckades. Samtliga elva publicerade klientfiler gav HTTP 200, rätt
  innehållstyper och exakt samma byteinnehåll som Pages-bygget.
  `/spacelords` leder vidare till `/spacelords/`.
- Separata mobilkontroller av navigation och rendering passerade i Chromium
  och WebKit mot både förhandsvisningen och liveadressen. Skärmbilder granskades;
  inga JavaScript- eller HTTP-fel, rotanrop till `/assets/` eller `/api/`,
  eller dokumentöverflöden påvisades.
- Kontrollsummorna för `/`, `/MachineBloom/`, `/Defence-Grid/test/`,
  `/styles.css` och `/i18n.js` är identiska före och efter publiceringen.
  Inga länkar, navigationsval, DNS- eller Pages-inställningar ändrades.

Återställ vid behov enbart `spacelords/` från
`bacb505497f817f7072aa669707686e7545c475e` på en ny branch från aktuell
`main`, med samma granskade publiceringsflöde.

## Driftsättning av kompakta flottkort: 2026-10-23

- Publicerad klientrevision: `9f52ff639328c5816398edc6d52c1ca964b5a739`
  från `codex/compact-fleet-cards`. Arbetsbranchen är pushad; källrepots
  `main` är oförändrad. Star map och Fleets visar mindre skeppsrutor och
  tätare flottkort enligt `kompakta-flottkort`.
- Målrepots tidigare revision: `87adc361d7a397abac6f6a0f935aca42173d03c1`.
  Deploycommit: `17179cf6b9d2096b49ca963db688f4de6d4bfc11` från
  `codex/deploy-spacelords-9f52ff6`, publicerad till målrepots `main`.
  Endast `spacelords/` ändrades. Samtliga 281 övriga webbplatsfiler är
  oförändrade; publiceringskopians klientfiler matchar Pages-bygget exakt.
- [Källrevisionens CI](https://github.com/dntoll/spacelords/actions/runs/40017168349)
  lyckades före publiceringen: ren installation, formatering, ESLint,
  typkontroll, båda byggena, 299 snabba tester, fem integrationstester och
  239 webbläsartester. De 25 plattformsberoende fallen hoppades över enligt
  sina villkor. Lokalt passerade även 25 riktade tester för flottadministration
  och layout, med tre plattformsberoende överhoppningar.
- Åtta layouttester passerade mot både den isolerade publiceringskopian och
  liveadressen i Chromium och WebKit på mobil, surfplatta och dator. De
  verifierar kompakta flottkort, skeppsrader, pekytor, destinationsval,
  långa flottlistor och åtkomst till vald flotta.
- PR-integrationen gav HTTP 403. Efter kontroll av aktuell `origin/main`,
  föräldrarelation, ren publiceringskopia och avgränsad diff användes den
  dokumenterade reservvägen: vanlig fast-forward-push med befintlig SSH,
  utan force-push eller behörighetsändring.
- [Pages-körningen](https://github.com/dntoll/dntoll.github.io/actions/runs/40019086571)
  lyckades. Alla elva livefiler gav HTTP 200, rätt innehållstyper och exakt
  samma byteinnehåll som bygget. `/spacelords` leder till `/spacelords/`.
- Kontrollsummorna för `/`, `/MachineBloom/`, `/Defence-Grid/test/`,
  `/styles.css` och `/i18n.js` är identiska före och efter publiceringen.
  Inga länkar, navigationsval, DNS- eller Pages-inställningar ändrades.

Återställ vid behov enbart `spacelords/` från
`87adc361d7a397abac6f6a0f935aca42173d03c1` på en ny branch från aktuell
`main`, med samma granskade publiceringsflöde.
