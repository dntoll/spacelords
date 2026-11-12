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
  rutsteg kostar 2 AP, ett hukat steg 3 AP, ett diagonalt steg 3 AP stående eller 4 AP hukande, en 45-gradersvändning 1 AP och byte
  mellan stående och hukad ställning 1 AP. Handlingar får blandas fritt och
  förflyttning sker i åtta riktningar. Diagonaler kräver att båda sidrutorna
  är fria för rörelse. Detta ersätter uttryckligen den tidigare regeln om fyra
  riktningar utan diagonaler och 90-gradersvändningar; den tidigare hexkartan
  med sex riktningar är fortsatt ersatt.
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
  tur kan en annan egen aktiv soldat med AP kvar väljas med klick på
  figuren eller golvrutan. Ett klick på spriten väljer soldaten även när
  kroppen täcker rutan bakom. Den förra soldaten sparar sin kvarvarande AP och
  återupptas när den valda är klar, så att någon som står i vägen kan flyttas
  undan.
- `kamerafokus-vid-bordningssoldatbyte` — **Fullständigt implementerat**. Vid
  manuellt eller automatiskt byte till en egen soldat utanför den fria kartytan
  zoomar kameran först ut tills hela figuren med HP/AP syns, panorerar till
  soldaten och zoomar in till exakt samma nivå som före bytet. En redan synlig
  soldat ändrar inte kameran. HUD och en liten kantmarginal räknas bort.
- `kameraoverblick-vid-synlig-bordningsrorelse` — **Fullständigt implementerat**.
  Före varje synligt steg av en försvarare eller civilist zoomar kameran vid
  behov ut så att figuren och alla aktiva egna soldater som ser den ryms.
  Endast synliga start- och slutpositioner påverkar kameran; riktning, barriärer
  och rök avgör vilka egna soldater som ser figuren. Kameran står still under
  själva steget och behåller översikten efteråt. Dolda förflyttningar och
  stillastående turbyten ger ingen sådan kameraflytt.
- `kameraoverblick-fore-bordningsskott` — **Fullständigt implementerat**. Före
  ett skott mellan en synlig egen soldat och försvarare panorerar kameran och
  zoomar vid behov ut så att båda figurerna ryms på den fria kartytan. Skottet
  animeras först när kameran är klar. En dold skytt avslöjas inte av kameran.

  Kameraflödena använder mjuka övergångar. Manuell panorering eller zoom avbryter automatiken för resten av den pågående uppspelningen utan
  att stoppa figurerna. Minskad rörelse visar slutläget direkt. Storleksbyte
  och stängning avslutar väntande kamerafaser säkert. Sparningar påverkas inte.

- `klickskott-pa-vald-fiende` — **Fullständigt implementerat**. Första klicket
  på en fiende väljer målet. Ett andra klick på samma valda fiende avfyrar
  geväret om skottet är lagligt.
- `vald-bordningsmal-markeras` — **Fullständigt implementerat**. Ett valt mål
  markeras på kartan med en guldring på rutan och ett tydligt crosshair över
  figuren, så att det syns vem melee och skott avser.
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
  öppna den, eller hacka den om den är låst. Öppna dörrar väljs som golvrutor.
- `tydlig-bordningsstatus` — **Fullständigt implementerat**. Den aktiva soldaten
  namnges uttryckligen och markeras på kartan. Varje bordningssoldat visas med
  en egen HP-bar och numeriskt HP-värde i HUD. Kartans förklaringspanel har
  tagits bort. Riktningspilar och markeringar för sikt och eld har tagits bort enligt
  `bordning-utan-riktningspilar` och `bordning-utan-sikt-och-eldrutor`.
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
- `bordningsfigurer-fran-spritesheet` — **Fullständigt implementerat**. Soldater,
  pirater och civilister har egna stående och hukande figurer. Fem grundvinklar
  per typ och ställning speglas till åtta riktningar. Bilden visar samma håll
  som figurens rörelse och sikt. Fötterna står i rutans mitt, med skugga och
  valring på samma punkt, och HP, AP och statusmarkeringar behålls. Detta ersätter samma stillbild för
  alla riktningar. Totalt 33 genererade grundbilder används i ett bildark.
- `utslagna-bordningsfigurer` — **Fullständigt implementerat**. Soldat, pirat
  och civilist har var sin transparent liggande, riktningsoberoende bild.
  Utslagna använder bilden och kan fortsatt väljas för `Med-pack`; döda använder
  samma pose med mörkare toning och kan inte väljas som levande mål.
