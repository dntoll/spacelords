import {
  TacticalBattle,
  type BattleState,
} from '../../space-battle/models/index.js';
import {
  BoardingEngagement,
  type SavedBoardingEngagement,
} from '../../boarding/models/index.js';

export interface BattleReport {
  readonly fleetIds?: readonly string[];
  readonly eventId?: string;
  readonly position: { readonly q: number; readonly r: number };
  readonly fleetId: string | null;
  readonly title: string;
  readonly summary: string;
}

export interface Discovery {
  readonly eventId?: string;
  readonly id: string;
  readonly kind: 'planet' | 'planet-explored' | 'star' | 'pirate';
  readonly name: string;
  readonly position: { readonly q: number; readonly r: number };
  readonly fleetId: string | null;
}

export interface SavedTurnSimulation {
  readonly tacticalBattles?: readonly BattleState[];
  readonly previousPositions?: readonly (readonly [
    string,
    { readonly q: number; readonly r: number },
  ])[];
  readonly presentedEventIds?: readonly string[];
  readonly activeEventId?: string;
  readonly battles?: readonly BattleReport[];
  readonly economyApplied?: boolean;
  readonly remaining: readonly (readonly [string, number])[];
  readonly awaitingCombat: boolean;
  readonly discoveries: readonly Discovery[];
  readonly handling: boolean;
  readonly boarding?: SavedBoardingEngagement;
}

/** spara-avbrutet-ar: movement is spent once and survives order changes and reloads. */
export class TurnSimulation {
  tacticalBattles: TacticalBattle[] = [];
  readonly previousPositions = new Map<
    string,
    { readonly q: number; readonly r: number }
  >();
  readonly presentedEventIds = new Set<string>();
  activeEventId: string | undefined;
  battles: readonly BattleReport[] = [];
  economyApplied = false;
  readonly remaining: Map<string, number>;
  awaitingCombat = false;
  discoveries: readonly Discovery[] = [];
  handling = false;
  boarding: BoardingEngagement | null = null;

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
      throw new Error('No movement remaining this round.');
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
    this.previousPositions.delete(source);
  }

  permits(id: string): boolean {
    return (
      !this.tacticalBattles.length &&
      this.handling &&
      (this.discoveries.some(
        (discovery) =>
          discovery.fleetId === id &&
          (!this.activeEventId || discovery.eventId === this.activeEventId),
      ) ||
        this.battles.some(
          (battle) =>
            (battle.fleetId === id || battle.fleetIds?.includes(id)) &&
            (!this.activeEventId || battle.eventId === this.activeEventId),
        ))
    );
  }

  snapshot(): SavedTurnSimulation {
    return Object.freeze({
      tacticalBattles: Object.freeze(
        this.tacticalBattles.map((b) => b.snapshot),
      ),
      previousPositions: Object.freeze(
        [...this.previousPositions].map(([id, position]) =>
          Object.freeze([id, Object.freeze({ ...position })] as const),
        ),
      ),
      presentedEventIds: Object.freeze([...this.presentedEventIds]),
      ...(this.activeEventId ? { activeEventId: this.activeEventId } : {}),
      battles: Object.freeze(
        this.battles.map((battle) =>
          Object.freeze({
            ...battle,
            position: Object.freeze({ ...battle.position }),
            ...(battle.fleetIds
              ? { fleetIds: Object.freeze([...battle.fleetIds]) }
              : {}),
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
      ...(this.boarding ? { boarding: this.boarding.snapshot() } : {}),
    });
  }

  static restore(
    saved: SavedTurnSimulation,
    ids: ReadonlySet<string>,
    contains: (position: { readonly q: number; readonly r: number }) => boolean,
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
      (!saved.awaitingCombat &&
        !saved.economyApplied &&
        !saved.battles?.length) ||
      (saved.economyApplied !== undefined &&
        typeof saved.economyApplied !== 'boolean') ||
      (!saved.discoveries.length &&
        !saved.tacticalBattles?.length &&
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
              (battle.fleetId !== null && !ids.has(battle.fleetId)),
          ))) ||
      new Set(saved.remaining.map(([id]: readonly [string, number]) => id))
        .size !== saved.remaining.length ||
      saved.remaining.some(
        ([id, count]: readonly [string, number]) =>
          !ids.has(id) ||
          !Number.isSafeInteger(count) ||
          count < 0 ||
          count > 60,
      ) ||
      saved.discoveries.some(
        (discovery: Discovery) =>
          (discovery.eventId !== undefined &&
            typeof discovery.eventId !== 'string') ||
          !['planet', 'planet-explored', 'star', 'pirate'].includes(
            discovery.kind,
          ) ||
          !discovery.id ||
          !discovery.name ||
          !contains(discovery.position) ||
          (discovery.fleetId !== null && !ids.has(discovery.fleetId)),
      )
    )
      throw new Error('Invalid interrupted round.');
    const simulation = new TurnSimulation(saved.remaining);
    if (
      saved.tacticalBattles !== undefined &&
      (!Array.isArray(saved.tacticalBattles) ||
        (saved.tacticalBattles.length > 0 && !saved.awaitingCombat) ||
        saved.tacticalBattles.some(
          (b: BattleState) =>
            !contains(b.position) ||
            b.fleets.some(
              (f) =>
                !ids.has(f.id) || (f.retreat !== null && !contains(f.retreat)),
            ),
        ))
    )
      throw new Error('Invalid saved tactical encounters.');
    simulation.tacticalBattles = (saved.tacticalBattles ?? []).map(
      (b: BattleState) => TacticalBattle.restore(b),
    );
    if (
      saved.previousPositions !== undefined &&
      (!Array.isArray(saved.previousPositions) ||
        saved.previousPositions.some(
          ([id, p]: NonNullable<
            SavedTurnSimulation['previousPositions']
          >[number]) => !ids.has(id) || !contains(p),
        ))
    )
      throw new Error('Invalid previous fleet positions.');
    for (const [id, position] of (saved.previousPositions ?? []) as NonNullable<
      SavedTurnSimulation['previousPositions']
    >)
      simulation.previousPositions.set(id, { ...position });
    for (const id of (saved.presentedEventIds ?? []) as readonly string[])
      simulation.presentedEventIds.add(id);
    simulation.activeEventId = saved.activeEventId;
    for (const [
      id,
      count,
    ] of saved.remaining as SavedTurnSimulation['remaining'])
      simulation.remaining.set(id, count);
    simulation.battles = structuredClone(saved.battles ?? []);
    simulation.economyApplied = saved.economyApplied ?? false;
    simulation.awaitingCombat = saved.awaitingCombat;
    simulation.discoveries = structuredClone(saved.discoveries);
    simulation.handling = saved.handling;
    if (saved.boarding)
      simulation.boarding = BoardingEngagement.restore(saved.boarding);
    return simulation;
  }
}
