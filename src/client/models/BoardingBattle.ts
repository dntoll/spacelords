import { HexCoordinate, HexGeometry } from './HexCoordinate.js';
import {
  type BoardingFeatureDefinition,
  type BoardingFeatureKind,
  type BoardingHex,
  BoardingMap,
} from './BoardingMap.js';
import { chooseDefenderCommand } from './BoardingAI.js';

export type BoardingSide = 'player' | 'defender' | 'civilian';
export type BoardingPersonStatus =
  'active' | 'incapacitated' | 'dead' | 'evacuated';
export type BoardingOutcome = 'victory' | 'defeat' | 'aborted';

export interface BoardingPerson {
  readonly id: string;
  readonly label: string;
  readonly side: BoardingSide;
  readonly position: BoardingHex;
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
}

export interface BoardingFeature {
  readonly id: string;
  readonly kind: BoardingFeatureKind;
  readonly position: BoardingHex;
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
  readonly position: BoardingHex;
  readonly amount: number;
}

export interface BoardingLastKnown {
  readonly id: string;
  readonly position: BoardingHex;
}

export interface BoardingNoise {
  readonly position: BoardingHex;
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
  readonly smokeHexes: readonly BoardingHex[];
  readonly visibleHexes: readonly BoardingHex[];
  readonly exploredHexes: readonly BoardingHex[];
  readonly lastKnownEnemies: readonly BoardingLastKnown[];
  readonly noiseMarkers: readonly BoardingNoise[];
  readonly reactorCountdown: number | null;
  readonly savedCivilians: number;
  readonly log: readonly string[];
}

export type BoardingCommand =
  | { readonly type: 'turn'; readonly direction: -1 | 1 }
  | { readonly type: 'move'; readonly to: BoardingHex }
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
      readonly at: BoardingHex;
    }
  | { readonly type: 'overwatch' }
  | { readonly type: 'med-pack'; readonly targetId: string }
  | { readonly type: 'evacuate' }
  | { readonly type: 'end-activation' };

export interface BoardingPath {
  readonly cost: number;
  readonly turns: number;
  readonly positions: readonly BoardingHex[];
  readonly finalFacing: number;
  readonly steps: readonly (
    | { readonly type: 'turn'; readonly direction: -1 | 1 }
    | { readonly type: 'forward'; readonly position: BoardingHex }
  )[];
}

export interface BoardingAttackPreview {
  readonly chance: number;
  readonly defense: number;
  readonly reason: string | null;
}

const DIRECTIONS: readonly BoardingHex[] = Object.freeze([
  Object.freeze({ q: 1, r: 0 }),
  Object.freeze({ q: 1, r: -1 }),
  Object.freeze({ q: 0, r: -1 }),
  Object.freeze({ q: -1, r: 0 }),
  Object.freeze({ q: -1, r: 1 }),
  Object.freeze({ q: 0, r: 1 }),
]);
const RIFLE_AP = 4;
const GRENADE_AP = 4;
const MED_PACK_AP = 4;
const HACK_AP = 4;
const EVACUATE_AP = 2;
const MELEE_AP = 3;
const REACTOR_ROUNDS = 3;

const positionKey = (position: BoardingHex): string =>
  `${position.q},${position.r}`;
const same = (a: BoardingHex, b: BoardingHex): boolean =>
  a.q === b.q && a.r === b.r;
const frozenHex = (position: BoardingHex): BoardingHex =>
  Object.freeze({ q: position.q, r: position.r });
const distance = (a: BoardingHex, b: BoardingHex): number =>
  new HexCoordinate(a.q, a.r).distanceTo(new HexCoordinate(b.q, b.r));
const normalizeFacing = (facing: number): number => ((facing % 6) + 6) % 6;

