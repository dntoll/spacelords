# Rundan, händelser och beslut

En runda börjar med order och slutar med `End turn`. Därefter spelas året
upp: först autonoma flottor, sedan övriga färder och därefter händelser i
geografisk ordning. Upptäckter och strider kan avbryta året. `Decisions`
samlar det som väntar på spelaren, med underrubriker, och kan tysta
återkommande besked.

## Krav

- **Illustrerade händelser och stridseffekter:** `bilder-i-events`,
  `delproduktion-med-sammanhang`, `flottor-fore-planetdetaljer`,
  `animerade-stridsskott` och `skadepartiklar-i-strid` är
  **Fullständigt implementerat**. Events visar bilder och symboler per rad.
  Delproduktion anger mottagande beställning och färdiga reserverade delar
  av totalt behov. Hexdetaljer visar flottor före hela planetdelen.
  Strid visar projektiler, träffpartiklar och explosioner före nästa handling.
  Äldre sparningar bevaras. Se [Events](../events-and-guidance.md) och
  [taktisk strid](../space-battle/tactical-combat.md).

- **Rundtexter:** `round-i-speltexter` är **Fullständigt implementerat**: spelet
  använder `round` i stället för `year` i synliga texter och hjälptexter.

- **Samlade planetbesked:** `grupperade-planethandelser` är
  **Fullständigt implementerat**. Varje planet får ett gemensamt årsbesked
  för anlänt material, färdig produktion, Population och Habitability.
  Leveranser från flera flottor finns i samma besked. Se
  [Events och beslutsguidning](../events-and-guidance.md).
  `tysta-planetbesked` är **Fullständigt implementerat**: Population- och
  Habitability-besked kan tystas var för sig i Decisions. Inställningarna
  sparas och påverkar framtida besked.
  `population-besked-endast-vid-andring` är **Fullständigt implementerat**:
  Population ger besked endast när antalet ändras. +0 och tomma planetbesked
  utgår; andra planetändringar visas fortfarande. Detta ersätter den tidigare
  +0-regeln i `grupperade-planethandelser` och `senaste-aret-i-events`.
  `ruttflottor-utan-ankomstbesked` är **Fullständigt implementerat**:
  flottor på en rutt ger inga ankomstbesked vid ändplaneterna eftersom
  ruttuppdraget fortsätter. Lossade material ingår fortsatt i planetbeskedet.
  `ankomstbesked-endast-vid-manuell-forflyttning` är **Fullständigt
  implementerat**: ankomstbesked ges bara för manuella förflyttningsorder,
  inte för delmål under Explore, Explore stars, automatiska order eller
  avstickare.

- **Direkta beslut från rundvarningen:** `direkt-atgard-fran-rundvarning`
  är **Fullständigt implementerat**. Varje beslut i Decisions remaining har
  en egen Review-knapp som öppnar rätt vy och objekt utan omväg via Decisions.
  Exempelvis öppnar Choose research forskningsträdet. Året förblir oförändrat.
  Se [beslutsguidning](../events-and-guidance.md).

- **Händelseval på dator:** `centrerade-handelseval-pa-dator` är
  **Fullständigt implementerat**. Händelsens plats och Handle/Ignore-ruta
  ligger kring kartans mitt på stora skärmar och följer ändrad fönsterstorlek.
  `upptacktsbesked-utan-pausmening` är **Fullständigt implementerat**:
  den generella meningen om paus och kommande strid har tagits bort ur
  upptäcktsrutan.
  `stridsresultat-utan-upprepning` är **Fullständigt implementerat**:
  stridsresultatet visas en gång, med plats och vrakantal som kompletterande
  detaljer.
  `gemensamt-handelseflode` håller även händelserutan ovanför End turn på
  låga, liggande telefoner. Det är **Fullständigt implementerat** och skyddas
  av ett regressionstest för begränsad höjd.
  Se [Events och beslutsguidning](../events-and-guidance.md).

- **Gemensamt händelseflöde:** `gemensamt-handelseflode` är **Fullständigt
  implementerat**. Upptäckter, piratkontakter och stridsrapporter använder Events
  med ett eget Handle eller Ignore för varje händelse. Året förblir pausat tills
  avbrottets händelser är avklarade. Redan visade händelser annonseras inte igen;
  val och pågående hantering bevaras vid omladdning utan rensning av sparningar.
  Se [Events](../events-and-guidance.md).

- **Flottanimation och händelseannonser:** `en-flotta-i-taget`,
  `samtidig-automatisk-flottanimation`,
  `osynliga-flottor-utan-animation` och `handelseannonsering` är
  **Fullständigt implementerat**. Alla autonoma flottor visas samtidigt;
  manuella Move-order visas en åt gången enligt den återstående delen av
  `en-flotta-i-taget`.
  Dolda rörelser ger ingen animation eller väntan. Platsbundna händelser
  annonseras under den markerade platsen och globala händelser centralt;
  texten flyttas sedan till listan automatiskt. Pause/Play, Next och Skip är
  borttagna på uttrycklig beställning. Se [Events](../events-and-guidance.md).

