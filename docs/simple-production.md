# Förenklad produktion (utforskning)

**Utforskning på branchen `simple_production`.** Kraven gäller bara inom
utforskningen. De följer med till `development` först när användaren ber om
det, och försvinner om konceptet kastas. Låsta 2026-11-18.

Dagens Route och Production styr för detaljerat, särskilt på mobil. Konceptet
ersätter fysisk materialfrakt mellan enskilda planeter med ett nätverk där
råvaror och delar delas. Det som fortfarande är platsbundet är var råvaror
utvinns och var slutprodukter tillverkas.

Status per krav finns under [Implementationsstatus](#implementationsstatus).

## Produktionsnivåer

| Kravnamn                        | Produktkrav                                                                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tre-produktionsnivaer`         | Produktionen har tre nivåer: råvaror (`Iron`, `Water`, `Oil`), delar (exempelvis `Rocket engine`, `Weapons module`, teleskop) och slutprodukter (skepp). Katalogen motsvarar dagens men ska kunna växa.       |
| `skepp-kostar-bara-delar`       | Skepp kostar enbart delar, inte råvaror direkt.                                                                                                                                                               |
| `byggnader-kostar-raavaror`     | Byggnader, även fabriker, kostar råvaror ur nätverkets gemensamma lager.                                                                                                                                      |
| `en-enhet-per-fabrik-och-runda` | Varje fabrik tillverkar högst en enhet per runda. Två fabriker för samma del ger två delar per runda. Längre tillverkningstid uppstår genom delkedjan, inte genom en egen tid per produkt.                    |
| `blockerad-fabrik`              | En fabrik som inte får sina råvaror eller delar färdigställer inte sin enhet den rundan.                                                                                                                      |
| `delar-tillverkas-pa-behov`     | En delfabrik tillverkar bara när en beställd slutprodukt eller byggnad i nätverket behöver delen.                                                                                                             |
| `slutproduktfabrik-utan-order`  | En slutproduktfabrik utan beställning står still.                                                                                                                                                             |
| `standardregel-vid-brist`       | Räcker insatsvarorna inte till alla fabriker fördelas de med en fast regel utan spelarstyrning: den fabrik som väntat längst får först, och vid lika går en slutproduktfabrik före en delfabrik.              |
| `parallella-byggen`             | Planeten har en egen kö för byggnader, skild från skeppsorder. Flera byggnader kan beställas på en gång och byggs samtidigt så långt råvaror och arbetare räcker.                                             |
| `skeppsorder-pa-planeten`       | Skepp beställs på planetnivå från kartans Production. Varje slutproduktfabrik på planeten tar nästa order av sin typ, så fabrikerna arbetar samtidigt. Kön innehåller bara skepp, inte delar eller byggnader. |

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

Beslut inför implementationen (2026-11-18):

- `fraktskepp-ligger-stilla`: ett tilldelat fraktskepp reser inte längs sin
  route utan ligger stilla vid den. Pirater anfaller det där, och vinner de
  gäller `erovrad-last`.
- `ovriga-byggnader-pa-byggplatser`: byggnader som inte är fabriker, till
  exempel Research station, Domes, terraformingfabriker och Orbital
  shipyard, byggs på byggplatserna, kostar råvaror och fungerar i övrigt som
  i dag.
- `basta-tillgangliga-del`: skepp väljer fortsatt bästa tillgängliga del,
  till exempel Ion pulse engine före Rocket engine och högsta teleskopet.
- `befolkningsutjamning-i-grupp`: Civilian shuttles jämnar ut befolkningen
  mellan planeterna i en grupp, så att en ny planet snabbare får befolkning.
  Det ersätter dagens resor längs enskilda routes.
- Testläget `Factory screens` tas bort när de riktiga skärmarna finns.

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
  - **Befintliga symboler (`befintliga-symboler-i-nya-vyer`):** de nya
    skärmarna använder spelets nuvarande symboler och bilder för fabriker,
    byggnader, delar, råvaror, skepp och planeter, till exempel
    `BUILDING_SYMBOLS`, `buildingImage`, `SHIP_IMAGES` och
    `renderPlanetGlyph`. Ikonerna i prototypbilderna är bara platshållare.
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
    - Gruppen får en Connect-knapp till höger i rubriken när den själv eller
      en grupp den kan ansluta till har ett ledigt fraktskepp eller kan bygga
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
    - Ett tryck på en köad eller pågående byggnad öppnar platsen med
      `Cancel construction` (2026-11-19). Det ersätter att avbryta via
      kartans Production, som bara hanterar skepp.
  - **Connect-skärmen (låst 2026-11-18):**
    - Skärmen öppnas från Connect-knappen på skärm 1. En grupp med eget
      ledigt fraktskepp eller egen Transport ship factory använder det.
      En grupp utan transport kan ansluta till en grupp som har det och
      lånar då den gruppens fraktskepp eller fabrik (ändrat 2026-11-19;
      ersätter regeln att bara egna fraktskepp används).
    - En graf visar grupperna ungefär där de ligger i världen. Varje fullt
      förbunden grupp visas som en enda nod, och möjliga förbindelser är
      streckade.
    - Varje förslag anger vilka två planeter som förbinds. Det är alltid de
      två närmaste, och de väljs automatiskt.
    - Varje förslag visar vad det ger. Förslag som löser ett problem står
      först och anger vad de löser, till exempel
      `Unblocks Rocket engine at Vega`. Övriga förslag står i bokstavsordning,
      med till exempel `Adds Iron`.
    - Ett ledigt fraktskepp är förvalt. Annars byggs ett nytt, och den
      uppskattade byggtiden visas.
    - Ett tryck på den egna gruppens nod visar länkarna inom gruppen. Där
      väljer spelaren själv två planeter för en extra förbindelse. Förslaget
      visar sparad tid och om gruppen då klarar att en länk försvinner.
    - `Current links` listar gruppens länkar med sina fraktskepp. `Move`
      frigör skeppet och öppnar förslagen med skeppet förvalt. Om flytten
      delar gruppen varnar skärmen först, till exempel
      `Splits Lyra from group`.
  - **Beställning av skepp (låst 2026-11-18):** ett tryck på en
    slutproduktfabrik på skärm 1 öppnar kartans Production för planeten.
    Där visas bara skepp. Kostnaden visas i delar och tiden i rundor, till
    exempel `3/4 rounds` och `~4 rounds`. I stället för försörjningskedjan på
    kartan visas vilka delar som finns i gruppen och hur många rundor bort de
    är. På skärm 1 visar en slutproduktfabrik med order sitt framsteg och hur
    många fler som är beställda, till exempel `3/4 rounds · 2 more`.
  - Vyn visar tid, till exempel när en vara kommer fram, och vilken tid en ny
    förbindelse sparar. Tiden visas också när en fabrik ska byggas.
- Hur mycket ett mining ship utvinner per runda, och vilka råvaror nebulosor
  och asteroidbälten har, bestäms senare.

## Implementationsstatus

Fas 1 (spelmodellen) och fas 2 (skärmarna) är klara 2026-11-18.

**Fullständigt implementerat** (testerna knutna till kravnamnen):

- **Nätverket:** `produktionsnatverk`, `fraktskepp-ger-forbindelse`,
  `fraktskepp-ligger-stilla`, `delat-lager-i-natverket`,
  `en-runda-per-lank`, `kortaste-vag-i-lankar`,
  `varor-stannar-vid-delning`, `erovrad-last` och
  `flytta-fraktskepp-mellan-routes`.
- **Fabriker och byggen:** `en-enhet-per-fabrik-och-runda`,
  `blockerad-fabrik`, `delar-tillverkas-pa-behov`,
  `slutproduktfabrik-utan-order`, `standardregel-vid-brist`,
  `skepp-kostar-bara-delar`, `byggnader-kostar-raavaror`,
  `parallella-byggen`, `utvinning-vid-fyndighet`,
  `slutprodukt-vid-fabriken` och `skeppsorder-pa-planeten`.
- **Del- och byggnadsval:** `basta-tillgangliga-del` och
  `ovriga-byggnader-pa-byggplatser`.
- **Sparade spel:** `sparade-spel-bryts-i-utforskningen` (sparversion 17;
  äldre spel tappar varor under transport).
- **Skärmarna:** `Factories` ersätter `Route` i huvudmenyn och
  innehåller skärm 1, skärm 2, Connect-skärmen och länkarna inom en grupp
  enligt underlaget nedan, med spelets egna symboler
  (`befintliga-symboler-i-nya-vyer`). Ett tryck på en skeppsfabrik öppnar
  kartans Production, som bara erbjuder skepp. Delar kan inte längre
  beställas för hand.

**Delvis implementerat:**

- `eskort-pa-routes`: befintlig `rutt-eskortfordelning` gäller. Kartvyn
  Route finns kvar för eskort men nås inte från huvudmenyn. Den öppnas
  bland annat från beslut.
- Varje byggnad tar en runda när råvarorna finns. Skärmarnas `Building 0/1`
  och `~N rounds` är uppskattningar. Längre byggtider finns inte.

**Ej implementerat:** `befolkningsutjamning-i-grupp`, `mining-ships` och
`mining-ship-anslutning`.

**Ersatta krav vars tester togs bort:** `automatiska-delorder`,
`delproduktion-med-sammanhang`, `grupperade-transporthandelser`,
`leveransfloden`, `forsorjningsstatus`, `projektens-forsorjningssteg`,
`automatisk-motormontering` (ersatt av `basta-tillgangliga-del`),
`skepp-ur-olastad-ruttflotta` och `skeppsvis-retratt` för lastade
transporter, `dome-fore-fabriksforslag`, `produktionsval-efter-forekomst`,
`produktionsberoenden-i-byggval`, `produktionsvalens-statusfarger` för
byggnader och nätverksfrakt, samt planetkön där bara första projektet byggs
(ersatt av `parallella-byggen` och `skeppsorder-pa-planeten`).
`radiella-byggval`, `dubbelklick-bygger-pa-kartan`, `byggknapp-vid-titel`
och `produktionsorder-aterkoppling` gäller fortsatt, men bara för skepp.
Den gamla koden för frakt, delplanering och försörjningsvyer är borttagen
(fas 3, 2026-11-19). De ersatta kraven är markerade i
[Route och Production](route-production.md) och
[försörjningsreglerna](supply-production.md).

## Klickbar prototyp

`fabriksskarmar-prototyp` är **Ersatt** av de riktiga skärmarna under
`Factories`. Testläget `Factory screens` och dess exempeldata är borttagna.

## Krav som ersätts vid implementation

Följande krav ersätts när motsvarande delar ovan implementeras. Deras tester
ändras eller tas bort samtidigt: `route-kartvy`,
`byggprojektets-forsorjningskedja`, `forsorjningsproblem-pa-kartan`,
`dome-fore-fabriksforslag`, `produktionsval-efter-forekomst`,
`produktionsberoenden-i-byggval`, `automatiska-delorder`, `leveransfloden`,
`forsorjningsstatus`, `projektens-forsorjningssteg`,
`transportbygge-i-forsorjningssteg` och de fysiska transportreglerna i
[försörjningsreglerna](supply-production.md).

`produktions-kartvy`, `radiella-byggval`, `kompakt-produktionsko` och
`dubbelklick-bygger-pa-kartan` behålls men begränsas till skepp enligt
`skeppsorder-pa-planeten`. Byggnader, Domes och fabriker byggs inte längre
från kartan. Exakt omfattning bestäms per implementationssteg.
