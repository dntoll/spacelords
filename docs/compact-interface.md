# Renare spelgränssnitt

Alla krav nedan är **Fullständigt implementerat**.

`research-med-ett-tryck` — **Fullständigt implementerat**: Ett enda tryck på
Research-knappen köar forskningen, även direkt efter att trädet har dragits.
Ett extra tryck för att aktivera knappen eller välja rutan krävs inte.
Dubbeltryck på själva forskningsrutans rubrik finns kvar som genväg.

`handelsemarkering-utan-numrering` — **Fullständigt implementerat**:
Kartans händelsemarkering visar inga etiketter som Event 1 eller Event 2.
Ringarna runt händelsens plats och själva händelsetexten finns kvar.
Detta ersätter numreringen i kartmarkeringen under `handelser-pa-kartan`.

| Kravnamn                              | Beteende                                                                                                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kartorderstatus`                     | S/Q-texten vid planeter på Star map tas bort. Vald planets orderstatus finns kvar i klartext.                                                                                          |
| `flyttmal-pa-kartan`                  | Move väljer destination på kartan. Listan Choose destination hex tas bort.                                                                                                             |
| `inga-hexkoordinater`                 | Gränssnittet visar inga hex-koordinater, även i flottinformation, bärgning och Events. Platser benämns med namn där sådana finns.                                                      |
| `uppmarksamhet-vid-titel`             | ! Needs attention visas bredvid SPACELORDS, ovanför raden med vyer, endast när något behöver uppmärksamhet.                                                                            |
| `korta-beslutsinstruktioner`          | Tellus: choose production., Home Fleet: choose an assignment. och Choose research. räcker som instruktioner för respektive val. Planetens och flottans aktuella namn används.          |
| `produktionsdetaljer-utan-upprepning` | Production upprepar inte antal lokalt, i nätverket, totalt eller i kö i detaljrutan. Status och antal finns kvar runt planeten.                                                        |
| `forsorjningskedja-utan-rubrik`       | Supply chain-rubriken och meningen Map highlights tas bort. Själva försörjningskedjan och kartmarkeringarna finns kvar.                                                                |
| `kompakt-ny-flotta`                   | New fleet-rutan är ungefär hälften så hög med bibehållen möjlighet att släppa ett skepp där.                                                                                           |
| `colony-ship-efter-rocket-engine`     | Colony ship factory kan forskas fram direkt efter Rocket engine factory. Exploration ship factory och Telescope I factory krävs inte för detta.                                        |
| `forskningsdetaljer-vid-val`          | Identifierad forsknings beskrivning, status, kostnad, förkrav och Research-knapp finns direkt i trädrutan. Val öppnar ingen separat beskrivningsruta. Okända tekniker förblir anonyma. |

Ändringarna beställdes 2026-10-30. De ersätter S/Q-markeringarna i
`kartorderstatus`, den separata detaljpanelen i `forskningsdetaljer-vid-val`
och den tidigare storleken i `kompakt-forskningstrad`. Trädrutorna är fortsatt
kompakta och informationen ryms i dem. Den tidigare ömsesidiga uteslutningen
av Research queue och forskningsdetaljer upphör. `produktionsvalens-statusfarger`
och `byggnadsantal-lokalt-och-globalt` behåller status och antal i kartans
byggval men upprepningen i Production-detaljerna tas bort. Planetvyns
Build selection behåller sin inventering. Övrig vägledning vid försörjnings-
och bemanningsproblem finns kvar.

Forskningsvägen till Colony ship factory ersätter det tidigare förkravet
Exploration ship factory i `forska-fram-fabriker` och `forskningsko`.
Befintliga sparade spel och redan köad forskning bevaras.
