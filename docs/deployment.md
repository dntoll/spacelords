# Driftsättning av Spacelords

## GitHub-åtkomst: HTTPS i första hand

Verifierat 2026-10-28: HTTPS fungerar mot GitHub för detta projekt. Använd
`https://github.com/dntoll/spacelords.git` och
`https://github.com/dntoll/dntoll.github.io.git` i första hand, även om den
lokala origin fortfarande är inställd på SSH. Ett SSH-fel innebär inte att
GitHub-åtkomst saknas. Den anslutna GitHub-integrationen kan också användas
via HTTPS när dess verktyg stödjer åtgärden och integrationen har rätt behörighet.

Ett svar som `403 Resource not accessible by integration` är ett
behörighetsfel för integrationen, inte ett fel i HTTPS-transporten.

Skilj på GitHub-åtkomst och lokala filbehörigheter: nekad skrivning till
`.git/index.lock` eller `.git/config` är ett lokalt behörighetsfel som ett
byte av transport inte rättar. Begär inte nya nycklar eller inloggning enbart
på grund av sådana fel. Lagra aldrig åtkomsttoken i repo, URL:er eller loggar.

Läs instruktionen inför varje driftsättning. Äldre leveranser och flöden finns
i git-historiken.

## Branchar och datorer

```
arbetsbranch (claude/x, codex/y) ──work:merge──► development ──release──► main
```

- `main` innehåller bara revisioner som klarat hela sviten. Bara
  `release:finish` flyttar den, alltid med fast-forward.
- `development` är integrationsbranchen. All ny utveckling utgår från den, och
  arbetsbranchar mergas tillbaka med `work:merge`. Den publiceras till den enda
  testdeploymenten.
- Arbetsbranchar har agentens prefix. Release-branchar heter `release/<datum>`.
- Allt finns på origin. Arbetsdatorerna, hemma och på jobbet, används för
  features. Molndatorn (Linux) kör releaser när användaren ber om det.

Inget skript använder force-push. Pushar till `main` och `development` är
vanliga pushar som avvisas om branchen hunnit flytta sig.

## Förberedelser

Använd Node.js 26 (LTS). Installera beroenden med `npm ci` när låsfilen ändrats eller
beroenden saknas. Installera webbläsarna vid behov:

```sh
npx playwright install --with-deps chromium webkit
```

## Normalläge: ändring, snabbtest, merge till development, manuell mobiltest

En vanlig ändringsbeställning ger tillstånd att merga den committade
arbetsbranchen till `development` och publicera, om användaren inte avstår.
Prioritera mobil; användaren testar sedan på sin telefon och kan beställa
ändringar, fler features eller en release.

1. Börja från origin (`gemensam-startpunkt`):

   ```sh
   npm run work:start -- claude/<ämne>
   ```

   Det hämtar origin och skapar branchen från `origin/development`. En ny
   worktree som redan har en egen branch flyttas fram med bara
   `npm run work:start`. Har branchen egna commits på en gammal bas avbryter
   skriptet.

2. Skriv kravkopplade tester för ändrat beteende. Vid bugg ska regressionstestet
   först misslyckas av rätt orsak. Kör relevanta kontroller och committa bara
   avsedda ändringar.

3. Merga och publicera (`integrationsbranch-development`):

   ```sh
   npm run work:merge
   ```

   Kommandot kräver ren arbetsbranch som innehåller senaste
   `origin/development`. Annars avbryter det med instruktion att köra
   `git merge origin/development`, lösa konflikter och försöka igen. Därmed har
   merge-commiten exakt samma träd som den testade arbetsbranchen. Kommandot
   kör `check:quick`, skapar merge-commiten (`--no-ff`, så att en feature kan
   tas bort med en enda `git revert -m 1`) och pushar arbetsbranchen och
   `development` atomiskt till origin. Därefter publiceras bygget med etiketten
   `development · <merge-commit>`. Har `development` flyttats under tiden
   avvisas pushen innan något publiceras: kör om från steg 3.

Vill användaren testa en feature isolerat publiceras arbetsbranchen utan merge:

```sh
npm run deploy:quick
```

Etiketten visar då arbetsbranchens namn. Även detta kräver att branchen
innehåller senaste `origin/development`, så att ingen tidigare merge saknas i
testet.

`check:quick` omfattar formatkontroll, ESLint, enhetstesterna, en typkontroll,
Pages-bygge, automatiska publiceringsskydd och Pages-integration.
Enhetstesterna har ingen total tidsgräns och omfattar alla Vitest-tester utom
HTTP-integration. Playwright ingår inte.

