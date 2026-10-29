import type p5 from 'p5';
import type { Point } from '../models/HexCoordinate.js';

export function renderPlanetGlyph(
  sketch: p5,
  point: Point,
  size: number,
  color: string,
  image?: p5.Image,
): void {
  if (image) {
    sketch.image(image, point.x - size / 2, point.y - size / 2, size, size);
    return;
  }
  sketch.noStroke();
  sketch.fill(color);
  sketch.circle(point.x, point.y, size * 0.65);
  sketch.fill(20, 52, 54, 100);
  sketch.ellipse(
    point.x + size * 0.12,
    point.y + size * 0.04,
    size * 0.31,
    size * 0.58,
  );
  sketch.fill(230, 245, 230, 80);
  sketch.circle(point.x - size * 0.15, point.y - size * 0.15, size * 0.15);
}

export function renderShipyardGlyph(
  sketch: p5,
  selected: boolean,
  image?: p5.Image,
): void {
  if (image) {
    sketch.image(image, -20, -20, 40, 40);
    if (selected) {
      sketch.noFill();
      sketch.circle(0, 0, 42);
    }
  } else sketch.rect(-10, -8, 20, 16);
}
