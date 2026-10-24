# Spacelords

## Vision

Spelaren förvaltar och expanderar ett rymdimperium över lång tid. Ett spelår är
en runda: spelaren ger order och får sedan se resultatet. Spelet ska fungera på
mobil, surfplatta och dator. Det börjar som en lokal enspelarupplevelse;
multiplayer och en eller två rundor per verkligt dygn är en senare riktning.
Se [hela visionen](docs/game-vision.md).

## Kravkategorier

- **Events:** `handelser-grupperade-per-ar-och-typ` är **Fullständigt implementerat**.
  Events samlas under årsrubriker och grupperas efter händelsetyp inom varje år.
  Population changes visar planetnamn och förändring, även +0.
  Se [produktkraven](docs/product-requirements.md).

- **Skeppsmotorer:** `motorbehov-for-alla-skepp`, `ion-pulse-engine` och
  `automatisk-motormontering` är **Fullständigt implementerat**. Alla skepp kräver
  motorer och minst en Ion pulse engine ger +1 fart. Automatisk försörjning,
  sparkompatibilitet och mobilflöde är verifierade. Se [ekonomireglerna](docs/economy-logistics.md).

- **Kategoriserade bygg- och produktval:** `byggkategorier` och
  `symbolbaserade-kataloger` är **Fullständigt implementerat**. Symbolknappar
  filtrerar kompakta listor med symbol och namn i Build selection och Production.
  Val av en post öppnar full information och en separat beställningsknapp.
  Planetvyns sökning, tangentbordsfokus och kompakta byggkö behålls.
  Kartans Production kompletterar dessa kataloger med radiella byggval.

- **Planetens undersidor:** `planetundersidor`, `byggplatsrutnat`,
  `projektens-forsorjningssteg`, `planetgemensamt-produktval` och
  `kompakt-produktionsko` är **Fullständigt implementerat**. Overview,
  Building sites, Build queue och Production delar upp planetens hantering.
  Byggplatser visas i rutnät, produktval samlas per planet och varje köprojekt
  visar sina försörjningssteg. Production har en kompakt kö med gruppering av
  intilliggande likadana projekt. Se [produktkraven](docs/product-requirements.md).

- **Kompakta köhandlingar:** `kompakta-koknappar` är **Fullständigt implementerat**.
  Research queue och Build queue använder små knappar med ↑, ↓ och × för
  omordning och borttagning, med förklarande hjälptexter.

- **Spelupplevelse och språk:** skärmfyllande vyer, stor hexkarta och engelska
  speltexter. Dokumentationen är svenska med spelets engelska namn och etiketter.
  `planetoppning-i-kartrubrik` är **Fullständigt implementerat**: kompakt
  Open planet visas bredvid planetnamn och hexkoordinat överst i kartpanelen.
- **Sparade spel:** tre separata spel med senaste speldatum, utforskad karta och
  automatisk sparning. Denna leverans rensar befintliga testsparningar en gång efter
  uttryckligt användarbeslut; nya spel bevaras därefter. Engångsrensningar
  är inte ett generellt tillstånd att radera sparplatser.
- **Karta och flottor:** `kompakta-flottkort` är **Fullständigt implementerat**:
  mindre skeppsrutor och tätare flottkort visar fler flottor samtidigt på Star map
  och i Fleets, med bibehållna pekytor och åtkomst till order. Fyra skepp ryms på
  en rad även i smala flottkort på dator och surfplatta.
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
  sparade flottor och förstärkningsregler bevaras. Se [produktkraven](docs/product-requirements.md).
  Ruttpanelen visar bara redan tilldelade flottor; den globala Assign fleet-listan
  är borttagen. På Star map kan flottor fortsatt dras till ruttlinjen för tilldelning.
- **Terraforming och Domes:** `terraformning`, `planettypsforskning`,
  `domes-per-byggplats`, `andningsbar-atmosfar` och `habitability-kapacitet`
  är **Fullständigt implementerat**. Se [spelreglerna](docs/terraforming.md).
  Domes ersätter `habitat`. `engangsreset-terraformning` är
  **Fullständigt implementerat** och rensar denna leverans testsparningar en gång.
  Framtida inkompatibla ändringar ska stämmas av med användaren på nytt.
- **Ekonomi och byggande:** ändliga fyndigheter av Iron, Water och Oil utvinns
  till lokala obegränsade lager. Material förbrukas en gång vid byggstart.
  Varje planet har en enda Build queue för byggnader, delar och skepp, med
  högst ett färdigt projekt per år (`gemensam-planetko`). Fabriker avgör vilka
  produkter planeten kan tillverka. Rocket engine factory och Ion pulse engine
  factory tillverkar motorer till alla skepp; Weapons module factory
  tillverkar vapendelar till Fighter. `automatiska-delorder` är
  **Fullständigt implementerat**: saknade delar köas lokalt eller beställs från
  lager och fabriker genom aktiva handelsrutter, utan dubbelreservationer.
  Om en del inte kan ordnas avvisas hela beställningen utan delvisa ändringar.
  `byggnadsantal-lokalt-och-globalt` är **Fullständigt implementerat**: Build
  selection visar redan i den kompakta listan befintliga byggnader per typ på
  vald planet och totalt på spelarens planeter. Köade byggprojekt ingår inte.
