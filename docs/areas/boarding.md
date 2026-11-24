# Bordning

Bordning är en turordningsstrid i 60° perspektiv inne i skepp, både i
kampanjen och fristående från `Saved games`. Den har ljus, rök, dörrar,
fönster, utrustning och en lokal karteditor. Detaljerna står i
[bordningsstrid](../boarding/boarding-combat.md) och
[ljus i bordning](../boarding/boarding-lighting.md).

## Krav

- **Skott på samma ruta:** `forsvararskott-samma-ruta` (2026-11-24) är
  **Fullständigt implementerat**. Ett missat skott där skytt och mål står på
  samma ruta avslutas utan att striden eller gränssnittet låser sig.

- **Återställ sparad försvarartur:** `sparad-forsvarartur-aterhamtas`
  (2026-11-24) är **Fullständigt implementerat**. En sparad bordning där
  den aktiva försvararen inte längre kan agera, saknar giltig aktivering eller
  där ingen aktiv soldat finns angiven
  fortsätter till nästa soldat. Om inga försvarare återstår avslutas bordningen
  och det övertagna skeppet behålls.

- **Försvararturen fortsätter:** `forsvarartur-fastnar-inte` (2026-11-24) är
  **Fullständigt implementerat**. Försvararnas tur lämnas vidare om en
  automatisk handling inte kan planeras. Om visningen av en handling misslyckas
  eller inte blir klar återgår spelet till det aktuella stridsläget utan att
  fastna. Regeln gäller även när en sparad bordning återupptas.

- **Landgång och bordningsgränssnitt:** `landgang-med-bordningsstart`,
  `airlock-oppnar-at-blickriktning`, `ihopfallbar-bordningslogg` och
  `beskrivning-av-vald-bordningsruta`, `granat-mot-vald-fiende`,
  `handlingsknappar-ovanfor-halsomatare`
  och `kompakt-titel-for-vald-bordningsruta` är **Fullständigt implementerade**.
  Bordare börjar på en tio rutor lång landgång vända mot målskeppet;
  airlockens dörr i soldatens blickriktning är öppen. Loggen kan fällas ihop
  även efter scrollning och rutmenyn beskriver valet och ligger högre upp.

- **Bordningsfeedback november 2026:** `kantindikator-utanfor-granssnitt`,
  `bordare-vid-malskeppets-ande`, `eget-skepp-upptackt`, `tunnare-dorrar`,
  `airlockdorr-framfor-soldat`, `fiender-reagerar-pa-ljud`,
  `fiender-soker-upp-bordare`, `samlat-pc-granssnitt`,
  `meny-ovanfor-valt-mal`, `hp-i-valt-mal`, `tunn-ram-kring-vald-ruta` och
  `skott-genom-dubbelklick` är **Fullständigt implementerade**. Crosshair vid
  kanten hamnar aldrig under gränssnittet, bordarna står vid målskeppets ände
  av landgången, försvarare hör ljud inom räckhåll och söker upp bordarna, och
  ett dubbelklick på en fiende skjuter. Se
  [bordningsstrid](../boarding/boarding-combat.md).

- **Kompakt bordningslogg och stridskontroller:** `bordningslogg-i-hornet`,
  `senaste-raden-i-bordningsloggen` och `hallning-vid-vapnet` är
  **Fullständigt implementerat**. `Combat details` ligger uppe till vänster,
  följer senaste raden när loggen är öppen och visar nya händelser kortvarigt.
  `Crouch`/`Stand` och `Overwatch` ligger vid vapnet; fullscreen och stängning
  ligger uppe till höger. Rundrubriken är borttagen. Se
  [bordningsstrid](../boarding/boarding-combat.md).

- **Bordningshandlingar:** `utrustningsknapp-utfor-valt-mal`,
  `rokgranat-pa-person`, `medkit-for-skadad-soldat`,
  `ateranvand-handlingsbilder` och `orsak-till-otillganglig-handling` är
  **Fullständigt implementerat**. Vapen och prylar används mot valda mål,
  granater kan riktas mot personer och Med kit kan vårda skadade soldater.
  Tidigare handlingsbilder och den kompakta turknappen används, och spelaren
  får en förklaring vid tryck på en otillgänglig handling. Soldaten vänder sig
  åter mot en vald ruta och ett andra tryck går dit. `valbar-bordningssoldat`
  omfattar hela soldatraden även i liggande mobilläge; en soldat som inte kan
  agera förklarar varför vid tryck. Se
  [bordningsstrid](../boarding/boarding-combat.md).

