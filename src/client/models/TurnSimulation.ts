import type { HexCoordinate } from './HexCoordinate.js';

export type ExplorationOrder = 'explore' | 'explore-stars';

export interface Discovery {
  readonly id: string;
  readonly kind: 'planet' | 'star' | 'pirate';
  readonly name: string;
  readonly position: { readonly q: number; readonly r: number };
  readonly fleetId: string | null;
}

export interface SavedTurnSimulation {
  readonly remaining: readonly (readonly [string, number])[];
  readonly awaitingCombat: boolean;
  readonly discoveries: readonly Discovery[];
  readonly handling: boolean;
  readonly otherFleets: boolean;
}

/** spara-avbrutet-ar: movement is spent once and survives order changes and reloads. */
export class TurnSimulation {
  readonly remaining: Map<string, number>;
  awaitingCombat = false;
  discoveries: readonly Discovery[] = [];
  handling = false;
  otherFleets = false;

  constructor(budgets: readonly (readonly [string, number])[]) {
    this.remaining = new Map(budgets);
  }

  spend(id: string): void {
    const remaining = this.remaining.get(id) ?? 0;
    if (remaining <= 0) throw new Error('No movement remaining this year.');
    this.remaining.set(id, remaining - 1);
  }

  merge(source: string, target: string): void {
    this.remaining.set(
      target,
      Math.min(
        this.remaining.get(source) ?? 0,
        this.remaining.get(target) ?? 0,
      ),
    );
    this.remaining.delete(source);
  }

  permits(id: string): boolean {
    return (
      this.handling &&
      (this.otherFleets ||
        this.discoveries.some((discovery) => discovery.fleetId === id))
    );
  }

  snapshot(): SavedTurnSimulation {
    return Object.freeze({
      remaining: Object.freeze(
        [...this.remaining].map((entry) => Object.freeze(entry)),
      ),
      awaitingCombat: this.awaitingCombat,
      discoveries: Object.freeze(
        this.discoveries.map((discovery) =>
          Object.freeze({
            ...discovery,
            position: Object.freeze({ ...discovery.position }),
          }),
        ),
      ),
      handling: this.handling,
      otherFleets: this.otherFleets,
    });
  }

  static restore(
    saved: SavedTurnSimulation,
    ids: ReadonlySet<string>,
    contains: (position: { readonly q: number; readonly r: number }) => boolean,
  ): TurnSimulation {
    if (
      !saved ||
      !Array.isArray(saved.remaining) ||
      !Array.isArray(saved.discoveries) ||
      typeof saved.awaitingCombat !== 'boolean' ||
      typeof saved.handling !== 'boolean' ||
      typeof saved.otherFleets !== 'boolean' ||
      !saved.awaitingCombat ||
      !saved.discoveries.length ||
      new Set(saved.remaining.map(([id]: readonly [string, number]) => id))
        .size !== saved.remaining.length ||
      saved.remaining.some(
        ([id, count]: readonly [string, number]) =>
          !ids.has(id) ||
          !Number.isSafeInteger(count) ||
          count < 0 ||
          count > 5,
      ) ||
      saved.discoveries.some(
        (discovery: Discovery) =>
          !['planet', 'star', 'pirate'].includes(discovery.kind) ||
          !discovery.id ||
          !discovery.name ||
          !contains(discovery.position) ||
          (discovery.fleetId !== null && !ids.has(discovery.fleetId)),
      )
    )
      throw new Error('Invalid interrupted year.');
    const simulation = new TurnSimulation(saved.remaining);
    simulation.awaitingCombat = saved.awaitingCombat;
    simulation.discoveries = structuredClone(saved.discoveries);
    simulation.handling = saved.handling;
    simulation.otherFleets = saved.otherFleets;
    return simulation;
  }
}

/** automatisk-hexutforskning / automatisk-stjarnutforskning: stable ties do not use hidden objects. */
export function nearestUnexplored(
  position: HexCoordinate,
  candidates: readonly HexCoordinate[],
  explored: ReadonlySet<string>,
): HexCoordinate | null {
  return (
    candidates
      .filter((candidate) => !explored.has(candidate.key))
      .sort(
        (a, b) =>
          position.distanceTo(a) - position.distanceTo(b) ||
          a.q - b.q ||
          a.r - b.r,
      )[0] ?? null
  );
}
