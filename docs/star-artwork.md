# Stjärnbild

Genererad med den inbyggda imagegen-funktionen 2026-10-26.
Original: `assets/original/stars/plasma-star.png`.
Spelasset: `src/client/assets/stars/plasma-star.webp`, optimerad till 512 × 512 med bevarad transparens.
Stjärnbilden klipps innanför hexen; upptäcktstillståndets spikes ritas separat.

## Slutlig bildprompt

```text
Use case: stylized-concept.
Asset type: production sprite for a space strategy game's hex map.
Primary request: one beautiful, lively golden-orange star, viewed straight on as a spherical sun, with rich turbulent plasma granulation, bright ivory-yellow hot regions, fiery amber surface detail, a few elegant short magnetic prominence loops, and a restrained soft corona. It should feel like a polished premium space game asset rather than a flat icon.
Composition/framing: exactly one centered circular star on a square image. The bright stellar body is about 70% of the canvas width. Every prominence and the faint corona must stay within the central 88% diameter circle, with transparent padding on every side. Strong round silhouette, readable at small sizes.
Scene/backdrop: genuinely transparent background, isolated cutout with clean alpha and softly fading outer glow. No space background, no stars in the background, no hexagon, no border, no text, no lens flare, no diffraction spikes or long rays: the game adds those separately.
Lighting/mood: radiant, warm, energetic, beautiful surface depth without an overexposed featureless white center.
Constraints: no planet, no ring, no decorative frame. Preserve actual transparency.
```
