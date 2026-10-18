import type p5 from 'p5';
import type { PlanetOrderSnapshot } from '../models/Game.js';
import { HexGeometry } from '../models/HexCoordinate.js';

// kartorderstatus: only owned planets cross this view boundary.
export function renderPlanetOrders(
  sketch: p5,
  orders: readonly PlanetOrderSnapshot[],
  zoom: number,
): void {
  sketch.textAlign(sketch.LEFT, sketch.CENTER);
  sketch.textSize(9 / zoom);
  for (const order of orders) {
    const labels = [
      order.emptySites > 0 ? `S${order.emptySites}` : '',
      order.emptyQueues > 0 ? `Q${order.emptyQueues}` : '',
    ].filter(Boolean);
    if (!labels.length) continue;
    const point = HexGeometry.toPoint(order.position);
    const text = labels.join(' ');
    const x = point.x + 18 / zoom;
    const y = point.y;
    sketch.noStroke();
    sketch.fill('#10222e');
    sketch.rect(
      x - 3 / zoom,
      y - 8 / zoom,
      (text.length * 6 + 6) / zoom,
      16 / zoom,
      3 / zoom,
    );
    sketch.fill('#e9c78b');
    sketch.text(text, x, y);
  }
}
