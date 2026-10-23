# Driftsättning av Spacelords

Denna instruktion ska läsas inför varje driftsättning. Den beskriver en framtida
publicering; att instruktionen finns eller att CI bygger appen publicerar inget.

## Mål och nuläge

- Publik appadress: `https://curiousengineerstudio.se/spacelords/`. Adressen utan
  avslutande snedstreck ska leda till katalogens startsida; verifiera detta efter
  den första publiceringen.
- Målrepo: `dntoll/dntoll.github.io`, katalogen `spacelords/` i repots rot.
- Källa: `dntoll/spacelords`. Publicera **endast innehållet i `dist/pages/`**.
- 2026-10-17: den publika webbplatsen visar Curious Engineer Studio och Machine
  Bloom. Målrepots README anger GitHub Pages från `main`. Rotens `CNAME` innehåller
  `curiousengineerstudio.se`, och `.nojekyll` finns redan. Andra appar har egna
  underkataloger. Ingen `spacelords/` syntes i den granskade lokala katalogstrukturen.
- README och publika filer har granskats; Pages-inställningarna har inte ändrats
  eller administrativt verifierats. Kontrollera aktuell publiceringskälla
  läsande inför första driftsättningen. Om den avviker, utred innan publicering.

Källor till nuläget:
[webbplatsen](https://curiousengineerstudio.se/),
[målrepots README](https://github.com/dntoll/dntoll.github.io/blob/main/README.md),
[CNAME](https://github.com/dntoll/dntoll.github.io/blob/main/CNAME).
Nuläget är daterat, inte en garanti för framtida konfiguration.

## Avgränsning som alltid gäller

Kraven `pages-underkatalog`, `bevara-befintlig-webbplats`,
`direktatkomst-utan-lankar` och `hemlighetsfri-publicering` innebär:

- Endast filer under `spacelords/` får läggas till, ersättas eller tas bort i
  målrepot. Kopiera aldrig ett byggresultat till målrepots rot.
- Bevara startsidan, navigationen, `MachineBloom/`, `Defence-Grid/`, `assets/`,
  rotens `CNAME`, `.nojekyll` och alla andra befintliga filer oförändrade.
- Skapa inga länkar, menyer eller reklam för Spacelords på den befintliga sajten.
- Ändra inte DNS, domän, publiceringsbranch eller Pages-inställningar. Lägg inte
  till ett workflow som ersätter hela den befintliga Pages-webbplatsen.
- Publicera inte `dist/server/`, `src/`, `node_modules/`, `.env`, Git-metadata,
  dokumentation eller autentiseringsmaterial.
- Använd en ren, separat checkout av målrepot. Ändra inte någon annans pågående
  arbete eller en lokal checkout med osparade ändringar.

Ingen ny `CNAME` behövs för en underkatalog på den befintliga domänen. URL:en får
sin sökväg från katalogen `spacelords/`.

## 1. Bygg och verifiera i källrepot

Använd Node.js 24 och kör från roten i `spacelords`:

```sh
npm ci
npm run check
```

`check` kör båda testsviterna och bygger både den lokala Node-versionen och
Pages-klienten. För att enbart upprepa Pages-bygget används:

```sh
npm run build:pages
```

Det kommandot typkontrollerar och bygger med Vites `base=/spacelords/` till
`dist/pages/`, separat från Node-bygget i `dist/client/` och `dist/server/`.
Publiceringsenheten är `dist/pages/index.html` och dess klientresurser, vilka
hamnar direkt i `spacelords/index.html` och `spacelords/assets/` på målwebbplatsen.
Skapa inte en extra nästlad katalog som `spacelords/pages/`.

Integrationstestet `pages-underkatalog` serverar det faktiska bygget under
`/spacelords/` och verifierar HTML, JavaScript, CSS, basadresser och innehållstyper.
Det körs även i befintlig GitHub CI och kräver ingen publiceringsbehörighet.
Testet bevisar att bygget fungerar i underkatalogen, inte att en livepublicering
har genomförts eller att målrepots övriga innehåll är oförändrat.

GitHub Pages serverar statiska filer och kör inte Node/Express. Klienten får
inte förutsätta att `/api/health` eller andra API-adresser finns där. Nuvarande
startsida använder inget API. Ett framtida serverbehov kräver ett separat
driftbeslut. Om klientrouting senare införs måste den hantera denna basadress
och Pages begränsningar; lägg inte en global `404.html` i målrepots rot.

## 2. Förbered en isolerad publiceringsändring

Gör dessa steg först vid en beställd driftsättning. Följande Bash-exempel bygger
på installerade `git`, `rsync` och Node.js. Autentisering sköts av befintlig
credential manager; skriv aldrig in en token i kommandon eller remote-URL.

Från källrepots rot, efter ett godkänt bygge och med alla avsedda källändringar
committade:

```sh
spacelords_build="$(pwd)/dist/pages"
release_id="$(git rev-parse --short HEAD)"
pages_checkout="$(mktemp -d)/dntoll.github.io"
git clone --branch main --single-branch https://github.com/dntoll/dntoll.github.io.git "$pages_checkout"
git -C "$pages_checkout" switch -c "codex/deploy-spacelords-$release_id"
```

Kontrollera först att `dist/pages/index.html` finns och att målrepots aktuella
struktur och publiceringskälla fortfarande stämmer. Om `spacelords/` redan
finns: granska att katalogen tillhör denna app och inte har ändrats av någon
annan. Avbryt vid oväntat innehåll eller symboliska länkar i målkatalogen.

Kopiera därefter endast appens katalog. Snedstrecken och det fasta
`/spacelords/` i destinationen är avsiktliga. `--delete` tar bort gamla byggfiler
enbart i denna katalog och får aldrig riktas mot målrepots rot.

```sh
mkdir -p "$pages_checkout/spacelords"
rsync --archive --delete -- "$spacelords_build/" "$pages_checkout/spacelords/"
git -C "$pages_checkout" add -- spacelords
git -C "$pages_checkout" diff --cached --name-status
git -C "$pages_checkout" diff --cached --stat
git -C "$pages_checkout" diff --cached --check
```

Varje ändrad sökväg måste börja med `spacelords/`. Granska även själva staged
innehållet före commit: det ska enbart vara de byggda publika klientfilerna.
Om en enda annan sökväg har ändrats, avbryt och utred; inkludera den aldrig för
att få igenom en driftsättning. Använd inte `git add .` eller global rensning.

Spara en tydlig, separat deploycommit med källrevisionen:

```sh
git -C "$pages_checkout" commit -m "deploy: publish spacelords $release_id"
```

Förhandsgranska lokalt genom att servera hela denna isolerade checkout med en
statisk webbserver och öppna `/spacelords/`. Kontrollera också att `/` och de
befintliga projekten fortfarande visar samma innehåll. Lägg inte in några länkar
för att hitta appen.

## 3. Publicera genom målrepots befintliga flöde

Publicering sker när den avgränsade ändringen når den befintliga
publiceringsbranchen `main`. En lokal commit eller en PR är inte i sig en
livepublicering. Pusha arbetsbranchen och skapa en PR till målrepots `main` när
driftsättning är beställd. Före merge:

1. Hämta aktuell `origin/main` och uppdatera arbetsbranchen vid behov. Bevara
   andra projekts nytillkomna commits. Om `spacelords/` har ändrats under tiden,
   bygg från avsedd källrevision igen och granska konflikten.
2. Granska PR-diffen igen: den får enbart omfatta `spacelords/`. Gör ingen
   force-push till `main` och ersätt aldrig dess historik.
3. Spara målets tidigare revision och den granskade deploycommitten för eventuell
   återställning. Kontrollera några befintliga publika adresser före publicering.
4. Mergea via målrepots vanliga process när granskningen är klar. Följ dess
   befintliga Pages-körning till lyckad publicering.

### Om PR-integrationen saknar behörighet

Vid en uttryckligen beställd driftsättning kan en granskad arbetsbranch
publiceras med en vanlig fast-forward-push till `main` om befintlig
SSH-autentisering och målrepots regler tillåter det. Detta är reservvägen när
PR inte kan skapas genom den anslutna GitHub-integrationen:

1. Hämta aktuell `origin/main` och kontrollera att den är en förälder till den
   granskade deploycommitten. Om andra commits har tillkommit, uppdatera först
   arbetsbranchen och granska diffen igen.
2. Verifiera att diffen från aktuell `origin/main` enbart omfattar `spacelords/`.
3. Pusha den granskade arbetsbranchens `HEAD` till `main` med en vanlig push,
   aldrig `--force`. Om pushen avvisas, utred och granska igen; kringgå inte
   branchskydd eller ändra behörigheter.
4. Följ befintlig Pages-körning och gör samma kontroller efter publicering.

Arbeta och committa fortsatt på arbetsbranchen. Reservvägen ersätter bara
PR-mergen, inte avgränsningen, granskningen eller verifieringen. Läsning via
HTTPS och push via en befintlig SSH-inloggning kan kombineras; lägg aldrig
nyckelmaterial eller tokens i remote-URL eller dokumentation.

Den här instruktionen inför ingen ny deployment-action och behöver inga
incheckade autentiseringsuppgifter. Om automatisk överföring senare beställs:
håll den begränsad till samma katalog, hantera samtidiga uppdateringar och lägg
autentiseringen i GitHub Actions Secrets. Ett repos `GITHUB_TOKEN` räcker inte
för skrivning till ett annat repo, och pushar med `GITHUB_TOKEN` utlöser inte
branchbaserade Pages-byggen. Välj då en separat, minimalt behörig autentisering
och verifiera den befintliga publiceringstriggern. Återanvänd inte andra projekts
hemligheter och inför inte automatisk publicering som en del av denna guide.

## 4. Kontrollera efter publicering

- Öppna `https://curiousengineerstudio.se/spacelords/` och även adressen utan
  avslutande snedstreck. Verifiera appen och att JavaScript/CSS hämtas under
  `/spacelords/assets/` utan 404 eller begäran mot rotens `/assets/`.
- Verifiera att företagsstartsidan och befintliga projekts tidigare kontrollerade
  adresser är oförändrade. Diffen ska fortfarande bara omfatta `spacelords/`.
- Kontrollera att inga nya navigationslänkar har skapats. Direktadressen fungerar
  ändå. Frånvaron av länkar är inte åtkomstkontroll: innehållet är publikt.
- Anteckna källrevision, deploycommit och utfall utan tokens, miljödumpar eller
  annan känslig information.

Om ett oförändrat gammalt innehåll visas, kontrollera först Pages-körningen och
webbläsarens cache. Försök inte lösa det genom att ändra domän eller DNS.

## Återställning

Skapa en ny branch från målrepots aktuella `main`. Revertera den separata
deploycommitten om den enbart ändrade `spacelords/` och inga senare uppdateringar
av samma katalog riskerar att gå förlorade. Annars återställ just `spacelords/`
från den avsedda tidigare revisionen. Vid första publiceringen kan återställningen
vara att ta bort just appens nya katalog.

Granska att återställningsdiffen enbart omfattar `spacelords/` och publicera via
samma PR- och Pages-flöde. Återställ aldrig hela webbplatsens gamla revision,
använd inte `reset --hard` eller force-push på `main`: andra projekt kan ha
publicerats efter Spacelords.

## Offentliga filer och hemligheter

- Båda repona är publika. Förvara inga lösenord, tokens, privata nycklar,
  anslutningssträngar eller privata personuppgifter i dem, inte heller i exempel.
- Allt i klientbygget kan läsas av besökaren. `VITE_*`-variabler bakas in i
  klientkoden och får aldrig innehålla hemligheter. GitHub Secrets gör inte ett
  värde hemligt om det injiceras i en publik klientbundle.
- Publicera inget annat än granskade klientfiler. Håll sourcemaps avstängda för
  Pages-bygget enligt Vites standard. Kontrollera också framtida statiska
  `public/`-filer, eftersom de kan kopieras till bygget utan bearbetning.
- Skriv inte ut tokens, fullständig miljö eller credential-konfiguration i loggar.
  Om en hemlighet skulle hamna i en publik commit, återkalla/rotera den direkt;
  att bara radera den i en senare commit räcker inte.

## Verifiering vid införandet

2026-10-17 passerade `npm run check`: fem enhetstester och fem integrationstester,
inklusive `pages-underkatalog`, samt bygge, typkontroll, lint och formatering.
En lokal kopieringsrepetition mot en tillfällig kopia av målrepots granskade
revision `75622c6` bevarade samtliga 281 befintliga webbplatsfiler. Bara
`spacelords/` ändrades; även borttagning av en simulerad gammal byggfil hölls
inom den katalogen. Det riktiga målrepot och den publicerade sajten ändrades inte.

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
