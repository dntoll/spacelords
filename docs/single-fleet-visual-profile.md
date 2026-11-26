# Grafisk profil för Single fleet

## Vision

`single-fleet-grafisk-profil` är **Delvis implementerat** i utforskningen
`single_fleet`. Spelarens flotta ska kännas använd, bebodd och hopbyggd med
det som fanns till hands. Rost, slitage, återanvända delar och improviserade
lagningar ger skeppen personlighet och visar att besättningen håller sitt
hem vid liv under en lång resa. Riktningen har ännu inte genomförts för alla
skepp, miljöer och vyer.

## Form, material och kultur

Skeppen har funktionella silhuetter och tydliga roller, med synliga motorer,
verktyg, skarvar, nitar, kablar, svetsfogar och utbytta pansarplåtar. Former
och detaljer får vara asymmetriska och delar behöver inte matcha perfekt.
De ska fortfarande se ut att kunna fungera som rymdskepp.

Formgivningen kan blanda influenser från asiatiska, arabiska och västerländska
kulturer på jorden. Uttryck dem genom exempelvis geometri, hantverk,
mönster, material och färg på fasta ytor. Skapa en sammanhållen framtida
kultur utan att reducera människor eller kulturer till stereotyper.

Färgskalan kan utgå från rost­rött, oxiderat stål, sliten ljus färg, mörk
blågrön och varm bärnsten. Belysningen får skapa värme och visa att skeppen
är bebodda. Färgerna är vägledning, inte en låst palett.

## Rymden och läsbarhet

Inga flaggor, segel eller andra löst fladdrande textilier på skeppens utsida.
Material och konstruktioner i rymden ska ha en trovärdig fysisk funktion.
Grafiken ska vara tydlig även på mobil: viktiga former, skepp och kontroller
ska gå att urskilja mot bakgrunden. En bakgrund avsedd för gränssnitt ska ha
lugna partier där text och kontroller kan läggas ovanpå.

## Bilder och vyer

Star map, Fleet, Crew, Research och Production ska kunna kännas igen som
delar av samma värld. Konceptbilder kan kombinera spelvyer med miljö- och
skeppsstudier. Konceptens påhittade värden, utrustning och funktioner är
illustrationer och låser inte ännu öppna spelregler.

`raptor-single-fleet-grafik` är **Fullständigt implementerat**: samma
Raptor-motiv används i separata transparenta bilder för Star map och
bordning.
Bordningsbilden och kartbilden ska visa samma skepp med samma utsnitt och
proportioner så att bordningskartan kan linjera mot skeppsbilden. Den nya bilden behåller
originalets utsnitt och silhuett; jämförelse av alfa visar cirka 98,8 %
överlapp. En separat bakgrund med Raptor och avskalad rymd finns som
`src/client/space-map/assets/backgrounds/raptor-ui-background.webp`. Den är
förberedd för UI men är ännu inte inkopplad i en skärm.

Originalen finns i `assets/original/ships/raptor.png` och
`assets/original/backgrounds/raptor-ui-background.png`. Spelbilderna är
`src/client/space-map/assets/ships/raptor.webp` (512 × 512) och
`src/client/space-map/assets/ships/raptor-boarding-hd.webp` (1 254 × 1 254).
Båda är proportionella versioner av samma transparenta original. Testet
`raptor-single-fleet-grafik` kontrollerar transparens och bildernas format.

## Motorbilder i Fleet

`fleet-visuella-platser`: Rocket engine och Ion pulse engine visas med egna
transparenta bilder i `src/client/space-map/assets/equipment/`. Bilderna
skapades med den inbyggda bildgeneratorn som slitna mekaniska moduler i
trekvartsvy, med orange raketmunstycke respektive blå jonspolar och munstycke.

Bildprompter (inbyggd imagegen):

- `Use case: stylized-concept. Asset type: transparent game inventory icon. Draw one compact mechanical rocket engine module, gray worn industrial metal with a warm orange nozzle, three-quarter top view, centered and fully visible, crisp illustrated sci-fi game art, no text, no frame or shadow, transparent background.`
- `Use case: stylized-concept. Asset type: transparent game inventory icon. Draw one compact ion pulse engine module, gray worn industrial metal with a luminous cyan-blue nozzle and subtle coils, three-quarter top view, centered and fully visible, crisp illustrated sci-fi game art, no text, no frame or shadow, transparent background.`

## Vapenbilder i Fleet

`fleet-vapenbilder`: Cannon, Light cannon, Raider cannon och Missiles har
varsin transparent inventariebild, skapad med den inbyggda bildgeneratorn.
Bilderna finns i `src/client/space-map/assets/equipment/` med filnamnen
`cannon-illustration.png`, `light-cannon-illustration.png`,
`raider-cannon-illustration.png` och `missiles-illustration.png`.

Bildprompter:

- `Use case: stylized-concept. Asset type: transparent inventory image for a science-fiction spaceship video game. Subject: Light cannon: a small compact starship energy cannon with a slender futuristic barrel and warm amber details. Style: illustrated game art, worn steel and muted blue-gray with amber accents, matching a lived-in spaceship, isolated three-quarter top view. Single module, centered fully in frame, actual transparent background. No words, labels, frame or watermark.`
- `Use case: stylized-concept. Asset type: transparent inventory image for a science-fiction spaceship video game. Subject: Cannon: a larger spaceship cannon with a chunky futuristic barrel and warm amber details. Style: illustrated game art, worn steel and muted blue-gray with amber accents, matching a lived-in spaceship, isolated three-quarter top view. Single module, centered fully in frame, actual transparent background. No words, labels, frame or watermark.`
- `Use case: stylized-concept. Asset type: transparent inventory illustration for a fictional spaceship game. Subject: an improvised pirate starship Raider cannon, a compact rusty science-fiction turret assembled from mismatched industrial metal, glowing amber details. Style: crisp hand-painted game art, centered single isolated module in three-quarter view, actual transparent background. No labels, frame, or watermark.`
- `Use case: stylized-concept. Asset type: inventory illustration for a fictional science-fiction video game. Draw one compact starship missile launcher, an imaginary mechanical box containing two small stylized projectiles in round bays. Strongly stylized hand-painted game art, worn blue-grey industrial metal and amber lights. Single isolated object in three-quarter view, transparent background, no text, no logos, no people, no photorealism.`

## Besättningsbilder i Fleet och Crew

`fleet-besattningsrutor`: tolv individuella porträtt visas i Crew-platserna
och i personinformationen. Bilden `src/client/space-map/assets/crew/crew-portraits.png`
är en bildkarta med fyra kolumner och tre rader. Personernas stabila ID
bestämmer vilket porträtt som används även efter skeppsbyte och laddning.
Bilden skapades med den inbyggda bildgeneratorn; tidigare separata porträtt
påträffades inte i projektet eller dess Git-historik.

Bildprompt (inbyggd imagegen):

- `Use case: stylized-concept. Asset: a single 4-column by 3-row sprite sheet of twelve distinct individual spaceship crew head-and-shoulders portraits, for small square inventory slots in a mobile science-fiction game. Exactly 12 separate square cells, equal size, perfectly aligned edge-to-edge without gutters, each with one centered face and shoulders, never crossing cell boundaries. Diverse adult men and women of varied appearances, practical civilian spacer clothing, lived-in patched industrial space uniforms; no helmets obscuring faces. Unified detailed painterly game illustration, worn teal blue-gray and warm amber lighting, coherent spacefaring crew, dark unobtrusive background in each cell. Legible recognizable faces at small size. No text, labels, numbers, borders, graphic UI or watermark.`