- **Formbara bordningsskepp och editor:** `formbar-skeppskontur`,
  `redigerbara-bordningslampor`, `kategoriserad-bordningspalett` och
  `isometrisk-skeppsreferens` är **Fullständigt implementerat**. `Outside`
  formar skeppskonturen och editorn visar skeppsbilden i båda projektionerna.
  `skeppsbild-under-bordning` är **Delvis implementerat**: skeppsbilden ligger
  under kartan även i strid, för kartor som justerats i editorn (testbordningen
  och `Colony ship`). Övriga skepp saknar justering och visar ännu ingen bild.
  `hogupplost-skeppsbild-i-bordning` är **Fullständigt implementerat**: spel och
  editor lägger kartan på en högupplöst bild av skeppet i stället för
  stjärnkartans lilla bild.
  `spelidentisk-bordningseditor` är **Fullständigt implementerat**: samma bildval,
  ytprojektion, ljus och väggsnitt används. Se [bordningsstrid](../boarding/boarding-combat.md).

- **60° kameravinkel i bordning:** `kameravinkel-60-i-bordning` är **Fullständigt implementerat**. Bordningskartan visas med samma 60° kamerahöjd som Ludos high-angle, vilket ger nästan kvadratiska diamanter (64 × 32√3). Figurer och reactor är kalibrerade för vinkeln; airlock byggs i samma projektionsgeometri enligt `airlock-med-dubbla-geometridorrar`. Ersätter provet `isometri-3-2-i-bordning` och 2:1-projektionen i `isometrisk-bordningsvy`.

- **Explosioner, förstörelse och rök:** `bordning-explosioner-och-forstorelse`,
  `ingen-rok-i-hela-vaggar` och `avstangda-omojliga-handlingar` är
  **Fullständigt implementerat**. Splittergranater exploderar med eld, gnistor,
  splitter och tryckvåg; rökgranater ger ett rökutbrott. Objekt som går sönder
  kastar skrot och lämnar bråte, och reactor ger en större explosion. Rök hamnar
  aldrig i hela väggar, ytterskrov eller stängda dörrar, men väl i sönderskjutna
  väggar. Handlingar som inte kan utföras är avstängda.
  `kontextstyrda-bordningshandlingar` är **Fullständigt implementerat**:
  handlingar visas vid den aktiva soldaten eller valda rutan utifrån mål,
  avstånd, AP och utrustning. Det ersätter `fasta-handlingsplatser` och
  dubbeltryck för skott och dörrar. `gang-knapp-till-avlagset-mal` är
  fortsatt **Fullständigt implementerat** genom rutmenyn.
  `utslagen-fiende-utan-sikte` och `ljudmarkor-bara-utom-sikt` är
  **Fullständigt implementerat**: utslagna personer får varken hårkors eller
  tom HP-mätare, och ljudmarkörer visas bara på rutor som inte syns.
  `fiende-syns-till-sin-tur` är **Fullständigt implementerat**: en fiende som
  truppen har sett står kvar på kartan när ingen längre ser den, tills fiendens
  egen tur börjar. Därefter visas frågetecknet för senast kända position.
  Samma sak gäller civila, som står kvar tills de civilas fas når dem.
  `geometrisk-sikt` och `delvis-synligt-mal` är **Fullständigt
  implementerat**: den valda soldatens sikt ritas på golvet som en yta med
  ljusblå kantlinje som klipps av siktlinjen, inte per ruta, och halvskydd i
  sikt markeras orange. En ruta räknas som sedd från 10 % synlig yta; mål som
  syns till under hälften får +4 i försvar och delvis synliga mål +2.
  `sikt-over-hela-skeppet` är **Fullständigt implementerat**: ombord är det
  bara väggar, dörrar, rök och personer som begränsar sikten, inte avståndet.
  Sikten når hela skeppet och ersätter radien 8,5 rutor i `geometrisk-sikt`.
  Skottens räckvidd är fortfarande 8 rutor.
  `halvskydd-skuggar-delvis` är **Fullständigt implementerat**: halvskydd
  kastar en orange skugga närmast bakom sig, och ett mål som till minst hälften
  ligger i skuggan får full skyddsbonus, till 10–50 % halv bonus.
  `halvskydd-markering-sammanfogad` är **Fullständigt implementerat**: alla
  skuggor ritas som en enda orange yta med en kontur, beskuren till den blå
  siktytan och skeppets rutor; låga väggar skuggar från själva väggen.
  `hukad-ser-inte-over-halvskydd` är **Fullständigt implementerat**: en hukad
  person ser och skjuter inte över halvskydd längre bort än en ruta.
  `grannruta-syns-genom-rok` är **Fullständigt implementerat**: två personer
  på intilliggande rutor, även diagonalt, ser varandra trots rök.
  `skott-langs-fri-siktlinje` är **Fullständigt implementerat**: skottet
  följer vid träff den fria siktlinjen närmast målets mitt och krossar glas längs den.
  `missade-skott-traffar-annat` är **Fullständigt implementerat**: missade
  gevärsskott avviker och kan skada personer eller föremål längs banan.
  `avstand-paverkar-traffchans` är **Fullständigt implementerat**: skott får
  +1 i målets försvar per påbörjade två rutor bortom två rutor (högst +3 vid
  åtta rutor). Se
  [bordningsstrid](../boarding/boarding-combat.md).

