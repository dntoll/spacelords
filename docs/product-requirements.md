# Produktkrav och status

Visionen beskrivs i [game-vision.md](game-vision.md). Namnen är stabila referenser.
**Fullständigt implementerat** avser hela det beskrivna kravet, inte hela spelet.
För delvisa krav anges vad som återstår. Exempelvärden är inte beslut om balans.

## Första spelgrunden

| Kravnamn                    | Status                     | Krav och återstående arbete                                                                                                                                           |
| --------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fast-exempelvarld`         | Fullständigt implementerat | En återkommande exempelvärld med tre åtskilda stjärnsystem, både gasplaneter och fasta planeter och exakt en ägd hemplanet. Världen börjar om när spelaren laddar om. |
| `hexkarta`                  | Fullständigt implementerat | En stjärna upptar en hexagon och dess planeter varsin direkt grannhexagon, högst en planet per hexagon. Tom rymd skiljer systemen åt.                                 |
| `statisk-planetplacering`   | Fullständigt implementerat | Stjärnor och planeter ligger stilla på kartan.                                                                                                                        |
| `lokal-sikt`                | Fullständigt implementerat | Hemplanetens hexagon och dess sex grannar är synliga. Övrigt planetinnehåll är dolt.                                                                                  |
| `synliga-stjarnor`          | Fullständigt implementerat | Alla stjärnpositioner kan ses även utanför den lokala sikten.                                                                                                         |
| `kartnavigation`            | Fullständigt implementerat | Spelaren kan markera rutor, zooma, panorera och återgå till hemplaneten med mus, touch och knappar. Dragning ska inte välja en ruta.                                  |
| `planetinformation`         | Fullständigt implementerat | Spelaren kan öppna en ägd planet och se namn, ägare, befolkning, gästvänlighet, resurser, byggplatser och byggnader.                                                  |
| `visa-byggalternativ`       | Fullständigt implementerat | Tillgängliga byggprojekt visas med kostnad och arbetskraft.                                                                                                           |
| `forskningsoversikt`        | Fullständigt implementerat | Spelaren kan läsa om framtida forskning och `Research station` och dess roll. Inget preliminärt forskningsträd visas.                                                 |
| `vynavigation`              | Fullständigt implementerat | Spelaren kan återgå till kartan från planet- och forskningsinformationen. Vald ruta och kartans läge bevaras tills sidan laddas om.                                   |
| `flera-skarmstorlekar`      | Fullständigt implementerat | Spelet går att använda på mobil, surfplatta och dator.                                                                                                                |
| `direktatkomst-utan-lankar` | Fullständigt implementerat | Appen nås via sin direktadress utan nya länkar eller navigationsval på den befintliga webbplatsen.                                                                    |

## Spelupplevelse

| Kravnamn               | Status                     | Krav och återstående arbete                                                                                                                                                                             |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `viewport-game-layout` | Fullständigt implementerat | Alla vyer fyller skärmen utan sidscroll på mobil, surfplatta och dator, även med större systemtypsnitt på smala skärmar. Avgränsade spelpaneler får ha intern scroll. Kartan tar huvuddelen av skärmen. |
| `focused-interface`    | Fullständigt implementerat | Visa spelinformation och handlingar utan introduktionsrubriker och dekorativa småtexter. Behåll beskrivningar av stjärnor och planeter.                                                                 |
| `english-game`         | Fullständigt implementerat | Alla texter, hjälptexter och namn på råvaror i spelet är på engelska.                                                                                                                                   |

## Fortsatt spelutveckling

| Kravnamn                          | Status                     | Krav och återstående arbete                                                                                                                                                                                                                              |
| --------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stjarnsystem-och-asteroidbalten` | Delvis implementerat       | Stjärnsystem med fasta planeter och gasplaneter finns. Asteroidbälten återstår.                                                                                                                                                                          |
| `planetforvaltning`               | Delvis implementerat       | Namn, råvaror i enheter per år och 0–10 byggplatser finns och visas för hemplaneten. Order finns för byggnader och skepp; kolonisering och vidare planetutveckling återstår.                                                                             |
| `kolonisation`                    | Delvis implementerat       | `Colony ship` kan byggas och flyttas. Ordern `Colonize` och nya kolonier återstår.                                                                                                                                                                       |
| `befolkningsutveckling`           | Fullständigt implementerat | Efter varje år växer befolkningen med tio procent, skalat efter gästvänlighet, efter avdragen skeppsbesättning.                                                                                                                                          |
| `gastvanlighet`                   | Delvis implementerat       | Gästvänlighet mellan 0 och 100 procent finns och visas. Förändringar över tid återstår; exempelvärden motsvarar ungefär jorden 100, Mars 25 och Jupiter 0 procent.                                                                                       |
| `fabrikbyggande`                  | Fullständigt implementerat | Spelaren kan beställa och avbryta bygge samt schemalägga rivning av de beslutade fabrikerna.                                                                                                                                                             |
| `bygga-forskningsstation`         | Fullständigt implementerat | `Research station` kan beställas på en ägd planet, även flera på samma planet.                                                                                                                                                                           |
| `produktion`                      | Delvis implementerat       | `Colony ship`, `Exploration ship` och `Fighter` produceras enligt fabriksreglerna. Övriga produkter återstår.                                                                                                                                            |
| `fororeningar`                    | Ej implementerat           | Fabriker kan försämra gästvänligheten genom utsläpp.                                                                                                                                                                                                     |
| `habitat`                         | Ej implementerat           | Habitat möjliggör större befolkning även på ogästvänliga planeter.                                                                                                                                                                                       |
| `terraformning`                   | Ej implementerat           | Terraformare kan öka gästvänligheten.                                                                                                                                                                                                                    |
| `forskningstrad`                  | Ej implementerat           | Forskning låser upp nya och bättre fabriker och tekniker, exempelvis mindre föroreningar och färre arbetare.                                                                                                                                             |
| `arsrundor-och-order`             | Fullständigt implementerat | Spelaren ger reversibla order, avslutar året och ser en händelsesammanfattning.                                                                                                                                                                          |
| `manuell-rundstyrning`            | Ej implementerat           | Under utveckling kan spelåren styras manuellt.                                                                                                                                                                                                           |
| `flottor`                         | Delvis implementerat       | Flottor kan döpas, delas på samma hexagon och få destinationer från `Star map`. Strid och diplomati återstår.                                                                                                                                            |
| `arsbudget`                       | Fullständigt implementerat | Planetens råvaror är en årsbudget som reserveras av drift och order.                                                                                                                                                                                     |
| `arbetskraft-och-besattning`      | Fullständigt implementerat | Byggnader, projekt och skepp reserverar arbetare och besättning.                                                                                                                                                                                         |
| `skeppstyper`                     | Fullständigt implementerat | `Colony ship`, `Exploration ship` och `Fighter` har fasta roller, fart och besättning.                                                                                                                                                                   |
| `flottadministration`             | Fullständigt implementerat | `Fleets` visar en rad per flotta och en cell per skeppstyp. Ett skepp kan dras eller väljas och flyttas till en samlokaliserad flotta.                                                                                                                   |
| `tomma-flottor`                   | Fullständigt implementerat | Tomma flottor behåller namn och rad, saknar destination och kan tas bort uttryckligen.                                                                                                                                                                   |
| `flottdestinationer`              | Fullständigt implementerat | En destination väljs på `Star map`, kan ändras eller rensas före årets slut och kan inte ges till en tom flotta.                                                                                                                                         |
| `kartflottor`                     | Fullständigt implementerat | Varje egen flotta med skepp visas som en separat liten svärm av trianglar, även utanför synlig rymd. Samlokaliserade flottor hålls isär. Skeppstyper har olika storlek och varje destinationspil utgår från sin flotta. Tomma flottor saknar kartmarkör. |
| `rundsimulering`                  | Fullständigt implementerat | Flottor färdas samtidigt längs kortaste väg enligt långsammaste skeppets fart.                                                                                                                                                                           |
| `handelser`                       | Fullständigt implementerat | Händelser visas efter året och sparas under sessionen.                                                                                                                                                                                                   |
| `skeppsutforskning`               | Fullständigt implementerat | Alla skepp synliggör besökt hexagon permanent. `Exploration ship` synliggör även dess grannar.                                                                                                                                                           |
| `planetbudgetoversikt`            | Fullständigt implementerat | `Overview` och `Construction` visar resurser, befolkning och byggplatser som totalt, använt/reserverat och tillgängligt.                                                                                                                                 |
| `civilisationskontakt`            | Ej implementerat           | Flottor kan få order för första kontakt och möten med kända civilisationer.                                                                                                                                                                              |
| `multiplayer`                     | Ej implementerat           | Flera spelare kan delta, med riktningen en eller två rundor per verkligt dygn.                                                                                                                                                                           |
| `sparat-spel`                     | Ej implementerat           | Sparning och återupptagning tillkommer senare; första exempelvärlden återställs vid omladdning.                                                                                                                                                          |

