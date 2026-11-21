# Stjärnkartan och grafiken

Stjärnkartan är en zoom- och panorerbar hexkarta med stjärnor, planeter,
terräng, flottor, vrak och pirater inom sikt. Den delar kamera med `Fleets`
och `Production`. På kartan väljer spelaren planeter, flottor och rutter och
drar flottor till mål eller till en rutt. Rutter skapas inte på kartan utan
med `Connect` i Factories (`rutter-endast-i-connect`). Flottor på en rutt
visas vid ruttens ändpunkt.

## Krav

- **Kartobjekt och automatiska flottor:** `kartobjekt-foljer-zoom`,
  `produktionsflottors-automatiska-namn`,
  `produktionsflotta-efter-kolonisering`,
  `samtidig-automatisk-flottanimation`,
  `ruttflottor-vid-ruttanslutning` och
  `radiell-automatisk-hexutforskning` är **Fullständigt implementerat**.
  Vrak följer kartans skala, produktionsskapade flottor får namn som
  `Exploration ship Tellus 1`, tomma tidigare hemflottor återanvänds bara vid
  uttryckligt val, autonoma flottor animeras tillsammans och
  flottor på en rutt placeras vid ändplaneten mot ruttlinjen. Explore-flottor
  reserverar skilda radiella riktningar från Tellus. Se
  [produktkraven](../product-requirements.md).

- **Vald flotta och stjärnupptäckt:** `vald-flotta-visar-destinationspil` och
  `stjarnupptackt-utan-avbrott` är **Fullständigt implementerat**. En vald
  flotta som inte är på en rutt visar sin destinationspil även på Star map. Utforskad
  stjärna ger ett händelsebesked utan Handle/Ignore och pausar inte året.
  Se [produktkraven](../product-requirements.md) och
  [utforskning](../exploration-interruptions.md).

- **Vrakplacering och destinationspilar:** `vrak-utanfor-stjarnor`,
  `destinationspilar-endast-i-flottvyn` och `ruttflottor-utan-destinationspilar`
  är **Fullständigt implementerat**. Nya startvrak ligger på närmaste
  framkomliga hex vid sin stjärna. Star map visar destinationspilar bara för
  vald flotta som inte är på en rutt enligt `vald-flotta-visar-destinationspil`; Fleets
  visar dem för flottor som inte är på en rutt. Flottor på en rutt visar aldrig
  destinationspilar. Se
  [produktkraven](../product-requirements.md) och [bärgning](../salvage-shipyards.md).

- **Kartans prestanda:** `responsiv-stjarnkarta` och `rumsligt-kartindex` är
  **Fullständigt implementerat**. Panorering och zoom återanvänder speldata
  och uppdaterar bara kamerabundna vyer, även från första fingertrycket,
  vid andra fingrets nypzoomning och vid avslut av kameragesten.
  Kartan väljer innehåll genom ett
  rumsligt index och samlar omritningar per bildruta. Galax och sparningar
  behålls. Se [kartans prestanda](../map-performance.md).

- **Sikt under rörelse och nya skepp:** `sikt-under-forflyttning` och
  `nybyggda-skepp-utan-ruttflotta` är **Fullständigt implementerat**.
  Synfält och synliga pirater uppdateras under skeppens rörelse; lämnade
  områden behålls som kartminne. Nybyggda skepp får en vanlig lokal flotta
  och hamnar inte direkt i en flotta med ruttuppdrag. Se
  [sikt](../detection-telescopes.md).

- **Genererade symboler och kartbilder:** `genererade-symboler-och-kartbilder`
  är **Fullständigt implementerat**. 24 byggnadssymboler, sex planeter och
  en kartbild för Orbital shipyard är genererade, granskade och sparade som
  transparenta PNG-original. De 20 byggnadsporträtten ingår inte;
  `spelgrafik-symboler`, `spelgrafik-planeter` och `spelgrafik-kartstation`
  är **Fullständigt implementerat**: bilderna används i spelet, och varvets
  kartbild och position följer zoomningen som planeterna. Riktade
  mobilkontroller är godkända. Leveransen följer snabbpublicering för mobiltest.
  Se [bildleveransen](../generated-map-artwork.md).

- **Genererade skeppsbilder:** `genererade-skeppssprites` är **Fullständigt implementerat**. Transport ship, Salvage ship och Space pirate har egna transparenta bilder i flottpaneler och på kartan. Piraten har avvikande färger, rost och provisoriska lagningar. Se [skeppsgrafik](../ship-artwork.md).

