import { HexGeometry, type Point } from './HexCoordinate.js';
import type { WreckSnapshot, ShipyardSnapshot } from './Salvage.js';

/** vrak-efter-strid: markers and pointer hit tests use the same positions. */
export function salvageMarkers(
  wrecks: readonly WreckSnapshot[],
  yards: readonly ShipyardSnapshot[],
  zoom: number,
) {
  const objects = [
    ...yards
      .filter((yard) => !yard.destroyed)
      .map((yard) => ({ ...yard, kind: 'yard' as const })),
    ...wrecks
      .filter((wreck) => !wreck.towedBy && !wreck.yardId)
      .map((wreck) => ({ ...wreck, kind: 'wreck' as const })),
  ];
  return objects.map((object) => {
    const group = objects.filter(
      (item) => item.position.key === object.position.key,
    );
    const center = HexGeometry.toPoint(object.position);
    const scale = object.kind === 'yard' ? 1 : 1 / zoom;
    return {
      id: object.id,
      kind: object.kind,
      point: {
        x:
          center.x +
          (group.indexOf(object) - (group.length - 1) / 2) * 44 * scale,
        y: center.y + 18 * scale,
      },
    };
  });
}
export function hitSalvageMarker(
  wrecks: readonly WreckSnapshot[],
  yards: readonly ShipyardSnapshot[],
  zoom: number,
  point: Point,
) {
  return (
    salvageMarkers(wrecks, yards, zoom).find(
      (marker) =>
        Math.hypot(marker.point.x - point.x, marker.point.y - point.y) <=
        (marker.kind === 'yard' ? Math.max(20, 22 / zoom) : 22 / zoom),
    ) ?? null
  );
}
