# Bordningsstrid

Bordning ingår i kampanjens taktiska rymdstrid. Pirater, infångade
`Space pirate` och `Raptor` kan välja `Dock` längs babord eller styrbord.
Efter den pågående rymdstridsrundan växlar spelet två bordningsrundor och två
rymdstridsrundor. Anfallaren startar i motståndarens airlock. Avbrott är
tillåtet när alla levande stridande är i eget skepp. Pirater lämnar en
cockpit-soldat. Utslagen sida ger vinnaren båda skeppen i samma strid.

Huvudmenyns `Test boarding (cheat)` är oförändrad: ett fristående testspel på
en fast, handredigerbar karta över ett `Transport ship` med fyra
bordningssoldater, tre försvarare och tre civilister, utan påverkan på
sparplatser.

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
  förflyttning animerar varje vändning och steg för den aktiva soldaten och för
  synliga försvarare och civilister. Sikt och kartminne uppdateras efter varje
  del så att spelaren ser vad som händer på vägen. Dolda figurer animeras inte.
  En redan visad förflyttning spelas inte om.
- `avbrott-vid-ny-fiende` — **Fullständigt implementerat**. Om en ny fientlig
  soldat kommer in i sidans sikt under en förflyttning stannar den aktiva
  soldaten efter den del som avslöjade fienden och resten av ordern stryks.
- `animerat-bordningsskott` — **Fullständigt implementerat**. Gevärs- och
  overwatchskott visas som en kort projektil från skytt till mål. Spåret
  försvinner när det når målet, innan skadan syns.
- `valbar-bordningssoldat` — **Fullständigt implementerat**. Under spelarens
  tur kan en annan egen aktiv soldat som inte är färdig väljas med klick på
  figuren eller golvrutan. Ett klick på spriten väljer soldaten även när
  kroppen täcker rutan bakom. Den förra soldaten sparar sin kvarvarande AP och
  återupptas när den valda är klar, så att någon som står i vägen kan flyttas
  undan.
- `klickskott-pa-vald-fiende` — **Fullständigt implementerat**. Första klicket
  på en fiende väljer målet. Ett andra klick på samma valda fiende avfyrar
  geväret om skottet är lagligt.
- `vald-bordningsmal-markeras` — **Fullständigt implementerat**. Ett valt mål
  markeras på kartan med samma guldring som destinationen, både på rutan och
  runt figuren, så att det syns vem melee och skott avser.
- `melee-kraver-valt-mal` — **Fullständigt implementerat**. Melee är avstängt
  tills ett angränsande fientligt mål är valt. Ogiltig melee drar inte AP.
  Närliggande försvarare slår melee även om de står med ryggen mot anfallaren.
- `skott-kraver-giltigt-mal` — **Fullständigt implementerat**. Gevär och melee
  kan inte riktas mot den aktiva soldaten eller eget lag. Skottknappen är
  avstängd tills ett fiendemål eller ett tillåtet miljömål är valt. Ogiltiga
  skott drar inte AP.
- `klickgang-pa-vald-destination` — **Fullständigt implementerat**. Första
  klicket på en tom ruta räknar ut och visar vägen. Ett andra klick på samma
  valda destination startar förflyttningen om vägen ryms inom kvarvarande AP.
- `klickdorr-pa-vald-dorr` — **Fullständigt implementerat**. Första klicket på
  en dörr väljer den. Ett andra klick på samma angränsande dörr försöker
  öppna eller stänga den, eller hacka den om den är låst.
- `tydlig-bordningsstatus` — **Fullständigt implementerat**. Den aktiva soldaten
  namnges uttryckligen och markeras på kartan. Varje bordningssoldat visas med
  en egen HP-bar och numeriskt HP-värde i HUD. Kartans förklaring identifierar
  aktiv soldat, riktning, sikt, eld och `Half cover`, som har en egen färg.
  Under en dold försvarares tur visar `Combat details` att försvararen agerar
  och loggar handlingens typ utan att avslöja positionen. Den öppna
  stridsloggen följer senaste raden.
