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
| `byggtid-per-byggnad`           | En byggnad byggs i två eller tre rundor från att dess råvaror finns på plats. Enkla byggnader, som utvinning, Domes och enkla fabriker, tar två rundor. Avancerade byggnader tar tre.                         |
| `skeppsorder-pa-planeten`       | Skepp beställs på planetnivå från kartans Production. Varje slutproduktfabrik på planeten tar nästa order av sin typ, så fabrikerna arbetar samtidigt. Kön innehåller bara skepp, inte delar eller byggnader. |

Dagens personalregler för fabriker gäller fortsatt.

`byggtid-per-byggnad` (2026-11-19) ersätter att varje byggnad blir klar
samma runda som råvarorna finns. Tre rundor tar Research station, Orbital
shipyard, terraformingfabrikerna, Ion pulse engine factory, Telescope II
och III factory, Colony ship factory och Raptor factory. Övriga byggnader tar
två rundor. En uppgradering av en fabrik tar den nya fabrikens byggtid.

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
| `eskort-pa-routes`                | Eskort kan tilldelas en route och skyddar dess fraktskepp. Bygger vidare på `rutt-eskortfordelning`. Spelaren ser och tilldelar eskort i `Factories`.                     |

Beslut inför implementationen (2026-11-18):

- `fraktskepp-pendlar` (2026-11-19): ett tilldelat fraktskepp reser först
  till närmaste ände av sin route och pendlar sedan fram och tillbaka mellan
  ändarna, en ny resa varje runda. Rörelsen syns bara på kartan: länken är
  aktiv hela tiden, även mellan ändarna, och varor tar fortfarande en runda
  per länk enligt `en-runda-per-lank`. Pirater anfaller fraktskeppet där det
  befinner sig, och vinner de gäller `erovrad-last`. Eskorten följer med i
  fraktskeppets flotta. Frigörs skeppet mellan ändarna stannar det där det
  är. Ersätter `fraktskepp-ligger-stilla`, där skeppet låg stilla vid sin
  route.
- `ovriga-byggnader-pa-byggplatser`: byggnader som inte är fabriker, till
  exempel Research station, Domes, terraformingfabriker och Orbital
  shipyard, byggs på byggplatserna, kostar råvaror och fungerar i övrigt som
  i dag.
- `basta-tillgangliga-del`: skepp väljer fortsatt bästa tillgängliga del,
  till exempel Ion pulse engine före Rocket engine och högsta teleskopet.
- `befolkningsutjamning-i-grupp`: Civilian shuttles jämnar ut befolkningen
  mellan planeterna i en grupp, så att en ny planet snabbare får befolkning.
  Det ersätter dagens resor längs enskilda routes. Regler (2026-11-19):
  - Först får planeter med personalbrist folk. Behovet är personal för
    färdiga byggnader plus personal och besättning för alla köade projekt,
    eftersom de byggs samtidigt. Därefter flyttas folk så att alla planeter
    i gruppen når samma andel av sitt befolkningstak. Skillnader under 100
    personer lämnas.
  - Ingen planet skickar bort folk under det större av 1 000 och sitt eget
    personalbehov. Inflyttning begränsas av befolkningstaket.
  - Varje skyttel i gruppen flyttar upp till 500 personer per runda. En
    skyttel hör till gruppen där den väntar eller där dess hemfarled ligger.
    Skyttlar flyger inte längre med passagerare.
  - Folket är på väg en runda per länk enligt `en-runda-per-lank`.
    Närmaste planet i länkar skickar först. Under resan växer de inte. De
    kommer fram även om länken bryts. Ägs målet inte längre återvänder de,
    och finns ingen av planeterna kvar går de förlorade.
  - Folk på väg sparas. Passagerare ombord i äldre sparningar stiger av vid
    sitt mål när spelet laddas, och skytteln stannar där den är.
- Testläget `Factory screens` tas bort när de riktiga skärmarna finns.

