# Utökad testning av revision 03bf183

Testningen är avslutad. Felen är inte analyserade; ett misslyckat test kan bero på ändrat beteende eller en inaktuell testförväntan. Samma test i olika profiler redovisas separat.

## Snabbsvit

819 tester godkända på 18,00 sekunder.

## Utökade enhets- och integrationstester

199 godkända och 10 misslyckade i sex filer.

- `events-order.test.ts`: **Åtgärdat**. Testet antog att raden saknade barnnoder, men kravet `bilder-i-events` införde en innehållsbehållare. Testet kontrollerar fortsatt ordagrann text, att texten inte blir ett HTML-element och händelseordningen. Ingen förlorad funktion påvisades.
- `fleet-focused-map.test.ts`: **Åtgärdat**. Den tidigare direktknappen ersattes av `Orders` enligt `egen-ordervy`; testet väljer nu den aktuella flottan och rutten där, och kontrollerar fortsatt frigöring och flottflytt. Ingen förlorad funktion påvisades.
- `planet-overview.test.ts`: **Åtgärdat** för fem fall. Testerna förväntade ett destinationsfält som ersatts av `Orders` enligt `startorder-for-nybyggda-skepp`. De verifierar nu öppning av ordervyn, beställning och spärrade kontroller. Ingen förlorad funktion påvisades i dessa fall.
- `planet-pages.test.ts`: **Åtgärdat**. Testdata lade till en fabrik men behöll en gammal komponentlista. Modellen räknar fram listan från fabrikerna, även vid planerad rivning; testdata speglar nu detta och verifierar att beställningen spärras. Ingen förlorad funktion påvisades.
- `research-tree-view.test.ts`: **Åtgärdat**. Testets fasta antal pilar motsvarade ett äldre forskningsberoende. `transport-ship-efter-rocket-engine` ersatte Exploration ship factory som förkunskap; testet kontrollerar nu uttryckligen det nya och borttagna beroendet. Ingen förlorad funktion påvisades.
- `star-map-trade-view.test.ts`: **Åtgärdat**. Den gamla rutttilldelningsknappen ersattes av `Orders`, men testet visade även att möjligheten att välja en tilldelad rutt från flottinformationen saknades. Den är återställd enligt `handelsrutt-val-pa-stjarnkartan`.

Fullständig logg: `dist/checks/extended-1793645193206/integration.log`.

## Gruppering utan profildubbletter

De 138 webbläsarfelen motsvarar 44 olika testfall när samma test i olika profiler räknas en gång. De fyra skärmstorlekarna i `turn-console.spec.ts:27` prövar samma scenario, vilket ger **41 testscenarier**. De tio felen i den utökade enhets- och integrationsdelen kan preliminärt grupperas i **sju felscenarier**: händelserad, flottilldelning, destinationsval för tre fabrikstyper, spärrade fabriker, spärrad produktbeställning, forskningsförbindelser och rutttilldelning.

Det ger **48 observerade felscenarier** före granskning av gemensamma orsaker. Det är inte ett konstaterat antal buggar: samma bakomliggande fel kan slå ut flera scenarier, och inaktuella testförväntningar kan också ge fel. I sju webbläsarscenarier skiljer sig felmeddelandena mellan profilerna; de kan dölja mer än en orsak. Tre separata datorfall som försöker använda touch rapporterar att touch saknas och kan exempelvis ha samma testkonfigurationsproblem. Flott- och ruttfallen i båda sviterna kan också överlappa, men det är inte bevisat.

### Webbläsarscenarier

Antalet nedan är misslyckade körningar för scenariot, inte ett antal bekräftade fel.

