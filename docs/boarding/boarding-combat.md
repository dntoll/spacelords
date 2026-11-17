# Bordningsstrid

Bordning ingår i kampanjens taktiska rymdstrid. Pirater, infångade
`Space pirate` och `Raptor` kan välja `Dock` längs babord eller styrbord.
Efter den pågående rymdstridsrundan växlar spelet två bordningsrundor och två
rymdstridsrundor. Anfallaren startar i motståndarens airlock. Avbrott är
tillåtet när alla levande stridande är i eget skepp. Pirater lämnar en
cockpit-soldat. Utslagen sida ger vinnaren båda skeppen i samma strid.

Huvudmenyns `Test boarding (cheat)` är ett fristående testspel utan påverkan
på sparplatser. `valbar-roll-i-testbordning` — **Fullständigt implementerat**:
spelaren väljer det bordade skeppet och anfaller från en `Raptor` eller
försvarar sig mot ett `Space pirate`. Standard är anfall mot `Transport ship`.
Striden använder kampanjens regler för placering och mål. Detta ersätter
`valbart-skepp-i-testbordning`, där ett valt anfallande skepp bordade den fasta
testtransporten.

## Krav och status

- `fristaende-bordningsprototyp` — **Fullständigt implementerat**. Ett upprepningsbart
  testscenario ska kunna startas och avslutas från huvudmenyn utan att ändra
  sparade spel.
- `datadriven-bordningskarta` — **Fullständigt implementerat**. Kartans terräng, objekt,
  rum och startpositioner ska läsas från separata lager i en textfil som går
  att redigera för hand.
- `individuellt-bordningsinitiativ` — **Fullständigt implementerat**. Varje soldat slår
  D20 plus initiativvärde varje runda. Högre grundvärde bryter lika total;
  fortsatt lika resultat slås om. Civilister agerar sist. Spelarens soldater
  får sina platser i ordningen i fast lagordning (`fast-soldatordning`).
- `fast-soldatordning` — **Fullständigt implementerat**. De platser i
  initiativordningen som spelarens soldater slår till sig fördelas på soldaterna
  i lagets ordning, så att soldat 1 alltid är den som väljs först varje runda,
  därefter soldat 2 och så vidare. Fiendernas platser påverkas inte. Ersätter
  den del av `individuellt-bordningsinitiativ` som lät varje soldats eget slag
  avgöra soldaternas inbördes ordning.
- `actionpoints-och-riktad-forflyttning` — **Fullständigt implementerat**. Egenskaper och
  fasta utrustningsmodifierare ger AP. Soldater går endast framåt. Ett stående
  rutsteg kostar 2 AP, ett hukat steg 3 AP, ett diagonalt steg 3 AP stående eller 4 AP hukande, en 45-gradersvändning 0,25 AP (`billig-vandning`) och byte
  mellan stående och hukad ställning 1 AP. Handlingar får blandas fritt och
  förflyttning sker i åtta riktningar. Diagonaler kräver att båda sidrutorna
  är fria för rörelse. Detta ersätter uttryckligen den tidigare regeln om fyra
  riktningar utan diagonaler och 90-gradersvändningar; den tidigare hexkartan
  med sex riktningar är fortsatt ersatt.
- `ap-fargad-bordningsvag` — **Fullständigt implementerat**. En vald väg visar
  bara rutor som ryms inom kvarvarande AP. Rutor där ett gevärsskott fortfarande
  ryms efter ankomst har en grön kontur; övriga rutor man just når har en brun
  kontur. Rutorna fylls inte med markeringsfärg.
- `ap-kostnad-och-handlingssymbol-pa-bordningsruta` — **Fullständigt
  implementerat**. Bara den gula destinationsrutan visar hela AP-kostnaden,
  inklusive alla vändningar på vägen, och samma `Move`-bild med fotsymbol som
  handlingsknappen. De gröna och bruna vägrutorna visar ingen siffra eller
  symbol. En vald destination, fiende eller dörr visar en liten meny med de
  lagliga handlingarna. En låst dörr visar `Hack door` för en soldat med
  Hacker tools; en avlägsen dörr visar `Move`.
- `animerad-bordningsforflyttning` — **Fullständigt implementerat**. Utförd
  förflyttning animerar varje vändning och steg för den aktiva soldaten och för
  synliga försvarare och civilister. Sikt och kartminne uppdateras efter varje
  del så att spelaren ser vad som händer på vägen. Dolda figurer animeras inte.
  En redan visad förflyttning spelas inte om.
- `vandning-under-forflyttning` — **Fullständigt implementerat**. En vändning
  som följs av ett steg spelas samtidigt med steget: figuren vänder sig i
  början av steget medan den går. Varje vändning på 45° tar 70 ms och ett
  steg 260 ms. Flera vändningar i rad spelas som en snabb vändning. En
  vändning som ett skott följer direkt visas fortfarande före skottet. Sikt och
  kartminne visas efter det sammanslagna steget. Detta ersätter att varje
  vändning i `animerad-bordningsforflyttning` spelades som en egen del.
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
  undan. Alla soldater kan också väljas i bottenfältet i stående och liggande
  läge. En soldat som inte kan agera kan tryckas för att visa orsaken.
- `kamerafokus-vid-bordningssoldatbyte` — **Fullständigt implementerat**.
  Spelaren har en zoomnivå för alla soldater. Manuell zoom ändrar den.
  När en egen soldat blir vald, manuellt eller automatiskt, panoreras figuren
  till mitten av den fria kartytan och zoomen sätts till spelarens nivå, även
  om figuren redan syntes. Det ersätter kameran per soldat. HUD och en liten
  kantmarginal räknas bort.