## Byggnader och byggkö

| Kravnamn                        | Status                     | Krav                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `byggnaders-resursanvandning`   | Fullständigt implementerat | `Buildings` visar varje färdig byggnads användning av Iron, Water och Oil per år samt arbetare. Schemalagd rivning frigör dessa reservationer.                                                                                                                                                                                               |
| `flera-byggnader-av-samma-typ`  | Fullständigt implementerat | Flera byggnader av samma typ får beställas och finnas på en planet inom antalet byggplatser. Även `Research station` får finnas i flera exemplar.                                                                                                                                                                                            |
| `gemensam-byggko`               | Fullständigt implementerat | Varje planet har en ordnad `Build queue` med flera samtidiga beställningar. Högst första projektet färdigställs per år. Spelaren kan dra order uppåt/nedåt, använda `Move up`/`Move down` eller avbryta en order. Saknade resurser, arbetare, besättning eller byggförutsättningar låter första ordern vänta utan att senare order går före. |
| `skepp-i-byggko`                | Fullständigt implementerat | `Colony ship`, `Exploration ship` och `Fighter` kan beställas flera gånger och delar kö med byggnader. `Fighter` kräver en färdig `Fighter factory`. Befintliga fabriksregler och kostnader behålls: Colony/Exploration-projekt ger ett skepp, medan en ny `Fighter factory` även ger sitt första skepp.                                     |
| `skepp-till-destinationsflotta` | Fullständigt implementerat | Varje skeppsorder kan få en mottagande flotta vid planeten, både vid beställning och senare i kön. Utan val används planetens hemflotta. Om mottagaren har lämnat planeten eller tagits bort används hemflottan; saknas en hemflotta vid planeten skapas en där.                                                                             |