- `tests/browser/building-images.spec.ts:6:1 › gemensamma-byggnadsbilder: supplied images load in Research, selection and building sites` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/colonization.spec.ts:8:1 › koloniseringsorder: Colonize chooses a planet, survives reload and settles automatically after travel` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/exploration-interruptions.spec.ts:142:1 › gemensamt-handelseflode / upptacktsavbrott / order-under-upptacktsavbrott / spara-avbrutet-ar / stridsresultat-utan-upprepning: Handle edits another fleet, reload restores the pause and Continue resolves contact once` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/exploration-interruptions.spec.ts:244:1 › automatisk-stjarnutforskning / flottorder-som-symboler: explores persistently from the compact card and saves the order` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit; olika felmeddelanden mellan körningar.
- `tests/browser/fleet-focused-map.spec.ts:12:1 › flottfokuserad-kartvy: background is inert, route crossings set destinations, and remote transfers survive reload` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/fleet-interaction.spec.ts:17:1 › flottval-pa-kartan / dra-flottdestination: selects a fleet, previews a snapped arrow and commits on release` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/fleet-interaction.spec.ts:70:1 › kartflottor / flottval-pa-kartan: colocated fleets occupy separate positions within the hex` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit; olika felmeddelanden mellan körningar.
- `tests/browser/fleet-map-management.spec.ts:9:1 › flottadministration / flottnamn-direktredigering / flottknappar-pa-kartan: organize fleets on the map and restore them` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/fleet-patrol.spec.ts:75:1 › flottpatrullering: uses shared sight to catch a pirate, resumes its ring, and persists combat` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit; olika felmeddelanden mellan körningar.
- `tests/browser/game.spec.ts:163:1 › kartnavigation: keyboard pans and zooms, canvas hit-testing selects the home planet` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/game.spec.ts:211:1 › kartnavigation: native touch selects the planet` — 3 körningar; phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/game.spec.ts:225:1 › kartnavigation: native touch drag and pinch preserve the selected planet` — 1 körningar; phone-chromium.
- `tests/browser/game.spec.ts:323:1 › planetbyggplatser / fabrikskoer / forska-fram-fabriker / kolonisation: research, build ships and settle a new colony` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/logistics.spec.ts:49:1 › utvinningsbyggnader / forskningsko / automatisk-resursforsorjning / fysisk-frakt / forstarka-ruttflotta / flottans-handelsrutt: a new game supplies its colony through an assigned fleet` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/planet-pages.spec.ts:167:1 › byggkategorier / symbolbaserade-kataloger: icon categories and compact lists reveal complete details with keyboard focus` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/production-map.spec.ts:7:1 › route-kartvy / produktions-kartvy / radiella-byggval / kompakt-produktionsko: shared map, radial orders and queue work with touch, keyboard and larger text` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/research-tree.spec.ts:118:1 › forsknings-tradnavigation: dependency arrows, navigation and research preserve the camera` — 3 körningar; desktop-chromium, phone-chromium, tablet-webkit; olika felmeddelanden mellan körningar.
- `tests/browser/route-escorts.spec.ts:28:1 › unika-flottnamn / rutt-eskortfordelning / ruttflottor-pa-kartan: assign fighters and select their carrier at the route midpoint` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/salvage.spec.ts:175:1 › bargningsorder / automatisk-vrakreparation / forskning-fran-bargade-delar: salvage, tow, reload, dock and research recovered parts` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit; olika felmeddelanden mellan körningar.
- `tests/browser/salvage.spec.ts:306:1 › stridsrapport-i-dialog / spara-bargning-och-stridsavbrott: combat history survives reload without a report dialog` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit; olika felmeddelanden mellan körningar.
- `tests/browser/space-pirates.spec.ts:92:1 › piratflotta-med-lastfartyg: the pirate panel lists a transport and its cargo hold` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/star-map-trade.spec.ts:60:1 › ruttflotta-till-narmaste-andplanet: remote assignment saves an approach without teleporting` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/star-map-trade.spec.ts:112:3 › handelsrutt-skapande-pa-stjarnkartan / flottilldelning-pa-stjarnkartan: planet and fleet drags create and administer a route in Star map without moving fleets` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/star-map-trade.spec.ts:112:3 › route-kartvy / flottilldelning-pa-stjarnkartan: planet and fleet drags create and administer a route in Route without moving fleets` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/star-map-trade.spec.ts:240:1 › handelsrutt-val-pa-stjarnkartan: keyboard alternatives retain orders after visiting Route and reloading` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/star-map-trade.spec.ts:269:1 › handelsrutt-val-pa-stjarnkartan / flottilldelning-pa-stjarnkartan: clicking a line selects it and an invalid drop cannot set a destination` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/supply-production.spec.ts:6:1 › forsorjningsproblem-pa-kartan / forsorjningsstatus / leveransfloden: resolves a problem to Waiting and shows only ordered supply on the production map` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at several screen sizes` — 16 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/viewport.spec.ts:74:3 › viewport-game-layout / english-game: all screens remain usable at several screen sizes` — 4 körningar; desktop-chromium, phone-chromium, phone-webkit, tablet-webkit.
- `tests/browser/compact-views.spec.ts:141:1 › forskningsdetaljer-vid-val: dragging from a research tile pans without inspecting or queueing` — 1 körningar; desktop-chromium.
- `tests/browser/detection.spec.ts:81:1 › teleskopfabriker / teleskop-i-exploration-ships: manufacture the best telescope and preserve individual levels after reload` — 1 körningar; desktop-chromium.
- `tests/browser/mobile-map-interactions.spec.ts:22:3 › dubbelklick-koar-forskning: double tap queues once after inspecting the tile` — 1 körningar; desktop-chromium.
- `tests/browser/mobile-map-interactions.spec.ts:48:1 › centrerat-kartfokus / kartpanel-till-events: Show centers Vesta above the production panel` — 2 körningar; desktop-chromium, tablet-webkit.
- `tests/browser/mobile-map-interactions.spec.ts:73:1 › handelsrutt-skapande-pa-stjarnkartan: native touch drags an exposed selected planet into a route` — 1 körningar; desktop-chromium.
- `tests/browser/research-tree.spec.ts:203:1 › forsknings-tradnavigation: mouse drag pans and wheel zooms without queueing` — 1 körningar; desktop-chromium.
- `tests/browser/star-map-trade.spec.ts:168:1 › handelsrutt-skapande-pa-stjarnkartan: missing research is visible before Create route and remains visible after a drag` — 1 körningar; desktop-chromium.
- `tests/browser/star-map-trade.spec.ts:216:1 › handelsrutt-skapande-pa-stjarnkartan: Create route and a target tap save a route after Trade logistics is completed` — 1 körningar; desktop-chromium.
- `tests/browser/detection.spec.ts:34:1 › aktuell-detektionssikt / kartans-sikttillstand: losing sight removes pirate inspection while retaining explored hexes` — 1 körningar; phone-webkit.
- `tests/browser/event-playback.spec.ts:150:1 › handelseannonsering / handelser-pa-kartan: announcements stay below the event and fly into the list across orientation changes` — 2 körningar; phone-webkit, tablet-webkit.
- `tests/browser/event-playback.spec.ts:384:3 › handelseanpassad-kartkamera / stillastaende-kamera-vid-forflyttning: zooms out from the player's view then holds the full route (393x851)` — 1 körningar; phone-webkit.
- `tests/browser/turn-console.spec.ts:116:1 › handelser: Events adapts to available screen space without a selection` — 2 körningar; phone-webkit, tablet-webkit; olika felmeddelanden mellan körningar.

### Åtgärdade webbläsarscenarier

- `kartnavigation` (touchdragning och nypzoom): **Åtgärdat i mobil Chromium**. Den gamla nypgesten började över informationspanelen i stället för kartan. Testet verifierar nu att båda fingrarna träffar kartan och att zoom samt planetval fungerar. Ingen förlorad funktion påvisades.

