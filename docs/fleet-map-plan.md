# Plan för flottor på Star map

Datum: 2026-10-21. Implementerad ändring; nedan bevaras genomförandeplanen.
Aktiva produktkrav och status finns i
[product-requirements.md](product-requirements.md).

## Mål och omfattning

Spelaren ska se var flottorna befinner sig och kunna organisera dem utan att
lämna Star map. Vald hex visar flottornas skepp sida vid sida. Skepp kan flyttas
mellan flottorna och flottans namn kan redigeras genom dubbelklick.
Set destination och Edit fleet tas bort när ersättande handlingar är klara.

Användarens ändring gäller platsen och enkelheten för flottadministrationen.
Fysisk rörelse, förstärkningar på avstånd, transportuppdrag, skeppsbyggen och
sparade spel behåller sina regler.

## Vald utformning

Planens rekommenderade lösningar nedan har genomförts efter användarens
implementationsbeställning. Grundreglerna för rörelse och logistik behålls.

- Visa flottkorten i kartans informationspanel med gemensam platsrubrik:
  känt planetnamn när det finns, annars hexkoordinater. Visa destination som en
  separat uppgift så att den inte förväxlas med flottans nuvarande position.
- Hexval visar alla flottor där. Klick på en flottmarkör behåller befintligt
  hexval enligt `flottval-pa-kartan`, men visar korten vid den klickade flottans
  verkliga position och markerar dess kort. Panelens platsrubrik gör detta tydligt.
- En släppyta New fleet skapar en flotta först när ett giltigt skepp släpps där.
  Ett automatiskt namn föreslås och kan ändras direkt. Det fungerar även med
  bara en flotta på hexen och har ett alternativ med klick eller tangentbord.
- Namnredigering sparas med Enter, avbryts med Escape och kan öppnas med
  tangentbord eller touch. Fokusförlust avbryter osparad redigering. Befintliga
  namnregler återanvänds; ogiltiga namn ger ett begripligt engelskt felmeddelande.
- Fleets blir en kompakt översikt över namn, plats och uppdrag. Show on map
  centrerar kartan på en positionerad flotta och visar dess kort. För tomma
  flottor visas No position och deras befintliga hantering är fortsatt åtkomlig.
- Överföring av ett skepp i taget ingår i första leveransen. Val av antal och
  flytt av alla skepp är ett senare förslag, inte ett krav i denna plan.

## Levererad funktion

- Lokal flottpanel med verklig plats, flottkort, skeppsöverföring och New fleet.
- Namnbyte med dubbelklick, F2 eller namnknapp; Enter sparar, Escape och
  fokusbyte avbryter. Utkast och markörläge överlever återrendering.
- Kompakt Fleets med position, destination, uppdrag, minikarta och Show on map.
- Receiving fleet ger åtkomst till tomma och avlägsna mottagare från kartan.
- Orders → Choose destination ersätter Set destination. Hexväljare,
  Known objects och kartan ger alternativ till drag. Edit fleet är borttagen.
- Mobilpanelen prioriterar flottorna och kan förstoras; hjälp visas på begäran.
- Vald flottas namn rullas fram i långa listor, även efter Show on map.
- Befintliga domänrelationer och sparformat behålls.

Enhets- och webbläsartester för kraven finns i fleet-map-management, med
befintliga flott-, handels-, produktions-, viewport- och sparplatstester som
regressionsskydd. Domänmodellen har granskats utan behov av nya relationer.
Mängdflytt av skepp ingår fortsatt inte.

Verifiering: npm run check passerade med 236 snabbtester, 5 integrationstester
och 186 webbläsarfall; 22 plattformsspecifika fall hoppades över. Efter
rättningen för långa listor passerade 21 riktade webbläsarfall (3 överhoppade),
inklusive fyra nya fall med 25 flottor. Den sista separata snabbkörningen
passerade med 236 tester på 18,83 sekunder av tillåtna 20.

## Ursprunglig genomförandeordning

### 1. Säkra urval, plats och befintliga regler

- Knyt tester till `flottadministration`, `flottval-pa-kartan`,
  `tomma-flottor-utan-position`, `skepp-till-rorlig-flotta` och
  `forstarka-ruttflotta` innan berörd kod ändras.
- Lägg till tester för att vald hex visar rätt samlokaliserade flottor, att
  flottklick visar rätt grupp utan att ändra hexval och att tomma flottor inte
  får påhittade positioner. Testa även en hex utan flottor.
- Bestäm panelens samspel med planetinformation, Colonize och handelsrutter.
  Handelns befintliga urval får inte lämna gamla flottkort aktiva på fel plats.
- Återanvänd verkliga positionsdata i AppModel. Håll tillfälligt redigerings-
  och överföringsval separat från sparade speldata.

Klart när urvalsfallen är entydiga och testerna skyddar befintliga rörelse-
och transportregler. Vid en upptäckt bugg ska regressionstestet först köras
och misslyckas av rätt orsak.

### 2. Flytta lokal flottadministration till kartpanelen

- Bryt ut återanvändbar HTML-rendering av flottkort från FleetView/AppView.
  Återanvänd ShipView och ShipTransferInput i stället för två parallella
  överföringsimplementationer.
- Visa kort för samtliga flottor vid panelens plats, också när det bara finns
  en. Markera vald flotta både på kartan och i panelen.
- Låt drag mellan kort flytta exakt ett skepp. Erbjud välj skepp och välj
  mottagare med klick, touch och tangentbord.
- Visa giltiga mottagare och skäl till spärrar. Avbrott, ogiltiga släpp,
  pointercancel och Escape ska lämna skepp och order oförändrade.
