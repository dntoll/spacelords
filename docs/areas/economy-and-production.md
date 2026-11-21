# Ekonomi, Factories, Production och planeter

Ekonomin bygger på produktionsnätverket i utforskningen `simple_production`.
Planeter som förbinds av fraktskepp delar råvaror och delar. Bara utvinning
och slutprodukter är platsbundna. `Factories` är platsen för allt byggande:
fabriker, Domes, terraforming, uppgraderingar och länkar (`Connect`).
`Production` på kartan beställer skepp och visar kön, och planetsidan
informerar om planeten (`planetsida-informerar`). Detaljerna per skärm står i
[förenklad produktion](../simple-production.md).

## Krav

- **Tydlig försörjningsstatus:** `produktionsstatus-for-separata-behov` är **Fullständigt implementerat**. Ett byggprojekts status bedöms utifrån dess eget behov, utan att blanda in varvets reparationer eller flottuppgraderingar. Se [förenklad produktion](../simple-production.md).

- **Varvets material:** `varvets-automatiska-materialforsorjning` är **Fullständigt implementerat**. Den första reparationen i varje fungerande Shipyard beställer saknade råvaror genom planetens handelsnät på samma sätt som ett aktivt bygge. Se [varv](../salvage-shipyards.md).

- **Färdig terraforming:** `fardig-terraformning-till-temperate` är
  **Fullständigt implementerat**. Vid 100% habitability blir stenplaneten
  `Temperate` som Tellus och får samma planetbild. Terraformingfabriker
  tas bort och köade sådana fabriker avbeställs. Platser och arbetare frigörs.
  Äldre sparningar bevaras. Detta ersätter den tidigare regeln i
  `terraformning` om bestående grundtyp och fabriker vid 100%.
  Se [Terraforming och Domes](../terraforming.md).

- **Snabb produktionsvy:** `snabb-produktionsvy` är **Fullständigt implementerat**. Val och ändringar i Production ska reagera snabbt även när riket växer, med uppdaterad information efter varje ändring. Se [kartans prestanda](../map-performance.md).

- **Transportbygge i försörjningssteg:** `transportbygge-i-forsorjningssteg` är **Fullständigt implementerat**. När ett byggprojekt väntar på transport visar försörjningsstegen vilken transportförberedelse som pågår och var ett skepp eller en fabrik är köad. Se [förenklad produktion](../simple-production.md).

- **Åtgärder för rutttransport:** `atgarder-for-rutttransport` är **Fullständigt implementerat**. Ruttens vägledning erbjuder nästa möjliga steg för forskning, fabrik eller transportskepp utifrån rikets läge och visar hinder och återkoppling. Se [händelser och vägledning](../events-and-guidance.md).

- **Senaste fabriksteknik:** `senaste-teknik-i-byggval` och
  `uppgradera-obsoleta-fabriker` är **Fullständigt implementerat**. Byggval
  visar högsta utforskade teleskop och motorer samt deras fabriker. Äldre fabriker kan
  uppgraderas direkt till senaste versionen på samma byggplats från Factories
  (`uppgradera-delfabrik-i-factories`). Se [fabriksuppgraderingar](../factory-upgrades.md).

- **Symboler i kataloger:** `symbolbaserade-kataloger` är **Fullständigt
  implementerat**. Byggnader, skepp och delar har dekorativa symboler med
  reservsymbol om bilden saknas; tillgängliga namn finns alltid i texten.
  Byggval och kategorier på planetsidan är borttagna med `planetsida-informerar`.

- **Planetsidan:** `planetundersidor`, `byggplatsrutnat` och
  `planetsida-informerar` är **Fullständigt implementerat**. Planetsidan har
  `Overview` med planetens data, resurser och byggnader och `Building sites`
  med byggplatserna i rutnät. Byggplatserna visar byggnad, bygge, kupolbehov
  eller låsning och har `Demolish`/`Keep`. Byggande, Domes, uppgraderingar
  och avbrytande sker i Factories, och skepp beställs i Production.
  `planetsida-informerar` (2026-11-21) ersätter `Build selection`
  (`visa-byggalternativ`, `byggkategorier`, `byggnadsantal-lokalt-och-globalt`)
  och flikarna `Build queue` och `Production` (`planetgemensamt-produktval`,
  `projektens-forsorjningssteg`).

