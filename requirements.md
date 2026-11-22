# Spacelords

## Vision

Utforskningen `single_fleet` prövar ett spel där spelaren leder en enda
flotta genom rymden, med rymdstrid och bordning i centrum. Spelaren äger inga
planeter eller fasta resurser; allt spelaren har följer med flottan.
Spelet ska fungera på mobil, surfplatta och dator.

Utforskningen bygger vidare på `simple_production`. Den nya riktningen och
kraven finns i [Single fleet](docs/single-fleet.md). Speländringarna är
**Ej implementerat**. Beskrivningarna och statusarna i de äldre områdesfilerna
avser den ärvda implementationen; där de motsäger den nya riktningen gäller
ersättningarna i Single fleet. [Den tidigare visionen](docs/game-vision.md)
behålls som bakgrund.

## Kravkategorier

Varje område har en egen fil med en beskrivning av hur spelet fungerar nu och
kraven med stabila namn och status. Statusen nedan sammanfattar området.

- **[Single fleet — utforskning](docs/single-fleet.md):** en enda flotta,
  AP på Star map, Fleet, Crew, teknikforskning och en gemensam
  produktionskö, ändliga förbrukningsresurser och personer med flera roller
  och lika startegenskaper. Samtliga nya beteendekrav är **Ej implementerat**.
  Planen anger vilka delar som måste diskuteras och låsas med användaren
  före implementation (`single-fleet-beslut-fore-implementation`).
  [Rensningsplanen](docs/single-fleet-cleanup.md) följer borttagning av den
  tidigare spelmekaniken (`single-fleet-rensning`, **Delvis implementerat**:
  planetekonomi, kolonisation, handelsrutter och flera flottor återstår).
- **[Start, sparade spel och navigering](docs/areas/start-and-saves.md):**
  `Saved games`, helskärm, huvudmenyn och sparformatet (`sparformat`).
  Allt är **Fullständigt implementerat**.
- **[Stjärnkartan och grafiken](docs/areas/star-map.md):** hexkartan, sikt,
  terräng, kamera, kartobjekt och genererade bilder. Rutter skapas bara i
  Factories (`rutter-endast-i-connect`). Allt är **Fullständigt
  implementerat**.
- **[Flottor och order](docs/areas/fleets.md):** `Fleets`, order och
  startorder, automatiska order, planetköer, Patrol, motorer, uppgraderingar
  och civiltrafik. Allt är **Fullständigt implementerat**.
- **[Ekonomi, Factories, Production och planeter](docs/areas/economy-and-production.md):**
  produktionsnätverket, Factories, Production på kartan, planetsidan
  (`planetsida-informerar`), terraforming och Domes. **Fullständigt
  implementerat** utom `mining-ships` och `mining-ship-anslutning`, som är
  **Ej implementerat** och väntar tills resten är klart. Skärmarna beskrivs i
  [förenklad produktion](docs/simple-production.md).
- **[Research](docs/areas/research.md):** forskningsträdet, kön och
  forskningstiden. Allt är **Fullständigt implementerat**.
- **[Rundan, händelser och beslut](docs/areas/turn-and-decisions.md):**
  uppspelningen av året, händelser, avbrott och `Decisions`. Allt är
  **Fullständigt implementerat**.
- **[Space pirates, bärgning och varv](docs/areas/pirates-and-salvage.md):**
  pirater, vrak, bärgning och orbitala varv med `automatisk-varvsplacering`
  i utforskningen. Allt är **Fullständigt implementerat**.
- **[Rymdstrid](docs/areas/space-battle.md):** taktisk strid och testläget.
  Allt är **Fullständigt implementerat**.
- **[Bordning](docs/areas/boarding.md):** bordningsstrid, grafik, ljus och
  karteditor. **Delvis implementerat**: `skeppsbild-under-bordning`,
  `illustrerade-bordningshandlingar`, `ljuskarta-i-bordning` och
  `skuggor-fran-figurer-och-foremal` är delvis klara, och flera ljuskrav är
  **Ej implementerat**; se områdesfilen.
- **[Utveckling, kvalitet och driftsättning](docs/areas/development.md):**
  arkitektur, tester, branchflöde och publicering. **Delvis implementerat**:
  `mvc-arkitektur`, `vy-plattformsgrans`, branchflödet och
  `utforskningsbranch` har delar kvar; se områdesfilen.

## Övriga dokument

- [Produktkrav](docs/product-requirements.md): kort och otekniskt om spelet.
- [Tekniska krav](docs/technical-requirements.md) och
  [arbetsregler](AGENTS.md).
- [Domänmodell](docs/domain-model.puml) och
  [kodkarta](docs/architecture/README.md).
- [Driftsättning](docs/deployment.md).
- Detaljfiler per spelmekanik, som [terraforming](docs/terraforming.md),
  [sikt och teleskop](docs/detection-telescopes.md) och
  [Events och vägledning](docs/events-and-guidance.md), länkas från
  områdesfilerna.
