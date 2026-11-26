# Spacelords

## Vision

Utforskningen `single_fleet` prövar ett spel där spelaren leder en enda
flotta genom rymden, med rymdstrid och bordning i centrum. Spelaren äger inga
planeter eller fasta resurser; allt spelaren har följer med flottan.
Spelet ska fungera på mobil, surfplatta och dator.

Utforskningen bygger vidare på `simple_production`. Den nya riktningen och
kraven finns i [Single fleet](docs/single-fleet.md). De nya speländringarna
är till största delen **Ej implementerat**. Den tidigare planetekonomin är borttagen;
områdesfilerna beskriver det som finns kvar. [Den tidigare visionen](docs/game-vision.md)
behålls som bakgrund.

Den visuella riktningen för utforskningen finns i
[Grafisk profil för Single fleet](docs/single-fleet-visual-profile.md).

## Kravkategorier

Varje område har en egen fil med en beskrivning av hur spelet fungerar nu och
kraven med stabila namn och status. Statusen nedan sammanfattar området.

- **[Grafisk profil — utforskning](docs/single-fleet-visual-profile.md):**
  `single-fleet-grafisk-profil` är **Delvis implementerat**; den nya stilen
  återstår för merparten av spelgrafiken. `raptor-single-fleet-grafik` är
  **Fullständigt implementerat** för Star map och bordning; den separata
  UI-bakgrunden är förberedd men inte inkopplad i någon vy.
- **[Single fleet — utforskning](docs/single-fleet.md):** en enda flotta,
  AP på Star map, Fleet, Crew, teknikforskning och en gemensam
  produktionskö, ändliga förbrukningsresurser och personer med flera roller
  och lika startegenskaper. `enda-spelarflottan` och
  `flottstyrning-med-ap-pa-starmap` är **Fullständigt implementerat** (en
  flotta, AP, turordning och piraternas aktivering), liksom
  `startflotta-med-raptor` (Raptor, Fighter och Transport ship vid start);
  `fleet-som-skeppsoversikt` och `skeppsslots-for-utrustning-och-personer` är **Delvis implementerat**; fler egenskaper och nya slottyper för frakt- och civila skepp återstår. `besattning-med-flera-roller`, `besattning-med-lika-startegenskaper`, `crew-med-utrustning-och-skeppsbyte`, `besattningens-start-och-roller`, `kvarlamnade-skepp-pa-kartan` och `besattningsskador-och-lakning` är **Fullständigt implementerat**. Övriga nya beteendekrav är **Ej implementerat**.
  Planen anger vilka delar som måste diskuteras och låsas med användaren
  före implementation (`single-fleet-beslut-fore-implementation`).
  `fleet-visuella-platser`, `fleet-drag-och-rullning` och `fleet-skeppsordning` är **Fullständigt implementerat**.
  `fleet-kompakt-skeppsyta` är **Fullständigt implementerat**: mindre tomrum ovanför och nedanför skeppen i Fleet.
  `fleet-kompakta-skepp` är **Fullständigt implementerat**: skeppsbilden ligger bredvid utrustningen och personplatserna visas med personinformation.
  `dragbar-besattning`, `dragbar-personlig-utrustning` och `besattningsstaplar` är **Fullständigt implementerat**: rollrutor, personlig utrustning och personstatistik hanteras visuellt.
  `fleet-besattningsrutor` är **Fullständigt implementerat**: Crew visas som kvadratiska platser med individuella porträtt och personinformation.
  `fleet-platsinformation` är **Fullständigt implementerat**: varje plats visar funktion och markerad utrustning visar namn, bild och egenskaper.
  `fleet-direktmarkering` är **Fullständigt implementerat**: en fylld ruta väljs direkt och klick på bakgrunden avmarkerar.
  `fleet-placering-vapen-och-motor` och `fleet-vapenbilder` är **Fullständigt implementerat**: motorplatsen ligger mitt bak och vapenplatserna över och under Storage, med egna vapenbilder.
  `fleet-vapenplatser` och `fleet-storage-grupperad` är **Fullständigt implementerat**: vapen kan flyttas och användas och lastplatser är grupperade.
  `fleet-motorer-och-last` är **Fullständigt implementerat**: motorer kan flyttas mellan skeppens motor- och lastplatser.
  [Rensningsplanen](docs/single-fleet-cleanup.md) följer borttagningen av den
  tidigare spelmekaniken (`single-fleet-rensning`, **Fullständigt
  implementerat**: rensningen är klar och testerna är anpassade).
- **[Start, sparade spel och navigering](docs/areas/start-and-saves.md):**
  `Saved games`, helskärm, huvudmenyn, liggande layout (`liggande-layout`) och sparformatet (`sparformat`,
  version 18), inklusive återupptagning efter övertagna piratskepp
  (`sparbart-efter-sista-piratskeppet`). Allt är **Fullständigt implementerat**.