- `kameraoverblick-vid-synlig-bordningsrorelse` — **Fullständigt implementerat**.
  Före varje synligt steg av en försvarare eller civilist, och när spelaren
  hör ett nytt ljud, panorerar kameran så att figuren och de egna soldater
  som ser den hamnar mitt på den fria kartytan, och zoomar ut bara så mycket
  som behövs för att alla punkter ska rymmas.
  Endast synliga start- och slutpositioner påverkar kameran; riktning, barriärer
  och rök avgör vilka egna soldater som ser figuren. Kameran står still under
  själva steget. Inramningen ligger kvar mellan stegen i samma uppspelning
  och återgår sedan till spelarens zoom och panoreringen före händelsen.
  Dolda förflyttningar och stillastående turbyten ger ingen sådan kameraflytt.
- `kameraoverblick-fore-bordningsskott` — **Fullständigt implementerat**. Före
  ett skott mellan en synlig egen soldat och försvarare panorerar kameran och
  zoomar vid behov ut så att båda figurerna ryms på den fria kartytan. Skottet
  animeras först när kameran är klar. Efter uppspelningen återgår zoomen till
  spelarens nivå, eller till fokus på nästa egna soldat om turen byts. En dold
  skytt avslöjas inte av kameran.

  Kameraflödena använder mjuka övergångar. Manuell panorering eller zoom avbryter automatiken för resten av den pågående uppspelningen utan
  att stoppa figurerna. Minskad rörelse visar slutläget direkt. Storleksbyte
  och stängning avslutar väntande kamerafaser säkert. Sparningar påverkas inte.

- `klickskott-pa-vald-fiende` — ersatt av
  `kontextstyrda-bordningshandlingar`. Ett klick på en fiende visar lagliga
  handlingar vid rutan; `Shoot` avfyrar geväret. `Rifle` i bottenfältet kan
  också väljas som genväg före målet.
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
- `klickgang-pa-vald-destination` — **Fullständigt implementerat**. Ett klick
  på en tom ruta visar vägen och ett andra klick går dit. `Move` i rutmenyn
  fungerar också.
- `gang-mot-avlagset-mal` — **Fullständigt implementerat**. `Move` på en
  vald destination eller dörr som ligger för långt bort för kvarvarande AP
  går längs den billigaste vägen så långt AP räcker. Mot en stängd dörr eller
  en upptagen ruta stannar soldaten bredvid den.
- `vand-mot-vald-ruta` — **Fullständigt implementerat**. Soldaten vänder sig
  mot en vald ruta i 45-graderssteg för 0,25 AP per steg. Det återinför
  vändningen som tidigare togs bort av `kontextstyrda-bordningshandlingar`.
- `vandning-mot-nasta-steg` — **Fullständigt implementerat**. När soldaten
  går mot ett mål som AP inte räcker till används kvarvarande AP efter sista
  steget till att vända soldaten mot nästa steg, så att den kan fortsätta
  direkt nästa runda.
- `ap-fraktion-sparas` — **Fullständigt implementerat**. Därefter slutar
  soldatens tur, och AP som är mindre än nästa stegs kostnad läggs till
  soldatens AP vid nästa aktivering. Kostar nästa steg 2 AP sparas till
  exempel 1,75 AP. Detta ersätter den tidigare gränsen där bara en bråkdel
  under 1 AP sparades och soldaten annars fick fortsätta agera.
- `sparad-gangdestination` — **Fullständigt implementerat**. Ett mål soldaten
  inte hann nå sparas och är valt igen när soldaten aktiveras nästa gång. Valet
  `Move` fortsätter gå. Målet glöms när soldaten når det eller
  går någon annanstans med en vanlig förflyttning.
- `klickdorr-pa-vald-dorr` — ersatt av
  `kontextstyrda-bordningshandlingar`. Ett klick på en dörr visar `Open door`,
  `Close door`, `Hack door` eller `Move` när respektive handling är laglig.
  Öppna dörrar kan väljas.
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
- `figurvarianter-i-bordning` — **Fullständigt implementerat**. Det finns fyra
  bildark med samma upplägg: originalet och tre varianter. Varje person får ett
  fast utseende efter sitt nummer inom sidan, så `Boarder 1`–`4` och de fyra
  första piraterna och civila ser alla olika ut och behåller sitt utseende hela
  striden. Varje sida i varje ark har sin egen pixelskala så att alla står 1,8 m höga, hur stort tecknaren än ritat dem; detta ersätter en gemensam skala per ark, som gjorde soldater olika långa i olika varianter. Arken är inte ett jämnt rutnät, så skriptet hittar figurernas sju rader genom de genomskinliga mellanrummen i stället för att dela arket i lika höga rader. Det rättar figurer som klipptes av vid en rutnätslinje, till exempel stående civila och pirater. Valet
  är bara grafik och sparas inte. Redigeringsvyn visar originalutseendet.
  Originalarken ligger i `assets/original/boarding/60deg/` och
  `scripts/prepare-boarding-characters.py` bygger en atlas per ark.
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
  får samma crosshair och procent vid den närmaste punkten på kanten, så att
  etiketten ligger intill fienden och inte där en stråle från mitten når
  kanten. Flera
  indikatorer längs samma kant säras. Ett klick väljer fienden och panorerar
  mjukt till den på 300 ms med oförändrad zoom, utan att avfyra ett skott.
