# Rensningsplan för Single fleet

`single-fleet-rensning` är **Delvis implementerat**: den automatiska
persontransporten och delar av handelsautomation har tagits bort.
Planetekonomi, kolonisation, handelsrutter, flera flottor och övriga
automatiska order återstår tillsammans med tillhörande tester och krav. Rensningen görs i små sammanhängande commits
som pushas en i taget. Uppdatera checklistan i samma commit som arbetet.
En annan agent ska kunna fortsätta från den pushade arbetsbranchen.

## Beslut och avgränsning

Användaren har godkänt att ta bort ägda planeter, kolonisation, befolkning,
Domes och terraforming; fabriker, planetproduktion, handelsnätverk och
automatiska transporter; flera spelarflottor, delning och sammanslagning,
automatiska flottorder och planetköer; planetforskning och fabrikslås;
samt händelser och gränssnitt som enbart stöder dessa funktioner.

Planeter som platser, kartan, rymdstrid, bordning, skepp och utrustning
behålls, liksom relevanta delar av Research och Production. Framtida handel
med besökta platser är en öppen fråga. Skärmar får tillfälligt förenklas
eller tas bort under omställningen. Arbetsregler, arkitektur och kvalitet
behålls. Ingen ny obestämd Single fleet-mekanik implementeras under rensningen.

Användaren har uttryckligen godkänt att gamla sparningar blir inkompatibla
på `single_fleet` för denna omställning och att en ny spelstart används.
Senare, separata inkompatibla ändringar kräver ny avstämning enligt
`avstamning-sparkompatibilitet`.

## Checklista

Varje punkt är klar först när kod, tillhörande tester och aktiva krav har
stämts av, kartdiagram har genererats vid strukturändringar och relevanta
kontroller har körts. Dela punkter i mindre commits vid behov och notera
återstående arbete. Rensningen kan tillfälligt innebära att kampanjen inte är
spelbar, men bevara fristående strids- och bordningstester.

- [x] Dokumentera beslut, omfattning och fortsättningsbar checklista.
- [x] Inventera kopplingar och välj små, byggbara borttagningssteg; notera
      beroenden och tillfälliga begränsningar nedan.
- [x] Ta bort automatisk befolkningsutjämning och dess isolerade tester.
- [x] Ta bort automatisk ombemanning när en handelsrutt stängs.
- [x] Ta bort automatisk tilldelning av transporter till handelsrutter.
- [x] Ta bort möjligheten att starta äldre Civilian transport-order.
- [x] Ta bort gammal migrering som placerade sparade passagerare på planeter.
- [x] Ta bort transportpassagerares förluster och fortsatta färder efter strid.
- [x] Ta bort passagerarbaserade spärrar för förflyttning och skeppsbyte.
- [x] Ta bort särskild stopp- och statusvisning för gamla transportorder.
- [x] Ta bort modell och sparfält för de gamla persontransportorderna.
- [x] Låt nybyggda transportskepp sluta starta automatiska handelsorder
      och ta bort de inaktuella syftestexterna i produktionskön.
- [x] Ta bort `guard-routes`, dess automatiska eskortval och tillhörande tester.
- [x] Ta bort historiska engångsrensningar för terraforming och utökad galax
      samt deras tester; hantera det nya sparformatet i ett senare steg.
- [x] Ta bort planetbaserade fabriker, produktionsnätverk, handelsrutter och
      automatiska transporter med deras vyer och tester. Kravtexterna rensas
      i kravpunkten nedan.
  - [x] Ta bort skärmen `Factories` (fasad, controller, vy, navigering och
        tester) samt beslut som bara hänvisade dit (`factory-`, `supply-`,
        `route-idle-`). Byggnader kan därmed inte längre beställas; spelets
        ekonomi står still tills resten av modellen är borttagen.
  - [x] Ta bort handelsrutter, `Logistics`, ordern `join-route`,
        ruttval och ruttvisning på kartan samt ruttbeslut och deras tester.
        Lastrummen (`hold`) finns kvar tills vidare för bordningsbyte och
        pirater; deras lossning på planeter försvinner med planetekonomin.
  - [x] Ta bort produktionsnätverket, byggnader, lager, utvinning och
        planetproduktion i `Game`, kartans produktionsring och planetsidan.
        `Production` är tills vidare en sida som säger att produktion inte
        finns än.
