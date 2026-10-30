# Spacelords

## Vision

Spelaren förvaltar och expanderar ett rymdimperium över lång tid. Ett spelår är
en runda: spelaren ger order och får sedan se resultatet. Spelet ska fungera på
mobil, surfplatta och dator. Det börjar som en lokal enspelarupplevelse;
multiplayer och en eller två rundor per verkligt dygn är en senare riktning.
Se [hela visionen](docs/game-vision.md).

## Kravkategorier

- **Renare spelgränssnitt:** Kraven för borttagna S/Q-texter och hex-koordinater,
  korta instruktioner, färre upprepningar i Production, mindre New fleet-ruta,
  villkorad ! Needs attention vid titeln och forskningsinformation i trädet är
  **Fullständigt implementerat**. Colony ship factory följer direkt efter
  Rocket engine factory. Se [krav och ersatta beteenden](docs/compact-interface.md).
  `handelsemarkering-utan-numrering` är **Fullständigt implementerat**:
  etiketter som Event 1 tas bort från kartans händelsemarkering.
  `research-med-ett-tryck` är **Fullständigt implementerat**: Research-knappen
  köar med ett tryck även direkt efter panorering av trädet.

- **Civiltrafik och arbetskraft:** `civil-skyttelforskning`,
  `civil-skytteltillverkning`, `automatisk-arbetskraftstrafik`,
  `civiltrafik-pa-handelsnatet` och `civiltrafik-sparning` är
  **Fullständigt implementerat**. Civilian transport låser upp Civilian shuttle
  i Transport ship factory. Skyttlar startar automatiskt, fraktar 500 personer
  per skepp genom öppna Trade routes och omprövar arbetskraftsbehov vid
  mellanlandningar. Minst 1 000 invånare och lokal bemanning skyddas.
  Äldre sparningar bevaras. Se [civiltrafik](docs/civilian-transport.md).

- **Automatiska flottorder:** `automatisk-bargning`,
  `automatisk-rutttilldelning` och `forskade-automatiska-order` är
  **Fullständigt implementerat**. Auto salvage hämtar och levererar ett vrak
  i taget och fortsätter med nästa. Auto assign route hittar närmaste rutt
  utan transport. Båda kan vänta på nya mål. Även Patrol och Explore kräver
  forskning för nya order; äldre aktiva order bevaras. Se
  [automatiska flottorder](docs/automated-fleet-orders.md).
  `flottval-vid-varv` är **Fullständigt implementerat**: flottor på varvets
  hex kan öppnas från varvspanelen även när kartmarkörerna överlappar.

- **Bärgningsorder från flottan:** `bargningsorder-fran-flotta` är
  **Fullständigt implementerat**. Salvage följt av vrakval ger flottan en
  sparad order att resa dit, hämta vraket och återvända till eget varv.
  Det fungerar även för vrak i den egna hexen. Se
  [bärgning och varv](docs/salvage-shipyards.md).

- **Koloniseringsorder:** `koloniseringsorder` är **Fullständigt implementerat**.
  Colonize följt av planetval ger en sparad order att resa dit och kolonisera
  automatiskt vid ankomst, efter eventuell strid. Ordern kan avbrytas eller
  ersättas. Exakt ett Colony ship förbrukas och äldre sparningar bevaras.
  Se [koloniseringsorder](docs/colonization-orders.md).

- **Direkta beslut från rundvarningen:** `direkt-atgard-fran-rundvarning`
  är **Fullständigt implementerat**. Varje beslut i Decisions remaining har
  en egen Review-knapp som öppnar rätt vy och objekt utan omväg via Decisions.
  Exempelvis öppnar Choose research forskningsträdet. Året förblir oförändrat.
  Se [beslutsguidning](docs/events-and-guidance.md).

- **Händelseval på dator:** `centrerade-handelseval-pa-dator` är
  **Fullständigt implementerat**. Händelsens plats och Handle/Ignore-ruta
  ligger kring kartans mitt på stora skärmar och följer ändrad fönsterstorlek.
  `upptacktsbesked-utan-pausmening` är **Fullständigt implementerat**:
  den generella meningen om paus och kommande strid har tagits bort ur
  upptäcktsrutan.
  `stridsresultat-utan-upprepning` är **Fullständigt implementerat**:
  stridsresultatet visas en gång, med plats och vrakantal som kompletterande
  detaljer.
  Se [Events och beslutsguidning](docs/events-and-guidance.md).

