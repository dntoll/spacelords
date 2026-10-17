# Arbetsregler

## Krav och spårbarhet

- Spara varje nytt eller ändrat krav och uppdatera översikten i `requirements.md`.
- Ge varje krav ett unikt, stabilt och läsbart namn i kebab-case, exempelvis
  `tom-startsida`. Använd samma namn i tester, dokumentation och relevanta
  kodkommentarer. Ändra inte namnet när formuleringen förtydligas.
- `requirements.md` börjar med en sammanfattning/vision och därefter en
  sammanfattning av kravkategorierna. Flytta detaljer till egna Markdownfiler i
  `docs/` när översikten växer.
- `docs/requirements.md` beskriver produktkraven kortfattat och otekniskt.
  Teknikval, dialoger, implementation och arbetsprocesser hör inte hemma där.
- `docs/technical-requirements.md` listar tekniska krav och arbetsregler separat.
- Ifrågasätt nya krav som motsäger befintliga innan de genomförs. En uttrycklig
  ändring från användaren gäller; dokumentera vilket tidigare krav den ersätter.

## Testning

- Knyt automatiska enhetstester till varje beteendekrav med kravets läsbara namn.
  Varje test ska skydda mot en kategori av fel, inte bara upprepa implementationen.
- Dela testerna i en snabb svit med högst 20 sekunders total exekveringstid och en
  utökad svit som får ta längre tid. Kör båda i GitHub CI.
- Vid en bugg: skriv först ett regressionstest, kör det och verifiera att det
  misslyckas av rätt orsak, och rätta därefter felet.
- Skriv även tester före annan implementation när det är lämpligt.
- Verifiera bygg-, verktygs- och processkrav med lämpliga automatiska kontroller
  och granskning; skapa inte konstlade enhetstester för att läsa konfigurationsfiler.

## Arkitektur och kod

- Använd MVC, även i klientapplikationen. Vyer hanterar indata och renderar utdata
  och fungerar som lager mot plattformen. Vyer får läsa modellen men aldrig ändra
  den. Indata skickas till controllers, som samordnar modell och vy.
- Modellera objektorienterat med hög sammanhållning och låg koppling. Ge vyer
  enbart läsgränssnitt eller oföränderliga ögonblicksbilder av modellerna.
- Underhåll problemdomänens klasser och relationer i PlantUML i
  `docs/domain-model.puml`. Hitta inte på domänbegrepp innan produktkrav finns.
- Använd ESLint med typescript-eslint. Detta ersätter användarens ursprungliga
  JSLint-val efter uttrycklig ändring i samtalet.
- Använd tydliga namn och Clean Code. Kommentera bara när kommentaren tillför
  något, exempelvis kravkoppling, motiv eller en oväntad begränsning.

## Git

- Arbeta i branches, normalt med prefixet `codex/`, inte direkt på `main`.
- Gör regelbundna, sammanhängande commits med tydliga commitmeddelanden.
- Kör relevanta kontroller före commit. Bevara användarens befintliga ändringar.
