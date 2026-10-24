# Terraforming och Domes

Reglerna hör till `terraformning`, `planettypsforskning`,
`domes-per-byggplats`, `andningsbar-atmosfar` och `habitability-kapacitet`.

Stenplaneter har en fast grundtyp: `Temperate`, `Ice`, `Desert`, `Ocean`
eller `Toxic`. Gasplaneter kan inte terraformeras. Tellus är `Temperate` med
100% habitability. Övriga stenplaneter i exempelvärlden täcker alla fyra specialtyperna.

## Upptäckt och forskning

När en planet blir synlig på Star map upptäcks dess planettyps forskningsprojekt
för hela imperiet. Närliggande utforskning räcker; kolonisation krävs inte.
Varje specialtyp har sin egen kedja, exempelvis `Ice dome` följd av
`Ice terraforming factory`. Tekniker för andra specialtyper hjälper inte.
`Temperate` börjar vid 100% och har ingen egen forskningskedja.

## Byggplatser och atmosfär

Under 80% habitability är atmosfären `Unbreathable`. En tom tillgänglig plats
måste först förberedas med rätt Dome. `Build dome` kostar 8 Iron, 4 Water och
2 Oil och kräver inga permanenta arbetare. Därefter kan en vanlig byggnad,
även en terraformingfabrik, byggas på samma plats. Dome är en bestående
förberedelse och finns kvar när byggnaden rivs.

Vid 80% är atmosfären `Breathable` och ingen plats behöver längre en Dome,
inklusive platser som öppnas senare. Domes använder Build queue med samma
materialförsörjning och högst ett färdigt projekt per planet och år.

Planetens byggplatspotential är fast, högst tio. Antalet användbara platser
är heltalsdelen av potentialen gånger habitability/100, men minst en om
potentialen är större än noll. Platsnumren ändras aldrig. Overview visar
även låsta platser och deras habitability-gränser.

## Utveckling och befolkning

En terraformingfabrik kostar 12 Iron, 6 Water och 3 Oil och behöver 300
arbetare. Den fungerar bara på sin egen planettyp. Varje bemannad fabrik ger
fem procentenheter habitability per år, högst 100%. Flera fabriker summeras.
Befintliga bemanningsregler gäller: om planetens byggnader tillsammans saknar
arbetare arbetar inte terraformingfabrikerna.

Rivning sker före årets terraforming. En ny fabrik börjar arbeta året efter
färdigställandet. Förbättringen består efter rivning och grundtypen ändras inte.

Befolkningstaket på stenplaneter är heltalsdelen av 20 000 gånger
habitability/100, men minst 1 000. Årets förbättrade habitability används
för tillväxt och kapacitet. Tillväxt kan aldrig passera taket; eventuell
befolkning redan över taket behålls utan ytterligare tillväxt.
