# Produktkrav och status

Visionen beskrivs i [game-vision.md](game-vision.md). Namnen är stabila referenser.
**Fullständigt implementerat** avser hela det beskrivna kravet, inte hela spelet.
För delvisa krav anges vad som återstår. Exempelvärden är inte beslut om balans.

## Första spelgrunden

| Kravnamn                    | Status                     | Krav och återstående arbete                                                                                                                                                                                                                       |
| --------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fast-exempelvarld`         | Fullständigt implementerat | En återkommande exempelvärld med tre åtskilda stjärnsystem, både gasplaneter och fasta planeter och exakt en ägd hemplanet. Världen börjar om när spelaren laddar om.                                                                             |
| `hexkarta`                  | Fullständigt implementerat | En stjärna upptar en hexagon och dess planeter varsin direkt grannhexagon, högst en planet per hexagon. Tom rymd skiljer systemen åt.                                                                                                             |
| `statisk-planetplacering`   | Fullständigt implementerat | Stjärnor och planeter ligger stilla på kartan.                                                                                                                                                                                                    |
| `lokal-sikt`                | Fullständigt implementerat | Hemplanetens hexagon och dess sex grannar är synliga. Övrigt planetinnehåll är dolt.                                                                                                                                                              |
| `synliga-stjarnor`          | Fullständigt implementerat | Alla stjärnpositioner kan ses även utanför den lokala sikten.                                                                                                                                                                                     |
| `kartnavigation`            | Fullständigt implementerat | Spelaren kan markera rutor, zooma, panorera och återgå till hemplaneten med mus, touch och knappar. Dragning ska inte välja en ruta.                                                                                                              |
| `planetinformation`         | Fullständigt implementerat | Spelaren kan öppna en ägd planet och se namn, ägare, befolkning, gästvänlighet, resurser, byggplatser och byggnader.                                                                                                                              |
| `visa-byggalternativ`       | Fullständigt implementerat | En tom byggplats öppnar en meny med enbart upplåsta byggnader. Varje val visar pris i årliga resurser, personal, bildplatshållare och effekt. Otillräckliga resurser eller personal gråmarkerar och spärrar valet. Skepp ingår inte i denna meny. |
| `forskningsoversikt`        | Fullständigt implementerat | Research visar valbar fabriksforskning, pågående forskning och färdiga upplåsningar samt antal arbetande Research stations.                                                                                                                       |
| `vynavigation`              | Fullständigt implementerat | Spelaren kan återgå till kartan från planet- och forskningsinformationen. Vald ruta och kartans läge bevaras tills sidan laddas om.                                                                                                               |
| `flera-skarmstorlekar`      | Fullständigt implementerat | Spelet går att använda på mobil, surfplatta och dator.                                                                                                                                                                                            |
| `direktatkomst-utan-lankar` | Fullständigt implementerat | Appen nås via sin direktadress utan nya länkar eller navigationsval på den befintliga webbplatsen.                                                                                                                                                |

## Spelupplevelse

| Kravnamn               | Status                     | Krav och återstående arbete                                                                                                                                                                             |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `viewport-game-layout` | Fullständigt implementerat | Alla vyer fyller skärmen utan sidscroll på mobil, surfplatta och dator, även med större systemtypsnitt på smala skärmar. Avgränsade spelpaneler får ha intern scroll. Kartan tar huvuddelen av skärmen. |
| `focused-interface`    | Fullständigt implementerat | Visa spelinformation och handlingar utan introduktionsrubriker och dekorativa småtexter. Behåll beskrivningar av stjärnor och planeter.                                                                 |
| `english-game`         | Fullständigt implementerat | Alla texter, hjälptexter och namn på råvaror i spelet är på engelska.                                                                                                                                   |

## Fortsatt spelutveckling

| Kravnamn                          | Status                     | Krav och återstående arbete                                                                                                                                                                                                                                                                                                                    |
| --------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stjarnsystem-och-asteroidbalten` | Delvis implementerat       | Stjärnsystem med fasta planeter och gasplaneter finns. Asteroidbälten återstår.                                                                                                                                                                                                                                                                |
| `planetforvaltning`               | Delvis implementerat       | Namn, årsresurser, befolkning, 0–10 bestämda byggplatser och byggnader kan förvaltas för alla egna kolonier. Kolonisering finns; ytterligare planetutveckling återstår.                                                                                                                                                                        |
| `kolonisation`                    | Fullständigt implementerat | Colonize på Star map grundar en ägd koloni på en obebodd planet när ett Colony ship finns på dess hexagon. Exakt ett skepp förbrukas och dess 1 000 personer blir kolonins befolkning. Kolonin går att öppna, får planetens byggplatser och årsresurser, växer och använder imperiets upplåsta byggnader. Planeten och dess grannar utforskas. |
| `befolkningsutveckling`           | Fullständigt implementerat | Efter varje år växer befolkningen med tio procent, skalat efter gästvänlighet, efter avdragen skeppsbesättning.                                                                                                                                                                                                                                |
| `gastvanlighet`                   | Delvis implementerat       | Gästvänlighet mellan 0 och 100 procent finns och visas. Förändringar över tid återstår; exempelvärden motsvarar ungefär jorden 100, Mars 25 och Jupiter 0 procent.                                                                                                                                                                             |
| `fabrikbyggande`                  | Fullständigt implementerat | Upplåsta fabriker kan byggas på bestämda tomma byggplatser. Alla tre skeppsfabriker är permanenta shipyards. Bygge kan avbrytas och rivning schemaläggas eller ångras.                                                                                                                                                                         |
| `bygga-forskningsstation`         | Fullständigt implementerat | Research station kan byggas från start utan forskning på en ledig ägd byggplats, även flera per planet.                                                                                                                                                                                                                                        |
| `produktion`                      | Delvis implementerat       | `Colony ship`, `Exploration ship` och `Fighter` produceras enligt fabriksreglerna. Övriga produkter återstår.                                                                                                                                                                                                                                  |
| `fororeningar`                    | Ej implementerat           | Fabriker kan försämra gästvänligheten genom utsläpp.                                                                                                                                                                                                                                                                                           |
| `habitat`                         | Ej implementerat           | Habitat möjliggör större befolkning även på ogästvänliga planeter.                                                                                                                                                                                                                                                                             |
| `terraformning`                   | Ej implementerat           | Terraformare kan öka gästvänligheten.                                                                                                                                                                                                                                                                                                          |
| `forskningstrad`                  | Delvis implementerat       | Research station låser upp de tre befintliga skeppsfabrikerna genom valbar forskning. Bättre fabriker, minskade utsläpp och effektivare arbetskraft återstår.                                                                                                                                                                                  |
| `arsrundor-och-order`             | Fullständigt implementerat | Spelaren ger order, kan ändra bygg- och flyttorder före årets slut, avslutar året och ser en händelsesammanfattning. Colonize grundar kolonin direkt.                                                                                                                                                                                          |
| `manuell-rundstyrning`            | Ej implementerat           | Under utveckling kan spelåren styras manuellt.                                                                                                                                                                                                                                                                                                 |
| `flottor`                         | Delvis implementerat       | Flottor kan döpas, delas på samma hexagon och få destinationer från `Star map`. Strid och diplomati återstår.                                                                                                                                                                                                                                  |
| `arsbudget`                       | Fullständigt implementerat | Planetens råvaror är en årsbudget som reserveras av drift och order.                                                                                                                                                                                                                                                                           |
| `arbetskraft-och-besattning`      | Fullständigt implementerat | Byggnader, projekt och skepp reserverar arbetare och besättning.                                                                                                                                                                                                                                                                               |
| `skeppstyper`                     | Fullständigt implementerat | `Colony ship`, `Exploration ship` och `Fighter` har fasta roller, fart och besättning.                                                                                                                                                                                                                                                         |
| `flottadministration`             | Fullständigt implementerat | `Fleets` visar en rad per flotta och en cell per skeppstyp. Ett skepp kan dras eller väljas och flyttas till en samlokaliserad flotta.                                                                                                                                                                                                         |
| `tomma-flottor`                   | Fullständigt implementerat | Tomma flottor behåller namn och rad, saknar destination och kan tas bort uttryckligen.                                                                                                                                                                                                                                                         |
| `flottdestinationer`              | Fullständigt implementerat | En destination väljs på `Star map`, kan ändras eller rensas före årets slut och kan inte ges till en tom flotta.                                                                                                                                                                                                                               |
| `kartflottor`                     | Fullständigt implementerat | Varje egen flotta med skepp visas som en separat liten svärm av trianglar, även utanför synlig rymd. Samlokaliserade flottor hålls isär. Skeppstyper har olika storlek. Varje skeppstriangel pekar med spetsen mot flottans destination, och destinationspilen utgår från flottan. Tomma flottor saknar kartmarkör.                            |
| `rundsimulering`                  | Fullständigt implementerat | Flottor färdas samtidigt längs kortaste väg enligt långsammaste skeppets fart.                                                                                                                                                                                                                                                                 |
| `handelser`                       | Fullständigt implementerat | Händelser visas efter året och sparas under sessionen.                                                                                                                                                                                                                                                                                         |
| `skeppsutforskning`               | Fullständigt implementerat | Alla skepp synliggör besökt hexagon permanent. `Exploration ship` synliggör även dess grannar.                                                                                                                                                                                                                                                 |
| `planetbudgetoversikt`            | Fullständigt implementerat | `Overview` och `Construction` visar resurser, befolkning och byggplatser som totalt, använt/reserverat och tillgängligt.                                                                                                                                                                                                                       |
| `civilisationskontakt`            | Ej implementerat           | Flottor kan få order för första kontakt och möten med kända civilisationer.                                                                                                                                                                                                                                                                    |
| `multiplayer`                     | Ej implementerat           | Flera spelare kan delta, med riktningen en eller två rundor per verkligt dygn.                                                                                                                                                                                                                                                                 |
| `sparat-spel`                     | Ej implementerat           | Sparning och återupptagning tillkommer senare; första exempelvärlden återställs vid omladdning.                                                                                                                                                                                                                                                |