- `isometrisk-bordningsvy` — **Fullständigt implementerat**. Den regelstyrda
  kvadratkartan visas med klassiska 2:1-diamantrutor och upphöjda barriärer,
  skydd och spelpjäser. Väggar och ytterskrov fyller hela sina rutor och har
  inga identitetsmarkörer. `Half cover` är hälften så hög som en vägg.
- `isometriska-golvtiles` — **Fullständigt implementerat**. Synliga och minneslagda
  golvrutor ritas med en kvadratisk yttextur som vyn projicerar på rutans
  exakta 2:1-diamant. Okända rutor behåller den ifyllda diamanten.
  Kartreglerna ändras inte.
- `isometriska-vaggtexturer` — **Fullständigt implementerat**. Väggar och
  ytterskrov ritas med utklipp ur en lång fasadtextur. En sammanhängande
  väggsträcka längs q eller r får på varandra följande utklipp så att sidan
  läses som en enda vägg. Kartreglerna ändras inte.
- `bordningsfigurer-fran-spritesheet` — **Fullständigt implementerat**. Spelarens
  soldater, försvarare och civilister visas med var sitt utklipp ur det gemensamma
  fraktionsarket. Varje utklipp innehåller bara den avsedda figuren och
  förankras med fötterna lite under rutans centrum så att figurerna står närmare
  golvet. Riktningspilen, HP, aktiv markering och statusmarkeringar behålls.
  Samma stillbild används i alla riktningar tills separata riktningar och
  animationer införs.
- `hp-och-ap-ovanfor-soldater` — **Fullständigt implementerat**. Ovanför varje
  egen soldat visas HP och kvarvarande AP som två korta staplar. Försvarare och
  civilister visar bara HP.
- `personer-blockerar-inte-sikt` — **Fullständigt implementerat**. En person,
  civil eller stridande, blockerar inte siktlinjen. Samma person blockerar
  skott mot rutor bakom. Väggar, skrov, stängda dörrar och rök blockerar
  fortfarande både sikt och skott.
- `doda-blockerar-inte-skott-eller-rorelse` — **Fullständigt implementerat**.
  En död eller utslagen soldat blockerar varken skott eller förflyttning.
  Stående personer blockerar fortfarande skott och rutor.
- `sikt-och-eld-fran-vald-soldat` — **Fullständigt implementerat**. Under
  spelarens tur visar kartan den aktiva soldatens synliga rutor med cyan kant
  och de rutor ett gevärsskott kan nå med röd kant.
- `spelmassigt-bordningsgranssnitt` — **Fullständigt implementerat**. Kartan
  upptar huvuddelen av skärmen. Truppstatus, handlingar, zoom,
  kartförklaring och stridslogg ligger som kompakta HUD-lager ovanpå kartan.
  Handlingar använder små symbolknappar med fullständiga namn för
  tillgänglighet och framtida utbyte mot bildsymboler.
- `sikt-minne-och-ljudmarkorer` — **Fullständigt implementerat**. Soldater ser 180 grader.
  Sidorna delar aktuell sikt och senast kända fiendeposition. Personer blockerar
  inte den delade sikten. Skeppets yttre form är känd, interiören utforskas och
  aktuell sikt skiljs tydligt från kartminne. Våld visar sin exakta ruta som
  ljudmarkör för motståndarsidan till rundans slut.
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
  180-gradiga synfältet; civilister är aldrig mål.
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
  breach och delad observation, men inte dolda aktuella positioner. Autoplay
  kör även dolda försvarare, och en avvisad AI-handling avslutar turen så att
  `Defenders are acting…` inte fastnar. Civilisterna styrs av AI, flyr från
  alla stridande och ljud, öppnar vanliga dörrar men hackar inte och försöker
  använda escape pods. Överlevande ger ett bonusutfall utan kampanjbelöning i
  prototypen.

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

## Kampanjbordning

- `piratflotta-med-lastfartyg` — **Fullständigt implementerat**. Varje piratflotta
  har en `Space pirate` och ett piratfärgat `Transport ship` med slumpad last
  i ett `hold` oberoende av handelsrutter. Äldre sparningar (v13) får ett
  lastfartyg additivt. Version 14. Ingen rensning av sparplatser.
