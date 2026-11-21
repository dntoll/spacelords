# Spacelords

## Vision

Spelaren förvaltar och expanderar ett rymdimperium över lång tid. Ett spelår är
en runda: spelaren ger order och får sedan se resultatet. Spelet ska fungera på
mobil, surfplatta och dator. Det börjar som en lokal enspelarupplevelse;
multiplayer och en eller två rundor per verkligt dygn är en senare riktning.
Se [hela visionen](docs/game-vision.md).

Utforskningen `simple_production` prövar en förenklad ekonomi där planeter
som förbinds av fraktskepp delar råvaror och delar. Factories, Connect och
Production har ersatt Route, försörjningsvyerna och byggandet från
planetsidan.

## Kravkategorier

Varje område har en egen fil med en beskrivning av hur spelet fungerar nu och
kraven med stabila namn och status. Statusen nedan sammanfattar området.

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
  pirater, vrak, bärgning och orbitala varv. Allt är **Fullständigt
  implementerat**.
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