- **[Stjärnkartan och grafiken](docs/areas/star-map.md):** hexkartan, sikt,
  terräng, kamera, kartobjekt och genererade bilder, samt styrningen med
  hexval och väg (`hexval-med-vag`), mörk fyllning i vald outforskad hex
  (`markerad-outforskad-hex`), AP och turordning utan End turn
  (`ap-pa-starmap`), glidande hexsteg
  (`glidande-hexsteg`, `flytande-forflyttning`), animering oberoende av
  systemets rörelseinställning (`stjarnkarta-alltid-animerad`) och rakare vägval
  (`rakare-vag`, `rak-och-jamn-resa`, `stabil-fardvag`), kamera med död zon och fri panorering
  (`kamera-med-dod-zon`), sömlös förflyttning utan synliga rundor
  (`somlos-forflyttning`, `obruten-resa`), spelarstyrt val av hex
  (`val-andras-bara-av-spelaren`), händelser som toppnotiser
  (`handelser-som-toppnotis`), upptäckter som stannar resan
  (`upptackt-stannar-resan`) och resor som fortsätter när ingen pirat syns
  (`resa-utan-synliga-pirater`). **Fullständigt implementerat** utom
  `stjarnsystem-och-asteroidbalten`, som är **Delvis implementerat**.
- **[Flottor och order](docs/areas/fleets.md):** `Fleets`, hexval utan
  Move- och Stop-knappar (`inga-move-stop-knappar`),
  utforskning av planeter och motorer och
  `game-over-utan-skepp` när Home Fleet inte har några skepp kvar. Allt
  kvarvarande är **Fullständigt implementerat**.
- **[Production och planeter](docs/areas/economy-and-production.md):**
  planeter som platser med typ, miljö och resurser. `Production` väntar på
  `gemensam-produktionsko-i-flottan`, som är **Ej implementerat**.
- **[Research](docs/areas/research.md):** forskningsträdet med
  skeppsteknikerna, kön och forskningstiden. Trädet och kön är **Fullständigt
  implementerat**; forskningen går inte framåt förrän
  `flottforskning-av-tekniker` är beslutad (**Ej implementerat**).
- **[Rundan och händelser](docs/areas/turn-and-decisions.md):** rundor i
  bakgrunden, händelser som toppnotiser, kamera med död zon och avbrott.
  Återupptagna strider släpper fram nya order
  (`order-efter-aterupptagen-strid`), och kartupptäckter utan observerande
  skepp hindrar inte nya order (`order-vid-kartupptackt-utan-observator`).
  Allt kvarvarande är **Fullständigt implementerat**.
- **[Space pirates](docs/areas/pirates-and-salvage.md):** pirater,
  patrullering och strid per hex; strid när spelarens flotta och en pirat
  delar hex (`strid-i-samma-hex`), med minne av senast känd position
  (`pirat-minne-efter-sikt`) och synliga animerade steg
  (`animerade-piratsteg`). Allt kvarvarande är **Fullständigt
  implementerat**.
- **[Rymdstrid](docs/areas/space-battle.md):** taktisk strid och testläget.
  Striden avslutas när sista motståndarskeppet övertas
  (`avsluta-strid-efter-sista-overtaandet`).
  **Fullständigt implementerat** utom `utforskade-stridsuppgraderingar`, som
  är **Delvis implementerat** eftersom uppgraderingar inte kan monteras.
- **[Bordning](docs/areas/boarding.md):** bordningsstrid, grafik, ljus och
  fortsatt spel efter fel i försvararturen (`forsvarartur-fastnar-inte`),
  obruten bordning tills den avslutas (`bordning-utan-avbrott`),
  bordningskontroller inom den synliga skärmen (`bordningshud-inom-skarmen`),
  återställning av fastnade försvararturer (`sparad-forsvarartur-aterhamtas`),
  skott på samma ruta (`forsvararskott-samma-ruta`), öppningsbar stridslogg
  under försvararturen (`ihopfallbar-bordningslogg`), samt
  karteditor. **Delvis implementerat**: `skeppsbild-under-bordning`,
  `illustrerade-bordningshandlingar`, `ljuskarta-i-bordning` och
  `skuggor-fran-figurer-och-foremal` är delvis klara, och flera ljuskrav är
  **Ej implementerat**; se områdesfilen.
- **[Utveckling, kvalitet och driftsättning](docs/areas/development.md):**
  arkitektur, tester, branchflöde och publicering. **Delvis implementerat**:
  `mvc-arkitektur`, `vy-plattformsgrans`, branchflödet och
  `utforskningsbranch` har delar kvar; se områdesfilen.

Varje områdesfil listar under `Borttaget med single-fleet-rensning` de krav
som har tagits bort med planetekonomin, så att deras namn går att spåra.

## Övriga dokument

- [Produktkrav](docs/product-requirements.md): kort och otekniskt om spelet.
- [Spelvision och gränssnitt 2026-11-22](docs/vision-2026-11-22.md):
  arbetsunderlag med idéer om flottan, strid, bordning, världen och
  skärmarna. Inte beslutade krav.
- [Tekniska krav](docs/technical-requirements.md) och
  [arbetsregler](AGENTS.md).
- [Domänmodell](docs/domain-model.puml) och
  [kodkarta](docs/architecture/README.md).
- [Driftsättning](docs/deployment.md).
- Detaljfiler per spelmekanik, som
  [sikt och teleskop](docs/detection-telescopes.md) och
  [Events](docs/events-and-guidance.md), länkas från
  områdesfilerna.
