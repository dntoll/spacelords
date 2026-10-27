import type { HexCoordinate } from './HexCoordinate.js';
import type { BattleReport } from './Salvage.js';

export type ExplorationOrder = 'explore' | 'explore-stars';

export interface Discovery {
  readonly eventId?: string;
  readonly id: string;
  readonly kind: 'planet' | 'star' | 'pirate' | 'wreck';
  readonly name: string;
  readonly position: { readonly q: number; readonly r: number };
  readonly fleetId: string | null;
}

export interface SavedTurnSimulation {
  readonly presentedEventIds?: readonly string[];
  readonly activeEventId?: string;
  readonly battles?: readonly BattleReport[];
  readonly economyApplied?: boolean;
  readonly remaining: readonly (readonly [string, number])[];
  readonly awaitingCombat: boolean;
  readonly discoveries: readonly Discovery[];
  readonly handling: boolean;
  readonly otherFleets: boolean;
}

/** spara-avbrutet-ar: movement is spent once and survives order changes and reloads. */
export class TurnSimulation {
  readonly presentedEventIds = new Set<string>();
  activeEventId: string | undefined;
  battles: readonly BattleReport[] = [];
  economyApplied = false;
  readonly remaining: Map<string, number>;
  awaitingCombat = false;
  discoveries: readonly Discovery[] = [];
  handling = false;
  otherFleets = false;

  constructor(budgets: readonly (readonly [string, number])[]) {
    this.remaining = new Map(budgets.map(([id]) => [id, 60]));
  }

  movement(id: string, speed: number): number {
    return speed > 0
      ? Math.floor(((this.remaining.get(id) ?? 0) * speed) / 60 + 1e-9)
      : 0;
  }

  spend(id: string, speed = 1): void {
    const remaining = this.remaining.get(id) ?? 0;
    if (speed <= 0 || this.movement(id, speed) < 1)
      throw new Error('No movement remaining this year.');
    this.remaining.set(id, remaining - 60 / speed);
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
        this.discoveries.some(
          (discovery) =>
            discovery.fleetId === id &&
            (!this.activeEventId || discovery.eventId === this.activeEventId),
        ) ||
        this.battles.some(
          (battle) =>
            battle.fleetId === id &&
            (!this.activeEventId || battle.eventId === this.activeEventId),
        ))
    );
  }

  snapshot(): SavedTurnSimulation {
    return Object.freeze({
      presentedEventIds: Object.freeze([...this.presentedEventIds]),
      ...(this.activeEventId ? { activeEventId: this.activeEventId } : {}),
      battles: Object.freeze(
        this.battles.map((battle) =>
          Object.freeze({
            ...battle,
            position: Object.freeze({ ...battle.position }),
            wreckIds: Object.freeze([...battle.wreckIds]),
          }),
        ),
      ),
      economyApplied: this.economyApplied,
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
    legacy = false,
    speed: (id: string) => number = () => 1,
  ): TurnSimulation {
    if (
      !saved ||
      (saved.presentedEventIds !== undefined &&
        (!Array.isArray(saved.presentedEventIds) ||
          saved.presentedEventIds.some((id) => typeof id !== 'string'))) ||
      (saved.activeEventId !== undefined &&
        typeof saved.activeEventId !== 'string') ||
      !Array.isArray(saved.remaining) ||
      !Array.isArray(saved.discoveries) ||
      typeof saved.awaitingCombat !== 'boolean' ||
      typeof saved.handling !== 'boolean' ||
      typeof saved.otherFleets !== 'boolean' ||
      (!saved.awaitingCombat &&
        !saved.economyApplied &&
        !saved.battles?.length) ||
      (saved.economyApplied !== undefined &&
        typeof saved.economyApplied !== 'boolean') ||
      (!saved.discoveries.length &&
        !saved.handling &&
        !saved.battles?.length) ||
      (saved.battles !== undefined &&
        (!Array.isArray(saved.battles) ||
          saved.battles.some(
            (battle: BattleReport) =>
              (battle.eventId !== undefined &&
                typeof battle.eventId !== 'string') ||
              !contains(battle.position) ||
              !battle.title ||
              !battle.summary ||
              !Array.isArray(battle.wreckIds) ||
              (battle.fleetId !== null && !ids.has(battle.fleetId)),
          ))) ||
      new Set(saved.remaining.map(([id]: readonly [string, number]) => id))
        .size !== saved.remaining.length ||
      saved.remaining.some(
        ([id, count]: readonly [string, number]) =>
          !ids.has(id) ||
          !Number.isSafeInteger(count) ||
          count < 0 ||
          count > (legacy ? 5 : 60),
      ) ||
      saved.discoveries.some(
        (discovery: Discovery) =>
          (discovery.eventId !== undefined &&
            typeof discovery.eventId !== 'string') ||
          !['planet', 'star', 'pirate', 'wreck'].includes(discovery.kind) ||
          !discovery.id ||
          !discovery.name ||
          !contains(discovery.position) ||
          (discovery.fleetId !== null && !ids.has(discovery.fleetId)),
      )
    )
      throw new Error('Invalid interrupted year.');
    const simulation = new TurnSimulation(saved.remaining);
    for (const id of (saved.presentedEventIds ?? []) as readonly string[])
      simulation.presentedEventIds.add(id);
    simulation.activeEventId = saved.activeEventId;
    for (const [
      id,
      count,
    ] of saved.remaining as SavedTurnSimulation['remaining'])
      simulation.remaining.set(
        id,
        legacy ? (count * 60) / Math.max(1, speed(id)) : count,
      );
    simulation.battles = structuredClone(saved.battles ?? []);
    simulation.economyApplied = saved.economyApplied ?? false;
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