- **Sikt under rörelse och nya skepp:** `sikt-under-forflyttning` och
  `nybyggda-skepp-utan-ruttflotta` är **Fullständigt implementerat**.
  Synfält och synliga pirater uppdateras under skeppens rörelse; lämnade
  områden behålls som kartminne. Nybyggda skepp får en vanlig lokal flotta
  och hamnar inte direkt i en flotta med ruttuppdrag. Se
  [sikt](docs/detection-telescopes.md) och [logistik](docs/economy-logistics.md).

- **Genererade symboler och kartbilder:** `genererade-symboler-och-kartbilder`
  är **Fullständigt implementerat**. 24 byggnadssymboler, sex planeter och
  en kartbild för Orbital shipyard är genererade, granskade och sparade som
  transparenta PNG-original. De 20 byggnadsporträtten ingår inte;
  `spelgrafik-symboler`, `spelgrafik-planeter` och `spelgrafik-kartstation`
  är **Fullständigt implementerat**: bilderna används i spelet och riktade
  mobilkontroller är godkända. Leveransen följer snabbpublicering för mobiltest.
  Se [bildleveransen](docs/generated-map-artwork.md).

- **Genererade skeppsbilder:** `genererade-skeppssprites` är **Fullständigt implementerat**. Transport ship, Salvage ship och Space pirate har egna transparenta bilder i flottpaneler och på kartan. Piraten har avvikande färger, rost och provisoriska lagningar. Se [skeppsgrafik](docs/ship-artwork.md).

- **Mobilens kartval och forskning:** `kartpanel-till-events`,
  `centrerat-kartfokus` och `dubbelklick-koar-forskning` är **Fullständigt
  implementerat**. Kartans detaljpanel använder ytan ned till Events. Show
  centrerar målet i den fria kartytan, och research kan köas med dubbelklick
  eller dubbeltryck. Handelsrutter kan dras från en synlig markerad planet.
  `handelsrutt-skapande-pa-stjarnkartan` är **Fullständigt implementerat**:
  Trade logistics krävs och förklaras före ruttskapandet; avvisade försök
  behåller sin förklaring och startplanet. Se [handelsrutter](docs/star-map-trade.md).
  Se [mobilens kartval och forskning](docs/mobile-map-interactions.md).

- **Gemensamt händelseflöde:** `gemensamt-handelseflode` är **Fullständigt
  implementerat**. Upptäckter, piratkontakter och stridsrapporter använder Events
  med ett eget Handle eller Ignore för varje händelse. Året förblir pausat tills
  avbrottets händelser är avklarade. Redan visade händelser annonseras inte igen;
  val och pågående hantering bevaras vid omladdning utan rensning av sparningar.
  Se [Events](docs/events-and-guidance.md).

- **Enhetliga spelvyer och bildprompter:** `gemensam-events-panel`,
  `dragbara-koer`, `omordningsbar-reparationsko`, `bildpromptpaket`,
  `skeppssprites-pa-kartan`, `forskningskamerans-granser` och
  `planetinformation-pa-kartan` är **Fullständigt implementerat**. Riktade
  kontroller är godkända; leveransen följer snabbpublicering för mobiltest. Se [krav och ersatta regler](docs/unified-interface.md)
  samt [bildpromptpaketet](docs/image-prompts/README.md).

- **Varierad galax och kompakta spelvyer:** `stjarnvariation`, `galaxarmar`,
  `dragbara-flottorder`, `kompakt-forskningstrad`, `forskningens-avslojande`,
  `forskningsdetaljer-vid-val` och `produktionsvalens-statusfarger` är
  **Fullständigt implementerat**. Ändringen omfattar 150 system i nya galaxer, stjärnor
  utan spikes, kompakta forskningsrutor och färger för lokal förekomst,
  nätverk och kö. Se [krav och status](docs/varied-galaxy-compact-views.md).

