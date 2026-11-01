# Bordningsstrid

Den första bordningsstriden är ett fristående testspel som öppnas från
huvudmenyn. Den använder inte kampanjens flottor, rymdstrid eller sparplatser.
Scenariot utspelas på en fast, handredigerbar karta över ett `Transport ship`
med fyra bordningssoldater, tre försvarare och tre civilister.

## Krav och status

- `fristaende-bordningsprototyp` — **Fullständigt implementerat**. Ett upprepningsbart
  testscenario ska kunna startas och avslutas från huvudmenyn utan att ändra
  sparade spel.
- `datadriven-bordningskarta` — **Fullständigt implementerat**. Kartans terräng, objekt,
  rum och startpositioner ska läsas från separata lager i en textfil som går
  att redigera för hand.
- `individuellt-bordningsinitiativ` — **Fullständigt implementerat**. Varje soldat slår
  D20 plus initiativvärde varje runda. Högre grundvärde bryter lika total;
  fortsatt lika resultat slås om. Civilister agerar sist.
- `actionpoints-och-riktad-forflyttning` — **Fullständigt implementerat**. Egenskaper och
  fasta utrustningsmodifierare ger AP. Soldater går endast framåt. Ett stående
  rutsteg kostar 2 AP, ett hukat steg 3 AP, en 90-gradersvändning 1 AP och byte
  mellan stående och hukad ställning 1 AP. Handlingar får blandas fritt och
  förflyttning sker i fyra riktningar utan diagonala steg. Detta ersätter
  uttryckligen den tidigare hexkartan med sex riktningar och 60-gradersvändning.
- `ap-fargad-bordningsvag` — **Fullständigt implementerat**. En vald väg visar
  bara rutor som ryms inom kvarvarande AP. Rutor där ett gevärsskott fortfarande
  ryms efter ankomst har en färg; övriga rutor man just når har en annan.
- `animerad-bordningsforflyttning` — **Fullständigt implementerat**. Utförd
  förflyttning animerar varje vändning och steg. Sikt och kartminne uppdateras
  efter varje del så att spelaren ser vad soldaten ser på vägen.
- `avbrott-vid-ny-fiende` — **Fullständigt implementerat**. Om en ny fientlig
  soldat kommer in i sidans sikt under en förflyttning stannar den aktiva
  soldaten efter den del som avslöjade fienden och resten av ordern stryks.
- `animerat-bordningsskott` — **Fullständigt implementerat**. Gevärs- och
  overwatchskott visas som en kort projektil från skytt till mål innan skadan
  syns.
- `valbar-bordningssoldat` — **Fullständigt implementerat**. Under spelarens
  tur kan en annan egen aktiv soldat som inte är färdig väljas med klick. Den
  förra soldaten sparar sin kvarvarande AP och återupptas när den valda är
  klar, så att någon som står i vägen kan flyttas undan.
- `klickskott-pa-vald-fiende` — **Fullständigt implementerat**. Första klicket
  på en fiende väljer målet. Ett andra klick på samma valda fiende avfyrar
  geväret om skottet är lagligt.
- `tydlig-bordningsstatus` — **Fullständigt implementerat**. Den aktiva soldaten
  namnges uttryckligen och markeras på kartan. Varje bordningssoldat visas med
  en egen HP-bar och numeriskt HP-värde. Kartans förklaring identifierar aktiv
  soldat, riktning och
  `Half cover`, som har en egen färg. Under en dold försvarares tur visar
  `Combat details` att försvararen agerar och loggar handlingens typ utan att
  avslöja positionen.
- `isometrisk-bordningsvy` — **Fullständigt implementerat**. Den regelstyrda
  kvadratkartan visas med klassiska 2:1-diamantrutor och upphöjda barriärer,
  skydd och spelpjäser. Väggar och ytterskrov fyller hela sina rutor.
- `isometriska-golvtiles` — **Fullständigt implementerat**. Synliga och minneslagda
  golvrutor ritas med en kvadratisk yttextur som vyn projicerar på rutans
  exakta 2:1-diamant. Okända rutor behåller den ifyllda diamanten.
  Kartreglerna ändras inte.
