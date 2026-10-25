import type p5 from 'p5';
import type { MapCell } from '../models/Galaxy.js';
import { HexGeometry } from '../models/HexCoordinate.js';

/** kartans-sikttillstand: draw only the outside edge of the combined field of view. */
export function renderDetectionBoundary(
  sketch: p5,
  cells: readonly MapCell[],
  zoom: number,
): void {
  const visible = new Set(
    cells.filter((cell) => cell.visible).map((cell) => cell.position.key),
  );
  sketch.push();
  sketch.stroke('#638e91');
  sketch.strokeWeight(1.2 / zoom);
  for (const cell of cells) {
    if (!cell.visible) continue;
    const center = HexGeometry.toPoint(cell.position);
    const neighbors = cell.position.neighbors();
    for (let edge = 0; edge < 6; edge++) {
      if (visible.has(neighbors[(6 - edge) % 6]!.key)) continue;
      const angle = (Math.PI / 3) * edge - Math.PI / 6;
      sketch.line(
        center.x + Math.cos(angle) * HexGeometry.size,
        center.y + Math.sin(angle) * HexGeometry.size,
        center.x + Math.cos(angle + Math.PI / 3) * HexGeometry.size,
        center.y + Math.sin(angle + Math.PI / 3) * HexGeometry.size,
      );
    }
  }
  sketch.pop();
}