- `kartnavigation` (planetval med touch): **Åtgärdat i mobil Chromium**. Testet tryckte på kartans mitt i stället för den faktiska hemplanetens position. Det använder nu sparad position och riktig touchinmatning; val av planet är verifierat.

- `kartnavigation` (tangentbord, zoom och val av hemplanet): **Åtgärdat i mobil Chromium**. Testhjälpen använde koordinater från den gamla lilla exempelkartan även för nya spel i den utökade galaxen. Den läser nu koordinater från det faktiska sparade spelet. Testet verifierar fortsatt panorering, zoom och kartval. Flera andra karttester använder samma hjälp; de är inte därmed automatiskt bekräftade som åtgärdade.

- `kartflottor` / `flottval-pa-kartan` (flera flottor i samma hex): **Åtgärdat i mobil Chromium**. Testet använde föråldrade koordinater vid kartans mitt. Det beräknar nu båda markörernas lägen och kontrollerar att de är separata, synliga för pekaren och valbara. Ingen förlorad funktion påvisades.

- `flottval-pa-kartan` / `dra-flottdestination` (markörval och dragning): **Åtgärdat i mobil Chromium**. Testet antog en fast position vid kartans mitt; det använder nu den faktiska flottmarkören och kameran. Pekare, dragning och avbrott verifieras fortsatt. Ingen förlorad funktion påvisades i detta fall. Det separata fallet för flera flottor dokumenteras ovan.

- `automatisk-stjarnutforskning` / `flottorder-som-symboler`: **Passerade isolerat i mobil Chromium**, utan kodändring, på 25,2 sekunder. Den tidigare körningen passerade testets tidsgräns på 30 sekunder. Tidsvariation eller belastning är möjliga orsaker men inte verifierade; övriga profiler har inte körts om.

- `gemensamt-handelseflode` / `upptacktsavbrott` / `spara-avbrutet-ar`: **Åtgärdat i mobil Chromium**. Testet förväntade den äldre separata vrakdialogen och att vrakupptäckten var första händelsen. Det använder nu det gemensamma händelseflödet, hanterar tidigare upptäckter och verifierar fortsatt avbrott, omladdning, order och stridsresultat utan upprepning. Ingen förlorad funktion påvisades.

- `koloniseringsorder`: **Åtgärdat i mobil Chromium**. Testet använde den tidigare direktknappen och planetlistan; enligt `egen-ordervy` väljs Colonize nu i Orders och planeten på kartan. Testet verifierar avbrott, sparning, omladdning och kolonisering. Ingen förlorad funktion påvisades.

- `end-turn-vid-kartval` / `rundkontroller-i-decisions`: **Åtgärdat i mobil Chromium**. Testet antog att en vald ruta var känd och tom; de aktuella kraven visar `Unexplored` för okända rutor. Testdata gör nu rutan uttryckligen känd och fri från terräng innan testet kontrollerar att panelen döljs och att rundknappen är åtkomlig. Ingen förlorad funktion påvisades i detta fall.

- `gemensamma-byggnadsbilder`: **Åtgärdat i mobil Chromium**. Ett fast antal bilder stämde inte längre när Research-vyn fick ytterligare innehåll. Testet kontrollerar nu de fyra bilder som kravet namnger, deras unika resurser och återanvändning. Ingen förlorad funktion påvisades.

## Webbläsartester

453 godkända, 138 misslyckade och 37 överhoppade på cirka 1,4 timmar. Samma test i olika profiler räknas separat. Fellistan återger testets namn och första felmeddelande; orsakerna är ännu inte utredda.

- [phone-chromium] › tests/browser/building-images.spec.ts:6:1 › gemensamma-byggnadsbilder: supplied images load in Research, selection and building sites
  - Fel: `Error: expect(locator).toHaveCount(expected) failed`
- [phone-chromium] › tests/browser/colonization.spec.ts:8:1 › koloniseringsorder: Colonize chooses a planet, survives reload and settles automatically after travel
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-chromium] › tests/browser/exploration-interruptions.spec.ts:142:1 › gemensamt-handelseflode / upptacktsavbrott / order-under-upptacktsavbrott / spara-avbrutet-ar / stridsresultat-utan-upprepning: Handle edits another fleet, reload restores the pause and Continue resolves contact once
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [phone-chromium] › tests/browser/exploration-interruptions.spec.ts:244:1 › automatisk-stjarnutforskning / flottorder-som-symboler: explores persistently from the compact card and saves the order
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-chromium] › tests/browser/fleet-focused-map.spec.ts:12:1 › flottfokuserad-kartvy: background is inert, route crossings set destinations, and remote transfers survive reload
  - Fel: `Error: expect(locator).toHaveAttribute(expected) failed`
- [phone-chromium] › tests/browser/fleet-interaction.spec.ts:17:1 › flottval-pa-kartan / dra-flottdestination: selects a fleet, previews a snapped arrow and commits on release
  - Fel: `Error: expect(locator).toHaveCSS(expected) failed`
- [phone-chromium] › tests/browser/fleet-interaction.spec.ts:70:1 › kartflottor / flottval-pa-kartan: colocated fleets occupy separate positions within the hex
  - Fel: `Error: expect(received).toBe(expected) // Object.is equality`
- [phone-chromium] › tests/browser/fleet-map-management.spec.ts:9:1 › flottadministration / flottnamn-direktredigering / flottknappar-pa-kartan: organize fleets on the map and restore them
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [phone-chromium] › tests/browser/fleet-patrol.spec.ts:75:1 › flottpatrullering: uses shared sight to catch a pirate, resumes its ring, and persists combat
  - Fel: `Error: expect(received).not.toBe(expected) // Object.is equality`
