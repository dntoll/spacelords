# Skeppsgrafik

`unik-bild-for-civila-transporter` — **Fullständigt implementerat**, 2026-10-31:
Civilian shuttle har en egen transparent bild med passagerarfönster,
avrundad ljus kabin, blå motorer och gula markeringar. Den används i samtliga
skeppsvyer och på både Star map och stridskartan. Originalet finns i
`assets/original/ships/civilian-shuttle.png`; webbversionen i
`src/client/assets/ships/civilian-shuttle.webp`, proportionellt skalad till
384 × 192 px med bibehållen alfa och WebP-kvalitet 90. Den inbyggda imagegen
användes. [Den fullständiga prompten](image-prompts/ships/civilian-shuttle.md)
bevaras för framtida ändringar.

`bargat-piratskepp-behaller-typ` gör även Space pirate till en spelarskeppstyp
efter reparation. Piratbilden väljs därför efter skeppstyp och används för båda
sidor. Detta ersätter den tidigare avgränsningen nedan om enbart fientliga pirater.

Originalet är `assets/original/ships/ships.png`. De tre skeppen kopplas till
Colony ship (överst), Fighter (mitten) och Exploration ship (nederst).

Friläggningen gjordes med det inbyggda imagegen-verktyget, med transparent
bakgrund. Resultatet bevaras som `assets/processed/ships/ships-cutout.png`.
Alfakanalen kontrollerades: bakgrunden är transparent och skeppen är synliga.
Originalet behålls oförändrat.

Skeppen klipptes ut radvis med tio bildpunkters marginal runt den synliga
formen och skalades proportionellt till högst 384 × 192 px. Webbversionerna
är WebP med kvalitet 90 i `src/client/assets/ships/`:

- `colony-ship.webp`
- `fighter.webp`
- `exploration-ship.webp`

Vite importerar bilderna med rätt basadress och innehållshash. Samma koppling
används i kartans valda flottpanel och i flottbyggaren. Ingen kartmarkör eller
spelmekanik ändras av grafiken.

## Prompt för friläggningen

> Use case: background-extraction. Edit target: the attached local ship sprite sheet. Remove only the dark background, haze and ambient glow surrounding the three ships to create genuine alpha transparency. Preserve the exact artwork, colors, mechanical details, outlines, facing direction, ship size and relative placement of all three original spacecraft: top large Colony ship, middle small winged Fighter, bottom medium Exploration ship with round dish. Keep all three completely intact, including thin wing tips and antennae. Keep the same vertical three-row layout and canvas aspect ratio so they can be cropped into separate game sprites. Do not add text, shadows, new ships or any redesign. Transparent background, clean edges suitable for game UI sprites.

## Nya skeppssprites, 2026-10-28

| Krav                       | Status                     | Beteende                                                                                                                                                                                                                                                                         |
| -------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `genererade-skeppssprites` | Fullständigt implementerat | Transport ship och Salvage ship har egna genererade bilder i flottvyer och på kartan. Space pirate har en separat rost­röd, ockragul och kolgrå bild med slitna, lappade plåtar och provisoriska lagningar. Samtliga visas ovanifrån, med nos åt höger och transparent bakgrund. |

Detta ersätter uttryckligen bildpromptpaketets tidigare avgränsning att inga
nya bilder skulle genereras eller kopplas in. Colony ship, Fighter och
Exploration ship behåller sin grafik. Sparade spel påverkas inte.

PNG-originalen sparas som `assets/original/ships/transport-ship.png`,
`salvage-ship.png` och `pirate-ship.png`. Webbversionerna finns i
`src/client/assets/ships/` med samma basnamn och ändelsen WebP.
Transparenta marginaler beskärs och bilderna skalas proportionellt till högst
384 × 192 px, med WebP-kvalitet 90. Alfa och kompletta silhuetter kontrolleras.

ShipImages delar bildadresser mellan HTML och p5. Piratbilden väljs i vyn
utifrån befintlig fientlig identitet; den blir ingen ny spelarskeppstyp.
Kravkopplade enhetstester kontrollerar porträtt, båda kartans bildzoomnivåer
och att spelarens Fighter inte får piratens bild.
