import { HexGeometry, type Point } from './HexCoordinate.js';
import type { TradeRouteSnapshot } from './Logistics.js';

// handelsrutt-val-pa-stjarnkartan: distance is measured in screen pixels.
export class TradeRouteMapLayout {
  static hit(
    routes: readonly TradeRouteSnapshot[],
    point: Point,
    zoom: number,
    radius: number,
  ): readonly string[] {
    return Object.freeze(
      routes
        .map((route) => {
          const a = HexGeometry.toPoint(route.start),
            b = HexGeometry.toPoint(route.end);
          const dx = b.x - a.x,
            dy = b.y - a.y;
          const fraction = Math.max(
            0,
            Math.min(
              1,
              ((point.x - a.x) * dx + (point.y - a.y) * dy) /
                (dx * dx + dy * dy || 1),
            ),
          );
          return {
            id: route.id,
            distance:
              Math.hypot(
                point.x - a.x - fraction * dx,
                point.y - a.y - fraction * dy,
              ) * zoom,
          };
        })
        .filter((route) => route.distance <= radius)
        .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))
        .map((route) => route.id),
    );
  }
}