- [x] Ta bort kolonisation, planetägande, befolkning, Domes och terraforming
      med deras vyer, tester och krav; behåll planeter som platser.
  - [x] Kolonier, befolkning, Domes, terraforming, kolonisationsordern och
        Colony ship-beställning är borta ur `Game` och vyerna. Planeter visar
        typ, habitability och resurser som platsfakta.
  - [x] `Colony`, `Planet.colony` och `owned` i kartcellerna är borta.
        Galaxen anger startplaneten uttryckligen (`homePlanetId`, sparas i
        `world`); ingen äger den.
- [x] Ta bort flera spelarflottor, flottadministration, automatiska order
      och planetköer med deras vyer, tester och krav; behåll skepps- och
      stridsfunktioner som behövs för den kommande flottan.
  - [x] Ta bort `Orders` och alla automatiska order (Explore, Explore
        stars, Explore planet, Patrol, Join fleet, väntande startorder och
        pausade order), förstärkningar, skeppsöverföring, nya och raderade
        flottor, flottkategorier och val av order för andra flottor under
        avbrott. Move och Stop är senare borttagna
        (`inga-move-stop-knappar`). Ett Exploration ship utforskar
        fortfarande planeter det står på.
  - [x] `Game` och vyerna hanterar en enda flotta (`enda-spelarflottan`,
        2026-11-23). Att ersätta `Fleets` med en skeppsöversikt
        (`fleet-som-skeppsoversikt`) väntar på beslut.
  - [x] Ta bort bärgning, vrak, orbitala varv, reparationer och
        uppgraderingsordern vid varv, som alla krävde spelarens planeter.
        `Salvage ship` finns kvar som skeppstyp.
  - [x] Ta bort skärmen `Decisions` med beslutslistan, tysta beslut,
        varningen vid rundslut, beslutsvägledning, uppmärksamhetsmarkeringar
        och kartproblem, samt Exploration-, Colonization-, Attack- och
        Salvage-köerna, köåtgärder i händelser och beställning av Colony ship.
- [x] Ta bort planet- och fabriksforskning samt planetbunden produktion och
      anpassa återstående forsknings- och produktionsytor till att invänta
      beslutade ersättningar.
  - [x] Research kräver inte längre en Research station. Trädet visas och
        kan köas, men forskningen går inte framåt (`advance(0)`) tills
        forskningskapaciteten är beslutad.
  - [x] Ta bort fabriks-, Dome-, terraformings-, handels-, order- och
        bärgningsteknikerna ur trädet och byggnaderna ur `Catalog`, med
        byggnadsbilderna och byggnadssymbolerna. Kvar är `Missiles`,
        `Armor`, `Armored Transport` och `Armored Fighter`. Bordning ger
        inte längre `Raptor factory` som återvunnen teknik; `Raptor` finns
        kvar som skeppstyp.
- [ ] Ta bort händelser, beslut, vägledning och navigation som bara stöder
      borttagna funktioner; granska kvarvarande användartexter. Beslut,
      vägledning och köer är borta. `styles.css` saknar regler för
      borttagna vyer, och döda meddelandetyper och hjälpfunktioner är
      borttagna. Webbläsartesterna för borttagna funktioner är borttagna
      eller omskrivna; se Fortsätt här för kvarvarande fel.
