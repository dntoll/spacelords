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
| `planetinformation`         | Fullständigt implementerat | Spelaren kan öppna en ägd planet och se namn, planettyp, ägare, befolkning, gästvänlighet, råvaror per år och tillgängliga respektive använda byggplatser.            |
| `visa-byggalternativ`       | Fullständigt implementerat | Forskningsstationen presenteras som tillgänglig från start. I första steget framgår att byggande ännu inte går att genomföra.                                         |
| `forskningsoversikt`        | Fullständigt implementerat | Spelaren kan läsa om framtida forskning och forskningsstationens roll. Inget preliminärt forskningsträd visas.                                                        |
| `vynavigation`              | Fullständigt implementerat | Spelaren kan återgå till kartan från planet- och forskningsinformationen. Vald ruta och kartans läge bevaras tills sidan laddas om.                                   |
| `flera-skarmstorlekar`      | Fullständigt implementerat | Spelet går att använda på mobil, surfplatta och dator.                                                                                                                |
| `direktatkomst-utan-lankar` | Fullständigt implementerat | Appen nås via sin direktadress utan nya länkar eller navigationsval på den befintliga webbplatsen.                                                                    |

## Spelupplevelse

| Kravnamn               | Status           | Krav och återstående arbete                                                                                                                     |
| ---------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `viewport-game-layout` | Ej implementerat | Alla vyer fyller skärmen och används utan scroll på mobil, surfplatta och dator, i stående och liggande läge. Kartan tar huvuddelen av skärmen. |
| `focused-interface`    | Ej implementerat | Visa spelinformation och handlingar utan introduktionsrubriker och dekorativa småtexter. Behåll beskrivningar av stjärnor och planeter.         |
| `english-game`         | Ej implementerat | Alla texter, hjälptexter och namn på råvaror i spelet är på engelska.                                                                           |

## Fortsatt spelutveckling

| Kravnamn                          | Status               | Krav och återstående arbete                                                                                                                                        |
| --------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `stjarnsystem-och-asteroidbalten` | Delvis implementerat | Stjärnsystem med fasta planeter och gasplaneter finns. Asteroidbälten återstår.                                                                                    |
| `planetforvaltning`               | Delvis implementerat | Namn, råvaror i enheter per år och 0–10 byggplatser finns och visas för hemplaneten. Order och planetens utveckling återstår.                                      |
| `kolonisation`                    | Ej implementerat     | Kolonisationsskepp kan skapa kolonier på obebodda planeter.                                                                                                        |
| `befolkningsutveckling`           | Ej implementerat     | Kolonins befolkning kan öka och minska beroende på hur planeten utvecklas.                                                                                         |
| `gastvanlighet`                   | Delvis implementerat | Gästvänlighet mellan 0 och 100 procent finns och visas. Förändringar över tid återstår; exempelvärden motsvarar ungefär jorden 100, Mars 25 och Jupiter 0 procent. |
| `fabrikbyggande`                  | Ej implementerat     | Spelaren kan ge order om att bygga och ta bort fabriker.                                                                                                           |
| `bygga-forskningsstation`         | Ej implementerat     | Spelaren kan bygga en forskningsstation redan från spelets början.                                                                                                 |
| `produktion`                      | Ej implementerat     | Fabriker kan producera kolonisationsskepp, andra skepp, habitat, forskningsstationer, terraformare och senare andra saker.                                         |
| `fororeningar`                    | Ej implementerat     | Fabriker kan försämra gästvänligheten genom utsläpp.                                                                                                               |
| `habitat`                         | Ej implementerat     | Habitat möjliggör större befolkning även på ogästvänliga planeter.                                                                                                 |
| `terraformning`                   | Ej implementerat     | Terraformare kan öka gästvänligheten.                                                                                                                              |
| `forskningstrad`                  | Ej implementerat     | Forskning låser upp nya och bättre fabriker och tekniker, exempelvis mindre föroreningar och färre arbetare.                                                       |
| `arsrundor-och-order`             | Ej implementerat     | Varje spelår ger spelaren order till planeter, forskning och flottor och inväntar resultatet. Tiden går långsamt.                                                  |
| `manuell-rundstyrning`            | Ej implementerat     | Under utveckling kan spelåren styras manuellt.                                                                                                                     |
| `flottor`                         | Ej implementerat     | En flotta har minst ett skepp, kan delas upp och ges koordinater att resa till.                                                                                    |
| `civilisationskontakt`            | Ej implementerat     | Flottor kan få order för första kontakt och möten med kända civilisationer.                                                                                        |
| `multiplayer`                     | Ej implementerat     | Flera spelare kan delta, med riktningen en eller två rundor per verkligt dygn.                                                                                     |
| `sparat-spel`                     | Ej implementerat     | Sparning och återupptagning tillkommer senare; första exempelvärlden återställs vid omladdning.                                                                    |

## Ändringshistorik

- 2026-10-17: `tom-startsida` ersätts av den beslutade spelvisionen och kraven
  ovan. Den tomma startsidan är inte längre ett aktivt produktkrav.
- Första iterationen omfattar enbart karta, navigation och läsbara vyer.
  Tillgängliga byggalternativ innebär inte fungerande byggorder.

- 2026-10-17: Användaren ersätter webbsidelayouten med skärmfyllande spelvyer utan
  scroll. Engelska ersätter svenska i spelet. Beskrivningar av himlakroppar behålls.
- 2026-10-17: Produktkravsfilen heter `product-requirements.md` för att skiljas från
  rotens kravöversikt. Innehåll och stabila kravnamn behålls.