- **Rumsinteriörer:** `rumsspecifika-bordningstexturer` och
  `texturerad-vaggovansida` är **Fullständigt implementerat**: bilderna används
  i spel och editor. Se
  [bordningsstrid](../boarding/boarding-combat.md).

- **Bordningsgränssnitt och rök:** `tydliga-handlingsbilder-pa-mobil` är
  **Fullständigt implementerat**: stora särskiljbara knappar utan text syns utan
  intern rullning. `illustrerade-bordningshandlingar` är **Delvis implementerat**:
  de illustrerade handlingarna har metalliska bilder i samma stil som skeppen.
  Stand, Hack door, Evacuate och Abort boarding använder ännu enkla symboler.
  `bordning-utan-kameraknappar-och-forklaringspanel`,
  `dorrhandling-framfor-soldat`, `oppen-dorr-som-golvruta` och
  `volymetrisk-bordningsrok` är **Fullständigt implementerat**. Handlingsraden
  ligger längre ned, öppna dörrar kan väljas som gångrutor och rök animeras
  genom rutan. `personlig-bordningsutrustning`, `bordningshud-i-botten` och
  `fullscreen-i-bordning` är **Fullständigt implementerat**. Varje soldat har
  ett `Rifle` och en roterande personlig pryl; granatbärare har tre granater.
  Soldatval och handlingar ligger längst ned; logg och fönsterknappar ligger i
  övre hörnen. Bordning försöker öppna fullscreen automatiskt men har ingen
  egen knapp (`helskarm-fran-sparade-spel`). Se
  [produktkrav](../product-requirements.md).

