# Handelsgraf

Trade routes ersätter den tidigare formulär- och listvyn med ett spelbräde.
Forskningskrav, ruttkapacitet, fysisk frakt och regler för flottornas
tilldelning och frigörande behålls.

Samma nätverk kan även administreras på [Star map](star-map-trade.md).
Regeln om flottmärken vid ruttens mittpunkt nedan gäller enbart Trade routes;
på Star map behåller flottor alltid sin verkliga position.

Den uppdaterade utformningen ersätter planeternas materialkort på spelbrädet
med namngivna planeter. `handelsgraf-planetoversikt` visar i stället informationen
i en valpanel. Den tidigare Fleet bay med alla flottor ersätts av samma valpanel.

- `handelsgraf-valpanel` — **Fullständigt implementerat**: panelen följer vald planet,
  flotta eller rutt. Materialdetaljer visas för vald planet, skepp och uppdrag för
  vald flotta och tilldelningskontroller för vald rutt. Vald rutt visar även sina
  tilldelade flottor med skepp, antal, position, last och frigörande.
- `handelsgraf-flottboxar` gäller detaljpanelen: där visas skepp, antal, position
  och last. Den tidigare utformningen med stora kort på spelbrädet ersätts
  uttryckligen av `handelsgraf-kompakt-flottvy`.
- `handelsgraf-kompakt-flottvy` — **Fullständigt implementerat**: vänstervyn har
  inga stora flottkort eller ruttrutor. Flottan väljs via sina skepp på spelbrädet. Flottor utan position eller skepp har en liten namnmarkör.
  En ledig transportflottas skeppsmarkör kan dras direkt till en ruttlinje för
  tilldelning. Linjen markeras vid släpp; samma regler för position och uppdrag
  gäller som tidigare. Vald rutt visar flottorna och frigörande till höger.
- `handelsgraf-skeppspositioner` — **Fullständigt implementerat**: varje positionerad
  ledig flotta med skepp visas med skeppsbilder och antal vid sin aktuella plats.
  Ruttflottornas tidigare fysiska placering ersätts uttryckligen av
  `handelsgraf-ruttflottor`. Märket kan väljas och leder till flottans detaljer.
  Detaljerna visas i sidopanelen.
- `handelsgraf-ruttflottor` — **Fullständigt implementerat**: tilldelade flottors
  skeppsmärken centreras på sin ruttlinjes mittpunkt när platsen är fri. Vid
  kollision med planeter, namn eller andra skeppsmärken placeras de intill med
  en ledlinje till samma mittpunkt. Flera flottor på samma rutt får egna märken.
  Den verkliga positionen visas fortfarande i detaljpanelen. Synligheten följer
  ruttens mittpunkt, även när flottans verkliga position ligger utanför kameran.
- `handelsgraf-lasbarhet` — **Fullständigt implementerat**: planeterna har dubblerad
  grunddiameter och skalas med kartans zoom. Detta ersätter den tidigare fasta
  planetstorleken efter uttrycklig ändring. Planetnamn, kort, skeppsmärken och
  kontroller behåller läsbar storlek. Skeppsmärken placeras fria från planeter och
  andra märken. Panorering ger åtkomst när allt inte ryms.
  Planetnamn är centrerade direkt ovanför sin planet utan ledlinje; detta ersätter
  den tidigare fria placeringen av namnen. Namnens bakgrund är genomskinlig så
  att ruttlinjer syns bakom dem. Skeppsmärken döljs när deras ankare
  ligger utanför kameran: fysisk position för lediga flottor, ruttens mittpunkt
  för tilldelade flottor.

| Kravnamn                     | Status                     | Beskrivning                                                                                                                                                                                                                                       |
| ---------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `handelsgraf`                | Fullständigt implementerat | Ägda planeter är noder med samma inbördes riktning och avstånd som på Star map. Två valda planeter kan kopplas ihop; länkar visar befintliga rutter, kapacitet och tilldelade flottor.                                                            |
| `handelsgraf-planetoversikt` | Fullständigt implementerat | Vald planets sidopanel visar materiallager, utvinning per år, inkommande leveranser, kvarvarande materialbehov för nästa projekt och vad fabrikerna kan producera.                                                                                |
| `handelsgraf-flottboxar`     | Fullständigt implementerat | Flottor visas med skeppsbilder och antal i samma stil som Fleets. Position, resa, last och uppdrag framgår. En giltig flotta kan tilldelas med Assign eller dras till länken. Frigörande följer befintliga regler för pågående resa och lossning. |
| `handelsgraf-navigation`     | Fullständigt implementerat | Spelaren kan panorera, zooma och återgå till en översikt med mus, touch och tangentbord. Läget behålls när rutter eller flottilldelningar ändras.                                                                                                 |

Need visar det som saknas för det första köprojektet efter avdrag för lokalt
lager och inkommande leveranser. +/yr visar faktisk resursutvinning. Factories
visar vad tillgängliga fabriker kan tillverka; det är inte en utfästelse om
löpande tillverkning. Next visar det första projektet i Build queue.
