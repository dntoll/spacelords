# Flottor och order

> Historisk beskrivning från `simple_production`: `befolkningsutjamning-i-grupp`, `guard-routes` och
> `ombemanning-vid-stangd-farled`, `automatisk-farledsbemanning`
> har tagits bort i `single_fleet`. Övrig äldre mekanik rensas stegvis enligt
> [rensningsplanen](../single-fleet-cleanup.md).

`Fleets` visar flottorna på kartan, färgade efter kategori, och en lista
med order. Flottor kan flytta, utforska, kolonisera, patrullera, bärga,
eskortera rutter, delas och slås ihop samt uppgraderas vid varv. Nybyggda
skepp får en startorder. Planetköer för utforskning och kolonisation fördelar
uppdrag till lediga flottor.

## Krav

- **Planetköer:** `planetupptackt-fore-utforskning`,
  `planetutforskning-vid-ankomst`, `utforskningsko`, `koloniseringsko` och
  `automatisk-tilldelning-av-planetkoer` är **Fullständigt implementerat**.
  Köåtgärden i ett upptäckts- eller utforskningsbesked sparar valet och stänger
  beskedet.
  Detektion visar först namn och position. Exploration ships avslöjar detaljer
  vid ankomst, varefter Colony ships kan kolonisera. Båda köerna redigeras i
  `Decisions`; lediga flottor väljs efter köordning och kortast framkomliga väg.
  Se [planetköer](../planet-queues.md).

- **Köavstickare och riktad kolonisation:** `utforskningsko-som-avstickare`,
  `utforskad-planet-visar-kolonisationsdata`,
  `riktad-koloniskeppsbestallning`, `anfallsko-for-pirater` och
  `anfallsko-som-avstickare` är **Fullständigt implementerat**. Explore-flottor
  kan tillfälligt utforska en köplanet och Patrol-flottor kan anfalla en synlig
  köad pirat innan deras tidigare order återupptas. Utforskade planetbesked
  visar typ och byggplatser och kan beställa ett riktat Colony ship från
  närmaste nåbara fabrik. Se [planetköer](../planet-queues.md) och
  [Space pirates](../space-pirates.md).

- **Synlig flottorder:** `synlig-flottorder` är **Fullständigt implementerat**. Aktiva flottorder och relevanta mål eller status visas direkt på flottkort, även på mobil. Tillfälliga uppdrag och pausade order framgår. Se [Orders](../fleet-orders.md).

- **Orders och startorder:** `egen-ordervy`, `ruttval-for-order`,
  `flottval-pa-orderkarta`, `skeppsanpassade-specialorder`,
  `patrullcentrum-vid-order` och `startorder-for-nybyggda-skepp` är
  **Fullständigt implementerat**. `guard-routes` är borttaget i `single_fleet`. Orders samlar
  specialorder med tydliga namn, ruttlista och val av mottagande flotta på
  kartan. Fighters har Guard routes som startorder. Move och Stop behålls i
  flottvyn. Samma val kan göras för skepp som beställs. Se
  [Orders](../fleet-orders.md).

- **Flottuppgradering:** `flottorder-upgrade`,
  `automatisk-uppgraderingsforsorjning` och `spara-flottuppgradering` är
  **Fullständigt implementerat**. Upgrade i Orders reser till närmaste lämpliga egna
  Orbital shipyard och byter äldre motorer och teleskop mot bättre utforskade
  delar. Varvets planet beställer saknade delar genom befintlig produktion
  och transport. Ordern väntar tills uppgraderingen kan genomföras och
  bevaras vid omladdning. Se [flottuppgradering](../fleet-upgrades.md).

- **Civiltrafik och arbetskraft:** `civil-skyttelforskning`,
  `civil-skytteltillverkning`, `automatisk-arbetskraftstrafik`,
  `civiltrafik-pa-handelsnatet`, `civiltrafik-sparning` och
  `civil-farledsbyte` är **Fullständigt implementerat**. I utforskningen
  `simple_production` ersätts passagerarresorna av
  `befolkningsutjamning-i-grupp`. Civilian transport
  låser upp Civilian shuttle i Transport ship factory. Skyttlar startar
  automatiskt, fraktar 500 personer per skepp genom öppna Trade routes och
  omprövar arbetskraftsbehov vid mellanlandningar. En skyttel har en
  hemfarled men söker uppdrag i hela nätet och byter hemfarled när
  uppdraget använder en annan farled. Minst 1 000 invånare och lokal
  bemanning skyddas. Äldre sparningar bevaras. Se
  [civiltrafik](../civilian-transport.md).

- **Automatiska flottorder:** `automatisk-bargning`,
  `fria-utforsknings-och-patrullorder` är **Fullständigt implementerat**.
  Auto salvage hämtar och levererar ett vrak i taget och fortsätter med
  nästa. Färdigbyggda Transport ships och Civilian shuttles bemannar
  närmaste öppna farled med minst antal skepp utan forskning. När en
  bemannad farled stängs flyger skeppen vidare till en kvarvarande farled.
  Explore, Explore stars och Patrol kräver inte längre forskning. Detta
  ersätter `automatisk-rutttilldelning` och forskningslåsen i
  `forskade-automatiska-order`. Auto salvage kräver fortfarande Automated
  salvage. Se [automatiska flottorder](../automated-fleet-orders.md).
  `flottval-vid-varv` är **Fullständigt implementerat**: flottor på varvets
  hex kan öppnas från varvspanelen även när kartmarkörerna överlappar.

