import {
  type BoardingFeatureDefinition,
  type BoardingFeatureKind,
  type BoardingCell,
  type BoardingMap,
} from './BoardingMap.js';
import {
  spreadBoardingSpawns,
  type ComposedBoarding,
} from './BoardingComposer.js';
import { chooseDefenderCommand } from './BoardingAI.js';
import type { CombatShipType } from './TacticalBattle.js';

export type BoardingSide = 'player' | 'defender' | 'civilian';
export type BoardingPersonStatus =
  'active' | 'incapacitated' | 'dead' | 'evacuated';
export type BoardingOutcome = 'victory' | 'defeat' | 'aborted';

export interface BoardingPerson {
  readonly id: string;
  readonly label: string;
  readonly side: BoardingSide;
  readonly position: BoardingCell;
  readonly facing: number;
  readonly hitPoints: number;
  readonly maxHitPoints: number;
  readonly agility: number;
  readonly equipmentApModifier: number;
  readonly initiativeModifier: number;
  readonly accuracy: number;
  readonly defense: number;
  readonly crouched: boolean;
  readonly overwatch: boolean;
  readonly status: BoardingPersonStatus;
  readonly medPacks: number;
  readonly fragGrenades: number;
  readonly smokeGrenades: number;
  readonly cockpit?: boolean;
}

export interface BoardingFeature {
  readonly id: string;
  readonly kind: BoardingFeatureKind;
  readonly position: BoardingCell;
  readonly hitPoints: number;
  readonly maxHitPoints: number;
  readonly open: boolean;
  readonly locked: boolean;
  readonly destroyed: boolean;
  readonly exit: 'breach' | 'escape-pod' | null;
}

export interface BoardingActivation {
  readonly id: string;
  readonly remaining: number;
}

export interface BoardingInitiative {
  readonly id: string;
  readonly die: number;
  readonly modifier: number;
  readonly total: number;
}

export interface BoardingSmoke {
  readonly position: BoardingCell;
  readonly amount: number;
}

export interface BoardingLastKnown {
  readonly id: string;
  readonly position: BoardingCell;
}

export interface BoardingNoise {
  readonly position: BoardingCell;
  readonly audience: 'player' | 'defender';
}

export interface BoardingBattleState {
  readonly id: string;
  readonly mapName: string;
  readonly width: number;
  readonly height: number;
  readonly round: number;
  readonly randomState: number;
  readonly phase: 'fighting' | 'complete';
  readonly outcome: BoardingOutcome | null;
  readonly people: readonly BoardingPerson[];
  readonly features: readonly BoardingFeature[];
  readonly initiative: readonly BoardingInitiative[];
  readonly initiativeOrder: readonly string[];
  readonly initiativeIndex: number;
  readonly currentActorId: string | null;
  readonly activation: BoardingActivation | null;
  readonly smoke: readonly BoardingSmoke[];
  readonly smokeCells: readonly BoardingCell[];
  readonly visibleCells: readonly BoardingCell[];
  readonly exploredCells: readonly BoardingCell[];
  readonly lastKnownEnemies: readonly BoardingLastKnown[];
  readonly defenderLastKnownEnemies: readonly BoardingLastKnown[];
  readonly noiseMarkers: readonly BoardingNoise[];
  readonly reactorCountdown: number | null;
  readonly savedCivilians: number;
  readonly postponed: readonly BoardingActivation[];
  readonly finishedActors: readonly string[];
  readonly log: readonly string[];
  readonly campaign?: {
    readonly playerZone: 'attacker' | 'defender';
    readonly enemyZone: 'attacker' | 'defender';
    readonly attackerType: CombatShipType;
    readonly defenderType: CombatShipType;
  };
}

export type BoardingCommand =
  | { readonly type: 'turn'; readonly direction: -1 | 1 }
  | { readonly type: 'move'; readonly to: BoardingCell }
  | { readonly type: 'crouch' | 'stand' }
  | {
      readonly type: 'door';
      readonly id: string;
      readonly action: 'open' | 'close';
    }
  | { readonly type: 'hack'; readonly id: string }
  | { readonly type: 'shoot' | 'melee'; readonly targetId: string }
  | {
      readonly type: 'grenade';
      readonly grenade: 'frag' | 'smoke';
      readonly at: BoardingCell;
    }
  | { readonly type: 'overwatch' }
  | { readonly type: 'med-pack'; readonly targetId: string }
  | { readonly type: 'evacuate' }
  | { readonly type: 'abort' }
  | { readonly type: 'select'; readonly id: string }
  | { readonly type: 'end-activation' };

export interface BoardingShot {
  readonly presentationIndex?: number;
  readonly from: BoardingCell;
  readonly to: BoardingCell;
  readonly hit: boolean;
}

export interface BoardingPath {
  readonly cost: number;
  readonly turns: number;
  readonly positions: readonly BoardingCell[];
  readonly finalFacing: number;
  readonly steps: readonly (
    | {
        readonly type: 'turn';
        readonly direction: -1 | 1;
        readonly cost: number;
      }
    | {
        readonly type: 'forward';
        readonly position: BoardingCell;
        readonly cost: number;
      }
  )[];
}

export interface BoardingTargetIndicator extends BoardingAttackPreview {
  readonly id: string;
  readonly affordable: boolean;
}

export interface BoardingAttackPreview {
  readonly chance: number;
  readonly defense: number;
  readonly reason: string | null;
}

const CARDINAL_DIRECTIONS: readonly BoardingCell[] = Object.freeze([
  Object.freeze({ q: 1, r: 0 }),
  Object.freeze({ q: 0, r: -1 }),
  Object.freeze({ q: -1, r: 0 }),
  Object.freeze({ q: 0, r: 1 }),
]);
const ADJACENT_DIRECTIONS: readonly BoardingCell[] = Object.freeze([
  ...CARDINAL_DIRECTIONS,
  Object.freeze({ q: 1, r: -1 }),
  Object.freeze({ q: -1, r: -1 }),
  Object.freeze({ q: -1, r: 1 }),
  Object.freeze({ q: 1, r: 1 }),
]);
export const BOARDING_RIFLE_AP = 4;
const RIFLE_AP = BOARDING_RIFLE_AP;
/** sikt-minne-och-ljudmarkorer: cosine of 90° from facing, a 180° cone. */
const BOARDING_VISION_COSINE = 0;
const GRENADE_AP = 4;
const MED_PACK_AP = 4;
const HACK_AP = 4;
const EVACUATE_AP = 2;
export const BOARDING_MELEE_AP = 3;
const MELEE_AP = BOARDING_MELEE_AP;
const REACTOR_ROUNDS = 3;

const positionKey = (position: BoardingCell): string =>
  `${position.q},${position.r}`;
const same = (a: BoardingCell, b: BoardingCell): boolean =>
  a.q === b.q && a.r === b.r;
const frozenCell = (position: BoardingCell): BoardingCell =>
  Object.freeze({ q: position.q, r: position.r });
const distance = (a: BoardingCell, b: BoardingCell): number =>
  Math.hypot(a.q - b.q, a.r - b.r);
const sharesEdge = (a: BoardingCell, b: BoardingCell): boolean =>
  Math.abs(a.q - b.q) + Math.abs(a.r - b.r) === 1;
// actionpoints-och-riktad-forflyttning: retain 0–3 for existing saved games.
const FACING_ORDER = [0, 4, 1, 5, 2, 6, 3, 7] as const;
const normalizeFacing = (facing: number): number => ((facing % 8) + 8) % 8;
const turnFacing = (facing: number, direction: -1 | 1): number =>
  FACING_ORDER[
    (FACING_ORDER.indexOf(
      normalizeFacing(facing) as (typeof FACING_ORDER)[number],
    ) +
      direction +
      8) %
      8
  ]!;
const forwardCost = (
  from: BoardingCell,
  to: BoardingCell,
  crouched: boolean,
): number => (crouched ? 3 : 2) + (from.q !== to.q && from.r !== to.r ? 1 : 0);

