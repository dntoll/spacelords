# Rundan och händelser

En runda består av spelarens drag och fiendernas drag (`ap-pa-starmap`).
Spelaren flyttar flottan tills dess AP är förbrukade; då agerar fienderna och
nästa runda börjar. Det finns ingen End turn. Rundorna hålls i bakgrunden:
utan en pirat i sikte märks de inte, och en resa går i ett svep
(`somlos-forflyttning`). Händelser visas direkt som korta notiser högst upp
(`handelser-som-toppnotis`). Upptäckter och strider kan avbryta resan. Skärmen `Decisions` med beslutslistan finns inte längre
(`single-fleet-rensning`).

## Krav

- **Order vid kartupptäckt:** `order-vid-kartupptackt-utan-observator`
  (2026-11-24) är **Fullständigt implementerat** i utforskningen. När en
  upptäckt pausar resan kan spelaren alltid ge den egna flottan en ny order,
  även om informationen kommer från erövrade kartor och inte har ett
  observerande skepp. Det gäller också avbrott i befintliga sparningar.

- **Order efter återupptagen strid:** `order-efter-aterupptagen-strid`
  (2026-11-24) är **Fullständigt implementerat**. När en sparad strid är
  avslutad fortsätter rundan automatiskt, även om en äldre sparning fortfarande
  markerar stridsrapporten som aktiv. Spelaren kan därefter ge nya order på
  Star map; upptäckter och pågående strider hanteras som tidigare.

- **Sömlös förflyttning:** `somlos-forflyttning` (2026-11-24) är
  **Fullständigt implementerat**. Utan en pirat i sikte följer nästa runda
  direkt, utan paus, så resan blir en enda rörelse. Vägvalet visar då bara
  antal hex, utan rundor, AP eller markeringar för rundslut. Med en pirat i
  sikte visas AP och rundslut som tidigare (`ap-pa-starmap`). Forskning och
  produktion räknar fortsatt i rundor i bakgrunden.

- **Flytande förflyttning:** `flytande-forflyttning` är **Fullständigt
  implementerat**. Flottan glider genom flera steg och rundor med jämn
  hastighet, och mjukar upp rörelsen vid resans början och slut. Upptäckter
  och strider får fortfarande avbryta resan.

- **Obruten resa:** `obruten-resa` är **Fullständigt implementerat**. När
  en längre resa inte avbryts av upptäckter, strid eller annat som kräver
  spelarens uppmärksamhet fortsätter animationen utan stopp vid rundslut.
  Rörelsen mjukas bara upp vid resans start och slut. Det förtydligar
  `somlos-forflyttning` och `flytande-forflyttning`.

- **Vald ruta:** `val-andras-bara-av-spelaren` är **Fullständigt
  implementerat**. Den valda hexen ändras bara när spelaren själv väljer en
  annan. Förflyttning, rundslut och upptäckter flyttar inte valet. Det
  förtydligar `fardvag-under-resan`.

- **Rakare väg:** `rakare-vag` är **Fullständigt implementerat**. Bland vägar
  med lika kort restid väljs den som ligger närmast den räta linjen till
  målet. Kända hinder och långsammare terräng tas fortfarande med i vägvalet.
  Det ersätter kravet på växlande riktning i `rakare-hexforflyttning`.

- **Rak och jämn resa:** `rak-och-jamn-resa` är **Fullständigt
  implementerat**. Färdvägen och flottans rörelse går rakt genom hexarna där
  det går utan att gena genom andra hexar. Rörelsen behåller hastigheten
  över hex- och rundgränser; sikten ändras när flottan passerar hexkanten.
  Det förtydligar `flytande-forflyttning` och ersätter kravet i
  `fardvag-som-orderpil` på att linjen måste passera varje hexcentrum.

- **Stabil färdväg:** `stabil-fardvag` är **Fullständigt implementerat**.
  Förhandsvisning och resa använder samma väg, som behålls tills målet,
  flottans fart eller relevant nyupptäckt terräng kräver ett nytt vägval.

- **Piratminne och animerade piratsteg:** `pirat-minne-efter-sikt` och
  `animerade-piratsteg` är **Fullständigt implementerat**. En pirat som lämnar
  sikten visas nedtonad på sin senast kända plats. Om den rör sig ersätts
  den av ett frågetecken tills den upptäcks igen. Synliga piratsteg glider;
  dolda steg animeras inte. Minnet följer med sparade spel.

- **Färdväg som orderpil:** `fardvag-som-orderpil`, `fardvag-fran-flottan`
  och `fardvag-under-resan` (2026-11-24) är **Fullständigt implementerat**.
  Färdvägen är flottans enda pil. Den ritas tunt i orderpilens blå färg från
  flottans ritade position genom färdvägens hexar och slutar i en pilspets. Den
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
