# Route och Production

Star map och Fleets behålls. Route ersätter Supply & production och Production
lägger byggande och produktionskedjor på samma utforskade karta. Kameraläge och
zoom följer med mellan kartvyerna.

| Kravnamn                           | Status                     | Produktkrav                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `farledskontrast`                  | Fullständigt implementerat | Farleder på Star map och Route är ljusare blå och kraftigare. Vald, hovrad och ogiltig rutt förblir tydliga. Rutter utan aktiv transport och rutter under stängning är streckade vid alla zoomnivåer. Fleets behåller diskreta bakgrundsrutter.                                                                                                                                                         |
| `route-kartvy`                     | Fullständigt implementerat | Route visar den stora kartan med skapande, val och stängning av farleder, transportflottilldelning och Release. Dragning och alternativ med klick och tangentbord finns. Planetval visar första projektets försörjning och Open in Production.                                                                                                                                                          |
| `produktions-kartvy`               | Fullständigt implementerat | Production visar byggval kring vald ägd planet och dess Build queue. Flottor och rutter tar inte över planetvalet. Andra planeter och tom rymd visar inga byggkontroller. Planetens befintliga undersidor behålls.                                                                                                                                                                                      |
| `radiella-byggval`                 | Fullständigt implementerat | Upplåsta byggnader för lediga förberedda platser, passande Domes och produkter från befintliga fabriker visas med symbol och namn, högst åtta åt gången och färre på smala kartytor. Vid fler än åtta alternativ används Buildings, Components och Ships. Sidbyte gör alla val åtkomliga. Byggnader visar befintligt antal lokalt och totalt. Ett val visar detaljer och separat Build.                 |
| `kompakt-produktionsko`            | Fullständigt implementerat | Kartans Production visar varje projekt på egen rad med ordning, namn, status och ↑, ↓, ×. Första posten väljs initialt; annat projekt väljs genom tryck och behålls vid omordning. Om det försvinner väljs första återstående. Planetvyn behåller gruppering av intilliggande likadana projekt.                                                                                                         |
| `byggprojektets-forsorjningskedja` | Fullständigt implementerat | Vald köpost markerar projektplanet, leverantörer, tillverkare, omlastningar och berörda farleder. Kopplad delproduktion och dess råvaruleveranser ingår. Endast verkliga projekt, reservationer och transportkopplingar visas; granskning av ett byggalternativ skapar ingen kedja.                                                                                                                     |
| `forsorjningsproblem-pa-kartan`    | Fullständigt implementerat | Aktiva problem markeras med röd ring och ! på berörd planet, samt ! på relevant navigeringsknapp. Route hjälper vid material-/transportproblem och ruttproblem; Production vid saknad fabrik eller personal/besättning. En förklaring och projektinformation finns. Tystade problem och problem överhoppade för året markeras inte. Fungerande försörjning visas som Waiting utan röd problemmarkering. |

`dome-fore-fabriksforslag` är **Fullständigt implementerat**. Production visar
planettypens upplåsta Dome när en plats behöver förberedas. När ingen ledig förberedd
byggplats finns erbjuds inte vanliga byggnader eller fabriker som nästa byggval;
i stället visas rätt Dome och Prepare building site öppnar dess byggdetaljer.
Saknas forskningen visas vilken Dome som måste forskas fram. En redan köad Dome
visas som väntan när den upptar sista lediga platsen. När den är klar återkommer
byggnads- och fabriksvalen. Om alla platser är upptagna förklaras platsbristen;
en Dome skapar inte extra byggplatser. Befintliga fabriker kan fortfarande
producera delar och skepp utan en tom byggplats. Planetens Production-undersida
använder samma förslag och kan öppna Dome-detaljerna i kartans Production.

## Ordning och produktionsberoenden

`produktionsvalens-statusfarger` kompletterar ordningen med grönt för färdigt
lokalt, blått för färdigt i ett aktivt transportnätverk, gult för enbart köat
och grått för saknat. Gula kömarkeringar finns även på gröna och blå val.
Byggnader bedöms efter färdiga byggen, varor efter lager och skepp efter position
vid planeten. Engelska etiketter och antal förklarar statusen; färg ändrar inga
beställningsregler. Se [sammanhängande krav](varied-galaxy-compact-views.md).

- `produktionsval-efter-forekomst` — **Fullständigt implementerat**: i kartans
  Production kommer först sådant som inte finns någonstans i spelarens rike,
  därefter sådant som finns på andra planeter men saknas här, sist sådant som
  redan finns här. Inom lika grupper behålls katalogens ordning. Byggnader och
  färdiga Domes räknas som byggda; köade byggen räknas inte. Delar bedöms efter
  befintligt lager och totalt även pågående frakt; skepp efter flottornas
  nuvarande position och totala antal, inte historisk byggplats. Samma ordning
  behålls över kategoriernas sidor. Detta ersätter tidigare ren katalogordning
  och ovillkorlig Dome-först när vanliga byggplatser redan är förberedda.
  Finns ingen förberedd plats gäller fortfarande `dome-fore-fabriksforslag`.
- `produktionsberoenden-i-byggval` — **Fullständigt implementerat**: saknade
  komponentfabriker kommer före byggval som behöver deras produktion, även vid
  beroendekedjor. Beroenden har företräde framför förekomstgrupperna. Bedömningen
  använder byggnadens delar och, för fabriker, delbehovet för dess produkt.
  I dagens regler kräver fabriksbyggen bara råvaror: varningen för exempelvis
  Fighter factory avser motorer och Weapons modules till dess Fighters.
  Finns ingen färdig producent i riket visas ! på byggvalet, med full förklaring
  vid val och för tangentbord. Rocket engine factory och Ion pulse engine factory
  är alternativa motorproducenter; en av dem räcker. Fabriker under uppförande
  eller markerade för rivning uppfyller inte beroendet. En färdig fabrik på en
  annan ägd planet räcker för denna förekomstbedömning; verkliga leveransvägar
  och lager kontrolleras fortsatt vid produktbeställning. Varningen skapar ingen
  ny byggspärr eller delkostnad. Befintligt dellager kan användas även när en
  producent saknas. Alla val förblir åtkomliga även vid felaktiga cirkulära
  katalogberoenden. Granskning reserverar inget och förbrukar inga ID:n.