- **Bordningshandlingar och flyt:** `stang-oppen-dorr`,
  `granat-kostar-bara-vid-kast`, `granat-avvaljs-utan-ap`,
  `granat-over-halvskydd-inte-genom-vagg`,
  `gang-mot-avlagset-mal`, `vand-mot-vald-ruta`,
  `vandning-mot-nasta-steg`, `ap-fraktion-sparas`,
  `sparad-gangdestination`, `fast-soldatordning`,
  `bordning-jamn-bildfrekvens`, `snabb-bordningsvagsokning` och
  `motstandartur-i-mitten` är **Fullständigt implementerat**. En soldat
  intill en öppen, tom dörr får `Close door`. En granat som inte kan kastas
  drar ingen AP och knapparna är avstängda. En vald granat avväljs automatiskt
  när soldaten inte längre har AP för ett kast. Granater kastas över halvskydd,
  låga väggar, rök och hukande personer, men inte genom väggar, stängda dörrar
  eller stående personer, och en miss studsar aldrig genom en vägg. Ett andra tryck på ett mål som
  ligger för långt bort går så långt AP räcker och vänder soldaten mot nästa
  steg; turen slutar och AP som inte räckte till nästa steg sparas till
  nästa runda, och målet är valt igen då. Att välja en ruta vänder soldaten ditåt,
  och spelarens soldater väljs alltid i samma ordning. Golvlagret cachas och
  figurernas ljus ritas utan p5:s `tint()` för jämnare bildfrekvens på mobil.
  Vägen till en vald ruta visas utan väntan, och ett turavslut väntar inte
  på långsam vägsökning hos civilister och försvarare. Medan motståndarna
  agerar visas `Defenders are acting…` i en ruta mitt på skärmen i stället
  för i handlingsraden.
  Se [bordningsstrid](../boarding/boarding-combat.md).

- **Bordningsanimation och ljus:** `synligt-skott-hela-vagen`,
  `kastad-granat-i-bage` och `morkare-ambientljus-i-bordning` är
  **Fullständigt implementerat**. Skott visas fram till målet, granater kastas
  i en båge och grundljuset är lägre. Se [bordningsstrid](../boarding/boarding-combat.md).

- **Vändning under förflyttning:** `vandning-under-forflyttning` är
  **Fullständigt implementerat**. En figur vänder sig samtidigt som den går
  och varje vändning är snabb. Se [bordningsstrid](../boarding/boarding-combat.md).

- **Bordningskamera:** `kamerafokus-vid-bordningssoldatbyte`,
  `kameraoverblick-vid-synlig-bordningsrorelse`,
  `kameraoverblick-fore-bordningsskott` och
  `kantindikator-for-synlig-fiende` är **Fullständigt implementerat**.
  En zoomnivå gäller för spelaren oavsett soldat. När en egen soldat blir
  vald panoreras figuren till mitten av den fria kartytan och zoomen sätts
  till den nivån. Skott, synlig rörelse, en nyupptäckt figur och ett ljud
  spelaren kan höra panorerar tillfälligt händelsen och de egna soldater
  som ser den till bildens mitt och zoomar ut bara så mycket som behövs, och kameran återgår sedan till spelarens zoom och panoreringen före
  händelsen. En ny vald soldat blir i stället fokus. Det ersätter både
  kameran per soldat och att översikten låg kvar. Kameran tar hänsyn till HUD
  och kan avbrytas manuellt. Se
  [bordningsstrid](../boarding/boarding-combat.md).

- **Bordningens kartinformation:** `bordning-utan-riktningspilar`,
  `bordning-utan-sikt-och-eldrutor`, `senast-sedd-fiende-med-fragetecken` och
  `utslagna-bordningsfigurer` är **Fullständigt implementerat**. Figurerna
  visar riktningen med sina åtta bildvinklar utan vita pilar. Röda och blå
  rutkanter har tagits bort. Senast sedd levande eller utslagen fiende visas
  som ett frågetecken, medan döda inte lämnar markören. Utslagna och döda
  soldater och civilister har egna liggande bilder. `aktiv-figur-pa-ruta-med-kroppar`
  är **Fullständigt implementerat**: aktiva figurer står kvar på rutans vanliga
  position även när flera kroppar ligger där. Siktområdets kontur förenklas en gång per sikt i stället för att ritas med tusentals punkter varje bildruta. Se
  [bordningsstrid](../boarding/boarding-combat.md).

- **Belysning i bordning:** `ljuskallestyrd-bordningsbelysning`, `vertexljus-i-bordning` och `tileljus-for-sprites` är **Fullständigt implementerat**. Fasta kartlampor och ambientljus styr golv, väggar och sprites oberoende av aktuell sikt. Kravkopplade tester och visuell mobilgranskning verifierar ljus och väggsnitt. Se [bordningsstrid](../boarding/boarding-combat.md).

