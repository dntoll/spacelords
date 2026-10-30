# Koloniseringsorder

`koloniseringsorder` är **Fullständigt implementerat**.

- En flotta med minst ett Colony ship har Colonize på Star map och i Fleets,
  även när den inte står vid en obebodd planet. Spelaren väljer Colonize och
  därefter en upptäckt, obebodd planet på kartan eller i Colonization planet.
  Flottans order visar vilken planet den ska kolonisera.
- Flottan reser enligt sina vanliga fart-, terräng- och räckviddsregler.
  Åren avslutas av spelaren som tidigare. Ordern följer med mellan år och
  omladdningar. Upptäckts- och stridsavbrott behålls.
- Vid ankomst avgörs eventuell strid först. Därefter grundar ett överlevande
  Colony ship kolonin automatiskt. Exakt ett skepp förbrukas och dess 1 000
  personer blir kolonins befolkning. Kolonin får tomt lager, planetens
  fyndigheter och befintliga regler för byggplatser och upplåsningar.
  Årets vanliga befolkningstillväxt kan därefter tillkomma.
- Om flottan redan står vid vald planet under planeringen grundas kolonin
  direkt. Ingen extra resa eller ytterligare koloniseringsklick behövs.
- Cancel colonization eller en ersättande färd-, Explore-, Patrol- eller
  bärgningsorder avbryter koloniseringsordern. Planetvalet kan avbrytas med
  Cancel utan att ändra en redan given order.
- Om sista Colony ship försvinner eller flyttas ur flottan avbryts ordern.
  Om en annan flotta hunnit grunda kolonin när flottan anländer avbryts
  ordern utan att förbruka något Colony ship. Två ankommande flottor skapar
  inte två kolonier. En kolonisering ger ett besked utan separat ankomstrad.
- Bebodda planeter, okända planeter, stjärnor och tomma hexar är inte giltiga
  koloniseringsmål. Felaktigt planetval behåller det pågående valet så att
  spelaren kan välja igen. Ruttflottor får inga manuella koloniseringsorder.

Ändring 2026-10-30: detta utökar `kolonisation` och ersätter Colonize-knappens
krav att flottan redan måste stå vid planeten. Den tidigare direkta
grundningen i `arsrundor-och-order` gäller fortfarande när vald planet redan
är nådd under planeringen. Annars grundas kolonin vid ankomst.

Äldre sparningar kan läsas och rensas inte. En redan grundad koloni eller
redan förbrukat skepp upprepas inte vid omladdning.