- [phone-chromium] › tests/browser/game.spec.ts:163:1 › kartnavigation: keyboard pans and zooms, canvas hit-testing selects the home planet
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [phone-chromium] › tests/browser/game.spec.ts:211:1 › kartnavigation: native touch selects the planet
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [phone-chromium] › tests/browser/game.spec.ts:225:1 › kartnavigation: native touch drag and pinch preserve the selected planet
  - Fel: `Error: expect(locator).not.toHaveText(expected) failed`
- [phone-chromium] › tests/browser/game.spec.ts:323:1 › planetbyggplatser / fabrikskoer / forska-fram-fabriker / kolonisation: research, build ships and settle a new colony
  - Fel: `Error: expect(locator).toHaveCount(expected) failed`
- [phone-chromium] › tests/browser/logistics.spec.ts:49:1 › utvinningsbyggnader / forskningsko / automatisk-resursforsorjning / fysisk-frakt / forstarka-ruttflotta / flottans-handelsrutt: a new game supplies its colony through an assigned fleet
  - Fel: `Test timeout of 180000ms exceeded.`
- [phone-chromium] › tests/browser/planet-pages.spec.ts:167:1 › byggkategorier / symbolbaserade-kataloger: icon categories and compact lists reveal complete details with keyboard focus
  - Fel: `Error: expect(locator).toHaveCount(expected) failed`
- [phone-chromium] › tests/browser/production-map.spec.ts:7:1 › route-kartvy / produktions-kartvy / radiella-byggval / kompakt-produktionsko: shared map, radial orders and queue work with touch, keyboard and larger text
  - Fel: `Test timeout of 60000ms exceeded.`
- [phone-chromium] › tests/browser/research-tree.spec.ts:118:1 › forsknings-tradnavigation: dependency arrows, navigation and research preserve the camera
  - Fel: `Error: expect(locator).toHaveAttribute(expected) failed`
- [phone-chromium] › tests/browser/route-escorts.spec.ts:28:1 › unika-flottnamn / rutt-eskortfordelning / ruttflottor-pa-kartan: assign fighters and select their carrier at the route midpoint
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-chromium] › tests/browser/salvage.spec.ts:175:1 › bargningsorder / automatisk-vrakreparation / forskning-fran-bargade-delar: salvage, tow, reload, dock and research recovered parts
  - Fel: `Error: expect(received).not.toBe(expected) // Object.is equality`
- [phone-chromium] › tests/browser/salvage.spec.ts:306:1 › stridsrapport-i-dialog / spara-bargning-och-stridsavbrott: combat history survives reload without a report dialog
  - Fel: `Error: expect(received).not.toBe(expected) // Object.is equality`
- [phone-chromium] › tests/browser/space-pirates.spec.ts:92:1 › piratflotta-med-lastfartyg: the pirate panel lists a transport and its cargo hold
  - Fel: `Se körlogg och testets sparade felunderlag.`
- [phone-chromium] › tests/browser/star-map-trade.spec.ts:60:1 › ruttflotta-till-narmaste-andplanet: remote assignment saves an approach without teleporting
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-chromium] › tests/browser/star-map-trade.spec.ts:112:3 › handelsrutt-skapande-pa-stjarnkartan / flottilldelning-pa-stjarnkartan: planet and fleet drags create and administer a route in Star map without moving fleets
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-chromium] › tests/browser/star-map-trade.spec.ts:112:3 › route-kartvy / flottilldelning-pa-stjarnkartan: planet and fleet drags create and administer a route in Route without moving fleets
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-chromium] › tests/browser/star-map-trade.spec.ts:240:1 › handelsrutt-val-pa-stjarnkartan: keyboard alternatives retain orders after visiting Route and reloading
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-chromium] › tests/browser/star-map-trade.spec.ts:269:1 › handelsrutt-val-pa-stjarnkartan / flottilldelning-pa-stjarnkartan: clicking a line selects it and an invalid drop cannot set a destination
  - Fel: `Error: expect(locator).toContainText(expected) failed`
- [phone-chromium] › tests/browser/supply-production.spec.ts:6:1 › forsorjningsproblem-pa-kartan / forsorjningsstatus / leveransfloden: resolves a problem to Waiting and shows only ordered supply on the production map
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-chromium] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 320x568
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [phone-chromium] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 393x851
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [phone-chromium] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 844x390
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [phone-chromium] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 667x320
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [phone-chromium] › tests/browser/viewport.spec.ts:74:3 › viewport-game-layout / english-game: all screens remain usable at 667x320
  - Fel: `Test timeout of 30000ms exceeded.`
- [desktop-chromium] › tests/browser/building-images.spec.ts:6:1 › gemensamma-byggnadsbilder: supplied images load in Research, selection and building sites
  - Fel: `Error: expect(locator).toHaveCount(expected) failed`
- [desktop-chromium] › tests/browser/colonization.spec.ts:8:1 › koloniseringsorder: Colonize chooses a planet, survives reload and settles automatically after travel
  - Fel: `Test timeout of 30000ms exceeded.`
- [desktop-chromium] › tests/browser/compact-views.spec.ts:141:1 › forskningsdetaljer-vid-val: dragging from a research tile pans without inspecting or queueing
  - Fel: `Error: expect(locator).not.toHaveAttribute(expected) failed`
- [desktop-chromium] › tests/browser/detection.spec.ts:81:1 › teleskopfabriker / teleskop-i-exploration-ships: manufacture the best telescope and preserve individual levels after reload
  - Fel: `Test timeout of 30000ms exceeded.`