function freezeState(state: BoardingBattleState): BoardingBattleState {
  const people = Object.freeze(
    state.people.map((person) =>
      Object.freeze({ ...person, position: frozenHex(person.position) }),
    ),
  );
  const features = Object.freeze(
    state.features.map((feature) =>
      Object.freeze({ ...feature, position: frozenHex(feature.position) }),
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
        Object.freeze({ ...entry, position: frozenHex(entry.position) }),
      ),
    ),
    smokeHexes: Object.freeze(state.smokeHexes.map(frozenHex)),
    visibleHexes: Object.freeze(state.visibleHexes.map(frozenHex)),
    exploredHexes: Object.freeze(state.exploredHexes.map(frozenHex)),
    lastKnownEnemies: Object.freeze(
      state.lastKnownEnemies.map((entry) =>
        Object.freeze({ ...entry, position: frozenHex(entry.position) }),
      ),
    ),
    noiseMarkers: Object.freeze(
      state.noiseMarkers.map((entry) =>
        Object.freeze({ ...entry, position: frozenHex(entry.position) }),
      ),
    ),
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
    position: frozenHex(feature.position),
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
  position: BoardingHex,
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
    position: frozenHex(position),
    facing: side === 'defender' ? 3 : 0,
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
  });
}

/** A deterministic, campaign-independent boarding encounter. */
export class BoardingBattle {
  readonly #map: BoardingMap;
  #state: BoardingBattleState;

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
      smokeHexes: [],
      visibleHexes: [],
      exploredHexes: [],
      lastKnownEnemies: [],
      noiseMarkers: [],
      reactorCountdown: null,
      savedCivilians: 0,
      log: [],
    });
    battle.#beginRound();
    battle.#refreshKnowledge();
    return battle;
  }

  static restore(map: BoardingMap, state: BoardingBattleState): BoardingBattle {
    if (state.mapName !== map.name) throw new Error('Boarding map mismatch.');
    return new BoardingBattle(map, state);
  }

  static forward(position: BoardingHex, facing: number): BoardingHex {
    const direction = DIRECTIONS[normalizeFacing(facing)]!;
    return Object.freeze({
      q: position.q + direction.q,
      r: position.r + direction.r,
    });
  }

  get snapshot(): BoardingBattleState {
    return this.#state;
  }

  get visibleSnapshot(): BoardingBattleState {
    const visible = new Set(this.#state.visibleHexes.map(positionKey));
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

  #featureAt(position: BoardingHex): BoardingFeature | undefined {
    return this.#state.features.find(
      (entry) => !entry.destroyed && same(entry.position, position),
    );
  }

  #personAt(
    position: BoardingHex,
    ignoreId?: string,
  ): BoardingPerson | undefined {
    return this.#state.people.find(
      (entry) =>
        entry.id !== ignoreId &&
        entry.status !== 'dead' &&
        entry.status !== 'evacuated' &&
        same(entry.position, position),
    );
  }

  #passable(position: BoardingHex, moverId: string): boolean {
    if (!this.#map.contains(position)) return false;
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

  pathTo(id: string, destination: BoardingHex): BoardingPath | null {
    const entry = this.#state.people.find(
      (candidate) => candidate.id === id && candidate.status === 'active',
    );
    if (!entry || !this.#map.contains(destination)) return null;
    type Node = {
      position: BoardingHex;
      facing: number;
      cost: number;
      turns: number;
      steps: BoardingPath['steps'];
      positions: readonly BoardingHex[];
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
        const facing = normalizeFacing(current.facing + direction);
        const next: Node = {
          ...current,
          facing,
          cost: current.cost + 1,
          turns: current.turns + 1,
          steps: [...current.steps, { type: 'turn', direction }],
        };
        const nodeKey = `${positionKey(next.position)}:${facing}`;
        if ((best.get(nodeKey) ?? Infinity) > next.cost) {
          best.set(nodeKey, next.cost);
          queue.push(next);
        }
      }
      const forward = BoardingBattle.forward(current.position, current.facing);
      if (this.#passable(forward, id)) {
        const moveCost = entry.crouched ? 3 : 2;
        const next: Node = {
          ...current,
          position: forward,
          cost: current.cost + moveCost,
          steps: [...current.steps, { type: 'forward', position: forward }],
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

  #line(a: BoardingHex, b: BoardingHex): readonly BoardingHex[] {
    const count = distance(a, b);
    if (count === 0) return Object.freeze([frozenHex(a)]);
    const result: BoardingHex[] = [];
    for (let index = 0; index <= count; index++) {
      const t = index / count;
      const q = a.q + (b.q - a.q) * t;
      const r = a.r + (b.r - a.r) * t;
      const s = -q - r;
      let roundedQ = Math.round(q);
      let roundedR = Math.round(r);
      const roundedS = Math.round(s);
      const qError = Math.abs(roundedQ - q);
      const rError = Math.abs(roundedR - r);
      const sError = Math.abs(roundedS - s);
      if (qError > rError && qError > sError) roundedQ = -roundedR - roundedS;
      else if (rError > sError) roundedR = -roundedQ - roundedS;
      const position = frozenHex({ q: roundedQ, r: roundedR });
      if (!result.some((entry) => same(entry, position))) result.push(position);
    }
    return Object.freeze(result);
  }

  #inFieldOfView(observer: BoardingPerson, target: BoardingHex): boolean {
    if (same(observer.position, target)) return true;
    const origin = HexGeometry.toPoint(
      new HexCoordinate(observer.position.q, observer.position.r),
    );
    const forwardHex = BoardingBattle.forward(
      observer.position,
      observer.facing,
    );
    const forward = HexGeometry.toPoint(
      new HexCoordinate(forwardHex.q, forwardHex.r),
    );
    const point = HexGeometry.toPoint(new HexCoordinate(target.q, target.r));
    const ax = forward.x - origin.x;
    const ay = forward.y - origin.y;
    const bx = point.x - origin.x;
    const by = point.y - origin.y;
    const denominator = Math.hypot(ax, ay) * Math.hypot(bx, by);
    return denominator > 0 && (ax * bx + ay * by) / denominator >= 0.5 - 1e-9;
  }

  #blocksSight(
    position: BoardingHex,
    ignoreIds: readonly string[] = [],
  ): boolean {
    const feature = this.#featureAt(position);
    if (
      feature &&
      (feature.kind === 'wall' ||
        feature.kind === 'hull' ||
        (feature.kind === 'door' && !feature.open))
    )
      return true;
    if (
      this.#state.smoke.some(
        (entry) => entry.amount > 0 && same(entry.position, position),
      )
    )
      return true;
    return this.#state.people.some(
      (entry) =>
        !ignoreIds.includes(entry.id) &&
        entry.status !== 'dead' &&
        entry.status !== 'evacuated' &&
        same(entry.position, position),
    );
  }

  #canSee(observer: BoardingPerson, target: BoardingHex): boolean {
    if (
      observer.status !== 'active' ||
      distance(observer.position, target) > 8 ||
      !this.#inFieldOfView(observer, target)
    )
      return false;
    const line = this.#line(observer.position, target);
    return !line
      .slice(1, -1)
      .some((position) => this.#blocksSight(position, [observer.id]));
  }

  #visibleFor(side: 'player' | 'defender'): readonly BoardingHex[] {
    const result = new Map<string, BoardingHex>();
    for (const observer of this.#state.people.filter(
      (entry) => entry.side === side && entry.status === 'active',
    )) {
      for (let r = 0; r < this.#map.height; r++) {
        for (let q = 0; q < this.#map.width; q++) {
          const position = { q, r };
          if (this.#canSee(observer, position))
            result.set(positionKey(position), frozenHex(position));
        }
      }
    }
    return Object.freeze([...result.values()]);
  }

  #refreshKnowledge(): void {
    const visible = this.#visibleFor('player');
    const visibleKeys = new Set(visible.map(positionKey));
    const explored = new Map(
      this.#state.exploredHexes.map((position) => [
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
    this.#replace({
      visibleHexes: visible,
      exploredHexes: [...explored.values()],
      lastKnownEnemies: [...lastKnown.values()],
      smokeHexes: this.#state.smoke
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

  #targetPosition(target: BoardingPerson | BoardingFeature): BoardingHex {
    return target.position;
  }

  #targetDefense(target: BoardingPerson | BoardingFeature): number {
    if ('side' in target) {
      let result = target.defense;
      const smoked = this.#state.smoke.some(
        (entry) => entry.amount > 0 && same(entry.position, target.position),
      );
      if (smoked) result += 2;
      const hasCover = this.#state.features.some(
        (feature) =>
          feature.kind === 'cover' &&
          !feature.destroyed &&
          distance(feature.position, target.position) === 1,
      );
      if (hasCover) result += target.crouched ? 5 : 2;
      return result;
    }
    return target.kind === 'reactor' ? 8 : target.kind === 'door' ? 10 : 12;
  }

  attackPreview(sourceId: string, targetId: string): BoardingAttackPreview {
    const source = this.#state.people.find(
      (entry) => entry.id === sourceId && entry.status === 'active',
    );
    const target = this.#target(targetId);
    let reason: string | null = null;
    if (!source || !target) reason = 'Choose an active attacker and target.';
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
      reason = 'The target is outside the 120° field of fire.';
    else {
      const line = this.#line(source.position, this.#targetPosition(target));
      if (
        line
          .slice(1, -1)
          .some((position) =>
            this.#blocksSight(position, [
              source.id,
              'side' in target ? target.id : '',
            ]),
          )
      )
        reason = 'The shot is blocked.';
    }
    const defense = target ? this.#targetDefense(target) : 99;
    const needed = defense - (source?.accuracy ?? 0);
    const chance = reason
      ? 0
      : Math.max(5, Math.min(95, (21 - Math.max(2, needed)) * 5));
    return Object.freeze({ chance, defense, reason });
  }

  #addNoise(position: BoardingHex, actorSide: BoardingSide): void {
    const audience =
      actorSide === 'defender' ? 'player' : ('defender' as const);
    const existing = this.#state.noiseMarkers.some(
      (entry) => entry.audience === audience && same(entry.position, position),
    );
    if (!existing)
      this.#replace({
        noiseMarkers: [
          ...this.#state.noiseMarkers,
          { position: frozenHex(position), audience },
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
        ? {
            chance: distance(source.position, target.position) === 1 ? 75 : 0,
            defense: this.#targetDefense(target),
            reason:
              distance(source.position, target.position) === 1
                ? null
                : 'Melee requires an adjacent target.',
          }
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
        !this.#canSee(watcher, mover.position)
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

  #move(destination: BoardingHex): void {
    const actor = this.#actor();
    const path = this.pathTo(actor.id, destination);
    if (!path) throw new Error('No route to that hex.');
    if (path.cost > this.#state.activation!.remaining)
      throw new Error('The route needs more AP.');
    for (const step of path.steps) {
      const current = this.#state.people.find(
        (entry) => entry.id === actor.id,
      )!;
      if (current.status !== 'active') break;
      if (step.type === 'turn') {
        this.#spend(1);
        this.#updatePerson(actor.id, (entry) => ({
          ...entry,
          facing: normalizeFacing(entry.facing + step.direction),
        }));
      } else {
        const cost = current.crouched ? 3 : 2;
        this.#spend(cost);
        this.#updatePerson(actor.id, (entry) => ({
          ...entry,
          position: frozenHex(step.position),
        }));
        this.#refreshKnowledge();
        const moved = this.#state.people.find(
          (entry) => entry.id === actor.id,
        )!;
        this.#triggerOverwatch(moved);
      }
    }
  }

  #door(id: string, action: 'open' | 'close'): void {
    const actor = this.#actor();
    const door = this.#state.features.find(
      (entry) => entry.id === id && entry.kind === 'door' && !entry.destroyed,
    );
    if (!door || distance(actor.position, door.position) !== 1)
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
    if (!door || distance(actor.position, door.position) !== 1 || !door.locked)
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

  #grenade(grenade: 'frag' | 'smoke', target: BoardingHex): void {
    const actor = this.#spend(GRENADE_AP);
    if (distance(actor.position, target) > 6)
      throw new Error('The target hex is outside throwing range.');
    const die = this.#die(20);
    const difficulty = 8 + distance(actor.position, target);
    let impact = frozenHex(target);
    if (die + actor.accuracy < difficulty) {
      const margin = difficulty - (die + actor.accuracy);
      const deviation = Math.min(3, Math.max(1, Math.ceil(margin / 5)));
      const facing = this.#die(6) - 1;
      for (let index = 0; index < deviation; index++)
        impact = BoardingBattle.forward(impact, facing);
      if (!this.#map.contains(impact)) impact = frozenHex(target);
    }
    this.#addNoise(impact, actor.side);
    if (grenade === 'smoke') {
      const amounts = new Map(
        this.#state.smoke.map((entry) => [positionKey(entry.position), entry]),
      );
      const add = (position: BoardingHex, amount: number) => {
        if (!this.#map.contains(position)) return;
        const old = amounts.get(positionKey(position));
        amounts.set(positionKey(position), {
          position: frozenHex(position),
          amount: (old?.amount ?? 0) + amount,
        });
      };
      add(impact, 4);
      for (const direction of DIRECTIONS)
        add({ q: impact.q + direction.q, r: impact.r + direction.r }, 2);
      this.#replace({ smoke: [...amounts.values()] });
    } else {
      const area = [
        impact,
        ...DIRECTIONS.map((direction) => ({
          q: impact.q + direction.q,
          r: impact.r + direction.r,
        })),
      ];
      for (const position of area) {
        const line = this.#line(impact, position);
        if (line.slice(1, -1).some((entry) => this.#blocksSight(entry)))
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
      distance(actor.position, target.position) !== 1
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
    const actor = this.#actor();
    if (command.type === 'turn') {
      this.#spend(1);
      this.#updatePerson(actor.id, (entry) => ({
        ...entry,
        facing: normalizeFacing(entry.facing + command.direction),
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
      this.#spend(RIFLE_AP);
      this.#attack(actor.id, command.targetId, 'Rifle');
    } else if (command.type === 'melee') {
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
    else this.#finishActivation();
    this.#refreshKnowledge();
    this.synchronize();
  }

  #finishActivation(): void {
    if (this.#state.phase === 'complete') return;
    let index = this.#state.initiativeIndex + 1;
    let id = this.#state.initiativeOrder[index] ?? null;
    while (
      id &&
      this.#state.people.find((entry) => entry.id === id)?.status !== 'active'
    ) {
      index++;
      id = this.#state.initiativeOrder[index] ?? null;
    }
    if (!id) {
      this.#endRound();
      return;
    }
    const actor = this.#state.people.find((entry) => entry.id === id)!;
    this.#replace({
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
        const direction = DIRECTIONS[this.#die(6) - 1]!;
        const spread = {
          q: entry.position.q + direction.q,
          r: entry.position.r + direction.r,
        };
        if (this.#map.contains(spread) && this.#passable(spread, 'smoke')) {
          const old = values.get(positionKey(spread));
          values.set(positionKey(spread), {
            position: frozenHex(spread),
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
          distance(feature.position, actor.position) === 1,
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
                destination: BoardingHex;
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
          const cost = step.type === 'turn' ? 1 : actor.crouched ? 3 : 2;
          if (cost > remaining) break;
          remaining -= cost;
          if (step.type === 'turn')
            this.#updatePerson(actor.id, (entry) => ({
              ...entry,
              facing: normalizeFacing(entry.facing + step.direction),
            }));
          else
            this.#updatePerson(actor.id, (entry) => ({
              ...entry,
              position: frozenHex(step.position),
            }));
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
    if (countdown !== null && countdown <= 0) {
      this.#complete('defeat', 'The reactor explodes. The ship is destroyed.');
      return;
    }
    const playerHolds =
      this.#holds('bridge', 'player') && this.#holds('engineering', 'player');
    const defenderContests =
      this.#holds('bridge', 'defender') ||
      this.#holds('engineering', 'defender');
    if (playerHolds && !defenderContests) {
      this.#complete('victory', 'Bridge and Engineering are secured.');
      return;
    }
    this.synchronize();
    if (this.#state.phase === 'fighting') this.#beginRound();
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
      this.command(chooseDefenderCommand(this, actor));
      acted = true;
      if (singleStep) return true;
    }
    return acted;
  }
}