## Snabb beställning

- `dubbelklick-bygger-pa-kartan` — **Fullständigt implementerat**: enkelklick på
  ett radiellt byggval väljer och visar detaljer. Dubbelklick eller dubbeltryck
  väljer alternativet och köar exakt en beställning med samma validering som
  Build. Byggnader, delar och skepp använder befintliga beställningsregler.
  Hovrade byggval behåller mörk bakgrund och läsbar text.
  Låst simuleringsfas och ogiltiga val skapar inga order; ett fel behåller valet
  och visar orsaken. Build finns kvar som alternativ med tangentbord.
- `byggknapp-vid-titel` — **Fullständigt implementerat**: Build ligger bredvid
  valt projekts titel, före beskrivning, kostnad och personalbehov. På mobil
  syns knappen utan att först rulla förbi byggdetaljerna. Träffytan är minst
  44 px. Detta ersätter knappens tidigare placering sist i detaljsektionen.

## Flottor på rutter

- `unika-flottnamn` — **Fullständigt implementerat**: flottnamn är unika inom
  spelet, även utan hänsyn till stora/små bokstäver och omgivande blanksteg.
  Namnbyte till en annan flottas namn avvisas. Automatiskt skapade flottor får
  lediga namn. Äldre sparningar med dubbletter behåller alla flottor och får
  unika namnsuffix när de läses in; sparformatet ändras inte.
- `rutt-eskortfordelning` — **Fullständigt implementerat**: en ledig flotta med
  Fighters kan tilldelas en öppen rutt som har minst en aktiv transportflotta.
  Fighters flyttas till transportflottorna, en i taget till den som har minst
  Fighters, inklusive redan beställda förstärkningar. Vid lika antal används
  en stabil ordning. Övriga skepp i ursprungsflottan stannar kvar. En flotta
  som själv har Transport ship tilldelas fortsatt som en egen transportflotta.
  På samma hex ansluter Fighters direkt; annars reser de som förstärkningar
  och ansluter fysiskt vid möte. Stängande rutter, transportflottor med Release,
  pågående resor/förstärkningsorder och simuleringsfas tillåter ingen sådan
  tilldelning. Detta utökar uttryckligen transportkravet i
  `flottilldelning-pa-stjarnkartan`; fraktkapacitet och regler för last ändras inte.
  Ingen ny strids- eller piratskyddsmekanik ingår.
- `ruttflottor-pa-kartan` — **Fullständigt implementerat**: i Route visas tilldelade
  flottor vid ruttens mitt, med eget namn och separata väljbara markörer vid flera
  flottor. Avståndet mellan markörerna behålls på skärmen vid zoom, med ledlinjer
  till mitten. Lediga, positionerade transportflottor utan resa eller
  förstärkningsorder visas lila med ring och namn vid sina verkliga positioner.
  En förklaring anger färgens betydelse. Val och hovring behåller egna färger.
  Star map och Fleets behåller fysisk flottplacering. Detaljpanelen visar alltid
  den verkliga positionen. Detta ersätter Route-delens tidigare fysiska
  markörplacering under `route-kartvy`.

## Beställning och åtkomst

Byggnader använder första giltiga byggplats med befintliga regler för Domes,
atmosfär och planetkapacitet. Delar och skepp använder första matchande fabrik
som inte ska rivas. Skepp får planetens vanliga standarddestination. Kostnader,
personalbehov, nödvändiga delar och hinder visas före Build. Automatisk
motormontering och delbeställning fungerar som i planetvyn. Resurs- eller
personalbrist inför inga nya köbegränsningar. Misslyckad beställning behåller
valet och förklarar orsaken. Under årets genomförande är order låsta.

Byggcirkeln följer planeten vid zoom, panorering och storleksändring. Vid
planetval flyttas kameran bara så långt som behövs för att cirkeln ska rymmas;
zoom ändras inte automatiskt. Kö och detaljer ligger i en kompakt panel med
intern rullning. Alla kontroller har minst 44 px träffyta och tangentbordsstöd.

En verklig leverans behåller sin registrerade transportväg även vid avbrott.
Beställd delproduktion utan faktisk leverans visar Planned transport när en
aktiv väg finns; bruten väg förklaras som hinder. Granskning av ett obeställt
alternativ behåller den valda köpostens kedja. Tom kö ger ingen kedja och ingen
röd problemmarkering.

## Ersatta krav och kompatibilitet

`forsorjningsoversikt`, `relevanta-material` och `materialoversikt` ersätts:
Supply-listan, materialsökningen och den detaljerade globala materialöversikten
är borttagna. `produktionsformaga` och `leveransfloden` behåller sina stabila
namn med ny presentation. `forsorjningsstatus`, `projektens-forsorjningssteg`,
`automatiska-delorder`, motorreglerna och alla fysiska transportregler gäller
fortsatt. `delad-kartkamera` omfattar nu alla fyra kartvyer.

Planetvyns byggkategorier, sökning, skeppsdestinationer och kögruppering bevaras.
Kartans vy-, kategori-, sid-, alternativ- och köpostval är tillfälliga. Sparade
spel bevaras utan migration.
