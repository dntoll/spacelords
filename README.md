# Spacelords

Första grunden till ett långsamt rymdimperiespel: en hexkarta med p5.js,
begränsad sikt, planetinformation och en enkel forskningsöversikt. Spelet fungerar
lokalt i klienten på mobil, surfplatta och dator. Node.js 24 och strikt TypeScript
används med MVC och en liten Express-server för lokal produktionsdrift.

Tre fasta exempelstjärnsystem och en hemplanet, Tellus, återställs vid omladdning.
Byggorder, rundor, faktisk forskning och simulering kommer i senare steg. Se
[visionen](docs/game-vision.md) och [kravstatusen](docs/product-requirements.md).

## Kom igång

```sh
nvm use
npm ci
npm run dev
```

Öppna [klienten](http://127.0.0.1:5173). Klienten uppdateras vid ändringar och
servern startas om automatiskt. [Serverstatus](http://127.0.0.1:3000/api/health)
finns även via klientens `/api/health`, som proxas till servern. `Ctrl+C` avslutar
båda processerna. Nvm är valfritt om Node.js 24 redan finns installerat.

Ingen `.env` behövs. Kopiera vid behov `.env.example` till `.env` och anpassa
`HOST`/`PORT`. Om serveradressen ändras måste proxyn i `vite.config.ts` uppdateras
också. Upptagna portar ger ett tydligt startfel; frigör porten eller ändra
inställningen. Vite byter inte port automatiskt.

## Kommandon

| Kommando                | Användning                                                      |
| ----------------------- | --------------------------------------------------------------- |
| `npm run dev`           | Starta klient och server med automatisk omladdning.             |
| `npm test`              | Snabba enhetstester, högst 20 sekunder totalt.                  |
| `npm run test:watch`    | Enhetstester i bevakningsläge, utan total tidsgräns.            |
| `npm run test:extended` | Bygg och kör HTTP- samt browsertester.                          |
| `npm run lint`          | Typmedveten ESLint-kontroll.                                    |
| `npm run lint:fix`      | Rätta lintfel som kan lösas automatiskt.                        |
| `npm run typecheck`     | Strikt typkontroll av klient, server, tester och konfiguration. |
| `npm run format`        | Formatera kod och dokumentation med Prettier.                   |
| `npm run check`         | Format, lint, båda testsviterna, typkontroll och bygge.         |
| `npm run build`         | Skapa `dist/client` och `dist/server`.                          |
| `npm run test:browser`  | Kör Playwright mot befintligt Pages-bygge.                      |
| `npm run preview:pages` | Förhandsvisa Pages-bygget på port 4178.                         |
| `npm run build:pages`   | Bygg enbart klienten för `/spacelords/` i `dist/pages`.         |
| `npm start`             | Kör produktionsbygget på port 3000. Bygg först.                 |

GitHub Actions kör kvalitetskontroller och båda testsviterna vid push och pull
request. `package-lock.json` låser beroendena; använd `npm ci` för reproducerbar
installation. ESLint med typescript-eslint används enligt det uppdaterade
lintkravet: [verktygets dokumentation](https://typescript-eslint.io/getting-started/typed-linting/).

## Struktur och MVC

```text
src/client/              Klientens startpunkt, HTML och CSS
  models/                Objektorienterad modell med fryst läsdata
  controllers/           Samordnar modell och vy
  views/                 p5-karta, DOM-vyer och plattformsindata
src/server/
  models/                Plattformsoavhängiga modeller
  controllers/           Samordning utan HTTP-beroenden
  views/                 HTTP-adaptrar som renderar JSON
  app.ts                 Routning och statiska klientfiler
  main.ts                Serverstart och avstängning
tests/unit/              Snabb svit
tests/integration/       HTTP-tester mot det faktiska produktionsbygget
tests/browser/           Playwright: desktop, mobil, surfplatta och touch
docs/                    Krav, arbetsbeslut och PlantUML-domänmodell
```

Vyer får bara modellens läsgränssnitt eller frysta ögonblicksbilder. Vyn skickar
indata till en controller, som anropar modellen och begär ny rendering. Vyn ändrar
aldrig modellen. Hexgeometri, sikt, kamera och modeller beror inte på p5, DOM
eller HTTP. Kartans läsdata innehåller inga dolda planetuppgifter.

p5 används i instance mode och ritar om vid förändringar. Kartvyn städar canvas,
händelser och ResizeObserver vid vybyte och hot reload. Navigation sker inom
klienten, så att Pages behöver inga nya serveradresser. Se
[första iterationen](docs/first-iteration.md) för ansvar och testkopplingar.

## Krav och arbetssätt

Läs [kravöversikten](requirements.md), [produktkraven](docs/product-requirements.md),
[de tekniska kraven](docs/technical-requirements.md) och [AGENTS.md](AGENTS.md).
Använd kravnamen i testernas `describe` och i kommentarer när det hjälper
spårbarheten. Processkrav granskas genom relevant verktygskontroll och review;
de motiverar inte konstlade enhetstester.

[Domänmodellen](docs/domain-model.puml) beskriver den implementerade spelgrunden
och skiljer framtida begrepp från färdiga delar. Förhandsvisa lokalt i exempelvis
VS Code med PlantUML-tillägget; lokal rendering kräver Java och PlantUML.
Tekniska MVC-klasser är inte verksamhetsdomänens klasser.

VS Code-inställningar, tilläggsförslag och felsökningskonfiguration finns i
`.vscode/`. Använd en arbetsbranch och gör sammanhängande commits med tydliga
meddelanden. Reproducera buggar med ett misslyckat regressionstest före rättning.

## Driftsättning

Målet för den statiska klienten är
[curiousengineerstudio.se/spacelords/](https://curiousengineerstudio.se/spacelords/).
Följ [driftsättningsinstruktionen](docs/deployment.md). Endast `spacelords/` i
`dntoll/dntoll.github.io` får ändras. Ingen automatisk publicering är aktiverad.
Node-servern kan inte köras på GitHub Pages.

## Spela lokalt

Dra kartan med mus eller ett finger. Mushjul, två fingrar och plus/minusknappar
zoomar. Hemknappen återställer kamera och vald planet. Piltangenter panorerar när
canvas har fokus; plus/minus zoomar, Home återställer och Enter väljer mitten.
Knapparna under kartan väljer kända objekt utan att behöva träffa canvas.

Öppna Tellus för att se planetens värden och den kommande forskningsstationen.
Forskning öppnar en informationsvy. Tillbaka-knapparna bevarar karta och markering.
Sidan återställs vid omladdning. Det finns inga byggorder eller pågående forskning.

## Browsertester

Installera browsermotorerna en gång efter `npm ci`:

```sh
npx playwright install --with-deps chromium webkit
npm run check
```

På Linux kan installation av systembibliotek kräva administratörsrättigheter.
CI installerar dem på sin runner. `npm run test:browser` förutsätter att
`npm run build:pages` redan har körts; `test:extended` bygger allt automatiskt.
Playwright startar sin egen statiska förhandsvisning på port 4178. Avsluta en
manuellt startad förhandsvisning på den porten innan testerna körs.

Matrisen täcker desktop i Chromium, telefon i Chromium och WebKit samt surfplatta
i WebKit. Alla kör rendering och navigation. Faktiska drag och nypgester körs
via Chromiums touchgränssnitt; WebKit verifierar touchtryck. Matematik och
pekargester enhetstestas separat. Endast scenarier som inte gäller en viss enhet
hoppas över, inte misslyckade kontroller. Skärmbilder och felspår sparas i
`test-results/`, som inte checkas in.

p5 är den största delen av klientbundlen. Vite kan därför ge en storleksvarning;
första steget använder standardpaketet utan att dölja varningen.
