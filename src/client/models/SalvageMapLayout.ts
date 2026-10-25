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
    return {
      id: object.id,
      kind: object.kind,
      point: {
        x:
          center.x +
          ((group.indexOf(object) - (group.length - 1) / 2) * 44) / zoom,
        y: center.y + 18 / zoom,
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
        22 / zoom,
    ) ?? null
  );
}