- `kantindikator-utanfor-granssnitt` — **Fullständigt implementerat**. Kantens
  crosshair och etikett undviker kontrollerna, `Combat details`, senaste
  loggraden och knapparna i toppen. Den glider i första hand längs sin kant
  förbi panelen och flyttas inåt bara när det är mycket närmare.
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
- `personer-blockerar-inte-sikt` — **Ersatt** av `personer-som-pelare-i-sikt`.
- `reaktor-skymmer-sikt` — **Fullständigt implementerat**. En hel reactor
  skymmer sikt och skott som en stående person men är en pelare med en halv
  rutas radie, alltså lika bred som rutan. Själva reaktorn går fortfarande att
  se och beskjuta. En förstörd reactor skymmer inte. Granater kastas över den.
- `personer-som-pelare-i-sikt` — **Fullständigt implementerat**. En stående
  person, civil eller stridande, är en pelare med 0,5 rutors diameter mitt i
  sin ruta. Den skymmer sikten och kastar en skugga, så rutor bakom kan vara
  helt eller delvis dolda. En hukande person har samma storlek men skymmer inte
  sikten; den ger halvskydd åt den som står närmast bakom, på samma sätt som en
  låda, och skuggan ritas orange i siktytan. Skott går förbi personer när minst
  10 % av målrutan syns; delvis sikt ger målet +2 eller +4 i försvar enligt
  `delvis-synligt-mal`. Målets egen pelare och skyttens egen räknas aldrig.
  Utslagna och döda ligger ner och påverkar inte sikten.
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
  som kompakta HUD-lager ovanpå kartan. Handlingar har stora bilder utan synliga etiketter;
  zoom sker med nypning eller mushjul.
- `sikt-minne-och-ljudmarkorer` — **Fullständigt implementerat**. Soldater ser 180 grader.
  Sidorna delar aktuell sikt och senast kända fiendeposition. Stående personer
  skymmer sikten enligt `personer-som-pelare-i-sikt`. Skeppets yttre form är känd, interiören utforskas och
  aktuell sikt skiljs tydligt från kartminne. Våld visar sin exakta ruta som
  ljudmarkör för motståndarsidan till rundans slut.
- `senast-sedd-fiende-med-fragetecken` — **Fullständigt implementerat**. En
  dold senast känd position visas som ett orange frågetecken. Markören finns
  kvar för en utslagen fiende som kan behandlas, men tas bort för döda och
  evakuerade. Om den kända rutan åter syns utan fienden rensas den gamla
  positionen. Synliga personer visas bara med sin figur. Frågetecknet visades
  tidigare aldrig i spelet, eftersom spelarens bild utelämnar dolda fiender;
  det är rättat.
- `geometrisk-sikt` — **Fullständigt implementerat**. Sikten räknas med
  verkliga siktlinjer i stället för hela rutor: 180 grader framåt från soldatens
  rutmitt, utan avståndsgräns inom skeppet (`sikt-over-hela-skeppet`), och väggar, skrov, höga tunna väggar, stängda
  dörrar och rök kastar skuggor. En ruta kan därför vara delvis synlig. Den
  valda soldatens sikt ritas på golvet under spelarens tur som en mycket svag
  yta med en smal ljusblå kantlinje, och lådor och låga väggar som syns markeras med orange
  rutkant som halvskydd. Detta ersätter delvis `bordning-utan-sikt-och-eldrutor`:
  siktytan visas igen, men som en sammanhängande yta; de röda eldrutorna visas
  fortfarande inte.
- `sikt-over-hela-skeppet` — **Fullständigt implementerat**. Bordningen sker
  inomhus, så sikten begränsas bara av det som skymmer: väggar, skrov, stängda
  dörrar, rök och personer. Räckvidden är skeppets diagonal plus en halv ruta,
  så en fri siktlinje når hela skeppet. Detta ersätter radien 8,5 rutor i
  `geometrisk-sikt`. Skottens räckvidd på 8 rutor är oförändrad.
- `delvis-synligt-mal` — **Fullständigt implementerat**. En ruta räknas som
  sedd när minst 10 % av den syns; först då syns en fiende där och kan beskjutas.
  Ett skott mot ett mål vars ruta syns till under hälften ger målet +4 i försvar,
  och ett mål som syns till hälften eller mer men inte helt ger +2. Bonusen
  ingår i försvarsvärdet i stridsloggen och i träffchansen. Personer i vägen
  blockerar fortfarande skott längs linjen mellan rutornas mitt.
- `hukad-ser-inte-over-halvskydd` — **Fullständigt implementerat**. En hukad person (ögon på 0,8 m) ser inte över halvskydd (1,2 m) som ligger mer än en ruta bort: lådor, låga väggar och andra hukade personer skymmer då sikt och skott som väggar. Halvskydd intill den hukade går att kika och skjuta över.
- `grannruta-syns-genom-rok` — **Fullständigt implementerat**. Man ser alltid minst en ruta runt sig: rök skymmer aldrig en intilliggande ruta, inte heller diagonalt genom rök på rutorna bredvid. Väggar och blickriktning gäller som vanligt, och rök på grannrutan skymmer fortfarande det som ligger bortom den.
- `skott-langs-fri-siktlinje` — **Fullständigt implementerat**. Skottet flyger till den synliga punkt i målrutan som ligger närmast mitten, så spårljuset aldrig går genom en vägg, och glas längs den linjen krossas.
- `halvskydd-markering-sammanfogad` — **Fullständigt implementerat**. Alla halvskyddsskuggor ritas som en orange yta med en enda kontur, beskuren till siktytan och skeppets rutor. En låg tunn vägg kastar sin skugga från väggens plattor, så golvet på betraktarens sida markeras inte. Halvskydd ritas inte längre med egen rutram.
- `halvskydd-skuggar-delvis` — **Fullständigt implementerat**. Lådor och låga
  väggar skymmer inte sikten men kastar en skugga från skyttens öga som når
  ungefär en ruta bakom dem. Skuggan ritas orange med kantlinje i den valda
  soldatens siktyta. Den andel av målrutans synliga del som ligger i skugga från
  halvskydd intill målet avgör bonusen: minst hälften ger full bonus (+2 stående,
  +5 hukad), 10–50 % ger halv bonus (+1 stående, +3 hukad), och under 10 %
  räknas som inget skydd (en hukad person får då +2 mot skott som förut). Detta
  ersätter den tidigare regeln där skyddet räknades som helt eller inte alls
  efter avståndet till linjen mellan rutornas mitt.
