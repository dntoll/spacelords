"""Fit the 60-degree object originals to the boarding projection.

kameravinkel-60-i-bordning: originals live in assets/original/boarding/60deg.
Doors and the airlock are sheared so their floor edge follows the exact ground
axis; free-standing objects keep the artwork's proportions. Only artwork listed
in `sources` is regenerated; other metrics in BoardingSpriteMetrics.ts are kept.
The 60-degree door and airlock originals were drawn with a 2:1 floor slope and
did not fit the walls, so the earlier artwork remains in use for them.
"""
from pathlib import Path
from math import ceil, cos, pi, sin, sqrt
import json
import re
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
original = ROOT / 'assets/original/boarding/60deg'
output = ROOT / 'src/client/boarding/assets'
sources = {
    'reactor': 'reactor-60deg.png',
    'crate': 'crate-60deg.png',
}
# Mirrors BoardingScale.ts.
TILE_WIDTH = 64
ELEVATION = pi / 3
GROUND_RATIO = sin(ELEVATION)
VERTICAL_METER = TILE_WIDTH / sqrt(2) * cos(ELEVATION)
# Screen width of free-standing objects' footprints, in projection units.
FREE_WIDTHS = {'crate': 54, 'reactor': 58}
RESOLUTION = 3

images = {name: Image.open(original / path).convert('RGBA') for name, path in sources.items()}


def bounds(image):
    return image.getchannel('A').point(lambda alpha: 255 if alpha >= 16 else 0).getbbox()


boxes = {name: bounds(image) for name, image in images.items()}
for axis in ('q', 'r'):
    names = [f'door-open-{axis}', f'door-closed-{axis}']
    if not all(name in images for name in names):
        continue
    pair = [boxes[name] for name in names]
    box = (min(b[0] for b in pair), min(b[1] for b in pair), max(b[2] for b in pair), max(b[3] for b in pair))
    for name in names:
        boxes[name] = box

# meterskala-i-bordning: portal landmarks after shared alpha cropping give the
# clear opening height, the floor edge slope and the floor anchor.
portals = {}
for axis in ('q', 'r', 'airlock'):
    name = 'airlock' if axis == 'airlock' else f'door-open-{axis}'
    if name not in images:
        continue
    reference = images[name].crop(boxes[name])
    alpha = reference.getchannel('A')
    mid = reference.width // 2
    opaque = [y for y in range(reference.height) if alpha.getpixel((mid, y)) >= 128]
    runs, start = [], None
    for y in range(reference.height):
        clear = alpha.getpixel((mid, y)) < 32
        if clear and start is None:
            start = y
        if not clear and start is not None:
            runs.append(y - start)
            start = None
    left, right = reference.width // 4, reference.width * 3 // 4
    foot_left = max(y for y in range(reference.height) if alpha.getpixel((left, y)) >= 128)
    foot_right = max(y for y in range(reference.height) if alpha.getpixel((right, y)) >= 128)
    slope = (foot_right - foot_left) / (right - left)
    portals[axis] = dict(
        opening=max(runs) / reference.height,
        slope=slope,
        foot=max(opaque) / reference.height,
        direction=-1 if slope < 0 else 1,
    )

metrics_path = ROOT / 'src/client/boarding/views/rendering/BoardingSpriteMetrics.ts'
existing = metrics_path.read_text()
# Prettier unquotes keys and adds trailing commas; restore strict JSON first.
literal = existing[existing.index('= {') + 2:existing.rindex(' as const')]
literal = re.sub(r"^(\s*)'?([\w-]+)'?:", r'\1"\2":', literal, flags=re.M)
metrics = json.loads(re.sub(r',(\s*})', r'\1', literal))
for name, image in images.items():
    image = image.crop(boxes[name])
    if name.startswith('door-') or name == 'airlock':
        spec = portals['airlock' if name == 'airlock' else name[-1]]
        width = 35.2  # 1 m doorway plus its 0.1 m frame depth projected on the ground.
        sx = width / image.width
        sy = (2.1 * VERTICAL_METER) / (image.height * spec['opening'])
        shear = spec['direction'] * GROUND_RATIO / 2 * sx - spec['slope'] * sy
        offset = -min(0, shear * image.width)
        height = image.height * sy + abs(shear * image.width)
        # Inverse affine maps the floor edge onto the exact ground axis.
        coefficients = (1 / (RESOLUTION * sx), 0, 0,
                        -shear / (RESOLUTION * sx * sy), 1 / (RESOLUTION * sy), -offset / sy)
        transformed = image.transform(
            (ceil(width * RESOLUTION), ceil(height * RESOLUTION)),
            Image.Transform.AFFINE, coefficients, Image.Resampling.BICUBIC)
        anchor_y = spec['foot'] * image.height * sy + shear * image.width / 2 + offset
        metrics[name] = dict(width=width, height=height, anchorX=width / 2,
                             anchorY=anchor_y, openingHeight=2.1 * VERTICAL_METER)
    else:
        width = FREE_WIDTHS[name]
        scale = width / image.width
        height = image.height * scale
        # The lowest pixel of the left-most columns is the footprint's side corner,
        # level with the footprint centre.
        alpha = image.getchannel('A')
        edge = max(1, image.width // 40)
        corner = max(y for x in range(edge) for y in range(image.height)
                     if alpha.getpixel((x, y)) >= 128)
        transformed = image.resize((ceil(width * RESOLUTION), ceil(height * RESOLUTION)),
                                   Image.Resampling.LANCZOS)
        metrics[name] = dict(width=width, height=height, anchorX=width / 2,
                             anchorY=corner * scale, openingHeight=0)
    transformed.save(output / f'{name}.webp', 'WEBP', quality=90, method=6)

# Render and picking share the same ground anchors; opening/closing shares geometry.
source = '// Generated by scripts/prepare-boarding-objects.py. Measurements are unzoomed projection units.\n'
source += 'export const BOARDING_SPRITE_METRICS = ' + json.dumps(metrics, indent=2) + ' as const;\n'
metrics_path.write_text(source)
print('Prepared', ', '.join(sources))