- **Mobilens kartval och forskning:** `kartpanel-till-events`,
  `centrerat-kartfokus` och `dubbelklick-koar-forskning` är **Fullständigt
  implementerat**. Kartans detaljpanel använder ytan ned till Events. Show
  centrerar målet i den fria kartytan, och research kan köas med dubbelklick
  eller dubbeltryck. Ruttskapandet på kartan
  (`handelsrutt-skapande-pa-stjarnkartan`) är ersatt av
  `rutter-endast-i-connect`.
  `spelnotis-synlig` är **Fullständigt implementerat**: korta spelnotiser som
  `Shipyard construction queued.` visas under flikarna, helt inom skärmen och
  ovanför Events och End turn.
  Se [mobilens kartval och forskning](../mobile-map-interactions.md).

- **Enhetliga spelvyer och bildprompter:** `gemensam-events-panel`,
  `dragbara-koer`, `omordningsbar-reparationsko`, `bildpromptpaket`,
  `skeppssprites-pa-kartan`, `forskningskamerans-granser` och
  `planetinformation-pa-kartan` är **Fullständigt implementerat**. Riktade
  kontroller är godkända; leveransen följer snabbpublicering för mobiltest. Se [krav och ersatta regler](../unified-interface.md)
  samt [bildpromptpaketet](../image-prompts/README.md).

- **Varierad galax och kompakta spelvyer:** `stjarnvariation`, `galaxarmar`,
  `dragbara-flottorder`, `kompakt-forskningstrad`, `forskningens-avslojande`,
  `forskningsdetaljer-vid-val` och `produktionsvalens-statusfarger` är
  **Fullständigt implementerat**. Ändringen omfattar 150 system i nya galaxer, stjärnor
  utan spikes, kompakta forskningsrutor och färger för lokal förekomst,
  nätverk och kö. Se [krav och status](../varied-galaxy-compact-views.md).

- **Stjärnbild och utzoomning:** `stjarnornas-hexutseende` förtydligas med
  varierade, texturerade stjärnor innanför hexens kant, helt utan spikes.
  `utokad-utzoomning` tillåter 3 procent zoom med en avskalad galaxöversikt.
  Kraven är **Fullständigt implementerat**, med verifierade mobilflöden.
  Se [galax och terräng](../galaxy-terrain.md).

- **Utökad galax och terräng:** radie 100, 150 system i nya galaxer, planeter två hexsteg
  från stjärnorna, större stjärngrafik, ofarbara stjärnor, två asteroidtyper och
  nebulosor som skymmer sikten. Explore fyller ut kartan i lager; Explore stars
  tar ett helt varv för att upptäcka systemets planeter. Kraven är
  **Fullständigt implementerat**, med verifierade mobilflöden i båda motorerna.
  Äldre sparplatser rensas en gång efter uttryckligt godkännande för denna
  leverans. Se [krav och status](../galaxy-terrain.md).

- **Kartans utrymme:** `fokuserat-kartval` är **Fullständigt implementerat**.
  Kartan saknar objektmeny, S/Q-förklaring och kontrollruta för zoom/Homeworld.
  Tomma rutor utan flottor visar ingen informationspanel. Val av himlakropp,
  flotta eller handelsrutt får den undre delen på små skärmar.
  `rullningsbar-kartpanel` är **Fullständigt implementerat**: panelens överkant
  flyttas upp först när spelaren drar eller rullar. Innehållet börjar rulla
  först vid maximal panelhöjd. Vid återgång rullas innehållet först till toppen
  innan panelen krymper.
  En del av kartan förblir synlig.

- **Grundkrav för kartan:** `statisk-planetplacering`, `synliga-stjarnor`
  och `synliga-handelsrutter` är **Fullständigt implementerat**. Stjärnor och
  planeter ligger stilla, alla stjärnpositioner syns även utanför sikten och
  rutter syns även inne i markerade hexrutor utan att dölja planeter och
  flottor. `stjarnsystem-och-asteroidbalten` är **Delvis implementerat**:
  stjärnsystem med fasta planeter och gasplaneter finns; asteroidbälten
  återstår.

- **Rutter och flottor på kartan:** `handelsrutt-val-pa-stjarnkartan` och
  `flottilldelning-pa-stjarnkartan` är **Fullständigt implementerat**. En
  rutt väljs genom att trycka på linjen, med träffyta i skärmpixlar oberoende
  av zoom. En flotta som släpps på en rutt tilldelas den utan att få en
  flyttorder; vid flera möjliga rutter väljer spelaren uttryckligen.