- [desktop-chromium] › tests/browser/exploration-interruptions.spec.ts:142:1 › gemensamt-handelseflode / upptacktsavbrott / order-under-upptacktsavbrott / spara-avbrutet-ar / stridsresultat-utan-upprepning: Handle edits another fleet, reload restores the pause and Continue resolves contact once
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [desktop-chromium] › tests/browser/exploration-interruptions.spec.ts:244:1 › automatisk-stjarnutforskning / flottorder-som-symboler: explores persistently from the compact card and saves the order
  - Fel: `Test timeout of 30000ms exceeded.`
- [desktop-chromium] › tests/browser/fleet-focused-map.spec.ts:12:1 › flottfokuserad-kartvy: background is inert, route crossings set destinations, and remote transfers survive reload
  - Fel: `Error: expect(locator).toHaveAttribute(expected) failed`
- [desktop-chromium] › tests/browser/fleet-interaction.spec.ts:17:1 › flottval-pa-kartan / dra-flottdestination: selects a fleet, previews a snapped arrow and commits on release
  - Fel: `Error: expect(locator).toHaveCSS(expected) failed`
- [desktop-chromium] › tests/browser/fleet-interaction.spec.ts:70:1 › kartflottor / flottval-pa-kartan: colocated fleets occupy separate positions within the hex
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [desktop-chromium] › tests/browser/fleet-map-management.spec.ts:9:1 › flottadministration / flottnamn-direktredigering / flottknappar-pa-kartan: organize fleets on the map and restore them
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [desktop-chromium] › tests/browser/fleet-patrol.spec.ts:75:1 › flottpatrullering: uses shared sight to catch a pirate, resumes its ring, and persists combat
  - Fel: `Error: expect(received).not.toBe(expected) // Object.is equality`
- [desktop-chromium] › tests/browser/game.spec.ts:163:1 › kartnavigation: keyboard pans and zooms, canvas hit-testing selects the home planet
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [desktop-chromium] › tests/browser/game.spec.ts:323:1 › planetbyggplatser / fabrikskoer / forska-fram-fabriker / kolonisation: research, build ships and settle a new colony
  - Fel: `Error: expect(locator).toHaveCount(expected) failed`
- [desktop-chromium] › tests/browser/logistics.spec.ts:49:1 › utvinningsbyggnader / forskningsko / automatisk-resursforsorjning / fysisk-frakt / forstarka-ruttflotta / flottans-handelsrutt: a new game supplies its colony through an assigned fleet
  - Fel: `Test timeout of 180000ms exceeded.`
- [desktop-chromium] › tests/browser/mobile-map-interactions.spec.ts:22:3 › dubbelklick-koar-forskning: double tap queues once after inspecting the tile
  - Fel: `Error: touchscreen.tap: hasTouch must be enabled on the browser context before using the touchscreen.`
- [desktop-chromium] › tests/browser/mobile-map-interactions.spec.ts:48:1 › centrerat-kartfokus / kartpanel-till-events: Show centers Vesta above the production panel
  - Fel: `Error: expect(received).toBeLessThan(expected)`
- [desktop-chromium] › tests/browser/mobile-map-interactions.spec.ts:73:1 › handelsrutt-skapande-pa-stjarnkartan: native touch drags an exposed selected planet into a route
  - Fel: `Error: expect(received).toBe(expected) // Object.is equality`
- [desktop-chromium] › tests/browser/planet-pages.spec.ts:167:1 › byggkategorier / symbolbaserade-kataloger: icon categories and compact lists reveal complete details with keyboard focus
  - Fel: `Error: expect(locator).toHaveCount(expected) failed`
- [desktop-chromium] › tests/browser/production-map.spec.ts:7:1 › route-kartvy / produktions-kartvy / radiella-byggval / kompakt-produktionsko: shared map, radial orders and queue work with touch, keyboard and larger text
  - Fel: `Test timeout of 60000ms exceeded.`
- [desktop-chromium] › tests/browser/research-tree.spec.ts:118:1 › forsknings-tradnavigation: dependency arrows, navigation and research preserve the camera
  - Fel: `Error: expect(locator).not.toHaveAttribute(expected) failed`
- [desktop-chromium] › tests/browser/research-tree.spec.ts:203:1 › forsknings-tradnavigation: mouse drag pans and wheel zooms without queueing
  - Fel: `Error: expect(locator).not.toHaveAttribute(expected) failed`
- [desktop-chromium] › tests/browser/route-escorts.spec.ts:28:1 › unika-flottnamn / rutt-eskortfordelning / ruttflottor-pa-kartan: assign fighters and select their carrier at the route midpoint
  - Fel: `Test timeout of 30000ms exceeded.`
- [desktop-chromium] › tests/browser/salvage.spec.ts:175:1 › bargningsorder / automatisk-vrakreparation / forskning-fran-bargade-delar: salvage, tow, reload, dock and research recovered parts
  - Fel: `Error: expect(received).not.toBe(expected) // Object.is equality`
- [desktop-chromium] › tests/browser/salvage.spec.ts:306:1 › stridsrapport-i-dialog / spara-bargning-och-stridsavbrott: combat history survives reload without a report dialog
  - Fel: `Error: expect(received).not.toBe(expected) // Object.is equality`
- [desktop-chromium] › tests/browser/space-pirates.spec.ts:92:1 › piratflotta-med-lastfartyg: the pirate panel lists a transport and its cargo hold
  - Fel: `Se körlogg och testets sparade felunderlag.`
- [desktop-chromium] › tests/browser/star-map-trade.spec.ts:60:1 › ruttflotta-till-narmaste-andplanet: remote assignment saves an approach without teleporting
  - Fel: `Test timeout of 30000ms exceeded.`
- [desktop-chromium] › tests/browser/star-map-trade.spec.ts:112:3 › handelsrutt-skapande-pa-stjarnkartan / flottilldelning-pa-stjarnkartan: planet and fleet drags create and administer a route in Star map without moving fleets
  - Fel: `Test timeout of 30000ms exceeded.`
