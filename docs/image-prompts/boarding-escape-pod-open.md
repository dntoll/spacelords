# Öppen escape pod

`oppen-escape-pod` skapades med den inbyggda bildgeneratorns redigeringsläge. `assets/original/boarding/escape-pod.png` var redigeringsmål och det nya originalet sparades som `assets/original/boarding/escape-pod-open.png`. `scripts/prepare-boarding-objects.py` beskär och skalar originalet till spelets `escape-pod.webp`.

## Prompt

```text
Use case: precise-object-edit
Asset type: transparent isometric game sprite for Spacelords boarding map
Input images: Image 1 is the edit target, the existing escape pod sprite
Primary request: open the escape pod so a human-sized character can visibly step inside. Lift or hinge open the front canopy/hatch and reveal a clearly empty interior with one seat and an unobstructed entry opening. Do not include a character.
Style/medium: preserve the same polished stylized sci-fi 3D game-sprite rendering
Composition/framing: preserve the exact centered 60-degree high-angle isometric viewpoint, scale, silhouette, and docking-base footprint
Lighting/mood: preserve the existing neutral game lighting, cyan and amber accents
Materials/textures: preserve the worn dark metal panels, edge wear, pipes, glass color, and docking base
Constraints: change only the pod hatch/canopy and the newly visible empty interior; keep the pod body, base, perspective, proportions, colors, lighting, and transparent cutout unchanged; genuinely transparent background; clean alpha edges; no floor, no shadow backdrop, no text, no logo, no watermark
Avoid: closed hatch, sealed canopy, character, occupant, exterior scene, camera change, redesign, extra props
```
