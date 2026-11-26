# Produktkrav

Kort och otekniskt om spelet och den nya riktningen. Kraven med stabila namn och
status står i områdesfilerna under [docs/areas](areas/), som
[kravöversikten](../requirements.md) länkar till.

## Ny riktning: Single fleet

Spelaren leder en enda flotta och börjar med en Raptor, en Fighter och en Transport ship. Allt spelaren har
finns i flottan, utan egna planeter eller fasta resurser. Utforskning,
rymdstrid, bordningar och utveckling av skepp och besättning står i centrum.

- `Star map` används för direkt styrning av flottan med AP. Spelaren och
  motståndarna turas om; utan motståndare inom räckhåll fortsätter spelarens tur.
- `Fleet` visar skeppen utan karta. Motorer och vapen kan flyttas mellan skeppens utrustnings- och lastplatser (`fleet-motorer-och-last`).
  Utrustning visas i märkta rutor på skeppsbilderna, med motorplatsen mitt bak och vapenplatserna över och under Storage. Markerad utrustning visar namn, bild och egenskaper. Ett tryck på annan utrustning markerar den direkt och ett tryck på bakgrunden avmarkerar. Skeppens ordning kan ändras.
  Personer, vapensystem och motorer kan flyttas mellan skeppens slots.
  Cargo ships kan förvara oanvänd utrustning och Civilian transports har
  plats för människor.
- Flottans drift förbrukar ändliga resurser, inklusive bränsle. Spelaren
  behöver förflytta sig för att hitta ny försörjning.
- `Crew` visar personer som kan utrustas och flyttas mellan skepp. Samma
  person kan ha flera roller, även i bordningsstyrkan. Personer börjar
  med olika egenskapsvärden där styrkor vägs upp av svagheter, och spelet
  förklarar vad värdena gör. Gunnerns träffsäkerhet och pilotens rörlighet
  påverkar även rymdstrid. Tolv personer bemannar startflottan. Skador och
  personlig utrustning följer med mellan bordningar, och skador läker under
  resan. Skepp utan nödvändig besättning lämnas kvar och kan återtas.
- `Research` gäller tekniker för skepp och bordning. Planetforskning tas bort
  och forskningen låser upp tekniker i stället för fabriker.
- `Production` har en gemensam kö för skepp, utrustning, uppgraderingar och
  reparationer.

Delar av riktningen är ännu inte implementerade. Se [Single fleet](single-fleet.md)
för krav och öppna frågor. Den tidigare planetekonomin är borttagen.
Följande avsnitt beskriver det spelet innehåller nu.

## Spelidé

Spelaren leder en flotta från startplaneten Tellus. Varje runda ger spelaren
order, avslutar rundan och ser sedan rundan spelas upp. Utforskning, pirater,
strider och bordningar står i centrum. Spelaren äger inga planeter. Spelet ska
gå att spela på mobil, surfplatta och dator, och alla texter i spelet är på
engelska.

## Start och sparade spel

- `Saved games` har tre sparplatser med senaste speldatum och en bild av den
  utforskade kartan. Spelet sparas automatiskt.
- Härifrån startas också testlägena för rymdstrid och bordning, och härifrån
  väljs helskärm.
- Bara spel i nuvarande sparformat kan öppnas.

## Stjärnkartan

- Galaxen är en hexkarta med stjärnor, planeter, gasplaneter och terräng som
  nebulosor och stoft. Stjärnor syns alltid; resten syns inom aktuell sikt
  eller som kartminne.
- Spelaren zoomar och panorerar, väljer himlakroppar och flottor och drar en
  flotta till ett mål.
- En markerad outforskad hex behåller sin mörka fyllning och har en synlig kontur.
- Rörelser på Star map animeras även när systemets animationer är avstängda.
- Flottorna ger sikt. Teleskop ökar räckvidden. En pirat utanför sikten
  visas vid sin senast kända plats; när den flyttat sig visas ett frågetecken.
- Flottan rör sig jämnt utan stopp vid rundslut längs en så rak väg som
  möjligt och behåller vägen tills ett nytt vägval behövs. Den valda rutan
  ändras bara när spelaren väljer en annan. Synliga pirater rör sig också mjukt över kartan.
- Planeter är platser. En utforskad planet visar typ, miljö och resurser.

## Flottor

- Flottan styrs med hexval och kan byta namn. Den har inga Move- eller
  Stop-knappar. Ett Exploration ship utforskar planeten det står på.
- Förlorar Home Fleet alla sina skepp är spelet över.

## Research och Production

- Research visar skeppsteknikerna i ett träd med kö. Forskningen går inte
  framåt förrän teknikforskningen är beslutad.
- Production väntar på den gemensamma produktionskön.

## Rundan

- Rundan spelas upp i ordning: färder och sedan händelser i geografisk
  ordning med kameran på platsen.
- Upptäckter, piratkontakter och strider kan avbryta rundan, så att spelaren
  kan välja vad som ska hända.
- Efter en avslutad strid fortsätter spelet så att spelaren kan ge nya order.
- Rymdstriden avslutas när alla motståndarskepp har tagits över.

## Pirater och strid

- Space pirates finns vid stjärnorna, bär byte och kan anfalla.
- Möten mellan flottor avgörs i en taktisk rymdstrid där spelaren styr
  skeppen. Ett skadat fientligt skepp kan bordas.
- En påbörjad bordning spelas färdigt innan rymdstriden fortsätter.
- Bordningens kontroller hålls inom den synliga skärmen.

## Bordning

- Bordningen är en turordningsstrid inne i skepp, med soldater, utrustning,
  dörrar, fönster, rök, explosioner och ljus.
- Den kan spelas i kampanjen och fristående. En lokal editor formar skeppen.

## Framtida riktning

- Det som [Single fleet](single-fleet.md) beskriver, när de öppna frågorna är
  beslutade.
- Asteroidbälten.
- Multiplayer med en eller två rundor per verkligt dygn.

Utforskningen `single_fleet` beskrivs i [Single fleet](single-fleet.md): `dragbar-besattning`, `dragbar-personlig-utrustning` och `besattningsstaplar` är **Fullständigt implementerat**. Personer och deras utrustning flyttas mellan rutor och personernas egenskaper visas med staplar.