- **Ny ljussättning i bordning:** `ljuskarta-i-bordning` är **Delvis implementerat**: golven får ljus och skuggor från en ljuskarta med 16 texlar per ruta, i strid och editor. Väggar, figurer och föremål använder ännu hörn- och rutljuset. `skuggor-fran-figurer-och-foremal` är **Delvis implementerat**: figurer, lådor, reaktorn och låga väggar kastar skuggor av rätt längd på golvet, men inte på väggar. `jamn-ljuskarta-under-forflyttning` och `skuggor-mellan-rutor` är **Fullständigt implementerat**: under en förflyttning ritas bara skuggorna nära figuren om, grövre tills förflyttningen är klar, och skuggan följer figuren mellan rutorna. `fargat-ljus-i-bordning`, `visuell-morkerinstallning`, `ljusniva-per-ruta`, `tandbara-lampor`, `brand-som-ljuskalla`, `dynamiskt-bordningsljus`, `barbart-ljus`, `blinkande-lampor`, `mynningsblixt-i-bordning` och `morker-forsvarar` är **Ej implementerat**. Färgat, skuggkastande ljus i högre upplösning än rutnätet, lampor som tänds, släcks och blinkar, bärbart ljus och mynningsblixtar. Varje ruta får en ljusnivå i spelets regler, och mörker ska senare göra figurer svårare att upptäcka och träffa. `ljuskarta-i-bordning` ersätter `vertexljus-i-bordning` när den är klar. Se [ljussättning i bordning](../boarding/boarding-lighting.md).

- **Meterskala och skymmande väggar:** `meterskala-i-bordning` och `genomskinliga-skymmande-vaggar` är **Fullständigt implementerat**. En ruta är 1 × 1 m, väggar 2,4 m, dörröppningar 2,1 m och Half cover 1,2 m. Väggar som täcker upptäckta spelrutor visas som ogenomskinliga 40 cm höga snitt med synligt vägginre. Detta ersätter den tidigare transparensen efter uttrycklig beställning. Se [bordningsstrid](../boarding/boarding-combat.md).

- **Tunna innerväggar:** `tunna-innervaggar` och `halvhog-tunn-vagg` är **Fullständigt implementerat**. En tunn vägg är 1/3 m tjock, står på en golvruta och finns längs q eller r. Rutans golvtextur ritas på den inre sidan och grannens golv på den yttre, utom när den sidan är `Outside`, vägg eller ytterskrov. Fullhöga tunna väggar fälls som andra väggar. Halvhöga tunna väggar är 1,2 m, ger `Half cover` och fälls inte. Se [bordningsstrid](../boarding/boarding-combat.md).

- **Sammanfogade tunna väggar:** `sammanfogade-tunna-vaggar` är **Fullständigt implementerat**. En tunn vägg får sin form av grannarna: den sträcker en arm mot varje grannruta med vägg, ytterskrov, tunn vägg av valfri höjd eller en dörr i samma linje. Det ger raka väggar, ändar, hörn, T-korsningar, kryss och fristående pelare. Editorn har en pensel per höjd, `Thin wall` och `Low thin wall`. Se [bordningsstrid](../boarding/boarding-combat.md).

- **Fönster och glas:** `fonster-pa-halvhog-vagg`, `helhogt-fonster`, `krossbart-glas`, `glas-tintar-ljus`, `tunna-fonster` och `glas-krossas-nar-skottet-passerar` är **Fullständigt implementerat**. Glaset ritas nästan utan tjocklek. En halvhög tunn vägg har ett ljusblått fönster från väggens överkant till taket, och `High window pane` är ett fönster i full höjd. Glas släpper igenom sikt och skott men stoppar granatkast och gång. Ett skott som passerar glas krossar det i samma ögonblick som det animerade skottet når glaset, och glasbitar regnar ner; ett krossat `High window pane` går att kliva igenom. Ljus genom glas tintas blått. Se [bordningsstrid](../boarding/boarding-combat.md).

