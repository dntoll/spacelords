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
        avbrott. Kvar är Move och Stop. Ett Exploration ship utforskar
        fortfarande planeter det står på.
  - [ ] `Game` och vyerna hanterar fortfarande en lista med flottor
        (`fleets`). Att göra om till en enda flotta och att ersätta `Fleets`
        med en skeppsöversikt hör till `enda-spelarflottan` och
        `fleet-som-skeppsoversikt`, som väntar på beslut.
  - [x] Ta bort bärgning, vrak, orbitala varv, reparationer och
        uppgraderingsordern vid varv, som alla krävde spelarens planeter.
        `Salvage ship` finns kvar som skeppstyp.
  - [x] Ta bort skärmen `Decisions` med beslutslistan, tysta beslut,
        varningen vid rundslut, beslutsvägledning, uppmärksamhetsmarkeringar
        och kartproblem, samt Exploration-, Colonization-, Attack- och
        Salvage-köerna, köåtgärder i händelser och beställning av Colony ship.
- [ ] Ta bort planet- och fabriksforskning samt planetbunden produktion och
      anpassa återstående forsknings- och produktionsytor till att invänta
      beslutade ersättningar.
  - [x] Research kräver inte längre en Research station. Trädet visas och
        kan köas, men forskningen går inte framåt (`advance(0)`) tills
        forskningskapaciteten är beslutad.
  - [ ] Ta bort fabriks-, Dome-, terraformings-, handels- och
        bärgningsteknikerna ur trädet och `Catalog` (byggnaderna finns kvar
        som data för trädets bilder och förkunskaper).
- [ ] Ta bort händelser, beslut, vägledning och navigation som bara stöder
      borttagna funktioner; granska kvarvarande användartexter. Beslut,
      vägledning och köer är borta. Webbläsartesterna (`tests/*/browser`)
      och `styles.css` har bara rensats delvis och behöver granskas.
- [ ] Rensa aktiva krav, produktdokumentation, domänmodell och tester så att
      endast aktuell eller uttryckligen planerad funktion återstår. Behåll
      stabila namn för krav som fortfarande gäller och ange deras status.
- [ ] Hantera godkänd inkompatibilitet för sparningar och verifiera ny start
      när det går utan att föregripa öppna speldesignbeslut.
  - [x] Sparformatet är version 18 utan kolonier, nätverk, bärgning och
        produktionsflottor. Version 17 och äldre avvisas med
        `This saved game cannot be loaded.` och platsen kan rensas.
- [ ] Kör enhetssviten, relevanta riktade tester och verktygskontroller;
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

Genomfört och pushat: befolkningsutjämning, gamla engångsrensningar,
automatisk rutteskort, automatisk ombemanning, automatisk rutttilldelning,
samt den gamla persontransportordern och dess modell och visning är borta.
Nybyggda transportskepp får ingen automatisk rutt. Den äldre migreringen av
`auto-transport` i sparade produktionsorder är också borttagen. Civilian shuttle som
skepp behålls tills dess framtida roll har diskuterats. Kvarvarande manuell
handel, fabriksekonomi, planetägande, kolonisation, population och övriga
automatiska order ska rensas enligt checklistan.

Gamla sparningar raderas inte och avvisas ännu inte uttryckligen: de kan
fortfarande öppnas med ofullständigt stöd. Det är en tillfällig begränsning;
hantera godkänd inkompatibilitet innan rensningen avslutas. Ytterligare
framtida inkompatibla ändringar kräver ny avstämning.

Senaste kodsteget: typkontroll och 14 riktade tester för order och sparformat
passerade efter att migreringen av `auto-transport` togs bort. Även 74
riktade tester för produktion och fabriksvyer passerade i steget före det.
Hela sviten har inte körts om efter varje delsteg. Tidigare delsteg finns
som individuella commits i `single_fleet`.
