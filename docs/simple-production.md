# Förenklad produktion (utforskning)

**Utforskning på branchen `simple_production`.** Kraven gäller bara inom
utforskningen. De följer med till `development` först när användaren ber om
det, och försvinner om konceptet kastas. Låsta 2026-11-18.

Dagens Route och Production styr för detaljerat, särskilt på mobil. Konceptet
ersätter fysisk materialfrakt mellan enskilda planeter med ett nätverk där
råvaror och delar delas. Det som fortfarande är platsbundet är var råvaror
utvinns och var slutprodukter tillverkas.

Alla krav nedan har status **Ej implementerat**.

## Produktionsnivåer

| Kravnamn                        | Produktkrav                                                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tre-produktionsnivaer`         | Produktionen har tre nivåer: råvaror (`Iron`, `Water`, `Oil`), delar (exempelvis `Rocket engine`, `Weapons module`, teleskop) och slutprodukter (skepp). Katalogen motsvarar dagens men ska kunna växa. |
| `skepp-kostar-bara-delar`       | Skepp kostar enbart delar, inte råvaror direkt.                                                                                                                                                         |
| `byggnader-kostar-raavaror`     | Byggnader, även fabriker, kostar råvaror ur nätverkets gemensamma lager.                                                                                                                                |
| `en-enhet-per-fabrik-och-runda` | Varje fabrik tillverkar högst en enhet per runda. Två fabriker för samma del ger två delar per runda. Längre tillverkningstid uppstår genom delkedjan, inte genom en egen tid per produkt.              |
| `blockerad-fabrik`              | En fabrik som inte får sina råvaror eller delar färdigställer inte sin enhet den rundan.                                                                                                                |
| `delar-tillverkas-pa-behov`     | En delfabrik tillverkar bara när en beställd slutprodukt eller byggnad i nätverket behöver delen.                                                                                                       |
| `slutproduktfabrik-utan-order`  | En slutproduktfabrik utan beställning står still.                                                                                                                                                       |
| `standardregel-vid-brist`       | Räcker insatsvarorna inte till alla fabriker fördelas de med en fast regel utan spelarstyrning: den fabrik som väntat längst får först, och vid lika går en slutproduktfabrik före en delfabrik.        |
| `parallella-byggen`             | Planetens `Build queue` finns kvar för byggnader. Flera byggnader kan beställas på en gång och byggs samtidigt så långt råvaror och arbetare räcker.                                                    |

Dagens personalregler för fabriker gäller fortsatt.

## Plats

| Kravnamn                   | Produktkrav                                                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `utvinning-vid-fyndighet`  | En råvarufabrik står på en planet där råvaran finns och utvinner tills fyndigheten är slut. Olika planeter har olika råvaror.                                                                                            |
| `slutprodukt-vid-fabriken` | En slutprodukt tillverkas och levereras vid sin fabrik. Spelaren bygger slutproduktfabriken där produkten behövs.                                                                                                        |
| `delat-lager-i-natverket`  | Råvaror och delar inom ett nätverk är tillgängliga för alla dess fabriker och byggen, oavsett var de tillverkats, efter transporttiden enligt `en-runda-per-lank`. Lagret har inget tak.                                 |
| `en-runda-per-lank`        | Varje länk mellan två planeter tar en runda att passera. En vara som används på samma planet är tillgänglig direkt, en länk bort efter en runda och två länkar bort efter två rundor. Kartavståndet påverkar inte tiden. |
| `kortaste-vag-i-lankar`    | Varor går automatiskt den väg som har minst antal länkar. Vid lika används en stabil ordning. Spelaren styr inte vägen.                                                                                                  |

`en-runda-per-lank` ersätter `avstand-utan-betydelse` (2026-11-18). Tidigare
påverkade avståndet varken tillgång eller tid. Nu påverkar antalet länkar
tiden, och en tätare förbunden grupp blir därmed snabbare.

Varje vara har i modellen en plats: en planet eller en länk där den är på väg.
Den behåller också sin ursprungsplanet. Det krävs för
`varor-stannar-vid-delning` och `erovrad-last`.

## Nätverk och fraktskepp

| Kravnamn                          | Produktkrav                                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `produktionsnatverk`              | Ägda planeter och anslutna mining ships som hänger ihop via aktiva routes bildar ett nätverk. Det kan finnas flera separata nätverk.                                      |
| `fraktskepp-ger-forbindelse`      | En route är aktiv när ett `Transport ship` är tilldelat den. Ett skepp räcker åt båda hållen och har obegränsad kapacitet. Fler fraktskepp ger fler möjliga förbindelser. |
| `flytta-fraktskepp-mellan-routes` | Spelaren kan flytta ett fraktskepp från en route till en annan och därmed prioritera bort en del av nätverket. Spelaren ser när en route saknar fraktskepp.               |
| `varor-stannar-vid-delning`       | Delas ett nätverk stannar varje vara i den del där den tillverkades.                                                                                                      |
| `erovrad-last`                    | Förstörs eller erövras ett fraktskepp får erövraren lasten, det vill säga det som är på väg över routen just då. Nätverket delas om det inte finns någon annan väg.       |
| `eskort-pa-routes`                | Eskort kan tilldelas en route och skyddar dess fraktskepp. Bygger vidare på `rutt-eskortfordelning`.                                                                      |

## Mining ships

| Kravnamn                 | Produktkrav                                                                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mining-ships`           | Mining ships utvinner råvaror ur nebulosor och asteroidbälten. Utvinningen styrs på kartan.                                                                                       |
| `mining-ship-anslutning` | Ett mining ship är anslutet till nätverket när ett fraktskepp har routen mellan skeppet och den ägda planet som ligger närmast på kartan. Flyttas mining ship flyttas routen med. |

