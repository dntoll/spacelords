import type { FleetSnapshot } from './Game.js';
import type { Galaxy } from './Galaxy.js';
import { HexCoordinate } from './HexCoordinate.js';
import type { PursuingFleet } from './FleetPursuit.js';

export interface SavedPirateFleet {
  readonly id: string;
  readonly systemId: string;
  readonly position: { readonly q: number; readonly r: number };
  readonly count: number;
}
export interface PirateSnapshot extends SavedPirateFleet {
  readonly position: HexCoordinate;
}

/** rymdpiraters-patrullering: patrol the home star's six neighboring hexes. */
export class PirateFleet {
  constructor(
    readonly id: string,
    readonly systemId: string,
    public position: HexCoordinate,
    public count = 1,
  ) {}

  static seed(galaxy: Galaxy): PirateFleet[] {
    return galaxy.systems
      .filter(
        (system) =>
          !system.planets.some((planet) => planet.id === galaxy.homePlanet.id),
      )
      .map(
        (system) =>
          new PirateFleet(
            `pirate-${system.star.id}`,
            system.star.id,
            system.star.position.neighbors()[0]!,
          ),
      );
  }

  static restore(saved: SavedPirateFleet, galaxy: Galaxy): PirateFleet {
    const system = galaxy.systems.find(
      (system) => system.star.id === saved.systemId,
    );
    const position = new HexCoordinate(saved.position.q, saved.position.r);
    if (
      !system ||
      position.distanceTo(system.star.position) !== 1 ||
      !galaxy.cellAt(position) ||
      !Number.isSafeInteger(saved.count) ||
      saved.count < 1 ||
      !saved.id
    )
      throw new Error('Invalid saved pirate fleet.');
    return new PirateFleet(saved.id, saved.systemId, position, saved.count);
  }

  nextPosition(galaxy: Galaxy): HexCoordinate {
    const ring = galaxy.systems
      .find((system) => system.star.id === this.systemId)!
      .star.position.neighbors();
    const next =
      ring[
        (ring.findIndex((hex) => hex.key === this.position.key) + 1) %
          ring.length
      ]!;
    return galaxy.cellAt(next) ? next : this.position;
  }

  snapshot(): PirateSnapshot {
    return Object.freeze({
      id: this.id,
      systemId: this.systemId,
      position: this.position,
      count: this.count,
    });
  }

  movingFleet(): PursuingFleet {
    return {
      id: this.id,
      name: 'Space pirate',
      position: this.position,
      destination: null,
      ships: {
        Fighter: this.count,
        'Colony ship': 0,
        'Exploration ship': 0,
        'Transport ship': 0,
        'Civilian shuttle': 0,
        'Salvage ship': 0,
      },
    };
  }
}

export function pirateAsFleet(pirate: PirateSnapshot): FleetSnapshot {
  return Object.freeze({
    id: pirate.id,
    name: 'Space pirate',
    position: pirate.position,
    destination: null,
    ships: Object.freeze({
      Fighter: pirate.count,
      'Colony ship': 0,
      'Exploration ship': 0,
      'Transport ship': 0,
      'Civilian shuttle': 0,
      'Salvage ship': 0,
    }),
    speed: 1,
    crew: 0,
  });
}
