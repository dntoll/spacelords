import type p5 from 'p5';
import type { MapCell } from '../models/Galaxy.js';
import { HexGeometry } from '../models/HexCoordinate.js';

/** asteroidbalten / nebulosornas-sikt: only discovered terrain reaches the renderer. */
export function renderTerrain(sketch: p5, cells: readonly MapCell[]): void {
  sketch.push();
  for (const cell of cells) {
    if (!cell.terrain || cell.terrain === 'space') continue;
    const center = HexGeometry.toPoint(cell.position);
    sketch.noStroke();
    if (cell.terrain === 'nebula') {
      sketch.fill(124, 85, 169, cell.visible ? 100 : 65);
      sketch.beginShape();
      for (let corner = 0; corner < 6; corner++) {
        const angle = (corner * Math.PI) / 3 - Math.PI / 6;
        sketch.vertex(
          center.x + Math.cos(angle) * HexGeometry.size,
          center.y + Math.sin(angle) * HexGeometry.size,
        );
      }
      sketch.endShape(sketch.CLOSE);
      sketch.fill(166, 110, 187, 50);
      sketch.ellipse(center.x - 5, center.y + 3, 43, 30);
    } else {
      const dense = cell.terrain === 'dense-asteroids';
      sketch.fill(dense ? '#a19587' : '#647e88');
      for (let rock = 0; rock < (dense ? 13 : 5); rock++) {
        const angle = rock * 2.4 + cell.position.q;
        const radius = 6 + ((rock * 11) % 21);
        sketch.ellipse(
          center.x + Math.cos(angle) * radius,
          center.y + Math.sin(angle) * radius,
          dense ? 8 : 5,
          dense ? 6 : 4,
        );
      }
      if (dense) {
        sketch.stroke('#b6a08d');
        sketch.line(center.x - 6, center.y - 6, center.x + 6, center.y + 6);
        sketch.line(center.x - 6, center.y + 6, center.x + 6, center.y - 6);
      }
    }
  }
  sketch.pop();
}
