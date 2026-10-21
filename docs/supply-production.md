# Supply & production

Supply & production ersätter den separata Trade routes-grafen. Spelaren ser
vilka planeters nästa projekt som behöver ett beslut, väntar på försörjning,
är redo eller saknar order. Star map hanterar fortsatt rutter och flottilldelning.

| Kravnamn               | Status           | Produktkrav                                                                                                                                                                                                                       |
| ---------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `forsorjningsoversikt` | Ej implementerat | Visa ägda planeter med första projektet i Build queue och status. Sortera Needs attention, Waiting, Ready och Idle, därefter namn.                                                                                                |
| `forsorjningsstatus`   | Ej implementerat | Skilj olösta behov från ordnade leveranser och tillräcklig lokal utvinning. Reservationer, ändliga fyndigheter, saknade fabriker och personal påverkar bedömningen. Decisions ger samma besked. Kvar: presentation i den nya vyn. |
| `relevanta-material`   | Ej implementerat | Planetens detaljer prioriterar projektmaterial, inklusive helt saknade material. Hela relevanta lagret går att öppna. Nollrader och fasta materialkolumner undviks.                                                               |
| `leveransfloden`       | Ej implementerat | Visa material, mängd, källa, mottagare, projekt, Awaiting pickup eller In transit, aktuell omlastningsplats och uppskattad ankomst när underlag finns. Visa transporthinder och länka till rutt eller flotta.                     |
| `produktionsformaga`   | Ej implementerat | Visa vad befintliga fabriker kan tillverka, om förmågan är tillgänglig och antal köade order. Möjlig tillverkning räknas inte som ordnad försörjning. Planeten har fortsatt en enda Build queue.                                  |
| `materialoversikt`     | Ej implementerat | Materialsökning samlar lager, utvinning, tillverkningsförmåga, leveranser och olösta projektbehov över ägda planeter. Utformningen fungerar med hundratals material.                                                              |

## Tolkning och avgränsning

Available är Stock minus material reserverat för utleverans eller vidaretransport.
Required gäller endast första köprojektet. Unprovided är det behov som återstår
efter tillgängligt lokalt lager, användbara arrangerade leveranser och lokal
utvinning som fyndigheten räcker till. Utvinning är framtida försörjning, inte
material som finns i lager. Uppskattningar är inte löften om leveranstid.

Leveranser till senare projekt räknas inte av från det första projektets behov.
Last till ett avbrutet projekt kan visas som kommande lager. En bruten fortsatt
transportkedja räknas inte som fungerande försörjning.

Planetlistan har expanderbara detaljer och intern rullning på små skärmar.
Val, sökning, tangentbordsfokus och rulläge bevaras vid återrendering.
Alla speltexter är engelska. Transportregler och sparade spel bevaras.

## Ersatta krav

Efter uttryckligt användarbeslut ersätter denna vy `handelsgraf`,
`handelsgraf-planetoversikt`, `handelsgraf-flottboxar`, `handelsgraf-navigation`,
`handelsgraf-valpanel`, `handelsgraf-kompakt-flottvy`,
`handelsgraf-skeppspositioner`, `handelsgraf-ruttflottor` och
`handelsgraf-lasbarhet`. Beskrivningen i trade-route-graph.md är historik.
Star map-krav och fysisk frakt gäller fortsatt.
