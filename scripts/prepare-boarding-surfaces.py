"""Prepare generated boarding surface artwork for the browser."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
ORIGINALS = ROOT / 'assets/original/boarding'
OUTPUT = ROOT / 'src/client/boarding/assets'

for name in ('floor-bridge', 'floor-engineering', 'floor-cockpit',
             'wall-bridge', 'wall-engineering', 'wall-cockpit', 'wall-top'):
    size = (1024, 192) if name.startswith('wall-') and name != 'wall-top' else (256, 256)
    image = Image.open(ORIGINALS / f'{name}.png').convert('RGB')
    image.resize(size, Image.Resampling.LANCZOS).save(OUTPUT / f'{name}.webp', 'WEBP', quality=90, method=6)
