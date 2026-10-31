import type { FleetSnapshot, PlanetGameSnapshot, TurnFrame } from './Game.js';
import { Detection, type DetectionSource } from './Detection.js';
import type { MapCell } from './Galaxy.js';
import type { PirateSnapshot } from './PirateFleet.js';
import type { HexCoordinate } from './HexCoordinate.js';
import { comparePlaybackPositions } from './PlaybackOrder.js';

export type TurnMovement = TurnFrame['movements'][number];

export interface MovementScene {
  readonly ownedPlanets?: readonly Pick<
    PlanetGameSnapshot,
    'position' | 'detectionRange'
  >[];
  readonly fleets: readonly FleetSnapshot[];
  readonly pirates: readonly PirateSnapshot[];
  readonly cells: readonly MapCell[];
}

interface MovementTrack {
  readonly fleet: FleetSnapshot | PirateSnapshot;
  readonly hostile: boolean;
  readonly movements: TurnMovement[];
}

/** samtidig-farledsanimation: replay visible tracks without changing simulation order. */
export class TurnMovementPlayback {
  readonly #tracks = new Map<string, MovementTrack>();
  readonly #positions = new Map<string, HexCoordinate>();
  readonly #fleets: Map<string, FleetSnapshot>;
  readonly #pirates: Map<string, PirateSnapshot>;
  readonly #catalog: Map<string, MapCell>;
  readonly #observations = new Map<TurnMovement, readonly PirateSnapshot[]>();
  readonly #destinations = new Map<TurnMovement, HexCoordinate>();
  readonly #planets: readonly DetectionSource[];
  #cells: readonly MapCell[];
  #current: readonly TurnMovement[] = Object.freeze([]);