- **Kompakta köhandlingar:** `kompakta-koknappar` är **Fullständigt implementerat**.
  Research queue använder draghandtag och × för omordning och borttagning,
  med hjälptexter enligt `dragbara-koer`. Kön i Production har bara × och
  visar varför varje skepp byggs (`byggorsak-i-kon`).

- **Terraforming och Domes:** `terraformning`, `planettypsforskning`,
  `domes-per-byggplats`, `andningsbar-atmosfar` och `habitability-kapacitet`
  är **Fullständigt implementerat**. Se [spelreglerna](../terraforming.md).
  Domes ersätter `habitat`. `engangsreset-terraformning` är
  **Fullständigt implementerat** och rensar denna leverans testsparningar en gång.
  Framtida inkompatibla ändringar ska stämmas av med användaren på nytt.

- **Ekonomi och byggande:** ändliga fyndigheter av Iron, Water och Oil utvinns
  till planetlager som delas i produktionsnätverket. Varje planet har en
  gemensam kö för byggnader och skepp (`gemensam-planetko`). Fabriker avgör
  vilka produkter som kan tillverkas, och delar tillverkas när ett skepp
  behöver dem (`delar-tillverkas-pa-behov`). Det ersätter
  `automatiska-delorder`, där saknade delar beställdes som egna order.

- **Production på kartan:** `produktions-kartvy`, `radiella-byggval`,
  `farledskontrast` och `forsorjningsproblem-pa-kartan` är **Fullständigt
  implementerat**. Production visar skeppsval runt en ägd planet och en kö
  med en rad per skepp (`kompakt-produktionsko`). Kartlägena delar
  kartinstans och kamera (`delad-kartkamera`). Beslut om försörjning och
  länkar öppnar Factories, beslut om skeppsorder öppnar Production, och
  tystade eller överhoppade problem ger inga markeringar. `dubbelklick-bygger-pa-kartan`
  och `byggknapp-vid-titel` är **Fullständigt implementerat**: dubbelklick
  köar en order och Build står bredvid titeln. Ringen visar bara skepp.
  `produktionsval-efter-forekomst` och `produktionsberoenden-i-byggval` är
  ersatta av `rekommenderade-fabriker` och `fabriksstatus-i-byggval` i
  Factories.
  `unika-flottnamn`, `rutt-eskortfordelning` och `ruttflottor-pa-kartan` är
  **Fullständigt implementerat**: flottor har unika namn, Fighters fördelas
  jämnt som eskort och flottor på en rutt visas vid ändpunkten.
  `dome-fore-fabriksforslag` är ersatt av `terraformering-forst`: Factories
  rekommenderar rätt Dome när en plats behöver den.
  Route-skärmen (`route-kartvy`) och ruttskapandet på kartan
  (`handelsrutt-skapande-pa-stjarnkartan`) är ersatta av Factories och
  `rutter-endast-i-connect` (2026-11-21).

