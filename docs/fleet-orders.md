# Orders för flottor och nybyggda skepp

Kraven nedan är **Fullständigt implementerat**.

- `egen-ordervy`: flottans orderrad har Move, Stop och Orders. Orders öppnar
  en egen vy med namngivna order och korta förklaringar för flottans skepp.
  Move finns kvar i flottvyn och visas inte som val i Orders. Upgrade flyttas
  också till Orders. Befintliga forskningskrav och spärrar gäller.
- `ruttval-for-order`: Join route visar öppna rutter, deras befintliga skepp
  och avstånd från flottan eller byggplaneten. Rutter som redan har skepp av
  den beställande typen sorteras efter övriga; inom grupperna kommer närmaste
  rutt först. Valet använder vanlig fysisk anslutning och ruttbemanning.
- `flottval-pa-orderkarta`: Join fleet väljer en mottagande flotta på kartan.
  Ruttbundna flottor visas inte som mål. Flottan eller det nya skeppet reser
  till mottagaren och ansluter där; ingen överföring sker på avstånd.
- `skeppsanpassade-specialorder`: Salvage ships har Auto salvage och
  Deliberate salvage med val av vrak. Exploration ships har Explore och
  Explore stars. Transport ships har Auto assign route och Civilian shuttles
  Civilian transport. Colonize och Upgrade behålls där de är tillämpliga.
- `patrullcentrum-vid-order`: Fighters får Patrol efter val av position på
  kartan. Flottan reser dit innan patrulleringen börjar och använder sedan
  platsen som sitt fasta centrum. Äldre patruller fortsätter.
- `startorder-for-nybyggda-skepp`: vid skeppsbeställning kan spelaren välja
  rutt, mottagande flotta eller en tillämplig automatisk order genom samma
  Orders-vy. Valet sparas med bygget och börjar efter färdigställandet.
  En uttrycklig startorder gäller det nya skeppet, inte andra skepp i
  planetens hemflotta. Saknas ett tidigare valt mål vid färdigställandet
  bevaras skeppet och spelaren får välja en ny order. Äldre byggen och
  sparningar behåller sina tidigare regler.

Ändring 2026-10-31: `egen-ordervy` ersätter specialordrarnas små symbolknappar
i `flottorder-som-symboler`, inklusive placeringen av Upgrade i
`flottorder-upgrade`. `patrullcentrum-vid-order` ersätter det automatiska
valet av flottans nuvarande position som centrum i `flottpatrullering`.
`startorder-for-nybyggda-skepp` utökar `skepp-till-destinationsflotta` och
`nybyggda-skepp-utan-ruttflotta`: utan uttrycklig startorder gäller tidigare
standard; med startorder får det nya skeppet en egen avgående flotta.

Ruttavstånd är minsta hexavståndet till ruttens två ändplaneter. En rutt
visar antal per skeppstyp, även transport som redan är på väg till rutten.
Fighters behöver en bemannad transport på rutten innan de kan ansluta som
eskort. Ruttbundna flottor måste lämna Route innan de får en annan manuell
order. Målflottor måste ha en position; flottor under Upgrade eller med
passagerare väljs först när dessa uppdrag är avslutade. Flottval kan också
göras med Fleet target som tillgängligt alternativ till kartvalet.

Orders finns både vid ny beställning och på ett köat skepps detaljer i
Build queue. Use default order tar bort startordern. Civilian shuttles
behåller Civilian transport som standard utan uttryckligt annat val.
Beställningsvyn behåller planet och produkt när spelaren återvänder.
Orderns mål och berörda skepp valideras på nytt vid färdigställandet. En
ogiltig startorder ger ett besked och skeppet blir tillgängligt för nya
order, utan att ändra hemflottans befintliga uppdrag.

Patrullens nya centrum, startorder och pågående anslutning sparas utan
inkompatibla ändringar. Både pekarval och tangentbordsval av position sparar
den nya spelordern omedelbart. Back lämnar ett ej slutfört målval utan ny
order. Produktionsutkast är tillfälliga tills Build eller Queue används.
