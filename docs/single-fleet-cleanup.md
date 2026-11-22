# Rensningsplan för Single fleet

`single-fleet-rensning` är **Ej implementerat**: tidigare mekanik som inte
hör till Single fleet ska tas bort tillsammans med tester, gränssnitt och
aktiva krav som bara gäller den. Rensningen görs i små sammanhängande commits
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
- [x] Låt nybyggda transportskepp sluta starta automatiska handelsorder.
- [x] Ta bort `guard-routes`, dess automatiska eskortval och tillhörande tester.
- [x] Ta bort historiska engångsrensningar för terraforming och utökad galax
      samt deras tester; hantera det nya sparformatet i ett senare steg.
- [ ] Ta bort planetbaserade fabriker, produktionsnätverk, handelsrutter och
      automatiska transporter med deras vyer, tester och krav.
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

Utgångspunkt: `origin/single_fleet` vid planens skapande. Arbetet görs på
`codex/single-fleet-cleanup` och pushas efter varje commit. Före fortsatt
arbete: hämta origin, läs denna fil och `docs/single-fleet.md`, kontrollera
senaste commit och lokalt arbetsläge. Integrera till `single_fleet` enligt
projektets utforskningsflöde när en sammanhängande ändring är klar.

Delsteg klart: automatisk befolkningsutjämning mellan planeter har tagits
bort, inklusive dess modell, tillstånd, rundanrop och tillhörande enhets- och webbläsartester.
Gamla automatiska transportorder och användargränssnitt finns fortfarande
kvar och ska tas bort i ett senare steg. Den äldre områdesdokumentationen
beskriver tills vidare den ärvda mekaniken och ska rensas enligt checklistan. Tid, AP, resursernas detaljer,
startbesättning och övriga öppna designfrågor ska diskuteras och låsas med
användaren innan ny spelmekanik implementeras.

## Identifierade beroenden

`Game` binder ihop planetägande, flottorder, forskning, produktion och
rundsimulering. `Factories`, `Production`, `Orders`, `Fleets` och kartan
har egna fasader och vyer, men delar modell och navigering via app-skalet.
Rensa ett sammanhängande beteende åt gången och kontrollera kompilering och
tester innan nästa steg. `CivilianTraffic` och transportorder är kvar efter
utjämningen; ta bort dem tillsammans med anrop, vyer och beroende tester.
Rymdstrid och bordning delar delar av skeppsmodellen och ska bevaras.

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

Historiska engångsrensningar av webbläsarens sparplatser är borttagna.
Befintliga sparningar raderas inte automatiskt vid lagringsåtkomst. Den
framtida inkompatibiliteten ska fortfarande hanteras uttryckligt enligt
checklistan; gamla spel kan tills dess öppnas med ofullständigt stöd.

Automatisk eskort via `guard-routes` är borttagen. Övriga automatiska
order, manuell eskort och handelsnätverket finns kvar tills deras steg rensas.

Stängning av handelsrutter startar inte längre automatisk ombemanning
(`ombemanning-vid-stangd-farled`). Själva rutterna återstår att ta bort.

Nybyggda Transport ships och Civilian shuttles får inte längre automatisk
handels- eller transportorder. Produktion på planeter finns tills vidare
kvar och tas bort i senare steg.

Automatisk tilldelning av handelsrutter (`automatisk-farledsbemanning`)
är borttagen. Den äldre inaktiva Civilian transport-ordern och manuella
handelsrutter finns kvar tills de rensas.