- [x] Rensa aktiva krav, produktdokumentation, domänmodell och tester så att
      endast aktuell eller uttryckligen planerad funktion återstår. Behåll
      stabila namn för krav som fortfarande gäller och ange deras status.
  - [x] Områdesfilerna, `requirements.md`, produktkraven, de tekniska kraven
        och domänmodellen beskriver bara det som finns kvar. Varje områdesfil
        listar borttagna kravnamn under `Borttaget med single-fleet-rensning`.
  - [x] Detaljfilerna om förenklad produktion, terraforming,
        fabriksuppgraderingar, civiltrafik, planetköer, kolonisationsorder,
        automatiska order, flottuppgradering, bärgning, Orders och det gamla
        rensningsförslaget är borttagna.
  - [x] Originalbilderna för byggnader, byggnadssymbolerna, varvets kartbild
        och deras prompter och referenser är borttagna (2026-11-23); de finns
        kvar i git-historiken.
- [x] Hantera godkänd inkompatibilitet för sparningar och verifiera ny start
      när det går utan att föregripa öppna speldesignbeslut.
  - [x] Sparformatet är version 18 utan kolonier, nätverk, bärgning och
        produktionsflottor. Version 17 och äldre avvisas: platsen visar
        `Saved game unavailable. Clear this slot to start again.` och kan
        rensas, varefter ett nytt spel startar med en flotta vid Tellus.
        Enhetstestet `sparformat / single-fleet-rensning` skyddar hela
        flödet.
- [x] Kör enhetssviten, relevanta riktade tester och verktygskontroller;
      granska rensningen och dokumentera återstående begränsningar.

## Arbetsläge och överlämning

Rensningsarbetet har integrerats i `single_fleet` utan driftsättning.
Fortsätt från senaste `origin/single_fleet`, inte från `development` eller
den gamla arbetsbranchen. Starta en ny arbetsbranch med
`npm run work:start -- <agent>/<ämne> --from single_fleet`, gör små
sammanhängande commits och pusha var och en. Läs denna fil och
[single-fleet-planen](single-fleet.md), kontrollera branchens status och de
återstående punkterna före fortsatt arbete. Uppdatera checklistan i samma
commit som varje färdigt delsteg.

Användaren har uttryckligen bett att driftsättning ska vänta. `work:merge`
publicerar normalt utforskningen; kör därför inte det förrän användaren
vill publicera. Integrera färdiga delsteg utan driftsättning när användaren
ber om det. Bevara lokala ändringar och bilagor från andra arbeten.

Den äldre områdesdokumentationen beskriver tills vidare till stor del den
ärvda mekaniken och ska rensas enligt checklistan. Tid, AP, resursernas
detaljer, startbesättning och övriga öppna designfrågor ska diskuteras och
låsas med användaren innan ny spelmekanik implementeras. Den uttryckligt
beställda rensningen behöver inga nya designbeslut för de delar som redan
är avgränsade ovan.

## Identifierade beroenden

`Game` binder ihop planetägande, flottorder, forskning, produktion och
rundsimulering. `Factories`, `Production`, `Orders`, `Fleets` och kartan
har egna fasader och vyer, men delar modell och navigering via app-skalet.
Rensa ett sammanhängande beteende åt gången och kontrollera kompilering och
tester innan nästa steg. Rymdstrid och bordning delar delar av skeppsmodellen
och ska bevaras.

Den befintliga `test:fast`-konfigurationen inkluderar för närvarande
`tests/boarding/extended/boarding-maps-http.test.ts` trots regeln att hålla
HTTP-integration separat. I sandlådan nekades dess serverbindning. Kör vid
behov Vitest med `--exclude tests/boarding/extended/boarding-maps-http.test.ts`
för den avsedda enhetssviten, och hantera HTTP-integrationen separat.

Kontroller efter befolkningsutjämningen: typkontroll, ESLint och 1 413
Vitest-tester utan HTTP-integrationen passerade. `test:tooling` klarade
arkitekturkarta, branchflöde och publicering men två tester misslyckades i
miljön: `check-runner` fick tom npm-versionsutdata och `mobile-config` fick
`EPERM` när Node skulle starta Playwright. HTTP-testets serverbindning gav
också `EPERM`. Miljön använder Node 24 medan projektet anger Node 26; följ
upp kontrollerna i en miljö med rätt version och tillåtna processer.
Den gamla sparversionen avvisas ännu inte uttryckligen; se checklistan.

