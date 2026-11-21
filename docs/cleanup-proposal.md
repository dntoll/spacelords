# Förslag: rensning av kod och dokumentation (beslutsunderlag)

Branch `claude/cleanup-proposal`, utgår från `simple_production` 2026-11-21.
Inget här mergas förrän användaren har beslutat. Varje punkt har ett förslag,
en rekommendation och en fråga. Förberedda commits nämns där de finns.

## Grundfråga först

**B0. Är `simple_production` vägen framåt?** Nästan all rensning nedan
förutsätter att konceptet behålls och så småningom mergas till `development`.
Gammal kod för Route, försörjningsvyer och byggande från planetsidan finns
kvar för att utforskningen ska kunna kastas.

- Rekommendation: ja. Factories, Connect och den förenklade produktionen har
  ersatt det gamla i allt som spelaren ser.
- Fråga: Ska rensningen göras nu i utforskningen, eller först när den mergas
  till `development`?

## Kod: döda eller dubbla vägar

**B1. 21 intents som ingen vy skickar.** Controllern hanterar dem men inget
i gränssnittet skickar dem: `auto-salvage`, `begin-colonization`,
`begin-salvage`, `civilian-transport`, `create-fleet`, `create-trade-route`,
`delete-fleet`, `explore-fleet`, `guard-routes`, `move-project`,
`open-route`, `patrol-fleet`, `produce-fighter`, `project-fleet`,
`project-supply`, `rename-fleet`, `return-shipyard`, `select-fleet`,
`supply-open-planet`, `supply-open-route`, `upgrade-fleet`. Några används
bara av tester.

- Rekommendation: ta bort dem ur `ViewContracts` och `MasterController`.
  Förberett i commiten "Remove intents no view sends" för 20 av dem.
  `open-route` ingår i B2, eftersom testerna för Route-skärmen använder den.
  Tre enhetstester som skickade döda intents anropar nu modellen direkt.
  Commiten "Remove controller methods nothing calls" tar sedan bort de 26
  metoder i use-case-controllers som MasterController inte längre anropar
  (109 rader). Fasadmetoderna finns kvar, eftersom AppModel och tester
  använder dem som API. De kan rensas i B7.
- Fråga: OK att merga?

**B2. Route-skärmen går inte längre att nå.** `open-route` skickas inte,
och beslut leder till Factories. Kvar finns skärmen `route`, `renderRoutePlanet`,
ruttlegenden, `RouteFacade` med flera.

- Beslut: ta bort. Genomfört tillsammans med B3 i commiten "Remove the
  Route screen and route creation on the Star map". Skärmen, dess panel,
  legend och kartbeskrivningar, `openRoute`, `openSupplyRoute` och
  mittplaceringen av ruttflottor försvann. Beslut om rutter och försörjning
  leder till Factories, och kartan visar ruttflottor vid ändpunkten.

**B3. Två sätt att skapa rutter.** Star map låter fortfarande spelaren
skapa rutter (dra mellan planeter eller tangenten R), vid sidan av Connect i
Factories. Kartans väg tar inte hänsyn till de nya reglerna, som en order
per skepp och beställda länkar.

- Beslut: (a) ta bort. Dragning mellan planeter, tangenten R och panelen
  `Create trade route` finns inte längre. Rutter skapas bara med Connect i
  Factories (`rutter-endast-i-connect`). Att välja rutter och tilldela
  flottor på kartan finns kvar.
- Webbläsartester som använder Route eller ruttskapande på kartan och
  behöver skrivas om eller tas bort: `route-escorts`, `component-network`,
  `decision-muting`, `supply-production`, `unified-interface`,
  `star-map-trade`, `production-map`, `fleet-map-management` och
  `logistics`. Det samordnas med agenten som lagar webbläsartesterna.

**B4. Planetsidan bygger fortfarande byggnader.** Planetsidans
`Building sites` och `build-selection` låter spelaren bygga byggnader, vid
sidan av Factories.

- Beslut: förenkla och ta bort det som dubblerar Factories och Production.
  Genomfört i commiten "Make the planet page informational"
  (`planetsida-informerar`). Planetsidan har nu flikarna `Overview` och
  `Building sites`. Byggplatserna visar status och har kvar `Demolish`/`Keep`,
  som inte finns i Factories. Byggande, kupoler, uppgraderingar och
  avbrytande sker i Factories. Skärmen `build-selection`, flikarna
  `Build queue` och `Production`, deras tillstånd, intents och CSS är borta.
  Byggnadsantalet för hela imperiet, som bara visades i byggvalet, försvann
  med det.
- Webbläsartester som använder det borttagna och behöver skrivas om eller
  tas bort: `component-network`, `viewport`, `exploration-interruptions`,
  `terraforming`, `factory-upgrades`, `planet-production`,
  `building-inventory`, `production-controls`, `game-artwork`,
  `unified-interface`, `production-map`, `queue-controls`, `planet-pages`,
  `ship-engines`, `logistics`, `game`, `building-images` och `orders`.

**B5. Production-ringens kategorier är döda.** Ringen visar bara skepp, men
koden för kategorierna `Buildings` och `Components` fanns kvar. Dessutom
fanns ett dolt fel: med fler än åtta skeppsalternativ filtrerades ringen
på den förvalda kategorin `Buildings` och visade inga skepp.