- `avstand-paverkar-traffchans` — **Fullständigt implementerat**. Ett skott
  ger målet +1 i försvar per påbörjade två rutor bortom två rutors avstånd
  mellan rutornas mitt: upp till 2 rutor +0, upp till 4 +1, upp till 6 +2 och
  upp till 8 +3. Bonusen ingår i försvarsvärdet i stridsloggen och i
  träffchansen och läggs ihop med skydd, rök och delvis sikt. Närstrid påverkas
  inte.
- `billig-vandning` — **Fullständigt implementerat**. Varje 45-gradersvändning
  kostar 0,25 AP i stället för 1 AP, både med vridknapparna och när en
  förflyttning vänder soldaten. Det ersätter vändkostnaden i
  `actionpoints-och-riktad-forflyttning`. AP kan därför visas med decimaler,
  till exempel `11.75 AP`.
- `fiende-syns-till-sin-tur` — **Fullständigt implementerat**. En fiende som
  någon soldat har sett ritas kvar på sin ruta när ingen längre ser den, till
  exempel när soldaten vänder sig bort eller går. Fienden flyttar sig bara på
  sin egen tur, så bilden stämmer. När fiendens tur börjar och ingen ser den
  försvinner figuren och ersätts av frågetecknet. Detta ändrar
  `sikt-minne-och-ljudmarkorer`, där fiender bara syntes i aktuell sikt.
  Civila som har setts står på samma sätt kvar tills de civilas fas i
  rundans slut når dem; då försvinner de om ingen ser dem.
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
- `ingen-rok-i-hela-vaggar` — **Fullständigt implementerat**. Rök från granater
  och rökens spridning hamnar aldrig i rutor med hel vägg, ytterskrov eller
  stängd dörr. En sönderskjuten vägg kan fyllas med rök. Äldre sparad rök i
  väggar visas inte.
- `bordning-explosioner-och-forstorelse` — **Fullständigt implementerat**. När
  en splittergranat landar visas blixt, eldklot, gnistor, splitter och en
  tryckvåg; en rökgranat ger ett grått rökutbrott, och ett gevärsskott ger
  gnistor i träffpunkten. Ett känt objekt som går sönder kastar metallskrot och
  gnistor, reactor med en större cyan explosion, och rutan visar därefter bråte.
  Effekterna är rent visuella och sparas inte.
- `utslagen-fiende-utan-sikte` — **Fullständigt implementerat**. En utslagen
  fiende får inget hårkors eller träffchans och ingen person som inte står upp
  får HP-mätare på kartan. Detta ändrar `traffchans-vid-synliga-fiender`, som
  tidigare visade indikatorer även för utslagna fiender.
- `ljudmarkor-bara-utom-sikt` — **Fullständigt implementerat**. Ljudmarkörens
  två gula ringar visas bara på rutor som spelaren inte ser just nu; på en synlig
  ruta upprepar den bara vad som redan syns.
- `avstangda-omojliga-handlingar` — **Fullständigt implementerat**.
  Utrustningsknappar och soldatens egna handlingar stängs av när AP eller
  laddningar saknas. Rutmenyn visar bara handlingar som är lagliga för den
  valda rutan.
- `fasta-handlingsplatser` — ersatt av
  `kontextstyrda-bordningshandlingar`, som är **Fullständigt implementerat**.
  `Turn left` och `Turn right` visas runt den aktiva soldaten.
  `Crouch`/`Stand` och Overwatch ligger i bottenfältet intill vapnet. `Move`,
  skott, melee, personlig pryl, dörrhandling och
  evakuering visas runt den berörda rutan.
- `hallning-vid-vapnet` — **Fullständigt implementerat**. `Crouch`/`Stand`
  och `Overwatch` ligger bredvid soldatens vapen och pryl. Åtgärderna ingår
  inte längre i menyn runt soldaten.
- `bordningslogg-i-hornet` och `senaste-raden-i-bordningsloggen` —
  **Fullständigt implementerat**. `Combat details` ligger uppe till vänster.
  Den öppna loggen rullas automatiskt till senaste händelsen; en ny händelses
  sista rad visas i fyra sekunder även när loggen är stängd. Fullscreen och
  stängning ligger uppe till höger; rundrubriken är borttagen.
- `personlig-bordningsutrustning` — **Fullständigt implementerat**. Varje
  soldat har ett `Rifle` och en pryl. Prylarna roterar i ordningen Frag
  grenade, Smoke grenade, Hacker tools och Med kit. Granatbärare har tre
  granater, Med kit har en användning och Hacker tools förbrukas inte.
- `utrustningsknapp-utfor-valt-mal` och `rokgranat-pa-person` — **Fullständigt
  implementerat**. Ett tryck på vapen eller pryl utför handlingen på ett giltigt
  valt mål. Utan valt mål väljs mål därefter. Splittergranater kan kastas på
  fiender och rökgranater på alla personer, även civilister.
