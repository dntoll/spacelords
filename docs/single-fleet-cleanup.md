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
- [ ] Ta bort planetbaserade fabriker, produktionsnätverk, handelsrutter och
      automatiska transporter med deras vyer, tester och krav.
  - [x] Ta bort skärmen `Factories` (fasad, controller, vy, navigering och
        tester) samt beslut som bara hänvisade dit (`factory-`, `supply-`,
        `route-idle-`). Byggnader kan därmed inte längre beställas; spelets
        ekonomi står still tills resten av modellen är borttagen.
  - [ ] Ta bort handelsrutter, `Logistics` och ruttvisning på kartan.
  - [ ] Ta bort produktionsnätverket, byggnader och planetproduktion i `Game`.
- [ ] Ta bort kolonisation, planetägande, befolkning, Domes och terraforming
      med deras vyer, tester och krav; behåll planeter som platser.
- [ ] Ta bort flera spelarflottor, flottadministration, automatiska order
      och planetköer med deras vyer, tester och krav; behåll skepps- och
      stridsfunktioner som behövs för den kommande flottan.
- [ ] Ta bort planet- och fabriksforskning samt planetbunden produktion och
      anpassa återstående forsknings- och produktionsytor till att invänta
      beslutade ersättningar.
- [ ] Ta bort händelser, beslut, vägledning och navigation som bara stöder
      borttagna funktioner; granska kvarvarande användartexter.
- [ ] Rensa aktiva krav, produktdokumentation, domänmodell och tester så att
      endast aktuell eller uttryckligen planerad funktion återstår. Behåll
      stabila namn för krav som fortfarande gäller och ange deras status.
- [ ] Hantera godkänd inkompatibilitet för sparningar och verifiera ny start
      när det går utan att föregripa öppna speldesignbeslut.
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
