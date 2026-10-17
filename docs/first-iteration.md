# Första iterationen: karta och information

## Avgränsning

En fast exempelvärld återställs vid omladdning. Kartan är en hexagonal skiva med
radie tio, med stjärnor på `(0,0)`, `(7,-3)` och `(-6,6)`. Varje stjärna har tre
planeter i direkta grannhexagoner. Hemplaneten finns på `(1,0)` och är spelarens
enda koloni. Både fasta planeter och gasplaneter ingår. Exempelvärden är
preliminära; byggorder, sparning, rundor och simulering ingår inte.

Sikten omfattar hemplaneten och dess sex grannar. Alla stjärnpositioner är synliga,
men dolda planeter förekommer inte i renderingsdata, paneler eller
tillgänglighetstext. Alla världens data finns lokalt i denna enspelarversion;
framtida multiplayer måste besluta om serveransvar och informationsåtkomst.

## Klient och MVC

p5.js 2.3.4 används i instance mode för 2D-canvas. Domänmodell, hexgeometri,
kameramodell och controllers har inget beroende av p5. Vyer hanterar plattformens
indata och renderar frysta läsdata; modelländringar sker genom controllers.
Navigation, kontroller, planetinformation och forskningsinformation är HTML.

Kartan ritas vid förändring med `noLoop()` och `redraw()`, inte kontinuerligt.
Vyn observerar behållarens storlek och städar p5-instans, observer och
händelselyssnare vid navigation. Kameran och vald ruta ägs av applikationsmodellen
och överlever vybyte. Inga nya serveradresser behövs.

Musdrag och en fingerkontakt panorerar. Mushjul, nypgest och knappar zoomar.
Klick väljer ruta, men ett drag ska inte göra det. Kamera och zoom begränsas så
att kartan inte tappas bort; hemknappen återställer läget. Knappar och
tangentbordsstöd kompletterar canvas, och panelen är en sidopanel på dator men
placeras under kartan på liten skärm.

Hemplanetens vy visar namn, typ, ägare, befolkning, gästvänlighet, råvaror per år
och byggplatser. Forskningsstationen visas som tillgänglig från start, men
byggfunktionen är tydligt inaktiv. Forskningsvyn visar enbart information, utan
tekniknoder. Båda vyerna har en tydlig tillbaka-knapp.

## Kravkoppling och verifiering

Snabba enhetstester kopplas till `hexkarta`, `lokal-sikt`, `synliga-stjarnor`,
`kartnavigation`, `planetinformation`, `visa-byggalternativ`, `forskningsoversikt`,
`vynavigation`, `fast-exempelvarld`, `statisk-planetplacering` och `mvc-arkitektur`.
De skyddar geometri, sikt, gränsvärden, navigation och oföränderliga läsdata.

Playwright i den utökade sviten testar faktisk p5-rendering, mus och touch,
canvasstorlek, upprepade vybyten och mobil-, surfplatte- och datorstorlekar mot
det byggda Pages-resultatet. Befintliga HTTP-tester för server och underkatalog
behålls. CI kör samtliga kontroller. Publicering beställs separat.