### En enda testdeployment

Det finns bara `https://curiousengineerstudio.se/spacelords/`. Senaste
publicering vinner. `Saved games` visar branch, kort revision och byggtid
(`synlig-byggversion`), exempelvis `development · 3f2a1c4 · 2026-11-16 14:32`.
Samma uppgifter finns som tooltip på `SPACELORDS` och i
`spacelords/deployment.json` (`sourceRevision`, `branch`).

### Publiceringsskriptet

1. Kontrollerar ren arbetsbranch, hämtar origin och kontrollerar basen.
2. Kör `check:quick` och sparar det testade klientbygget.
3. Pushar arbetsbranchen, och vid `work:merge` även `development`, med
   `git push --atomic origin`.
4. Hämtar webbplatsrepots aktuella `main` med `--depth 1`, `--filter=blob:none`
   och sparse checkout för `spacelords/` till en separat tillfällig katalog.
   Skapar en deploybranch. Okända filer, fel appinnehåll och symboliska länkar
   avvisas. Övriga kataloger bevaras i Git-trädet utan att laddas ned.
5. Ersätter endast `spacelords/`, lägger till `deployment.json` med
   revision, branch och kontrollsummor, granskar diffens avgränsning och committar.
6. Hämtar aktuell `origin/main`. Andra projekts samtidiga ändringar bevaras med
   rebase; ändrad `spacelords/` avbryter publiceringen för granskning.
7. Använder vanlig push från den granskade deploybranchen till webbplatsrepots
   `main` med befintlig SSH. Ingen force-push eller ändring av branchskydd görs.
8. Följer Pages-körningen för deployrevisionen och avslutar när den är klar.
   Användaren testar därefter manuellt.

Kompakt rapport med revisioner, tider, filkontrollsummor, Pages-länk och utfall
finns i `dist/deployments/<revision>-<tid>/report.json`. Stegloggar ligger bredvid,
kontrolloggar i `dist/checks/`. Dessa filer är ignorerade av Git. Läs fullständiga
loggar, spår och skärmbilder vid fel; läs inte om lyckade körningar utan skäl.
Vid avbrott efter push kan publicering redan pågå: kontrollera rapporten och
Pages innan du försöker igen. En ofärdig Pages-körning innebär inte återställning.

GitHub kör snabbkontrollerna vid push till `main` och `development`
(`tester-i-github`). Arbetsbranchar och pull requests startar inget, och lokal
publicering väntar inte på CI. GitHub CI publicerar inget.

## Release till main

När användaren ber om en release, normalt till agenten på molndatorn
(`release-till-main`):

```sh
npm run release:start
```

Det hämtar origin och skapar och pushar `release/<datum>` från
`origin/development`. Release-branchen tar bara emot rättningar, inte ny
funktionalitet. Kör därefter hela sviten:

```sh
npm run check
```

Den omfattar kvalitetskontroller, enhetstester, båda byggena, alla
integrationstester och hela webbläsarsviten. Matrisen är telefon Chromium, dator
Chromium och telefon WebKit, med sex arbetstrådar. Loggar sparas under
`dist/checks/`. När sviten går igenom för en ren, oförändrad revision skrivs
`dist/checks/full-passed.json` med den revisionen.

Vid fel: regressionstest som misslyckas av rätt orsak, rättning, commit, push
av release-branchen och ny `npm run check`. Upprepa tills hela sviten går
igenom för exakt aktuell revision. Vill användaren testa releasen manuellt
publiceras den med `npm run deploy:quick`. Etiketten visar då `release/<datum>`.

Avsluta med:

```sh
npm run release:finish
```

Skriptet:

1. Kräver att `full-passed.json` gäller exakt aktuell revision och att
   releasen innehåller `origin/main`.
2. Pushar revisionen till `main` (fast-forward).
3. Innehåller releasen hela `origin/development` pushas samma revision även
   dit, atomiskt med `main`. Har `development` fått nya features mergas releasen
   in i den med `--no-ff`. Därefter körs `check:quick`, och resultatet pushas.
4. Tar bort release-branchen på origin och lokalt.

Om merge tillbaka ger konflikter eller fallerar snabbkontrollerna är `main`
redan släppt. Skriptet lämnar då release-branchen kvar och anger hur
rättningen görs: en arbetsbranch från `origin/development`, `git merge
release/<datum>`, konfliktlösning, tester och `npm run work:merge`.
`release:start` vägrar skapa nästa release så länge `development` saknar `main`.