## Fortsätt här

Rensningen är genomförd och mergad till `single_fleet` 2026-11-22 på
användarens begäran, men inte till `development` eller `main` och inte
driftsatt. Planetägande, kolonisation, befolkning, Domes, terraforming,
fabriker, planetproduktion, handel, transporter, varv, bärgning, Decisions,
planetköer, automatiska order, flera flottor att administrera och planet-
och fabriksforskning är borta. Kvar är planeter som platser, kartan,
rymdstrid, bordning, skepp, utrustning, Research med fyra skeppstekniker
(går inte framåt) och en tom Production.

Kontroller vid avslut (2026-11-22):

- Typkontroll, ESLint och Prettier passerar.
- Vitest utan HTTP-integrationen: 883 tester i 114 filer passerar.
- `test:tooling`: 26 av 27 passerar. `check-runner` (att en avbruten körning
  stoppar underprocesser) misslyckas i sandlådan även på startcommiten,
  alltså miljöberoende.
- Playwright, endast `desktop-chromium` med sandlådans Chromium: 77 passerar,
  7 hoppas över och 2 misslyckas. WebKit och telefonprofilerna har inte körts.

Kända begränsningar:

- `space-pirates.spec.ts` (båda kartlägena) misslyckas. Striden slumpas
  annorlunda efter rensningen: piraten börjar, Fightern förstörs och bara
  ett obeväpnat Exploration ship återstår. Testhjälparen
  `finishTacticalCombat` klarar inte det fallet, trots ett påbörjat stöd för
  att vänta medan spelet spelar en sida utan beväpnade skepp. Rymdstridens
  egna tester passerar. Enligt beslut med användaren lagas inte
  Star map-testerna nu, eftersom Star map ska byggas om
  ([visionen](vision-2026-11-22.md)); skriv om testet med nya Star map.
- När en runda bara har en händelse är Events-listan tom en kort stund mellan
  att händelsen arkiveras och att rundan avslutas. Testet väntar nu på att
  rundan avslutas i stället för att kontrollera mellanläget.
- Fleets är en karta utan panel tills flottan väljs
  (`fleet-som-skeppsoversikt`), i väntan på beslut.
- Uppgraderingar (Missiles, Armor) kan inte monteras eftersom Upgrade vid
  varv är borttagen (`utforskade-stridsuppgraderingar`, **Delvis
  implementerat**).
- Styrningen med hexval (`hexval-med-vag`, `resa-utan-synliga-pirater`) är
  införd 2026-11-22. På låga liggande skärmar, som 667 × 320, lämnar
  panelen med vägen och en utfälld Events-lista bara en smal kartremsa.
  Liggande layout ska göras om enligt visionen.

Lokalt i sandlådan krävde Playwright en tillfällig konfiguration med
`launchOptions.executablePath: '/opt/pw-browsers/chromium'` och
`npm run build:pages` före körning. Konfigurationen är inte committad.

Läge 2026-11-22 efter `ap-pa-starmap`: Star map styrs med hexval och AP utan
End turn, och strid utlöses när flottan och en pirat delar hex. Enhetssviten
passerar (900 tester). Playwright på `desktop-chromium`: 69 passerar, 7 hoppas
över och 8 Star map-tester faller (`event-playback` ×3, `event-controls`
Research-footer, `exploration-interruptions` checkpoint,
`fleet-map-management` och `space-pirates` ×2). De föll redan på
`single_fleet` före AP-ändringen eller bygger på den gamla
händelseuppspelningen, och skrivs om med nya Star map enligt beslut med
användaren. Rymdstrid, bordning, sparade spel och mobilens smoke-test
passerar.

Läge 2026-11-23: spelaren har exakt en flotta (`enda-spelarflottan`),
byggnadsbilderna är borttagna och Saved games och Star map har liggande
layout (`liggande-layout`). Två fel rättades med regressionstest först:

