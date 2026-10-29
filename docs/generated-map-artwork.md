# Genererade symboler och kartbilder

## Krav och omfattning

| Krav                                 | Status                     | Leverans                                                                                                                                                                                                                   |
| ------------------------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `genererade-symboler-och-kartbilder` | Fullständigt implementerat | 24 byggnadssymboler, sex planetbilder och en kartbild för Orbital shipyard är genererade, granskade och sparade som transparenta PNG-filer. Byggnadsporträtt ingår inte. Bilderna används nu i spelet enligt kraven nedan. |

Beställningen omfattar de återstående bilderna i `bildpromptpaket` utom de
20 byggnadsporträtten. De tre redan genererade skeppen behålls.

## Inkoppling i spelet

Användaren har därefter beställt inkoppling. Detta ersätter den tidigare
avgränsningen till en separat bildleverans utan klientändring.

| Krav                     | Status                     | Beteende                                                                                                                                                                                                                  |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spelgrafik-symboler`    | Fullständigt implementerat | Alla 24 symboler är inkopplade i gemensamma katalogval, byggnadsköer och identifierad forskning. Saknade målade porträtt får symbolen i detaljvyn; fyra befintliga porträtt behålls. Riktade mobilkontroller är godkända. |
| `spelgrafik-planeter`    | Fullständigt implementerat | Sex planettyper har egna bilder i kartorna, planetvyn och sparförhandsvisningen. Utforskningsregler, ägarmarkeringar och nedtoning behålls. Riktade mobilkontroller är godkända.                                          |
| `spelgrafik-kartstation` | Fullständigt implementerat | Orbital shipyard använder sin kartbild med befintlig träffyta och tydligt urval. Riktade mobilkontroller är godkända.                                                                                                     |

Transport ship factory och Salvage ship factory använder de korrigerade
rymdfartygssymbolerna, inte de tidigare sjöfartsmotiven som användaren påpekade.

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
Den ursprungliga bildleveransen ändrade inte spelklienten. Efterföljande
inkoppling följer snabbpublicering för manuell mobiltest.

## Verifiering av inkopplingen

Kravkopplade enhetstester skyddar 24 unika symboler, namngivna åtgärder och
reservvisning, sex planetbilder, dolda planeter och okänd forskning,
kartglyfer, stationsurval och sena bildsvar efter dispose. Riktade
regressioner kontrollerar kartlager och nedtoning i alla fyra kartvyer,
byggnadsporträtt, byggköer och forskning. Mobiltesterna verifierar verklig
bildladdning, planetvyn och valbar station i Chromium och WebKit.
Skärmbilder granskas, inklusive de två korrigerade rymdfartygssymbolerna.

Optimerade WebP-bilder sparas i `src/client/assets/symbols/`,
`src/client/assets/planets/` och `src/client/assets/map/`. Alla är 512 px
med bevarad transparens. `scripts/prepare-game-artwork.py` skapar dessa
webbversioner utan att ändra originalen.
