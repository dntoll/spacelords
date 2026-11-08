# Planetupptäckt, utforskning och koloniseringsköer

Planeter går genom tre kunskaps- och expansionssteg: upptäckt, utforskad och
koloniserad.

| Krav                                   | Status                     | Beteende                                                                                                                                                                                                                                                                                                 |
| -------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `planetupptackt-fore-utforskning`      | Fullständigt implementerat | En egen planet eller flotta upptäcker planeten inom sin vanliga detektionsräckvidd. Namn och position blir kända, men planettyp, habitability, resurser och byggplatser förblir dolda tills planeten utforskas. Händelsen erbjuder `Add to Exploration queue`; åtgärden sparar kön och stänger beskedet. |
| `planetutforskning-vid-ankomst`        | Fullständigt implementerat | Ett överlevande Exploration ship utforskar planeten när flottan har nått dess hex och eventuell strid är avgjord. Då visas detaljerna och planettypen kan låsa upp forskning. Händelsen erbjuder `Add to Colonization queue`; åtgärden sparar kön och stänger beskedet.                                  |
| `utforskningsko`                       | Fullständigt implementerat | Upptäckta, outforskade planeter kan läggas i en beständig och omordningsbar `Exploration queue` under `Decisions`.                                                                                                                                                                                       |
| `koloniseringsko`                      | Fullständigt implementerat | Utforskade, obebodda planeter kan läggas i en beständig och omordningsbar `Colonization queue` under `Decisions`.                                                                                                                                                                                        |
| `automatisk-tilldelning-av-planetkoer` | Fullständigt implementerat | Lediga flottor får mål i köordning. `Colony ship` prioriterar koloniseringskön och Exploration ship tar utforskningskön. Kortast framkomliga väg avgör flotta, därefter stabil flottidentitet. Ett mål reserveras av en flotta tills uppdraget lyckas eller avbryts.                                     |

En uttrycklig order har företräde framför köerna. `Explore`, `Explore stars` och
övriga befintliga order fortsätter enligt sina egna regler. `Explore planet`
väljer ett bestämt upptäckt mål. Om ett kömål tas bort avbryts dess automatiska
uppdrag; omordning påverkar kommande tilldelningar.

Planeten ligger kvar i kön medan en flotta är på väg. Om det nödvändiga skeppet
försvinner frigörs målet för en annan flotta. Framgångsrik utforskning eller
kolonisering tar automatiskt bort målet.

Äldre sparningar bevaras. Planeter vars detaljer redan var kända behandlas som
utforskade. Nya sparningar lagrar planeternas kunskapsnivå, köordning och aktiva
köuppdrag.
