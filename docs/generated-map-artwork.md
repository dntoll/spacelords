# Genererade symboler och kartbilder

## Krav och omfattning

| Krav                                 | Status                     | Leverans                                                                                                                                                                                                                       |
| ------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `genererade-symboler-och-kartbilder` | Fullständigt implementerat | 24 byggnadssymboler, sex planetbilder och en kartbild för Orbital shipyard är genererade, granskade och sparade som transparenta PNG-filer. Byggnadsporträtt ingår inte. Bildernas inkoppling i spelet är en separat leverans. |

Beställningen omfattar de återstående bilderna i `bildpromptpaket` utom de
20 byggnadsporträtten. De tre redan genererade skeppen behålls.

Symbolerna använder tydliga motiv, mörk blågrön struktur, ljusa blågrå ytor
och sparsamma bärnstensfärgade accenter. Planeterna har ljus uppifrån vänster.
Kartstationen visas strikt ovanifrån med dockningsöppningen åt höger.

## Filer

- `assets/original/symbols/`: 24 byggnadssymboler.
- `assets/original/planets/`: sex planeter.
- `assets/original/map/orbital-shipyard-sprite.png`: kartstationen.
- `docs/image-prompts/generation-2026-10-29.json`: faktiskt använda prompter.
- `docs/image-prompts/refinements-2026-10-29.json`: efterföljande kantförbättringar.

Översikter: [symboler](image-prompts/artwork-review/symbols-overview.jpg),
[planeter](image-prompts/artwork-review/planets-overview.jpg) och
[kartstation](image-prompts/artwork-review/map-overview.jpg).

Originalen skapas med det inbyggda imagegen-verktyget. Befintliga engelska
prompter anger motiven; symbolerna förtydligas med få stora former och enkel
skuggning för små visningsstorlekar. Ingen sparändring behövs.

## Granskning, 2026-10-29

Alla 31 PNG-filer klarar kontroll av avkodning, kvadratiskt format, riktig
alpha, icke-tomma motiv, fria kanter och unika filnamn. Kategoriernas antal
är 24, sex och en. Resultat, faktiska dimensioner, minsta marginal och SHA-256
finns i [kontrollrapporten](image-prompts/artwork-review/verification.json).
De genererade originalens storlekar bevaras; marginalerna varierar från
prompternas ungefärliga mål. Vid senare webboptimering kan enhetliga marginaler
och storlekar införas.

Motiv, ljusriktning och kartstationens öppning har granskats visuellt.
Symbolerna visas även i 24 och 32 pixlar i översikten. Salvage ship factory
och Transport ship factory gjordes om till rymdfartyg efter sjöfartsmotiv i
första försöket. Ice, Desert och Gas fick förbättrade kanter via imagegen.
Fina ljusa kantpixlar i planeternas atmosfär kan behöva finputsas vid
webboptimeringen; de samlade förhandsvisningarna visar resultatet mot mörk yta.

Kontrollen kan upprepas med `python scripts/verify-artwork.py` (Python och
Pillow krävs). Den skapar också översiktsbilderna utan att ändra originalen.
Spelklienten är oförändrad; ingen ny publicering eller speltest behövs för
denna separata bildleverans.