## Sparade spel

`sparade-spel-bryts-i-utforskningen`: användaren har godkänt att utforskningen
bryter tidigare sparade spel. `avstamning-sparkompatibilitet` gäller som vanligt
för senare ändringar.

## Utanför denna omgång

- **Vyn** prototypas separat, eventuellt på flera brancher. Den behöver inte
  bygga på kartan. Byggandet av råvaru- och slutproduktfabriker och styrningen
  av mining ships sker sannolikt kvar på kartan.
  Underlag till vyn från prototyperna hittills:
  - **Skärm 1, `Build factories` (låst 2026-11-18):**
    - Förbundna planeter visas som en grupp. Rubriken anger planeterna,
      antalet planeter och antalet länkar.
    - Överst i varje grupp finns en liten graf över länkarna, där planeterna
      ligger ungefär som i världen. Listan under visar inga länkar.
    - Gruppen visar antalet fabriker per typ. En fabrikstyp som saknar
      insatsvaror i gruppen markeras röd med orsaken.
    - Planeterna står i bokstavsordning med råvaror och byggplatser.
    - Både grupper och planeter kan fällas ihop. En hopfälld planet
      sammanfattar sina platser, till exempel `4/6 sites`.
    - En byggplats är tom (kan väljas), låst (`Needs Dome`) eller upptagen av
      en fabrik.
    - En fabrik har ett av fyra tillstånd:
      - arbetar
      - byggs, med rundor, till exempel `Building 1/2`
      - tillverkar, med rundor, till exempel `3/4 rounds`
      - saknar insatsvaror (röd)

      En fabrik utan order visas som `Idle`.

    - Rundorna visar hur många som gått av totalen. Totalen räknas om vid
      förseningar, till exempel när en länk bryts. Antalet rundor som gått
      minskar aldrig.
    - Gruppen får en Connect-knapp till höger i rubriken när den kan bygga
      transporter.
    - Ett köat bygge visas som en gul plats med `Queued`.
  - **Skärm 2, val av byggnad (låst 2026-11-18):**
    - Skärmen öppnas genom tryck på en tom byggplats. Ett val fyller bara den
      platsen, och man bygger på fler platser genom att trycka på var och en.
    - Rubriken visar planet, plats och grupp. Under den visas gruppens lager
      och lediga arbetare.
    - Byggnaderna är grupperade efter nivå, med en ledtråd i rubriken, till
      exempel `Lyra has Water` och `ships appear at Lyra`.
    - Varje rad visar:
      - kostnad
      - antal i gruppen, till exempel `2 in group`, `0 + 1 building` eller
        `here`
      - byggtid i rundor
      - för delfabriker: hur många rundor bort insatsvarorna finns
      - för slutproduktfabriker: en uppskattad produkttid, till exempel
        `Fighter ~4 rounds`

      Tiden med `~` ändras när länkarna ändras.

    - En byggnad som inte passar planeten grånas med orsaken, till exempel
      `No Iron on Lyra`.
    - Räcker lagret visas `Build`. Annars visas `Queue` och en tagg med det
      som fattas, till exempel `Short: Water 3, Oil 2`.
    - Köade byggen ligger i kö. Alla som har råvaror och arbetare byggs
      samtidigt, och vid brist gäller `standardregel-vid-brist`.
  - En grupp som kan bygga transporter får en Connect-knapp. Knappen öppnar
    en graf där noderna ligger ungefär som i världen och varje fullt
    förbunden grupp visas som en enda nod.
  - De två närmaste planeterna förbinds automatiskt.
  - Ett ledigt fraktskepp används före ett nytt bygge.
  - Spelaren väljer själv planeterna för en extra förbindelse inom en grupp.
  - Vyn visar tid, till exempel när en vara kommer fram, och vilken tid en ny
    förbindelse sparar. Tiden visas också när en fabrik ska byggas.
- Hur mycket ett mining ship utvinner per runda, och vilka råvaror nebulosor
  och asteroidbälten har, bestäms senare.

## Krav som ersätts vid implementation

Följande krav ersätts när motsvarande delar ovan implementeras. Deras tester
ändras eller tas bort samtidigt: `route-kartvy`, `produktions-kartvy`,
`byggprojektets-forsorjningskedja`, `forsorjningsproblem-pa-kartan`,
`automatiska-delorder`, `leveransfloden`, `forsorjningsstatus`,
`projektens-forsorjningssteg`, `transportbygge-i-forsorjningssteg` och de
fysiska transportreglerna i [försörjningsreglerna](supply-production.md).
Exakt omfattning bestäms per implementationssteg.
