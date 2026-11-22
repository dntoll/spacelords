# Produktkrav

Kort och otekniskt om spelet och den nya riktningen. Kraven med stabila namn och
status står i områdesfilerna under [docs/areas](areas/), som
[kravöversikten](../requirements.md) länkar till.

## Ny riktning: Single fleet

Spelaren leder en enda flotta och börjar med en Raptor. Allt spelaren har
finns i flottan, utan egna planeter eller fasta resurser. Utforskning,
rymdstrid, bordningar och utveckling av skepp och besättning står i centrum.

- `Star map` används för direkt styrning av flottan med AP. Spelaren och
  motståndarna turas om; utan motståndare inom räckhåll fortsätter spelarens tur.
- `Fleet` ersätter `Fleets` och visar skeppen och deras egenskaper utan karta.
  Personer, vapensystem och motorer kan flyttas mellan skeppens slots.
  Cargo ships kan förvara oanvänd utrustning och Civilian transports har
  plats för människor.
- `Crew` visar personer som kan utrustas och flyttas mellan skepp.
- `Research` gäller tekniker för skepp och bordning. Planetforskning tas bort
  och forskningen låser upp tekniker i stället för fabriker.
- `Production` har en gemensam kö för skepp, utrustning, uppgraderingar och
  reparationer.

Riktningen är ännu inte implementerad. Se [Single fleet](single-fleet.md)
för krav och öppna frågor. Följande avsnitt beskriver den ärvda spelversionen.

## Spelidé

Spelaren leder ett rymdimperium från en hemplanet. Varje spelår är en runda:
spelaren ger order, avslutar rundan och ser sedan året spelas upp. Imperiet
växer genom utforskning, kolonisation, forskning och produktion. Pirater,
strider och bordningar ger motstånd. Spelet ska gå att spela på mobil,
surfplatta och dator, och alla texter i spelet är på engelska.

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
- Spelaren zoomar och panorerar, väljer planeter, flottor och rutter och
  drar flottor till mål.
- Ägda planeter och flottor ger sikt. Teleskop ökar räckvidden.

## Planeter och kolonier

- En ägd planet har befolkning, habitability, fyndigheter av Iron, Water och
  Oil och ett antal byggplatser.
- Befolkningen växer varje år upp till planetens tak och jämnas ut mellan
  planeter som är förbundna.
- Under 80 % habitability behöver en byggplats en Dome. Terraforming höjer
  habitability och ändrar planettypen.
- Planetsidan visar planetens läge, resurser, byggnader och byggplatser. Där
  kan en byggnad rivas; allt annat byggande sker i Factories.

## Ekonomi och produktion

- Planeter som förbinds av fraktskepp bildar en grupp. Gruppen delar råvaror
  och delar, och varje länk tar en runda.
- Utvinning sker där fyndigheten finns. Fabriker tillverkar delar som motorer,
  vapen och teleskop när ett skepp behöver dem, och slutprodukter som skepp.
- `Factories` visar grupperna, deras planeter och byggplatser. Där byggs och
  uppgraderas fabriker, Domes och terraforming, och där skapas länkar mellan
  planeter med `Connect`. Det som behövs först rekommenderas överst.
- `Production` på kartan beställer skepp på en planet och visar kön, med
  varje skepps delar och varför det byggs.
- Mining ships, som utvinner där ingen planet finns, kommer senare.

## Research

- Forskning kräver en Research station. Tekniker ligger i ett träd, köas och
  tar 1–3 rundor. Förkunskaper köas automatiskt.
- Forskning låser upp fabriker, skepp, terraforming och order.

## Flottor

- Flottor kan flytta, utforska planeter och stjärnor, kolonisera, patrullera,
  bärga vrak, frakta på en länk eller eskortera den.
- Nybyggda skepp får en startorder. Planetköer fördelar utforskning och
  kolonisation till lediga flottor.
- Flottor kan delas, slås ihop, döpas om och uppgraderas vid ett varv.
- `Fleets` färgar flottor efter uppgift och kan dölja kategorier.

## Rundan och beslut

- Året spelas upp i ordning: autonoma flottor, övriga färder och sedan
  händelser i geografisk ordning med kameran på platsen.
- Upptäckter, piratkontakter och strider kan avbryta året, så att spelaren
  kan välja vad som ska hända.
- `Decisions` samlar det som väntar på spelaren under underrubriker.
  Återkommande besked kan tystas.

## Pirater, strid och bärgning

- Space pirates finns vid vissa stjärnor, bär byte och kan anfalla.
- Möten mellan flottor avgörs i en taktisk rymdstrid där spelaren styr
  skeppen. Ett skadat fientligt skepp kan bordas.
- Strider lämnar vrak. Bärgningsskepp tar hem vraken till orbitala varv, där
  de repareras eller ger forskning.

## Bordning

- Bordningen är en turordningsstrid inne i skepp, med soldater, utrustning,
  dörrar, fönster, rök, explosioner och ljus.
- Den kan spelas i kampanjen och fristående. En lokal editor formar skeppen.

## Framtida riktning

- Mining ships och asteroidbälten.
- Diplomati, fler produkter och föroreningar från fabriker.
- Multiplayer med en eller två rundor per verkligt dygn.
