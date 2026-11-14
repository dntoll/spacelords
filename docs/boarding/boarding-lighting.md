# Ljussättning i bordning

Nästa steg för belysningen i bordningsstriden. Interiörerna ska få färgat,
skuggkastande ljus i högre upplösning än rutnätet, lampor som kan tändas,
släckas och blinka, och ljus som figurerna bär med sig. Mörker blir senare en
del av spelet: en obelyst figur är svårare att upptäcka och träffa.

Dagens krav `ljuskallestyrd-bordningsbelysning` och `tileljus-for-sprites`
behålls och byggs vidare på. `vertexljus-i-bordning` ersätts av
`ljuskarta-i-bordning` när den är på plats. Kraven ersätter också meningen
"Lamporna är fasta och påverkas inte av stridsskador" i
[bordningsstrid](boarding-combat.md).

## Krav och status

| Krav                        | Status               | Innehåll                                                                                                                                                                                                                                                                         |
| --------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ljuskarta-i-bordning`      | Delvis implementerat | Golv och väggar får ljus och skuggor i högre upplösning än rutnätet. Skuggkanter följer väggar, dörrar och rök i stället för rutornas kanter. Ersätter `vertexljus-i-bordning`. Golv är klart i strid och editor; väggar, figurer och föremål använder ännu hörn- och rutljuset. |
| `fargat-ljus-i-bordning`    | Ej implementerat     | Varje lampa har en färg, vit som standard. Färgat ljus tonar golv, väggar, figurer, föremål och rök. Lampor kan få färg i editorn. Befintliga kartor fungerar oförändrade.                                                                                                       |
| `visuell-morkerinstallning` | Ej implementerat     | En inställning gör bordningens bild ljusare eller mörkare. Standard är dagens mörker. Inställningen påverkar bara bilden, aldrig upptäckt, träff eller andra spelregler.                                                                                                         |
| `ljusniva-per-ruta`         | Ej implementerat     | Varje ruta har en ljusnivå i spelets regler, beräknad från de lampor som är tända och når rutan. Ljusnivån räknas om när lampor, dörrar, väggar eller rök ändras. Figurer och föremål ljussätts från sin ruta, som i `tileljus-for-sprites`.                                     |
| `tandbara-lampor`           | Ej implementerat     | Lampor kan vara tända eller släckta under striden. Ändringen syns direkt på ljuset och på rutornas ljusnivå. Vad som tänder och släcker en lampa bestäms i senare krav.                                                                                                          |
| `brand-som-ljuskalla`       | Ej implementerat     | Något som brinner lyser upp sin omgivning med ett varmt, fladdrande ljus och räknas som en tänd ljuskälla. Kräver att brand finns i spelet.                                                                                                                                      |
| `dynamiskt-bordningsljus`   | Ej implementerat     | Ljus som rör sig eller ändras ofta, såsom bärbara ljus, blinkningar och mynningsflammor, kastar också skuggor. De får ha lägre upplösning än de fasta lamporna om prestandan kräver det.                                                                                         |
| `barbart-ljus`              | Ej implementerat     | En figur kan bära ett ljus, exempelvis en ficklampa, som lyser i figurens riktning och följer med när den rör sig och vänder sig.                                                                                                                                                |
| `blinkande-lampor`          | Ej implementerat     | En lampa kan blinka eller fladdra. Blinkningen är visuell; i spelets regler räknas lampan som tänd.                                                                                                                                                                              |
| `mynningsblixt-i-bordning`  | Ej implementerat     | Ett skott får omgivningen att blixtra till kort. Blixten är visuell och påverkar inte ljusnivån i spelets regler. Skottets ljud finns redan som ljudmarkör, `sikt-minne-och-ljudmarkorer`.                                                                                       |
| `morker-forsvarar`          | Ej implementerat     | En figur på en mörk ruta är svårare att upptäcka och träffa än en på en upplyst ruta. Del av det kommande smygandet.                                                                                                                                                             |

## Teknisk inriktning

Ljuset delas i två delar som räknas från samma lampor och samma geometri:

- **Spelregelljus** i modellen: en ljusnivå per ruta, beräknad i mittpunkten
  som i dag. Lampornas tillstånd (tänd/släckt), bärbara ljus och brand är
  modelltillstånd. Blinkning och mynningsblixtar ingår inte.
  Mörkerinställningen ingår inte heller; modellen räknar med ett fast grundljus.
- **Visuellt ljus** i vyn: en färgad ljuskarta i rutnätets koordinater, med
  flera texlar per ruta. För varje ljuskälla beräknas en 2D-synlighetspolygon
  mot väggar, stängda dörrar och rök, och polygonen fylls med ljusets falloff
  och färg additivt. Golvets projektion är affin, så ljuskartan kan
  multipliceras över hela golvet med en transform. Väggytor hämtar ljus från
  ljuskartan vid väggens fot, med hänsyn till ytriktning och höjd.

Ljuskartan har två lager:

- Ett **statiskt lager** med hög upplösning för tända fasta lampor. Det byggs om
  bara när lampor tänds eller släcks eller när väggar, dörrar eller rök ändras.
- Ett **dynamiskt lager** med lägre upplösning för bärbara ljus, blinkande
  lampor, brand och mynningsblixtar. Det ritas om bara när något i lagret har
  ändrats.

Upplösning per lager provas fram mot mobil med benchmarkskriptet. Börja i
Canvas2D bakom ett utbytbart gränssnitt; WebGL prövas bara om mätningarna
kräver det. Figurer kastar inte skugga i första versionen. Låga hinder och
`Half cover` blockerar inte ljus, som i dag.

Lampans färg läggs som ett valfritt fält i kartans `[lights]`-information med
vitt som standard. Lampornas tillstånd under striden är ett nytt fält i sparad
strid; det ska stämmas av enligt `avstamning-sparkompatibilitet` innan det
införs, även om ett standardvärde gör det bakåtkompatibelt.

## Ordning

1. Prototyp av statiskt, färgat ljus på golv med mätning mot dagens ljus på
   mobil (`ljuskarta-i-bordning`, `fargat-ljus-i-bordning`).
2. Väggar, figurer, föremål och rök från ljuskartan, och mörkerinställningen.
3. Ljusnivå per ruta och tändbara lampor i modellen.
4. Dynamiskt lager med bärbart ljus, blinkning och mynningsblixt.
5. Brand som ljuskälla när brand finns.
6. Mörker i upptäckt och träff.

## Öppna frågor

- Vad tänder och släcker lampor: att skjuta sönder dem, strömbrytare, ström
  till rum eller händelser?
- Vem bär ljus, och kan det släckas för att smyga?
- Hur många ljusnivåer behöver spelreglerna, och hur stor effekt har mörker på
  upptäckt och träff?
- Hur väljer spelaren mörkerinställningen, och var visas den?
