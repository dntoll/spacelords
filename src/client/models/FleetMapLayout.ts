import type { FleetSnapshot, ShipType } from './Game.js';
import type { TradeRouteSnapshot } from './Logistics.js';
import { HexGeometry, type Point } from './HexCoordinate.js';

export interface FleetMapMarker {
  readonly fleet: FleetSnapshot;
  readonly point: Point;
  readonly scale: number;
}

// kartflottor / flottval-pa-kartan: drawing and hit tests share world coordinates.
export class FleetMapLayout {
  static readonly hitRadius = HexGeometry.size / 4;
  static readonly orbitRadius = HexGeometry.size / 2;

  // skeppssprites-pa-kartan: identical bounds for rendering and hit testing.
  static glyphs(marker: FleetMapMarker, zoom: number) {
    const types = (Object.keys(marker.fleet.ships) as ShipType[])
      .filter((type) => marker.fleet.ships[type] > 0)
      .sort((a, b) => a.localeCompare(b));
    if (zoom < 0.2) return [];
    const representative = types.toSorted(
      (a, b) => marker.fleet.ships[b] - marker.fleet.ships[a],
    )[0];
    const shown = zoom >= 0.65 ? types : representative ? [representative] : [];
    const scale = Math.min(1 / zoom, marker.scale);
    const columns = Math.min(3, shown.length);
    const rows = Math.ceil(shown.length / columns);
    return shown.map((type, index) => {
      const row = Math.floor(index / columns);
      const rowCount = Math.min(columns, shown.length - row * columns);
      return Object.freeze({
        type,
        point: Object.freeze({
          x:
            marker.point.x +
            ((index % columns) - (rowCount - 1) / 2) * 13 * scale,
          y: marker.point.y + (row - (rows - 1) / 2) * 13 * scale,
        }),
        size: 17 * scale,
      });
    });
  }

  static radius(marker: FleetMapMarker, zoom: number): number {
    return Math.max(
      this.hitRadius,
      ...this.glyphs(marker, zoom).map(
        (glyph) =>
          Math.hypot(
            glyph.point.x - marker.point.x,
            glyph.point.y - marker.point.y,
          ) +
          glyph.size / Math.SQRT2,
      ),
    );
  }

  static markers(
    fleets: readonly FleetSnapshot[],
    routes: readonly TradeRouteSnapshot[] = [],
    zoom = 1,
  ): readonly FleetMapMarker[] {
    const groups = new Map<string, FleetSnapshot[]>();
    for (const fleet of fleets) {
      if (
        !fleet.position ||
        !Object.values(fleet.ships).some((count) => count > 0)
      )
        continue;
      const key = routes.some((route) => route.id === fleet.routeId)
        ? `route:${fleet.routeId}`
        : fleet.position.key;
      const group = groups.get(key) ?? [];
      group.push(fleet);
      groups.set(key, group);
    }
    return Object.freeze(
      [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .flatMap(([key, group]) =>
          group
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((fleet, index) => {
              const route = routes.find((route) => key === `route:${route.id}`);
              if (route) {
                const start = HexGeometry.toPoint(route.start);
                const end = HexGeometry.toPoint(route.end);
                // ruttflottor-pa-kartan: labels stay apart at every zoom.
                const offset = ((index - (group.length - 1) / 2) * 44) / zoom;
                return Object.freeze({
                  fleet,
                  point: Object.freeze({
                    x: (start.x + end.x) / 2,
                    y: (start.y + end.y) / 2 + offset,
                  }),
                  scale: 0.6,
                });
              }
              const center = HexGeometry.toPoint(fleet.position!);
              const angle = -Math.PI / 2 + (index * 2 * Math.PI) / group.length;
              const spacing =
                group.length > 1
                  ? Math.sin(Math.PI / group.length) * this.orbitRadius
                  : this.hitRadius;
              return Object.freeze({
                fleet,
                point: Object.freeze({
                  x: center.x + Math.cos(angle) * this.orbitRadius,
                  y: center.y + Math.sin(angle) * this.orbitRadius,
                }),
                scale: Math.min(0.6, (spacing * 0.9) / 14),
              });
            }),
        ),
    );
  }

  static hit(
    fleets: readonly FleetSnapshot[],
    point: Point,
    routes: readonly TradeRouteSnapshot[] = [],
    zoom = 1,
  ): string | null {
    let nearest: string | null = null;
    let distance = Infinity;
    for (const marker of this.markers(fleets, routes, zoom)) {
      const next = Math.hypot(
        point.x - marker.point.x,
        point.y - marker.point.y,
      );
      const radius = Math.max(
        this.radius(marker, zoom),
        routes.some((route) => route.id === marker.fleet.routeId)
          ? 22 / zoom
          : 0,
      );
      if (next <= radius && next < distance) {
        nearest = marker.fleet.id;
        distance = next;
      }
    }
    return nearest;
  }
}
