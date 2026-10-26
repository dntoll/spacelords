import type { StarSystem, TerrainHex } from './Galaxy.js';
import { HexCoordinate } from './HexCoordinate.js';

/** asteroidbalten / nebulosornas-sikt: reproducible arcs and clouds, with clear orbital rings. */
export function createGalaxyTerrain(
  systems: readonly StarSystem[],
  radius: number,
): readonly TerrainHex[] {
  const origin = new HexCoordinate(0, 0);
  const cells = HexCoordinate.disk(radius);
  const protectedHexes = new Set<string>();
  const stars = new Set(systems.map((system) => system.star.position.key));
  for (const system of systems) {
    for (const point of [
      system.star.position,
      ...system.star.position.neighbors(),
      ...system.planets.map((planet) => planet.position),
    ])
      protectedHexes.add(point.key);
  }
  const terrain = new Map<string, TerrainHex>();
  const put = (position: HexCoordinate, type: TerrainHex['type']) => {
    if (
      position.distanceTo(origin) > radius ||
      position.distanceTo(systems[0]!.star.position) <= 3 ||
      protectedHexes.has(position.key)
    )
      return;
    terrain.set(position.key, Object.freeze({ position, type }));
  };
  systems.forEach((system, index) => {
    if (index === 0) return;
    for (const offset of HexCoordinate.disk(3)) {
      if (offset.distanceTo(origin) !== 3) continue;
      const angle =
        (Math.atan2(offset.r, offset.q + offset.r / 2) + Math.PI * 2 + index) %
        (Math.PI * 2);
      if (angle > Math.PI * 1.5) continue;
      put(
        new HexCoordinate(
          system.star.position.q + offset.q,
          system.star.position.r + offset.r,
        ),
        angle < Math.PI * 0.6 ? 'dense-asteroids' : 'sparse-asteroids',
      );
    }
    if (index % 4 !== 0) return;
    const center = new HexCoordinate(
      system.star.position.q + 4,
      system.star.position.r + 1,
    );
    for (const offset of HexCoordinate.disk(2)) {
      const point = new HexCoordinate(center.q + offset.q, center.r + offset.r);
      if (!terrain.has(point.key)) put(point, 'nebula');
    }
  });
  // Keep every planet connected through ordinary space or passable terrain.
  const parents = new Map<string, HexCoordinate | null>();
  const queue = [systems[0]!.planets[0]!.position];
  parents.set(queue[0]!.key, null);
  for (let index = 0; index < queue.length; index++) {
    const point = queue[index]!;
    for (const next of point.neighbors()) {
      if (
        next.distanceTo(origin) > radius ||
        stars.has(next.key) ||
        parents.has(next.key)
      )
        continue;
      parents.set(next.key, point);
      queue.push(next);
    }
  }
  for (const system of systems)
    for (const planet of system.planets) {
      for (
        let point: HexCoordinate | null = planet.position;
        point;
        point = parents.get(point.key) ?? null
      ) {
        if (terrain.get(point.key)?.type === 'dense-asteroids')
          terrain.delete(point.key);
      }
    }
  return Object.freeze(
    cells.flatMap((point) =>
      terrain.has(point.key) ? [terrain.get(point.key)!] : [],
    ),
  );
}