- [desktop-chromium] › tests/browser/star-map-trade.spec.ts:112:3 › route-kartvy / flottilldelning-pa-stjarnkartan: planet and fleet drags create and administer a route in Route without moving fleets
  - Fel: `Test timeout of 30000ms exceeded.`
- [desktop-chromium] › tests/browser/star-map-trade.spec.ts:168:1 › handelsrutt-skapande-pa-stjarnkartan: missing research is visible before Create route and remains visible after a drag
  - Fel: `Error: locator.tap: The page does not support tap. Use hasTouch context option to enable touch support.`
- [desktop-chromium] › tests/browser/star-map-trade.spec.ts:216:1 › handelsrutt-skapande-pa-stjarnkartan: Create route and a target tap save a route after Trade logistics is completed
  - Fel: `Error: locator.tap: The page does not support tap. Use hasTouch context option to enable touch support.`
- [desktop-chromium] › tests/browser/star-map-trade.spec.ts:240:1 › handelsrutt-val-pa-stjarnkartan: keyboard alternatives retain orders after visiting Route and reloading
  - Fel: `Test timeout of 30000ms exceeded.`
- [desktop-chromium] › tests/browser/star-map-trade.spec.ts:269:1 › handelsrutt-val-pa-stjarnkartan / flottilldelning-pa-stjarnkartan: clicking a line selects it and an invalid drop cannot set a destination
  - Fel: `Error: expect(locator).toContainText(expected) failed`
- [desktop-chromium] › tests/browser/supply-production.spec.ts:6:1 › forsorjningsproblem-pa-kartan / forsorjningsstatus / leveransfloden: resolves a problem to Waiting and shows only ordered supply on the production map
  - Fel: `Test timeout of 30000ms exceeded.`
- [desktop-chromium] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 320x568
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [desktop-chromium] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 393x851
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [desktop-chromium] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 844x390
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [desktop-chromium] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 667x320
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [desktop-chromium] › tests/browser/viewport.spec.ts:74:3 › viewport-game-layout / english-game: all screens remain usable at 667x320
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-webkit] › tests/browser/building-images.spec.ts:6:1 › gemensamma-byggnadsbilder: supplied images load in Research, selection and building sites
  - Fel: `Error: expect(locator).toHaveCount(expected) failed`
- [phone-webkit] › tests/browser/colonization.spec.ts:8:1 › koloniseringsorder: Colonize chooses a planet, survives reload and settles automatically after travel
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-webkit] › tests/browser/detection.spec.ts:34:1 › aktuell-detektionssikt / kartans-sikttillstand: losing sight removes pirate inspection while retaining explored hexes
  - Fel: `Error: expect(received).not.toBe(expected) // Object.is equality`
- [phone-webkit] › tests/browser/event-playback.spec.ts:150:1 › handelseannonsering / handelser-pa-kartan: announcements stay below the event and fly into the list across orientation changes
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-webkit] › tests/browser/event-playback.spec.ts:384:3 › handelseanpassad-kartkamera / stillastaende-kamera-vid-forflyttning: zooms out from the player's view then holds the full route (393x851)
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-webkit] › tests/browser/exploration-interruptions.spec.ts:142:1 › gemensamt-handelseflode / upptacktsavbrott / order-under-upptacktsavbrott / spara-avbrutet-ar / stridsresultat-utan-upprepning: Handle edits another fleet, reload restores the pause and Continue resolves contact once
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [phone-webkit] › tests/browser/exploration-interruptions.spec.ts:244:1 › automatisk-stjarnutforskning / flottorder-som-symboler: explores persistently from the compact card and saves the order
  - Fel: `Error: expect(received).not.toBe(expected) // Object.is equality`
- [phone-webkit] › tests/browser/fleet-focused-map.spec.ts:12:1 › flottfokuserad-kartvy: background is inert, route crossings set destinations, and remote transfers survive reload
  - Fel: `Error: expect(locator).toHaveAttribute(expected) failed`
- [phone-webkit] › tests/browser/fleet-interaction.spec.ts:17:1 › flottval-pa-kartan / dra-flottdestination: selects a fleet, previews a snapped arrow and commits on release
  - Fel: `Error: expect(locator).toHaveCSS(expected) failed`
- [phone-webkit] › tests/browser/fleet-interaction.spec.ts:70:1 › kartflottor / flottval-pa-kartan: colocated fleets occupy separate positions within the hex
  - Fel: `Error: expect(received).toBe(expected) // Object.is equality`
- [phone-webkit] › tests/browser/fleet-map-management.spec.ts:9:1 › flottadministration / flottnamn-direktredigering / flottknappar-pa-kartan: organize fleets on the map and restore them
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [phone-webkit] › tests/browser/fleet-patrol.spec.ts:75:1 › flottpatrullering: uses shared sight to catch a pirate, resumes its ring, and persists combat
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-webkit] › tests/browser/game.spec.ts:163:1 › kartnavigation: keyboard pans and zooms, canvas hit-testing selects the home planet
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [phone-webkit] › tests/browser/game.spec.ts:211:1 › kartnavigation: native touch selects the planet
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [phone-webkit] › tests/browser/game.spec.ts:323:1 › planetbyggplatser / fabrikskoer / forska-fram-fabriker / kolonisation: research, build ships and settle a new colony
  - Fel: `Error: expect(locator).toHaveCount(expected) failed`
- [phone-webkit] › tests/browser/logistics.spec.ts:49:1 › utvinningsbyggnader / forskningsko / automatisk-resursforsorjning / fysisk-frakt / forstarka-ruttflotta / flottans-handelsrutt: a new game supplies its colony through an assigned fleet
  - Fel: `Test timeout of 180000ms exceeded.`