- `medkit-for-skadad-soldat` — **Fullständigt implementerat**. Med kit kan
  återuppliva en utslagen person eller läka en skadad stående person på en
  angränsande ruta, även om den står i en öppen dörr. Det läker en tredjedel
  av max-HP, högst till max-HP.
- `ateranvand-handlingsbilder` och `orsak-till-otillganglig-handling` —
  **Fullständigt implementerat**. Kontextmenyer använder de tidigare bilderna
  för respektive handling och `End soldier turn` är åter en liten bildknapp.
  Otillgängliga synliga knappar visas inaktiva, men förklarar orsaken vid tryck.
- `bordningshud-i-botten` — **Fullständigt implementerat**. Status, soldatval,
  namn, HP, AP, utrustning, hållning, Overwatch och turhandlingar ligger i ett
  responsivt bottenfält. `bordningslogg-i-hornet` flyttar loggen och
  fönsterknapparna till skärmens överkant och tar bort rundrubriken. Den
  aktiva soldatens namn och AP upprepas inte i en separat statusrad.
- `fullscreen-i-bordning` — **Fullständigt implementerat**. Vyn försöker gå
  till fullscreen när den öppnas. En Enter/Exit-knapp finns som reserv och
  spelet fortsätter i vanlig helskärmsdialog om webbläsaren nekar begäran.
- `gang-knapp-till-avlagset-mal` — **Fullständigt implementerat**. `Move` är
  tillgänglig även när destinationen ligger för långt bort och går då mot målet
  (`gang-mot-avlagset-mal`).
- `granat-kostar-bara-vid-kast` — **Fullständigt implementerat**. Ett kast
  utanför räckvidden (6 rutor), utan kvarvarande granat av den sorten eller med
  för lite AP avvisas innan någon AP dras. Granatknapparna är avstängda för
  sådana rutor. Samma gäller `Hack door` mot en ogiltig dörr.
- `granat-over-halvskydd-inte-genom-vagg` — **Fullständigt implementerat**.
  Kastet följer en rak linje från kastarens rutmitt till målrutans mitt.
  Väggar, skrov, höga tunna väggar, stängda dörrar och rutor utanför däcket
  stoppar kastet (`The throw is blocked by a wall.`). En stående person i
  linjen (pelare med 0,5 rutors diameter, se `personer-som-pelare-i-sikt`)
  stoppar också kastet (`The throw is blocked by a standing person.`). Halvskydd,
  låga tunna väggar, rök och hukande personer kastas granaten över. Själva
  målrutan får vara en vägg. En granat som missar och avviker stannar framför
  den första vägg den skulle studsa in i.
- `stang-oppen-dorr` — **Fullständigt implementerat**. En soldat som står
  intill en öppen dörr får `Close door` (1 AP). Knappen är avstängd när någon
  står i dörrens ruta, och modellen avvisar stängningen utan AP-kostnad.
- `bordning-jamn-bildfrekvens` — **Fullständigt implementerat**. Golv, ljus
  och dimma ritas i ett cachat lager som bara byggs om när nya rutor upptäcks,
  ljuset ändras, bilder laddas eller zoomsteg ändras; under en förflyttning
  ljussätts bara området kring den gående figuren
  (`jamn-ljuskarta-under-forflyttning`). Siktområdets kontur förenklas en gång
  per sikt. Figurer, objekt och rök ljussätts med ett
  canvasfilter i stället för p5:s `tint()`, väggytor klipps inte i onödan och
  väggar utanför skärmen hoppas över.
- `snabb-bordningsvagsokning` — **Fullständigt implementerat**. Vägen till en
  vald ruta visas direkt, och turavslut och försvararnas drag väntar inte på
  vägsökningen. Vägarna blir desamma som tidigare.
- `motstandartur-i-mitten` — **Fullständigt implementerat**. När den aktuella
  personen inte är en av spelarens soldater, eller rundan avgörs, visas
  `Defenders are acting…` i en centrerad ruta över kartan. Handlingsraden
  döljs så länge. Rutan tar inte emot tryck, så kameran kan fortfarande
  flyttas. `Resolving action…` under spelarens egna animationer står kvar i
  handlingsraden.
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
  `src/client/boarding/maps/` och behåller `[lights]` tillsammans med övriga lager.
  Skrovgenombrott och vakuum ingår inte. Kampanj och sparplatser påverkas inte.
- `isometrisk-bordningskarteditor` — **Fullständigt implementerat**. Samma
  utkast kan visas med stridens klassiska 2:1-diamanter, golv- och väggtexturer
  och upphöjda barriärer. Väljaren `View` växlar mellan `Isometric` och
  `Top-down`. Ovanifrån används för spritejustering. Isometrin visar samma
  celler som bordningsstriden. Penslar, storlek, undo och spara fungerar i
  båda vyerna.

## Karta och dörrar

Textkartan har likstora lager för golv och skrov, objekt, namngivna rum och
startpositioner. `Bridge`, `Engineering`, `Cockpit`, `Galley`, breach, escape
pods, reaktor, dörrar och låga skydd markeras uttryckligen. En vanlig dörr kostar 1 AP att öppna eller
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
- `dockning-sida-vid-sida` — **Fullständigt implementerat**. Anfallaren ligger
  ovanför och försvararen under. Landgången är två rutor bred och tio rutor
  lång, med tunna väggar längs sidorna och en lampa i mitten. Ersätter att
  försvararen spegelvändes till höger.
- `fast-airlock-i-bordningskarta` — **Fullständigt implementerat**. Exakt en
  airlock i skrovets över- eller underkant, tom rymd rakt utanför och tomt golv
  innanför. Editorn lägger till en saknad airlock och tar bort extra när kartan
  öppnas.