- Förberett i commiten "Drop the Production ring categories"
  (`produktionsring-utan-kategorier`). Kategorierna, deras tillstånd och
  intenten `map-production-category` tas bort. Sidbläddringen behålls.
  Webbläsartestet `production-map.spec.ts` använder kategorierna, men det
  testet är redan trasigt.
- Fråga: OK att merga?

**B6. Knappen "Prepare building site" i Production gör ingenting (bugg).**
Den väljer en Dome, men ringen visar inte Domes. Vägledningen "Build a
matching factory at an available building site." pekar också fel.

- Rekommendation: ersätt med en vägledningstext som pekar på Factories.
  Förberett i commiten "Point Production guidance to Factories" på branchen
  (regressionstest `produktionsvagledning-till-factories`). Webbläsartestet
  `production-domes.spec.ts` klickar på den borttagna knappen och behöver
  skrivas om. Det lämnas till agenten som lagar webbläsartesterna.
- Fråga: OK att merga?

**B7. Game.ts har 8000 rader.** Där finns kvar logik för fysisk frakt
(`Logistics`, last, `#transportWaiting`, `route-idle`-beslut), gamla
produktionsval och planetkön. Mycket används fortfarande indirekt.

- Beslut: ja, före nya funktioner. Mining ships väntar.
- Genomfört:
  - "Load only the current save format" (`sparformat`): bara version 17
    laddas. Övergångarna från äldre format är borttagna, liksom fasen
    `summary`. Spel som sparats av nuvarande bygge laddas som förut.
  - "Move the catalog and snapshot types out of Game.ts": byggnader och
    skepp ligger i `Catalog.ts` (`spelkatalog`), ögonblicksbilderna i
    `GameSnapshots.ts`. `Game.ts` gick från 8012 till 7337 rader.
- Den fysiska frakten var redan borta. `Logistics` håller bara rutterna, och
  varorna flyttas av `NetworkEconomy`. Last som finns kvar gäller piraters
  byte, som är en levande spelmekanik.
- Kvar: dela upp klassen `Game`. Områdena skriver i samma privata tillstånd,
  så uppdelningen kräver ett gemensamt tillståndsobjekt som delarna får
  genom ett smalt gränssnitt. Föreslagen ordning, med enhetstesterna som
  skydd:
  1. ett tillståndsobjekt (`GameWorld`) med kolonier, flottor, pirater och
     händelser, som `Game` äger;
  2. strid och bordning (cirka 700 rader) till `GameCombat`;
  3. produktionsnätverket (cirka 600 rader) till `GameNetwork`;
  4. beslut och vägledning till `GameDecisions`;
  5. bärgning och varv till `GameSalvage`;
  6. sparning och laddning sist, när tillståndet har ett eget objekt.

## Dokumentation

Beslut: git-historiken räcker för ersatta krav och historik. Genomfört
(B8–B12):

- `requirements.md` har vision och en post per område (cirka 70 rader).
  Varje område har en fil i `docs/areas/` med hur spelet fungerar nu och
  kraven med namn och status. Krav för borttaget beteende anger vad som
  ersatte dem.
- `docs/product-requirements.md` är en kort, oteknisk beskrivning av spelet
  (cirka 120 rader).
- `docs/technical-requirements.md` saknar Route-avsnitten, ändringsloggen och
  verifieringsanteckningarna och har ett avsnitt om sparformatet.
- `docs/deployment.md` beskriver bara gällande process och felsökning
  (cirka 300 rader).
- `docs/simple-production.md` är ordnad efter regler och skärmar.
- Borttagna: `route-production.md`, `supply-production.md`,
  `economy-logistics.md`, `trade-route-graph.md`, `star-map-trade.md`,
  `first-iteration.md`, `fleet-map-plan.md` och
  `testresultat-utokad-03bf183.md`.
- Alla kravnamn som testerna använder finns kvar i dokumentationen, utom
  fyra som saknades redan före rensningen: `kompakt-spelgranssnitt`,
  `melee-attacks`, `pansar-i-strid` och `round-trips`.

## Status och nästa steg

- Branchen `claude/cleanup-proposal` är pushad men inte mergad till
  `simple_production` och inte publicerad, enligt beslut.
- Hela Vitest-sviten går igenom. `test:tooling` har ett fel i den här
  molncontainern (`a timed-out step stops descendant processes`), även på
  orörd `simple_production`.
- Webbläsartester som behöver skrivas om eller tas bort står under B2–B4 och
  B7 (`detection.spec.ts` miste ett test för ett gammalt sparformat).
- Kvar: att dela upp klassen `Game` enligt planen under B7.

## Föreslagen ordning

1. B0 och B6 (en bugg; commit förberedd).
2. B1, B2 och B5 (ren död kod; mekaniskt med tester som skydd).
3. B3 och B4 (produktbeslut, sedan implementation).
4. B8–B12 (dokumentation, när koden är stabil).
5. B7 (större omstrukturering).

Efter varje steg körs snabbsviten. Webbläsartesterna körs på användarens
dator.
