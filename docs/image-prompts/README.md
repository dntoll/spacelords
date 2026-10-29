# Bildpromptpaket

Krav: `bildpromptpaket`. Paketet innehåller 54 färdiga engelska prompter och åtta kopierade stilreferenser. Transport ship, Salvage ship och Space pirate har genererats och kopplats in enligt `genererade-skeppssprites`. Dessutom har 24 byggnadssymboler, sex planeter och kartstationen genererats enligt `genererade-symboler-och-kartbilder`. Endast de 20 byggnadsporträtten återstår att generera. De 31 nya bilderna väntar på separat optimering och inkoppling i spelet.

Se [bildleverans och granskning](../generated-map-artwork.md),
[använda prompter](generation-2026-10-29.json),
[kantförbättringar](refinements-2026-10-29.json) och översikterna för
[symboler](artwork-review/symbols-overview.jpg),
[planeter](artwork-review/planets-overview.jpg) och
[kartstationen](artwork-review/map-overview.jpg).

## Användning i ChatGPT

1. Välj en prompt i indexet nedan.
2. Bifoga de referensbilder som filen länkar till.
3. Kopiera hela textblocket och be ChatGPT skapa bilden.
4. Spara resultatet som PNG med filens föreslagna namn.
5. Kontrollera motiv, riktning, transparens och att bilden saknar text, logotyper och vattenstämplar. Lämna sedan bilderna för optimering och inkoppling i en separat leverans.

## Gemensam stil

Skepp: strikt vy ovanifrån, nos åt höger, transparent bakgrund, ljust grå pansarplåt med blågrön struktur och små varma accenter. Byggnader: målade industrimiljöer i isometriskt perspektiv, blågröna toner och varmt ljus. Symboler: förenklade tydliga motiv som fungerar i 24–32 pixlar. Planeter: isolerade sfärer med ljus uppifrån vänster och transparent bakgrund. Orbital Shipyard får både byggnadsporträtt och en separat station för kartan.

Piratskeppet avviker avsiktligt med rost­röd, ockragul och kolgrå lappad plåt samt provisoriska reparationer.

## Index

| Kategori                        | Antal |
| ------------------------------- | ----: |
| Skepp (genererade)              |     3 |
| Saknade byggnadsporträtt        |    20 |
| Byggnadssymboler (genererade)   |    24 |
| Planeter (genererade)           |     6 |
| Shipyard för kartan (genererad) |     1 |