## Byggnader och byggkö

| Kravnamn                        | Status                     | Krav                                                                                                                                                                                                                                                             |
| ------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `byggnaders-resursanvandning`   | Fullständigt implementerat | Varje bebyggd plats visar byggnadens effekt, årliga användning av Iron, Water och Oil, arbetare och rivningsknapp. Schemalagd rivning frigör driftreservationerna men platsen blir tom först efter året.                                                         |
| `flera-byggnader-av-samma-typ`  | Fullständigt implementerat | Flera byggnader av samma typ får beställas och finnas på en planet inom antalet byggplatser. Även `Research station` får finnas i flera exemplar.                                                                                                                |
| `skepp-i-byggko`                | Fullständigt implementerat | Colony ship, Exploration ship och Fighter beställs enbart hos motsvarande färdiga shipyard. Skeppsorder delar aldrig kö med byggnader. Fabriksbygge skapar inga skepp.                                                                                           |
| `skepp-till-destinationsflotta` | Fullständigt implementerat | Varje skeppsorder kan få en mottagande flotta vid planeten, både vid beställning och senare i kön. Utan val används planetens hemflotta. Om mottagaren har lämnat planeten eller tagits bort används hemflottan; saknas en hemflotta vid planeten skapas en där. |

| `planetbyggplatser` | Fullständigt implementerat | Varje planet har ett fast antal numrerade byggplatser. Varje plats är tom, under konstruktion eller innehåller en byggnad. Byggnader behåller sin plats vid andra byggen och rivningar. Olika platser kan färdigställa byggnader samma år. |
| `fabrikskoer` | Fullständigt implementerat | Varje shipyard har en egen Build queue med fem platser, även tomma köplatser visas. Order kan flyttas inom samma kö eller avbrytas. Högst ett skepp färdigställs per fabrik och år, flera fabriker arbetar parallellt. En spärrad order ligger kvar och senare order går inte före i samma kö. Rivning av fabriken avbryter dess kö. |
| `forska-fram-fabriker` | Fullständigt implementerat | Imperiet kan välja, byta eller avbryta forskning för Colony ship factory, Exploration ship factory och Fighter factory. En färdig bemannad Research station ger en poäng per år; en fabriksteknik kostar en poäng. Högst vald teknik färdigställs per år. Nybyggda stationer forskar från nästa år och stationer markerade för rivning forskar inte. Upplåsningen gäller alla kolonier. |
| `kartorderstatus` | Fullständigt implementerat | Star map markerar varje ägd planet med antal tomma byggplatser (S) och helt tomma shipyard-köer (Q), med en förklaring på kartan. Vald planet visar samma information i klartext. Planeter utan sådana ordermöjligheter får ingen markering. |

