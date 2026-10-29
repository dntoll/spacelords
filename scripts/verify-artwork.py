"""Review assets for genererade-symboler-och-kartbilder without changing them."""

import json
import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / 'docs/image-prompts/generation-2026-10-29.json'
OUTPUT = ROOT / 'docs/image-prompts/artwork-review'
OUTPUT.mkdir(parents=True, exist_ok=True)
assets = json.loads(PLAN.read_text(encoding='utf-8'))['assets']
rows = []
issues = []
outputs = [asset['output'] for asset in assets]
if len(outputs) != len(set(outputs)):
    issues.append('Duplicate output filenames')
counts = {category: sum(asset['category'] == category for asset in assets)
          for category in ('symbols', 'planets', 'map')}
if counts != {'symbols': 24, 'planets': 6, 'map': 1}:
    issues.append(f'Unexpected category counts: {counts}')
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)
small_font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 12)

for asset in assets:
    path = ROOT / 'assets/original' / asset['category'] / asset['output']
    if not path.exists():
        issues.append(f'Missing: {asset["id"]}')
        continue
    with Image.open(path) as source:
        source.verify()
    with Image.open(path) as source:
        rgba = source.convert('RGBA')
        alpha = rgba.getchannel('A')
        bounds = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
        if source.format != 'PNG' or source.width != source.height:
            issues.append(f'Format or aspect ratio: {asset["id"]}')
        if 'A' not in source.getbands() or alpha.getextrema() != (0, 255):
            issues.append(f'Missing true alpha: {asset["id"]}')
        if not bounds:
            issues.append(f'Empty image: {asset["id"]}')
            continue
        margin = min(bounds[0], bounds[1], source.width - bounds[2], source.height - bounds[3])
        if margin < 0.02 * source.width:
            issues.append(f'Less than 2 percent safe margin: {asset["id"]}')
        row = {key: asset[key] for key in ('id', 'category', 'name', 'output')}
        row.update(width=source.width, height=source.height, mode=source.mode,
                   bounds=list(bounds), minimumMarginPercent=round(100 * margin / source.width, 2),
                   bytes=path.stat().st_size, sha256=hashlib.sha256(path.read_bytes()).hexdigest())
        rows.append(row)

for category in ('symbols', 'planets', 'map'):
    selected = [row for row in rows if row['category'] == category]
    columns = 4 if category == 'symbols' else 3 if category == 'planets' else 1
    cell_width, cell_height = 280, 260
    canvas = Image.new('RGB', (columns * cell_width, ((len(selected) + columns - 1) // columns) * cell_height), '#101e2b')
    draw = ImageDraw.Draw(canvas)
    for index, row in enumerate(selected):
        x, y = (index % columns) * cell_width, (index // columns) * cell_height
        with Image.open(ROOT / 'assets/original' / category / row['output']) as source:
            thumbnail = source.convert('RGBA')
            thumbnail.thumbnail((190, 190), Image.Resampling.LANCZOS)
            canvas.paste(thumbnail, (x + (cell_width - thumbnail.width) // 2, y + 4), thumbnail)
            if category == 'symbols':
                for size, left in ((24, 15), (32, 55)):
                    tiny = source.convert('RGBA').resize((size, size), Image.Resampling.LANCZOS)
                    canvas.paste(tiny, (x + left, y + 198), tiny)
                draw.text((x + 105, y + 207), '24px / 32px', font=small_font, fill='#a6bacb')
        draw.text((x + 10, y + 235), row['name'], font=font, fill='#e6eef4')
    if selected:
        canvas.save(OUTPUT / f'{category}-overview.jpg', quality=92)

report = {'requirement': 'genererade-symboler-och-kartbilder', 'expected': len(assets),
          'verified': len(rows), 'issues': issues, 'assets': rows}
(OUTPUT / 'verification.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'expected': len(assets), 'verified': len(rows), 'issues': issues}, indent=2))
raise SystemExit(bool(issues))