export function boardingActionPointsRemaining(
  state: BoardingBattleState,
  id: string,
): number {
  const person = state.people.find((entry) => entry.id === id);
  if (!person || person.status !== 'active') return 0;
  if (state.finishedActors.includes(id)) return 0;
  if (state.activation?.id === id) return state.activation.remaining;
  const postponed = state.postponed.find((entry) => entry.id === id);
  if (postponed) return postponed.remaining;
  return Math.max(1, person.agility + person.equipmentApModifier);
}

function hiddenDefenderActivity(command: BoardingCommand): string {
  if (command.type === 'turn') return 'A defender turns.';
  if (command.type === 'move') return 'A defender moves.';
  if (command.type === 'crouch' || command.type === 'stand')
    return 'A defender changes stance.';
  if (command.type === 'door' || command.type === 'hack')
    return 'A defender interacts with a door.';
  if (command.type === 'shoot') return 'A defender fires.';
  if (command.type === 'melee') return 'A defender attacks.';
  if (command.type === 'grenade') return 'A defender throws a grenade.';
  if (command.type === 'overwatch')
    return 'A defender takes a prepared position.';
  if (command.type === 'med-pack') return 'A defender uses equipment.';
  if (command.type === 'evacuate') return 'A defender evacuates.';
  if (command.type === 'abort') return 'A defender aborts the boarding.';
  return 'A defender finishes acting.';
}

function freezeState(state: BoardingBattleState): BoardingBattleState {
  const people = Object.freeze(
    state.people.map((person) =>
      Object.freeze({ ...person, position: frozenCell(person.position) }),
    ),
  );
  const features = Object.freeze(
    state.features.map((feature) =>
      Object.freeze({ ...feature, position: frozenCell(feature.position) }),
    ),
  );
  return Object.freeze({
    ...state,
    people,
    features,
    initiative: Object.freeze(
      state.initiative.map((entry) => Object.freeze({ ...entry })),
    ),
    initiativeOrder: Object.freeze([...state.initiativeOrder]),
    activation: state.activation
      ? Object.freeze({ ...state.activation })
      : null,
    smoke: Object.freeze(
      state.smoke.map((entry) =>
        Object.freeze({ ...entry, position: frozenCell(entry.position) }),
      ),
    ),
    smokeCells: Object.freeze(state.smokeCells.map(frozenCell)),
    visibleCells: Object.freeze(state.visibleCells.map(frozenCell)),
    exploredCells: Object.freeze(state.exploredCells.map(frozenCell)),
    lastKnownEnemies: Object.freeze(
      state.lastKnownEnemies.map((entry) =>
        Object.freeze({ ...entry, position: frozenCell(entry.position) }),
      ),
    ),
    defenderLastKnownEnemies: Object.freeze(
      state.defenderLastKnownEnemies.map((entry) =>
        Object.freeze({ ...entry, position: frozenCell(entry.position) }),
      ),
    ),
    noiseMarkers: Object.freeze(
      state.noiseMarkers.map((entry) =>
        Object.freeze({ ...entry, position: frozenCell(entry.position) }),
      ),
    ),
    postponed: Object.freeze(
      (state.postponed ?? []).map((entry) => Object.freeze({ ...entry })),
    ),
    finishedActors: Object.freeze([...(state.finishedActors ?? [])]),
    log: Object.freeze([...state.log]),
  });
}

function featureHitPoints(feature: BoardingFeatureDefinition): number {
  if (feature.kind === 'door') return 8;
  if (feature.kind === 'reactor') return 12;
  if (feature.kind === 'wall') return 10;
  if (feature.kind === 'cover') return 6;
  return 999;
}

function runtimeFeature(feature: BoardingFeatureDefinition): BoardingFeature {
  const hitPoints = featureHitPoints(feature);
  return Object.freeze({
    id: feature.id,
    kind: feature.kind,
    position: frozenCell(feature.position),
    hitPoints,
    maxHitPoints: hitPoints,
    open: feature.kind === 'exit',
    locked: feature.locked ?? false,
    destroyed: false,
    exit: feature.exit ?? null,
  });
}

function person(
  side: BoardingSide,
  index: number,
  position: BoardingCell,
  extras: { readonly cockpit?: boolean; readonly label?: string } = {},
): BoardingPerson {
  const label =
    side === 'player'
      ? `Boarder ${index + 1}`
      : side === 'defender'
        ? `Defender ${index + 1}`
        : `Civilian ${index + 1}`;
  return Object.freeze({
    id: `${side}-${index + 1}`,
    label,
    side,
    position: frozenCell(position),
    facing: side === 'defender' ? 2 : 0,
    hitPoints: side === 'civilian' ? 6 : 10,
    maxHitPoints: side === 'civilian' ? 6 : 10,
    agility: side === 'civilian' ? 8 : 12,
    equipmentApModifier: 0,
    initiativeModifier: side === 'player' ? 2 : side === 'defender' ? 1 : 0,
    accuracy: side === 'civilian' ? 0 : side === 'player' ? 4 : 3,
    defense: side === 'civilian' ? 10 : 11,
    crouched: false,
    overwatch: false,
    status: 'active',
    medPacks: side === 'civilian' ? 0 : 1,
    fragGrenades: side === 'player' ? 1 : 0,
    smokeGrenades: side === 'player' ? 1 : 0,
    ...(extras.cockpit ? { cockpit: true } : {}),
    ...(extras.label ? { label: extras.label } : {}),
  });
}

/** A deterministic, campaign-independent boarding encounter. */
export class BoardingBattle {
  readonly #map: BoardingMap;
  #state: BoardingBattleState;
  #presentation: BoardingBattleState[] = [];
  #shot: BoardingShot | null = null;

  private constructor(map: BoardingMap, state: BoardingBattleState) {
    this.#map = map;
    this.#state = freezeState(state);
  }

  static create(map: BoardingMap, seed = Date.now() >>> 0): BoardingBattle {
    const people = [
      ...map.spawns.player.map((position, index) =>
        person('player', index, position),
      ),
      ...map.spawns.defender.map((position, index) =>
        person('defender', index, position),
      ),
      ...map.spawns.civilian.map((position, index) =>
        person('civilian', index, position),
      ),
    ];
    const battle = new BoardingBattle(map, {
      id: `boarding-${seed}`,
      mapName: map.name,
      width: map.width,
      height: map.height,
      round: 0,
      randomState: seed || 1,
      phase: 'fighting',
      outcome: null,
      people,
      features: map.features.map(runtimeFeature),
      initiative: [],
      initiativeOrder: [],
      initiativeIndex: 0,
      currentActorId: null,
      activation: null,
      smoke: [],
      smokeCells: [],
      visibleCells: [],
      exploredCells: [],
      lastKnownEnemies: [],
      defenderLastKnownEnemies: [],
      noiseMarkers: [],
      reactorCountdown: null,
      savedCivilians: 0,
      postponed: [],
      finishedActors: [],
      log: [],
    });
    battle.#beginRound();
    battle.#refreshKnowledge();
    return battle;
  }