Årsbudgeten behålls: drift och pågående byggnadsbyggen reserverar resurser och
arbetare. Varje fabrik kan dessutom reservera årets kostnad och besättning för
sin första skeppsorder; senare order väntar utan reservation. Byggnadens pris
är dess årliga resurs- och personalbehov, inget råvarulager införs.
Alla färdiga fabriker behåller arbetarna även när kön är tom.

Samtidiga skeppsorder tilldelas återstående årsbudget i byggplatsernas ordning.
En order som inte ryms väntar; andra fabriker kan fortfarande arbeta om deras
order ryms. Kostnaden prövas igen varje år, utan dubbel användning av samma
resurser eller befolkning. Ett skepp minskar planetens befolkning med sin
besättning. Exempelvärden för produktion är Iron/Water/Oil: Colony ship 6/3/1,
Exploration ship 3/2/1, Fighter 2/1/1; arbetarna täcks av shipyardens drift.

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

- 2026-10-18: Användarens nya byggsystem ersätter `gemensam-byggko` med
  `planetbyggplatser` och `fabrikskoer`. `skepp-i-byggko` gäller nu enbart
  skepp i respektive shipyard. Alla skeppsfabriker är permanenta och ger inga
  automatiska skepp vid färdigställning. Skeppens produktionskostnader är
  separata från fabrikernas drift. `forska-fram-fabriker` ersätter omedelbart
  tillgängliga fabriker och den tidigare inaktiva forskningsinformationen.
  `kolonisation` omfattar nu fungerande kolonisering. `kartorderstatus` tillkommer.
