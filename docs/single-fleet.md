# Single fleet

## Riktning och omfattning

Utforskning på `single_fleet`, med `simple_production` som utgångspunkt.
Spelaren leder en enda flotta. Utforskning och uppdrag på planeter,
asteroidbälten och andra platser leder till fynd, rymdstrider och bordningar.
Forskning och utveckling ska främst handla om skeppen och bordningsspelet.
Rensningen inför riktningen följs upp i [rensningsplanen](single-fleet-cleanup.md).

Den visuella riktningen beskrivs i [grafisk profil](single-fleet-visual-profile.md).

## Krav — utforskning

Kraven nedan är **Ej implementerat** utom där annat anges. Befintliga
skärmar och mekaniker är utgångspunkter, men uppfyller ännu inte dessa nya
beteendekrav. `enda-spelarflottan` och `flottstyrning-med-ap-pa-starmap` är
**Fullständigt implementerat** (se [flottor](areas/fleets.md)).
`fleet-som-skeppsoversikt` och `skeppsslots-for-utrustning-och-personer` är
**Delvis implementerat**: fler skeppsegenskaper och nya slottyper för frakt- och civila skepp återstår.
`startflotta-med-raptor` är **Fullständigt implementerat** (2026-11-23): ett
nytt spel börjar med en Raptor, en Fighter och en Transport ship vid Tellus. Raptor ser en hex åt alla
håll, som Telescope I, och utforskar planeter vid ankomst. Den har fart 2,
Light cannon och kan docka för bordning. Flykt från fångenskap och övrig utrustning är inte bestämda. Startbesättningen beskrivs nedan.