- `avbryt-gammal-bordning-vid-laddning` — **Fullständigt implementerat**.
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

`isometriska-bordningsobjekt` är **Fullständigt implementerat**. Reactor och fristående objekt visas som separata bilder utan golv. Förstörda objekt och bilder som inte laddas behåller reservvisningen. Dörrar, airlock och Half cover ritas inte längre som bilder, se `dorrar-som-tunna-vaggar`, `airlock-med-dubbla-geometridorrar` och `halvskydd-som-geometri`.

`airlock-med-dubbla-geometridorrar` är **Fullständigt implementerat**. Airlockens skrovruta visar golv samt en inre och en yttre 2,1 m hög dörr på samma ruta. De använder vanliga dörrars projektion, texturer och ljus. Detta ersätter `airlock-i-60-graders-perspektiv` och den tidigare airlockbilden, vars perspektiv inte fungerade.

`forseglad-airlock` är **Fullständigt implementerat** med ändringen i `airlock-oppnar-at-blickriktning`: minst en dörr är stängd, men en aktiv soldat i airlocken håller dörren i sin blickriktning öppen. Detta ersätter att den som står i airlocken alltid är helt avskärmad. Att gå igenom kostar lika mycket AP som vanligt golv.

`automatisk-airlockcykel` är **Fullständigt implementerat**. Ett steg öppnar dörren på den sida man passerar. En aktiv soldat i airlocken håller dörren i blickriktningen öppen enligt `airlock-oppnar-at-blickriktning`; den motsatta hålls stängd. Layoutredigeraren visar dörrarna stängda.

Dessa två krav ersätter `oppna-airlockdorrar`, där dörrarna alltid ritades öppna.

`sprites-for-breach-och-escape-pod` och `oppen-escape-pod` är **Fullständigt implementerade**. Breach, en öppen och tom dockad escape pod samt luckan efter en använd pod har var sin sprite. En person kan tydligt stiga in i podden. Evakuering genom podden förbrukar den, medan breach fortsätter vara en återanvändbar evakueringspunkt.

`rumsspecifikt-half-cover` och `galley-rum-i-bordning` är **Fullständigt implementerade**. Half cover behåller samma geometri och regler men väljer sid- och topptextur efter rummet: styrpanel i `Cockpit`, maskin i `Engineering`, matbord/bänk i `Galley` och låda i övriga rum. `Galley` använder `G` i rumslagret, har egna golv- och väggtexturer, kan målas i editorn och finns i `Colony ship`.

`halvskydd-som-geometri` är **Fullständigt implementerat**. Half cover är en låda i spelets egen projektion: en fyrkant tre fjärdedelar av en ruta bred, centrerad i rutan och 1,2 m hög. De två synliga sidorna får `crate-side.png` och ovansidan `crate-top.png`, och varje yta ljussätts som väggar. Den ersätter lådbilden `crate`, som var ritad för en annan kameravinkel och därför fick fel projektion. Förstörd Half cover visar bråte som förut, och så länge texturerna laddas visas den enkla reservlådan. Redigeringsvyn ritar Half cover på samma sätt. Testbordningens transportskepp har en Half cover på (4, 9) i rummet där soldaterna börjar, så att lådan syns direkt.

`dorrar-som-tunna-vaggar` är **Fullständigt implementerat**. En dörr är en tunn vägg, en tredjedel av en ruta tjock och centrerad i rutan, längs den vägglinje den står i: väggar ovanför och nedanför ger en skiva som är tunn längs q (som `Q`), annars längs r (som `R`). Riktningen härleds ur kartans väggar och sparas inte, så sparade spel påverkas inte. En stängd dörr ritas som en fullhög tunn vägg med en egen dörrtextur i stället för väggtexturen, med cyan lampa när den är olåst och röd när den är låst. Ovansidan är inte väggens: `dorrens-ovansida` (**Fullständigt implementerat**) ger dörren en egen ovansida, en mörk skena med mittfog och gul-svarta varningsränder längs kanterna (`door-top.png`). Den fälls aldrig ner, inte ens när den skymmer upptäckt golv (`dorrar-falls-inte`, **Fullständigt implementerat**); detta ersätter att dörrar fälldes som tunna väggar. En öppen dörr har glidit in i väggen och visar bara golvet, och en förstörd dörr visar bråte. Golvet i dörrens ruta delas som vid en tunn vägg. Fullhöga tunna väggar och stängda dörrar skymmer sikt, skott och granatkast bara med sin skiva, inte med hela rutan: siktytans kant når fram till skivan och kan gå förbi dess ändar. Rök och vanliga väggar skymmer fortfarande hela rutan. Detta ersätter dörrbilderna i `isometriska-bordningsobjekt` och att tunna väggar skymde hela rutan i `geometrisk-sikt`. Redigeringsvyn ritar dörrar på samma sätt.

`animerade-dorrar` är **Fullständigt implementerat**. När en dörr som är synlig eller ihågkommen öppnas eller stängs glider dess två halvor isär in i väggen, eller ut ur den, på 0,45 s med mjuk start och inbromsning. Den del av ett dörrblad som gått in i väggen döljs, så texturen följer bladet i stället för att tryckas ihop. Dörrar i okänd terräng byter läge utan animation. Animationen är bara grafik: sikt och rörelse följer dörrens nya läge direkt.

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

