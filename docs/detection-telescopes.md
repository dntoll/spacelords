# Sikt och teleskop

Aktuell sikt skiljs från kartminnet. En utforskad ruta förblir känd även när
ingen observerar den. Det är bara aktuell sikt som avslöjar pirater.

`sikt-under-forflyttning` — **Fullständigt implementerat**: synfältet följer
skeppets visade position även under årets rörelseanimation. När skeppet går
över till nästa hex uppdateras ljusa rutor, siktgräns, nya upptäckter och
synliga pirater direkt. Rutor som lämnas behålls som mörkare kartminne.
Övriga flottor bidrar fortsatt från sina visade positioner;
en annan flottas kommande resa avslöjas inte i förväg. Teleskopens räckvidd
och nebulosornas sikthinder gäller också under rörelsen. Utan animation visas
samma uppdaterade resultat. Kravet förtydligar `aktuell-detektionssikt`,
`kartans-sikttillstand` och `en-flotta-i-taget`; sparade spel bevaras.

| Krav                     | Status                     | Spelarens beteende                                                                                                                                              |
| ------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aktuell-detektionssikt` | Fullständigt implementerat | Flottorna bidrar med ett gemensamt synfält. Pirater kan bara ses och inspekteras inom det.                                                                      |
| `kartans-sikttillstand`  | Fullständigt implementerat | Synliga hexar är ljusast, tidigare utforskade mörkare och okända mörkast. En diskret kant visar det samlade synfältet. Kända planeter och stjärnor ligger kvar. |
| `teleskopnivaer`         | Fullständigt implementerat | Nivå I, II och III ger 1, 2 och 3 hex räckvidd. Flottans bästa monterade teleskop avgör räckvidden.                                                             |
| `pirat-aterupptackt`     | Fullständigt implementerat | Varje övergång från osynlig till synlig pirat pausar rundan med Handle/Ignore. Fortsatt sikt och omladdning upprepar inte observationen.                        |

## Räckvidd

Räckvidd gäller hexavstånd åt alla håll. Andra skepp ser bara sin egen ruta.
Startskeppet börjar med Telescope I. Planeter bidrar inte längre med sikt.

`teleskopfabriker` och `teleskop-i-exploration-ships` är borttagna med
fabrikerna och uppgraderingen vid varv (`single-fleet-rensning`). Hur
teleskop skaffas eller byts är inte beslutat.

## Verifiering

Regressionstesterna för pirat utan observationskälla, felaktig produktionssida
och gammalt felaktigt upptäcktsavbrott kördes först och misslyckades före rättning.
Kravkopplade modelltester täcker räckviddsgränser, överlappande sikt, bemanning,
rivning, flottöverföring, komponentförbrukning, verklig frakt och version 2–8.
Riktade mobiltester i Chromium och WebKit verifierar dold piratinspektion,
teleskopproduktion, individuella nivåer efter omladdning, högst 140 px flottkort
och båda typerna av sparat upptäcktsavbrott. Mobilbilder har granskats.
