import { HexCoordinate } from './HexCoordinate.js';
import type { Planet, Player } from './Planet.js';

export class Star {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly position: HexCoordinate,
  ) {
    Object.freeze(this);
  }
}

export class StarSystem {
  readonly planets: readonly Planet[];

  constructor(
    readonly star: Star,
    planets: readonly Planet[],
  ) {
    if (
      planets.length > 6 ||
      planets.some((planet) => planet.position.distanceTo(star.position) !== 1)
    ) {
      throw new RangeError('System planets must occupy neighboring hexes.');
    }
    this.planets = Object.freeze([...planets]);
    Object.freeze(this);
  }
}

export interface MapObject {
  readonly kind: 'star' | 'planet';
  readonly name: string;
  readonly type: 'star' | 'solid' | 'gas';
  readonly owned: boolean;
}

export interface MapCell {
  readonly position: HexCoordinate;
  readonly visible: boolean;
  readonly object: MapObject | null;
}

export class Galaxy {
  readonly systems: readonly StarSystem[];
  readonly homePlanet: Planet;
  readonly radius: number;
  readonly #cells: readonly MapCell[];

  constructor(
    readonly player: Player,
    systems: readonly StarSystem[],
    radius = 10,
  ) {
    this.radius = radius;
    this.systems = Object.freeze([...systems]);
    const planets = this.systems.flatMap((system) => system.planets);
    const home = planets.find((planet) => planet.colony?.ownerId === player.id);
    if (!home) throw new Error('The player needs a home planet.');
    this.homePlanet = home;
    const positions = this.systems.flatMap((system) => [
      system.star.position,
      ...system.planets.map((planet) => planet.position),
    ]);
    if (
      new Set(positions.map((position) => position.key)).size !==
        positions.length ||
      positions.some(
        (position) => position.distanceTo(new HexCoordinate(0, 0)) > radius,
      )
    ) {
      throw new RangeError(
        'World objects must be distinct and inside the map.',
      );
    }
    // lokal-sikt: remove hidden objects before handing data to any platform view.
    this.#cells = Object.freeze(
      HexCoordinate.disk(radius).map((position) => {
        const visible = position.distanceTo(home.position) <= 1;
        const star = this.systems.find(
          (system) => system.star.position.key === position.key,
        )?.star;
        const planet = visible
          ? planets.find((candidate) => candidate.position.key === position.key)
          : undefined;
        const object: MapObject | null = star
          ? Object.freeze({
              kind: 'star',
              type: 'star',
              name: star.name,
              owned: false,
            })
          : planet
            ? Object.freeze({
                kind: 'planet',
                type: planet.type,
                name: planet.name,
                owned: planet.colony?.ownerId === player.id,
              })
            : null;
        return Object.freeze({ position, visible, object });
      }),
    );
    Object.freeze(this);
  }

  mapSnapshot(): readonly MapCell[] {
    return this.#cells;
  }

  cellAt(position: HexCoordinate): MapCell | undefined {
    return this.#cells.find((cell) => cell.position.key === position.key);
  }

  ownedPlanetAt(position: HexCoordinate): Planet | undefined {
    return this.systems
      .flatMap((system) => system.planets)
      .find(
        (planet) =>
          planet.position.key === position.key &&
          planet.colony?.ownerId === this.player.id,
      );
  }
}
