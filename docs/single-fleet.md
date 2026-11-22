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

## Öppna designfrågor

Följande är frågor, inte beslutade krav:

- Vad kostar AP, vad betyder inom räckhåll och hur återfås AP utan fiender?
- Hur fortskrider forskning, produktion och reparation när turerna fortsätter?
- Vilka resurser används, hur hittas de och vad begränsar flottans last?
- Vad gör stödskeppen och vilka kapaciteter finns redan i startens Raptor?
- Hur skiljer sig monterade system, lastutrymme och platser för personer?
- Vilka roller har besättningen och hur hänger den ihop med bordningsstyrkan?
- Hur påverkar rymdstridens utfall bordning, byte och erövring av skepp?
- Vad händer vid reträtt, förlorade skepp eller nederlag för hela flottan?
- Vilket övergripande mål driver resan och hur varierar uppdragen?

Sparkompatibilitet ska stämmas av före eventuella inkompatibla speländringar
enligt `avstamning-sparkompatibilitet`. Den här leveransen ändrar inte sparformatet.
