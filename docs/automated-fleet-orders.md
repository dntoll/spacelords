# Automatiska flottorder

## Återkommande bärgning

`automatisk-bargning` — **Fullständigt implementerat**.

Alla flottor med Salvage ship har en extra order, Auto salvage. Efter
Automated salvage väljer den närmaste kända vraket som varken är reserverat,
under bogsering eller vid ett varv. Avstånd mäts i hex; lika avstånd avgörs
stabilt med vrakets identitet. Flottan reser dit och bogserar vraket till
närmaste egna färdiga Shipyard som inte är förstört. Först efter leveransen
väljer den nästa vrak. Även flottor med flera Salvage ships tar ett nytt vrak
per resa. En redan påbörjad bogsering levereras först.

Ordern väntar när inget ledigt känt vrak finns och fortsätter när ett blir
känt eller ledigt. Saknas fungerande varv behålls vraket och uppdraget väntar.
Strid och normal rörelsebudget gäller, även vid upphämtning i den egna hexen.
Andra flottors reservationer tas inte över. Cancel automatic order eller en
ny manuell order avbryter automatiken och släpper oupphämtade reservationer;
pågående bogsering behålls. Att uttryckligen släppa ett vrak stoppar också
automatiken. Förlust av sista Salvage ship avbryter ordern.

## Automatisk farledsbemanning

`automatisk-farledsbemanning` — **Fullständigt implementerat**. Detta
ersätter spelarstyrd `automatisk-rutttilldelning` och forskningslåset
Automated transport. Auto assign route är borttaget.

Ett färdigbyggt Transport ship eller en Civilian shuttle, utan annan
uttrycklig startorder, får en egen flotta, reser till närmaste öppna farled
med minst antal bemannande skepp och börjar arbeta. Avståndet är det
kortaste hexavståndet till någon av ruttens ändplaneter; lika antal och
lika avstånd avgörs med ruttens identitet. Flera skepp som blir klara
samtidigt tilldelas ett i taget, så nästa ser den uppdaterade bemanningen.
Saknas farled väntar flottan och söker igen vid nästa årsstart eller när en
farled skapas. Bogserade vrak måste levereras först.

Bemanningsantalet är Transport ships och Civilian shuttles på farleden,
inklusive skepp som redan är på väg dit. Fighters räknas inte där. Flottor
som har begärt Release räknas inte. Stängande farleder väljs inte.
Transport ships får `routeId` och arbetar som vanliga ruttflottor.
Civilian shuttles får `homeRouteId` men inte `routeId`, så de bär inte gods.

Manuell Join route, Release, Move och andra uttryckliga order finns kvar som
override. Release gör flottan ledig och skickar den inte genast tillbaka.

## Ombemanning när en farled stängs

`ombemanning-vid-stangd-farled` — **Fullständigt implementerat**. Detta
ersätter att Close bara släpper flottan ledig.

När en bemannad farled stängs flyger dess Transport ships, med
ombordvarande eskorter, och berörda Civilian shuttles till närmaste
kvarvarande farled som saknar eller har färre bemannande skepp. Redan lastad
leverans eller ombordvarande passagerare fullföljs först. Finns ingen annan
farled väntar samma automatik.

## Guard routes

`guard-routes` — **Fullständigt implementerat**. Fighters har ordern Guard
routes. Den är inte standard vid bygge, kräver ingen forskning och kan
väljas i Orders och som startorder. Flottan reser till närmaste öppna
farled som har minst ett Transport ship och minst antal eskorter, och
ansluter med `rutt-eskortfordelning`. Farleder med bara Civilian shuttles
väljs inte. Saknas mål väntar ordern.

## Flottval vid varv

`flottval-vid-varv` — **Fullständigt implementerat**: varvspanelen har
Show fleet för varje flotta på samma hex. Det går att öppna och ändra
flottans uppdrag även när varvsmarkören täcker dess kartmarkör.

## Forskning

`fria-utforsknings-och-patrullorder` — **Fullständigt implementerat**.
Detta ersätter forskningskraven för Explore, Explore stars och Patrol i
`forskade-automatiska-order`. Auto salvage kräver fortfarande Automated
salvage. Civilian shuttle kräver fortfarande tekniken Civilian transport
för att kunna byggas.

| Teknik            | Förkunskap           | Låser upp    |
| ----------------- | -------------------- | ------------ |
| Automated salvage | Salvage ship factory | Auto salvage |

Varje teknik kostar ett forskningspoäng och följer vanlig forskningskö och
kravet på Research station. Orderknapparna visas låsta med namnet på den
forskning som saknas. Explore, Explore stars, Patrol, Guard routes och
automatisk farledsbemanning är fria. Manuella Move, Colonize och Salvage
till valt vrak får inget orderkrav.

Äldre sparningar som innehåller Automated transport, Fleet patrol eller
Automated exploration läses in utan de teknikerna. Redan aktiva Patrol-
och Explore-order fortsätter. En flotta som väntade på Auto assign route
tilldelas med den nya bemanningsregeln.
