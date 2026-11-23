# Spacelords

## Vision

Utforskningen `single_fleet` prövar ett spel där spelaren leder en enda
flotta genom rymden, med rymdstrid och bordning i centrum. Spelaren äger inga
planeter eller fasta resurser; allt spelaren har följer med flottan.
Spelet ska fungera på mobil, surfplatta och dator.

Utforskningen bygger vidare på `simple_production`. Den nya riktningen och
kraven finns i [Single fleet](docs/single-fleet.md). De nya speländringarna
är **Ej implementerat**. Den tidigare planetekonomin är borttagen;
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
  flotta, AP, turordning och piraternas aktivering);
  övriga nya beteendekrav är **Ej implementerat**.
  Planen anger vilka delar som måste diskuteras och låsas med användaren
  före implementation (`single-fleet-beslut-fore-implementation`).
  [Rensningsplanen](docs/single-fleet-cleanup.md) följer borttagningen av den
  tidigare spelmekaniken (`single-fleet-rensning`, **Fullständigt
  implementerat**: rensningen är klar och testerna är anpassade).
- **[Start, sparade spel och navigering](docs/areas/start-and-saves.md):**
  `Saved games`, helskärm, huvudmenyn, liggande layout (`liggande-layout`) och sparformatet (`sparformat`,
  version 18). Allt är **Fullständigt implementerat**.
- **[Stjärnkartan och grafiken](docs/areas/star-map.md):** hexkartan, sikt,
  terräng, kamera, kartobjekt och genererade bilder, samt styrningen med
  hexval och väg (`hexval-med-vag`), AP och turordning utan End turn
  (`ap-pa-starmap`), glidande hexsteg
  (`glidande-hexsteg`), kamera som följer skeppet
  (`kamera-foljer-skepp`), upptäckter som stannar resan
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
- **[Rundan och händelser](docs/areas/turn-and-decisions.md):** uppspelningen
  av rundan, händelser och avbrott. Allt kvarvarande är **Fullständigt
  implementerat**.
- **[Space pirates](docs/areas/pirates-and-salvage.md):** pirater,
  patrullering och strid per hex; strid när spelarens flotta och en pirat
  delar hex (`strid-i-samma-hex`). Allt kvarvarande är **Fullständigt
  implementerat**.
- **[Rymdstrid](docs/areas/space-battle.md):** taktisk strid och testläget.
  **Fullständigt implementerat** utom `utforskade-stridsuppgraderingar`, som
  är **Delvis implementerat** eftersom uppgraderingar inte kan monteras.
- **[Bordning](docs/areas/boarding.md):** bordningsstrid, grafik, ljus och
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