- **Stjärnbild och utzoomning:** `stjarnornas-hexutseende` förtydligas med
  varierade, texturerade stjärnor innanför hexens kant, helt utan spikes.
  `utokad-utzoomning` tillåter 3 procent zoom med en avskalad galaxöversikt.
  Kraven är **Fullständigt implementerat**, med verifierade mobilflöden.
  Se [galax och terräng](docs/galaxy-terrain.md).

- **Utökad galax och terräng:** radie 100, 150 system i nya galaxer, planeter två hexsteg
  från stjärnorna, större stjärngrafik, ofarbara stjärnor, två asteroidtyper och
  nebulosor som skymmer sikten. Explore fyller ut kartan i lager; Explore stars
  tar ett helt varv för att upptäcka systemets planeter. Kraven är
  **Fullständigt implementerat**, med verifierade mobilflöden i båda motorerna.
  Äldre sparplatser rensas en gång efter uttryckligt godkännande för denna
  leverans. Se [krav och status](docs/galaxy-terrain.md).

- **Patrol:** `flottpatrullering` är **Fullständigt implementerat**. Flottor med
  Fighters cirklar runt orderhexen och jagar synliga pirater inom sin effektiva
  flottfart, mätt från flottans aktuella position. Gemensam sikt används;
  tappad kontakt eller räckvidd ger återgång till patrullvarvet. Ordern och
  avbrutna år bevaras utan rensning av äldre sparningar. Se [spelreglerna](docs/space-pirates.md).

- **Utforskning och kompakta order:** ytterligare komprimerade flottkort,
  ordersymboler, tillfälliga ruttnamn, produktionskvitton och bestående
  utforskningsuppdrag. Året ska kunna avbrytas vid upptäckter och återupptas
  med bevarad förflyttning, även efter omladdning. Kraven är **Fullständigt implementerat**;
  se [utforskning och upptäckter](docs/exploration-interruptions.md).

- **Space pirates:** `rymdpirater-per-stjarna`, `rymdpiraters-patrullering`,
  `flottstrid-per-hex` och `rymdpiraters-sparning` är **Fullständigt implementerat**.
  Nya spel har fientliga pirater runt andra stjärnor, patrullering och strid
  efter varje hexsteg. Enhetstester och mobilflöden i Chromium och WebKit är verifierade.
  Äldre spel får inga pirater. Se [spelreglerna](docs/space-pirates.md).

- **Flottanimation och händelseannonser:** `en-flotta-i-taget`,
  `osynliga-flottor-utan-animation` och `handelseannonsering` är
  **Fullständigt implementerat**. En flottas synliga färd visas åt gången.
  Dolda rörelser ger ingen animation eller väntan. Platsbundna händelser
  annonseras under den markerade platsen och globala händelser centralt;
  texten flyttas sedan till listan automatiskt. Pause/Play, Next och Skip är
  borttagna på uttrycklig beställning. Se [Events](docs/events-and-guidance.md).

- **Händelsekamera:** `handelseanpassad-kartkamera` och
  `stillastaende-kamera-vid-forflyttning` är **Fullständigt implementerat**.
  Kameran utgår från spelarens läge vid End turn,
  zoomar ut vid behov och ramar sedan mjukt in hela nästa färd eller händelse.
  Normalzoom är högsta fokuszoom. Kameran står stilla medan skeppet färdas och
  spelarens kartläge återställs efter uppspelningen. Detta ersätter tidigare
  kameraföljning. Se [produktkraven](docs/product-requirements.md).

- **Events:** `end-turn-vid-kartval`, `sekventiella-arshandelser` och
  `handelser-pa-kartan` är **Fullständigt implementerat**. End turn syns även
  med kartval. Årets händelser annonseras under sin kartplats, eller centralt
  för globala händelser, och flyttas till Events;
  listan visar bara senaste året i händelseordning. Stående mobil har listan
  under kartan, liggande mobil och bredare skärmar bredvid. Detta ersätter
  `handelser-grupperade-per-ar-och-typ`. Se [Events](docs/events-and-guidance.md).

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
  visar sina försörjningssteg. Production visar en kompakt rad per projekt
  enligt `dragbara-koer`. Se [produktkraven](docs/product-requirements.md).

