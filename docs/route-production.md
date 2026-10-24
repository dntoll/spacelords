# Route och Production

Star map och Fleets behålls. Route ersätter Supply & production och Production
lägger byggande och produktionskedjor på samma utforskade karta. Kameraläge och
zoom följer med mellan kartvyerna.

| Kravnamn                           | Status                     | Produktkrav                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `farledskontrast`                  | Fullständigt implementerat | Farleder på Star map och Route är ljusare blå och kraftigare. Vald, hovrad och ogiltig rutt förblir tydliga. Rutter utan aktiv transport och rutter under stängning är streckade vid alla zoomnivåer. Fleets behåller diskreta bakgrundsrutter.                                                                                                                                                         |
| `route-kartvy`                     | Fullständigt implementerat | Route visar den stora kartan med skapande, val och stängning av farleder, transportflottilldelning och Release. Dragning och alternativ med klick och tangentbord finns. Planetval visar första projektets försörjning och Open in Production.                                                                                                                                                          |
| `produktions-kartvy`               | Fullständigt implementerat | Production visar byggval kring vald ägd planet och dess Build queue. Flottor och rutter tar inte över planetvalet. Andra planeter och tom rymd visar inga byggkontroller. Planetens befintliga undersidor behålls.                                                                                                                                                                                      |
| `radiella-byggval`                 | Fullständigt implementerat | Upplåsta byggnader och produkter från befintliga fabriker visas med symbol och namn, högst åtta åt gången och färre på smala kartytor. Vid fler än åtta alternativ används Buildings, Components och Ships. Sidbyte gör alla val åtkomliga. Byggnader visar befintligt antal lokalt och totalt. Ett val visar detaljer och separat Build.                                                               |
| `kompakt-produktionsko`            | Fullständigt implementerat | Kartans Production visar varje projekt på egen rad med ordning, namn, status och ↑, ↓, ×. Första posten väljs initialt; annat projekt väljs genom tryck och behålls vid omordning. Om det försvinner väljs första återstående. Planetvyn behåller gruppering av intilliggande likadana projekt.                                                                                                         |
| `byggprojektets-forsorjningskedja` | Fullständigt implementerat | Vald köpost markerar projektplanet, leverantörer, tillverkare, omlastningar och berörda farleder. Kopplad delproduktion och dess råvaruleveranser ingår. Endast verkliga projekt, reservationer och transportkopplingar visas; granskning av ett byggalternativ skapar ingen kedja.                                                                                                                     |
| `forsorjningsproblem-pa-kartan`    | Fullständigt implementerat | Aktiva problem markeras med röd ring och ! på berörd planet, samt ! på relevant navigeringsknapp. Route hjälper vid material-/transportproblem och ruttproblem; Production vid saknad fabrik eller personal/besättning. En förklaring och projektinformation finns. Tystade problem och problem överhoppade för året markeras inte. Fungerande försörjning visas som Waiting utan röd problemmarkering. |

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
