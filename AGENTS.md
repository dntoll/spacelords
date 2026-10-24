# Arbetsregler

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

- Arbeta i branches, normalt med prefixet `codex/`, inte direkt på `main`.
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
- Att förbereda ett bygge eller uppdatera instruktionen innebär inte att
  driftsätta. Publicera först när användaren beställer en driftsättning.
