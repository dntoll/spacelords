import type { BoardingPoint } from './BoardingProjection.js';

/** Linear interpolation across two triangles, shared by every textured surface. */
export function boardingQuadLight(
  values: readonly number[],
  u: number,
  v: number,
): number {
  const [a = 1, b = 1, c = 1, d = 1] = values;
  return u >= v
    ? a * (1 - u) + b * (u - v) + c * v
    : a * (1 - v) + c * u + d * (v - u);
}

/** vertexljus-i-bordning: cached multiply masks preserve the original artwork. */
export class BoardingLightPainter {
  readonly #masks = new Map<string, HTMLCanvasElement>();

  clear(): void {
    this.#masks.clear();
  }

  paint(
    context: CanvasRenderingContext2D,
    quad: readonly BoardingPoint[],
    values: readonly number[],
  ): void {
    const [a, b, , d] = quad;
    if (!a || !b || !d) return;
    const key = values.map((value) => value.toFixed(4)).join(',');
    let mask = this.#masks.get(key);
    if (!mask) {
      mask = document.createElement('canvas');
      mask.width = mask.height = 64;
      const canvas = mask.getContext('2d');
      if (!canvas) return;
      const pixels = canvas.createImageData(64, 64);
      for (let y = 0; y < 64; y++)
        for (let x = 0; x < 64; x++) {
          const index = (y * 64 + x) * 4;
          const light = Math.round(
            255 * boardingQuadLight(values, (x + 0.5) / 64, (y + 0.5) / 64),
          );
          pixels.data[index] =
            pixels.data[index + 1] =
            pixels.data[index + 2] =
              light;
          pixels.data[index + 3] = 255;
        }
      canvas.putImageData(pixels, 0, 0);
      this.#masks.set(key, mask);
    }
    context.save();
    context.beginPath();
    context.moveTo(a.x, a.y);
    for (const point of quad.slice(1)) context.lineTo(point.x, point.y);
    context.closePath();
    context.clip();
    context.globalCompositeOperation = 'multiply';
    context.transform(
      (b.x - a.x) / 64,
      (b.y - a.y) / 64,
      (d.x - a.x) / 64,
      (d.y - a.y) / 64,
      a.x,
      a.y,
    );
    context.drawImage(mask, 0, 0);
    context.restore();
  }
}