`tunna-innervaggar` och `halvhog-tunn-vagg` är **Fullständigt implementerat**. En tunn innervägg står centrerad på en golvruta och är en tredjedel så tjock som en vanlig vägg. `Q` och `q` är tjocka längs q och vänder det yttre golvet mot `(q+1, r)`. `R` och `r` gör detsamma längs r mot `(q, r+1)`. Den inre tredjedelen visar rutans golvtextur. Den yttre tredjedelen visar grannens golvtextur när grannen har golv och sidan är känd eller ihågkommen. `Outside`, vanlig vägg och ytterskrov lämnar den yttre tredjedelen utan golv. `Q` och `R` är 2,4 m, blockerar gång, sikt, skott och ljus, har 10 träffpunkter och fälls till 40 cm när de skymmer upptäckt golv. En förstörd fullhög tunn vägg släpper igenom sikt och skott men rutan förblir ogångbar. `q` och `r` är 1,2 m och fungerar som `Half cover` i båda riktningarna: de blockerar gång, inte sikt, skott eller ljus, ger samma skydd och har 6 träffpunkter. De fälls inte. När de förstörs blir rutan gångbar. Befintliga kartor och `Half cover` ändras inte.

`fonster-pa-halvhog-vagg`, `helhogt-fonster`, `krossbart-glas` och `glas-tintar-ljus` är **Fullständigt implementerat**. Varje halvhög tunn vägg har ett ljusblått, genomskinligt fönster från 1,2 m upp till taket (2,4 m). `High window pane` (tecknet `W`) är ett fönster från golv till tak med samma sammanfogade form som tunna väggar. Glas släpper igenom sikt och skott men stoppar granatkast och gång; ett helt fönster ger inget skydd, medan den halvhöga väggen under glaset fortsatt ger `Half cover`. Ett gevärsskott krossar allt glas längs linjen mellan skyttens och målets rutmitt, vid träff och miss, och skada på en halvhög vägg krossar dess fönster. Då regnar glasbitar ner på golvet. `glas-krossas-nar-skottet-passerar`: glaset krossas i samma ögonblick som det animerade skottet når det. Ett krossat `High window pane` går att kliva igenom, och över en halvhög vägg med krossat glas kan man åter kasta granater. Lampljus genom helt glas får en blå ton. `tunna-fonster`: glaset ritas bara 2 cm tjockt och golvet under ett `High window pane` syns i hela rutan. Detta ersätter att granater alltid kan kastas över halvhöga tunna väggar.

`sammanfogade-tunna-vaggar` är **Fullständigt implementerat**. Väggens riktning väljs inte längre i editorn: penslarna heter `Thin wall` och `Low thin wall`, och formen byggs av grannarna. En tunn vägg når fram till varje grannruta (norr, söder, väster, öster i rutnätet) som har vägg, ytterskrov eller tunn vägg av valfri höjd, och till en dörr vars platta ligger i samma linje. Utan grannar blir den en pelare, med en granne en ände, med två ett rakt stycke eller ett hörn, med tre en T-korsning och med fyra ett kryss. Sikt, kast, ljus, skuggor, väggsnitt och ritning följer formen, så det öppna hörnet i ett L släpper igenom sikt. Raka väggar behåller golvbanden ovan; hörn, ändar och korsningar visar rutans eget golv. Detta ersätter att `Q` och `R` (och `q` och `r`) anger riktning; bokstäverna laddas fortfarande och betyder samma vägg.

Väggar och ytterskrov som överlappar upptäckt golv bakom sig visas som ogenomskinliga 40 cm höga genomskärningar. Både aktuell sikt och kartminne kan utlösa snittet, men okänt golv gör det inte. Fullhöga tunna väggar använder samma snitt. Halvhöga tunna väggar gör det inte. Ovansidan visar en ljus metallkant, mörkare kärna och förstärkningsribbor längs väggsträckan. Figurer och föremål behåller gemensam djupordning med väggarna. Klick ovanför snittet når synliga figurer bakom, medan den kvarvarande väggen blockerar klick på täckta figurdelar. Sikt, skott och ljusblockering använder den fullständiga väggen. Denna uttryckliga ändring ersätter tidigare 35 procents opacitet; det stabila kravnamnet `genomskinliga-skymmande-vaggar` behålls.

Bildoriginalen med suffixet `-meters` ersätter de tidigare dörr- och airlockbilderna. Reactor, Half cover, golv, väggtextur och figurer återanvänds och anpassas till måtten. [Prompter och bildberedning](../image-prompts/boarding-scale.md) beskriver leveransen. Jämförelsescen och spelvyn har granskats i mobilens stående och liggande format; riktade tester skyddar skala, ritordning, skymning, val genom väggar och dold information.

## Fasta lampor och läsbar interiör

- `formbar-skeppskontur` — **Fullständigt implementerat**. `Outside` anger tom
  rymd inom kartans rektangel; `Hull` placeras manuellt runt skeppets form.
- `redigerbara-bordningslampor` — **Fullständigt implementerat**. Lampor kan
  läggas till och tas bort i editorn; de kräver golv och kan ångras.
- `kategoriserad-bordningspalett` — **Fullständigt implementerat**. Terräng,
  objekt, rum, startpositioner och belysning har separata grupper och verktygshjälp.
- `isometrisk-skeppsreferens` — **Fullständigt implementerat**. Skeppsbilden
  projiceras bakom isometrin och syns genom `Outside` och runt kartan.
- `skeppsbild-under-bordning` — **Delvis implementerat**. Skeppsbilden ritas
  under kartan även i strid, med editorns justering. I en hopkopplad bordning
  flyttas anfallarens bild med sitt skepp och försvararens spegelvänds med sitt.
  Återstår: justering av skepp utom testbordningen och `Colony ship`.