- **Bordningsgrafik:** `isometriska-bordningsobjekt` och `airlock-med-dubbla-geometridorrar` är **Fullständigt implementerade**. Reactor visas med isometrisk grafik utan inbyggt golv. Airlockens tidigare sneda sprite är ersatt av en golvruta med en inre och en yttre 2,1 m hög dörr, byggda med samma geometri och texturer som vanliga dörrar. Det ersätter `airlock-i-60-graders-perspektiv`. `forseglad-airlock` och `automatisk-airlockcykel` är **Fullständigt implementerade** med ändringen `airlock-oppnar-at-blickriktning`: dörrarna är automatiska och minst en hålls stängd. De ersätter `oppna-airlockdorrar`. `halvskydd-som-geometri` är **Fullständigt implementerat**: Half cover är en 1,2 m hög låda byggd som geometri i spelets projektion, med texturerade sidor och ovansida och samma belysning som väggarna, i stället för en bild. Se [bordningsstrid](../boarding/boarding-combat.md).
  `sprites-for-breach-och-escape-pod`, `oppen-escape-pod`, `rumsspecifikt-half-cover` och
  `galley-rum-i-bordning` är **Fullständigt implementerade**. Breach och
  escape pod har egna sprites; podden visas öppen och tom så att en person kan
  stiga in, och en använd pod försvinner och lämnar sin lucka.
  Half cover ser ut som styrpaneler i `Cockpit`, maskiner i `Engineering` och
  matbord/bänk i `Galley`. `Galley` har egna golv- och väggtexturer och finns i
  `Colony ship` samt som rummets pensel i editorn.

- **Dörrar som tunna väggar:** `dorrar-som-tunna-vaggar` är **Fullständigt implementerat**. En stängd dörr modelleras och ritas som en fullhög tunn vägg längs väggen den står i, med en egen dörrtextur (röd lampa när den är låst). En öppen dörr har glidit undan. Fullhöga tunna väggar och stängda dörrar skymmer sikt, skott och granater bara med sin tunna skiva mitt i rutan, så siktlinjen når fram till dörren. Ersätter dörrbilderna i `isometriska-bordningsobjekt` och att tunna väggar skymde hela rutan i `geometrisk-sikt`. `dorrens-ovansida` är **Fullständigt implementerat**: dörrens ovansida är en egen randig skena, inte väggens ovansida. `dorrar-falls-inte` är **Fullständigt implementerat**: dörrar står kvar i full höjd där väggar fälls ner. `animerade-dorrar` är **Fullständigt implementerat**: en känd dörr som öppnas eller stängs glider isär eller ihop på 0,45 s.

- **Lokal bordningskarteditor:** `lokal-bordningskarteditor` och
  `isometrisk-bordningskarteditor` är **Fullständigt implementerat**. Knappen
  `Ship layouts` visas i nederkanten när den lokala servern har minst en karta,
  och editorn öppnas ovanpå aktuell vy. `View` växlar mellan `Isometric` och
  `Top-down`. `helskarms-bordningseditor`, `zooma-panorera-bordningseditor`
  och `direkt-penselstreck-i-editor` är **Fullständigt implementerat**:
  editorn fyller hela skärmen från start med skeppet inpassat, hjul och nyp
  zoomar, `Fit view` passar in skeppet igen, och målade rutor syns medan man
  drar. `kamera-utan-lage-i-editor` är **Fullständigt implementerat** och
  ersätter läget `Pan view`: mittknappen, Space + drag, två fingrar eller ett
  drag som börjar utanför skeppet flyttar vyn, allt annat målar. Hjulet zoomar
  i proportion till hur långt det rullas. `foremal-lagger-golv`,
  `fyll-rum-i-editor`, `fast-airlock-i-bordningskarta`,
  `kravlista-i-bordningseditor` och `skalbar-skeppsbild-i-editor` är
  **Fullständigt implementerat**: ett föremål lägger golv under sig, `Fill
rooms` fyller ett rum inom väggar och dörrar, varje skepp har exakt en
  airlock i över- eller underkantens skrov som flyttas men aldrig tas bort, en
  lista över kartan visar vilka grundkrav som är uppfyllda, och i `Adjust
sprite` ändras skeppsbildens storlek med hjulet eller `Sprite size`.
  `skeppsbild-last-till-skeppsaxeln` är **Fullständigt implementerat**:
  i `Adjust sprite` ligger skeppsbilden centrerad på banans skeppsaxel och
  kan bara skjutas längs axeln och zoomas.
  Se [bordningsstrid](../boarding/boarding-combat.md).