- `bordning-utan-riktningspilar` — **Fullständigt implementerat**. De tidigare
  vita pilarna ovanpå personer är borttagna. Figurens åtta bildriktningar visar
  fortsatt vilket håll en aktiv person står åt.
- `traffchans-vid-synliga-fiender` — **Fullständigt implementerat**. Under
  spelarens tur visas en indikator och träffchans vid varje fiende som den
  aktiva soldaten själv ser. Vald fiende har ett tydligare crosshair.
  Markering och procenttext behåller läsbar skärmstorlek även vid mobilens
  utzoomning. Blockerat skott visar `0% · Blocked`. För få AP tonar ned indikatorn men
  ändrar inte träffchansen. Andra soldaters sikt och kartminne ger inga indikatorer.
- `kantindikator-for-synlig-fiende` — **Fullständigt implementerat**. En fiende
  som den aktiva soldaten ser men vars figur ligger utanför den fria kartytan
  får samma crosshair och procent vid kanten i fiendens riktning. Flera
  indikatorer längs samma kant säras. Ett klick väljer fienden och panorerar
  mjukt till den på 300 ms med oförändrad zoom, utan att avfyra ett skott.
- `automatisk-bordningstur-vid-tom-ap` — **Fullständigt implementerat**. När AP
  når noll avslutas soldatens aktivering efter den färdiga handlingen. Nästa
  figur följer befintlig turhantering, inklusive uppskjutna soldater och
  initiativordning. Animationer visas färdigt före nästa figurs handling.
  Seger avgörs före turbyte; en handling avslutar aldrig samma tur två gånger.
- `hukning-minskar-skottchans` — **Fullständigt implementerat**. Hukning ger
  +2 Defense mot gevär och overwatch även utan skydd. Bakom `Half cover`
  behålls totalbonusen +5. Rök behåller sin separata bonus. Den nya bonusen
  gäller inte melee och är densamma i träffchansen och det faktiska skottet.
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
- `sikt-och-eld-fran-vald-soldat` — **Fullständigt implementerat med ändrat
  beteende**. Modellen beräknar fortsatt soldatens sikt och möjliga skott för
  regler, målindikatorer och AI. Kartans tidigare cyan och röda rutkanter har
  uttryckligen ersatts av `bordning-utan-sikt-och-eldrutor`.
- `bordning-utan-sikt-och-eldrutor` — **Fullständigt implementerat**. Röda och
  blå markeringar på marken samt deras förklaringar visas inte. Den gröna och
  orangea förhandsvisningen av vald förflyttningsväg behålls.
- `spelmassigt-bordningsgranssnitt` — **Fullständigt implementerat**. Kartan
  upptar huvuddelen av skärmen. Truppstatus, handlingar och stridslogg ligger
  som kompakta HUD-lager ovanpå kartan. Handlingar har bilder och etiketter;
  zoom sker med nypning eller mushjul.
- `sikt-minne-och-ljudmarkorer` — **Fullständigt implementerat**. Soldater ser 180 grader.
  Sidorna delar aktuell sikt och senast kända fiendeposition. Personer blockerar
  inte den delade sikten. Skeppets yttre form är känd, interiören utforskas och
  aktuell sikt skiljs tydligt från kartminne. Våld visar sin exakta ruta som
  ljudmarkör för motståndarsidan till rundans slut.
- `senast-sedd-fiende-med-fragetecken` — **Fullständigt implementerat**. En
  dold senast känd position visas som ett orange frågetecken. Markören finns
  kvar för en utslagen fiende som kan behandlas, men tas bort för döda och
  evakuerade. Om den kända rutan åter syns utan fienden rensas den gamla
  positionen. Synliga personer visas bara med sin figur.
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
  `Defenders are acting…` inte fastnar. Köade uppdateringar visas i ordning även
  när en handling saknar animation, så nästa aktiva soldat visas när det blir
  spelarens tur. Civilisterna styrs av AI, flyr från
  alla stridande och ljud, öppnar vanliga dörrar men hackar inte och försöker
  använda escape pods. Överlevande ger ett bonusutfall utan kampanjbelöning i
  prototypen.
- `lokal-bordningskarteditor` — **Fullständigt implementerat**. En editor för
  skeppens bordningslayouter körs bara mot den lokala servern. Knappen
  `Ship layouts` i skärmens nederkant visas när `GET /api/boarding-maps`
  svarar med minst en karta, även ovanpå sparskärmen. Utan API, som på Pages
  och i vanliga tester, förblir knappen dold. Där väljs skepp, rutnätets
  bredd och höjd, en pensel för vänster musknapp och en för höger, och
  skeppets sprite som bakgrund som kan panoreras och skalas. Undo och redo
  använder command pattern. Spara skriver över den valda kartfilen i
  `src/client/maps/` och behåller `[lights]` tillsammans med övriga lager.
  Skrovgenombrott och vakuum ingår inte. Kampanj och sparplatser påverkas inte.