- `hogupplost-skeppsbild-i-bordning` — **Fullständigt implementerat**. Spel och
  editor använder en högupplöst skeppsbild med samma utsnitt och proportioner
  som stjärnkartans bild, så befintlig justering gäller oförändrad.
- `rumsspecifika-bordningstexturer` och `texturerad-vaggovansida` — **Fullständigt
  implementerat**. Bilderna används i spel och editor.
- `spelidentisk-bordningseditor` — **Fullständigt implementerat**. Spelets
  bilder, ytprojektion, ljus och väggsnitt används även i editorn.

- `ljuskallestyrd-bordningsbelysning` — **Fullständigt implementerat**. Taklampor anges i ett valfritt `[lights]`-lager med `L` och `-`, med samma dimensioner som övriga kartlager. Lampor kräver golv. Standardlampan sitter på 2,2 m höjd med 6 m räckvidd och intensitet 1; ambientnivån är 0,42. Alla levererade interiörer har fasta lampor, och den sammansatta dockningskorridoren får en mittlampa. Belysningen styrs inte av soldaternas position, riktning eller sikt.
- `vertexljus-i-bordning` — **Fullständigt implementerat**. Varje hörn på golv och väggytor får ljus från lampor med fri ljuslinje, avståndsavtagande och hänsyn till ytriktning. Ljuset interpoleras över ytornas trianglar och multipliceras med befintliga texturer. Väggar, skrov, stängda dörrar och rök blockerar ljus; förstörda barriärer, öppna dörrar och personer gör det inte. Väggsnitt använder full vägghöjd vid blockering.
- `tileljus-for-sprites` — **Fullständigt implementerat**. Varje ruta får ett ljusvärde vid golvets mittpunkt. Personer och objektsprites använder detta värde; under rörelse interpoleras figurens ljus mellan start och mål. HP, AP, riktning och valmarkeringar påverkas inte av belysningen.

Upptäckta rutor har samma belysning i aktuell sikt och kartminne. Den tidigare siktstyrda mörkningen är borttagen. Okänd interiör och dolda personer behåller sina synlighetsregler. Lamporna kan inte släckas eller förstöras; detta ersätts av `tandbara-lampor` i [ljussättning i bordning](boarding-lighting.md). Sparformatet ändras inte: kartan med lampor återskapas vid återläsning.

Leveransen är granskad i mobilens stående och liggande format med texturer, figurer och väggsnitt. Riktade tester verifierar även reservgeometri, återanvändning av ljusmasker vid ändrad sikt, beskärning av väggens nedre texturdel och mjuk figurtoning under rörelse.

- `tydliga-handlingsbilder-pa-mobil` — **Fullständigt implementerat**. Stora,
  olikfärgade symboler ersätter tidigare likartade bilder. Knapparna saknar
  synlig text men behåller tillgänglighetsnamn och hela handlingsraden syns
  utan intern rullning. Detta ersätter tidigare krav på synliga knappetiketter.
- `synligt-skott-hela-vagen` — **Fullständigt implementerat**. Projektilen
  visas fram till målet; kameran ramar in synliga start- och slutpositioner,
  även när målet är ett objekt.
- `kastad-granat-i-bage` — **Fullständigt implementerat**. Granater visas i en
  båge från kastaren till faktisk nedslagsruta före effekten.
- `morkare-ambientljus-i-bordning` — **Fullständigt implementerat**.
  Ambientnivån är 0,42 i stället för 0,65, medan lamporna fungerar som tidigare.

## Bordningsfeedback november 2026

- `bordare-vid-malskeppets-ande` och `eget-skepp-upptackt` — **Fullständigt
  implementerat**. Bordarna fyller landgångens båda körfält närmast det bordade
  skeppets airlock. Det egna skeppet är upptäckt från start; anfallare känner
  även till landgången. Gäller testbordning och kampanj.
- `tunnare-dorrar` och `airlockdorr-framfor-soldat` — **Fullständigt
  implementerat**. Dörrar ritas 1/6 m tjocka i stället för 1/3 m. Airlockens två
  dörrar djupsorteras var för sig efter sin egen linje, så dörren närmast
  kameran täcker den som står i airlocken. Siktens och skottens geometri är
  oförändrad.
- `fiender-reagerar-pa-ljud` och `fiender-soker-upp-bordare` — **Fullständigt
  implementerat**. Varje ljud har räckvidd (närstrid 3, skott 8, rök 6,
  explosion 16 rutor). Försvarare inom räckhåll minns var ljudet kom ifrån;
  explosioner vänder dem dit direkt. På sin tur går de dit, även över flera
  aktiveringar, eller vänder sig mot platsen om de inte kommer närmare. Den som
  når platsen glömmer ljudet. Sparade spel utan minnet läses som tidigare.
- `samlat-pc-granssnitt` — **Fullständigt implementerat**. Med mus och minst
  681 px bredd samlas kontrollerna i nedre mitten: status, soldatrad och sedan
  utrustning bredvid turknappen. Mobilens layout är oförändrad.
- `meny-ovanfor-valt-mal`, `hp-i-valt-mal` och `tunn-ram-kring-vald-ruta` —
  **Fullständigt implementerat**. Menyn lyfts med målets höjd i aktuell zoom
  (person 1,8 m, dörr 2,1 m, vägg 2,4 m) och visar HP efter titeln. Vald ruta
  får en 1,25 px gul ram som siktkanten; ringen kring vald person är borttagen.
- `skott-genom-dubbelklick` — **Fullständigt implementerat**. Två klick på
  samma fiende inom 400 ms skjuter, även via kantindikatorn. Ett enkelklick
  väljer som tidigare.