- `spelmassigt-bordningsgranssnitt` — **Fullständigt implementerat**. Kartan
  upptar huvuddelen av skärmen. Truppstatus, handlingar, zoom,
  kartförklaring och stridslogg ligger som kompakta HUD-lager ovanpå kartan.
  Handlingar använder små symbolknappar med fullständiga namn för
  tillgänglighet och framtida utbyte mot bildsymboler.
- `sikt-minne-och-ljudmarkorer` — **Fullständigt implementerat**. Soldater ser 120 grader.
  Sidorna delar aktuell sikt och senast kända fiendeposition. Skeppets yttre
  form är känd, interiören utforskas och aktuell sikt skiljs tydligt från
  kartminne. Våld visar sin exakta ruta som ljudmarkör för motståndarsidan till
  rundans slut.
- `d20-bordningsstrid` — **Fullständigt implementerat**. Skott använder öppet D20 plus
  Accuracy mot försvar, men visar även träffchans i procent. Naturlig 1 missar
  och naturlig 20 dubblar vapnets skadetärningar.
- `miljomal-och-forstorelse` — **Fullständigt implementerat**. Dörrar och reaktor kan
  väljas som direkta mål. Explosioner kan skada väggar och dörrar. En förstörd
  barriär blir en permanent passage; ytterskrovet kan inte förstöras.
- `overwatch-och-skydd` — **Fullständigt implementerat**. Låga objekt ger `Half cover`.
  De skyddar bara när de ligger mellan skytt och mål; hukning bakom dem ger
  starkare skydd. Overwatch reserverar AP för ett
  automatiskt skott mot den första fientliga soldat som rör sig i det
  120-gradiga synfältet; civilister är aldrig mål.
- `granater-och-rok` — **Fullständigt implementerat**. Granater kastas mot en ruta med D20.
  Missmarginal styr avståndet och slumpen riktningen. Barriärer stoppar
  explosioner men tar skada. Rök har intern mängd, sprids och avtar slumpmässigt
  till någon av åtta omgivande rutor vid rundslut, men visas binärt. Explosioner
  påverkar mål­rutan och alla åtta omgivande rutor. Man ser in i en rökruta men
  inte bakom den; mål i rök har `Half cover`.
- `utslagning-och-medic` — **Fullständigt implementerat**. Vid 0 HP blir alla personer
  utslagna. Nästa träff dödar. `Med-pack` kan återuppliva. En sida utan
  stridsdugliga soldater är neutraliserad; utslagna överlevande tas till fånga.
- `bordningsmal-reaktor-och-evakuering` — **Fullständigt implementerat**. Spelaren vinner
  när alla försvarare neutraliserats eller när endast stridsdugliga
  bordningssoldater håller både `Bridge` och `Engineering` vid rundslut.
  Förstörd reaktor startar en nedräkning till skeppets förstörelse. En särskild
  handling evakuerar vid breach eller escape pod.
- `forsvarare-och-civilister` — **Fullständigt implementerat**. Försvararna känner till
  breach och delad observation, men inte dolda aktuella positioner.
  Civilisterna styrs av AI, flyr från alla stridande och ljud, öppnar vanliga
  dörrar men hackar inte och försöker använda escape pods. Överlevande ger ett
  bonusutfall utan kampanjbelöning i prototypen.

## Karta och dörrar

Textkartan har likstora lager för golv och skrov, objekt, namngivna rum och
startpositioner. `Bridge`, `Engineering`, breach, escape pods, reaktor, dörrar
och låga skydd markeras uttryckligen. En vanlig dörr kostar 1 AP att öppna eller
stänga. En låst dörr kan hackas tyst eller förstöras med skott och explosioner.

## Runda och information

Initiativordningen omfattar alla stridande soldater. Varje aktivering tillhör
en bestämd soldat. Efter den sista soldaten agerar civilisterna, därefter
uppdateras reaktor, rök och tillfälliga ljudmarkörer innan nästa initiativslag.
Spelaren väljer en destinationsruta och ser den billigaste vägen innan den
utförs stegvis. Vändning vänster och höger kan även göras separat.

## Avgränsning

Samtidig växling till rymdstrid, strategiskt övertagande av skeppet,
rekrytering eller forskningsbelöningar, `Colony ship`, karteditor,
skrovgenombrott och vakuum ingår inte. Dessa kräver senare separata krav och
ny avstämning om sparkompatibilitet.