- **Dockningskorridor:** `dockningskorridor-sprite` är **Fullständigt implementerat**. Dockade skepp sammanbinds visuellt med en korridor. Se [bordningsstrid](../boarding/boarding-combat.md).

- **Raptor-grafik:** `egen-raptor-grafik` är **Fullständigt implementerat**. Raptor har en egen sprite. Se [skeppsgrafik](../ship-artwork.md).

- **Bordningsskydd och flyktzoner:** `pirater-skyddar-bordade-skepp` och
  `flyktzoner-i-rymdstrid` är **Fullständigt implementerat**. Andra pirater
  väljer inte skeppet som deras allierade bordar som skottmål. Nya strider har
  tre gröna `Escape`-hexar mitt på både över- och nederkanten; från runda två
  måste hela skeppet lämna genom en sådan zon. Äldre pågående strider behåller
  sin tidigare reträttregel. Se [taktisk strid](../space-battle/tactical-combat.md).

- **Fristående bordningsstrid:** `fristaende-bordningsprototyp`,
  `datadriven-bordningskarta`, `individuellt-bordningsinitiativ`,
  `actionpoints-och-riktad-forflyttning`, `sikt-minne-och-ljudmarkorer`,
  `d20-bordningsstrid`, `miljomal-och-forstorelse`,
  `overwatch-och-skydd`, `granater-och-rok`, `utslagning-och-medic`,
  `bordningsmal-reaktor-och-evakuering` och
  `forsvarare-och-civilister`, `tydlig-bordningsstatus`,
  `isometrisk-bordningsvy`, `spelmassigt-bordningsgranssnitt`,
  `ap-fargad-bordningsvag`,
  `ap-kostnad-och-handlingssymbol-pa-bordningsruta`,
  `animerad-bordningsforflyttning`,
  `avbrott-vid-ny-fiende`, `animerat-bordningsskott`,
  `valbar-bordningssoldat`, `klickskott-pa-vald-fiende`,
  `vald-bordningsmal-markeras`, `melee-kraver-valt-mal`,
  `skott-kraver-giltigt-mal`,
  `klickgang-pa-vald-destination`, `klickdorr-pa-vald-dorr`,
  `isometriska-golvtiles`, `isometriska-vaggtexturer`,
  `bordningsfigurer-fran-spritesheet`, `figurvarianter-i-bordning`,
  `hp-och-ap-ovanfor-soldater`,
  `utslagna-bordningsfigurer`, `bordning-utan-riktningspilar`,
  `bordning-utan-sikt-och-eldrutor`, `senast-sedd-fiende-med-fragetecken`,
  `kantindikator-for-synlig-fiende`, `personer-blockerar-inte-sikt`,
  `doda-blockerar-inte-skott-eller-rorelse`,
  `sikt-och-eld-fran-vald-soldat`, `traffchans-vid-synliga-fiender`,
  `automatisk-bordningstur-vid-tom-ap` samt `hukning-minskar-skottchans` är
  **Fullständigt implementerat**. Den första versionen är ett separat testspel
  från huvudmenyn på en handredigerbar transportkarta och påverkar inte
  kampanj eller sparplatser. `forsvarare-och-civilister` säkerställer även att
  köade uppdateringar efter försvararnas handlingar når nästa spelartur.
  Kartan använder klassiska kvadratiska
  2:1-diamantrutor där väggar och ytterskrov fyller hela rutan, åtta riktningar
  och 45-gradersvändningar; detta ersätter uttryckligen den tidigare hexkartan.
  En vald väg får gröna och bruna tilekonturer efter kvarvarande AP. Den
  gula destinationsrutan visar hela AP-kostnaden inklusive vändningar tillsammans
  med samma `Move`-symbol som handlingsknappen. En vald ruta visar sina lagliga
  handlingar i en liten kontextmeny. Förflyttning animeras
  stegvis med uppdaterad sikt. Kända golvrutor använder en kvadratisk yttextur som vyn
  projicerar på rutans exakta 2:1-diamant. Väggar tar utklipp ur en lång
  fasadtextur så att en längre sträcka blir sammanhängande. `Half cover` är
  hälften så hög som en vägg. Soldater, pirater och civilister har stående och
  hukande bilder för åtta riktningar och visar riktningen utan en separat pil.
  Fötterna, skuggan och valringen sitter i rutans mitt.
  Utslagna och döda visas med riktningsoberoende liggande bilder. Diagonala steg kostar 3/4 AP
  stående/hukande, raka steg 2/3 AP och varje 45-gradersvändning 0,25 AP
  (`billig-vandning`, **Fullständigt implementerat**). Stående personer är
  pelare med 0,5 rutors diameter som skymmer sikt och skott, och hukande ger
  halvskydd (`personer-som-pelare-i-sikt`, **Fullständigt implementerat**,
  ersätter `personer-blockerar-inte-sikt`). En hel reactor skymmer på samma
  sätt men med en halv rutas radie (`reaktor-skymmer-sikt`, **Fullständigt
  implementerat**). Man kan skjuta förbi en person när
  minst 10 % av målrutan syns. Döda och utslagna blockerar varken skott eller
  gång. Synliga och skjutbara rutor har inga röda eller blå kantmarkeringar.
  Egna soldater har HP- och AP-staplar ovanför
  figuren. Ett valt mål markeras med crosshair; alla fiender den aktiva soldaten
  ser har träffchans vid figuren eller, om de är utanför bild, vid skärmkanten.
  Ett klick på kantindikatorn markerar fienden och centrerar kameran utan skott.
  AP noll ger automatiskt turbyte enligt
  befintlig turhantering. Hukning ger +2 Defense mot skott i öppen terräng
  och totalt +5 bakom `Half cover`. Melee kräver ett angränsande
  fiendemål och drar inte AP utan ett sådant. Gevär och melee kan inte
  träffa den egna soldaten eller eget lag; skott kräver ett fiende- eller
  miljömål. Se
  [bordningsstrid](../boarding/boarding-combat.md).