| Stabilt kravnamn                          | Önskat beteende                                                                                                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enda-spelarflottan`                      | Spelaren har en enda styrbar flotta och inga egna planeter eller fasta resurser. Kvarlämnade skepp finns på kartan tills de återtas.                                                                     |
| `startflotta-med-raptor`                  | Spelaren börjar med en Raptor, en Fighter och en Transport ship.                                                                                                                                         |
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
- `besattning-med-flera-roller` är **Fullständigt implementerat**: en person
  kan ha flera skeppsroller och även vara bordare. Under bordning är skeppet
  låst och när bordningen slutar måste rollerna fortfarande vara bemannade av
  aktiva personer för att skeppets funktioner ska fungera.
- `besattning-med-varierade-startegenskaper` är **Fullständigt implementerat**
  och ersätter `besattning-med-lika-startegenskaper` efter uttrycklig ändring
  från användaren: varje startperson har en egen fast profil för HP, Accuracy,
  Defense och Agility. En styrka vägs upp av en svaghet (en HP- eller
  agility-poäng väger som en halv poäng accuracy eller defense), så ingen är
  bättre än den tidigare gemensamma profilen 10/12/4/11 i alla avseenden.
  Värdena används i bordning och, via gunner och pilot, i rymdstrid
  (`besattningsvarden-i-rymdstrid`).
- `besattningsvarden-i-rymdstrid` är **Fullständigt implementerat**: skeppets
  aktiva gunner med Accuracy 6 eller mer sänker skeppets träffkrav med ett
  steg (exempelvis 4+ till 3+), och 2 eller mindre höjer det. Skeppets aktiva
  pilot med Agility 14 eller mer höjer fiendens träffkrav mot skeppet med ett
  steg, och 10 eller mindre sänker det. Två poäng från den tidigare gemensamma
  profilen (Accuracy 4, Agility 12) ger alltså ett steg. Kravet hålls mellan
  2+ och 6+. Piratskepp saknar besättningsvärden. Effekterna sparas med
  pågående strid; äldre sparade strider saknar dem och påverkas inte.
- `besattningsvarden-forklaras` är **Fullständigt implementerat**: Crew
  förklarar vad varje värde gör i bordning, och förklaringen finns även vid
  varje stapel: HP är skada personen tål, Accuracy läggs till D20-slaget för
  skott och granatkast, Defense är summan ett fiendeskott måste nå och Agility
  ger action points per bordningstur. Texten beskriver även gunnerns och
  pilotens effekt i rymdstrid.
- `crew-med-utrustning-och-skeppsbyte` är **Fullständigt implementerat**:
  Fleet och Crew visar personerna. Mellan strider kan spelaren flytta dem
  mellan skepp och byta personlig utrustning mellan dem.
- `dragbar-besattning` är **Fullständigt implementerat**: i Fleet flyttas personer genom att dras mellan rollrutorna, även mellan skepp. Upptagna rutor byter personer och ett val av två rutor fungerar också. Skeppens begränsningar gäller fortsatt. Detta ersätter val av skepp och roller i Crew Details.
- `dragbar-personlig-utrustning` är **Fullständigt implementerat**: Crew visar vapen och utrustning i rutor som kan dras eller väljas mellan personer. Samma utrustningstyp byter plats. Det dragna föremålet följer pekaren. I Fleet kan föremålet också släppas på en annan persons porträtt och byter då plats med personens föremål av samma slag.
- `besattningsstaplar` är **Fullständigt implementerat**: personens hälsa, träffsäkerhet, försvar och rörlighet visas med staplar och värden.
- `besattningens-start-och-roller` är **Fullständigt implementerat**:
  Raptor startar med pilot, engineer, gunner och fyra bordare, Fighter med
  pilot, engineer och gunner samt Transport ship med pilot och engineer. Alla
  skepp har en plats för vardera skeppsrollen och fyra bordningsplatser. De
  fyra bordarna börjar med varsin rifle och varsitt av Frag grenade, Smoke
  grenade, Hacker tools och Med kit. Pilot och engineer behövs för förflyttning
  och gunner för skjutning.
- `kvarlamnade-skepp-pa-kartan` är **Fullständigt implementerat**: skepp som
  saknar pilot eller engineer lämnas vid avresan och visas på Star map. När
  flottan återvänder kan personer flyttas till skeppet och det återanslutas.
  Detta förtydligar `enda-spelarflottan`: övergivna skepp är spelarens
  egendom på kartan men utgör inte en andra styrbar flotta.
- `besattningsskador-och-lakning` är **Fullständigt implementerat**: skador,
  dödsfall och utrustningens förbrukning sparas efter bordning. Resande personer
  läker 1 HP per förflyttad hex; en utslagen person blir aktiv över 0 HP.
  Besättningen dör om skeppet förstörs.

Äldre sparningar får ingen automatisk besättning. Rollkraven gäller även där
och sådana spel kan därför bli ospelbara, enligt användarens beslut.

### Motorer och last

`fleet-motorer-och-last` är **Fullständigt implementerat**: Raptor har en
motorplats och två lastplatser, Transport ship en motorplats och tio lastplatser.
Båda börjar med Rocket engine monterad och Transport ship har två Ion pulse
engine i lasten. Motorer kan dras eller väljas mellan platser; upptagna platser
byter innehåll. Ett skepp utan motor kan inte drivas i strid och flottan kan
inte resa. Äldre sparningar behåller sina skepp och får tomma lastplatser.
Beslutet om tre startskepp ersätter tidigare krav på en Raptor och en Transport ship. Personplatser och startbesättning beskrivs ovan.

### Fleet: platser och dragning

- `fleet-visuella-platser` är **Fullständigt implementerat**: kvadratiska
  motor- och lastplatser ligger på fasta positioner på skeppsbilden och
  monterade eller lagrade motorer visas med bilder.
- `fleet-kompakt-skeppsyta` är **Fullständigt implementerat**: Fleet visar skeppen med mindre tomrum ovanför och nedanför, med utrustningsplatserna kvar vid skeppen.
- `fleet-kompakta-skepp` är **Fullständigt implementerat**: mindre skeppsbild bredvid utrustningen; skeppsroller och bordare visas med namn, porträtt och personinformation.
- `fleet-besattningsrutor` är **Fullständigt implementerat**: varje skepp visar en Crew-grupp med kvadratiska rutor likt Storage för pilot, engineer, gunner och fyra bordare. Bemannade rutor visar personernas porträtt och ett tryck visar personinformation och kontroller. Tomma rutor visas som tomma.
- `fleet-platsinformation` är **Fullständigt implementerat**: utrustningsrutor märks `Engine` eller `Weapon`, och lastplatser grupperas under `Storage`. Markerad utrustning visar namn, bild och relevanta egenskaper; tomma rutor visas som tomma.
- `fleet-direktmarkering` är **Fullständigt implementerat**: ett tryck på en fylld ruta väljer den direkt och avmarkerar den tidigare. Ett tryck på bakgrunden avmarkerar.
- `fleet-placering-vapen-och-motor` är **Fullständigt implementerat**: motorplatsen är mitt bak på skeppet och vapenplatserna ligger i mitten över och under `Storage`.
- `fleet-vapenbilder` är **Fullständigt implementerat**: Cannon, Light cannon, Raider cannon och Missiles har egna bilder som visas i Fleet och detaljpanelen.
- `fleet-storage-grupperad` är **Fullständigt implementerat**: motorplatserna är till vänster och lastplatserna ligger tätt i en gemensam `Storage`-ruta mot mitten.
- `fleet-vapenplatser` är **Fullständigt implementerat**: Raptor och erövrade piratskepp har en vapenplats och Fighter har två. Fighter börjar med Cannon och en tom plats, utan Storage. Vapen kan flyttas mellan vapenplatser och Storage, används i strid och behåller kvarvarande ammunition. Äldre sparningar behåller sina tidigare vapen.
- `fleet-drag-och-rullning` är **Fullständigt implementerat**: föremålet
  följer pekaren vid dragning och listan rullar vid kanten så att det kan
  flyttas till skepp utanför den synliga delen.
- `fleet-skeppsordning` är **Fullständigt implementerat**: skeppens ordning
  kan ändras med draghandtag, skeppets namn eller knappar och sparas med
  flottan. Ett skepp som släpps var som helst på ett annat skepp tar dess
  plats.

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

- En enda spelarflotta, en Raptor, en Fighter och en Transport ship från början, inga egna planeter eller
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

| Del                                | Beslut som behövs                                                                                                                                                                                        | Berörda krav                                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Tid, AP och motståndarturer        | Vilka handlingar kostar AP? Hur återställs AP utan fiender? Vad betyder inom räckhåll? Vad utlöser motståndarnas tur, och hur förhåller sig karttiden till strid och bordning?                           | `flottstyrning-med-ap-pa-starmap`                                                                               |
| Förbrukning och försörjning        | Vilka resurser utöver bränsle finns? Förbrukas de vid förflyttning, handlingar eller förfluten tid? Är lokala fyndigheter ändliga, hur hittas och utvinns resurser och vad händer när bränslet tar slut? | `andliga-resurser-driver-flottans-resa`                                                                         |
| Startens Raptor och stödskepp      | Vilken övrig utrustning, last och kapacitet finns från början? Vad gör varje stödskepp, vad kräver dem och hur får spelaren sitt första?                                                                 | `startflotta-med-raptor`, `flottans-stodskepp`                                                                  |
| Personer och roller                | Rekrytering och eventuell progression behöver bestämmas. Startvärden, roller, skador och läkning är beslutade ovan.                                                                                      | `besattning-med-flera-roller`, `besattning-med-varierade-startegenskaper`, `crew-med-utrustning-och-skeppsbyte` |
| Slots och förflyttning av innehåll | Personplatser och personförflyttning mellan strider är beslutade ovan. Övriga slottyper, kostnader och kompatibilitet behöver bestämmas.                                                                 | `skeppsslots-for-utrustning-och-personer`, `fleet-som-skeppsoversikt`                                           |
| Research                           | Vilka tekniker finns, vilka förkunskaper och fynd krävs, vad kostar forskningen och hur fortskrider den? Vad bidrar besättning och Research ship med?                                                    | `flottforskning-av-tekniker`                                                                                    |
| Production och reparation          | Vilka resurser och kapaciteter kräver jobben? Hur går tiden, hur prioriteras kön och vad gäller vid paus eller avbrott? Vad kan Raptor göra själv och vad kräver Construction ship?                      | `gemensam-produktionsko-i-flottan`                                                                              |
| Möten, uppdrag och erövring        | Hur väljs och varieras möten? När behövs rymdstrid, bordning eller båda? Hur förs skador, besättning, utrustning och byte mellan kartan och striderna? Hur behålls ett erövrat skepp?                    | `flottaventyr-med-strid-och-bordning`, `enda-spelarflottan`                                                     |
| Resans mål och nederlag            | Vad driver resan utöver försörjning? Hur fungerar reträtt, förlorade skepp och återhämtning? När är spelet vunnet eller förlorat?                                                                        | `flottaventyr-med-strid-och-bordning`, `enda-spelarflottan`                                                     |
| Övergång från tidigare spel        | Rensningens omfattning och inkompatibilitet för tidigare sparningar är beslutade för denna utforskning; se rensningsplanen. Ytterligare framtida inkompatibla ändringar ska stämmas av separat.          | `avstamning-sparkompatibilitet`, berörda ersättningar ovan                                                      |

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

`enda-spelarflottan` är **Fullständigt implementerat** (2026-11-23): modellen,
läsmodellen och vyerna har exakt en spelarflotta, och sparformatets lista
`fleets` innehåller alltid en.

`hexval-med-vag`, `resa-utan-synliga-pirater` och `ap-pa-starmap`
(2026-11-22, **Fullständigt implementerat**, se [Star map](areas/star-map.md))
och `piratens-aktivering` (2026-11-23) gör `flottstyrning-med-ap-pa-starmap`
**Fullständigt implementerat**. Flottan har AP från sin långsammaste motor.
Kartans handlingar är (beslut 2026-11-23):

- Förflyttning kostar 1 AP per hex. Att gå in i eller ut ur ett glest
  asteroidbälte kostar hela rundans AP.
- Utforskning sker automatiskt när flottan rör sig: hexar inom sikt avslöjas
  och en planet utforskas när flottan går in i dess hex med ett Exploration
  ship.
- Strid utlöses automatiskt så fort flottan och en pirat delar hex, inte i
  slutet av rundan (`strid-i-samma-hex`).

Oanvända AP ligger kvar och fienderna agerar först när AP är förbrukade.
"Motståndare inom räckhåll" betyder aktiverade pirater: en pirat aktiveras när
den upptäcks och förblir aktiv tills flottan är mer än 10 hex bort. Bara
aktiva pirater handlar, genom att patrullera runt sin stjärna; inaktiva står
still och tar ingen tid. Det finns ingen End turn och ingen väntan.

Se även [spelvisionen 2026-11-22](vision-2026-11-22.md), ett arbetsunderlag
vars idéer stäms av mot kraven här innan de implementeras.