- `isometrisk-bordningskarteditor` — **Fullständigt implementerat**. Samma
  utkast kan visas med stridens klassiska 2:1-diamanter, golv- och väggtexturer
  och upphöjda barriärer. Väljaren `View` växlar mellan `Isometric` och
  `Top-down`. Ovanifrån används för spritejustering. Isometrin visar samma
  celler som bordningsstriden. Penslar, storlek, undo och spara fungerar i
  båda vyerna.

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

Karteditor, skrovgenombrott och vakuum ingår inte.

## Dockningskorridorens grafik

`dockningskorridor-sprite` är **Fullständigt implementerat**. En transparent korridorsprite förbinder dockade skepp på stridskartan. Originalet finns i `assets/original/map/docking-corridor.png`. Bilden genererades med inbyggd bildgenerering med en prompt om en rak trycksatt korridor ovanifrån, med dockningskragar, grå metallplåt och blågröna och bärnstensfärgade detaljer.

## Isometriska bordningsobjekt

`isometriska-bordningsobjekt` är **Fullständigt implementerat**. Airlock, reactor, Half cover och öppna respektive stängda dörrar längs båda kartaxlarna visas som separata bilder utan golv. Dörrarnas riktning följer intilliggande väggar. Förstörda objekt och bilder som inte laddas behåller reservvisningen; låsta dörrar markeras fortfarande.

Originalen i `assets/original/boarding/` behålls i hög upplösning. Bilderna med suffixet `-v2` genererades med inbyggd bildgenerering för ett isometriskt 2:1-rutnät: separata objekt av mörk blågrå metall med cyan och bärnstensfärgade detaljer, genomskinlig bakgrund och utan golv. De öppna dörrarna genererades från respektive stängd dörr med samma ram och genomskinlig öppning. Dessa första dörrbilder ersätts vid meterskalan nedan. Webbversionerna beskärs och skalas med `scripts/prepare-boarding-objects.py`; samma beskärning används för båda tillstånden i varje dörrpar.

Andra möjliga bildbehov är breach, escape pod, förstörda varianter av miljöobjekt samt figurernas olika riktningar och animationer. Golv, väggar och en stillbild per figurgrupp finns redan.

## Meterskala och automatiska väggsnitt

`meterskala-i-bordning` och `genomskinliga-skymmande-vaggar` är **Fullständigt implementerat**.

| Del                                 | Mått                   |
| ----------------------------------- | ---------------------- |
| Golvruta                            | 1 × 1 m                |
| Vägg och ytterskrov                 | 2,4 m hög              |
| Dörrens och airlockens fria öppning | 2,1 m hög              |
| Stående person                      | cirka 1,8 m hög        |
| Reactor                             | 1,8 m hög              |
| Half cover                          | 1,2 m hög              |
| Tunn innervägg                      | 1/3 m tjock, 2,4 m hög |
| Halvhög tunn vägg                   | 1/3 m tjock, 1,2 m hög |

Dessa mått ersätter tidigare oberoende pixelstorlekar i `isometrisk-bordningsvy` och `isometriska-bordningsobjekt`. Half cover behåller sin tidigare relation till vägghöjden. Rörelse-, sikt- och stridsregler ändras inte, och sparningar är kompatibla.

`tunna-innervaggar` och `halvhog-tunn-vagg` är **Fullständigt implementerat**. En tunn innervägg står centrerad på en golvruta och är en tredjedel så tjock som en vanlig vägg. `Q` och `q` är tjocka längs q och vänder det yttre golvet mot `(q+1, r)`. `R` och `r` gör detsamma längs r mot `(q, r+1)`. Den inre tredjedelen visar rutans golvtextur. Den yttre tredjedelen visar grannens golvtextur när grannen har golv och sidan är känd eller ihågkommen. `Outside`, vanlig vägg och ytterskrov lämnar den yttre tredjedelen utan golv. `Q` och `R` är 2,4 m, blockerar gång, sikt, skott och ljus, har 10 träffpunkter och fälls till 40 cm när de skymmer upptäckt golv. En förstörd fullhög tunn vägg släpper igenom sikt och skott men rutan förblir ogångbar. `q` och `r` är 1,2 m och fungerar som `Half cover` i båda riktningarna: de blockerar gång, inte sikt, skott eller ljus, ger samma skydd och har 6 träffpunkter. De fälls inte. När de förstörs blir rutan gångbar. Editorns penslar heter `Thin wall q`, `Thin wall r`, `Low thin wall q` och `Low thin wall r`. Befintliga kartor och `Half cover` ändras inte.