- **Forskning:** `forsknings-tradnavigation` är **Fullständigt implementerat**:
  ett zoom- och panorerbart forskningsträd med beroendepilar och bibehållen kamera.
  `forskningstradets-utrymme` är **Fullständigt implementerat**: trädet fyller
  vyn under rubriken, antal stationer visas bredvid rubriken även med bredare
  systemtypsnitt på smala telefoner och Research queue
  öppnas vid behov. Zoomrutan är borttagen; pinch och mushjul finns kvar.
  Forskningskö med automatiska förkunskaper låser upp alla
  skeppsfabriker och Trade logistics. Grundutvinning och Research station finns
  från start.
- **Route, Production och försörjning:** `farledskontrast`, `route-kartvy`,
  `produktions-kartvy`, `radiella-byggval`, `byggprojektets-forsorjningskedja`
  och `forsorjningsproblem-pa-kartan` är **Fullständigt implementerat**.
  Route ersätter Supply & production. Production visar byggval runt en ägd
  planet och en kö med en rad per projekt. Fyra kartlägen delar kartinstans
  och kamera; projektets faktiska försörjning markeras på kartan.
  `kompakt-produktionsko` omfattar både kartans individuella köposter och
  planetvyns befintliga gruppering. Tystade eller överhoppade problem ger inga
  kartmarkeringar; relevant navigeringsknapp visar ! för aktiva problem.
  `dome-fore-fabriksforslag` är **Fullständigt implementerat**: Production
  prioriterar rätt Dome när en tom plats behöver förberedas. Fabriker föreslås
  först när en förberedd plats finns; upptagna platser och saknad Dome-forskning
  får rätt förklaring. Detta gäller även planetens Production-undersida.
  Se [kartbaserade Route och Production](docs/route-production.md).
  Försörjningsreglerna `forsorjningsstatus`, `leveransfloden` och
  `produktionsformaga` behålls enligt [försörjningsreglerna](docs/supply-production.md).
  `forsorjningsoversikt`, `relevanta-material` och `materialoversikt` ersätts;
  Supply-lista, materialsökning och global materialdetaljvy är borttagna.
  `streckade-rutter-utan-transporter` är **Fullständigt implementerat** och
  gäller fortsatt, liksom fysisk frakt, automatiska delorder och sparade spel.
- **Kartans utrymme:** `fokuserat-kartval` är **Fullständigt implementerat**.
  Kartan saknar objektmeny, S/Q-förklaring och kontrollruta för zoom/Homeworld.
  Tomma rutor utan flottor visar ingen informationspanel. Val av himlakropp,
  flotta eller handelsrutt får den undre delen på små skärmar.
  `rullningsbar-kartpanel` är **Fullständigt implementerat**: panelens överkant
  flyttas upp först när spelaren drar eller rullar. Innehållet börjar rulla
  först vid maximal panelhöjd. Vid återgång rullas innehållet först till toppen
  innan panelen krymper.
  En del av kartan förblir synlig.
- **Beslut och händelser:** Decisions och Next decision samlar val och
  försörjningsproblem. Spelaren kan hoppa över beslut ett år eller tysta ett
  enskilt beslut tills det återaktiveras i Decisions. `tysta-beslut` är
  **Fullständigt implementerat** och sparas separat i varje spel. End turn varnar
  samlat och låter spelaren fortsätta ändå. Händelsekonsolen (`handelser`) är
  fullständigt implementerad och anpassar sin storlek efter skärmen: fler
  synliga rader på större skärmar och kompakt format på små eller låga skärmar.
  Events och End turn döljs när kartan visar ett val.
  `rundkontroller-i-decisions` är **Fullständigt implementerat**: båda finns
  även i Decisions.
- **Utveckling och kvalitet:** MVC, TypeScript, ESLint, p5 i instance mode,
  en snabb testsvit inom 20 sekunder och en utökad svit i GitHub CI.
  `utokad-testsvit` har en jobbtidsgräns på 20 minuter inklusive installation
  av webbläsare; snabbsvitens gräns är oförändrad.
  `snabb-mobilpublicering` är **Fullständigt implementerat** och provpublicerat:
  normalläget prioriterar mobil och manuell test efter automatiska kontroller.
  `sluttest-fore-merge` är **Delvis implementerat**: fullständig testning beställs
  separat före godkänd merge; första aktivering av manuell sluttest-CI på
  defaultbranch återstår.
- **Driftsättning:** endast klientbygget under `spacelords/` i målrepot;
  befintlig webbplats, navigation, DNS och Pages-inställningar bevaras.

## Detaljer och status

[Produktkraven](docs/product-requirements.md) anger varje aktivt kravs status:
**Ej implementerat**, **Delvis implementerat** eller **Fullständigt implementerat**.
[Ekonomi och logistik](docs/economy-logistics.md) beskriver de nya spelreglerna.

Denna iteration inför terraforming, planettypsforskning och Domes samt
befolknings- och byggplatsgränser utifrån habitability. Domes ersätter `habitat`.
`engangsreset-terraformning` ersätter äldre bevarandekrav enbart för denna
leverans: befintliga testsparningar töms en gång efter användarens beslut.
Nya sparningar bevaras, och framtida inkompatibla ändringar kräver ny avstämning.
Ekonomins planetlager, gemensamma Build queue och fysiska handelsnät behålls.

[Tekniska krav](docs/technical-requirements.md),
[domänmodell](docs/domain-model.puml),
[arbetsregler](AGENTS.md) och
[driftsättning](docs/deployment.md) hålls separat.