  constructor(origin: MovementScene) {
    this.#fleets = new Map(origin.fleets.map((fleet) => [fleet.id, fleet]));
    this.#pirates = new Map(origin.pirates.map((fleet) => [fleet.id, fleet]));
    this.#catalog = new Map(
      origin.cells.map((cell) => [cell.position.key, cell]),
    );
    this.#cells = origin.cells;
    this.#planets = (
      origin.ownedPlanets ?? origin.cells.filter((cell) => cell.object?.owned)
    ).map((planet) => ({
      position: planet.position,
      range: 'detectionRange' in planet ? (planet.detectionRange ?? 1) : 1,
    }));
  }

  record(frame: TurnFrame, before: MovementScene, after: MovementScene): void {
    for (const cell of after.cells) this.#catalog.set(cell.position.key, cell);
    for (const movement of frame.movements) {
      const own = before.fleets.find((fleet) => fleet.id === movement.fleetId);
      const pirate = before.pirates.find(
        (fleet) => fleet.id === movement.fleetId,
      );
      // osynliga-flottor-utan-animation: never replay a hostile step through hidden space.
      if (
        !own &&
        (!pirate ||
          !after.pirates.some((fleet) => fleet.id === movement.fleetId))
      )
        continue;
      const track = this.#tracks.get(movement.fleetId) ?? {
        fleet: own ?? pirate!,
        hostile: !own,
        movements: [],
      };
      const step = Object.freeze({ ...movement });
      track.movements.push(step);
      this.#observations.set(step, after.pirates);
      this.#destinations.set(step, own?.destination ?? movement.to);
      this.#tracks.set(movement.fleetId, track);
    }
  }

  get tracks(): readonly (readonly TurnMovement[])[] {
    return Object.freeze(
      [...this.#tracks.values()].map((track) =>
        Object.freeze([...track.movements]),
      ),
    );
  }

  get current(): TurnMovement | null {
    return this.#current[0] ?? null;
  }

  get currents(): readonly TurnMovement[] {
    return this.#current;
  }

  get batches(): readonly (readonly (readonly TurnMovement[])[])[] {
    const traffic: (readonly TurnMovement[])[] = [];
    const independent: (readonly TurnMovement[])[] = [];
    for (const track of this.tracks) {
      const fleet = this.#tracks.get(track[0]!.fleetId)!.fleet;
      const routeTraffic =
        ('routeId' in fleet && fleet.routeId) ||
        ('civilian' in fleet && fleet.civilian);
      (routeTraffic ? traffic : independent).push(track);
    }
    independent.sort((a, b) =>
      comparePlaybackPositions(a[0]!.from, b[0]!.from),
    );
    return Object.freeze([
      ...(traffic.length ? [Object.freeze(traffic)] : []),
      ...independent.map((track) => Object.freeze([track])),
    ]);
  }

  begin(movements: TurnMovement | readonly TurnMovement[]): void {
    this.#current = Object.freeze(
      'fleetId' in movements ? [movements] : [...movements],
    );
    for (const movement of this.#current) {
      const track = this.#tracks.get(movement.fleetId)!;
      if (track.hostile)
        this.#pirates.set(movement.fleetId, track.fleet as PirateSnapshot);
      else this.#fleets.set(movement.fleetId, track.fleet as FleetSnapshot);
      this.#positions.set(movement.fleetId, movement.from);
    }
  }

  complete(): void {
    this.advance(1);
    this.#current = Object.freeze([]);
  }

  /** sikt-under-forflyttning: switch hex coverage when the marker crosses the shared edge. */
  advance(progress: number): boolean {
    if (progress < 0.5) return false;
    const changed = this.#current.filter(
      (movement) =>
        this.#positions.get(movement.fleetId)?.key !== movement.to.key,
    );
    if (!changed.length) return false;
    for (const movement of changed) {
      this.#positions.set(movement.fleetId, movement.to);
      for (const pirate of this.#observations.get(movement) ?? [])
        if (!this.#pirates.has(pirate.id)) this.#pirates.set(pirate.id, pirate);
    }
    const sources = [
      ...this.#planets,
      ...this.fleets
        .filter(
          (fleet) =>
            fleet.position &&
            Object.values(fleet.ships).some((count) => count > 0),
        )
        .map((fleet) => ({
          position: fleet.position!,
          range: fleet.detectionRange ?? 0,
        })),
    ];
    const nebula = (point: HexCoordinate) =>
      this.#catalog.get(point.key)?.terrain === 'nebula';
    const visible = Detection.coverage(sources, nebula);
    const surface = Detection.coverage(sources, nebula, true);
    this.#cells = Object.freeze(
      this.#cells.map((previous) => {
        const key = previous.position.key;
        const known = this.#catalog.get(key)!;
        return Object.freeze({
          ...previous,
          visible: visible.has(key),
          explored: previous.explored || visible.has(key),
          object: previous.object ?? (visible.has(key) ? known.object : null),
          ...(surface.has(key)
            ? { terrain: known.terrain, passable: known.passable }
            : {}),
        });
      }),
    );
    return true;
  }

  get cells(): readonly MapCell[] {
    return this.#cells;
  }

  get fleets(): readonly FleetSnapshot[] {
    return Object.freeze(
      [...this.#fleets.values()].map((fleet) => {
        const movement = this.#current.find(
          (step) => step.fleetId === fleet.id,
        );
        return Object.freeze({
          ...fleet,
          position: this.#positions.get(fleet.id) ?? fleet.position,
          destination: movement
            ? (this.#destinations.get(movement) ??
              fleet.destination ??
              movement.to)
            : null,
        });
      }),
    );
  }

  get pirates(): readonly PirateSnapshot[] {
    const visible = new Set(
      this.#cells
        .filter((cell) => cell.visible)
        .map((cell) => cell.position.key),
    );
    return Object.freeze(
      [...this.#pirates.values()]
        .filter((fleet) =>
          visible.has((this.#positions.get(fleet.id) ?? fleet.position).key),
        )
        .map((fleet) =>
          Object.freeze({
            ...fleet,
            position: this.#positions.get(fleet.id) ?? fleet.position,
          }),
        ),
    );
  }
}
