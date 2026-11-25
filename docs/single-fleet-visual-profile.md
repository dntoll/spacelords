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
