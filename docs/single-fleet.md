# Single fleet

## Riktning och omfattning

Utforskning på `single_fleet`, med `simple_production` som utgångspunkt.
Spelaren leder en enda flotta. Utforskning och uppdrag på planeter,
asteroidbälten och andra platser leder till fynd, rymdstrider och bordningar.
Forskning och utveckling ska främst handla om skeppen och bordningsspelet.
Den här leveransen dokumenterar riktningen och ändrar inget spelbeteende.

## Krav — utforskning

Alla krav nedan är **Ej implementerat**. Befintliga skärmar och mekaniker är
utgångspunkter, men uppfyller ännu inte dessa nya beteendekrav.

| Stabilt kravnamn                          | Önskat beteende                                                                                                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enda-spelarflottan`                      | Spelaren har en enda flotta och inga egna planeter eller fasta resurser. Allt spelaren har finns i flottan.                                                                                              |
| `startflotta-med-raptor`                  | Spelaren börjar med en Raptor.                                                                                                                                                                           |
| `flottaventyr-med-strid-och-bordning`     | Spelaren utforskar planeter och asteroidbälten, möter pirater, gör uppdrag och raids och hittar eller bygger skepp och teknik. Rymdstrid och bordning är centrala aktiviteter.                           |
| `flottstyrning-med-ap-pa-starmap`         | Star map behålls och används för direkt styrning av den enda flottan. Flottan har AP, därefter agerar motståndarna och sedan flottan igen. Utan motståndare inom räckhåll fortsätter spelarens tur.      |
| `fleet-som-skeppsoversikt`                | Fleets blir Fleet och visar varje skepp i flottan och dess egenskaper. Vyn är ingen karta.                                                                                                               |
| `crew-med-utrustning-och-skeppsbyte`      | Crew är en ny skärm där personer kan utrustas och flyttas mellan skepp. Personförflyttning finns även i Fleet.                                                                                           |
| `skeppsslots-for-utrustning-och-personer` | Skeppen har slots dit innehåll kan dras. Personer, vapensystem och motorer kan flyttas mellan skeppen. Cargo ships kan lagra sådant som inte används och Civilian transports kan ha slots för människor. |
| `flottforskning-av-tekniker`              | Research behålls men planetrelaterad forskning tas bort. Spelaren forskar fram tekniker i stället för fabriker, med fokus på skepp och bordning.                                                         |
| `gemensam-produktionsko-i-flottan`        | Production behålls med en enda kö för skepp, utrustning, uppgraderingar och reparationsjobb.                                                                                                             |
| `flottans-stodskepp`                      | Nya skeppstyper är Research ship, Mining ship, Construction ship och Carrier. Deras konkreta funktioner återstår att bestämma.                                                                           |

### Förtydliganden om resurser och personer

- `andliga-resurser-driver-flottans-resa` är **Ej implementerat**:
  flottans drift förbrukar ändliga resurser, däribland bränsle. Spelaren
  behöver förflytta sig och hitta ny försörjning för att hålla flottan igång.
  Vilka övriga resurser som finns, kostnader och tidsskala är inte bestämda.
- `besattning-med-flera-roller` är **Ej implementerat**: samma person kan
  användas i flera roller, inklusive ombord på skepp och i bordningsstyrkan.
  Exakta roller och regler för samtidiga uppgifter återstår att bestämma.
- `besattning-med-lika-startegenskaper` är **Ej implementerat**: personer
  har egenskaper men börjar med samma egenskapsvärden i den första
  implementationen. Individuella skillnader är en möjlig senare utveckling;
  egenskaper, progression och eventuella senare skillnader är inte beslutade.

## Ersätter tidigare riktning

Ersättningarna gäller inom denna utforskning. Äldre kravfiler dokumenterar
fortfarande den ärvda implementationen, inte färdig Single fleet-mekanik.

- `enda-spelarflottan` ersätter imperiebyggandet med egna kolonier,
  planetekonomi och flera spelarflottor, inklusive `flottadministration`
  när det gäller att dela och slå ihop flottor.
- `flottstyrning-med-ap-pa-starmap` ersätter automatisk utforskning och
  kolonisation genom `utforskningsko`, `koloniseringsko` och
  `automatisk-tilldelning-av-planetkoer`, samt årsuppspelningen som
  övergripande styrmodell. Hur övrig tid fortskrider återstår att bestämma.
- `fleet-som-skeppsoversikt` ersätter Fleets som karta över flera flottor.
- `flottforskning-av-tekniker` ersätter planetforskning, upplåsning av
  fabriker och kravet på en planetbunden Research station
  (`forskning-kraver-station`). Ny forskningskapacitet är ännu inte bestämd.
- `gemensam-produktionsko-i-flottan` ersätter planetbaserade produktionsköer
  och fabriksnätverk som spelarens produktionsmodell.
- `flottans-stodskepp` ersätter inte automatiskt detaljerna i äldre
  `mining-ships` och `mining-ship-anslutning`; deras nätverkskoppling hör
  till den tidigare ekonomin och ska omprövas för flottan.

## Plan och beslut före implementation

### Arbetsregel

`single-fleet-beslut-fore-implementation` är **Fullständigt implementerat**
som dokumenterad plan och arbetsregel: oklara delar ska diskuteras med
användaren och uttryckligen låsas innan berörd spelimplementation börjar.
Denna status avser dokumentationen, inte spelmekaniken.

Ett låst riktningsbeslut är inte ett godkännande av ännu öppna detaljer.
Agentens förslag och rekommendationer är diskussionsunderlag tills användaren
har beslutat. Skriv in varje beslut här, uppdatera berörda stabila krav och
markera vad som fortfarande är öppet. Tystnad räknas inte som ett beslut.
Fristående, redan låsta delar kan senare implementeras på uttrycklig
beställning; öppna beroenden ska först lösas med användaren.

### Låst riktning

Följande är beslutat, men spelmekaniken är ännu inte implementerad:

- En enda spelarflotta, en Raptor från början, inga egna planeter eller
  fasta resurser. Rymdstrid och bordning är huvudaktiviteter.
- Star map, Research och Production behålls och anpassas. Fleet blir en
  skeppsöversikt utan karta. Crew blir en egen skärm.
- Spelaren styr flottan med AP på Star map. Motståndarna agerar mellan
  spelarens turer; utan motståndare inom räckhåll fortsätter spelarens tur.
- Flottans drift förbrukar ändliga resurser, inklusive bränsle. Behovet av
  ny försörjning driver spelaren vidare.
- Personer kan ha flera roller och börjar med samma egenskapsvärden.
- Personer och utrustning kan flyttas mellan skepp. Skeppen har slots,
  inklusive möjligheter till last och persontransport.
- Research gäller tekniker för skepp och bordning, utan planetforskning
  eller fabriksupplåsningar.
- Production har en gemensam kö för skepp, utrustning, uppgraderingar och
  reparationer.
- Research ship, Mining ship, Construction ship och Carrier ingår i
  riktningen; deras funktioner är öppna.

### Delar som måste diskuteras och låsas

Samtliga delar i tabellen har beslutsstatus **Öppen — diskuteras med
användaren före implementation**. Frågorna är inga föreslagna standardregler.

| Del                                | Beslut som behövs                                                                                                                                                                                                                                     | Berörda krav                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Tid, AP och motståndarturer        | Vilka handlingar kostar AP? Hur återställs AP utan fiender? Vad betyder inom räckhåll? Vad utlöser motståndarnas tur, och hur förhåller sig karttiden till strid och bordning?                                                                        | `flottstyrning-med-ap-pa-starmap`                                                                          |
| Förbrukning och försörjning        | Vilka resurser utöver bränsle finns? Förbrukas de vid förflyttning, handlingar eller förfluten tid? Är lokala fyndigheter ändliga, hur hittas och utvinns resurser och vad händer när bränslet tar slut?                                              | `andliga-resurser-driver-flottans-resa`                                                                    |
| Startens Raptor och stödskepp      | Vilken besättning, utrustning, last och kapacitet finns från början? Vad gör varje stödskepp, vad kräver dem och hur får spelaren sitt första?                                                                                                        | `startflotta-med-raptor`, `flottans-stodskepp`                                                             |
| Personer och roller                | Vilka egenskaper och gemensamma startvärden används? Vilka roller finns, kan uppgifter kombineras samtidigt och vad händer med skeppets funktioner när någon deltar i bordning? Rekrytering, skador, död och eventuell progression behöver bestämmas. | `besattning-med-flera-roller`, `besattning-med-lika-startegenskaper`, `crew-med-utrustning-och-skeppsbyte` |
| Slots och förflyttning av innehåll | Vilka slottyper, antal och kompatibilitetsregler har varje skepp? Hur skiljs monterad utrustning från last och personplatser? När får saker och personer flyttas, vad kostar det och hur används detta på mobil?                                      | `skeppsslots-for-utrustning-och-personer`, `fleet-som-skeppsoversikt`                                      |
| Research                           | Vilka tekniker finns, vilka förkunskaper och fynd krävs, vad kostar forskningen och hur fortskrider den? Vad bidrar besättning och Research ship med?                                                                                                 | `flottforskning-av-tekniker`                                                                               |
| Production och reparation          | Vilka resurser och kapaciteter kräver jobben? Hur går tiden, hur prioriteras kön och vad gäller vid paus eller avbrott? Vad kan Raptor göra själv och vad kräver Construction ship?                                                                   | `gemensam-produktionsko-i-flottan`                                                                         |
| Möten, uppdrag och erövring        | Hur väljs och varieras möten? När behövs rymdstrid, bordning eller båda? Hur förs skador, besättning, utrustning och byte mellan kartan och striderna? Hur behålls ett erövrat skepp?                                                                 | `flottaventyr-med-strid-och-bordning`, `enda-spelarflottan`                                                |
| Resans mål och nederlag            | Vad driver resan utöver försörjning? Hur fungerar reträtt, förlorade skepp och återhämtning? När är spelet vunnet eller förlorat?                                                                                                                     | `flottaventyr-med-strid-och-bordning`, `enda-spelarflottan`                                                |
| Övergång från tidigare spel        | Vilka gamla funktioner tas bort eller behålls? Hur behandlas befintliga sparningar? Varje inkompatibel ändring kräver separat avstämning.                                                                                                             | `avstamning-sparkompatibilitet`, berörda ersättningar ovan                                                 |

### Föreslagen diskussionsordning

Ordningen är ett planeringsförslag, inte en beställning att implementera.

1. Lås tid, AP, resursförbrukning och försörjning tillsammans. Det bestämmer
   vad resor och väntan innebär.
2. Lås startens Raptor, besättningen och utrustningsplatserna. Det bestämmer
   vad spelaren faktiskt kan göra från början.
3. Lås Research, Production och stödskeppens funktioner utifrån de första
   två delarna.
4. Lås sambanden mellan kartmöten, rymdstrid, bordning, byte och erövring,
   samt resans mål och följderna av nederlag.
5. Bestäm en första spelbar etapp och dess avgränsning tillsammans med
   användaren. Dokumentera acceptanskriterier och spårbara beteendekrav.
6. Före implementation: kontrollera att etappens beroenden är låsta och
   att sparkompatibilitet är avstämd om formatet behöver ändras. Implementera
   sedan endast den beställda etappen, med tester enligt arbetsreglerna.

Inga numeriska balansvärden, nya resurslistor, rolluppsättningar eller
stödskeppsfunktioner är låsta av denna plan. Den här dokumentationsändringen
ändrar inte spelet eller sparformatet.