- **Kampanjbordning:** `piratflotta-med-lastfartyg`, `docka-babord-styrbord`,
  `lassta-dockade-skepp`, `bordning-tva-rundor-skift`,
  `tva-skepp-pa-bordningskartan`, `unika-startpositioner-vid-bordning`,
  `avbryt-bordning-i-egna-skepp`,
  `erovra-skepp-via-bordning` och `bordningsbeloning-last-teknik-karta` är
  **Fullständigt implementerat**. Pirater
  har ett lastfartyg med slumpad last. Docka är en stridsorder längs babord
  eller styrbord. Skeppen låses med en brygga, rymdstridsrundan körs färdigt
  och bordning växlar sedan två rundor i taget mot rymdstrid. Vinst ger
  båda skeppen, last och en kartplaceholder. Den återvunna tekniken `Raptor
factory` och `raptor-efter-dockningsteknik` är borttagna med fabrikerna
  (`single-fleet-rensning`).
  `dockning-sida-vid-sida` är **Fullständigt implementerat** och ersätter att
  försvararen låg spegelvänd till höger: anfallaren ligger ovanför,
  försvararen under och en två rutor bred landgång på tio rutor med tunna
  väggar förbinder airlockerna. `avbryt-gammal-bordning-vid-laddning` är
  **Fullständigt implementerat**: en pågående bordning sparad före ändringen
  avbryts vid laddning och skeppen frikopplas. `testbordning-med-tva-skepp`
  och `valbar-roll-i-testbordning` är **Fullständigt implementerat**:
  `Test boarding` låter spelaren välja det bordade skeppet och anfalla
  från en `Raptor` eller försvara sig mot ett `Space pirate`. Det ersätter
  `valbart-skepp-i-testbordning`, där anfallaren valdes mot testtransporten. Se
  [bordningsstrid](../boarding/boarding-combat.md),
  [taktisk strid](../space-battle/tactical-combat.md) och
  [space pirates](../space-pirates.md).
