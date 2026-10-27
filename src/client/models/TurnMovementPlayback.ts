import type { FleetSnapshot, TurnFrame } from './Game.js';
import type { MapCell } from './Galaxy.js';
import type { PirateSnapshot } from './PirateFleet.js';
import type { HexCoordinate } from './HexCoordinate.js';

export type TurnMovement = TurnFrame['movements'][number];

export interface MovementScene {
  readonly fleets: readonly FleetSnapshot[];
  readonly pirates: readonly PirateSnapshot[];
  readonly cells: readonly MapCell[];
}

interface MovementTrack {
  readonly fleet: FleetSnapshot | PirateSnapshot;
  readonly hostile: boolean;
  readonly movements: TurnMovement[];
}

/** en-flotta-i-taget: replay complete visible tracks without changing simulation order. */
export class TurnMovementPlayback {
  readonly #tracks = new Map<string, MovementTrack>();
  readonly #positions = new Map<string, HexCoordinate>();
  readonly #fleets: Map<string, FleetSnapshot>;
  readonly #pirates: Map<string, PirateSnapshot>;
  #current: TurnMovement | null = null;

  constructor(origin: MovementScene) {
    this.#fleets = new Map(origin.fleets.map((fleet) => [fleet.id, fleet]));
    this.#pirates = new Map(origin.pirates.map((fleet) => [fleet.id, fleet]));
  }

  record(frame: TurnFrame, before: MovementScene, after: MovementScene): void {
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
      track.movements.push(Object.freeze({ ...movement }));
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
    return this.#current;
  }

  begin(movement: TurnMovement): void {
    const track = this.#tracks.get(movement.fleetId)!;
    if (track.hostile)
      this.#pirates.set(movement.fleetId, track.fleet as PirateSnapshot);
    else this.#fleets.set(movement.fleetId, track.fleet as FleetSnapshot);
    this.#positions.set(movement.fleetId, movement.from);
    this.#current = movement;
  }

  complete(): void {
    if (this.#current)
      this.#positions.set(this.#current.fleetId, this.#current.to);
    this.#current = null;
  }

  get fleets(): readonly FleetSnapshot[] {
    return Object.freeze(
      [...this.#fleets.values()].map((fleet) =>
        Object.freeze({
          ...fleet,
          position: this.#positions.get(fleet.id) ?? fleet.position,
        }),
      ),
    );
  }

  get pirates(): readonly PirateSnapshot[] {
    return Object.freeze(
      [...this.#pirates.values()].map((fleet) =>
        Object.freeze({
          ...fleet,
          position: this.#positions.get(fleet.id) ?? fleet.position,
        }),
      ),
    );
  }
}
