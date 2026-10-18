import type p5 from 'p5';
import type { FleetSnapshot, ShipType } from '../models/Game.js';
import { HexGeometry, type Point } from '../models/HexCoordinate.js';

const shipSizes: Readonly<Record<ShipType, number>> = {
  Fighter: 5,
  'Exploration ship': 7,
  'Colony ship': 9,
};

export function renderMapFleets(
  sketch: p5,
  fleets: readonly FleetSnapshot[],
  zoom: number,
): void {
  const groups = new Map<string, FleetSnapshot[]>();
  for (const fleet of fleets) {
    if (!Object.values(fleet.ships).some((count) => count > 0)) continue;
    const group = groups.get(fleet.position.key) ?? [];
    group.push(fleet);
    groups.set(fleet.position.key, group);
  }
  const markers = [...groups.values()].flatMap((group) => {
    const columns = Math.min(3, group.length);
    return group.map((fleet, index) => {
      const point = HexGeometry.toPoint(fleet.position);
      return {
        fleet,
        point: {
          x: point.x + (((index % columns) - (columns - 1) / 2) * 32) / zoom,
          y: point.y - (26 + Math.floor(index / columns) * 30) / zoom,
        },
      };
    });
  });

  // kartflottor: draw routes underneath the separate fleet swarms.
  for (const { fleet, point } of markers) {
    if (!fleet.destination) continue;
    const destination = HexGeometry.toPoint(fleet.destination);
    const angle = Math.atan2(destination.y - point.y, destination.x - point.x);
    sketch.stroke('#72d8ca');
    sketch.strokeWeight(1 / zoom);
    sketch.line(point.x, point.y, destination.x, destination.y);
    sketch.noStroke();
    sketch.fill('#72d8ca');
    const length = 8 / zoom;
    const width = 3 / zoom;
    sketch.triangle(
      destination.x,
      destination.y,
      destination.x - Math.cos(angle) * length - Math.sin(angle) * width,
      destination.y - Math.sin(angle) * length + Math.cos(angle) * width,
      destination.x - Math.cos(angle) * length + Math.sin(angle) * width,
      destination.y - Math.sin(angle) * length - Math.cos(angle) * width,
    );
  }
  for (const { fleet, point } of markers) {
    const sizes: number[] = [];
    // A bounded, round-robin sample preserves each ship type in large fleets.
    for (let layer = 0; layer < 9 && sizes.length < 9; layer += 1) {
      for (const type of Object.keys(shipSizes) as ShipType[]) {
        if (fleet.ships[type] > layer && sizes.length < 9)
          sizes.push(shipSizes[type]);
      }
    }
    const target = fleet.destination
      ? HexGeometry.toPoint(fleet.destination)
      : null;
    sketch.noStroke();
    sketch.fill('#72d8ca');
    const columns = Math.min(3, sizes.length);
    const rows = Math.ceil(sizes.length / columns);
    sizes.forEach((size, index) => {
      const row = Math.floor(index / columns);
      const rowCount = Math.min(columns, sizes.length - row * columns);
      const center = {
        x: point.x + (((index % columns) - (rowCount - 1) / 2) * 8) / zoom,
        y: point.y + ((row - (rows - 1) / 2) * 8) / zoom,
      };
      const angle = target
        ? Math.atan2(target.y - center.y, target.x - center.x)
        : -Math.PI / 2;
      shipTriangle(sketch, center, size / zoom, angle);
    });
  }
}

function shipTriangle(
  sketch: p5,
  center: Point,
  size: number,
  angle: number,
): void {
  const vertex = (forward: number, sideways: number): Point => ({
    x: center.x + Math.cos(angle) * forward - Math.sin(angle) * sideways,
    y: center.y + Math.sin(angle) * forward + Math.cos(angle) * sideways,
  });
  const tip = vertex((size * 2) / 3, 0);
  const left = vertex(-size / 3, size * 0.35);
  const right = vertex(-size / 3, -size * 0.35);
  sketch.triangle(tip.x, tip.y, left.x, left.y, right.x, right.y);
}
