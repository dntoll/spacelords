# Rundan och händelser

En runda består av spelarens drag och fiendernas drag (`ap-pa-starmap`).
Spelaren flyttar flottan tills dess AP är förbrukade; då agerar fienderna och
nästa runda börjar. Det finns ingen End turn. Färder och händelser spelas upp
i geografisk ordning. Upptäckter och strider
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

- **Ankomstbesked:** `ingen-ankomstbesked` är **Fullständigt
  implementerat**. Ingen ankomstmening skapas. Det ersätter
  `ankomstbesked-endast-vid-manuell-forflyttning`.

- **Händelseval på dator:** `centrerade-handelseval-pa-dator`,
  `upptacktsbesked-utan-pausmening` och `stridsresultat-utan-upprepning` är
  **Fullständigt implementerat**. Stridsresultatet visas en gång.
  Upptäckter visas som korta blänkare (`upptackt-stannar-resan`) i stället
  för en Handle/Ignore-ruta.

- **Gemensamt händelseflöde:** `gemensamt-handelseflode` är **Fullständigt
  implementerat** för stridsrapporter i Events. Beslutsdelen för upptäckter
  är ersatt av `upptackt-stannar-resan`: blänkare högst upp, utan Handle
  eller Ignore. En paus med pirat fortsätter utan End turn
  (`fiendeupptackt-utan-end-turn`).

- **Upptäckter som toppnotis:** `upptackt-som-toppnotis` (2026-11-23) är
  **Fullständigt implementerat**. En upptäckt på Star map visas bara en gång,
  som en kort notis högst upp. Kameran flyttas inte och ingen ruta visas mitt
  på skärmen. Upptäckten annonseras inte igen när rundan senare tar slut,
  även om rundan bestått av flera förflyttningar. Det ersätter
  `handelseannonsering` för upptäckter.

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

- **Händelsekamera:** `handelseanpassad-kartkamera` är **Fullständigt
  implementerat** för händelser. `kamera-foljer-skepp` är **Fullständigt
  implementerat** och ersätter stillaståendet i
  `stillastaende-kamera-vid-forflyttning`: under färden följer kameran
  skeppet så att det ligger i mitten av kartan, med spelarens zoom.
  Panelens planeringsförskjutning används inte under färden. `klick-pa-synlig-hex`
  är **Fullständigt implementerat**: ett klick träffar hexen under musen i
  den kamera som syns.

- **Events:** `sekventiella-arshandelser`, `handelser-pa-kartan`,
  `handelser`, `senaste-aret-i-events` och `utvikbara-events` är
  **Fullständigt implementerat**. Rundans händelser annonseras och flyttas
  till Events, som visar senaste rundan i händelseordning och kan fällas ut
  och in. Events är alltid tillgängligt enligt `gemensam-events-panel`.
  `end-turn-vid-kartval` är ersatt av `ap-pa-starmap`: det finns ingen End
  turn.

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
