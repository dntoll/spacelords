# Bordningsgrafik i meterskala

Krav: `meterskala-i-bordning`, `isometriska-bordningsobjekt`.

Fem nya original genererades med den inbyggda bildgeneratorn: stängd dörr längs q och r, öppna varianter från respektive stängd dörr samt airlock. De finns som `*-meters.png` i `assets/original/boarding/`. Tidigare original bevaras. Bilderna har transparent bakgrund och saknar golv. Webbversioner och deras golvförankring genereras med `scripts/prepare-boarding-objects.py`, som mäter den fria öppningen, kalibrerar baslinjen och exporterar i tre gånger grundupplösningen. Öppet och stängt delar samma omvandling.

## Gemensam genereringsprompt

```text
Use case: stylized-concept. Asset: a single isolated sci-fi boarding-game door frame sprite for an orthographic 2:1 dimetric grid. Dark blue-grey steel, restrained cyan lights and amber details, industrial painted realistic texture. Tall narrow human-sized hatch: free opening 2.1 meters high and 0.8 meters wide, outer frame 2.3 meters high and 1 meter wide, thickness 0.1 meter. Vertical lines perfectly vertical; horizontal edge of the doorway slopes at exactly 1 vertical pixel per 2 horizontal pixels. Important: tall narrow doorway, NOT wide bulkhead or garage door. Entire object inside frame. Transparent background, no floor, base plate, ground shadow, scenery, text, numbers, logos or grid. Portrait canvas.
```

För q lades följande till:

```text
CLOSED sliding door with two panels. Door plane slopes DOWN to the RIGHT. Camera sees top edge and narrow right side of the frame.
```

För r:

```text
CLOSED sliding door with two panels. Door plane slopes DOWN to the LEFT. Camera sees top edge and narrow left side of the frame.
```

För airlock:

```text
An OPEN reinforced airlock portal, no door panels, fully transparent empty opening. Door plane slopes DOWN to the RIGHT. Subtle amber docking indicator on frame. No objects in opening.
```

## Öppna dörrar

Respektive stängd dörr bifogades som redigeringsmål:

```text
Use case: precise-object-edit. Edit this exact door sprite to its OPEN state. Remove ONLY the central sliding panels to make the doorway opening genuinely transparent. Keep every outer frame pixel, the top beam, columns, bottom threshold, overall size, angle, palette and lighting unchanged. No added floor, scenery or text. The camera and the tall narrow human proportions must stay identical. Transparent opening and transparent background.
```
