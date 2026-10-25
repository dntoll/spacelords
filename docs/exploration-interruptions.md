# Utforskning och upptäckter

Beslutat 2026-10-25. Kraven är **Delvis implementerat**: modeller, controllers och vyer finns, och
riktade tester har passerat. Fullständig webbläsarverifiering återstår.

| Kravnamn                        | Krav                                                                                                                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kompakta-flottkort`            | Standardkort med fyra skepp är högst 140 px höga vid minst 220 px kortbredd. Position och motorinformation tas bort. Flottans faktiska fart visas som S: 2 hex. Träffytor är minst 44 px. |
| `flottorder-som-symboler`       | Relevanta order ges med symbolknappar bredvid namnet. Aktiv order markeras och alla symboler har engelska tillgängliga namn och hjälptexter.                                              |
| `flottans-handelsrutt`          | En tilldelad flotta visas som Route Terra <> Vesta. Det egna namnet återkommer när ruttuppdraget upphör.                                                                                  |
| `produktionsorder-aterkoppling` | Lyckad beställning ger ett synligt kvitto i tre sekunder även när kön är dold. Dubbelklick och dubbeltryck beställer en gång. Avslag visar orsaken.                                       |
| `automatisk-hexutforskning`     | Explore väljer närmaste outforskade hex och fortsätter tills relevanta mål eller Exploration ship saknas, eller ordern ersätts.                                                           |
| `automatisk-stjarnutforskning`  | Explore stars fortsätter mot närmaste stjärna vars hex ännu inte utforskats.                                                                                                              |
| `upptacktsavbrott`              | Nya planeter, utforskade stjärnor och först upptäckta piratflottor pausar året före strid med Handle och Ignore. Tomma hexar pausar inte.                                                 |
| `order-under-upptacktsavbrott`  | Handle öppnar berörd flotta. Ett aktivt val tillåter rörelseorder för andra flottor. Continue avgör redan uppkommen strid före fortsatt förflyttning. Ruttreglerna gäller fortsatt.       |
| `spara-avbrutet-ar`             | Upptäckter, avbrottets läge, ändrade order, uppskjuten strid och återstående förflyttning återställs efter omladdning.                                                                    |

Detta förtydligar `kompakta-flottkort`, `flottans-handelsrutt`, `handelser`
och `sparat-spel`. Det ersätter kravet på åtkomligt Engines & speed i flottkort
och stående positionsinformation. `arsrundor-och-order` får Continue endast
under upptäcktsavbrott; vanliga år återgår automatiskt till planering.