| Motiv                                                                   | Kategori  | Föreslaget filnamn                       |
| ----------------------------------------------------------------------- | --------- | ---------------------------------------- |
| [Transport ship](ships/transport-ship.md)                               | ships     | `transport-ship.png`                     |
| [Salvage ship](ships/salvage-ship.md)                                   | ships     | `salvage-ship.png`                       |
| [Space pirate](ships/pirate-ship.md)                                    | ships     | `pirate-ship.png`                        |
| [Orbital shipyard](buildings/orbital-shipyard.md)                       | buildings | `orbital-shipyard.png`                   |
| [Orbital shipyard](symbols/orbital-shipyard.md)                         | symbols   | `orbital-shipyard-symbol.png`            |
| [Salvage ship factory](buildings/salvage-ship-factory.md)               | buildings | `salvage-ship-factory.png`               |
| [Salvage ship factory](symbols/salvage-ship-factory.md)                 | symbols   | `salvage-ship-factory-symbol.png`        |
| [Telescope I factory](buildings/telescope-i-factory.md)                 | buildings | `telescope-i-factory.png`                |
| [Telescope I factory](symbols/telescope-i-factory.md)                   | symbols   | `telescope-i-factory-symbol.png`         |
| [Telescope II factory](buildings/telescope-ii-factory.md)               | buildings | `telescope-ii-factory.png`               |
| [Telescope II factory](symbols/telescope-ii-factory.md)                 | symbols   | `telescope-ii-factory-symbol.png`        |
| [Telescope III factory](buildings/telescope-iii-factory.md)             | buildings | `telescope-iii-factory.png`              |
| [Telescope III factory](symbols/telescope-iii-factory.md)               | symbols   | `telescope-iii-factory-symbol.png`       |
| [Ice dome](buildings/ice-dome.md)                                       | buildings | `ice-dome.png`                           |
| [Ice dome](symbols/ice-dome.md)                                         | symbols   | `ice-dome-symbol.png`                    |
| [Ice terraforming factory](buildings/ice-terraforming-factory.md)       | buildings | `ice-terraforming-factory.png`           |
| [Ice terraforming factory](symbols/ice-terraforming-factory.md)         | symbols   | `ice-terraforming-factory-symbol.png`    |
| [Desert dome](buildings/desert-dome.md)                                 | buildings | `desert-dome.png`                        |
| [Desert dome](symbols/desert-dome.md)                                   | symbols   | `desert-dome-symbol.png`                 |
| [Desert terraforming factory](buildings/desert-terraforming-factory.md) | buildings | `desert-terraforming-factory.png`        |
| [Desert terraforming factory](symbols/desert-terraforming-factory.md)   | symbols   | `desert-terraforming-factory-symbol.png` |
| [Ocean dome](buildings/ocean-dome.md)                                   | buildings | `ocean-dome.png`                         |
| [Ocean dome](symbols/ocean-dome.md)                                     | symbols   | `ocean-dome-symbol.png`                  |
| [Ocean terraforming factory](buildings/ocean-terraforming-factory.md)   | buildings | `ocean-terraforming-factory.png`         |
| [Ocean terraforming factory](symbols/ocean-terraforming-factory.md)     | symbols   | `ocean-terraforming-factory-symbol.png`  |
| [Toxic dome](buildings/toxic-dome.md)                                   | buildings | `toxic-dome.png`                         |
| [Toxic dome](symbols/toxic-dome.md)                                     | symbols   | `toxic-dome-symbol.png`                  |
| [Toxic terraforming factory](buildings/toxic-terraforming-factory.md)   | buildings | `toxic-terraforming-factory.png`         |
| [Toxic terraforming factory](symbols/toxic-terraforming-factory.md)     | symbols   | `toxic-terraforming-factory-symbol.png`  |
| [Iron mine](buildings/iron-mine.md)                                     | buildings | `iron-mine.png`                          |
| [Iron mine](symbols/iron-mine.md)                                       | symbols   | `iron-mine-symbol.png`                   |
| [Rocket engine factory](buildings/rocket-engine-factory.md)             | buildings | `rocket-engine-factory.png`              |
| [Rocket engine factory](symbols/rocket-engine-factory.md)               | symbols   | `rocket-engine-factory-symbol.png`       |
| [Ion pulse engine factory](buildings/ion-pulse-engine-factory.md)       | buildings | `ion-pulse-engine-factory.png`           |
| [Ion pulse engine factory](symbols/ion-pulse-engine-factory.md)         | symbols   | `ion-pulse-engine-factory-symbol.png`    |
| [Weapons module factory](buildings/weapons-module-factory.md)           | buildings | `weapons-module-factory.png`             |
| [Weapons module factory](symbols/weapons-module-factory.md)             | symbols   | `weapons-module-factory-symbol.png`      |
| [Water extractor](buildings/water-extractor.md)                         | buildings | `water-extractor.png`                    |
| [Water extractor](symbols/water-extractor.md)                           | symbols   | `water-extractor-symbol.png`             |
| [Oil extractor](buildings/oil-extractor.md)                             | buildings | `oil-extractor.png`                      |
| [Oil extractor](symbols/oil-extractor.md)                               | symbols   | `oil-extractor-symbol.png`               |
| [Transport ship factory](buildings/transport-ship-factory.md)           | buildings | `transport-ship-factory.png`             |
| [Transport ship factory](symbols/transport-ship-factory.md)             | symbols   | `transport-ship-factory-symbol.png`      |
| [Research station](symbols/research-station.md)                         | symbols   | `research-station-symbol.png`            |
| [Colony ship factory](symbols/colony-ship-factory.md)                   | symbols   | `colony-ship-factory-symbol.png`         |
| [Exploration ship factory](symbols/exploration-ship-factory.md)         | symbols   | `exploration-ship-factory-symbol.png`    |
| [Fighter factory](symbols/fighter-factory.md)                           | symbols   | `fighter-factory-symbol.png`             |
| [Temperate](planets/temperate.md)                                       | planets   | `temperate-planet.png`                   |
| [Ice](planets/ice.md)                                                   | planets   | `ice-planet.png`                         |
| [Desert](planets/desert.md)                                             | planets   | `desert-planet.png`                      |
| [Ocean](planets/ocean.md)                                               | planets   | `ocean-planet.png`                       |
| [Toxic](planets/toxic.md)                                               | planets   | `toxic-planet.png`                       |
| [Gas](planets/gas.md)                                                   | planets   | `gas-planet.png`                         |
| [Orbital shipyard](map/orbital-shipyard.md)                             | map       | `orbital-shipyard-sprite.png`            |

Maskinläsbart index: [manifest.json](manifest.json). Referensbilderna är kopior av befintliga spelbilder; de ersätter inga tillgångar i spelet. De fyra befintliga byggnadsporträtten och de tre befintliga målade skeppen behöver inte genereras om.