- **Kompakta köhandlingar:** `kompakta-koknappar` är **Fullständigt implementerat**.
  Research queue och Build queue använder draghandtag och × för omordning
  och borttagning, med hjälptexter enligt `dragbara-koer`.

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
  `forskning-kraver-station` är **Fullständigt implementerat**: en färdig
  Research station krävs för nya forskningsbeställningar. Befintliga köer väntar
  utan drift; Decisions föreslår forskning först när en station finns. Detta
  ersätter tidigare fri köläggning under `forskningsko`.
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
  planetvyns separata projektrader enligt `dragbara-koer`. Tystade eller överhoppade problem ger inga
  kartmarkeringar; relevant navigeringsknapp visar ! för aktiva problem.
  `dome-fore-fabriksforslag` är **Fullständigt implementerat**: Production
  prioriterar rätt Dome när en tom plats behöver förberedas. Fabriker föreslås
  först när en förberedd plats finns; upptagna platser och saknad Dome-forskning
  får rätt förklaring. Detta gäller även planetens Production-undersida.
  `unika-flottnamn`, `rutt-eskortfordelning` och `ruttflottor-pa-kartan` är
  **Fullständigt implementerat**: flottor har unika namn, Fighters tilldelas
  rutters transportflottor med jämn fördelning och Route visar tilldelade flottor
  vid ruttens mitt samt lediga transporter i lila.
  `dubbelklick-bygger-pa-kartan` och `byggknapp-vid-titel` är
  **Fullständigt implementerat**: dubbelklick på ett radiellt val köar en order
  och Build visas bredvid titeln före byggdetaljerna.
  `produktionsval-efter-forekomst` och `produktionsberoenden-i-byggval` är
  **Fullständigt implementerat**: saknade val kommer först, saknade producenter
  före beroende fabriker och ! förklarar produktionsberoenden utan ny byggspärr.
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
  Se [Events och beslutsguidning](docs/events-and-guidance.md).
- **Utveckling och kvalitet:** MVC, TypeScript, ESLint, p5 i instance mode,
  en snabb testsvit inom 20 sekunder och en utökad svit i GitHub CI.
  `snabb-testsvit` är **Fullständigt implementerat**: om tiden överskrids flyttas
  mindre prioriterade tester till den utökade sviten vid begärt sluttest.
  Detaljerade vy-, rit- och layoutkontroller ligger där; centrala spelregler behålls snabba.
  Även 23 vytester för spelgrafik, planetundersidor och forskningsdetaljer
  ligger i den utökade sviten efter ett uppmätt tidsöverskridande.
  `utokad-testsvit` har en jobbtidsgräns på 20 minuter inklusive installation
  av webbläsare; snabbsvitens gräns är oförändrad.
  `snabb-mobilpublicering` är **Fullständigt implementerat** och provpublicerat:
  en vanlig ändringsbeställning innebär snabbtest och publicering av arbetsbranchen,
  om användaren inte uttryckligen avstår. Därefter testar användaren på mobilen.
  `sluttest-fore-merge` är **Delvis implementerat**: fullständig testning beställs
  separat före godkänd merge; första aktivering av manuell sluttest-CI på
  defaultbranch återstår.
- **Driftsättning:** endast klientbygget under `spacelords/` i målrepot;
  befintlig webbplats, navigation, DNS och Pages-inställningar bevaras.

## Detaljer och status

Stridsrapporter, vrak, bärgning, orbitala varv och forskning från hemförda delar
är **Fullständigt implementerat**. Se [bärgning och varv](docs/salvage-shipyards.md) för
de nya kraven och deras stabila namn.

`aktuell-detektionssikt`, `kartans-sikttillstand`, `teleskopnivaer`,
`teleskopfabriker`, `teleskop-i-exploration-ships` och `pirat-aterupptackt` är
**Fullständigt implementerat**: aktuell sikt, mörkare kartminne, tre forskningsbara
teleskopfabriker och monterade skeppsteleskop samt avbrott vid återupptäckt. Se [sikt och teleskop](docs/detection-telescopes.md).

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