- **Bärgningsorder från flottan:** `bargningsorder-fran-flotta` är
  **Fullständigt implementerat**. Salvage följt av vrakval ger flottan en
  sparad order att resa dit, hämta vraket och återvända till eget varv.
  Det fungerar även för vrak i den egna hexen. Se
  [bärgning och varv](../salvage-shipyards.md).

- **Koloniseringsorder:** `koloniseringsorder` är **Fullständigt implementerat**.
  Colonize följt av planetval ger en sparad order att resa dit och kolonisera
  automatiskt vid ankomst, efter eventuell strid. Ordern kan avbrytas eller
  ersättas. Exakt ett Colony ship förbrukas och äldre sparningar bevaras.
  Se [koloniseringsorder](../colonization-orders.md).

- **Patrol:** `flottpatrullering` är **Fullständigt implementerat**. Flottor med
  Fighters reser till valt patrullcentrum och cirklar sedan runt det. De jagar synliga pirater inom sin effektiva
  flottfart, mätt från flottans aktuella position. Gemensam sikt används;
  tappad kontakt eller räckvidd ger återgång till patrullvarvet. Ordern och
  avbrutna år bevaras utan rensning av äldre sparningar. Se [spelreglerna](../space-pirates.md).

- **Utforskning och kompakta order:** ytterligare komprimerade flottkort,
  ordersymboler, tillfälliga ruttnamn, produktionskvitton och bestående
  utforskningsuppdrag. Året avbryts vid nya planeter, pirater och vrak, men
  inte vid utforskad stjärna enligt `stjarnupptackt-utan-avbrott`. Avbrutna
  år återupptas med bevarad förflyttning, även efter omladdning. Kraven är
  **Fullständigt implementerat**;
  se [utforskning och upptäckter](../exploration-interruptions.md).

- **Skeppsmotorer:** `motorbehov-for-alla-skepp`, `ion-pulse-engine` och
  `automatisk-motormontering` är **Fullständigt implementerat**. Alla skepp kräver
  motorer och minst en Ion pulse engine ger +1 fart. Automatisk försörjning,
  och mobilflöde är verifierade.

- **Karta och flottor:** `kompakta-flottkort` är **Fullständigt implementerat**:
  mindre skeppsrutor och tätare flottkort visar fler flottor samtidigt på Star map
  och i Fleets, med bibehållen åtkomst till order.
  `kompakt-flottkort-med-order` är **Fullständigt implementerat**: mindre namn och
  orderknappar, aktuell order på knappraden och statistikikoner bredvid skeppen.
  Order med öppningsbara mål fungerar som knappar. Detta ersätter kravet på fyra
  skepp i en rad i smala kort.
  Fast exempelvärld, begränsad sikt, navigation,
  utforskning, kolonisation, flottbyggare och fysisk rörelse på kartan.
  Skepp ansluter direkt på samma hex eller till tomma flottor. På avstånd följer
  en fysisk förstärkningsgrupp målflottan tills den når ikapp
  (`skepp-till-rorlig-flotta`). Även ruttflottor kan förstärkas; Fleets anger
  ruttens ändplaneter (`forstarka-ruttflotta`, `flottans-handelsrutt`).
  `skepp-ur-olastad-ruttflotta` är **Fullständigt implementerat**: skepp kan
  lämna en Trade fleet när hela flottan är olastad. Sista Transport ship
  frigör flottan från rutten; kvarvarande skepp behåller position och färd.
  `flottadministration`, `flottnamn-direktredigering` och
  `flottknappar-pa-kartan` är **Fullständigt implementerat**: skepp organiseras
  direkt på Star map, namn ändras med dubbelklick och New fleet bildas med
  första skeppet. Flottkorten visas direkt utan Expand fleet panel eller Help.
  `flottfokuserad-kartvy` och `delad-kartkamera` är **Fullständigt implementerat**:
  Fleets visar en karta för flottval, rörelse och skeppsöverföring med samma
  kamera som Star map. Ej valda flottor har streckade cirklar.
  Planeter och rutter är diskret, inaktiv bakgrund; namnen visas med full tydlighet.
  Den gamla översikten, minikartan och knapparna för tomma flottor ersätts;
  sparade flottor och förstärkningsregler bevaras. Se [produktkraven](../product-requirements.md).
  Ruttpanelen visar bara redan tilldelade flottor; den globala Assign fleet-listan
  är borttagen. På Star map kan flottor fortsatt dras till ruttlinjen för tilldelning.

- **Grundkrav för flottor:** `tomma-flottor`, `arbetskraft-och-besattning`
  och `ruttflotta-till-narmaste-andplanet` är **Fullständigt implementerat**.
  Tomma flottor behåller namn, saknar position och kan ta emot skepp men visas
  inte på kartan. Byggnader, projekt och skepp reserverar arbetare och
  besättning. En ledig transportflotta som tilldelas en rutt reser först till
  närmaste ändplanet, vid lika avstånd ruttens första.
