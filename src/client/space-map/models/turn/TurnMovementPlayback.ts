import type { FleetSnapshot, TurnFrame } from '../Game.js';
import { Detection, type DetectionSource } from '../Detection.js';
import type { MapCell } from '../Galaxy.js';
import type { PirateMemory, PirateSnapshot } from '../PirateFleet.js';
import type { HexCoordinate } from '../../../common/HexCoordinate.js';
import { comparePlaybackPositions } from './PlaybackOrder.js';

export type TurnMovement = TurnFrame['movements'][number];

export interface MovementScene {
  /** enda-spelarflottan: the player's only fleet. */
  readonly fleet: FleetSnapshot;
  readonly pirates: readonly PirateSnapshot[];
  readonly pirateMemories?: readonly PirateMemory[];
  readonly cells: readonly MapCell[];
}

interface MovementTrack {
  readonly fleet: FleetSnapshot | PirateSnapshot;
  readonly hostile: boolean;
  readonly movements: TurnMovement[];
}

/** samtidig-automatisk-flottanimation: replay visible tracks without changing simulation order. */
export class TurnMovementPlayback {
  static readonly #indices = new WeakMap<
    HexCoordinate,
    {
      positions: readonly HexCoordinate[];
      indices: ReadonlyMap<string, number>;
    }
  >();
  readonly #tracks = new Map<string, MovementTrack>();
  readonly #positions = new Map<string, HexCoordinate>();
  #fleet: FleetSnapshot;
  readonly #pirates: Map<string, PirateSnapshot>;
  readonly #cellIndices: ReadonlyMap<string, number>;
  #visible = new Set<string>();
  readonly #observations = new Map<TurnMovement, readonly PirateSnapshot[]>();
  readonly #memoryObservations = new Map<
    TurnMovement,
    readonly PirateMemory[]
  >();
  #memories: readonly PirateMemory[];
  readonly #destinations = new Map<TurnMovement, HexCoordinate>();
  #cells: readonly MapCell[];
  #catalogCells: readonly MapCell[];
  #current: readonly TurnMovement[] = Object.freeze([]);

  constructor(origin: MovementScene) {
    this.#fleet = origin.fleet;
    this.#memories = origin.pirateMemories ?? [];
    this.#pirates = new Map(origin.pirates.map((fleet) => [fleet.id, fleet]));
    const first = origin.cells[0]?.position;
    const cached = first ? TurnMovementPlayback.#indices.get(first) : undefined;
    if (
      cached &&
      cached.positions.length === origin.cells.length &&
      cached.positions.every(
        (position, index) => position === origin.cells[index]!.position,
      )
    ) {
      this.#cellIndices = cached.indices;
    } else {
      const indices = new Map<string, number>();
      origin.cells.forEach((cell, index) =>
        indices.set(cell.position.key, index),
      );
      this.#cellIndices = indices;
      if (first)
        TurnMovementPlayback.#indices.set(first, {
          positions: origin.cells.map((cell) => cell.position),
          indices,
        });
    }
    for (const cell of origin.cells)
      if (cell.visible) this.#visible.add(cell.position.key);
    this.#cells = origin.cells;
    this.#catalogCells = origin.cells;
  }

  record(frame: TurnFrame, before: MovementScene, after: MovementScene): void {
    this.#catalogCells = after.cells;
    for (const movement of frame.movements) {
      const own =
        before.fleet.id === movement.fleetId ? before.fleet : undefined;
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
      this.#memoryObservations.set(step, after.pirateMemories ?? []);
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

  /** geografisk-arsuppspelning: one track at a time, west to east. */
  get batches(): readonly (readonly (readonly TurnMovement[])[])[] {
    return Object.freeze(
      [...this.tracks]
        .sort((a, b) => comparePlaybackPositions(a[0]!.from, b[0]!.from))
        .map((track) => Object.freeze([track])),
    );
  }

  begin(movements: TurnMovement | readonly TurnMovement[]): void {
    this.#current = Object.freeze(
      'fleetId' in movements ? [movements] : [...movements],
    );
    for (const movement of this.#current) {
      const track = this.#tracks.get(movement.fleetId)!;
      if (track.hostile)
        this.#pirates.set(movement.fleetId, track.fleet as PirateSnapshot);
      else this.#fleet = track.fleet as FleetSnapshot;
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
      this.#memories = this.#memoryObservations.get(movement) ?? this.#memories;
      for (const pirate of this.#observations.get(movement) ?? [])
        if (!this.#pirates.has(pirate.id)) this.#pirates.set(pirate.id, pirate);
    }
    const fleet = this.fleet;
    const sources: DetectionSource[] =
      fleet.position && Object.values(fleet.ships).some((count) => count > 0)
        ? [{ position: fleet.position, range: fleet.detectionRange ?? 0 }]
        : [];
    const nebula = (point: HexCoordinate) => {
      const index = this.#cellIndices.get(point.key);
      return (
        index !== undefined && this.#catalogCells[index]?.terrain === 'nebula'
      );
    };
    const visible = Detection.coverage(sources, nebula);
    const surface = Detection.coverage(sources, nebula, true);
    const cells = [...this.#cells];
    for (const key of new Set([...this.#visible, ...visible, ...surface])) {
      const index = this.#cellIndices.get(key);
      if (index === undefined) continue;
      const previous = cells[index]!;
      const known = this.#catalogCells[index]!;
      cells[index] = Object.freeze({
        ...previous,
        visible: visible.has(key),
        explored: previous.explored || visible.has(key),
        object: previous.object ?? (visible.has(key) ? known.object : null),
        ...(surface.has(key)
          ? { terrain: known.terrain, passable: known.passable }
          : {}),
      });
    }
    this.#visible = new Set(
      [...visible].filter((key) => this.#cellIndices.has(key)),
    );
    this.#cells = Object.freeze(cells);
    return true;
  }

  get cells(): readonly MapCell[] {
    return this.#cells;
  }

  cellAt(key: string): MapCell | null {
    const index = this.#cellIndices.get(key);
    return index === undefined ? null : this.#cells[index]!;
  }

  get fleet(): FleetSnapshot {
    const fleet = this.#fleet;
    const movement = this.#current.find((step) => step.fleetId === fleet.id);
    return Object.freeze({
      ...fleet,
      position: this.#positions.get(fleet.id) ?? fleet.position,
      destination: movement
        ? (this.#destinations.get(movement) ?? fleet.destination ?? movement.to)
        : null,
    });
  }

  get pirates(): readonly PirateSnapshot[] {
    return Object.freeze(
      [...this.#pirates.values()]
        .filter((fleet) =>
          this.#visible.has(
            (this.#positions.get(fleet.id) ?? fleet.position).key,
          ),
        )
        .map((fleet) =>
          Object.freeze({
            ...fleet,
            position: this.#positions.get(fleet.id) ?? fleet.position,
          }),
        ),
    );
  }

  get pirateMemories(): readonly PirateMemory[] {
    const visibleIds = new Set(this.pirates.map((pirate) => pirate.id));
    return Object.freeze(
      this.#memories.filter((memory) => !visibleIds.has(memory.pirate.id)),
    );
  }
}