- En upptäckt vid ankomsten, till exempel i piratens hex, väntade på en ny
  destination som spelaren inte hade skäl att ge, så striden startade aldrig.
  Nu fortsätter rundan av sig själv när resan redan är slut.
- En förflyttning som lämnade AP kvar spelade upp föregående rundas händelser
  igen efter en omladdning. Nu annonseras händelser bara när rundan tar slut.

Webbläsartesterna är anpassade till hexval, AP och en enda flotta. Pirattesten
använder bara Fighters, eftersom en pirat bordar obeväpnade skepp och
bordningen är ett eget minispel som kartans testhjälpare inte spelar.
Kontroller: typkontroll, ESLint och Prettier passerar; Vitest utan
HTTP-integrationen 904 tester passerar; Playwright `desktop-chromium` och
`phone-chromium`: 157 passerar och 11 hoppas över. WebKit går inte att starta
i sandlådan.

Läge 2026-11-23, senare: ett nytt spel börjar med en ensam Raptor
(`startflotta-med-raptor`). Den ser en hex som Telescope I och utforskar
planeter vid ankomst. Upptäckter visas en gång som toppnotis utan
kamerarörelse (`upptackt-som-toppnotis`), och spelet visar inga
hex-koordinater (`inga-hexkoordinater`). Tester som gäller teleskop, fart 3
eller två skepp använder fixturen `withScoutFleet` med Exploration ship och
Fighter. Kartans stridshjälpare låter inte Raptor docka, eftersom den inte
spelar bordning. Vitest 915 och Playwright `desktop-chromium` och
`phone-chromium` 157 passerar.

## Nästa steg (beställt 2026-11-24, **Ej implementerat**)

Användaren har beställt följande. Skriv regressionstest först, gör små
commits med push och avsluta med `npm run work:merge` (mergar till
`single_fleet` och publicerar). Arbetsbranch: `claude/raptor-start`, eller
en ny via `npm run work:start -- claude/<ämne> --from single_fleet`.

- `flytande-forflyttning`: flytande övergång mellan hexsteg när flottan rör
  sig flera hexar, utan stopp mellan stegen eller rundorna. Startpunkt:
  `MasterController.#runTurn` animerar varje steg separat med
  `animateTurnStep` (480 ms) och easing `t*t*(3-2t)` i
  `TurnFacade.followTurnMovement` och `GalaxyMapView`/`FleetGlide`. Byt till
  linjär hastighet inom en resa (easing bara vid start och slut) och låt
  nästa runda fortsätta utan omstart av animationen.
- `rakare-vag`: vägen ska rätas ut så att skeppet inte sicksackar när inget
  hinder undviks. Startpunkt: `HexNavigation`/`Game.routePreview` och
  ruttvalet i `FleetPursuit`. Välj bland lika korta vägar den som ligger
  närmast den raka linjen mellan start och mål (jämför hexmitternas avstånd
  till linjen). Testet `rakare-hexforflyttning` i
  `tests/space-map/unit/fleet-path.test.ts` kräver i dag växlande riktning;
  det ska ersättas.
- `pirat-minne-efter-sikt`: en pirat som går ur sikte ritas mörkare kvar på
  sin senast kända plats tills den rör sig. Då försvinner den och hexen får
  ett frågetecken som ligger kvar tills piraten upptäcks igen. Startpunkt:
  `Game.pirateSnapshots` (bara synliga) och `chartedPirates`. Spara senast
  kända position och om piraten har rört sig sedan dess som valfria fält i
  sparformatet (additivt, version 18). Rita i `MapOverlayView`/`FleetMapView`.
- `animerade-piratsteg`: pirater glider mellan hexar i stället för att hoppa.
  Startpunkt: `TurnMovementPlayback.record` hoppar över steg där en ände inte
  syns (`osynliga-flottor-utan-animation`); synliga piratsteg ska spelas med
  samma glidning som spelarens flotta i `GalaxyMapView.animateTurnStep`.
