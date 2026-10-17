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

## Referenser

- [Vite: statisk driftsättning och basadress](https://vite.dev/guide/static-deploy.html)
- [GitHub Pages: statisk hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages: publiceringskälla och tokenbegränsningar](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Vite: publika miljövariabler](https://vite.dev/guide/env-and-mode.html)
