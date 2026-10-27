# Stridsrapporter, bärgning och varv

Spelaren ska kunna läsa stridsresultat direkt, rädda vrak och återställa skepp i
orbitala varv. Hemförda okända komponenter öppnar forskning utan vanliga förkunskaper.

| Krav                               | Status                     | Beteende                                                                                                                                    |
| ---------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `stridsrapport-i-dialog`           | Fullständigt implementerat | Året pausar efter stridssteget med resultat, Handle och Continue.                                                                           |
| `vrak-efter-strid`                 | Fullständigt implementerat | Förlorade skepp lämnar beständiga vrak med sin monterade utrustning. Besättning och last förloras. Piratvrak kan återställas till Fighters. |
| `bargningsskepp`                   | Fullständigt implementerat | Salvage ship och dess egen fabrik forskas fram. Varje skepp kan bogsera ett vrak.                                                           |
| `bargningsorder`                   | Fullständigt implementerat | Dra vrak till flottan eller använd Salvage with. Närmaste tilldelade vrak hämtas först, därefter närmaste egna varv.                        |
| `bogsering-av-vrak`                | Fullständigt implementerat | Grundfart 5 utan släp och 1 med släp; vanlig Ion-bonus gäller. Stop och rörelseorder behåller släp. Release wreck lossar.                   |
| `orbitalt-varv`                    | Fullständigt implementerat | Planetens anläggning med skyttlar och stationen i vald grannhex skapas tillsammans.                                                         |
| `automatisk-vrakreparation`        | Fullständigt implementerat | Varvets separata kö reparerar ett skepp per år med nya personer och en tredjedel av hela skeppets råvarukostnad.                            |
| `forstort-varv`                    | Fullständigt implementerat | Överlevande pirater förstör stationen; anläggningen finns kvar och vrak frigörs. Ersättningsstation beställs manuellt.                      |
| `forskning-fran-bargade-delar`     | Fullständigt implementerat | Hemförda komponenter öppnar direkt forskning på motsvarande fabrik. Research station och vanlig forskning krävs fortfarande.                |
| `upptackbara-vrak`                 | Fullständigt implementerat | Nya spel har två upptäckbara explorer-vrak med avancerade komponenter vid Nadir och Aster.                                                  |
| `spara-bargning-och-stridsavbrott` | Fullständigt implementerat | Vrak, släp, varv, köer, fynd och stridsavbrott bevaras utan att äldre sparningar rensas.                                                    |

Detta utökar `flottstrid-per-hex`, `upptacktsavbrott`, `skeppstyper`,
`forska-fram-fabriker`, `forskningsberoenden` och `sparat-spel`. Separata
reparationsköer är ett uttryckligt tillägg till planetens vanliga Build queue.

Varvet börjar reparera året efter färdigställandet. Reparationer använder
planetens lager efter vanlig produktion och kräver dess lediga besättning.
Material och personer förbrukas först när reparationen färdigställs.

`omordningsbar-reparationsko` ersätter tvingande FIFO-prioritering.
Reparationskön använder samma draghandtag som andra köer, behåller vald
ordning efter omladdning och reparerar fortfarande högst ett skepp per år.
Se [aktuella krav och status](unified-interface.md).

Grundkostnader i exempelvärlden: Salvage ship kostar 5 Iron, 3 Water, 2 Oil,
två motorer och 100 personer. Egen fabrik kostar 12/6/3 och kräver 600 arbetare.
Orbital shipyard med skyttlar och station kostar 24/12/6 och kräver 800 arbetare.
Ersättningsstation kostar 12/6/3 och använder den kvarvarande anläggningen.
Kostnaden för reparation omfattar skrov, motorer, Weapons module och teleskop;
varje råvaruslag avrundas uppåt efter division med tre. Installerade delar behålls.

Stop och Move släpper ej hämtade reservationer men behåller redan bogserade vrak.
Return to shipyard återupptar hemtransporten. Saknas varv väntar flottan och visar
ett beslut. Pirater i samma ruta hindrar upphämtning och avlämning. Förstörda
stationer frigör reparationskön; anläggning och planetlager bevaras. Rivning av
anläggningen tar även bort stationen.

Vid fynd markeras motsvarande fabrik som Recovered technology i Research.
Forskningskön kan då ordnas utan den teknikens normala förkunskaper. Övriga
redan köade ämnen behålls. Lägre tekniker blir inte automatiskt färdiga.
