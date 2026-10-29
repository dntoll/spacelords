"""Create web derivatives for spelgrafik-symboler, spelgrafik-planeter and spelgrafik-kartstation."""

import json
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'docs/image-prompts/manifest.json').read_text(encoding='utf-8'))
count = 0
for asset in manifest['assets']:
    category = asset['category']
    if category not in ('symbols', 'planets', 'map'):
        continue
    destination = root / 'src/client/assets' / category / Path(asset['output']).with_suffix('.webp')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(root / 'assets/original' / category / asset['output']) as source:
        image = source.convert('RGBA')
        size = 512
        image.thumbnail((size, size), Image.Resampling.LANCZOS)
        image.save(destination, quality=90, method=6)
    count += 1
print(f'Prepared {count} transparent WebP assets; PNG originals unchanged.')
