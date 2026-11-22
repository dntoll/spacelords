# Production och planeter

Spelaren äger inga planeter. Planeter är platser på kartan med typ, miljö och
resurser som visas när de är utforskade. `Production` finns kvar i menyn men
visar `Production is not available yet.` tills den gemensamma
produktionskön i [Single fleet](../single-fleet.md) är beslutad
(`gemensam-produktionsko-i-flottan`, **Ej implementerat**).

## Krav

- **Planetinformation:** `planetinformation-pa-kartan` och
  `spelgrafik-planeter` är **Fullständigt implementerat**. En utforskad planet
  visar typ, miljö, habitability och resurser i kartans detaljpanel, med
  planetbild. Okända detaljer döljs.

- **Start på en planet:** spelet startar med flottan vid Tellus, som är en
  vanlig plats (`world.homePlanetId` i sparformatet). Startplaneten ger inga
  resurser eller byggnader.

## Borttaget med `single-fleet-rensning`

Kolonier, befolkning, Domes, terraforming, fabriker, planetproduktion,
handelsnät, automatiska transporter, varv och planetsidan finns inte längre.
Detaljfilerna om förenklad produktion, terraforming, fabriksuppgraderingar,
civiltrafik, planetköer, kolonisationsorder, automatiska flottorder,
flottuppgradering och bärgning är borttagna. Följande krav gäller därför
inte: `produktionsstatus-for-separata-behov`,
`varvets-automatiska-materialforsorjning`,
`fardig-terraformning-till-temperate`, `snabb-produktionsvy`,
`transportbygge-i-forsorjningssteg`, `atgarder-for-rutttransport`,
`senaste-teknik-i-byggval`, `uppgradera-obsoleta-fabriker`,
`planetundersidor`, `byggplatsrutnat`, `planetsida-informerar`,
`terraformning`, `planettypsforskning`, `domes-per-byggplats`,
`andningsbar-atmosfar`, `habitability-kapacitet`, `engangsreset-terraformning`,
`gemensam-planetko`, `delar-tillverkas-pa-behov`, `produktions-kartvy`,
`radiella-byggval`, `farledskontrast`, `forsorjningsproblem-pa-kartan`,
`kompakt-produktionsko`, `dubbelklick-bygger-pa-kartan`,
`byggknapp-vid-titel`, `rekommenderade-fabriker`, `fabriksstatus-i-byggval`,
`unika-flottnamn`, `rutt-eskortfordelning`, `ruttflottor-pa-kartan`,
`terraformering-forst`, `tre-produktionsnivaer`, `produktionsnatverk`,
`fraktskepp-ger-forbindelse`, `delat-lager-i-natverket`,
`en-enhet-per-fabrik-och-runda`, `mining-ships`, `mining-ship-anslutning`,
`en-runda-per-lank`, `skeppsorder-pa-planeten`, `byggtid-per-byggnad`,
`eskort-pa-routes`, `befolkningsutjamning-i-grupp`,
`runda-avslutas-fran-factories`, `produktionsko-bara-skepp`,
`produktionsbeslut-bara-for-skeppsfabrik`, `streckade-rutter-utan-transporter`,
`skeppsbilder-i-produktion`, `terraformering-pa-planeten`, `produktionsflikar`,
`planetsprites-i-factories`, `bestallda-lankar-syns`, `handelser-vid-ankomst`,
`delfabrik-i-produktion`, `en-order-ett-skepp`, `beslutssektioner`,
`stilla-beslutslista`, `factories-sparas`, `lankar-bara-i-grupper`,
`forsorjning-vantar-pa-bestalld-lank`, `vagledning-mot-eskort`,
`bestall-eskort-pa-lanken`, `eskort-utan-upptagna-flottor`,
`byggkons-framsteg`, `byggko-eller-skeppsdetaljer`,
`ny-fabrik-med-guldstjarna`, `uppgradera-delfabrik-i-factories`,
`byggval-bara-framforskat`, `rekommendation-i-menyn`, `byggorsak-i-kon`,
`startuppmaning-fabriker`, `bygga-forskningsstation` och `gemensam-byggko`.
