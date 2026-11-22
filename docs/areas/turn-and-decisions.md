# Rundan och händelser

En runda börjar med order och slutar med `End turn`. Därefter spelas rundan
upp: färder och sedan händelser i geografisk ordning. Upptäckter och strider
kan avbryta rundan. Skärmen `Decisions` med beslutslistan finns inte längre
(`single-fleet-rensning`).

## Krav

- **Illustrerade händelser och stridseffekter:** `bilder-i-events`,
  `flottor-fore-planetdetaljer`, `animerade-stridsskott` och
  `skadepartiklar-i-strid` är **Fullständigt implementerat**. Events visar
  bilder per rad för stjärnor, planeter, skepp och forskning. Hexdetaljer
  visar flottor före planetdelen. Strid visar projektiler, träffpartiklar och
  explosioner före nästa handling. Se [Events](../events-and-guidance.md) och
  [taktisk strid](../space-battle/tactical-combat.md).

- **Rundtexter:** `round-i-speltexter` är **Fullständigt implementerat**:
  spelet använder `round` i stället för `year` i synliga texter.

- **Ankomstbesked:** `ankomstbesked-endast-vid-manuell-forflyttning` är
  **Fullständigt implementerat**: ankomstbesked ges för Move-order.

- **Händelseval på dator:** `centrerade-handelseval-pa-dator`,
  `upptacktsbesked-utan-pausmening` och `stridsresultat-utan-upprepning` är
  **Fullständigt implementerat**. Händelsens plats och Handle/Ignore-ruta
  ligger kring kartans mitt på stora skärmar, upptäcktsrutan saknar den
  generella pausmeningen och stridsresultatet visas en gång.

- **Gemensamt händelseflöde:** `gemensamt-handelseflode` är **Fullständigt
  implementerat**. Upptäckter, piratkontakter och stridsrapporter använder
  Events med ett eget Handle eller Ignore för varje händelse. Rundan förblir
  pausad tills avbrottets händelser är avklarade. Val och pågående hantering
  bevaras vid omladdning. Händelserutan ligger ovanför End turn även på låga,
  liggande telefoner.

- **Flottanimation och händelseannonser:** `en-flotta-i-taget`,
  `osynliga-flottor-utan-animation` och `handelseannonsering` är
  **Fullständigt implementerat**. Färder visas en åt gången. Dolda rörelser
  ger ingen animation eller väntan. Platsbundna händelser annonseras under
  den markerade platsen och globala centralt.

- **Lugnare rundpresentation:** `destinationer-for-aktiva-skepp` och
  `geografisk-arsuppspelning` är **Fullständigt implementerat**. Under
  uppspelning visar bara aktuellt rörelsesteg sin destinationspil. Färder och
  händelser spelas från vänster till höger och vid samma horisontella läge
  nerifrån och upp.

- **Händelsekamera:** `handelseanpassad-kartkamera` och
  `stillastaende-kamera-vid-forflyttning` är **Fullständigt implementerat**.
  Kameran ramar mjukt in nästa färd eller händelse, står stilla medan skeppet
  färdas och återställer spelarens kartläge efteråt.

- **Events:** `end-turn-vid-kartval`, `sekventiella-arshandelser`,
  `handelser-pa-kartan`, `handelser`, `senaste-aret-i-events` och
  `utvikbara-events` är **Fullständigt implementerat**. End turn syns även med
  kartval. Rundans händelser annonseras och flyttas till Events, som visar
  senaste rundan i händelseordning och kan fällas ut och in. Events och End
  turn är alltid tillgängliga enligt `gemensam-events-panel`.

## Borttaget med `single-fleet-rensning`

Planetbesked, beslutslistan, varningen vid End turn och automatiska
flottor finns inte längre. Följande krav gäller därför inte:
`delproduktion-med-sammanhang`, `grupperade-planethandelser`,
`tysta-planetbesked`, `population-besked-endast-vid-andring`,
`ruttflottor-utan-ankomstbesked`, `direkt-atgard-fran-rundvarning`,
`samtidig-automatisk-flottanimation`, `samtidig-farledsanimation`,
`ruttflottor-utan-destinationspilar`, `beslutslista`, `tysta-beslut`,
`beslutsmarkering-pa-flikar`, `tystade-beslut-sist`,
`passiva-vantehandelser`, `grupperade-transporthandelser`,
`ett-meddelande-per-skeppsbygge`, `rundkontroller-i-decisions`,
`rundkontroller-pa-fler-vyer`, `beslutsvagledning-i-vyn` och
`beslut-vantar-pa-paborjad-atgard`.