## Mining ships

**Uppskjutet (2026-11-19):** mining ships görs först när resten av
förenklad produktion är klar. De följs upp i
[issue 1](https://github.com/dntoll/spacelords/issues/1).

| Kravnamn                 | Produktkrav                                                                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mining-ships`           | Mining ships utvinner råvaror ur nebulosor och asteroidbälten. Utvinningen styrs på kartan.                                                                                       |
| `mining-ship-anslutning` | Ett mining ship är anslutet till nätverket när ett fraktskepp har routen mellan skeppet och den ägda planet som ligger närmast på kartan. Flyttas mining ship flyttas routen med. |

## Från testningen (2026-11-19)

Krav från användarens mobiltest. Varje krav följs upp i ett issue.

| Kravnamn                                  | Produktkrav                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `runda-avslutas-fran-factories`           | `Factories` har samma `End turn` och händelselogg som övriga skärmar, inklusive varningen om kvarvarande beslut ([issue 5](https://github.com/dntoll/spacelords/issues/5)).                                                                                                                                                             |
| `produktionsko-bara-skepp`                | `Build queue` i kartans Production visar bara skeppsorder. Köade byggnader syns och avbryts i `Factories` ([issue 3](https://github.com/dntoll/spacelords/issues/3)).                                                                                                                                                                   |
| `produktionsbeslut-bara-for-skeppsfabrik` | Beslutet `<planet>: choose production` visas bara när planeten har en färdig skeppsfabrik och ingen skeppsorder alls i kön (förtydligat 2026-11-19: en köad order räcker, oavsett vilken fabrik som tar den). Tomma byggplatser och köade byggnader ger inget sådant beslut ([issue 2](https://github.com/dntoll/spacelords/issues/2)). |
| `forskningsvy-utan-station`               | Utan någon färdig Research station visar Research inget forskningsträd och ingen kö, bara en förklaring som hänvisar till `Factories` (knappen `Build a Research station` är ersatt av `inga-overflodiga-navigeringsknappar`) ([issue 4](https://github.com/dntoll/spacelords/issues/4)).                                               |

`produktionsbeslut-bara-for-skeppsfabrik` ersätter att tomma byggplatser gav
beslutet, och därmed den del av `beslut-vantar-pa-paborjad-atgard` där
beslutet för tomma platser väntade på Dome-forskning. Production förklarar
fortfarande väntan på Dome-forskning.
`forskningsvy-utan-station` ersätter den del av `forskning-kraver-station`
där trädet visades med spärrade val när ingen station fanns. Trädet med
spärrade val visas fortfarande när den enda stationen är markerad för rivning.
Regeln att forskning kräver en färdig station gäller som förut.

## Vägledning i byggvalen (2026-11-20)

Krav inom utforskningen, alla **Fullständigt implementerade**.

- `startuppmaning-fabriker`: ett nytt spel uppmanar spelaren att bygga en
  `Research station` och utvinning av råvaror. Besluten
  `Build a Research station in Factories` och
  `Build mines and extractors in Factories` öppnar `Factories` och finns kvar
  tills riket har eller bygger en sådan byggnad.
- `fabriksstatus-i-byggval`: varje val under `Build factory` färgas efter om
  fabriken finns i gruppen (grön), byggs i gruppen (gul) eller saknas (grå).
  Etiketten säger samma sak, exempelvis `1 in group`,
  `1 under construction` eller `Not in group`.
- `rekommenderade-fabriker`: överst, under `Recommended`, står de fabriker
  som behövs just nu och som gruppen varken har eller bygger, med skälet:
  - `Research station` när riket saknar en.
  - Utvinning av en råvara som planeten har men gruppen inte utvinner.
  - `Transport ship factory` när en länk i gruppen saknar fraktskepp, eller
    det finns fler grupper, och inget fritt fraktskepp finns i gruppen.
  - `Colony ship factory` när en planet står i koloniseringskön och riket
    saknar fabriken; `Exploration ship factory` på samma sätt för
    utforskningskön.
  - Fabriken för en del eller råvara som en fabrik i gruppen behöver men
    som ingen fabrik i gruppen gör, exempelvis `Weapons module factory` för
    en `Fighter factory`. En bättre motor eller ett bättre teleskop räcker.

  Rekommenderade fabriker visas inte en gång till i nivålistan nedanför.

- `byggval-bara-framforskat` (**Fullständigt implementerat**): byggval
  erbjuds bara för det som är framforskat. Factories visar redan bara
  framforskade fabriker, och Production visar `Civilian shuttle` först när
  `Civilian transport` är framforskad.
- `vagledning-mot-eskort` (**Fullständigt implementerat**): en länk med
  fraktskepp men utan eskort säger under `Links` vad nästa steg är:
  `Escort` med en fri beväpnad flotta; varför närmaste beväpnade flotta inte
  kan (exempelvis att den reser); `Build Fighter` som öppnar Production på
  planeten med Fighter factory; att bygga en Fighter factory, som då också
  rekommenderas under `Recommended`; eller att forska fram Fighter factory.
- `bestall-eskort-pa-lanken` (**Fullständigt implementerat**): finns en
  Fighter factory beställer `Order Fighter` en Fighter direkt från länken,
  med order att eskortera just den länken; raden visar sedan att en Fighter
  är beställd. Saknas fabriken leder `Build factory` till en ledig plats i
  gruppen, och saknas forskning listas den i ordning, exempelvis
  `Research Weapons module factory, then Fighter factory`. Ersätter knappen
  som öppnade Production i `vagledning-mot-eskort`.
- `eskort-utan-upptagna-flottor` (**Fullständigt implementerat**): en
  beväpnad flotta som är upptagen med ett annat uppdrag, exempelvis en resa,
  föreslås inte som eskort. Vägledningen föreslår i stället en ny Fighter,
  fabriken eller forskningen. Ersätter förklaringen av varför närmaste
  beväpnade flotta inte kan i `vagledning-mot-eskort`.
- `lankar-bara-i-grupper` (**Fullständigt implementerat**): `Links inside`
  öppnas bara för grupper med flera planeter, varken från gruppen eller från
  Connect. Länkar namnger planeter även utanför gruppen, i stället för deras
  id.
- `forsorjning-vantar-pa-bestalld-lank` (**Fullständigt implementerat**):
  när en länk till gruppen är beställd (ett fraktskepp är på väg eller byggs
  för den) visas inte problemet att gruppen saknar råvaror eller delar.
- `bestallda-lankar-syns` (**Fullständigt implementerat**): en länk vars
  fraktskepp är beställt eller på väg visas i båda gruppernas översikt och på
  Connect, exempelvis `Link to Vesta ordered · Transport ship being built at
Tellus`, även efter att spelaren lämnat Factories.
- `handelser-vid-ankomst` (**Fullständigt implementerat**): när ett skepp
  kommer fram visas det som hände där, exempelvis `Planet explored`, direkt
  efter det steget och innan andra flottor rör sig vidare eller kameran
  flyttar. Det gäller även upptäckter som avbryter året. Övriga händelser
  visas som förut när förflyttningarna är klara.
- `delfabrik-i-produktion` (**Fullständigt implementerat**, fel rättat
  2026-11-21): en delfabrik som tillverkar delar visas som `In production`
  med `Making n`, där n är de delar gruppen fortfarande väntar på. Tidigare
  såg den ut som en vilande byggnad.
- `terraformering-forst` (**Fullständigt implementerat**): på en planet under
  100% habitability (inte `Temperate` eller gas) rekommenderas planetens
  terraformingfabrik, med skälet `Terraforms this planet`, och står först
  under `Recommended`. En plats som behöver en Dome rekommenderar Domen av
  samma skäl. Rekommendationen gäller per planet: en fabrik på en annan
  planet i gruppen tar inte bort den. Gruppens `Recommended`-knapp och
  markeringen av Factories räknar även med platser som behöver en Dome.
- `en-order-ett-skepp` (**Fullständigt implementerat**): en order som
  behöver ett skepp tar inte emot fler. En länk får ett fraktskepp (inget
  nytt om den redan har ett eller ett är beställt), en planet ett
  koloniserings- eller utforskningsskepp. Eskorter får vara flera. Connect
  erbjuder inte en grupp vars länk redan har ett beställt fraktskepp.
  Dubbletter i sparade spel från tidigare fel ligger kvar och kan tas bort
  med `×` i byggkön.
- `beslutssektioner` (**Fullständigt implementerat**): Decisions har
  underrubrikerna `Needs attention`, `Muted`, `Messages` (meddelanden som
  inte är avstängda) och `Queues`.
- `stilla-beslutslista` (**Fullständigt implementerat**): medan Decisions är
  öppen ligger varje beslut kvar på sin plats när spelaren trycker `Mute`,
  `Unmute` eller `Skip this turn`. Rullningen och fokus behålls. Ett avstängt
  beslut flyttar till `Muted` först när Decisions öppnas igen, enligt
  `tystade-beslut-sist`.
- `factories-sparas` (**Fullständigt implementerat**, fel rättat
  2026-11-21): beställningar i `Factories` (bygg, avbryt, uppgradera, länka,
  flytta fraktskepp, eskortera, beställ eskort) sparas direkt som övriga
  order. Att bläddra i Factories sparar inte.
- `ny-fabrik-med-guldstjarna` (**Fullständigt implementerat**): en
  framforskad fabrik som ingen planet har eller bygger räknas som ny.
  `Factories` i huvudmenyn visar då en guldstjärna (★), och valet under
  `Build factory` får etiketten `★ New`. Stjärnan försvinner när fabriken är
  köad eller byggd någonstans.
- `uppgradera-delfabrik-i-factories` (**Fullständigt implementerat**): en
  fabrik vars del har en bättre framforskad variant (Rocket engine factory →
  Ion pulse engine factory, Telescope I → II → III) visar
  `★ Upgrade to …` på sin plats. Ett tryck öppnar platsen med
  `Upgrade to …`; uppgraderingen byggs på samma plats och kan avbrytas med
  `Cancel upgrade`. Bygger vidare på `uppgradera-obsoleta-fabriker`.
- `rekommendation-i-menyn` (**Fullständigt implementerat**): så länge en
  grupp har en rekommenderad fabrik som kan byggas på en tom plats visar
  `Factories` i huvudmenyn `!`. Gruppen visar `Recommended: …` som en knapp
  som öppnar byggvalet på första lediga plats där fabriken kan byggas.

## Flottfärger och byggorsak (2026-11-20)

Krav inom utforskningen, båda **Fullständigt implementerade**.

- `flottkategorier`: på `Fleets` har varje flotta en färg efter sin
  kategori: `Transport` (lila), `Exploration` (turkos), `Colony` (limegrön),
  `Combat` (blå), `Salvage` (sandfärgad), `Civilian` (grå) och `Mixed` (vit).
  Rött används inte eftersom pirater är röda, och gult är kvar för vald flotta
  och för flottor som väntar på order. Flottans order avgör kategorin, så en
  blandad flotta på en rutt är `Transport`, en som koloniserar är `Colony`
  och en som patrullerar är `Combat`. Utan order avgör skeppen; flera slags
  skepp ger `Mixed`. Flottkorten har samma färg och kategorinamn. En rad med
  kategorierna på kartan visar färgerna, och ett tryck döljer eller visar
  kategorin. Dolda flottor kan inte väljas på kartan.
- `byggorsak-i-kon`: `Build queue` i Production och på planetsidan kan inte
  längre ordnas om, eftersom skepp byggs samtidigt i olika fabriker. Varje
  skepp i kön visar varför det byggs, exempelvis
  `For the link Tellus ↔ Vesta`, `To colonize <planet>`,
  `To explore <planet>`, `Joins <flotta>`, `Mans a route without transport`
  eller `Joins the planet home fleet`. Ett fraktskepp som `Factories` beställer
  för en länk får order att bemanna just den länken.

- `byggkons-framsteg` (2026-11-20, **Fullständigt implementerat**): varje
  skepp i Production-kön visar var det står: `Waiting for its factory` när
  ett annat skepp använder fabriken, annars `Parts 1/2 · ~2 rounds` eller
  `All parts in place`. Under raden står varje del som `✓ … in place`,
  `… coming` eller `! … no factory in group`. Saknas en del helt i gruppen
  visas ingen tid.
- `byggko-eller-skeppsdetaljer` (2026-11-20, **Fullständigt implementerat**):
  Production visar antingen planetens byggkö eller detaljerna för ett valt
  skepp, aldrig båda. Detaljerna stängs med `×`, och då visas kön igen.

`byggorsak-i-kon` ersätter omordningen av Build queue i `dragbara-koer`,
`kompakt-produktionsko` och `kompakta-koknappar`. Research queue,
reparationskön och planetköerna kan fortfarande ordnas om.

## Första stationen på väg (2026-11-20)

`forsta-station-pa-vag` är **Fullständigt implementerat** inom utforskningen.
När den första `Research station` är köad visar Research i stället för
uppmaningen att bygga en, att stationen byggs på planeten och om hur många
rundor forskningen kan börja. Väntar stationen fortfarande på råvaror står det
att den är köad och väntar på varor, med en uppskattning av rundorna. Trädet
visas som förut först när stationen är färdig (`forskningsvy-utan-station`).

## Kompaktare Research och forskningstid (2026-11-20)

Krav inom utforskningen, alla **Fullständigt implementerade**.

- `forskning-utan-rubrikrad`: Research har ingen synlig rubrikrad. Rubriken
  finns kvar för skärmläsare. Antalet stationer står i sammanfattningen av
  forskningskön (`Research queue · 2 · 1 station`) med stationens ikon, och
  förklaringen av stationer ligger i den utfällda kön. Ersätter
  stationsinformationen bredvid rubriken i `forskningstradets-utrymme`.
- `forskningslov-som-symbol` är **Ersatt** av användaren (2026-11-20):
  alla noder visar åter sitt namn.
- `forskningstrad-utan-korsningar` (**Fullständigt implementerat**): trädet
  läggs ut i lager efter förkunskaper. Ordningen i varje lager väljs så att
  beroendelinjerna inte korsar varandra, och varje teknik ligger i höjd med
  sina förkunskaper och efterföljare.
- `forskningstrad-raka-linjer` (**Fullständigt implementerat**): bland
  ordningar utan korsningar väljs den med kortast lodräta linjer, även när
  flera kolumner måste ordnas om samtidigt. Armor ligger därför ovanför
  Fighter factory, och Armored Transport, Armored Fighter och Missiles
  ligger i den ordningen uppifrån.
- `storre-forskningstext` (**Fullständigt implementerat**): korten i
  forskningsträdet är 48 px höga i stället för 36 px, med större namn
  (0.74rem i stället för 0.68rem) på upp till två rader och större ikon.
  Ersätter den halverade korthöjden i `kompakt-forskningstrad`; bredden är
  oförändrad.
- `forskningsflikar` (**Fullständigt implementerat**): forskningskön ligger
  inte längre över trädet. Ytan under trädet har flikarna `Selected` (vald
  teknik) och `Queue · n` (kön, stationerna och hur forskning fungerar).
  Fliken behålls när kön ändras, och ett tryck på en teknik i trädet visar
  `Selected`. Ytan har plats för flikarna (upp till 48 % av höjden, högst
  204 px på smala skärmar).
- `storre-text-dar-det-far-plats` (**Fullständigt implementerat**): namn vars
  ord är högst nio tecken långa (och högst 18 tecken totalt) visas i
  0.86rem; längre ord behåller 0.74rem så att alla namn ryms på två rader.
- `detaljer-utan-scroll` (**Fullständigt implementerat**): på smala skärmar
  har detaljrutan under trädet plats för hela beskrivningen utan att scrolla
  (upp till 42 % av ytan, högst 168 px). Höjden är reserverad i förväg, så
  trädet ändrar inte storlek när en teknik väljs.
- `forskningsikon-i-detaljer`: detaljerna längst ned visar teknikens symbol
  bredvid namnet.
- `forskningstid`: en teknik tar 1–3 rundor. Tekniker utan förkunskaper tar
  en runda, nästa steg två och allt djupare tre. Varje runda med minst en
  fungerande station räknas, och fler stationer gör det inte snabbare.
  Detaljerna visar `Research time`, och den pågående tekniken visar framsteg
  som `Researching · 1/2 rounds`. Påbörjade rundor sparas; äldre sparade spel
  laddas utan framsteg. Ersätter att varje teknik kostar en forskningspoäng.

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
    - En grupp med bemannade länkar får knappen `Links and escorts`. Saknar
      någon länk eskort visas i stället till exempel
      `1 link without escort`. Knappen öppnar länkarna inom gruppen
      (`eskort-pa-routes`, 2026-11-19).
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
    - Varje bemannad länk visar sin eskort, till exempel
      `Escort: 2 armed ships`, eller `No escort`. `Escort` listar lediga
      beväpnade flottor utan fraktskepp, närmast först, med antal beväpnade
      skepp och avstånd. `Assign` skickar flottans beväpnade skepp till
      länkens fraktskepp enligt `rutt-eskortfordelning`.
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
  `fraktskepp-pendlar`, `delat-lager-i-natverket`,
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
- **Byggtid:** `byggtid-per-byggnad` (2026-11-19). Skärm 2 visar varje
  byggnads byggtid, och platsen räknar upp, till exempel `Building 1/3`.
- **Eskort:** `eskort-pa-routes` (2026-11-19). Eskort tilldelas från
  länkarna i `Factories`. Kartvyn Route finns kvar och öppnas bland annat
  från beslut.
- **Sparade spel:** `sparade-spel-bryts-i-utforskningen` (sparversion 17;
  äldre spel tappar varor under transport).
- **Skärmarna:** `Factories` ersätter `Route` i huvudmenyn och
  innehåller skärm 1, skärm 2, Connect-skärmen och länkarna inom en grupp
  enligt underlaget nedan, med spelets egna symboler
  (`befintliga-symboler-i-nya-vyer`). Ett tryck på en skeppsfabrik öppnar
  kartans Production, som bara erbjuder skepp. Delar kan inte längre
  beställas för hand.

- **Befolkning:** `befolkningsutjamning-i-grupp` (2026-11-19) enligt
  reglerna ovan. Gruppen i `Factories` visar ännu inte folk på väg.

- **Från testningen:** `runda-avslutas-fran-factories`,
  `produktionsko-bara-skepp`, `produktionsbeslut-bara-for-skeppsfabrik` och
  `forskningsvy-utan-station` (2026-11-19). Den äldre planetvyn med
  `Building sites` visar fortfarande både byggnader och skepp i sin kö.

**Uppskjutet:** `mining-ships` och `mining-ship-anslutning` görs efter
resten av utforskningen.

**Ersatta krav vars tester togs bort:** `automatisk-arbetskraftstrafik`,
`civiltrafik-pa-handelsnatet`, passagerarresorna i `civiltrafik-sparning`
och hemfarledsbytet i `civil-farledsbyte` (alla ersatta av
`befolkningsutjamning-i-grupp`), `automatiska-delorder`,
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
