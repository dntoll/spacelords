# Stjärnkartan och grafiken

Stjärnkartan är en zoom- och panorerbar hexkarta med stjärnor, planeter,
terräng, spelarens flotta och pirater inom sikt. Den delar kamera med
`Fleets`. På kartan väljer spelaren himlakroppar och flottor och drar en
flotta till ett mål. Planeter är platser; spelaren äger dem inte
(`single-fleet-rensning`).

## Krav

- **Kartobjekt:** `kartobjekt-foljer-zoom` är **Fullständigt implementerat**.
  Flottor följer kartans skala.

- **Vald flotta och stjärnupptäckt:** `vald-flotta-visar-destinationspil` och
  `stjarnupptackt-utan-avbrott` är **Fullständigt implementerat**. En vald
  flotta visar sin destinationspil även på Star map. Utforskad stjärna ger ett
  händelsebesked utan Handle/Ignore och pausar inte rundan. Se
  [utforskning](../exploration-interruptions.md).

- **Destinationspilar:** `destinationspilar-endast-i-flottvyn` är
  **Fullständigt implementerat**. Star map visar destinationspilen bara för
  vald flotta; Fleets visar den för flottorna.

- **Kartans prestanda:** `responsiv-stjarnkarta` och `rumsligt-kartindex` är
  **Fullständigt implementerat**. Panorering och zoom återanvänder speldata
  och uppdaterar bara kamerabundna vyer. Kartan väljer innehåll genom ett
  rumsligt index och samlar omritningar per bildruta. Se
  [kartans prestanda](../map-performance.md).

- **Sikt under rörelse:** `sikt-under-forflyttning` är **Fullständigt
  implementerat**. Synfält och synliga pirater uppdateras under skeppens
  rörelse; lämnade områden behålls som kartminne. Se
  [sikt](../detection-telescopes.md).

- **Genererade kartbilder:** `genererade-symboler-och-kartbilder`,
  `spelgrafik-planeter` och `spelgrafik-symboler` är **Fullständigt
  implementerat** för planeter och forskningssymboler. Byggnadssymboler,
  byggnadsporträtt och varvets kartbild är borttagna med planetekonomin
  (`single-fleet-rensning`); `spelgrafik-kartstation` gäller inte längre. Se
  [bildleveransen](../generated-map-artwork.md).

- **Genererade skeppsbilder:** `genererade-skeppssprites` är **Fullständigt
  implementerat**. Transport ship, Salvage ship och Space pirate har egna
  transparenta bilder i flottpaneler och på kartan. Se
  [skeppsgrafik](../ship-artwork.md).

- **Mobilens kartval och forskning:** `kartpanel-till-events`,
  `centrerat-kartfokus`, `dubbelklick-koar-forskning` och `spelnotis-synlig`
  är **Fullständigt implementerat**. Kartans detaljpanel använder ytan ned
  till Events, Show centrerar målet, forskning kan köas med dubbelklick eller
  dubbeltryck och korta spelnotiser visas under flikarna. Se
  [mobilens kartval och forskning](../mobile-map-interactions.md).

- **Enhetliga spelvyer och bildprompter:** `gemensam-events-panel`,
  `dragbara-koer`, `bildpromptpaket`, `skeppssprites-pa-kartan`,
  `forskningskamerans-granser` och `planetinformation-pa-kartan` är
  **Fullständigt implementerat**. `dragbara-koer` gäller Research queue.
  `omordningsbar-reparationsko` är borttagen med varven. Se
  [krav och ersatta regler](../unified-interface.md) och
  [bildpromptpaketet](../image-prompts/README.md).

- **Varierad galax och kompakta spelvyer:** `stjarnvariation`, `galaxarmar`,
  `dragbara-flottorder`, `kompakt-forskningstrad`, `forskningens-avslojande`
  och `forskningsdetaljer-vid-val` är **Fullständigt implementerat**.
  `produktionsvalens-statusfarger` är borttagen med planetproduktionen. Se
  [krav och status](../varied-galaxy-compact-views.md).

- **Stjärnbild och utzoomning:** `stjarnornas-hexutseende` och
  `utokad-utzoomning` är **Fullständigt implementerat**. Se
  [galax och terräng](../galaxy-terrain.md).

- **Utökad galax och terräng:** radie 100, 150 system, planeter två hexsteg
  från stjärnorna, ofarbara stjärnor, två asteroidtyper och nebulosor som
  skymmer sikten. Kraven är **Fullständigt implementerat**. Se
  [krav och status](../galaxy-terrain.md).

- **Kartans utrymme:** `fokuserat-kartval` och `rullningsbar-kartpanel` är
  **Fullständigt implementerat**. Kartan saknar objektmeny och kontrollruta.
  Tomma rutor utan flottor visar ingen panel, och panelen växer innan
  innehållet rullar. En del av kartan förblir synlig.

- **Grundkrav för kartan:** `statisk-planetplacering` och `synliga-stjarnor`
  är **Fullständigt implementerat**. Stjärnor och planeter ligger stilla och
  alla stjärnpositioner syns även utanför sikten.
  `stjarnsystem-och-asteroidbalten` är **Delvis implementerat**: stjärnsystem
  med fasta planeter och gasplaneter finns; asteroidbälten återstår.

## Borttaget med `single-fleet-rensning`

Handelsrutter, Production på kartan, produktionsflottor och vrak på
stjärnkartan finns inte längre.
Följande krav gäller därför inte: `rutter-endast-i-connect`,
`synliga-handelsrutter`, `handelsrutt-val-pa-stjarnkartan`,
`flottilldelning-pa-stjarnkartan`, `ruttflottor-vid-ruttanslutning`,
`ruttflottor-utan-destinationspilar`, `produktionsflottors-automatiska-namn`,
`produktionsflotta-efter-kolonisering`, `nybyggda-skepp-utan-ruttflotta`,
`samtidig-automatisk-flottanimation`, `radiell-automatisk-hexutforskning`
och `vrak-utanfor-stjarnor`.