- `docka-babord-styrbord` — **Fullständigt implementerat**. `Dock` ersätter skott
  och kräver kontakt längs babord eller styrbord, inte nos mot nos eller
  T-kollision. Samma eller motriktad kurs är tillåten. Mål: alla skepp utom
  `Fighter`.
- `lassta-dockade-skepp` — **Fullständigt implementerat**. Dockade skepp ritas
  med en brygga, kan inte röra sig eller skjuta och låses tills bordningen
  slutar. Förstört låst skepp dödar alla ombord; det andra släpps.
- `bordning-tva-rundor-skift` — **Fullständigt implementerat**. Efter den
  pågående rymdstridsrundan: två bordningsrundor, två rymdstridsrundor,
  upprepa. En aktiv bordning per rymdstrid.
- `tva-skepp-pa-bordningskartan` — **Fullständigt implementerat**. Enkel
  interiör per bordningsbar typ. Composer sätter anfallare, brygga och
  försvarare i samma koordinatsystem. Kartvyn använder den sammansatta
  kampanjkartan, inte testkartan, och kameran ramar in faktisk terräng.
- `unika-startpositioner-vid-bordning` — **Fullständigt implementerat**.
  Varje levande soldat startar på en egen golvruta. Airlock-lag spelas ut
  på angränsande golv i samma skepp så att HP-baren tillhör rätt person.
- `avbryt-bordning-i-egna-skepp` — **Fullständigt implementerat**. Avbrott när
  alla levande egna soldater är i eget skepp och alla levande motståndare i
  sitt. Piraternas cockpit-soldat avbryter när det är lagligt.
- `erovra-skepp-via-bordning` — **Fullständigt implementerat**. Utslagen sida:
  vinnaren tar båda skeppen och de byter sida i samma rymdstrid. Kampanjens
  vinst är avbrott, utslagning eller förstört skepp, inte Bridge+Engineering.
- `bordningsbeloning-last-teknik-karta` — **Fullständigt implementerat**. Vid
  vinst: skeppet, last i `hold` som lastas av vid ägd planet, recovered
  `Raptor factory` och närmaste andra pirat synlig med utforskad radie 4.
- `raptor-efter-dockningsteknik` — **Fullständigt implementerat**. `Raptor factory`
  kräver `Weapons module factory` tills den är Recovered. `Raptor` är en liten
  trupptransport (size 1, hull 3, movement 3, speed 2) med light cannon.

- `lokal-bordningskarteditor` — **Fullständigt implementerat**. En editor för
  skeppens bordningslayouter körs bara mot den lokala servern. En knapp
  `Ship layouts` i skärmens nederkant visas när `/api/boarding-maps` svarar.
  Där väljs skepp, rutnätets bredd och höjd, en tile för vänster musknapp och
  en för höger, och skeppets sprite som bakgrund som kan panoreras och skalas.
  Undo och redo använder command pattern. Spara skriver över den valda
  kartfilen i `src/client/maps/`. Skrovgenombrott och vakuum ingår inte.
- `isometrisk-bordningskarteditor` — **Fullständigt implementerat**. Samma
  utkast kan visas med stridens klassiska 2:1-diamanter, golv- och väggtexturer
  och upphöjda barriärer. Väljaren `View` växlar mellan `Isometric` och
  `Top-down`. Ovanifrån behålls för att spåra skeppsspriten; isometrin ersätter
  inte den vyn, utan visar samma celler som i bordningsstriden. Spritejustering
  gäller bara ovanifrån. Penslar, storlek, undo och spara är desamma.

## Dockningskorridorens grafik

`dockningskorridor-sprite` är **Fullständigt implementerat**. En transparent korridorsprite förbinder dockade skepp på stridskartan. Originalet finns i `assets/original/map/docking-corridor.png`. Bilden genererades med inbyggd bildgenerering med en prompt om en rak trycksatt korridor ovanifrån, med dockningskragar, grå metallplåt och blågröna och bärnstensfärgade detaljer.
