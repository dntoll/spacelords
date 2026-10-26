import type p5 from 'p5';
import { HexGeometry, type Point } from '../models/HexCoordinate.js';

/** stjarnornas-hexutseende: discovery, rather than current visibility, removes spikes. */
export function renderStarGlyph(
  sketch: p5,
  point: Point,
  zoom: number,
  explored: boolean,
): void {
  sketch.noStroke();
  for (let layer = 4; layer > 0; layer--) {
    sketch.fill(232, 187, 108, 13);
    sketch.circle(point.x, point.y, 12 + layer * 8);
  }
  if (!explored) {
    sketch.stroke(246, 215, 157, 180);
    sketch.strokeWeight(2 / zoom);
    for (let ray = 0; ray < 4; ray++) {
      const angle = (ray * Math.PI) / 2 + Math.PI / 4;
      sketch.line(
        point.x + Math.cos(angle) * 19,
        point.y + Math.sin(angle) * 19,
        point.x + Math.cos(angle) * 46,
        point.y + Math.sin(angle) * 46,
      );
    }
  }
  sketch.noStroke();
  sketch.fill('#e9c78b');
  sketch.circle(point.x, point.y, Math.sqrt(3) * HexGeometry.size);
}
