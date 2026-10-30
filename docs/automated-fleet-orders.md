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

## Automatisk tilldelning till rutt

`automatisk-rutttilldelning` — **Fullständigt implementerat**.

Auto assign route finns för flottor med Transport ship. Efter Automated
transport väljer ordern närmaste öppna rutt utan tilldelad transportflotta.
Avståndet är det kortaste hexavståndet till någon av ruttens ändplaneter;
lika avstånd avgörs stabilt med ruttens identitet. En tilldelad transport
räknas redan under sin resa till rutten. Flottor som har begärt att lämna
räknas inte som bemanning. Stängande rutter väljs inte.

Flottan reser fysiskt till den närmaste ändplaneten och arbetar därefter som
en vanlig ruttflotta. Sökordern är då färdig. Den hoppar inte mellan rutter.
Flera väntande flottor tilldelas olika lediga rutter. Saknas ledig rutt
behålls sökordern, även över sparning och återläsning; den söker igen vid
nästa årsstart eller när en rutt skapas. Cancel automatic order eller en ny
manuell order avslutar väntan. Förlust av sista Transport ship avslutar
sökordern. Bogserade vrak måste levereras först.

Ruttbundna flottor måste lämna sin rutt innan de får manuella uppdrag eller
sökorder. Väntande automatiska uppdrag ger inte ett vanligt tomgångsbeslut.

## Flottval vid varv

`flottval-vid-varv` — **Fullständigt implementerat**: varvspanelen har
Show fleet för varje flotta på samma hex. Det går att öppna och ändra
flottans uppdrag även när varvsmarkören täcker dess kartmarkör.

## Forskning

`forskade-automatiska-order` — **Fullständigt implementerat**.

Alla automatiska order kräver egen forskning:

| Teknik                | Förkunskap               | Låser upp                 |
| --------------------- | ------------------------ | ------------------------- |
| Fleet patrol          | Fighter factory          | Patrol                    |
| Automated exploration | Exploration ship factory | Explore och Explore stars |
| Automated salvage     | Salvage ship factory     | Auto salvage              |
| Automated transport   | Trade logistics          | Auto assign route         |

Varje teknik kostar en forskningspoäng och följer vanlig forskningskö och
kravet på Research station. Orderknapparna visas låsta med namnet på den
forskning som saknas. Detta ersätter tidigare fri tillgång till nya Patrol-,
Explore- och Explore stars-order i kraven `flottpatrullering`,
`automatisk-hexutforskning` och `automatisk-stjarnutforskning`. Redan aktiva
sådana order i äldre sparade spel fortsätter utan att forskning delas ut.
Manuella Move, Colonize och Salvage till valt vrak får inget nytt orderkrav.
