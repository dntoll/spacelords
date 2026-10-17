# Produktkrav och status

Visionen beskrivs i [game-vision.md](game-vision.md). Namnen är stabila referenser.
**Fullständigt implementerat** avser hela det beskrivna kravet, inte hela spelet.
För delvisa krav anges vad som återstår. Exempelvärden är inte beslut om balans.

## Första spelgrunden

| Kravnamn                    | Status                     | Krav och återstående arbete                                                                                                                                           |
| --------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fast-exempelvarld`         | Ej implementerat           | En återkommande exempelvärld med tre åtskilda stjärnsystem, både gasplaneter och fasta planeter och exakt en ägd hemplanet. Världen börjar om när spelaren laddar om. |
| `hexkarta`                  | Ej implementerat           | En stjärna upptar en hexagon och dess planeter varsin direkt grannhexagon, högst en planet per hexagon. Tom rymd skiljer systemen åt.                                 |
| `statisk-planetplacering`   | Ej implementerat           | Stjärnor och planeter ligger stilla på kartan.                                                                                                                        |
| `lokal-sikt`                | Ej implementerat           | Hemplanetens hexagon och dess sex grannar är synliga. Övrigt planetinnehåll är dolt.                                                                                  |
| `synliga-stjarnor`          | Ej implementerat           | Alla stjärnpositioner kan ses även utanför den lokala sikten.                                                                                                         |
| `kartnavigation`            | Ej implementerat           | Spelaren kan markera rutor, zooma, panorera och återgå till hemplaneten med mus, touch och knappar. Dragning ska inte välja en ruta.                                  |
| `planetinformation`         | Ej implementerat           | Spelaren kan öppna en ägd planet och se namn, planettyp, ägare, befolkning, gästvänlighet, råvaror per år och tillgängliga respektive använda byggplatser.            |
| `visa-byggalternativ`       | Ej implementerat           | Forskningsstationen presenteras som tillgänglig från start. I första steget framgår att byggande ännu inte går att genomföra.                                         |
| `forskningsoversikt`        | Ej implementerat           | Spelaren kan läsa om framtida forskning och forskningsstationens roll. Inget preliminärt forskningsträd visas.                                                        |
| `vynavigation`              | Ej implementerat           | Spelaren kan återgå till kartan från planet- och forskningsinformationen. Vald ruta och kartans läge bevaras tills sidan laddas om.                                   |
| `flera-skarmstorlekar`      | Ej implementerat           | Spelet går att använda på mobil, surfplatta och dator.                                                                                                                |
| `direktatkomst-utan-lankar` | Fullständigt implementerat | Appen nås via sin direktadress utan nya länkar eller navigationsval på den befintliga webbplatsen.                                                                    |

## Fortsatt spelutveckling

| Kravnamn                          | Status           | Krav och återstående arbete                                                                                                                   |
| --------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `stjarnsystem-och-asteroidbalten` | Ej implementerat | Världen innehåller stjärnsystem med fasta planeter, gasplaneter och asteroidbälten.                                                           |
| `planetforvaltning`               | Ej implementerat | Planeter har namn, råvarutillgångar i enheter per år och 0–10 byggplatser och kan utvecklas genom spelarens order.                            |
| `kolonisation`                    | Ej implementerat | Kolonisationsskepp kan skapa kolonier på obebodda planeter.                                                                                   |
| `befolkningsutveckling`           | Ej implementerat | Kolonins befolkning kan öka och minska beroende på hur planeten utvecklas.                                                                    |
| `gastvanlighet`                   | Ej implementerat | Gästvänlighet ligger mellan 0 och 100 procent och kan öka och minska. En oförstörd jord motsvarar ungefär 100, Mars 25 och Jupiter 0 procent. |
| `fabrikbyggande`                  | Ej implementerat | Spelaren kan ge order om att bygga och ta bort fabriker.                                                                                      |
| `bygga-forskningsstation`         | Ej implementerat | Spelaren kan bygga en forskningsstation redan från spelets början.                                                                            |
| `produktion`                      | Ej implementerat | Fabriker kan producera kolonisationsskepp, andra skepp, habitat, forskningsstationer, terraformare och senare andra saker.                    |
| `fororeningar`                    | Ej implementerat | Fabriker kan försämra gästvänligheten genom utsläpp.                                                                                          |
| `habitat`                         | Ej implementerat | Habitat möjliggör större befolkning även på ogästvänliga planeter.                                                                            |
| `terraformning`                   | Ej implementerat | Terraformare kan öka gästvänligheten.                                                                                                         |
| `forskningstrad`                  | Ej implementerat | Forskning låser upp nya och bättre fabriker och tekniker, exempelvis mindre föroreningar och färre arbetare.                                  |
| `arsrundor-och-order`             | Ej implementerat | Varje spelår ger spelaren order till planeter, forskning och flottor och inväntar resultatet. Tiden går långsamt.                             |
| `manuell-rundstyrning`            | Ej implementerat | Under utveckling kan spelåren styras manuellt.                                                                                                |
| `flottor`                         | Ej implementerat | En flotta har minst ett skepp, kan delas upp och ges koordinater att resa till.                                                               |
| `civilisationskontakt`            | Ej implementerat | Flottor kan få order för första kontakt och möten med kända civilisationer.                                                                   |
| `multiplayer`                     | Ej implementerat | Flera spelare kan delta, med riktningen en eller två rundor per verkligt dygn.                                                                |
| `sparat-spel`                     | Ej implementerat | Sparning och återupptagning tillkommer senare; första exempelvärlden återställs vid omladdning.                                               |

## Ändringshistorik

- 2026-10-17: `tom-startsida` ersätts av den beslutade spelvisionen och kraven
  ovan. Den tomma startsidan är inte längre ett aktivt produktkrav.
- Första iterationen omfattar enbart karta, navigation och läsbara vyer.
  Tillgängliga byggalternativ innebär inte fungerande byggorder.
