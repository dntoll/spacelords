import { describe, expect, it } from 'vitest';
import {
  HexCoordinate,
  HexGeometry,
} from '../../src/client/models/HexCoordinate.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { Planet } from '../../src/client/models/Planet.js';

describe('hexkarta', () => {
  it('has six distinct adjacent coordinates and round-trips every cell center', () => {
    const origin = new HexCoordinate(0, 0);
    expect(new Set(origin.neighbors().map((cell) => cell.key)).size).toBe(6);
    for (const cell of HexCoordinate.disk(10)) {
      const point = HexGeometry.toPoint(cell);
      expect(HexGeometry.fromPoint(point).key).toBe(cell.key);
    }
    expect(HexCoordinate.disk(10)).toHaveLength(331);
    expect(
      origin.neighbors().every((cell) => cell.distanceTo(origin) === 1),
    ).toBe(true);
  });

  it('places one object per cell and each planet next to its own star', () => {
    const galaxy = createExampleGalaxy();
    const occupied: string[] = [];
    for (const system of galaxy.systems) {
      occupied.push(system.star.position.key);
      for (const planet of system.planets) {
        occupied.push(planet.position.key);
        expect(planet.position.distanceTo(system.star.position)).toBe(1);
      }
    }
    expect(new Set(occupied).size).toBe(occupied.length);
    expect(
      galaxy.systems[0]!.star.position.distanceTo(
        galaxy.systems[1]!.star.position,
      ),
    ).toBeGreaterThan(3);
  });
});

describe('fast-exempelvarld', () => {
  it('starts with three reproducible systems and exactly one colony', () => {
    const galaxy = createExampleGalaxy();
    const planets = galaxy.systems.flatMap((system) => system.planets);
    expect(galaxy.systems).toHaveLength(3);
    expect(planets.filter((planet) => planet.colony !== null)).toHaveLength(1);
    expect(galaxy.homePlanet.position.key).toBe('1,0');
    expect(new Set(planets.map((planet) => planet.type))).toEqual(
      new Set(['solid', 'gas']),
    );
    expect(createExampleGalaxy().mapSnapshot()).toEqual(galaxy.mapSnapshot());
  });
});

describe('lokal-sikt', () => {
  it('exposes only the home hex and its neighbors, without hidden planet data', () => {
    const galaxy = createExampleGalaxy();
    const map = galaxy.mapSnapshot();
    expect(map.filter((cell) => cell.visible)).toHaveLength(7);
    expect(map.find((cell) => cell.position.key === '1,0')?.object?.name).toBe(
      'Tellus',
    );
    const hiddenPlanet = galaxy.systems[0]!.planets[2]!;
    expect(
      hiddenPlanet.position.distanceTo(galaxy.homePlanet.position),
    ).toBeGreaterThan(1);
    expect(
      map.find((cell) => cell.position.key === hiddenPlanet.position.key)
        ?.object,
    ).toBeNull();
    expect(JSON.stringify(map)).not.toContain(hiddenPlanet.name);
  });
});

describe('synliga-stjarnor', () => {
  it('keeps all star positions visible beyond the local sight radius', () => {
    const map = createExampleGalaxy().mapSnapshot();
    expect(map.filter((cell) => cell.object?.kind === 'star')).toHaveLength(3);
    expect(
      map.some((cell) => !cell.visible && cell.object?.kind === 'star'),
    ).toBe(true);
  });
});

describe('planetinformation', () => {
  it.each([-1, 101, Number.NaN])(
    'rejects invalid habitability %s',
    (habitability) => {
      expect(
        () =>
          new Planet({
            id: 'invalid',
            name: 'Invalid',
            type: 'solid',
            position: new HexCoordinate(0, 0),
            habitability,
            buildSlots: 3,
            resources: [],
            colony: null,
          }),
      ).toThrow(RangeError);
    },
  );

  it.each([-1, 11, 1.5])(
    'rejects invalid build slot counts %s',
    (buildSlots) => {
      expect(
        () =>
          new Planet({
            id: 'invalid',
            name: 'Invalid',
            type: 'solid',
            position: new HexCoordinate(0, 0),
            habitability: 50,
            buildSlots,
            resources: [],
            colony: null,
          }),
      ).toThrow(RangeError);
    },
  );
});

describe('mvc-arkitektur', () => {
  it('protects nested planet read data from modification', () => {
    const galaxy = createExampleGalaxy();
    const snapshot = galaxy.homePlanet.snapshot;
    expect(() =>
      Object.assign(snapshot.resources[0]!, { perYear: 999 }),
    ).toThrow(TypeError);
    expect(() => Object.assign(snapshot.colony!, { population: 0 })).toThrow(
      TypeError,
    );
    expect(() => Object.assign(snapshot.position, { q: 50 })).toThrow(
      TypeError,
    );
    expect(galaxy.homePlanet.snapshot.colony?.population).toBe(12_000);
  });
});