- [phone-webkit] › tests/browser/planet-pages.spec.ts:167:1 › byggkategorier / symbolbaserade-kataloger: icon categories and compact lists reveal complete details with keyboard focus
  - Fel: `Error: expect(locator).toHaveCount(expected) failed`
- [phone-webkit] › tests/browser/production-map.spec.ts:7:1 › route-kartvy / produktions-kartvy / radiella-byggval / kompakt-produktionsko: shared map, radial orders and queue work with touch, keyboard and larger text
  - Fel: `Test timeout of 60000ms exceeded.`
- [phone-webkit] › tests/browser/route-escorts.spec.ts:28:1 › unika-flottnamn / rutt-eskortfordelning / ruttflottor-pa-kartan: assign fighters and select their carrier at the route midpoint
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-webkit] › tests/browser/salvage.spec.ts:175:1 › bargningsorder / automatisk-vrakreparation / forskning-fran-bargade-delar: salvage, tow, reload, dock and research recovered parts
  - Fel: `Error: expect(received).not.toBe(expected) // Object.is equality`
- [phone-webkit] › tests/browser/salvage.spec.ts:306:1 › stridsrapport-i-dialog / spara-bargning-och-stridsavbrott: combat history survives reload without a report dialog
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-webkit] › tests/browser/space-pirates.spec.ts:92:1 › piratflotta-med-lastfartyg: the pirate panel lists a transport and its cargo hold
  - Fel: `Se körlogg och testets sparade felunderlag.`
- [phone-webkit] › tests/browser/star-map-trade.spec.ts:60:1 › ruttflotta-till-narmaste-andplanet: remote assignment saves an approach without teleporting
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-webkit] › tests/browser/star-map-trade.spec.ts:112:3 › handelsrutt-skapande-pa-stjarnkartan / flottilldelning-pa-stjarnkartan: planet and fleet drags create and administer a route in Star map without moving fleets
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-webkit] › tests/browser/star-map-trade.spec.ts:112:3 › route-kartvy / flottilldelning-pa-stjarnkartan: planet and fleet drags create and administer a route in Route without moving fleets
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-webkit] › tests/browser/star-map-trade.spec.ts:240:1 › handelsrutt-val-pa-stjarnkartan: keyboard alternatives retain orders after visiting Route and reloading
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-webkit] › tests/browser/star-map-trade.spec.ts:269:1 › handelsrutt-val-pa-stjarnkartan / flottilldelning-pa-stjarnkartan: clicking a line selects it and an invalid drop cannot set a destination
  - Fel: `Error: expect(locator).toContainText(expected) failed`
- [phone-webkit] › tests/browser/supply-production.spec.ts:6:1 › forsorjningsproblem-pa-kartan / forsorjningsstatus / leveransfloden: resolves a problem to Waiting and shows only ordered supply on the production map
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-webkit] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 320x568
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [phone-webkit] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 393x851
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [phone-webkit] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 844x390
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [phone-webkit] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 667x320
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [phone-webkit] › tests/browser/turn-console.spec.ts:116:1 › handelser: Events adapts to available screen space without a selection
  - Fel: `Test timeout of 30000ms exceeded.`
- [phone-webkit] › tests/browser/viewport.spec.ts:74:3 › viewport-game-layout / english-game: all screens remain usable at 667x320
  - Fel: `Test timeout of 30000ms exceeded.`
- [tablet-webkit] › tests/browser/building-images.spec.ts:6:1 › gemensamma-byggnadsbilder: supplied images load in Research, selection and building sites
  - Fel: `Error: expect(locator).toHaveCount(expected) failed`
- [tablet-webkit] › tests/browser/colonization.spec.ts:8:1 › koloniseringsorder: Colonize chooses a planet, survives reload and settles automatically after travel
  - Fel: `Test timeout of 30000ms exceeded.`
- [tablet-webkit] › tests/browser/event-playback.spec.ts:150:1 › handelseannonsering / handelser-pa-kartan: announcements stay below the event and fly into the list across orientation changes
  - Fel: `Test timeout of 30000ms exceeded.`
- [tablet-webkit] › tests/browser/exploration-interruptions.spec.ts:142:1 › gemensamt-handelseflode / upptacktsavbrott / order-under-upptacktsavbrott / spara-avbrutet-ar / stridsresultat-utan-upprepning: Handle edits another fleet, reload restores the pause and Continue resolves contact once
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [tablet-webkit] › tests/browser/exploration-interruptions.spec.ts:244:1 › automatisk-stjarnutforskning / flottorder-som-symboler: explores persistently from the compact card and saves the order
  - Fel: `Error: expect(received).not.toBe(expected) // Object.is equality`
- [tablet-webkit] › tests/browser/fleet-focused-map.spec.ts:12:1 › flottfokuserad-kartvy: background is inert, route crossings set destinations, and remote transfers survive reload
  - Fel: `Error: expect(locator).toHaveAttribute(expected) failed`
- [tablet-webkit] › tests/browser/fleet-interaction.spec.ts:17:1 › flottval-pa-kartan / dra-flottdestination: selects a fleet, previews a snapped arrow and commits on release
  - Fel: `Error: expect(locator).toHaveCSS(expected) failed`
- [tablet-webkit] › tests/browser/fleet-interaction.spec.ts:70:1 › kartflottor / flottval-pa-kartan: colocated fleets occupy separate positions within the hex
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [tablet-webkit] › tests/browser/fleet-map-management.spec.ts:9:1 › flottadministration / flottnamn-direktredigering / flottknappar-pa-kartan: organize fleets on the map and restore them
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [tablet-webkit] › tests/browser/fleet-patrol.spec.ts:75:1 › flottpatrullering: uses shared sight to catch a pirate, resumes its ring, and persists combat
  - Fel: `Error: expect(received).toBe(expected) // Object.is equality`