`arsbudget` och `arbetskraft-och-besattning` förtydligas: färdiga byggnaders drift
samt första köprojektets resurser, arbetare och besättning reserveras i årsbudgeten.
Senare projekt väntar utan sådana reservationer. Köade byggprojekt reserverar
byggplatser; fristående skeppsorder använder ingen byggplats. Fighter-produktionens
resurser och arbetare täcks av fabrikens befintliga årliga drift.

## Ändringshistorik

- 2026-10-17: `tom-startsida` ersätts av den beslutade spelvisionen och kraven
  ovan. Den tomma startsidan är inte längre ett aktivt produktkrav.
- Första iterationen omfattar enbart karta, navigation och läsbara vyer.
  Tillgängliga byggalternativ innebär inte fungerande byggorder.

- 2026-10-17: Användaren ersätter webbsidelayouten med skärmfyllande spelvyer utan
  scroll. Engelska ersätter svenska i spelet. Beskrivningar av himlakroppar behålls.
- 2026-10-17: Produktkravsfilen heter `product-requirements.md` för att skiljas från
  rotens kravöversikt. Innehåll och stabila kravnamn behålls.

### Förflyttning längs hexvägar

- `rakare-hexforflyttning` — **Fullständigt implementerat**: Flottor följer en
  kortaste hexväg där de två riktningarna fördelas jämnt längs linjen mot målet.
  Vid lika många steg i riktningarna växlar flottan mellan dem; annars sprids
  stegen i den mindre vanliga riktningen längs vägen.

- 2026-10-18: `flera-byggnader-av-samma-typ` ersätter unikhetsbegränsningen i
  `bygga-forskningsstation`. `gemensam-byggko` och `skepp-i-byggko` ersätter
  samtidig färdigställning av alla projekt samt separata Fighter-order.
  `skepp-till-destinationsflotta` ersätter automatisk placering i en Reserve-flotta.
