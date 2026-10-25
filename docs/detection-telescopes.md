# Sikt och teleskop

Aktuell sikt skiljs från kartminnet. En utforskad ruta förblir känd även när
ingen observerar den. Det är bara aktuell sikt som avslöjar pirater.

| Krav                           | Status                     | Spelarens beteende                                                                                                                                              |
| ------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aktuell-detektionssikt`       | Fullständigt implementerat | Ägda planeter och flottor bidrar med ett gemensamt synfält. Pirater kan bara ses och inspekteras inom det.                                                      |
| `kartans-sikttillstand`        | Fullständigt implementerat | Synliga hexar är ljusast, tidigare utforskade mörkare och okända mörkast. En diskret kant visar det samlade synfältet. Kända planeter och stjärnor ligger kvar. |
| `teleskopnivaer`               | Fullständigt implementerat | Nivå I, II och III ger 1, 2 och 3 hex räckvidd. Forskningen följer nivåordningen.                                                                               |
| `teleskopfabriker`             | Fullständigt implementerat | Varje nivå har en egen fabrik och komponent. Planetens högsta färdiga fabrik avgör räckvidden; utan fabrik ser planeten 1 hex.                                  |
| `teleskop-i-exploration-ships` | Fullständigt implementerat | Nya Exploration ships behöver ett tillverkat teleskop utöver motorer. Bästa tillgängliga nivå väljs automatiskt och behålls på skeppet.                         |
| `pirat-aterupptackt`           | Fullständigt implementerat | Varje övergång från osynlig till synlig pirat pausar året med Handle/Ignore. Fortsatt sikt och omladdning upprepar inte observationen.                          |

## Räckvidd och tillverkning

Räckvidd gäller hexavstånd åt alla håll. Flottans bästa monterade teleskop avgör
dess räckvidd. Andra skepp ser bara sin egen ruta. Inget uppgraderingssystem för
befintliga skepp införs; startskeppet och äldre skepp har Telescope I.

Research har stegen Telescope I factory → Telescope II factory → Telescope III
factory. Exploration ship factory kräver både Rocket engine factory och
Telescope I factory. Varje teknik följer samma forskningskostnad som andra tekniker.

| Nivå | Fabrikens Iron/Water/Oil | Teleskopets Iron/Water/Oil | Fabrikspersonal |
| ---- | ------------------------ | -------------------------- | --------------- |
| I    | 8/4/2                    | 3/1/1                      | 300             |
| II   | 16/8/4                   | 6/2/2                      | 300             |
| III  | 24/12/6                  | 9/3/3                      | 300             |

Komponenterna kan lagras och fraktas. Skeppsbeställningen väljer högsta nivån som
kan levereras från tillgängligt lager, produktion eller färdig fabrik. Vald nivå
framgår i ordern. Ett teleskop förbrukas en gång när skeppet färdigställs.
Fabriker följer vanliga regler för byggplatser, bemanning och gemensam Build queue.
Planetens sikt kräver en färdig fabrik, men ingen separat teleskopinstallation
eller bemanning. Flera fabriker adderar inte sin räckvidd.

## Förtydligade tidigare krav

Detta ersätter kopplingen mellan utforskad ruta och aktuell sikt i `lokal-sikt`,
`skeppsutforskning` och `rymdpirater-per-stjarna`. Det utökar `skeppsdelar`,
`delfabriker`, `forska-fram-fabriker`, `automatiska-delorder` och `sparat-spel`.
`upptacktsavbrott` ändras uttryckligen från första piratupptäckten till varje ny
kontakt efter förlorad sikt. Redan uppkommen strid avgörs fortfarande före nästa
förflyttning efter Continue.

Ingen sparning rensas. Äldre forskning, köer och avbrutna år bevaras. Ofärdiga
Exploration ships får ett teleskopbehov och väntar om försörjning saknas.

## Verifiering

Regressionstesterna för pirat utan observationskälla, felaktig produktionssida
och gammalt felaktigt upptäcktsavbrott kördes först och misslyckades före rättning.
Kravkopplade modelltester täcker räckviddsgränser, överlappande sikt, bemanning,
rivning, flottöverföring, komponentförbrukning, verklig frakt och version 2–8.
Riktade mobiltester i Chromium och WebKit verifierar dold piratinspektion,
teleskopproduktion, individuella nivåer efter omladdning, högst 140 px flottkort
och båda typerna av sparat upptäcktsavbrott. Mobilbilder har granskats.