- **Förenklad produktion (utforskning `simple_production`):**
  `tre-produktionsnivaer`, `produktionsnatverk`, `fraktskepp-ger-forbindelse`,
  `delat-lager-i-natverket`, `en-enhet-per-fabrik-och-runda`,
  `delar-tillverkas-pa-behov` med flera är
  **Fullständigt implementerat** inom utforskningen; `mining-ships` och
  `mining-ship-anslutning` är **Ej implementerat**. Råvaror och delar delas inom ett nätverk av planeter
  som är förbundna med fraktskepp. Bara utvinning och slutprodukter är
  platsbundna. Varje länk mellan planeter tar en runda (`en-runda-per-lank`). Skepp beställs fortsatt från kartans Production (`skeppsorder-pa-planeten`). Se
  [förenklad produktion](../simple-production.md).
  Spelmodellen och skärmarna under `Factories` är **Fullständigt
  implementerade** för nätverk, fabriker, byggen med byggtid
  (`byggtid-per-byggnad`), eskort (`eskort-pa-routes`) och utjämning av
  befolkning (`befolkningsutjamning-i-grupp`). Mining ships är uppskjutna
  tills resten är klart. Efter mobiltestet är `runda-avslutas-fran-factories`,
  `produktionsko-bara-skepp`, `produktionsbeslut-bara-for-skeppsfabrik` och
  `forskningsvy-utan-station` **Fullständigt implementerat**.
  `forsorjningsoversikt`, `relevanta-material` och `materialoversikt` ersätts;
  Supply-lista, materialsökning och global materialdetaljvy är borttagna.
  `streckade-rutter-utan-transporter` är **Fullständigt implementerat** och
  gäller fortsatt.
  `skeppsbilder-i-produktion` och `terraformering-pa-planeten` är
  **Fullständigt implementerade**: Production visar skeppsbilder och
  terraformering rekommenderas på planeten.
  `produktionsflikar` är **Fullständigt implementerat**: Production har
  flikar för valt skepp och kö.
  `planetsprites-i-factories` är **Fullständigt implementerat**: graferna i
  Factories visar planetsprites och grupper som kluster.
  `bestallda-lankar-syns` och `handelser-vid-ankomst` är **Fullständigt
  implementerade**: beställda länkar syns i Factories och händelser visas när
  skeppet anländer.
  `delfabrik-i-produktion` är **Fullständigt implementerat**: delfabriker
  som tillverkar visas som In production.
  `terraformering-forst` är **Fullständigt implementerat**: planeter som
  behöver terraformering rekommenderar först sin terraformingfabrik.
  `en-order-ett-skepp` är **Fullständigt implementerat**: samma order köar
  inte flera skepp när den bara behöver ett.
  `beslutssektioner` och `stilla-beslutslista` är **Fullständigt
  implementerade**: Decisions har underrubriker och flyttar eller rullar inte
  när något trycks.
  `factories-sparas` är **Fullständigt implementerat**: order i Factories
  sparas.
  `lankar-bara-i-grupper` och `forsorjning-vantar-pa-bestalld-lank` är
  **Fullständigt implementerade**: inga länkskärmar för ensamma planeter och
  inget försörjningsproblem medan en beställd länk är på väg.
  `vagledning-mot-eskort` och `bestall-eskort-pa-lanken` är **Fullständigt
  implementerade**: en oeskorterad länk visar nästa steg mot en eskort och
  kan beställa en Fighter direkt. `eskort-utan-upptagna-flottor` är
  **Fullständigt implementerat**: upptagna flottor föreslås inte som eskort.
  `byggkons-framsteg` och `byggko-eller-skeppsdetaljer` är **Fullständigt
  implementerade**: byggkön visar varje skepps delar och väntan, och
  Production visar antingen kön eller ett skepps detaljer.
  `ny-fabrik-med-guldstjarna` och `uppgradera-delfabrik-i-factories` är
  **Fullständigt implementerade**: nya fabriker märks med guldstjärna och
  delfabriker kan uppgraderas från Factories.
  `byggval-bara-framforskat` är **Fullständigt implementerat**: inga byggval
  för sådant som inte är framforskat.
  `rekommendation-i-menyn` är **Fullständigt implementerat**: Factories
  markeras i menyn när en rekommenderad fabrik kan byggas.
  `forskning-utan-rubrikrad`, `forskningstrad-utan-korsningar`,
  `forskningstrad-raka-linjer`, `storre-forskningstext`, `detaljer-utan-scroll`, `forskningsflikar`,
  `storre-text-dar-det-far-plats`,
  `forskningsikon-i-detaljer` och `forskningstid` är **Fullständigt
  implementerade** inom utforskningen: Research saknar rubrikrad, trädet har
  inga korsande linjer, detaljerna har teknikens ikon och en teknik tar 1–3
  rundor. `forskningslov-som-symbol` är ersatt: alla noder har namn igen.
  `forsta-station-pa-vag` är **Fullständigt implementerat**: Research visar
  att den första stationen byggs och när forskningen kan börja.
  `flottkategorier` och `byggorsak-i-kon` är **Fullständigt implementerade**
  inom utforskningen: Fleets färgar flottor efter kategori och kan dölja
  kategorier, och Build queue visar varför varje skepp byggs i stället för att
  kunna ordnas om (ersätter omordningen i `dragbara-koer` för Build queue).
  `startuppmaning-fabriker`, `fabriksstatus-i-byggval` och
  `rekommenderade-fabriker` är **Fullständigt implementerade** inom
  utforskningen: ett nytt spel uppmanar till forskning och utvinning, byggvalen
  färgas efter om fabriken finns, byggs eller saknas i gruppen och det som
  behövs just nu står överst under `Recommended`.

- **Grundkrav för byggande:** `bygga-forskningsstation` och
  `gemensam-byggko` är **Fullständigt implementerat**. Research station kräver
  ingen egen forskning och kan byggas flera gånger per planet. Planetens
  byggnader och skepp delar en kö.
