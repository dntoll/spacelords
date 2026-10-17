# Spacelords

Tom projektgrund med Node.js 24, strikt TypeScript, en Vite-klient och en liten
Express-server. Klienten visar bara appens namn; inga verksamhetsfunktioner är
ännu beslutade.

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
| `npm run test:extended` | Bygg och testa produktionsservern via HTTP.                     |
| `npm run lint`          | Typmedveten ESLint-kontroll.                                    |
| `npm run lint:fix`      | Rätta lintfel som kan lösas automatiskt.                        |
| `npm run typecheck`     | Strikt typkontroll av klient, server, tester och konfiguration. |
| `npm run format`        | Formatera kod och dokumentation med Prettier.                   |
| `npm run check`         | Format, lint, båda testsviterna, typkontroll och bygge.         |
| `npm run build`         | Skapa `dist/client` och `dist/server`.                          |
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
  views/                 DOM-rendering och framtida användarindata
src/server/
  models/                Plattformsoavhängiga modeller
  controllers/           Samordning utan HTTP-beroenden
  views/                 HTTP-adaptrar som renderar JSON
  app.ts                 Routning och statiska klientfiler
  main.ts                Serverstart och avstängning
tests/unit/              Snabb svit
tests/integration/       Utökad svit mot det faktiska produktionsbygget
docs/                    Krav, arbetsbeslut och PlantUML-domänmodell
```

Vyer får bara modellens läsgränssnitt eller frysta ögonblicksbilder. När
funktioner tillkommer skickar vyn indata till en controller, som anropar
modellens beteenden och begär ny rendering. Vyn ändrar aldrig modellen.
Håll domänlogik fri från DOM, HTTP och ramverk.

## Krav och arbetssätt

Läs [kravöversikten](requirements.md), [produktkraven](docs/requirements.md),
[de tekniska kraven](docs/technical-requirements.md) och [AGENTS.md](AGENTS.md).
Använd kravnamen i testernas `describe` och i kommentarer när det hjälper
spårbarheten. Processkrav granskas genom relevant verktygskontroll och review;
de motiverar inte konstlade enhetstester.

[Domänmodellen](docs/domain-model.puml) är en PlantUML-utgångspunkt tills
produktkraven introducerar domänklasser. Förhandsvisa lokalt i exempelvis
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