- **Lugnare årspresentation:** `samtidig-farledsanimation`,
  `samtidig-automatisk-flottanimation`,
  `destinationer-for-aktiva-skepp` och `geografisk-arsuppspelning` är
  **Fullständigt implementerat**. Synliga autonoma flottor animeras först
  tillsammans med alla deras färder i samma stillastående vy.
  Destinationspilar begränsas till Fleets och vald flotta som inte är på en rutt enligt
  `destinationspilar-endast-i-flottvyn`, `vald-flotta-visar-destinationspil`
  och `ruttflottor-utan-destinationspilar`.
  Under uppspelning kan bara aktuellt rörelsesteg visa pilar där. Därefter visas övriga
  färder och sedan händelser från vänster till höger, vid samma horisontella
  läge nerifrån och upp. Avbrott och sparad kronologi behålls.
  Se [Events](../events-and-guidance.md).

- **Händelsekamera:** `handelseanpassad-kartkamera` och
  `stillastaende-kamera-vid-forflyttning` är **Fullständigt implementerat**.
  Kameran utgår från spelarens läge vid End turn,
  zoomar ut vid behov och ramar sedan mjukt in hela nästa färd eller händelse.
  Normalzoom är högsta fokuszoom. Kameran står stilla medan skeppet färdas och
  spelarens kartläge återställs efter uppspelningen. Detta ersätter tidigare
  kameraföljning. Se [produktkraven](../product-requirements.md).

- **Events:** `end-turn-vid-kartval`, `sekventiella-arshandelser` och
  `handelser-pa-kartan` är **Fullständigt implementerat**. End turn syns även
  med kartval. Årets händelser annonseras under sin kartplats, eller centralt
  för globala händelser, och flyttas till Events;
  listan visar bara senaste året i händelseordning. Stående mobil har listan
  under kartan, liggande mobil och bredare skärmar bredvid. Detta ersätter
  `handelser-grupperade-per-ar-och-typ`. Se [Events](../events-and-guidance.md).

- **Beslut och händelser:** Decisions samlar val och
  försörjningsproblem. Spelaren kan hoppa över beslut ett år eller tysta ett
  enskilt beslut tills det återaktiveras i Decisions. `tysta-beslut` är
  **Fullständigt implementerat** och sparas separat i varje spel.
  `beslutsmarkering-pa-flikar` och `tystade-beslut-sist` är **Fullständigt implementerat**:
  aktiva beslut markerar rätt flik med !, tystade beslut ligger sist och varje
  beslut öppnas med Review. Next decision är borttagen och ersätter det tidigare
  knappkravet i `beslutslista`. End turn varnar
  samlat och låter spelaren fortsätta ändå. Händelsekonsolen (`handelser`) är
  fullständigt implementerad: Events är fällbar och visar hela senaste året
  när utrymmet räcker, med intern rullning för resten.
  `passiva-vantehandelser` är **Fullständigt implementerat**: väntan som inte
  kräver spelarens åtgärd ger inget händelsebesked; status finns kvar i produktionen.
  `grupperade-transporthandelser` och `ett-meddelande-per-skeppsbygge` är
  **Fullständigt implementerat**: ankomst och hela transportlasten visas i
  ett besked per flotta; varje färdigbyggt skepp ger ett produktionsbesked.
  Events och End turn är alltid tillgängliga enligt `gemensam-events-panel`.
  `rundkontroller-i-decisions` är **Fullständigt implementerat**: båda finns
  även i Decisions.
  `senaste-aret-i-events`, `utvikbara-events` och `rundkontroller-pa-fler-vyer`
  är **Fullständigt implementerat**: nytt år visar senaste händelserna, Events
  kan fällas ut och in, och Research samt planetvyn har egna rundkontroller.
  `beslutsvagledning-i-vyn` är **Fullständigt implementerat**: ! följs av
  gulmarkeringar på rätt objekt och kontroller, kort åtgärdshjälp och Show.
  `beslut-vantar-pa-paborjad-atgard` är **Fullständigt implementerat**:
  relevant köad forskning eller produktion ersätter följdbeslut med Waiting.
  Nästa manuella steg och verkliga grundproblem ger åter beslut; ett
  tilldelningsbart Transport ship ger alltid ett ruttbeslut. Personal, varv
  och bärgning omfattas inte av den nya väntoregeln.
  Se [Events och beslutsguidning](../events-and-guidance.md).