- Visa destination, En route och Trade route med ändplaneterna. Behåll
  frigörande från rutt, avbruten förstärkning och Colonize där de är tillåtna.
- Håll panelen internt rullningsbar och kartan användbar på små skärmar.

Klart när en spelare kan välja en hex och organisera dess flottor utan vybyte,
utan att kortdrag startar kartpanorering eller ger en färdorder.

### 3. Förenkla skapande och namnbyte

- Implementera New fleet enligt den föreslagna släppytan. Validera först och
  skapa därefter flotta och överför skeppet i en sammanhängande handling.
  Avbruten eller ogiltig dragning får inte lämna en ny tom flotta.
- Implementera `flottnamn-direktredigering` på flottkorten med dubbelklick,
  touch- och tangentbordsalternativ. Ett vanligt klick ska fortfarande kunna
  välja flottan. Återrendering får inte tappa text eller fokus under redigering.
- Behåll tomma flottors identitet efter sista skeppets avfärd och åtkomst till
  uttrycklig borttagning. Radera inte automatiskt en mottagare för byggorder.
- Kontrollera att nya namn och lyckade överföringar sparas och återupptas.

Klart när en ny flotta kan bildas från en befintlig på samma hex och döpas
direkt, även utan musdrag eller dubbelklick.

### 4. Behåll global åtkomst och förenkla Fleets

- Gör Fleets till den föreslagna kompakta översikten med Show on map.
  Återanvänd nuvarande positionsvisning där den fortfarande behövs.
- Behåll åtkomst till positionslösa tomma flottor, deras namn, borttagning och
  användning som mottagare för skepp. Första skeppet bestämmer fortsatt platsen.
- Behåll ett uttryckligt mottagarval för förstärkningar på avstånd, åtkomligt
  från ett valt skepp. Märk att skeppet skickas som En route i stället för att
  omedelbart ingå i mottagarflottan.
- Mottagarvalet omfattar också tillåtna ruttflottor. Skepp tas fortsatt inte ur
  aktiva ruttflottor och deras last och uppdrag påverkas inte.
- Bevara `flottbyggar-minikarta` i denna leverans. Att ta bort minikartan eller
  möjligheten att skapa en tom flotta kräver ett separat uttryckligt kravbyte.

Klart när ingen befintlig mottagare eller förstärkningshandling har blivit
oåtkomlig och alla positionerade flottor går att hitta på kartan från översikten.

### 5. Ersätt de gamla kartknapparna

- Ta bort Set destination och Edit fleet från både vald flottas panel och
  hexens flottlista enligt `flottknappar-pa-kartan`.
- Behåll befintligt drag av flottmarkörer för destination och Clear destination.
  Ruttflottor behåller sina befintliga spärrar och tilldelningshandlingar.
- Ge destination utan drag genom att välja flottan och därefter välja
  destinationshex med en dokumenterad tangentbords-/touchhandling, exempelvis
  Choose destination i en handlingsmeny. Ett vanligt hexklick förblir hexval.
- Förtydliga hjälpen för skillnaden mellan skeppsöverföring, flottförflyttning,
  rutttilldelning och panorering. Behåll förhandsvisning och avbrott utan
  ändring av tidigare order.

Klart när knapparna saknas och samtliga ersättande handlingar fungerar med mus,
touch och tangentbord. Detta steg görs efter steg 2–4 för att undvika funktionsbortfall.

### 6. Verifiera och avsluta leveransen

- Utöka namngivna enhetstester för `flottadministration`,
  `flottnamn-direktredigering` och `flottknappar-pa-kartan` i snabbsviten.
- Anpassa berörda tester i fleet-builder, fleet-interaction, empty-fleets,
  fleet-pursuit och route-reinforcement. Behåll skyddet för sparade spel,
  byggordrars mottagare, handelsrutter, last och frigörande.
- Kör webbläsarflöden för hexval → överföring → ny flotta → namnbyte →
  destinationsdrag → omladdning. Testa även avbrott, positionslösa flottor,
  förstärkning på avstånd och stora flottlistor på telefon, surfplatta och dator.
- Verifiera fokus, minst 44 px klickytor, intern rullning, bibehållen kamera,
  touchdrag och att planet- och ruttkontroller är åtkomliga.
- Kör npm run check: format, lint, snabbsvit inom 20 sekunder och utökad svit
  med byggen och webbläsartester. Båda sviterna ska fortsatt köras i GitHub CI.
- Uppdatera kravstatus först när respektive beteende är verifierat. Gör
  sammanhängande commits med relevanta kontroller före varje commit.

Klart när hela flödet fungerar, befintliga spel återupptas och inga gamla
handlingar förlorats. Publicering ingår först vid separat beställning.

## Tekniska ramar

AppController samordnar alla ändringar. Vyer läser endast oföränderliga
ögonblicksbilder och skickar avsikter via ViewContracts. Game behåller
valideringen för positioner, skepp, uppdrag och sparning. Ett eventuellt nytt
kommando för att skapa en flotta med ett skepp får inte kunna lämna ett
halvfärdigt resultat.

p5 i instance mode fortsätter rita kartan; flottkort och redigering använder
HTML. Geometri, urval och domänregler förblir oberoende av p5. Undvik att lägga
mer flottlogik direkt i AppViews stora renderingsmetoder.

Inga nya domänbegrepp eller ändrat sparformat förväntas. Granska
docs/domain-model.puml vid implementation och uppdatera bara om faktiska
domänrelationer förändras. Teknik- och testbeskrivningar hålls i denna plan
och docs/technical-requirements.md, inte i produktkraven.
