import { Galaxy, Star, StarSystem } from './Galaxy.js';
import { HexCoordinate } from './HexCoordinate.js';
import { createGalaxyTerrain } from './GalaxyTerrain.js';
import {
  Colony,
  Planet,
  Player,
  type PlanetEnvironmentType,
} from './Planet.js';

// fast-exempelvarld: illustrative values, not economic or research balance.
export function createExampleGalaxy(expanded = false): Galaxy {
  const player = new Player('player', 'Your empire');
  const definitions = [
    {
      id: 'sol',
      name: 'Sol',
      q: 0,
      r: 0,
      planets: ['Tellus', 'Vesta', 'Brontes'],
    },
    {
      id: 'nadir',
      name: 'Nadir',
      q: 7,
      r: -3,
      planets: ['Nadir I', 'Nadir II', 'Nadir III'],
    },
    {
      id: 'aster',
      name: 'Aster',
      q: -6,
      r: 6,
      planets: ['Aster I', 'Aster II', 'Aster III'],
    },
  ];
  // utokad-galax: stable placement retains the three named systems.
  if (expanded) {
    const candidates = [...HexCoordinate.disk(98)].sort(
      (a, b) => coordinateHash(a) - coordinateHash(b) || a.q - b.q || a.r - b.r,
    );
    for (const point of candidates) {
      if (definitions.length === 300) break;
      if (
        definitions.some(
          (system) =>
            point.distanceTo(new HexCoordinate(system.q, system.r)) < 7,
        )
      )
        continue;
      const number = definitions.length + 1;
      const name = `System ${number}`;
      definitions.push({
        id: `system-${number}`,
        name,
        q: point.q,
        r: point.r,
        planets: [`${name} I`, `${name} II`, `${name} III`],
      });
    }
  }
  const environments: readonly (readonly PlanetEnvironmentType[])[] = [
    ['Temperate', 'Desert', 'Temperate'],
    ['Ice', 'Ocean', 'Temperate'],
    ['Toxic', 'Desert', 'Temperate'],
  ];
  const offsets = [
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as const;
  const systems = definitions.map(
    (system, systemIndex) =>
      new StarSystem(
        new Star(system.id, system.name, new HexCoordinate(system.q, system.r)),
        system.planets.map((name, index) => {
          const [offsetQ, offsetR] = offsets[index]!;
          const q = offsetQ * (expanded ? 2 : 1);
          const r = offsetR * (expanded ? 2 : 1);
          const home = systemIndex === 0 && index === 0;
          return new Planet({
            id: `${system.id}-${index}`,
            name,
            type: index === 2 ? 'gas' : 'solid',
            environment:
              environments[systemIndex % environments.length]![index]!,
            position: new HexCoordinate(system.q + q, system.r + r),
            habitability: home ? 100 : index === 2 ? 0 : 25,
            buildSlots: home ? 10 : index === 2 ? 0 : 6,
            resources: [
              { name: 'Iron', perYear: home ? 10 : index === 0 ? 12 : 4 },
              { name: 'Water', perYear: home ? 8 : index === 0 ? 3 : 10 },
              { name: 'Oil', perYear: home ? 4 : index === 0 ? 0 : 6 },
            ],
            colony: home ? new Colony(player.id, 12_000) : null,
          });
        }),
        expanded ? 2 : 1,
      ),
  );
  return new Galaxy(
    player,
    systems,
    expanded ? 100 : 10,
    expanded ? createGalaxyTerrain(systems, 100) : [],
  );
}

function coordinateHash(point: HexCoordinate): number {
  let value =
    Math.imul(point.q + 101, 374761393) ^ Math.imul(point.r + 101, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}

let expandedGalaxy: Galaxy | undefined;
export function createExpandedGalaxy(): Galaxy {
  return (expandedGalaxy ??= createExampleGalaxy(true));
}
