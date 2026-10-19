import type { FleetSnapshot } from './Game.js';
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

  static markers(fleets: readonly FleetSnapshot[]): readonly FleetMapMarker[] {
    const groups = new Map<string, FleetSnapshot[]>();
    for (const fleet of fleets) {
      if (
        !fleet.position ||
        !Object.values(fleet.ships).some((count) => count > 0)
      )
        continue;
      const group = groups.get(fleet.position.key) ?? [];
      group.push(fleet);
      groups.set(fleet.position.key, group);
    }
    return Object.freeze(
      [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .flatMap(([, group]) =>
          group
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((fleet, index) => {
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

  static hit(fleets: readonly FleetSnapshot[], point: Point): string | null {
    let nearest: string | null = null;
    let distance = this.hitRadius;
    for (const marker of this.markers(fleets)) {
      const next = Math.hypot(
        point.x - marker.point.x,
        point.y - marker.point.y,
      );
      if (next <= distance && (nearest === null || next < distance)) {
        nearest = marker.fleet.id;
        distance = next;
      }
    }
    return nearest;
  }
}
