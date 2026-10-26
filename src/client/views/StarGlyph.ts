import type p5 from 'p5';
import { HexGeometry, type Point } from '../models/HexCoordinate.js';

/** stjarnornas-hexutseende: discovery, rather than current visibility, removes spikes. */
export function renderStarGlyph(
  sketch: p5,
  point: Point,
  zoom: number,
  explored: boolean,
  sprite: p5.Image | null = null,
): void {
  if (!explored) {
    sketch.stroke(246, 215, 157, 180);
    sketch.strokeWeight(1.2 / Math.max(zoom, 0.35));
    for (let ray = 0; ray < 4; ray++) {
      const angle = (ray * Math.PI) / 2 + Math.PI / 4;
      sketch.line(
        point.x + Math.cos(angle) * 19,
        point.y + Math.sin(angle) * 19,
        point.x + Math.cos(angle) * HexGeometry.size * 1.12,
        point.y + Math.sin(angle) * HexGeometry.size * 1.12,
      );
    }
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
  const diameter = Math.sqrt(3) * HexGeometry.size - 5;
  if (sprite)
    sketch.image(
      sprite,
      point.x - diameter / 2,
      point.y - diameter / 2,
      diameter,
      diameter,
    );
  else {
    sketch.noStroke();
    sketch.fill('#f4be65');
    sketch.circle(point.x, point.y, diameter * 0.8);
  }
  context.restore();
}
