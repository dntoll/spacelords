# Utforskning och upptäckter

Ändring 2026-11-22: `upptackt-stannar-resan` ersätter beslutsdelen av
`upptacktsavbrott`, `gemensamt-handelseflode` och
`order-under-upptacktsavbrott`, samt delen av `stjarnupptackt-utan-avbrott`
som lät färden fortsätta. Varje ny upptäckt stannar resan och visas som en
kort blänkare högst upp, utan Handle eller Ignore. Händelsen ligger kvar i
Events. `fiendeupptackt-utan-end-turn` gör att en paus som innehåller en
pirat fortsätter rundan av sig själv efter blänkarna, utan End turn.
En paus med bara stjärna eller planet väntar fortfarande.
`ingen-ankomstbesked` ersätter `ankomstbesked-endast-vid-manuell-forflyttning`:
ingen ankomstmening skapas.

Ändring 2026-10-31: `stjarnupptackt-utan-avbrott` ersatte då pausen för
utforskade stjärnor. Den delen gäller inte längre.

Ändring 2026-10-27: [gemensamt händelseflöde](events-and-guidance.md)
förtydligar `upptacktsavbrott`, `order-under-upptacktsavbrott` och
`spara-avbrutet-ar`. Varje händelse får eget Handle eller Ignore i Events.
Continue efter hantering visar nästa obesvarade händelse från samma avbrott;
först när alla är avklarade fortsätter strid och rörelse. Val och pågående
hantering återställs vid omladdning.

Ändring 2026-10-26: formuleringarna för `automatisk-hexutforskning` och
`automatisk-stjarnutforskning` nedan ersätts av
[områdesvis utforskning och stjärnvarv](galaxy-terrain.md#utforskning).

Beslutat och verifierat 2026-10-25. Status avser hela det beskrivna beteendet.

| Kravnamn                        | Status                     | Krav                                                                                                                                                                                                  |
| ------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kompakta-flottkort`            | Fullständigt implementerat | Standardkort med fyra skepp är högst 140 px höga vid minst 220 px kortbredd. Position och motorinformation tas bort. Flottans faktiska fart visas som S: 2 hex. Träffytor är minst 44 px.             |
| `flottorder-som-symboler`       | Fullständigt implementerat | Move och Stop är ersatta av `inga-move-stop-knappar`. Orders är borttaget i single-fleet-rensningen.                                                                                                  |
| `flottans-handelsrutt`          | Fullständigt implementerat | En tilldelad flotta visas som Route Terra <> Vesta. Det egna namnet återkommer när ruttuppdraget upphör.                                                                                              |
| `produktionsorder-aterkoppling` | Fullständigt implementerat | Lyckad beställning ger ett synligt kvitto i tre sekunder även när kön är dold. Dubbelklick och dubbeltryck beställer en gång. Avslag visar orsaken.                                                   |
| `automatisk-hexutforskning`     | Fullständigt implementerat | Explore väljer en nåbar frontierhex och fortsätter tills relevanta mål eller Exploration ship saknas, eller ordern ersätts. Flera flottor sprids radiellt enligt `radiell-automatisk-hexutforskning`. |
| `automatisk-stjarnutforskning`  | Fullständigt implementerat | Explore stars fortsätter mot närmaste stjärna vars hex ännu inte utforskats.                                                                                                                          |
| `upptacktsavbrott`              | Ersatt i beslutsdelen      | Nya upptäckter pausar rundan. Handle och Ignore är ersatta av `upptackt-stannar-resan`. Stjärnor pausar också. Tomma hexar pausar inte.                                                               |
| `stjarnupptackt-utan-avbrott`   | Ersatt i pausdelen         | Händelsen Star explored finns kvar. Att rundan inte pausar är ersatt av `upptackt-stannar-resan`.                                                                                                     |
| `order-under-upptacktsavbrott`  | Ersatt i beslutsdelen      | Beslutet Handle/Continue är ersatt av `upptackt-stannar-resan`. Order under pausen gäller flottan som upptäckte.                                                                                      |
| `spara-avbrutet-ar`             | Fullständigt implementerat | Upptäckter, avbrottets läge, ändrade order, uppskjuten strid och återstående förflyttning återställs efter omladdning.                                                                                |

Detta förtydligar `kompakta-flottkort`, `flottans-handelsrutt`, `handelser`
och `sparat-spel`. Det ersätter kravet på åtkomligt Engines & speed i flottkort
och stående positionsinformation. `arsrundor-och-order` får Continue endast
under upptäcktsavbrott; vanliga år återgår automatiskt till planering.
