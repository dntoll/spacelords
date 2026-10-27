import type p5 from 'p5';
import {
  HexGeometry,
  type Point,
  type HexCoordinate,
} from '../models/HexCoordinate.js';
import {
  STAR_COLORS,
  starAppearance,
  starDetail,
} from '../models/StarAppearance.js';

/** stjarnvariation: generate each palette once per p5 instance, never per frame. */
export function createStarTextures(
  sketch: p5,
  sprite: p5.Image,
): readonly p5.Image[] {
  sprite.loadPixels();
  return Object.freeze(
    STAR_COLORS.map((hex) => {
      const channels = [1, 3, 5].map((offset) =>
        Number.parseInt(hex.slice(offset, offset + 2), 16),
      );
      const texture = sketch.createImage(sprite.width, sprite.height);
      texture.loadPixels();
      for (let offset = 0; offset < sprite.pixels.length; offset += 4) {
        const light =
          (sprite.pixels[offset]! * 0.2126 +
            sprite.pixels[offset + 1]! * 0.7152 +
            sprite.pixels[offset + 2]! * 0.0722) /
          255;
        const hot = Math.max(0, (light - 0.72) / 0.28);
        for (let channel = 0; channel < 3; channel++)
          texture.pixels[offset + channel] = Math.round(
            light * (channels[channel]! * (1 - hot) + 255 * hot),
          );
        texture.pixels[offset + 3] = sprite.pixels[offset + 3]!;
      }
      texture.updatePixels();
      return texture;
    }),
  );
}

/** stjarnornas-hexutseende: no diffraction spikes at any zoom or discovery state. */
export function renderStarGlyph(
  sketch: p5,
  point: Point,
  zoom: number,
  position: Pick<HexCoordinate, 'q' | 'r'>,
  textures: readonly p5.Image[] | null = null,
): void {
  const appearance = starAppearance(position);
  const detail = starDetail(zoom);
  const diameter = (Math.sqrt(3) * HexGeometry.size - 5) * appearance.size;
  sketch.noStroke();
  if (detail === 'point') {
    const pixels =
      appearance.size *
      Math.max(
        1.8,
        Math.min(3.5, (Math.sqrt(3) * HexGeometry.size - 5) * zoom * 0.72),
      );
    sketch.fill(appearance.color + '40');
    sketch.circle(point.x, point.y, (pixels * 1.7) / zoom);
    sketch.fill(appearance.color);
    sketch.circle(point.x, point.y, pixels / zoom);
    return;
  }
  const context = sketch.drawingContext as CanvasRenderingContext2D;
  context.save();
  context.beginPath();
  for (let corner = 0; corner < 6; corner++) {
    const angle = (corner * Math.PI) / 3 - Math.PI / 6;
    const x = point.x + Math.cos(angle) * (HexGeometry.size - 2);
    const y = point.y + Math.sin(angle) * (HexGeometry.size - 2);
    if (corner === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.clip();
  const sprite = textures?.[appearance.palette];
  if (detail === 'texture' && sprite)
    sketch.image(
      sprite,
      point.x - diameter / 2,
      point.y - diameter / 2,
      diameter,
      diameter,
    );
  else {
    sketch.fill(appearance.color + '20');
    sketch.circle(point.x, point.y, diameter);
    sketch.fill(appearance.color + '50');
    sketch.circle(point.x, point.y, diameter * 0.86);
    sketch.fill(appearance.color);
    sketch.circle(point.x, point.y, diameter * 0.7);
    sketch.fill('#ffffff70');
    sketch.circle(point.x, point.y, diameter * 0.35);
  }
  context.restore();
}