  static createCampaign(
    composed: ComposedBoarding,
    playerIsAttacker: boolean,
    seed = Date.now() >>> 0,
    attackerType: CombatShipType = 'Space pirate',
    defenderType: CombatShipType = 'Transport ship',
  ): BoardingBattle {
    const taken = new Set<string>();
    const occupy = (cell: BoardingCell | undefined): void => {
      if (cell) taken.add(`${cell.q},${cell.r}`);
    };
    const fill = (cells: readonly BoardingCell[], count: number) =>
      spreadBoardingSpawns(composed.map, cells, count, taken);
    const cockpitCells = playerIsAttacker
      ? composed.defenderCockpit
      : composed.attackerCockpit;
    if (!playerIsAttacker)
      for (const cell of composed.defenderCivilians) occupy(cell);
    const cockpit = fill(cockpitCells, cockpitCells.length ? 1 : 0)[0];
    const playerCells = playerIsAttacker
      ? fill(composed.defenderAirlock, 4)
      : fill(composed.defenderSpawns, 3);
    const enemyBoarders = playerIsAttacker
      ? fill(composed.defenderSpawns, 2)
      : fill(composed.defenderAirlock, 3);
    const people = [
      ...playerCells.map((position, index) =>
        person('player', index, position, {
          label: playerIsAttacker
            ? `Boarder ${index + 1}`
            : `Crew ${index + 1}`,
        }),
      ),
      ...enemyBoarders.map((position, index) =>
        person('defender', index, position),
      ),
      ...(cockpit
        ? [
            person('defender', enemyBoarders.length, cockpit, {
              cockpit: true,
              label: 'Cockpit',
            }),
          ]
        : []),
      ...(playerIsAttacker
        ? []
        : composed.defenderCivilians.map((position, index) =>
            person('civilian', index, position),
          )),
    ];
    const battle = new BoardingBattle(composed.map, {
      id: `boarding-${seed}`,
      mapName: composed.map.name,
      width: composed.map.width,
      height: composed.map.height,
      round: 0,
      randomState: seed || 1,
      phase: 'fighting',
      outcome: null,
      people,
      features: composed.map.features.map(runtimeFeature),
      initiative: [],
      initiativeOrder: [],
      initiativeIndex: 0,
      currentActorId: null,
      activation: null,
      smoke: [],
      smokeCells: [],
      visibleCells: [],
      exploredCells: [],
      lastKnownEnemies: [],
      defenderLastKnownEnemies: [],
      noiseMarkers: [],
      reactorCountdown: null,
      savedCivilians: 0,
      postponed: [],
      finishedActors: [],
      log: [],
      campaign: {
        playerZone: playerIsAttacker ? 'attacker' : 'defender',
        enemyZone: playerIsAttacker ? 'defender' : 'attacker',
        attackerType,
        defenderType,
      },
    });
    battle.#beginRound();
    battle.#refreshKnowledge();
    return battle;
  }

  static restore(map: BoardingMap, state: BoardingBattleState): BoardingBattle {
    if (state.mapName !== map.name) throw new Error('Boarding map mismatch.');
    return new BoardingBattle(map, state);
  }

  static forward(position: BoardingCell, facing: number): BoardingCell {
    const direction = ADJACENT_DIRECTIONS[normalizeFacing(facing)]!;
    return Object.freeze({
      q: position.q + direction.q,
      r: position.r + direction.r,
    });
  }

  get snapshot(): BoardingBattleState {
    return this.#state;
  }

  get presentation(): readonly BoardingBattleState[] {
    return this.#presentation;
  }

  get shot(): BoardingShot | null {
    return this.#shot;
  }