Väggar och ytterskrov som överlappar upptäckt golv bakom sig visas som ogenomskinliga 40 cm höga genomskärningar. Både aktuell sikt och kartminne kan utlösa snittet, men okänt golv gör det inte. Fullhöga tunna väggar använder samma snitt. Halvhöga tunna väggar gör det inte. Ovansidan visar en ljus metallkant, mörkare kärna och förstärkningsribbor längs väggsträckan. Figurer och föremål behåller gemensam djupordning med väggarna. Klick ovanför snittet når synliga figurer bakom, medan den kvarvarande väggen blockerar klick på täckta figurdelar. Sikt, skott och ljusblockering använder den fullständiga väggen. Denna uttryckliga ändring ersätter tidigare 35 procents opacitet; det stabila kravnamnet `genomskinliga-skymmande-vaggar` behålls.

Bildoriginalen med suffixet `-meters` ersätter de tidigare dörr- och airlockbilderna. Reactor, Half cover, golv, väggtextur och figurer återanvänds och anpassas till måtten. [Prompter och bildberedning](image-prompts/boarding-scale.md) beskriver leveransen. Jämförelsescen och spelvyn har granskats i mobilens stående och liggande format; riktade tester skyddar skala, ritordning, skymning, val genom väggar och dold information.

## Fasta lampor och läsbar interiör

- `formbar-skeppskontur` — **Fullständigt implementerat**. `Outside` anger tom
  rymd inom kartans rektangel; `Hull` placeras manuellt runt skeppets form.
- `redigerbara-bordningslampor` — **Fullständigt implementerat**. Lampor kan
  läggas till och tas bort i editorn; de kräver golv och kan ångras.
- `kategoriserad-bordningspalett` — **Fullständigt implementerat**. Terräng,
  objekt, rum, startpositioner och belysning har separata grupper och verktygshjälp.
- `isometrisk-skeppsreferens` — **Fullständigt implementerat**. Skeppsbilden
  projiceras bakom isometrin och syns genom `Outside` och runt kartan.
- `rumsspecifika-bordningstexturer` och `texturerad-vaggovansida` — **Fullständigt
  implementerat**. Bilderna används i spel och editor.
- `spelidentisk-bordningseditor` — **Fullständigt implementerat**. Spelets
  bilder, ytprojektion, ljus och väggsnitt används även i editorn.

- `ljuskallestyrd-bordningsbelysning` — **Fullständigt implementerat**. Taklampor anges i ett valfritt `[lights]`-lager med `L` och `-`, med samma dimensioner som övriga kartlager. Lampor kräver golv. Standardlampan sitter på 2,2 m höjd med 6 m räckvidd och intensitet 1; ambientnivån är 0,65. Alla levererade interiörer har fasta lampor, och den sammansatta dockningskorridoren får en mittlampa. Belysningen styrs inte av soldaternas position, riktning eller sikt.
- `vertexljus-i-bordning` — **Fullständigt implementerat**. Varje hörn på golv och väggytor får ljus från lampor med fri ljuslinje, avståndsavtagande och hänsyn till ytriktning. Ljuset interpoleras över ytornas trianglar och multipliceras med befintliga texturer. Väggar, skrov, stängda dörrar och rök blockerar ljus; förstörda barriärer, öppna dörrar och personer gör det inte. Väggsnitt använder full vägghöjd vid blockering.
- `tileljus-for-sprites` — **Fullständigt implementerat**. Varje ruta får ett ljusvärde vid golvets mittpunkt. Personer och objektsprites använder detta värde; under rörelse interpoleras figurens ljus mellan start och mål. HP, AP, riktning och valmarkeringar påverkas inte av belysningen.

Upptäckta rutor har samma belysning i aktuell sikt och kartminne. Den tidigare siktstyrda mörkningen är borttagen. Okänd interiör och dolda personer behåller sina synlighetsregler. Lamporna kan inte släckas eller förstöras. Sparformatet ändras inte: kartan med lampor återskapas vid återläsning.

Leveransen är granskad i mobilens stående och liggande format med texturer, figurer och väggsnitt. Riktade tester verifierar även reservgeometri, återanvändning av ljusmasker vid ändrad sikt, beskärning av väggens nedre texturdel och mjuk figurtoning under rörelse.
