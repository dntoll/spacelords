# Flottor och order

`Fleets` visar spelarens flotta på kartan. Flottan styrs med hexval, kan
byta namn och utforskar planeter som ett Exploration ship står på. Kod och
sparformat hanterar fortfarande en lista med flottor; att göra om dem till en
enda flotta hör till `enda-spelarflottan` och `fleet-som-skeppsoversikt` i
[Single fleet](../single-fleet.md), som väntar på beslut.

## Krav

- **Synlig flottorder:** `synlig-flottorder` är **Fullständigt
  implementerat**. Flottkortet visar destinationen direkt, även på mobil.

- **Inga Move- och Stop-knappar:** `inga-move-stop-knappar` är
  **Fullständigt implementerat**. Home Fleet styrs med hexval. Knapparna
  Move och Stop visas inte. Det ersätter knapparna i `dragbara-flottorder`
  och `flottknappar-pa-kartan`. `flottnamn-direktredigering` är
  **Fullständigt implementerat**: namnet ändras med dubbelklick.

- **Utforskning och avbrott:** `planetutforskning-vid-ankomst` är
  **Fullständigt implementerat**: ett Exploration ship avslöjar en planets
  detaljer vid ankomst. Varje ny upptäckt stannar resan
  (`upptackt-stannar-resan`). Avbrutna rundor
  återupptas med bevarad förflyttning, även efter omladdning. Se
  [utforskning och upptäckter](../exploration-interruptions.md).

- **Skeppsmotorer:** `motorbehov-for-alla-skepp` och `ion-pulse-engine` är
  **Fullständigt implementerat**. Alla skepp har motorer och minst en Ion
  pulse engine ger +1 fart.

- **Kompakta flottkort:** `kompakta-flottkort`, `kompakt-flottkort-med-order`
  och `flottknappar-pa-kartan` är **Fullständigt implementerat**. Flottkorten
  visas direkt på Star map med skeppsrutor och statistikikoner bredvid
  skeppen. Move och Stop visas inte (`inga-move-stop-knappar`).

- **Fleets på kartan:** `flottfokuserad-kartvy` och `delad-kartkamera` är
  **Fullständigt implementerat**. Fleets visar en karta för flottval och
  rörelse med samma kamera som Star map.

- **Tomma flottor:** `tomma-flottor` är **Fullständigt implementerat**. En
  flotta utan skepp behåller sitt namn men saknar position och visas inte på
  kartan.

- **Game over:** `game-over-utan-skepp` är **Fullständigt implementerat**.
  När Home Fleet inte har några skepp kvar är spelet över. Spelaren ser
  Game over och kan bara gå till Saved games. Ingen ny runda kan startas.

## Borttaget med `single-fleet-rensning`

Planetköer, automatiska order, flera spelarflottor och planetbunden
försörjning finns inte längre. Följande krav gäller därför inte:
`planetupptackt-fore-utforskning`, `utforskningsko`, `koloniseringsko`,
`automatisk-tilldelning-av-planetkoer`, `utforskningsko-som-avstickare`,
`utforskad-planet-visar-kolonisationsdata`, `riktad-koloniskeppsbestallning`,
`anfallsko-for-pirater`, `anfallsko-som-avstickare`, `egen-ordervy`,
`ruttval-for-order`, `flottval-pa-orderkarta`, `skeppsanpassade-specialorder`,
`patrullcentrum-vid-order`, `startorder-for-nybyggda-skepp`, `guard-routes`,
`flottorder-upgrade`, `automatisk-uppgraderingsforsorjning`,
`spara-flottuppgradering`, `civil-skyttelforskning`,
`civil-skytteltillverkning`, `automatisk-arbetskraftstrafik`,
`civiltrafik-pa-handelsnatet`, `civiltrafik-sparning`, `civil-farledsbyte`,
`automatisk-bargning`, `fria-utforsknings-och-patrullorder`,
`flottval-vid-varv`, `bargningsorder-fran-flotta`, `koloniseringsorder`,
`flottpatrullering`, `automatisk-motormontering`, `skepp-till-rorlig-flotta`,
`forstarka-ruttflotta`, `flottans-handelsrutt`, `skepp-ur-olastad-ruttflotta`,
`flottadministration`, `flottkategorier`, `arbetskraft-och-besattning` och
`ruttflotta-till-narmaste-andplanet`.
