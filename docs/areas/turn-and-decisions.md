# Rundan och händelser

En runda består av spelarens drag och fiendernas drag (`ap-pa-starmap`).
Spelaren flyttar flottan tills dess AP är förbrukade; då agerar fienderna och
nästa runda börjar. Det finns ingen End turn. Rundorna hålls i bakgrunden:
utan en pirat i sikte märks de inte, och en resa går i ett svep
(`somlos-forflyttning`). Händelser visas direkt som korta notiser högst upp
(`handelser-som-toppnotis`). Upptäckter och strider kan avbryta resan. Skärmen `Decisions` med beslutslistan finns inte längre
(`single-fleet-rensning`).

## Krav

- **Sömlös förflyttning:** `somlos-forflyttning` (2026-11-24) är
  **Fullständigt implementerat**. Utan en pirat i sikte följer nästa runda
  direkt, utan paus, så resan blir en enda rörelse. Vägvalet visar då bara
  antal hex, utan rundor, AP eller markeringar för rundslut. Med en pirat i
  sikte visas AP och rundslut som tidigare (`ap-pa-starmap`). Forskning och
  produktion räknar fortsatt i rundor i bakgrunden.

- **Beställt, ej implementerat:** `flytande-forflyttning`, `rakare-vag`,
  `pirat-minne-efter-sikt` och `animerade-piratsteg` är **Ej implementerat**.
  Se plan i [rensningsplanen](../single-fleet-cleanup.md#nästa-steg-beställt-2026-11-24-ej-implementerat).

- **Färdväg som orderpil:** `fardvag-som-orderpil`, `fardvag-fran-flottan`
  och `fardvag-under-resan` (2026-11-24) är **Fullständigt implementerat**.
  Färdvägen är flottans enda pil. Den ritas tunt i orderpilens blå färg från
  flottans ritade position genom hexarnas mitt och slutar i en pilspets. Den
  ligger kvar under hela resan, även mellan rundorna, och visar bara den del
  som återstår. Den markerade hexen behålls under förflyttningen. Det ersätter
  den gula färdplanen och den blå orderpilen; bara en dragen destination och
  fientliga flottor har kvar en rak pil.

- **Händelser som toppnotis:** `handelser-som-toppnotis` (2026-11-24) är
  **Fullständigt implementerat**. Varje händelse visas en gång, när den
  inträffar, som en kort notis högst upp, utan att störa spelet. Det finns
  ingen Events-lista, inga annonseringar mitt på skärmen och ingen
  uppspelning när rundan tar slut. Stridsresultat visas på stridsplanen. Ett
  laddat spel visar inte tidigare händelser igen. Det ersätter
  `gemensam-events-panel`, `handelseannonsering`, `handelser-vid-ankomst`,
  `sekventiella-arshandelser`, `handelser-pa-kartan`, `handelser`,
  `senaste-aret-i-events`, `utvikbara-events`, `bilder-i-events`,
  `handelseanpassad-kartkamera` och `geografisk-arsuppspelning` för
  händelser.

- **Kamera med död zon:** `kamera-med-dod-zon` (2026-11-24) är
  **Fullständigt implementerat**. Star map har en enda kamera som spelaren
  panorerar och zoomar fritt, även under en resa. När flottan rör sig ligger
  en rektangel mitt på den synliga kartan (halva bredden och höjden). Så
  länge skeppet är inom rektangeln står kameran still; lämnar det rektangeln
  följer kameran precis så mycket att skeppet hamnar på kanten. Det ersätter
  `kamera-foljer-skepp`, där kameran alltid centrerade skeppet, och den
  separata händelsekameran som efter en resa tog över panoreringen.
  `klick-pa-synlig-hex` gäller fortsatt.

- **Stridseffekter:** `flottor-fore-planetdetaljer`, `animerade-stridsskott`
  och `skadepartiklar-i-strid` är **Fullständigt implementerat**.
  Hexdetaljer visar flottor före planetdelen. Strid visar projektiler, träffpartiklar och
  explosioner före nästa handling. Se [Events](../events-and-guidance.md) och
  [taktisk strid](../space-battle/tactical-combat.md).

- **Rundtexter:** `round-i-speltexter` är **Fullständigt implementerat**:
  spelet använder `round` i stället för `year` i synliga texter.

- **Ankomstbesked:** `ingen-ankomstbesked` är **Fullständigt
  implementerat**. Ingen ankomstmening skapas. Det ersätter
  `ankomstbesked-endast-vid-manuell-forflyttning`.

- **Händelseval på dator:** `centrerade-handelseval-pa-dator`,
  `upptacktsbesked-utan-pausmening` och `stridsresultat-utan-upprepning` är
  **Fullständigt implementerat**. Stridsresultatet visas en gång.
  Upptäckter visas som korta blänkare (`upptackt-stannar-resan`) i stället
  för en Handle/Ignore-ruta.

- **Gemensamt händelseflöde:** `gemensamt-handelseflode` är **Fullständigt
  implementerat** för stridsrapporter, som visas en gång på stridsplanen. Beslutsdelen för upptäckter
  är ersatt av `upptackt-stannar-resan`: blänkare högst upp, utan Handle
  eller Ignore. En paus med pirat fortsätter utan End turn
  (`fiendeupptackt-utan-end-turn`).

- **Upptäckter som toppnotis:** `upptackt-som-toppnotis` (2026-11-23) är
  **Fullständigt implementerat**. En upptäckt på Star map visas bara en gång,
  som en kort notis högst upp. Kameran flyttas inte och ingen ruta visas mitt
  på skärmen. Upptäckten annonseras inte igen när rundan senare tar slut,
  även om rundan bestått av flera förflyttningar. Det ersätter
  `handelseannonsering` för upptäckter.

- **Flottanimation:** `en-flotta-i-taget` och
  `osynliga-flottor-utan-animation` är **Fullständigt implementerat**. Färder
  visas en åt gången. Dolda rörelser ger ingen animation eller väntan.
  `destinationer-for-aktiva-skepp` är **Fullständigt implementerat**: under
  en rörelse visar bara aktuellt steg sin destinationspil.

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
