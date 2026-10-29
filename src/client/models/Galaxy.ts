import { HexCoordinate } from './HexCoordinate.js';
import type { Planet, Player, PlanetEnvironmentType } from './Planet.js';

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
    readonly planetDistance: 1 | 2 = 1,
  ) {
    if (
      planets.length > 6 ||
      planets.some(
        (planet) =>
          planet.position.distanceTo(star.position) !== planetDistance,
      )
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
  readonly environment?: PlanetEnvironmentType | 'Gas';
}

export interface MapCell {
  readonly position: HexCoordinate;
  readonly explored: boolean;
  readonly visible: boolean;
  readonly object: MapObject | null;
  readonly terrain?: Terrain | null;
  readonly passable?: boolean | null;
}

export type Terrain =
  'space' | 'dense-asteroids' | 'sparse-asteroids' | 'nebula';
export interface TerrainHex {
  readonly position: { readonly q: number; readonly r: number };
  readonly type: Exclude<Terrain, 'space'>;
}

export class Galaxy {
  readonly systems: readonly StarSystem[];
  readonly homePlanet: Planet;
  readonly radius: number;
  readonly #cells: readonly MapCell[];
  readonly terrain: readonly TerrainHex[];
  readonly #byPosition = new Map<string, MapCell>();
  readonly #stars = new Map<string, Star>();
  readonly #planets = new Map<string, Planet>();
  readonly #terrain = new Map<string, Terrain>();

  constructor(
    readonly player: Player,
    systems: readonly StarSystem[],
    radius = 10,
    terrain: readonly TerrainHex[] = [],
  ) {
    this.radius = radius;
    this.systems = Object.freeze([...systems]);
    const planets = this.systems.flatMap((system) => system.planets);
    const home = planets.find((planet) => planet.colony?.ownerId === player.id);
    if (!home) throw new Error('The player needs a home planet.');
    this.homePlanet = home;
    for (const system of systems)
      this.#stars.set(system.star.position.key, system.star);
    for (const planet of planets)
      this.#planets.set(planet.position.key, planet);
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
    const occupied = new Set(positions.map((position) => position.key));
    this.terrain = Object.freeze(
      terrain.map((cell) => {
        const position = new HexCoordinate(cell.position.q, cell.position.r);
        if (
          !['dense-asteroids', 'sparse-asteroids', 'nebula'].includes(
            cell.type,
          ) ||
          !this.contains(position) ||
          occupied.has(position.key) ||
          this.#terrain.has(position.key)
        )
          throw new RangeError('Invalid terrain hex.');
        this.#terrain.set(position.key, cell.type);
        return Object.freeze({ position, type: cell.type });
      }),
    );
    // lokal-sikt: remove hidden objects before handing data to any platform view.
    this.#cells = Object.freeze(
      HexCoordinate.disk(radius).map((position) => {
        const visible = position.distanceTo(home.position) <= 1;
        const star = this.#stars.get(position.key);
        const planet = visible ? this.#planets.get(position.key) : undefined;
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
                environment: planet.type === 'gas' ? 'Gas' : planet.environment,
                name: planet.name,
                owned: planet.colony?.ownerId === player.id,
              })
            : null;
        const cell = Object.freeze({
          position,
          visible,
          explored: visible,
          object,
          terrain: visible ? this.terrainAt(position) : null,
          passable: star ? false : visible ? this.isPassable(position) : null,
        });
        this.#byPosition.set(position.key, cell);
        return cell;
      }),
    );
    Object.freeze(this);
  }

  mapSnapshot(
    explored?: ReadonlySet<string>,
    ownedPlanetIds?: ReadonlySet<string>,
    visible: ReadonlySet<string> = explored ?? new Set(),
    knownTerrain: ReadonlySet<string> = explored ?? new Set(),
  ): readonly MapCell[] {
    if (!explored) return this.#cells;
    return Object.freeze(
      this.#cells.map((cell) => {
        const star = this.#stars.get(cell.position.key);
        const planet = explored.has(cell.position.key)
          ? this.#planets.get(cell.position.key)
          : undefined;
        const object = star
          ? Object.freeze({
              kind: 'star' as const,
              type: 'star' as const,
              name: star.name,
              owned: false,
            })
          : planet
            ? Object.freeze({
                kind: 'planet' as const,
                type: planet.type,
                environment: planet.type === 'gas' ? 'Gas' : planet.environment,
                name: planet.name,
                owned:
                  ownedPlanetIds?.has(planet.id) ??
                  planet.colony?.ownerId === this.player.id,
              })
            : null;
        return Object.freeze({
          position: cell.position,
          explored: explored.has(cell.position.key),
          visible: visible.has(cell.position.key),
          object,
          terrain: knownTerrain.has(cell.position.key)
            ? this.terrainAt(cell.position)
            : null,
          passable: star
            ? false
            : knownTerrain.has(cell.position.key)
              ? this.isPassable(cell.position)
              : null,
        });
      }),
    );
  }

  cellAt(position: HexCoordinate): MapCell | undefined {
    return this.#byPosition.get(position.key);
  }

  contains(position: HexCoordinate): boolean {
    return position.distanceTo(new HexCoordinate(0, 0)) <= this.radius;
  }
  terrainAt(position: HexCoordinate): Terrain {
    return this.#terrain.get(position.key) ?? 'space';
  }
  isStar(position: HexCoordinate): boolean {
    return this.#stars.has(position.key);
  }
  isPassable(position: HexCoordinate): boolean {
    return (
      this.contains(position) &&
      !this.isStar(position) &&
      this.terrainAt(position) !== 'dense-asteroids'
    );
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
