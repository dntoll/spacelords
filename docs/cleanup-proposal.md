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
  Tester som skickar dem skrivs om mot gränssnittet.
- Fråga: OK att ta bort?

**B2. Route-skärmen går inte längre att nå.** `open-route` skickas inte,
och beslut leder till Factories. Kvar finns skärmen `route`, `renderRoutePlanet`,
ruttlegenden, `RouteFacade` med flera.

- Rekommendation: ta bort skärmen och allt som bara används av den.
  `TradeAssignment` används av Factories och behålls.
- Fråga: OK att ta bort Route helt?

**B3. Två sätt att skapa rutter.** Star map låter fortfarande spelaren
skapa rutter (dra mellan planeter eller tangenten R), vid sidan av Connect i
Factories. Kartans väg tar inte hänsyn till de nya reglerna, som en order
per skepp och beställda länkar.

- Alternativ: (a) ta bort ruttskapandet på kartan, (b) låt kartan öppna
  Connect för planetens grupp, (c) behåll som det är.
- Rekommendation: (a) eller (b).
- Fråga: Vilket?

**B4. Planetsidan bygger fortfarande byggnader.** Planetsidans
`Building sites` och `build-selection` låter spelaren bygga byggnader, vid
sidan av Factories.

- Rekommendation: ta bort byggandet från planetsidan och låt den bara
  informera. Skärmen `build-selection` försvinner.
- Fråga: Ska planetsidan finnas kvar alls? Den har Overview, Building sites,
  Build queue och Production, där kö och produktion dubblerar Production på
  kartan.

**B5. Production-ringens kategorier är döda.** Ringen visar bara skepp, men
koden för kategorierna `Buildings` och `Components` och för
sidbläddring finns kvar.

- Rekommendation: ta bort kategorierna. Behåll sidbläddringen bara om det
  kan bli fler än åtta skeppstyper.
- Fråga: OK?

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

- Rekommendation: efter B1–B5, gör en genomgång med tester som skydd och
  bryt ut spelmodellen i mindre delar per område (ekonomi, flottor,
  forskning, beslut).
- Fråga: Prioriteras det före mining ships?

## Dokumentation

**B8. `requirements.md` är 1115 rader.** `AGENTS.md` säger att den ska vara
en vision och en sammanfattning per kravkategori. Nu innehåller den
detaljer och historik för omkring 100 kategorier.

- Rekommendation: skriv om den till cirka 150 rader med en kort status per
  kategori och länkar. Detaljerna ligger redan i `docs/`.
- Fråga: OK? Ska ersatta krav finnas kvar i översikten, eller bara i
  detaljfilerna?

**B9. `docs/product-requirements.md` (1800 rader) och
`docs/technical-requirements.md` (1900 rader).** Produktkraven ska enligt
`AGENTS.md` vara korta och otekniska. Båda filerna samlar också historik
och ersatta krav.

- Rekommendation: produktkraven skrivs om till en kort beskrivning av spelet
  som det är nu (cirka 200 rader). Historik och ersatta krav flyttas till en
  arkivfil, `docs/archive/` eller en avslutande ersättningslogg.
- Fråga: Ska historiken sparas i en arkivfil, eller räcker git-historiken?

**B10. Dokument som beskriver ersatta koncept eller är historiska:**
`route-production.md`, `supply-production.md`, `economy-logistics.md`,
`trade-route-graph.md`, `star-map-trade.md`, `first-iteration.md`,
`fleet-map-plan.md` (en historisk plan) och `testresultat-utokad-03bf183.md`
(en gammal testrapport på 400 rader).

- Rekommendation: flytta till `docs/archive/` med en rad om vad som ersatt
  dem. Testrapporten tas bort.
- Fråga: Arkivera eller ta bort?

**B11. `docs/deployment.md` har 1028 rader.**

- Rekommendation: korta den till den gällande processen (start, merge,
  release, publicering, felsökning). Historik tas bort.
- Fråga: OK?

**B12. `docs/simple-production.md` (554 rader) har blivit en logg över
många små krav.**

- Rekommendation: ordna den efter skärm (Factories, Connect, Production,
  Research, Decisions och turn-uppspelning) i stället för efter datum.
- Fråga: OK?

## Föreslagen ordning

1. B0 och B6 (en bugg; commit förberedd).
2. B1, B2 och B5 (ren död kod; mekaniskt med tester som skydd).
3. B3 och B4 (produktbeslut, sedan implementation).
4. B8–B12 (dokumentation, när koden är stabil).
5. B7 (större omstrukturering).

Efter varje steg körs snabbsviten. Webbläsartesterna körs på användarens
dator.
