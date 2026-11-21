# Space pirates, bärgning och varv

Space pirates finns kring vissa stjärnor och upptäcks inom sikt. Strider
lämnar vrak som bärgningsskepp hämtar hem till orbitala varv, där de
repareras eller ger forskning. Detaljerna står i
[bärgning och varv](../salvage-shipyards.md) och
[Space pirates](../space-pirates.md).

## Krav

- **Automatisk varvsplacering:** `automatisk-varvsplacering` är
  **Fullständigt implementerat** i utforskningen `simple_production`.
  Factories väljer automatiskt en ledig grannhex för en ny station; se
  [förenklad produktion](../simple-production.md).

- **Bärgade pirater och civila skeppsbilder:** `bargat-piratskepp-behaller-typ`
  och `unik-bild-for-civila-transporter` är **Fullständigt implementerat**.
  Nyförstörda pirater ger Space pirate-vrak som behåller typ, Raider cannon och
  piratbild efter reparation. Civilian shuttle har en egen passagerarskeppsbild.
  Se [bärgning](../salvage-shipyards.md) och [skeppsgrafik](../ship-artwork.md).

- **Bärgningskö:** `bargningsko` är **Fullständigt implementerat**. Upptäckta vrak kan köas från händelsen eller kartan, prioriteras i Decisions och hämtas av lediga Salvage ships. Kön sparas och posten avslutas när vraket levereras till ett varv. Se [automatiska flottorder](../automated-fleet-orders.md).

- **Space pirates:** `rymdpirater-per-stjarna`, `rymdpiraters-patrullering`,
  `flottstrid-per-hex` och `rymdpiraters-sparning` är **Fullständigt implementerat**.
  Nya spel har fientliga pirater runt andra stjärnor, patrullering och strid
  efter varje hexsteg. Enhetstester och mobilflöden i Chromium och WebKit är verifierade.
  Äldre spel får inga pirater. Se [spelreglerna](../space-pirates.md).
