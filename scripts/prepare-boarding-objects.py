from pathlib import Path
from PIL import Image

original = Path('assets/original/boarding')
output = Path('src/client/assets/boarding')
sources = {
    'airlock': 'airlock-v2.png',
    'reactor': 'reactor-v2.png',
    'half-cover': 'half-cover-v2.png',
    'door-closed-q': 'door-closed-q.png',
    'door-open-q': 'door-open-q-v2.png',
    'door-closed-r': 'door-closed-r.png',
    'door-open-r': 'door-open-r-v2.png',
}
images = {name: Image.open(original / path).convert('RGBA') for name, path in sources.items()}
def bounds(image):
    return image.getchannel('A').point(lambda alpha: 255 if alpha >= 16 else 0).getbbox()
boxes = {name: bounds(image) for name, image in images.items()}
for axis in ('q', 'r'):
    names = [f'door-open-{axis}', f'door-closed-{axis}']
    pair = [boxes[name] for name in names]
    box = (min(b[0] for b in pair), min(b[1] for b in pair), max(b[2] for b in pair), max(b[3] for b in pair))
    for name in names:
        boxes[name] = box
for name, image in images.items():
    image = image.crop(boxes[name])
    image.thumbnail((128, 128), Image.Resampling.LANCZOS)
    image.save(output / f'{name}.webp', 'WEBP', quality=90, method=6)
    print(name, image.size)
