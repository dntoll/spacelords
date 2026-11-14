"""Cut the 60-degree character sheet into a transparent web atlas and source bounds.

bordningsfigurer-fran-spritesheet / kameravinkel-60-i-bordning: the original
sheet has five angles per row and rows for standing and crouched player,
defender and civilian, followed by one row of incapacitated figures. Every
figure keeps the sheet's common pixel scale so poses stay in proportion.
"""
from pathlib import Path
from math import cos, pi, sin, sqrt
from statistics import median
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ORIGINALS = ROOT / "assets/original/boarding/60deg"
# figurvarianter-i-bordning: every sheet has the same layout. The first is the
# original look; the rest are variants for more variety.
SHEETS = (
    ("directional-faction-sprites-60deg.png", "directional-faction-sprites.webp"),
    ("directional-faction-sprites-60deg-variant-2.png", "directional-faction-sprites-2.webp"),
    ("directional-faction-sprites-60deg-variant-3.png", "directional-faction-sprites-3.webp"),
    ("directional-faction-sprites-60deg-variant-4.png", "directional-faction-sprites-4.webp"),
)
OUTPUT = ROOT / "src/client/boarding/assets/characters"
SIDES = ("player", "defender", "civilian")
STANCES = ("standing", "crouched")
ANGLES = ("front", "front-right", "right", "back-right", "back")
COLUMNS, ROWS, CELL = 5, 7, 256
# Mirrors BoardingScale.ts: a 1.8 m person about 0.35 m deep seen from 60 degrees.
GROUND_METER = 64 / sqrt(2)
STANDING_SCREEN_HEIGHT = (1.8 * cos(pi / 3) + 0.35 * sin(pi / 3)) * GROUND_METER


def figure_rows(sheet):
    """figurvarianter-i-bordning: the sheets are not an even grid. Find the
    seven bands of figures from the transparent gaps between them, so a figure
    that crosses an even-grid line keeps its head and feet."""
    mask = sheet.getchannel("A").point(lambda value: 255 if value > 16 else 0)
    counts = [mask.crop((0, y, mask.width, y + 1)).histogram()[255]
              for y in range(mask.height)]
    bands, start = [], None
    for y, count in enumerate(counts + [0]):
        if count > 2 and start is None:
            start = y
        if count <= 2 and start is not None:
            if y - start > 8:
                bands.append((start, y))
            start = None
    if len(bands) != ROWS:
        raise ValueError(f"Expected {ROWS} rows of figures, found {len(bands)}")
    return bands


def figure(sheet, rows, column, row):
    width = sheet.width / COLUMNS
    top, bottom = rows[row]
    cell = sheet.crop((round(column * width), top,
                       round((column + 1) * width), bottom))
    mask = cell.getchannel("A").point(lambda value: 255 if value > 16 else 0)
    if not mask.getbbox():
        raise ValueError(f"Empty character cell {column},{row}")
    # Keep the largest band of columns so stray pixels from a neighbouring
    # figure never stretch the bounds, then fit the height to what remains.
    left, right = largest_run(mask, vertical=False)
    if left == 0 or right == cell.width:
        print(f"warning: figure touches the cell edge at {column},{row}")
    cell = cell.crop((left, 0, right, cell.height))
    _, first, _, last = cell.getchannel("A").point(
        lambda value: 255 if value > 16 else 0).getbbox()
    return cell.crop((0, first, cell.width, last))


def largest_run(mask, vertical):
    length = mask.height if vertical else mask.width
    counts = []
    for index in range(length):
        line = mask.crop((0, index, mask.width, index + 1) if vertical
                         else (index, 0, index + 1, mask.height))
        counts.append(line.histogram()[255])
    best, best_weight, start = (0, length), -1, None
    for index, count in enumerate(counts + [0]):
        if count and start is None:
            start = index
        if not count and start is not None:
            weight = sum(counts[start:index])
            if weight > best_weight:
                best, best_weight = (start, index), weight
            start = None
    return best


def pack(source, output):
    sheet = Image.open(ORIGINALS / source).convert("RGBA")
    rows = figure_rows(sheet)
    atlas = Image.new("RGBA", (CELL * COLUMNS, CELL * ROWS))
    sources = {}
    standing = {side: [] for side in SIDES}

    def place(image, column, row, key):
        if image.width > CELL - 8 or image.height > CELL - 8:
            raise ValueError(f"Character exceeds atlas cell: {key}")
        x = column * CELL + (CELL - image.width) // 2
        y = row * CELL + CELL - 8 - image.height
        atlas.alpha_composite(image, (x, y))
        return dict(x=x, y=y, width=image.width, height=image.height)

    for side_index, side in enumerate(SIDES):
        sources[side] = {}
        for stance_index, stance in enumerate(STANCES):
            sources[side][stance] = {}
            row = side_index * 2 + stance_index
            for column, angle in enumerate(ANGLES):
                image = figure(sheet, rows, column, row)
                if stance == "standing":
                    standing[side].append(image.height)
                sources[side][stance][angle] = place(image, column, row, f"{side}-{stance}-{angle}")
        sources[side]["incapacitated"] = place(
            figure(sheet, rows, side_index, ROWS - 1), side_index, ROWS - 1, f"{side}-incapacitated")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT / output, quality=88, method=6)
    # figurvarianter-i-bordning: every side of every sheet stands 1.8 m tall,
    # however large the artist drew it.
    units_per_pixel = {side: STANDING_SCREEN_HEIGHT / median(heights)
                       for side, heights in standing.items()}
    scales = ", ".join(f"{side} {value:.4f}" for side, value in units_per_pixel.items())
    print(f"Packed 33 character sprites from {source} at {scales} units/px")
    return dict(unitsPerPixel=units_per_pixel, sources=sources)


def main():
    variants = [pack(source, output) for source, output in SHEETS]
    manifest = ROOT / "src/client/boarding/views/rendering/BoardingCharacterAtlas.ts"
    manifest.write_text(
        "// bordningsfigurer-fran-spritesheet / figurvarianter-i-bordning: generated by\n"
        + "// scripts/prepare-boarding-characters.py. Each variant has its own atlas image\n"
        + "// and pixel scale, shared by every pose in it.\n"
        + "export const boardingCharacterVariants = "
        + json.dumps(variants, indent=2)
        + " as const;\n",
        newline="\n",
    )


if __name__ == "__main__":
    main()