- [tablet-webkit] › tests/browser/game.spec.ts:163:1 › kartnavigation: keyboard pans and zooms, canvas hit-testing selects the home planet
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [tablet-webkit] › tests/browser/game.spec.ts:211:1 › kartnavigation: native touch selects the planet
  - Fel: `Error: expect(locator).toBeVisible() failed`
- [tablet-webkit] › tests/browser/game.spec.ts:323:1 › planetbyggplatser / fabrikskoer / forska-fram-fabriker / kolonisation: research, build ships and settle a new colony
  - Fel: `Error: expect(locator).toHaveCount(expected) failed`
- [tablet-webkit] › tests/browser/logistics.spec.ts:49:1 › utvinningsbyggnader / forskningsko / automatisk-resursforsorjning / fysisk-frakt / forstarka-ruttflotta / flottans-handelsrutt: a new game supplies its colony through an assigned fleet
  - Fel: `Test timeout of 180000ms exceeded.`
- [tablet-webkit] › tests/browser/mobile-map-interactions.spec.ts:48:1 › centrerat-kartfokus / kartpanel-till-events: Show centers Vesta above the production panel
  - Fel: `Error: expect(received).toBeLessThan(expected)`
- [tablet-webkit] › tests/browser/planet-pages.spec.ts:167:1 › byggkategorier / symbolbaserade-kataloger: icon categories and compact lists reveal complete details with keyboard focus
  - Fel: `Error: expect(locator).toHaveCount(expected) failed`
- [tablet-webkit] › tests/browser/production-map.spec.ts:7:1 › route-kartvy / produktions-kartvy / radiella-byggval / kompakt-produktionsko: shared map, radial orders and queue work with touch, keyboard and larger text
  - Fel: `Test timeout of 60000ms exceeded.`
- [tablet-webkit] › tests/browser/research-tree.spec.ts:118:1 › forsknings-tradnavigation: dependency arrows, navigation and research preserve the camera
  - Fel: `Error: expect(locator).toHaveAttribute(expected) failed`
- [tablet-webkit] › tests/browser/route-escorts.spec.ts:28:1 › unika-flottnamn / rutt-eskortfordelning / ruttflottor-pa-kartan: assign fighters and select their carrier at the route midpoint
  - Fel: `Test timeout of 30000ms exceeded.`
- [tablet-webkit] › tests/browser/salvage.spec.ts:175:1 › bargningsorder / automatisk-vrakreparation / forskning-fran-bargade-delar: salvage, tow, reload, dock and research recovered parts
  - Fel: `Test timeout of 30000ms exceeded.`
- [tablet-webkit] › tests/browser/salvage.spec.ts:306:1 › stridsrapport-i-dialog / spara-bargning-och-stridsavbrott: combat history survives reload without a report dialog
  - Fel: `Error: expect(received).toBe(expected) // Object.is equality`
- [tablet-webkit] › tests/browser/space-pirates.spec.ts:92:1 › piratflotta-med-lastfartyg: the pirate panel lists a transport and its cargo hold
  - Fel: `Se körlogg och testets sparade felunderlag.`
- [tablet-webkit] › tests/browser/star-map-trade.spec.ts:60:1 › ruttflotta-till-narmaste-andplanet: remote assignment saves an approach without teleporting
  - Fel: `Test timeout of 30000ms exceeded.`
- [tablet-webkit] › tests/browser/star-map-trade.spec.ts:112:3 › handelsrutt-skapande-pa-stjarnkartan / flottilldelning-pa-stjarnkartan: planet and fleet drags create and administer a route in Star map without moving fleets
  - Fel: `Test timeout of 30000ms exceeded.`
- [tablet-webkit] › tests/browser/star-map-trade.spec.ts:112:3 › route-kartvy / flottilldelning-pa-stjarnkartan: planet and fleet drags create and administer a route in Route without moving fleets
  - Fel: `Test timeout of 30000ms exceeded.`
- [tablet-webkit] › tests/browser/star-map-trade.spec.ts:240:1 › handelsrutt-val-pa-stjarnkartan: keyboard alternatives retain orders after visiting Route and reloading
  - Fel: `Test timeout of 30000ms exceeded.`
- [tablet-webkit] › tests/browser/star-map-trade.spec.ts:269:1 › handelsrutt-val-pa-stjarnkartan / flottilldelning-pa-stjarnkartan: clicking a line selects it and an invalid drop cannot set a destination
  - Fel: `Error: expect(locator).toContainText(expected) failed`
- [tablet-webkit] › tests/browser/supply-production.spec.ts:6:1 › forsorjningsproblem-pa-kartan / forsorjningsstatus / leveransfloden: resolves a problem to Waiting and shows only ordered supply on the production map
  - Fel: `Test timeout of 30000ms exceeded.`
- [tablet-webkit] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 320x568
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [tablet-webkit] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 393x851
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [tablet-webkit] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 844x390
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [tablet-webkit] › tests/browser/turn-console.spec.ts:27:3 › end-turn-vid-kartval / rundkontroller-i-decisions: selection leaves room for End turn at 667x320
  - Fel: `Error: expect(locator).toBeHidden() failed`
- [tablet-webkit] › tests/browser/turn-console.spec.ts:116:1 › handelser: Events adapts to available screen space without a selection
  - Fel: `Error: expect(received).not.toBe(expected) // Object.is equality`
- [tablet-webkit] › tests/browser/viewport.spec.ts:74:3 › viewport-game-layout / english-game: all screens remain usable at 667x320
  - Fel: `Test timeout of 30000ms exceeded.`

Fullständig körlogg finns lokalt i `/tmp/spacelords-browser-03bf183.log`. Skärmbilder och spår finns i `test-results/`.
