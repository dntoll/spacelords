# Bildpromptpaket

Krav: `bildpromptpaket`. Paketet innehåller nio engelska prompter och fyra
kopierade stilreferenser. Transport ship, Salvage ship och Space pirate har
genererats enligt `genererade-skeppssprites`, och sex planeter enligt
`spelgrafik-planeter`. Byggnadsporträtt, byggnadssymboler och varvets kartbild
är borttagna med planetekonomin (`single-fleet-rensning`); de finns kvar i
git-historiken.

Se [bildleverans och granskning](../generated-map-artwork.md),
[använda prompter](generation-2026-10-29.json),
[kantförbättringar](refinements-2026-10-29.json) och
[översikten över planeterna](artwork-review/planets-overview.jpg).

## Användning i ChatGPT

1. Välj en prompt i indexet nedan.
2. Bifoga de referensbilder som filen länkar till.
3. Kopiera hela textblocket och be ChatGPT skapa bilden.
4. Spara resultatet som PNG med filens föreslagna namn.
5. Kontrollera motiv, riktning, transparens och att bilden saknar text, logotyper och vattenstämplar. Lämna sedan bilderna för optimering och inkoppling i en separat leverans.

## Gemensam stil

Skepp: strikt vy ovanifrån, nos åt höger, transparent bakgrund, ljust grå pansarplåt med blågrön struktur och små varma accenter. Planeter: isolerade sfärer med ljus uppifrån vänster och transparent bakgrund.

Piratskeppet avviker avsiktligt med rost­röd, ockragul och kolgrå lappad plåt samt provisoriska reparationer.

## Index

| Kategori              | Antal |
| --------------------- | ----: |
| Skepp (genererade)    |     3 |
| Planeter (genererade) |     6 |

| Motiv                                     | Kategori | Föreslaget filnamn     |
| ----------------------------------------- | -------- | ---------------------- |
| [Transport ship](ships/transport-ship.md) | ships    | `transport-ship.png`   |
| [Salvage ship](ships/salvage-ship.md)     | ships    | `salvage-ship.png`     |
| [Space pirate](ships/pirate-ship.md)      | ships    | `pirate-ship.png`      |
| [Temperate](planets/temperate.md)         | planets  | `temperate-planet.png` |
| [Ice](planets/ice.md)                     | planets  | `ice-planet.png`       |
| [Desert](planets/desert.md)               | planets  | `desert-planet.png`    |
| [Ocean](planets/ocean.md)                 | planets  | `ocean-planet.png`     |
| [Toxic](planets/toxic.md)                 | planets  | `toxic-planet.png`     |
| [Gas](planets/gas.md)                     | planets  | `gas-planet.png`       |

Maskinläsbart index: [manifest.json](manifest.json). Referensbilderna är kopior av befintliga spelbilder; de ersätter inga tillgångar i spelet. De tre befintliga målade skeppen behöver inte genereras om.

## Bordningsfigurer med åtta riktningar

[boarding-characters.json](boarding-characters.json) innehåller de 33 slutliga
prompterna, originalens sökvägar och generatorvalet. Bilderna skapades med den
inbyggda `image_gen`, med transparent bakgrund. Det befintliga fraktionsarket
var stilreferens för `player-standing-front`; det nya originalet användes
sedan som stilreferens för de övriga bilderna.

Originalen finns i `assets/original/boarding/characters/`. Fem vinklar per typ
och aktiv ställning speglas i vyn till åtta riktningar. Varje typ har dessutom
en riktningsoberoende liggande bild för utslagna och döda personer. Webbarket finns i
`src/client/boarding/assets/characters/directional-faction-sprites.webp`.
Återskapa bildarket och dess källrektanglar från de sparade originalen med:

```sh
python3 scripts/prepare-boarding-characters.py
npx prettier --write src/client/boarding/views/rendering/BoardingCharacterAtlas.ts
```
