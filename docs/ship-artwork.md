# Skeppsgrafik

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
