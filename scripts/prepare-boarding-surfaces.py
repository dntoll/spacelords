"""Prepare generated boarding surface artwork for the browser."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
ORIGINALS = ROOT / 'assets/original/boarding'
OUTPUT = ROOT / 'src/client/boarding/assets'

for name in ('floor-bridge', 'floor-engineering', 'floor-cockpit', 'floor-galley',
             'wall-bridge', 'wall-engineering', 'wall-cockpit', 'wall-galley',
             'wall-top'):
    size = (1024, 192) if name.startswith('wall-') and name != 'wall-top' else (256, 256)
    image = Image.open(ORIGINALS / f'{name}.png').convert('RGB')
    if name == 'wall-galley':
        pixels = image.load()
        points = [
            (x, y)
            for y in range(image.height)
            for x in range(image.width)
            if min(pixels[x, y]) < 235
        ]
        image = image.crop((
            min(x for x, _ in points), min(y for _, y in points),
            max(x for x, _ in points) + 1, max(y for _, y in points) + 1,
        ))
    image.resize(size, Image.Resampling.LANCZOS).save(OUTPUT / f'{name}.webp', 'WEBP', quality=90, method=6)

for room in ('cockpit', 'engineering'):
    for face, size in (('side', (128, 204)), ('top', (128, 128))):
        image = Image.open(ORIGINALS / f'cover-{room}-{face}.png').convert('RGB')
        image.resize(size, Image.Resampling.LANCZOS).save(
            OUTPUT / f'cover-{room}-{face}.webp', 'WEBP', quality=90, method=6)

galley = Image.open(ORIGINALS / 'cover-galley-sheet.png').convert('RGB')
split_top = round(galley.height * 0.49)
split_bottom = round(galley.height * 0.52)
galley.crop((0, 0, galley.width, split_top)).resize(
    (128, 128), Image.Resampling.LANCZOS
).save(OUTPUT / 'cover-galley-top.webp', 'WEBP', quality=90, method=6)
galley.crop((0, split_bottom, galley.width, galley.height)).resize(
    (128, 204), Image.Resampling.LANCZOS
).save(OUTPUT / 'cover-galley-side.webp', 'WEBP', quality=90, method=6)