Användarens beställning av release är tillståndet att flytta `main`. Redovisa
testad SHA och relevanta överhoppade fall efteråt.

## Översikt över branchar

```sh
npm run branches:status
```

Kommandot (`branchoversikt`) visar hur många commits `development` har som
ännu inte släppts till `main`. Det varnar om `development` saknar `main` och
listar branchar på origin med commits som saknas i `development`, med datum
och senaste commitmeddelande. Utforskningsbranchar listas separat, och deras
arbetsbranchar jämförs med utforskningen i stället för med `development`. Ta
bort branchar på origin bara efter användarens ja.

## Utforskningsläge

En utforskningsbranch (`utforskningsbranch`) är en långlivad branch för att
pröva ett koncept separat från `development`, exempelvis `simple_production`.
Den fungerar som en egen integrationsbranch tills användaren väljer att merga
eller kasta konceptet.

```
claude/x ──work:merge──► simple_production ··(när användaren ber om det)··► development
                                ▲
              development ──────┘ (vid behov, bara åt detta håll)
```

1. Skapa utforskningsbranchen från `origin/development` och lägg till
   `exploration.json` i roten, exempelvis
   `{ "branch": "simple_production", "purpose": "Simpler production" }`.
   Committa och pusha den till origin. Filen finns bara på utforskningen och
   dess arbetsbranchar, aldrig på `development`.
2. Starta arbete inom utforskningen:

   ```sh
   npm run work:start -- claude/<ämne> --from simple_production
   ```

   Utan `--from` startar `work:start` från `development` som vanligt.
   Kommandot vägrar om branchen saknar en `exploration.json` som namnger den.

3. `npm run work:merge` från en sådan arbetsbranch mergar in i
   utforskningsbranchen, pushar båda atomiskt och publicerar med etiketten
   `simple_production · <merge-commit>`. Arbetsbranchen måste innehålla senaste
   `origin/simple_production`, men inte senaste `origin/development`.
   `npm run deploy:quick` publicerar arbetsbranchen isolerat på samma sätt.
4. `work:merge` direkt från utforskningsbranchen vägras. Den når `development`
   bara när användaren ber om det: starta en arbetsbranch från utforskningen,
   ta bort `exploration.json`, merga in `origin/development`, kör
   snabbkontrollerna och `npm run work:merge`. Då är målet `development`.
5. Kastas konceptet tas utforskningsbranchen och dess arbetsbranchar bort från
   origin efter användarens ja.

Det finns fortfarande en enda testdeployment. Nästa publicering av
`development` skriver över utforskningens bygge, och tvärtom. `Saved games`
visar vilken branch som är publicerad.

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
  två separata åtgärder. Det senare görs bara av `release:finish` efter godkänd
  hel svit.

## Återställning

Rapporten sparar webbplatsrepots tidigare revision och deploycommit. Skapa en
ny branch från aktuell `main` i en separat checkout. Återställ enbart
`spacelords/` från den tidigare revisionen, eller revertera deploycommitten om
inga senare ändringar av katalogen riskerar att gå förlorade. Granska att diffen
bara omfattar appen, committa och publicera med vanlig push enligt samma
avgränsning. Följ Pages och verifiera liveadressen. Återställ aldrig hela
webbplatsrepot och använd inte force-push.

## Felsökning

- Avbryter `work:merge` eller `deploy:quick` med att basen saknas: kör
  `git merge origin/development` (eller utforskningsbranchen), lös konflikter
  och kör snabbkontrollerna igen.
- I en molncontainer kan `test:tooling` misslyckas på kvarlämnade
  zombieprocesser. Kör då kommandot i en egen processnamnrymd, där `bash`
  måste stanna som process 1 för att städa upp, exempelvis
  `unshare -fp --mount-proc bash -c 'npm run work:merge; e=$?; exit $e'`, och stoppa först
  en kvarlämnad förhandsserver (`preview-pages.mjs`).
- Vid avbrott efter push: läs rapporten i `dist/deployments/` och följ
  Pages-körningen innan ett nytt försök.

## Referenser

- [Vite: statisk driftsättning och basadress](https://vite.dev/guide/static-deploy.html)
- [GitHub Pages: statisk hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages: publiceringskälla och tokenbegränsningar](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Vite: publika miljövariabler](https://vite.dev/guide/env-and-mode.html)
