import { Galaxy, Star, StarSystem } from './Galaxy.js';
import { HexCoordinate } from './HexCoordinate.js';
import {
  Colony,
  Planet,
  Player,
  type PlanetEnvironmentType,
} from './Planet.js';

// fast-exempelvarld: illustrative values, not economic or research balance.
export function createExampleGalaxy(): Galaxy {
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
          const [q, r] = offsets[index]!;
          const home = systemIndex === 0 && index === 0;
          return new Planet({
            id: `${system.id}-${index}`,
            name,
            type: index === 2 ? 'gas' : 'solid',
            environment: environments[systemIndex]![index]!,
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
      ),
  );
  return new Galaxy(player, systems);
}
