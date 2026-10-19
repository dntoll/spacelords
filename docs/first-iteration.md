# Första iterationen: karta och information

## Avgränsning

Den ursprungliga iterationen återställde exempelvärlden vid omladdning. Sedan
2026-10-19 ersätts detta av `sparat-spel`: varje tom sparplats börjar i den fasta
exempelvärlden, och befintliga spel återupptas. Kartan är en hexagonal skiva med
radie tio, med stjärnor på `(0,0)`, `(7,-3)` och `(-6,6)`. Varje stjärna har tre
planeter i direkta grannhexagoner. Hemplaneten finns på `(1,0)` och är spelarens
enda koloni. Både fasta planeter och gasplaneter ingår. Exempelvärden är
preliminära. Ursprungligen ingick inte byggorder, sparning, rundor eller
simulering; aktuell omfattning och status finns i [produktkraven](product-requirements.md).

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
att kartan inte tappas bort; `Homeworld` återställer läget. `Known objects` och
tangentbordsstöd kompletterar canvas. Kartan fyller spelytan; kompakta kontroller
och en panel för vald himlakropp ligger ovanpå. På mobil ligger panelen vid
nederkanten. Ingen vy använder sidscroll. Detta ersätter den tidigare staplade
mobillayouten efter användarens uttryckliga ändring.

Planetens `Overview` visar namn, typ, `Owner`, `Population`, `Habitability` och
`Used build slots`. `Resources` visar `Iron`, `Water` och `Oil` i `units/year`.
`Buildings` visar kommande `Research station` och lediga byggplatser. Flikval
förmedlas via controller och sparas i applikationsmodellen; endast aktiv panel
renderas. Tangentbordets vänster/höger samt Home/End växlar flik.
`Research` visar enbart information, utan tekniknoder. `Build research station`
är tydligt inaktiv och båda vyerna har `Back to map`.

## Kravkoppling och verifiering

Snabba enhetstester kopplas till `hexkarta`, `lokal-sikt`, `synliga-stjarnor`,
`kartnavigation`, `planetinformation`, `visa-byggalternativ`, `forskningsoversikt`,
`vynavigation`, `fast-exempelvarld`, `statisk-planetplacering` och `mvc-arkitektur`.
De skyddar geometri, sikt, gränsvärden, navigation och oföränderliga läsdata.

Playwright i den utökade sviten testar faktisk p5-rendering, mus och touch,
canvasstorlek, upprepade vybyten och mobil-, surfplatte- och datorstorlekar mot
det byggda Pages-resultatet. Befintliga HTTP-tester för server och underkatalog
behålls. CI kör samtliga kontroller. Publicering beställs separat.

## Genomfört

Den fasta exempelvärlden, läsmodellerna, p5-kartan, kameran och de båda
informationsvyerna är implementerade. Planeten Tellus har preliminärt 12 000
invånare, 100 procents gästvänlighet och sex lediga byggplatser. Det finns inga
byggorder eller forskningsval. Gasplaneterna finns i världen men är ännu dolda
för spelarens lokala sikt.

Kända objekt kan väljas via `Known objects`. Kartan har även tangentbordsstöd:
piltangenter panorerar, plus/minus zoomar, Home återgår och Enter väljer centrum.
Pekargester och kamera är separata från både DOM och p5. Endast synliga objekt
lämnas till ritning och tillgänglighetstext.

Verifieringen omfattar snabba enhetstester och browserkontroller på fyra
projekt: desktop Chromium, telefon Chromium, telefon WebKit och surfplatta
WebKit. Enhetsspecifika fall hoppas endast över när inmatningsmetoden inte finns,
exempelvis multitouch via CDP i WebKit. Inga misslyckade tester undantas.
HTTP-sviten omfattar fem kontroller. Browserresultat och skärmbilder ligger i den
ignorerade katalogen `test-results/`. Publicering beställs fortsatt separat.

## Skärmfyllande vyer och engelska

`viewport-game-layout` skyddas av enhetstest för fliknavigation och browsertester
som kontrollerar att karta, planetens tre flikar och `Research` ryms utan scroll
eller klippta kontroller. Förutom ordinarie enheter provas 320×568, 844×390 och
667×320. Kartans canvas ska uppta mer än 80 procent av fönstrets yta.

`english-game` och `focused-interface` verifieras i vytester: användbara
objektbeskrivningar och engelska handlingar finns kvar utan introduktionsslogans.
Browsertester följer engelska synliga och tillgängliga namn, resurser och
språkattribut. Kod och spel är engelska; svensk dokumentation återger speltermer
på engelska. De befintliga kravnamen är oförändrade.

Regressionstestet för vertikal scroll misslyckades mot den tidigare
mobillayouten före ändringen. Vyerna använder nu fönstrets dynamiska höjd och
informationsflikar. Kartans storlek observeras även vid ändrad fönsterstorlek.

CI upptäckte att bredare systemtypsnitt kunde låta flikarnas minsta innehållsbredd
pressa planetvyn utanför en 320 pixlar bred skärm. Ett nytt regressionstest med
systemtypsnitt och större textmått återskapade felet före rättningen. Planetvyn
har nu uttrycklig fönsterbegränsning och flikarna får krympa med kompaktare
mellanrum på mobil. Samma kontroll körs i Chromium och WebKit.
