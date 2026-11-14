# Kodkarta

`arkitekturkarta`: en hierarkisk karta över klientens kod som agenter och
människor arbetar utefter. Diagrammen genereras från koden och kan därför inte
glida isär från den.

| Nivå | Fil                                                                    | Visar                                                                                                 |
| ---- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1    | [overview.puml](overview.puml)                                         | App-skalet, `common/`, spelmodulerna, `src/shared` och servern med de faktiska importerna mellan dem. |
| 2    | [space-map.puml](space-map.puml)                                       | Stjärnkartespelets fall (`fleets`, `planet`, `turn` …) med controllers, modeller och vyer.            |
| 2    | [space-battle.puml](space-battle.puml), [boarding.puml](boarding.puml) | Rymdstridens och bordningens fall på samma sätt.                                                      |
| 2    | [app.puml](app.puml)                                                   | App-skalet och vilka modulers index-filer det använder.                                               |

Nivå 2 visar varje fall som ett paket med sina lager. Där står också modulens
publika yta, alltså vad `controllers/`, `models/` och `views/index.js`
exporterar. Pilar mellan fall anger antal importer. Streckade pilar betyder att
bara typer importeras.

## Arbetssätt

- Läs `overview.puml` och berörd moduls diagram innan du lägger till, flyttar
  eller kopplar ihop kod.
- Modulgränserna och tillåtna undantag står i `architecture.config.mjs`. ESLint
  håller gränserna och generatorn ritar kartan från samma lista.
- Kör `npm run architecture:map` efter ändrade importer, nya filer eller nya
  fall och committa diagrammen tillsammans med koden. `npm run test:tooling`,
  som ingår i `check:quick` och `deploy:quick`, misslyckas när kartan är
  inaktuell.
- Redigera inte `.puml`-filerna för hand. Förklaringar som inte går att
  generera skrivs här eller i modulens kravdokument.
- `docs/domain-model.puml` är en annan sak: den beskriver problemdomänens
  begrepp, inte kodens struktur.