  canAbort(): boolean {
    const campaign = this.#state.campaign;
    if (!campaign) return false;
    const living = this.#state.people.filter(
      (entry) =>
        entry.side !== 'civilian' &&
        entry.status !== 'dead' &&
        entry.status !== 'evacuated',
    );
    if (!living.length) return false;
    return living.every((entry) => {
      const zone = this.#map.zoneAt(entry.position);
      return entry.side === 'player'
        ? zone === campaign.playerZone
        : zone === campaign.enemyZone;
    });
  }

  get visibleSnapshot(): BoardingBattleState {
    const visible = new Set(this.#state.visibleCells.map(positionKey));
    return freezeState({
      ...this.#state,
      people: this.#state.people.filter(
        (entry) =>
          entry.side === 'player' ||
          visible.has(positionKey(entry.position)) ||
          entry.status === 'evacuated',
      ),
    });
  }

  visibleOpponents(side: 'player' | 'defender'): readonly BoardingPerson[] {
    const visible = new Set(this.#visibleFor(side).map(positionKey));
    const opponent = side === 'player' ? 'defender' : 'player';
    return Object.freeze(
      this.#state.people.filter(
        (entry) =>
          entry.side === opponent &&
          entry.status !== 'dead' &&
          entry.status !== 'evacuated' &&
          visible.has(positionKey(entry.position)),
      ),
    );
  }

  #replace(change: Partial<BoardingBattleState>): void {
    this.#state = freezeState({ ...this.#state, ...change });
  }

  #nextRandom(): number {
    let state = this.#state.randomState || 1;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    this.#replace({ randomState: state });
    return state / 0x1_0000_0000;
  }

  #die(sides: number): number {
    return Math.floor(this.#nextRandom() * sides) + 1;
  }

  #beginRound(): void {
    if (this.#state.phase === 'complete') return;
    const candidates = this.#state.people.filter(
      (entry) => entry.side !== 'civilian' && entry.status === 'active',
    );
    const initiative = candidates.map((entry) => {
      const die = this.#die(20);
      return {
        id: entry.id,
        die,
        modifier: entry.initiativeModifier,
        total: die + entry.initiativeModifier,
      };
    });
    const tie = new Map<string, number>();
    for (const entry of initiative) {
      const group = `${entry.total}:${entry.modifier}`;
      if (
        initiative.filter(
          (other) => `${other.total}:${other.modifier}` === group,
        ).length > 1
      )
        tie.set(entry.id, this.#die(20));
    }
    initiative.sort(
      (a, b) =>
        b.total - a.total ||
        b.modifier - a.modifier ||
        (tie.get(b.id) ?? 0) - (tie.get(a.id) ?? 0) ||
        a.id.localeCompare(b.id),
    );
    const order = initiative.map((entry) => entry.id);
    const first = order[0] ?? null;
    const actor = this.#state.people.find((entry) => entry.id === first);
    const round = this.#state.round + 1;
    const text = initiative
      .map(
        (entry) =>
          `${this.#label(entry.id)} D20 [${entry.die}] + ${entry.modifier} = ${entry.total}`,
      )
      .join(', ');
    this.#replace({
      round,
      initiative,
      initiativeOrder: order,
      initiativeIndex: 0,
      currentActorId: first,
      activation:
        first && actor
          ? { id: first, remaining: this.#maxActionPoints(actor) }
          : null,
      people: this.#state.people.map((entry) => ({
        ...entry,
        overwatch: false,
      })),
      postponed: [],
      finishedActors: [],
      log: [...this.#state.log, `Initiative, round ${round}: ${text}.`],
    });
  }

  #maxActionPoints(entry: BoardingPerson): number {
    return Math.max(1, entry.agility + entry.equipmentApModifier);
  }

  #label(id: string): string {
    return (
      this.#state.people.find((entry) => entry.id === id)?.label ??
      this.#state.features.find((entry) => entry.id === id)?.kind ??
      id
    );
  }

  #actor(): BoardingPerson {
    const activation = this.#state.activation;
    const actor = this.#state.people.find(
      (entry) => entry.id === activation?.id && entry.status === 'active',
    );
    if (!actor || this.#state.phase !== 'fighting')
      throw new Error('No active boarding person.');
    return actor;
  }

  #spend(cost: number): BoardingPerson {
    const actor = this.#actor();
    const activation = this.#state.activation!;
    if (activation.remaining < cost)
      throw new Error(`The action needs ${cost} AP.`);
    this.#replace({
      activation: { ...activation, remaining: activation.remaining - cost },
    });
    return actor;
  }

  #updatePerson(
    id: string,
    update: (entry: BoardingPerson) => BoardingPerson,
  ): void {
    this.#replace({
      people: this.#state.people.map((entry) =>
        entry.id === id ? update(entry) : entry,
      ),
    });
  }

  #updateFeature(
    id: string,
    update: (entry: BoardingFeature) => BoardingFeature,
  ): void {
    this.#replace({
      features: this.#state.features.map((entry) =>
        entry.id === id ? update(entry) : entry,
      ),
    });
  }

  #featureAt(position: BoardingCell): BoardingFeature | undefined {
    return this.#state.features.find(
      (entry) => !entry.destroyed && same(entry.position, position),
    );
  }

  #personAt(
    position: BoardingCell,
    ignoreId?: string,
  ): BoardingPerson | undefined {
    return this.#state.people.find(
      (entry) =>
        entry.id !== ignoreId &&
        // doda-blockerar-inte-skott-eller-rorelse: only standing people occupy a tile.
        entry.status === 'active' &&
        same(entry.position, position),
    );
  }

  #passable(position: BoardingCell, moverId: string): boolean {
    if (this.#map.terrainAt(position) !== 'floor') return false;
    const feature = this.#featureAt(position);
    if (
      feature &&
      (feature.kind === 'wall' ||
        feature.kind === 'hull' ||
        feature.kind === 'reactor' ||
        feature.kind === 'cover' ||
        (feature.kind === 'door' && !feature.open))
    )
      return false;
    return !this.#personAt(position, moverId);
  }

  pathTo(id: string, destination: BoardingCell): BoardingPath | null {
    const entry = this.#state.people.find(
      (candidate) => candidate.id === id && candidate.status === 'active',
    );
    if (!entry || this.#map.terrainAt(destination) !== 'floor') return null;
    type Node = {
      position: BoardingCell;
      facing: number;
      cost: number;
      turns: number;
      steps: BoardingPath['steps'];
      positions: readonly BoardingCell[];
    };
    const start: Node = {
      position: entry.position,
      facing: entry.facing,
      cost: 0,
      turns: 0,
      steps: [],
      positions: [],
    };
    const queue: Node[] = [start];
    const best = new Map<string, number>([
      [`${positionKey(start.position)}:${start.facing}`, 0],
    ]);
    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift()!;
      if (same(current.position, destination))
        return Object.freeze({
          cost: current.cost,
          turns: current.turns,
          positions: Object.freeze([...current.positions]),
          finalFacing: current.facing,
          steps: Object.freeze([...current.steps]),
        });
      for (const direction of [-1, 1] as const) {
        const facing = turnFacing(current.facing, direction);
        const next: Node = {
          ...current,
          facing,
          cost: current.cost + 1,
          turns: current.turns + 1,
          steps: [...current.steps, { type: 'turn', direction, cost: 1 }],
        };
        const nodeKey = `${positionKey(next.position)}:${facing}`;
        if ((best.get(nodeKey) ?? Infinity) > next.cost) {
          best.set(nodeKey, next.cost);
          queue.push(next);
        }
      }
      const forward = BoardingBattle.forward(current.position, current.facing);
      const diagonal =
        forward.q !== current.position.q && forward.r !== current.position.r;
      const clearCorner =
        !diagonal ||
        (this.#passable({ q: forward.q, r: current.position.r }, id) &&
          this.#passable({ q: current.position.q, r: forward.r }, id));
      if (clearCorner && this.#passable(forward, id)) {
        const moveCost = forwardCost(current.position, forward, entry.crouched);
        const next: Node = {
          ...current,
          position: forward,
          cost: current.cost + moveCost,
          steps: [
            ...current.steps,
            { type: 'forward', position: forward, cost: moveCost },
          ],
          positions: [...current.positions, forward],
        };
        const nodeKey = `${positionKey(forward)}:${next.facing}`;
        if ((best.get(nodeKey) ?? Infinity) > next.cost) {
          best.set(nodeKey, next.cost);
          queue.push(next);
        }
      }
    }
    return null;
  }

  #line(a: BoardingCell, b: BoardingCell): readonly BoardingCell[] {
    const steps = Math.max(Math.abs(b.q - a.q), Math.abs(b.r - a.r));
    if (steps === 0) return Object.freeze([frozenCell(a)]);
    const result: BoardingCell[] = [];
    for (let index = 0; index <= steps; index++) {
      const t = index / steps;
      const position = frozenCell({
        q: Math.round(a.q + (b.q - a.q) * t),
        r: Math.round(a.r + (b.r - a.r) * t),
      });
      if (!result.some((entry) => same(entry, position))) result.push(position);
    }
    return Object.freeze(result);
  }

  #inFieldOfView(observer: BoardingPerson, target: BoardingCell): boolean {
    if (same(observer.position, target)) return true;
    const forward = BoardingBattle.forward(observer.position, observer.facing);
    const ax = forward.q - observer.position.q;
    const ay = forward.r - observer.position.r;
    const bx = target.q - observer.position.q;
    const by = target.r - observer.position.r;
    const denominator = Math.hypot(ax, ay) * Math.hypot(bx, by);
    return (
      denominator > 0 &&
      (ax * bx + ay * by) / denominator >= BOARDING_VISION_COSINE - 1e-9
    );
  }

  #blocksVision(position: BoardingCell): boolean {
    const feature = this.#featureAt(position);
    if (
      feature &&
      (feature.kind === 'wall' ||
        feature.kind === 'hull' ||
        (feature.kind === 'door' && !feature.open))
    )
      return true;
    return this.#state.smoke.some(
      (entry) => entry.amount > 0 && same(entry.position, position),
    );
  }

  #blocksFire(
    position: BoardingCell,
    ignoreIds: readonly string[] = [],
  ): boolean {
    if (this.#blocksVision(position)) return true;
    return this.#state.people.some(
      (entry) =>
        !ignoreIds.includes(entry.id) &&
        entry.status === 'active' &&
        same(entry.position, position),
    );
  }

  #lineClear(
    observer: BoardingPerson,
    target: BoardingCell,
    blocked: (position: BoardingCell) => boolean,
  ): boolean {
    if (
      observer.status !== 'active' ||
      distance(observer.position, target) > 8 ||
      !this.#inFieldOfView(observer, target)
    )
      return false;
    return !this.#line(observer.position, target).slice(1, -1).some(blocked);
  }

  #canSee(observer: BoardingPerson, target: BoardingCell): boolean {
    return this.#lineClear(observer, target, (position) =>
      this.#blocksVision(position),
    );
  }

  #canFire(observer: BoardingPerson, target: BoardingCell): boolean {
    return this.#lineClear(observer, target, (position) =>
      this.#blocksFire(position, [observer.id]),
    );
  }

  #observerCells(
    observer: BoardingPerson,
    reachable: (position: BoardingCell) => boolean,
  ): readonly BoardingCell[] {
    if (observer.status !== 'active') return Object.freeze([]);
    const result: BoardingCell[] = [];
    for (let r = 0; r < this.#map.height; r++) {
      for (let q = 0; q < this.#map.width; q++) {
        const position = { q, r };
        if (same(observer.position, position)) continue;
        if (reachable(position)) result.push(frozenCell(position));
      }
    }
    return Object.freeze(result);
  }

  /** personer-blockerar-inte-sikt / sikt-och-eld-fran-vald-soldat */
  sightFrom(id: string): readonly BoardingCell[] {
    const observer = this.#state.people.find((entry) => entry.id === id);
    if (!observer) return Object.freeze([]);
    return this.#observerCells(observer, (position) =>
      this.#canSee(observer, position),
    );
  }

  /** sikt-och-eld-fran-vald-soldat: tiles a rifle shot could reach. */
  fireFrom(id: string): readonly BoardingCell[] {
    const observer = this.#state.people.find((entry) => entry.id === id);
    if (!observer) return Object.freeze([]);
    return this.#observerCells(observer, (position) =>
      this.#canFire(observer, position),
    );
  }

  /** hp-och-ap-ovanfor-soldater */
  actionPointsRemaining(id: string): number {
    return boardingActionPointsRemaining(this.#state, id);
  }

  #visibleFor(side: 'player' | 'defender'): readonly BoardingCell[] {
    const result = new Map<string, BoardingCell>();
    for (const observer of this.#state.people.filter(
      (entry) => entry.side === side && entry.status === 'active',
    )) {
      for (let r = 0; r < this.#map.height; r++) {
        for (let q = 0; q < this.#map.width; q++) {
          const position = { q, r };
          if (this.#canSee(observer, position))
            result.set(positionKey(position), frozenCell(position));
        }
      }
    }
    return Object.freeze([...result.values()]);
  }

  #refreshKnowledge(): void {
    const visible = this.#visibleFor('player');
    const defenderVisible = this.#visibleFor('defender');
    const visibleKeys = new Set(visible.map(positionKey));
    const defenderVisibleKeys = new Set(defenderVisible.map(positionKey));
    const explored = new Map(
      this.#state.exploredCells.map((position) => [
        positionKey(position),
        position,
      ]),
    );
    for (const position of visible)
      explored.set(positionKey(position), position);
    const lastKnown = new Map(
      this.#state.lastKnownEnemies.map((entry) => [entry.id, entry]),
    );
    for (const enemy of this.#state.people.filter(
      (entry) =>
        entry.side === 'defender' &&
        entry.status !== 'dead' &&
        entry.status !== 'evacuated' &&
        visibleKeys.has(positionKey(entry.position)),
    ))
      lastKnown.set(enemy.id, { id: enemy.id, position: enemy.position });
    const defenderLastKnown = new Map(
      this.#state.defenderLastKnownEnemies.map((entry) => [entry.id, entry]),
    );
    for (const enemy of this.#state.people.filter(
      (entry) =>
        entry.side === 'player' &&
        entry.status !== 'dead' &&
        entry.status !== 'evacuated' &&
        defenderVisibleKeys.has(positionKey(entry.position)),
    ))
      defenderLastKnown.set(enemy.id, {
        id: enemy.id,
        position: enemy.position,
      });
    this.#replace({
      visibleCells: visible,
      exploredCells: [...explored.values()],
      lastKnownEnemies: [...lastKnown.values()],
      defenderLastKnownEnemies: [...defenderLastKnown.values()],
      smokeCells: this.#state.smoke
        .filter((entry) => entry.amount > 0)
        .map((entry) => entry.position),
    });
  }

  #target(id: string): BoardingPerson | BoardingFeature | null {
    return (
      this.#state.people.find((entry) => entry.id === id) ??
      this.#state.features.find((entry) => entry.id === id) ??
      null
    );
  }

  #targetPosition(target: BoardingPerson | BoardingFeature): BoardingCell {
    return target.position;
  }

  #coverBetween(source: BoardingCell, target: BoardingCell): boolean {
    const dx = target.q - source.q;
    const dy = target.r - source.r;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return false;
    return this.#state.features.some((feature) => {
      if (
        feature.kind !== 'cover' ||
        feature.destroyed ||
        Math.max(
          Math.abs(feature.position.q - target.q),
          Math.abs(feature.position.r - target.r),
        ) > 1
      )
        return false;
      const fromSource = {
        q: feature.position.q - source.q,
        r: feature.position.r - source.r,
      };
      const t = (fromSource.q * dx + fromSource.r * dy) / lengthSquared;
      if (t <= 0 || t >= 1) return false;
      const closest = {
        q: source.q + dx * t,
        r: source.r + dy * t,
      };
      return (
        Math.hypot(
          feature.position.q - closest.q,
          feature.position.r - closest.r,
        ) <= 0.75
      );
    });
  }

  #targetDefense(
    target: BoardingPerson | BoardingFeature,
    source?: BoardingCell,
    ranged = false,
  ): number {
    if ('side' in target) {
      let result = target.defense;
      const smoked = this.#state.smoke.some(
        (entry) => entry.amount > 0 && same(entry.position, target.position),
      );
      if (smoked) result += 2;
      const hasCover = source && this.#coverBetween(source, target.position);
      if (hasCover) result += target.crouched ? 5 : 2;
      else if (ranged && target.crouched) result += 2;
      return result;
    }
    return target.kind === 'reactor' ? 8 : target.kind === 'door' ? 10 : 12;
  }

  /** skott-kraver-giltigt-mal: rifle fire needs an enemy or feature, never self or allies. */
  attackPreview(sourceId: string, targetId: string): BoardingAttackPreview {
    const source = this.#state.people.find(
      (entry) => entry.id === sourceId && entry.status === 'active',
    );
    const target = this.#target(targetId);
    let reason: string | null = null;
    if (!source || !target) reason = 'Choose an active attacker and target.';
    else if ('side' in target && target.side === source.side)
      reason = 'Choose an enemy.';
    else if ('side' in target && target.side === 'civilian')
      reason = 'Civilists cannot be targeted directly.';
    else if (
      ('status' in target &&
        (target.status === 'dead' || target.status === 'evacuated')) ||
      ('destroyed' in target && target.destroyed)
    )
      reason = 'The target is no longer active.';
    else if (distance(source.position, this.#targetPosition(target)) > 8)
      reason = 'The target is outside rifle range.';
    else if (!this.#inFieldOfView(source, this.#targetPosition(target)))
      reason = 'The target is outside the 180° field of fire.';
    else {
      const line = this.#line(source.position, this.#targetPosition(target));
      if (
        line
          .slice(1, -1)
          .some((position) =>
            this.#blocksFire(position, [
              source.id,
              'side' in target ? target.id : '',
            ]),
          )
      )
        reason = 'The shot is blocked.';
    }
    const defense = target
      ? this.#targetDefense(target, source?.position, true)
      : 99;
    const needed = defense - (source?.accuracy ?? 0);
    const chance = reason
      ? 0
      : Math.max(5, Math.min(95, (21 - Math.max(2, needed)) * 5));
    return Object.freeze({ chance, defense, reason });
  }

  /** traffchans-vid-synliga-fiender: do not expose allies' sight or remembered enemies. */
  targetIndicators(sourceId: string): readonly BoardingTargetIndicator[] {
    const source = this.#state.people.find(
      (person) => person.id === sourceId && person.status === 'active',
    );
    if (!source) return Object.freeze([]);
    return Object.freeze(
      this.#state.people
        .filter(
          (person) =>
            person.side !== source.side &&
            person.side !== 'civilian' &&
            person.status !== 'dead' &&
            person.status !== 'evacuated' &&
            this.#canSee(source, person.position),
        )
        .map((person) =>
          Object.freeze({
            id: person.id,
            ...this.attackPreview(sourceId, person.id),
            affordable:
              boardingActionPointsRemaining(this.#state, sourceId) >= RIFLE_AP,
          }),
        ),
    );
  }

  /** melee-kraver-valt-mal: adjacency only; facing does not block a melee strike. */
  meleePreview(sourceId: string, targetId: string): BoardingAttackPreview {
    const source = this.#state.people.find(
      (entry) => entry.id === sourceId && entry.status === 'active',
    );
    const target = this.#target(targetId);
    let reason: string | null = null;
    if (!source || !target) reason = 'Choose an active attacker and target.';
    else if (!('side' in target)) reason = 'Melee requires an adjacent person.';
    else if (target.side === source.side) reason = 'Choose an enemy.';
    else if (target.side === 'civilian')
      reason = 'Civilists cannot be targeted directly.';
    else if (target.status === 'dead' || target.status === 'evacuated')
      reason = 'The target is no longer active.';
    else if (!sharesEdge(source.position, target.position))
      reason = 'Melee requires an adjacent target.';
    const person = target && 'side' in target ? target : null;
    const defense = person ? this.#targetDefense(person, source?.position) : 99;
    return Object.freeze({
      chance: reason ? 0 : 75,
      defense,
      reason,
    });
  }

  #addNoise(position: BoardingCell, actorSide: BoardingSide): void {
    const audience =
      actorSide === 'defender' ? 'player' : ('defender' as const);
    const existing = this.#state.noiseMarkers.some(
      (entry) => entry.audience === audience && same(entry.position, position),
    );
    if (!existing)
      this.#replace({
        noiseMarkers: [
          ...this.#state.noiseMarkers,
          { position: frozenCell(position), audience },
        ],
      });
  }

  #rollDamage(die: number, count: number, modifier: number): number {
    let total = modifier;
    for (let index = 0; index < count; index++) total += this.#die(die);
    return total;
  }

  #damagePerson(id: string, amount: number): void {
    this.#updatePerson(id, (entry) => {
      if (entry.status === 'incapacitated')
        return { ...entry, status: 'dead', hitPoints: 0 };
      if (entry.status !== 'active') return entry;
      const hitPoints = Math.max(0, entry.hitPoints - amount);
      return {
        ...entry,
        hitPoints,
        status: hitPoints === 0 ? 'incapacitated' : 'active',
        overwatch: hitPoints === 0 ? false : entry.overwatch,
      };
    });
  }

  #damageFeature(id: string, amount: number): void {
    this.#updateFeature(id, (entry) => {
      if (entry.destroyed || entry.kind === 'hull' || entry.kind === 'exit')
        return entry;
      const hitPoints = Math.max(0, entry.hitPoints - amount);
      const destroyed = hitPoints === 0;
      return {
        ...entry,
        hitPoints,
        destroyed,
        open:
          destroyed && (entry.kind === 'door' || entry.kind === 'wall')
            ? true
            : entry.open,
      };
    });
  }

  #attack(
    sourceId: string,
    targetId: string,
    kind: 'Rifle' | 'Overwatch' | 'Melee',
  ): void {
    const source = this.#state.people.find((entry) => entry.id === sourceId)!;
    const target = this.#target(targetId);
    if (!target) throw new Error('Choose a target.');
    const preview =
      kind === 'Melee'
        ? this.meleePreview(sourceId, targetId)
        : this.attackPreview(sourceId, targetId);
    if (preview.reason) throw new Error(preview.reason);
    const die = this.#die(20);
    const total = die + source.accuracy;
    const hit = die === 20 || (die !== 1 && total >= preview.defense);
    const critical = die === 20;
    const damage = hit
      ? this.#rollDamage(kind === 'Melee' ? 6 : 8, critical ? 2 : 1, 2)
      : 0;
    if (hit) {
      if ('side' in target) this.#damagePerson(target.id, damage);
      else this.#damageFeature(target.id, damage);
    }
    this.#addNoise(source.position, source.side);
    if (kind !== 'Melee')
      this.#shot = Object.freeze({
        from: frozenCell(source.position),
        to: frozenCell(this.#targetPosition(target)),
        presentationIndex: this.#presentation.length,
        hit,
      });
    this.#replace({
      log: [
        ...this.#state.log,
        `${kind} by ${source.label} at ${this.#label(targetId)}: D20 [${die}] + ${source.accuracy} = ${total} vs ${preview.defense}; ${hit ? `${critical ? 'critical, ' : ''}${damage} damage` : 'miss'}.`,
      ],
    });
    this.synchronize();
  }

  #triggerOverwatch(mover: BoardingPerson): void {
    for (const watcher of this.#state.people) {
      if (
        watcher.side === mover.side ||
        watcher.side === 'civilian' ||
        mover.side === 'civilian' ||
        watcher.status !== 'active' ||
        !watcher.overwatch ||
        !this.#canSee(watcher, mover.position) ||
        this.attackPreview(watcher.id, mover.id).reason
      )
        continue;
      this.#updatePerson(watcher.id, (entry) => ({
        ...entry,
        overwatch: false,
      }));
      this.#attack(watcher.id, mover.id, 'Overwatch');
      break;
    }
  }

  #hostileIdsInSight(side: 'player' | 'defender'): ReadonlySet<string> {
    return new Set(
      this.visibleOpponents(side)
        .filter((entry) => entry.status === 'active')
        .map((entry) => entry.id),
    );
  }

  #move(destination: BoardingCell): void {
    const actor = this.#actor();
    const path = this.pathTo(actor.id, destination);
    if (!path) throw new Error('No route to that tile.');
    if (path.cost > this.#state.activation!.remaining)
      throw new Error('The route needs more AP.');
    const knownHostiles =
      actor.side === 'civilian'
        ? new Set<string>()
        : this.#hostileIdsInSight(actor.side);
    for (const step of path.steps) {
      const current = this.#state.people.find(
        (entry) => entry.id === actor.id,
      )!;
      if (current.status !== 'active') break;
      if (step.type === 'turn') {
        this.#spend(1);
        this.#updatePerson(actor.id, (entry) => ({
          ...entry,
          facing: turnFacing(entry.facing, step.direction),
        }));
        this.#refreshKnowledge();
        this.#recordPresentation(actor.id);
      } else {
        const cost = step.cost;
        this.#spend(cost);
        this.#updatePerson(actor.id, (entry) => ({
          ...entry,
          position: frozenCell(step.position),
        }));
        this.#refreshKnowledge();
        const moved = this.#state.people.find(
          (entry) => entry.id === actor.id,
        )!;
        this.#recordPresentation(actor.id);
        const previousShot = this.#shot;
        this.#triggerOverwatch(moved);
        if (this.#shot !== previousShot) this.#recordPresentation(actor.id);
      }
      if (actor.side === 'civilian') continue;
      const spotted = [...this.#hostileIdsInSight(actor.side)].some(
        (id) => !knownHostiles.has(id),
      );
      if (!spotted) continue;
      if (actor.side === 'player')
        this.#replace({
          log: [
            ...this.#state.log,
            `${actor.label} spots a new enemy and stops.`,
          ],
        });
      break;
    }
  }

  #recordPresentation(actorId: string): void {
    const frame = this.visibleSnapshot;
    const shown = frame.people.some((entry) => entry.id === actorId);
    const wasShown = this.#presentation
      .at(-1)
      ?.people.some((entry) => entry.id === actorId);
    if (shown || wasShown) this.#presentation.push(frame);
  }

  #door(id: string, action: 'open' | 'close'): void {
    const actor = this.#actor();
    const door = this.#state.features.find(
      (entry) => entry.id === id && entry.kind === 'door' && !entry.destroyed,
    );
    if (!door || !sharesEdge(actor.position, door.position))
      throw new Error('Choose an adjacent door.');
    if (action === 'open' && door.locked)
      throw new Error('The door is locked.');
    if (action === 'close' && this.#personAt(door.position))
      throw new Error('The doorway is occupied.');
    this.#spend(1);
    this.#updateFeature(id, (entry) => ({ ...entry, open: action === 'open' }));
  }

  #hack(id: string): void {
    const actor = this.#spend(HACK_AP);
    const door = this.#state.features.find(
      (entry) => entry.id === id && entry.kind === 'door' && !entry.destroyed,
    );
    if (!door || !sharesEdge(actor.position, door.position) || !door.locked)
      throw new Error('Choose an adjacent locked door.');
    const die = this.#die(20);
    const success = die + 2 >= 12;
    if (success)
      this.#updateFeature(id, (entry) => ({
        ...entry,
        locked: false,
        open: true,
      }));
    this.#replace({
      log: [
        ...this.#state.log,
        `${actor.label} hacks Door: D20 [${die}] + 2 ${success ? 'succeeds' : 'fails'}.`,
      ],
    });
  }

  #grenade(grenade: 'frag' | 'smoke', target: BoardingCell): void {
    const actor = this.#spend(GRENADE_AP);
    if (distance(actor.position, target) > 6)
      throw new Error('The target tile is outside throwing range.');
    const die = this.#die(20);
    const difficulty = 8 + Math.ceil(distance(actor.position, target));
    let impact = frozenCell(target);
    if (die + actor.accuracy < difficulty) {
      const margin = difficulty - (die + actor.accuracy);
      const deviation = Math.min(3, Math.max(1, Math.ceil(margin / 5)));
      const direction = ADJACENT_DIRECTIONS[this.#die(8) - 1]!;
      for (let index = 0; index < deviation; index++)
        impact = frozenCell({
          q: impact.q + direction.q,
          r: impact.r + direction.r,
        });
      if (!this.#map.contains(impact)) impact = frozenCell(target);
    }
    this.#addNoise(impact, actor.side);
    if (grenade === 'smoke') {
      const amounts = new Map(
        this.#state.smoke.map((entry) => [positionKey(entry.position), entry]),
      );
      const add = (position: BoardingCell, amount: number) => {
        if (!this.#map.contains(position)) return;
        const old = amounts.get(positionKey(position));
        amounts.set(positionKey(position), {
          position: frozenCell(position),
          amount: (old?.amount ?? 0) + amount,
        });
      };
      add(impact, 4);
      for (const direction of ADJACENT_DIRECTIONS)
        add({ q: impact.q + direction.q, r: impact.r + direction.r }, 2);
      this.#replace({ smoke: [...amounts.values()] });
    } else {
      const area = [
        impact,
        ...ADJACENT_DIRECTIONS.map((direction) => ({
          q: impact.q + direction.q,
          r: impact.r + direction.r,
        })),
      ];
      for (const position of area) {
        const line = this.#line(impact, position);
        if (line.slice(1, -1).some((entry) => this.#blocksVision(entry)))
          continue;
        const damage = this.#rollDamage(6, 2, 0);
        for (const victim of this.#state.people.filter(
          (entry) =>
            entry.status !== 'dead' &&
            entry.status !== 'evacuated' &&
            same(entry.position, position),
        ))
          this.#damagePerson(victim.id, damage);
        for (const feature of this.#state.features.filter(
          (entry) => !entry.destroyed && same(entry.position, position),
        ))
          this.#damageFeature(feature.id, damage);
      }
    }
    this.#updatePerson(actor.id, (entry) => ({
      ...entry,
      fragGrenades:
        grenade === 'frag'
          ? Math.max(0, entry.fragGrenades - 1)
          : entry.fragGrenades,
      smokeGrenades:
        grenade === 'smoke'
          ? Math.max(0, entry.smokeGrenades - 1)
          : entry.smokeGrenades,
    }));
    this.#replace({
      log: [
        ...this.#state.log,
        `${actor.label} throws a ${grenade} grenade: D20 [${die}], impact ${impact.q},${impact.r}.`,
      ],
    });
    this.synchronize();
  }

  #medPack(targetId: string): void {
    const actor = this.#actor();
    const target = this.#state.people.find((entry) => entry.id === targetId);
    if (
      !target ||
      target.status !== 'incapacitated' ||
      !sharesEdge(actor.position, target.position)
    )
      throw new Error('Choose an adjacent incapacitated person.');
    if (actor.medPacks < 1) throw new Error('No Med-pack remains.');
    this.#spend(MED_PACK_AP);
    this.#updatePerson(actor.id, (entry) => ({
      ...entry,
      medPacks: entry.medPacks - 1,
    }));
    this.#updatePerson(targetId, (entry) => ({
      ...entry,
      status: 'active',
      hitPoints: Math.max(1, Math.ceil(entry.maxHitPoints / 3)),
    }));
  }

  #evacuate(): void {
    const actor = this.#actor();
    const exit = this.#state.features.find(
      (entry) =>
        entry.kind === 'exit' &&
        !entry.destroyed &&
        same(entry.position, actor.position),
    );
    if (!exit) throw new Error('Stand on an evacuation point.');
    this.#spend(EVACUATE_AP);
    this.#updatePerson(actor.id, (entry) => ({
      ...entry,
      status: 'evacuated',
      overwatch: false,
    }));
    if (actor.side === 'civilian')
      this.#replace({ savedCivilians: this.#state.savedCivilians + 1 });
    this.#finishActivation();
  }

  command(command: BoardingCommand): void {
    this.#presentation = [];
    this.#shot = null;
    if (command.type === 'abort') {
      if (!this.canAbort())
        throw new Error('Both sides must be in their own ships to abort.');
      this.#complete('aborted', 'Boarding aborted. The ships undock.');
      return;
    }
    const actor = this.#actor();
    if (command.type === 'turn') {
      this.#spend(1);
      this.#updatePerson(actor.id, (entry) => ({
        ...entry,
        facing: turnFacing(entry.facing, command.direction),
      }));
    } else if (command.type === 'move') this.#move(command.to);
    else if (command.type === 'crouch' || command.type === 'stand') {
      const crouched = command.type === 'crouch';
      if (actor.crouched === crouched)
        throw new Error(
          `The person is already ${crouched ? 'crouched' : 'standing'}.`,
        );
      this.#spend(1);
      this.#updatePerson(actor.id, (entry) => ({ ...entry, crouched }));
    } else if (command.type === 'door') this.#door(command.id, command.action);
    else if (command.type === 'hack') this.#hack(command.id);
    else if (command.type === 'shoot') {
      const preview = this.attackPreview(actor.id, command.targetId);
      if (preview.reason) throw new Error(preview.reason);
      this.#spend(RIFLE_AP);
      this.#attack(actor.id, command.targetId, 'Rifle');
    } else if (command.type === 'melee') {
      const preview = this.meleePreview(actor.id, command.targetId);
      if (preview.reason) throw new Error(preview.reason);
      this.#spend(MELEE_AP);
      this.#attack(actor.id, command.targetId, 'Melee');
    } else if (command.type === 'grenade')
      this.#grenade(command.grenade, command.at);
    else if (command.type === 'overwatch') {
      this.#spend(RIFLE_AP);
      this.#updatePerson(actor.id, (entry) => ({
        ...entry,
        overwatch: true,
      }));
      this.#finishActivation();
    } else if (command.type === 'med-pack') this.#medPack(command.targetId);
    else if (command.type === 'evacuate') this.#evacuate();
    else if (command.type === 'select') this.#select(command.id);
    else this.#finishActivation();
    this.#refreshKnowledge();
    this.synchronize();
    // automatisk-bordningstur-vid-tom-ap: finish only after the whole action resolves.
    if (
      this.#state.phase === 'fighting' &&
      this.#state.currentActorId === actor.id &&
      (this.#state.activation?.remaining === 0 ||
        this.#state.people.find((person) => person.id === actor.id)?.status !==
          'active')
    )
      this.#finishActivation();
  }

  #select(id: string): void {
    const actor = this.#actor();
    if (actor.side !== 'player') throw new Error('Wait for your soldiers.');
    const target = this.#state.people.find((entry) => entry.id === id);
    if (!target || target.side !== 'player' || target.status !== 'active')
      throw new Error('Choose one of your soldiers.');
    if (target.id === actor.id) return;
    if (boardingActionPointsRemaining(this.#state, id) <= 0)
      throw new Error('That soldier has no AP remaining.');
    const postponed = [
      ...this.#state.postponed.filter(
        (entry) => entry.id !== actor.id && entry.id !== id,
      ),
      { id: actor.id, remaining: this.#state.activation!.remaining },
    ];
    const saved = this.#state.postponed.find((entry) => entry.id === id);
    this.#replace({
      postponed,
      currentActorId: id,
      activation: {
        id,
        remaining: saved?.remaining ?? this.#maxActionPoints(target),
      },
      log: [...this.#state.log, `${actor.label} waits. ${target.label} acts.`],
    });
  }

  #available(id: string | null, finished: readonly string[]): boolean {
    if (!id || finished.includes(id)) return false;
    return (
      this.#state.people.find((entry) => entry.id === id)?.status === 'active'
    );
  }

  #finishActivation(): void {
    if (this.#state.phase === 'complete') return;
    const finishedActors = [
      ...this.#state.finishedActors,
      this.#state.currentActorId,
    ].filter((id): id is string => !!id);
    const stack = this.#state.postponed.filter(
      (entry) => !finishedActors.includes(entry.id),
    );
    const resume = stack.at(-1);
    if (resume && this.#available(resume.id, finishedActors)) {
      this.#replace({
        finishedActors,
        postponed: stack.slice(0, -1),
        currentActorId: resume.id,
        activation: resume,
      });
      return;
    }
    let index = this.#state.initiativeIndex + 1;
    let id = this.#state.initiativeOrder[index] ?? null;
    while (id && !this.#available(id, finishedActors)) {
      index++;
      id = this.#state.initiativeOrder[index] ?? null;
    }
    if (!id) {
      this.#replace({ finishedActors, postponed: [] });
      this.#endRound();
      return;
    }
    const actor = this.#state.people.find((entry) => entry.id === id)!;
    this.#replace({
      finishedActors,
      postponed: [],
      initiativeIndex: index,
      currentActorId: id,
      activation: { id, remaining: this.#maxActionPoints(actor) },
    });
  }

  #updateSmoke(): void {
    const values = new Map<string, BoardingSmoke>();
    for (const entry of this.#state.smoke) {
      let amount = Math.max(0, entry.amount - (this.#die(3) - 1));
      if (amount >= 3) {
        const direction = ADJACENT_DIRECTIONS[this.#die(8) - 1]!;
        const spread = {
          q: entry.position.q + direction.q,
          r: entry.position.r + direction.r,
        };
        if (this.#map.contains(spread) && this.#passable(spread, 'smoke')) {
          const old = values.get(positionKey(spread));
          values.set(positionKey(spread), {
            position: frozenCell(spread),
            amount: (old?.amount ?? 0) + 1,
          });
          amount--;
        }
      }
      if (amount > 0) {
        const old = values.get(positionKey(entry.position));
        values.set(positionKey(entry.position), {
          position: entry.position,
          amount: (old?.amount ?? 0) + amount,
        });
      }
    }
    this.#replace({ smoke: [...values.values()] });
  }

  #holds(room: 'bridge' | 'engineering', side: BoardingSide): boolean {
    return this.#state.people.some(
      (entry) =>
        entry.side === side &&
        entry.status === 'active' &&
        this.#map.roomAt(entry.position) === room,
    );
  }

  #runCivilianPhase(): void {
    const exits = this.#state.features.filter(
      (feature) =>
        feature.kind === 'exit' &&
        feature.exit === 'escape-pod' &&
        !feature.destroyed,
    );
    for (const initial of this.#state.people.filter(
      (entry) => entry.side === 'civilian' && entry.status === 'active',
    )) {
      let actor = this.#state.people.find((entry) => entry.id === initial.id)!;
      let remaining = this.#maxActionPoints(actor);
      const adjacentDoor = this.#state.features.find(
        (feature) =>
          feature.kind === 'door' &&
          !feature.destroyed &&
          !feature.open &&
          !feature.locked &&
          sharesEdge(feature.position, actor.position),
      );
      if (adjacentDoor && remaining >= 1) {
        this.#updateFeature(adjacentDoor.id, (entry) => ({
          ...entry,
          open: true,
        }));
        remaining--;
      }
      const routes = exits
        .map((exit) => ({
          exit,
          path: this.pathTo(actor.id, exit.position),
        }))
        .filter(
          (
            candidate,
          ): candidate is {
            exit: BoardingFeature;
            path: BoardingPath;
          } => !!candidate.path,
        )
        .sort((a, b) => a.path.cost - b.path.cost);
      let route = routes[0]?.path ?? null;
      if (!route) {
        const threats = [
          ...this.#state.people
            .filter(
              (entry) =>
                entry.side !== 'civilian' &&
                entry.status !== 'dead' &&
                entry.status !== 'evacuated',
            )
            .map((entry) => entry.position),
          ...this.#state.noiseMarkers.map((entry) => entry.position),
        ];
        route =
          Array.from({ length: this.#map.height }, (_, r) =>
            Array.from({ length: this.#map.width }, (_, q) => ({ q, r })),
          )
            .flat()
            .map((destination) => ({
              destination,
              path: this.pathTo(actor.id, destination),
              safety:
                threats.length === 0
                  ? 0
                  : Math.min(
                      ...threats.map((threat) => distance(destination, threat)),
                    ),
            }))
            .filter(
              (
                candidate,
              ): candidate is {
                destination: BoardingCell;
                path: BoardingPath;
                safety: number;
              } =>
                !!candidate.path &&
                candidate.path.cost > 0 &&
                candidate.path.cost <= remaining,
            )
            .sort((a, b) => b.safety - a.safety || b.path.cost - a.path.cost)[0]
            ?.path ?? null;
      }
      if (route) {
        for (const step of route.steps) {
          actor = this.#state.people.find((entry) => entry.id === initial.id)!;
          const cost = step.cost;
          if (cost > remaining) break;
          remaining -= cost;
          if (step.type === 'turn')
            this.#updatePerson(actor.id, (entry) => ({
              ...entry,
              facing: turnFacing(entry.facing, step.direction),
            }));
          else
            this.#updatePerson(actor.id, (entry) => ({
              ...entry,
              position: frozenCell(step.position),
            }));
          this.#refreshKnowledge();
          this.#recordPresentation(initial.id);
        }
      }
      actor = this.#state.people.find((entry) => entry.id === initial.id)!;
      if (
        remaining >= EVACUATE_AP &&
        exits.some((exit) => same(exit.position, actor.position))
      ) {
        this.#updatePerson(actor.id, (entry) => ({
          ...entry,
          status: 'evacuated',
        }));
        this.#replace({ savedCivilians: this.#state.savedCivilians + 1 });
      }
    }
  }

  #endRound(): void {
    this.#runCivilianPhase();
    this.#updateSmoke();
    let countdown = this.#state.reactorCountdown;
    if (countdown !== null) countdown--;
    this.#replace({
      reactorCountdown: countdown,
      noiseMarkers: [],
      activation: null,
      currentActorId: null,
    });
    if (countdown !== null && countdown <= 0 && !this.#state.campaign) {
      this.#complete('defeat', 'The reactor explodes. The ship is destroyed.');
      return;
    }
    if (!this.#state.campaign) {
      const playerHolds =
        this.#holds('bridge', 'player') && this.#holds('engineering', 'player');
      const defenderContests =
        this.#holds('bridge', 'defender') ||
        this.#holds('engineering', 'defender');
      if (playerHolds && !defenderContests) {
        this.#complete('victory', 'Bridge and Engineering are secured.');
        return;
      }
    }
    this.synchronize();
    if (this.#state.phase === 'fighting') this.#beginRound();
  }

  finish(outcome: BoardingOutcome, message = 'Boarding resolved.'): void {
    this.#complete(outcome, message);
  }

  #complete(outcome: BoardingOutcome, message: string): void {
    this.#replace({
      phase: 'complete',
      outcome,
      currentActorId: null,
      activation: null,
      log: [...this.#state.log, message],
    });
  }

  synchronize(): void {
    if (this.#state.phase === 'complete') return;
    this.#refreshKnowledge();
    const reactor = this.#state.features.find(
      (entry) => entry.kind === 'reactor',
    );
    if (reactor?.destroyed && this.#state.reactorCountdown === null)
      this.#replace({
        reactorCountdown: REACTOR_ROUNDS,
        log: [
          ...this.#state.log,
          `Reactor destroyed. Explosion in ${REACTOR_ROUNDS} rounds.`,
        ],
      });
    const activePlayers = this.#state.people.some(
      (entry) => entry.side === 'player' && entry.status === 'active',
    );
    const activeDefenders = this.#state.people.some(
      (entry) => entry.side === 'defender' && entry.status === 'active',
    );
    if (!activePlayers) {
      const evacuated = this.#state.people.some(
        (entry) => entry.side === 'player' && entry.status === 'evacuated',
      );
      this.#complete(
        evacuated ? 'aborted' : 'defeat',
        evacuated
          ? 'The boarding team evacuates.'
          : 'The boarding team is lost.',
      );
    } else if (!activeDefenders)
      this.#complete('victory', 'All defenders are neutralized.');
  }

  actAutomatically(singleStep = false): boolean {
    let acted = false;
    while (this.#state.phase === 'fighting') {
      const actor = this.#state.people.find(
        (entry) => entry.id === this.#state.currentActorId,
      );
      if (!actor || actor.side !== 'defender' || actor.status !== 'active')
        return acted;
      const beforeId = actor.id;
      const beforeRemaining = this.#state.activation?.remaining ?? 0;
      const command = chooseDefenderCommand(this, actor);
      this.#replace({
        log: [...this.#state.log, hiddenDefenderActivity(command)],
      });
      try {
        this.command(command);
      } catch {
        // forsvarare-och-civilister: a rejected AI action must still yield the turn.
        if (
          this.#state.phase === 'fighting' &&
          this.#state.currentActorId === beforeId
        )
          this.command({ type: 'end-activation' });
      }
      if (
        this.#state.phase === 'fighting' &&
        this.#state.currentActorId === beforeId &&
        (this.#state.activation?.remaining ?? 0) === beforeRemaining
      )
        this.command({ type: 'end-activation' });
      acted = true;
      if (singleStep) return true;
    }
    return acted;
  }
}
