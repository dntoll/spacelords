# Genererade planetbilder

| Krav                  | Status                     | Beteende                                                                                                                                             |
| --------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spelgrafik-planeter` | Fullständigt implementerat | Sex planettyper har egna bilder i kartorna och sparförhandsvisningen. Utforskningsregler och nedtoning behålls. Riktade mobilkontroller är godkända. |

`genererade-symboler-och-kartbilder` omfattade ursprungligen även 24
byggnadssymboler och varvets kartbild. De är borttagna, med
`spelgrafik-symboler` för byggnader och `spelgrafik-kartstation`, eftersom
byggnader och varv inte finns i Single fleet (`single-fleet-rensning`).
Originalen finns kvar i git-historiken.

Planeterna har ljus uppifrån vänster och transparent bakgrund.

## Filer

- `assets/original/planets/`: sex planeter.
- `docs/image-prompts/generation-2026-10-29.json`: använda prompter.
- `docs/image-prompts/refinements-2026-10-29.json`: efterföljande kantförbättringar.
- [Översikt över planeterna](image-prompts/artwork-review/planets-overview.jpg).

## Granskning

PNG-filerna kontrolleras för avkodning, kvadratiskt format, riktig alpha,
icke-tomma motiv, fria kanter och unika filnamn med
`python scripts/verify-artwork.py` (Python och Pillow krävs). Resultatet
finns i [kontrollrapporten](image-prompts/artwork-review/verification.json).
Ice, Desert och Gas fick förbättrade kanter via imagegen.

Optimerade WebP-bilder på 512 px sparas i `src/client/space-map/assets/planets/`.
`scripts/prepare-game-artwork.py` skapar dem utan att ändra originalen.
