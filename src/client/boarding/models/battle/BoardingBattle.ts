import {
  type BoardingFeatureDefinition,
  type BoardingFeatureKind,
  type BoardingCell,
  type BoardingMap,
} from '../map/BoardingMap.js';
import {
  spreadBoardingSpawns,
  type ComposedBoarding,
} from '../map/BoardingComposer.js';
import { chooseDefenderCommand } from './BoardingAI.js';
import {
  BOARDING_SEEN_SHARE,
  boardingBodyShadow,
  boardingCoverShadow,
  boardingSightOutline,
  boardingThrowObstacle,
  boardingAimPoint,
  boardingSegmentSolids,
  boardingStrayShot,
  boardingTileSight,
  boardingVisibleShare,
  boardingShipSightRadius,
  type BoardingSightBlocker,
  type BoardingSightBody,
  type BoardingSightSolid,
  type BoardingSightPoint,
} from './BoardingSightGeometry.js';
import type { CombatShipType } from '../../../space-battle/models/index.js';
import {
  BoardingRouteTree,
  type BoardingRouteMove,
} from './BoardingRouteSearch.js';

export type BoardingSide = 'player' | 'defender' | 'civilian';
export type BoardingPersonStatus =
  'active' | 'incapacitated' | 'dead' | 'evacuated';
export type BoardingOutcome = 'victory' | 'defeat' | 'aborted';
export type BoardingWeapon = 'rifle';
export type BoardingGadget =
  'frag-grenade' | 'smoke-grenade' | 'hacker-tools' | 'med-kit';

export interface BoardingLoadout {
  readonly weapon: BoardingWeapon;
  readonly gadget: BoardingGadget;
  /** Hacker tools are reusable and therefore have no finite count. */
  readonly uses: number | null;
}

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
  /** personlig-bordningsutrustning: one weapon and one personal gadget. */
  readonly loadout: BoardingLoadout;
  /** Legacy save fields, read only while normalizing old boarding states. */
  readonly medPacks?: number;
  readonly fragGrenades?: number;
  readonly smokeGrenades?: number;
  readonly cockpit?: boolean;
  /** sparad-gangdestination: the tile a walk has not reached yet. */
  readonly destination?: BoardingCell;
  /** ap-fraktion-sparas: AP left from a walk, added to the next activation. */
  readonly carriedAp?: number;
  /** fiender-reagerar-pa-ljud: where a defender last heard the boarders. */
  readonly heardAt?: BoardingCell;
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
  readonly axis?: 'q' | 'r';
  readonly low?: boolean;
  /** fonster-pa-halvhog-vagg: the glass above a low thin wall is broken. */
  readonly shattered?: boolean;
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

/** fiender-reagerar-pa-ljud: what made a sound, which sets how far it carries. */
export type BoardingSound = 'melee' | 'shot' | 'smoke' | 'explosion';

/** fiender-reagerar-pa-ljud: hearing range in tiles for each sound. */
export const BOARDING_HEARING_RANGE: Readonly<Record<BoardingSound, number>> =
  Object.freeze({ melee: 3, shot: 8, smoke: 6, explosion: 16 });

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
  /** fiende-syns-till-sin-tur: seen defenders shown until their next activation. */
  readonly lingeringPersonIds?: readonly string[];
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
    readonly gangwayLength?: number;
  };
  /** testbordning-med-tva-skepp: the ship that docked with the test transport. */
  readonly test?: {
    readonly attackerType: CombatShipType;
    readonly gangwayLength?: number;
  };
}

export type BoardingCommand =
  | { readonly type: 'turn'; readonly direction: -1 | 1 }
  | { readonly type: 'move'; readonly to: BoardingCell }
  | { readonly type: 'face'; readonly toward: BoardingCell }
  | { readonly type: 'walk'; readonly to: BoardingCell }
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
  readonly kind?: 'grenade';
  readonly grenade?: 'frag' | 'smoke';
  readonly presentationIndex?: number;
  readonly from: BoardingCell;
  readonly to: BoardingCell;
  /** skott-langs-fri-siktlinje: where in `to` the bullet flies. */
  readonly aim?: Readonly<{ q: number; r: number }>;
  /**
   * glas-krossas-nar-skottet-passerar: the panes the bullet breaks, each with
   * the share of the way from `from` to `aim` where the bullet reaches it.
   */
  readonly panes?: readonly BoardingShotPane[];
  readonly hit: boolean;
}

export interface BoardingShotPane {
  readonly id: string;
  readonly at: number;
}

/** krossbart-glas: a full-height window is gone; a low wall keeps its wall. */
export function boardingBrokenPane(feature: BoardingFeature): BoardingFeature {
  return feature.kind === 'window'
    ? { ...feature, hitPoints: 0, destroyed: true }
    : { ...feature, shattered: true };
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

/** geometrisk-sikt: what the selected soldier sees, for the map overlay. */
export interface BoardingSightArea {
  readonly outline: readonly BoardingSightPoint[];
  readonly halfCover: readonly BoardingCell[];
  /** halvskydd-skuggar-delvis: the floor each half cover shadows. */
  readonly coverShadows: readonly (readonly BoardingSightPoint[])[];
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
/** airlock-oppnar-at-blickriktning: an occupant opens at most one door. */
export function boardingOccupiedAirlockSide(
  cell: BoardingCell,
  people: readonly Pick<BoardingPerson, 'position' | 'facing' | 'status'>[],
): number {
  const occupant = people.find(
    (entry) =>
      entry.status === 'active' &&
      entry.position.q === cell.q &&
      entry.position.r === cell.r,
  );
  return occupant
    ? Math.sign(ADJACENT_DIRECTIONS[((occupant.facing % 8) + 8) % 8]!.r)
    : 0;
}
export const BOARDING_RIFLE_AP = 4;
/** billig-vandning: each 45-degree turn costs a quarter AP. */
export const BOARDING_TURN_AP = 0.25;
const RIFLE_AP = BOARDING_RIFLE_AP;
/** sikt-minne-och-ljudmarkorer: cosine of 90° from facing, a 180° cone. */
const BOARDING_VISION_COSINE = 0;
const GRENADE_AP = 4;
const GRENADE_RANGE = 6;
/** reaktor-skymmer-sikt: half a tile, so the reactor fills its tile's width. */
const REACTOR_SIGHT_RADIUS = 0.5;
export const BOARDING_MED_PACK_AP = 4;
const MED_PACK_AP = BOARDING_MED_PACK_AP;
export const BOARDING_HACK_AP = 4;
const HACK_AP = BOARDING_HACK_AP;
export const BOARDING_EVACUATE_AP = 2;
const EVACUATE_AP = BOARDING_EVACUATE_AP;
export const BOARDING_MELEE_AP = 3;
const MELEE_AP = BOARDING_MELEE_AP;
const REACTOR_ROUNDS = 3;

const positionKey = (position: BoardingCell): string =>
  `${position.q},${position.r}`;
const same = (a: BoardingCell, b: BoardingCell): boolean =>
  a.q === b.q && a.r === b.r;
const frozenCell = (position: BoardingCell): BoardingCell =>
  Object.freeze({ q: position.q, r: position.r });
/** delvis-synligt-mal: +4 defense below half visibility, +2 below full. */
export const boardingPartialSightDefense = (share: number): number =>
  share >= 1 ? 0 : share >= 0.5 ? 2 : 4;
/** avstand-paverkar-traffchans: +1 defense per begun two tiles beyond two. */
export const boardingRangeDefense = (tiles: number): number =>
  Math.max(0, Math.ceil((tiles - 2 - 1e-9) / 2));
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
/** vand-mot-vald-ruta: the shortest series of 45° turns towards a tile. */
export function boardingTurnsToward(
  position: BoardingCell,
  facing: number,
  toward: BoardingCell,
): readonly (-1 | 1)[] {
  const dq = toward.q - position.q;
  const dr = toward.r - position.r;
  if (dq === 0 && dr === 0) return Object.freeze([]);
  const sector = Math.round(Math.atan2(-dr, dq) / (Math.PI / 4));
  const target = (sector + 8) % 8;
  const current = FACING_ORDER.indexOf(
    normalizeFacing(facing) as (typeof FACING_ORDER)[number],
  );
  const left = (target - current + 8) % 8;
  return Object.freeze(
    left <= 4
      ? Array.from({ length: left }, () => 1 as const)
      : Array.from({ length: 8 - left }, () => -1 as const),
  );
}
const startingActionPoints = (person: BoardingPerson): number =>
  Math.max(1, person.agility + person.equipmentApModifier) +
  (person.carriedAp ?? 0);
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
  return startingActionPoints(person);
}

function hiddenDefenderActivity(command: BoardingCommand): string {
  if (command.type === 'turn' || command.type === 'face')
    return 'A defender turns.';
  if (command.type === 'move' || command.type === 'walk')
    return 'A defender moves.';
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
    normalizeBoardingPeople(state.people).map((person) =>
      Object.freeze({
        ...person,
        loadout: Object.freeze({ ...person.loadout }),
        position: frozenCell(person.position),
        ...(person.destination
          ? { destination: frozenCell(person.destination) }
          : {}),
        ...(person.heardAt ? { heardAt: frozenCell(person.heardAt) } : {}),
      }),
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
    lingeringPersonIds: Object.freeze([...(state.lingeringPersonIds ?? [])]),
    log: Object.freeze([...state.log]),
  });
}

function featureHitPoints(feature: BoardingFeatureDefinition): number {
  if (feature.kind === 'door') return 8;
  if (feature.kind === 'reactor') return 12;
  if (feature.kind === 'wall') return 10;
  if (feature.kind === 'thin-wall') return feature.low ? 6 : 10;
  if (feature.kind === 'window') return 1;
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
    ...(feature.axis ? { axis: feature.axis } : {}),
    ...(feature.low ? { low: true } : {}),
  });
}

/** eget-skepp-upptackt: a side knows its own ship; attackers also their gangway. */
function ownShipCells(
  map: BoardingMap,
  zone: 'attacker' | 'defender',
): BoardingCell[] {
  const cells: BoardingCell[] = [];
  for (let r = 0; r < map.height; r++)
    for (let q = 0; q < map.width; q++) {
      const cell = frozenCell({ q, r });
      const at = map.zoneAt(cell);
      const gangway = zone === 'attacker' && at === 'bridge';
      if (map.terrainAt(cell) !== null && (at === zone || gangway))
        cells.push(cell);
    }
  return cells;
}

function person(
  side: BoardingSide,
  index: number,
  position: BoardingCell,
  extras: {
    readonly cockpit?: boolean;
    readonly label?: string;
    readonly facing?: number;
  } = {},
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
    facing: extras.facing ?? (side === 'defender' ? 2 : 0),
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
    loadout: boardingLoadout(index),
    ...(extras.cockpit ? { cockpit: true } : {}),
    ...(extras.label ? { label: extras.label } : {}),
  });
}

const BOARDING_GADGET_ROTATION: readonly BoardingGadget[] = [
  'frag-grenade',
  'smoke-grenade',
  'hacker-tools',
  'med-kit',
];

function boardingLoadout(index: number): BoardingLoadout {
  const gadget =
    BOARDING_GADGET_ROTATION[index % BOARDING_GADGET_ROTATION.length]!;
  return Object.freeze({
    weapon: 'rifle',
    gadget,
    uses:
      gadget === 'frag-grenade' || gadget === 'smoke-grenade'
        ? 3
        : gadget === 'med-kit'
          ? 1
          : null,
  });
}

function normalizeBoardingPeople(
  people: readonly BoardingPerson[],
): readonly BoardingPerson[] {
  const sideIndex = new Map<BoardingSide, number>();
  return people.map((person) => {
    const index = sideIndex.get(person.side) ?? 0;
    sideIndex.set(person.side, index + 1);
    if (person.loadout) return person;
    const loadout = boardingLoadout(index);
    const legacyUses =
      loadout.gadget === 'frag-grenade'
        ? person.fragGrenades === 0
          ? 0
          : 3
        : loadout.gadget === 'smoke-grenade'
          ? person.smokeGrenades === 0
            ? 0
            : 3
          : loadout.gadget === 'med-kit'
            ? Math.max(0, person.medPacks ?? 1)
            : null;
    return Object.freeze({
      ...person,
      loadout: Object.freeze({ ...loadout, uses: legacyUses }),
    });
  });
}

/** A deterministic, campaign-independent boarding encounter. */
export class BoardingBattle {
  readonly #map: BoardingMap;
  /** sikt-over-hela-skeppet: only walls limit sight aboard, never distance. */
  readonly #sightRadius: number;
  #state: BoardingBattleState;
  #presentation: BoardingBattleState[] = [];
  #shot: BoardingShot | null = null;

  private constructor(map: BoardingMap, state: BoardingBattleState) {
    this.#map = map;
    this.#sightRadius = boardingShipSightRadius(map.width, map.height);
    this.#state = freezeState(state);
  }

  static create(map: BoardingMap, seed = Date.now() >>> 0): BoardingBattle {
    return BoardingBattle.#start(map, seed, map.spawns.player);
  }

  /**
   * testbordning-med-tva-skepp: the boarders start in their own ship by its
   * airlock and cross the gangway; the test rules apply to the defender.
   */
  static createTest(
    composed: ComposedBoarding,
    attackerType: CombatShipType,
    seed = Date.now() >>> 0,
  ): BoardingBattle {
    const taken = new Set<string>();
    const boarders = spreadBoardingSpawns(
      composed.map,
      composed.boardingFront,
      4,
      taken,
    );
    return BoardingBattle.#start(composed.map, seed, boarders, {
      attackerType,
      gangwayLength: composed.gangwayLength,
    });
  }

  static #start(
    map: BoardingMap,
    seed: number,
    players: readonly BoardingCell[],
    test?: BoardingBattleState['test'],
  ): BoardingBattle {
    const people = [
      ...players.map((position, index) =>
        person('player', index, position, test ? { facing: 3 } : {}),
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
      exploredCells: test ? ownShipCells(map, 'attacker') : [],
      lastKnownEnemies: [],
      defenderLastKnownEnemies: [],
      noiseMarkers: [],
      reactorCountdown: null,
      savedCivilians: 0,
      postponed: [],
      finishedActors: [],
      log: [],
      ...(test ? { test } : {}),
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
    standalone = false,
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
      ? fill(composed.boardingFront, 4)
      : fill(composed.defenderSpawns, 3);
    const enemyBoarders = playerIsAttacker
      ? fill(composed.defenderSpawns, 2)
      : fill(composed.boardingFront, 3);
    const people = [
      ...playerCells.map((position, index) =>
        person('player', index, position, {
          label: playerIsAttacker
            ? `Boarder ${index + 1}`
            : `Crew ${index + 1}`,
          ...(playerIsAttacker ? { facing: 3 } : {}),
        }),
      ),
      ...enemyBoarders.map((position, index) =>
        person(
          'defender',
          index,
          position,
          !playerIsAttacker ? { facing: 3 } : {},
        ),
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
      exploredCells: ownShipCells(
        composed.map,
        playerIsAttacker ? 'attacker' : 'defender',
      ),
      lastKnownEnemies: [],
      defenderLastKnownEnemies: [],
      noiseMarkers: [],
      reactorCountdown: null,
      savedCivilians: 0,
      postponed: [],
      finishedActors: [],
      log: [],
      ...(standalone
        ? { test: { attackerType, gangwayLength: composed.gangwayLength } }
        : {}),
      campaign: {
        playerZone: playerIsAttacker ? 'attacker' : 'defender',
        enemyZone: playerIsAttacker ? 'defender' : 'attacker',
        attackerType,
        defenderType,
        gangwayLength: composed.gangwayLength,
      },
    });
    battle.#beginRound();
    battle.#refreshKnowledge();
    return battle;
  }

  static restore(map: BoardingMap, state: BoardingBattleState): BoardingBattle {
    if (state.mapName !== map.name) throw new Error('Boarding map mismatch.');
    return new BoardingBattle(map, {
      ...state,
      people: normalizeBoardingPeople(state.people),
    });
  }

  /** sparad-forsvarartur-aterhamtas: recover an unusable saved defender activation. */
  recoverDefenderActivation(): void {
    if (this.#state.phase !== 'fighting') return;
    const actor = this.#state.people.find(
      (person) => person.id === this.#state.currentActorId,
    );
    if (actor && actor.side !== 'defender') return;
    if (actor?.status === 'active' && this.#state.activation?.id === actor.id)
      return;
    this.synchronize();
    if (this.#state.phase === 'fighting') this.#finishActivation();
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
    const lingering = new Set(this.#state.lingeringPersonIds ?? []);
    return freezeState({
      ...this.#state,
      people: this.#state.people.filter(
        (entry) =>
          entry.side === 'player' ||
          visible.has(positionKey(entry.position)) ||
          lingering.has(entry.id) ||
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
    // fast-soldatordning: the player's slots go to the soldiers in roster order.
    const rolled = initiative.map((entry) => entry.id);
    const soldiers = this.#state.people
      .filter((entry) => entry.side === 'player' && rolled.includes(entry.id))
      .map((entry) => entry.id);
    let nextSoldier = 0;
    const order = rolled.map((id) =>
      soldiers.includes(id) ? soldiers[nextSoldier++]! : id,
    );
    const first = order[0] ?? null;
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
      activation: null,
      people: this.#state.people.map((entry) => ({
        ...entry,
        overwatch: false,
      })),
      postponed: [],
      finishedActors: [],
      log: [...this.#state.log, `Initiative, round ${round}: ${text}.`],
    });
    if (first) this.#replace({ activation: this.#startActivation(first) });
  }

  /** ap-fraktion-sparas: a new activation uses up any carried AP. */
  #startActivation(id: string): BoardingActivation | null {
    const entry = this.#state.people.find((candidate) => candidate.id === id);
    if (!entry) return null;
    const remaining = startingActionPoints(entry);
    if (entry.carriedAp !== undefined)
      this.#updatePerson(id, (person) => {
        const rest = { ...person };
        delete rest.carriedAp;
        return rest;
      });
    return { id, remaining };
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

  #canStand(position: BoardingCell): boolean {
    const terrain = this.#map.terrainAt(position);
    // helhogt-fonster: a broken window can be stepped through.
    return (
      terrain === 'floor' || terrain === 'low-thin-wall' || terrain === 'window'
    );
  }

  /** ingen-rok-i-hela-vaggar: smoke stays out of intact walls, hull and closed doors. */
  #smokeCanFill(position: BoardingCell): boolean {
    if (!this.#map.contains(position) || this.#map.terrainAt(position) === null)
      return false;
    const feature = this.#featureAt(position);
    return !(
      feature &&
      (feature.kind === 'wall' ||
        feature.kind === 'hull' ||
        feature.kind === 'window' ||
        (feature.kind === 'door' && !feature.open))
    );
  }

  #passable(position: BoardingCell, moverId: string): boolean {
    if (!this.#canStand(position)) return false;
    const feature = this.#featureAt(position);
    if (
      feature &&
      (feature.kind === 'wall' ||
        feature.kind === 'hull' ||
        feature.kind === 'thin-wall' ||
        feature.kind === 'window' ||
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
    if (!entry || !this.#canStand(destination)) return null;
    return this.#routesFor(entry).pathTo(destination);
  }

  /** snabb-bordningsvagsokning: one route search per person and state. */
  #routesFor(entry: BoardingPerson): BoardingRouteTree {
    if (this.#routeCache?.state !== this.#state)
      this.#routeCache = { state: this.#state, trees: new Map() };
    const cached = this.#routeCache.trees.get(entry.id);
    if (cached) return cached;
    const tree = BoardingRouteTree.search(
      entry.position,
      entry.facing,
      (position, facing) => {
        const moves: BoardingRouteMove[] = ([-1, 1] as const).map(
          (direction) => ({
            position,
            facing: turnFacing(facing, direction),
            step: { type: 'turn', direction, cost: BOARDING_TURN_AP },
          }),
        );
        const forward = BoardingBattle.forward(position, facing);
        const diagonal = forward.q !== position.q && forward.r !== position.r;
        const clearCorner =
          !diagonal ||
          (this.#passable({ q: forward.q, r: position.r }, entry.id) &&
            this.#passable({ q: position.q, r: forward.r }, entry.id));
        if (clearCorner && this.#passable(forward, entry.id))
          moves.push({
            position: forward,
            facing,
            step: {
              type: 'forward',
              position: forward,
              cost: forwardCost(position, forward, entry.crouched),
            },
          });
        return moves;
      },
    );
    this.#routeCache.trees.set(entry.id, tree);
    return tree;
  }

  #routeCache: {
    readonly state: BoardingBattleState;
    readonly trees: Map<string, BoardingRouteTree>;
  } | null = null;

  /**
   * gang-mot-avlagset-mal: the furthest tile the person can afford on the
   * cheapest route towards a destination, or beside a door or occupied tile.
   */
  stepTowards(id: string, destination: BoardingCell): BoardingCell | null {
    const route = this.routeTowards(id, destination);
    if (!route) return null;
    const budget = boardingActionPointsRemaining(this.#state, id);
    let spent = 0;
    let reached: BoardingCell | null = null;
    for (const step of route.steps) {
      spent += step.cost;
      if (spent > budget) break;
      if (step.type === 'forward') reached = step.position;
    }
    return reached ? frozenCell(reached) : null;
  }

  /**
   * gang-mot-avlagset-mal: the cheapest route to a destination, or to a tile
   * beside it when it is a closed door or occupied.
   */
  routeTowards(id: string, destination: BoardingCell): BoardingPath | null {
    const entry = this.#state.people.find(
      (candidate) => candidate.id === id && candidate.status === 'active',
    );
    if (!entry) return null;
    const feature = this.#featureAt(destination);
    const goals =
      feature?.kind === 'door' && !feature.open
        ? CARDINAL_DIRECTIONS
        : [{ q: 0, r: 0 }, ...ADJACENT_DIRECTIONS];
    const routes = goals
      .map((offset) => ({
        q: destination.q + offset.q,
        r: destination.r + offset.r,
      }))
      .filter((goal) => this.#map.contains(goal))
      .map((goal) =>
        same(goal, entry.position) ? null : this.pathTo(id, goal),
      )
      .filter((route): route is BoardingPath => route !== null);
    return (
      routes.find((candidate) => {
        const last = candidate.positions.at(-1);
        return last && same(last, destination);
      }) ??
      routes.sort((a, b) => a.cost - b.cost)[0] ??
      null
    );
  }

  /** Reason a grenade cannot be thrown at the tile, or null when it can. */
  grenadeReason(
    id: string,
    grenade: 'frag' | 'smoke',
    target: BoardingCell,
  ): string | null {
    const entry = this.#state.people.find((candidate) => candidate.id === id);
    if (!entry || entry.status !== 'active') return 'No active person.';
    if (entry.loadout.gadget !== `${grenade}-grenade`)
      return `No ${grenade} grenade is equipped.`;
    if ((entry.loadout.uses ?? 0) < 1) return `No ${grenade} grenade remains.`;
    if (!this.#map.contains(target)) return 'Choose a tile on the map.';
    if (distance(entry.position, target) > GRENADE_RANGE)
      return 'The target tile is outside throwing range.';
    const obstacle = boardingThrowObstacle(
      entry.position,
      target,
      (q, r) => this.#solidShape({ q, r }),
      // Only people catch a grenade; it is thrown over the reactor.
      this.#bodies().filter((body) => body.radius === undefined),
    );
    if (obstacle === 'wall') return 'The throw is blocked by a wall.';
    if (obstacle === 'person')
      return 'The throw is blocked by a standing person.';
    if (boardingActionPointsRemaining(this.#state, id) < GRENADE_AP)
      return `The action needs ${GRENADE_AP} AP.`;
    return null;
  }

  /**
   * granat-over-halvskydd-inte-genom-vagg: solid tiles; smoke is no wall.
   * fonster-pa-halvhog-vagg / helhogt-fonster: intact glass reaches the
   * ceiling, so nothing is thrown over or through it.
   */
  #stopsGrenade(position: BoardingCell): boolean {
    return this.#solidWall(position) || this.#intactGlass(position);
  }

  /** fonster-pa-halvhog-vagg / helhogt-fonster: unbroken glass stands here. */
  #intactGlass(position: BoardingCell): boolean {
    const feature = this.#featureAt(position);
    return (
      !!feature &&
      (feature.kind === 'window' ||
        (feature.kind === 'thin-wall' && !!feature.low && !feature.shattered))
    );
  }

  /** Walls that stop sight as well as grenades; glass does not. */
  #solidWall(position: BoardingCell): boolean {
    if (!this.#map.contains(position)) return true;
    if (this.#map.terrainAt(position) === null) return true;
    if (this.#inAirlock(position)) return true;
    const feature = this.#featureAt(position);
    return (
      !!feature &&
      (feature.kind === 'wall' ||
        feature.kind === 'hull' ||
        (feature.kind === 'thin-wall' && !feature.low) ||
        (feature.kind === 'door' && !feature.open))
    );
  }

  /**
   * forseglad-airlock: one of an airlock's two automatic doors is always
   * closed, so the tile is sealed. It stops sight, shots and splinters, and
   * walking through it costs no more than floor.
   */
  #inAirlock(position: BoardingCell): boolean {
    return this.#map.airlocks.some((cell) => same(cell, position));
  }

  /** forseglad-airlock: an airlock and the outside never see each other. */
  #sealedApart(a: BoardingCell, b: BoardingCell): boolean {
    if (same(a, b)) return false;
    const airlock = this.#inAirlock(a) ? a : this.#inAirlock(b) ? b : null;
    if (!airlock) return false;
    const other = airlock === a ? b : a;
    const open = boardingOccupiedAirlockSide(airlock, this.#state.people);
    return open === 0 || Math.sign(other.r - airlock.r) !== open;
  }

  /** stang-oppen-dorr: reason the door action is unavailable, or null. */
  doorReason(
    id: string,
    doorId: string,
    action: 'open' | 'close',
  ): string | null {
    const entry = this.#state.people.find((candidate) => candidate.id === id);
    const door = this.#state.features.find(
      (candidate) =>
        candidate.id === doorId &&
        candidate.kind === 'door' &&
        !candidate.destroyed,
    );
    if (!entry || !door || !sharesEdge(entry.position, door.position))
      return 'Choose an adjacent door.';
    if (action === 'open' && door.locked) return 'The door is locked.';
    if (action === 'close' && this.#personAt(door.position))
      return 'The doorway is occupied.';
    if (boardingActionPointsRemaining(this.#state, id) < 1)
      return 'The action needs 1 AP.';
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
    return this.#solidWall(position) || this.#smokeAt(position);
  }

  #smokeAt(position: BoardingCell): boolean {
    return this.#state.smoke.some(
      (entry) => entry.amount > 0 && same(entry.position, position),
    );
  }

  #visionCache: {
    readonly state: BoardingBattleState;
    readonly blocks: BoardingSightBlocker;
  } | null = null;
  #coverCache: {
    readonly state: BoardingBattleState;
    readonly cover: (q: number, r: number) => boolean;
  } | null = null;

  #bodyCache: {
    readonly state: BoardingBattleState;
    readonly bodies: readonly BoardingSightBody[];
  } | null = null;

  /**
   * personer-som-pelare-i-sikt: people still on their feet, per state.
   * reaktor-skymmer-sikt: an intact reactor is a pillar half a tile in radius.
   */
  #bodies(): readonly BoardingSightBody[] {
    if (this.#bodyCache?.state === this.#state) return this.#bodyCache.bodies;
    const bodies: BoardingSightBody[] = this.#state.people
      .filter((entry) => entry.status === 'active')
      .map((entry) => ({
        q: entry.position.q,
        r: entry.position.r,
        cover: entry.crouched,
      }));
    for (const feature of this.#state.features)
      if (feature.kind === 'reactor' && !feature.destroyed)
        bodies.push({
          q: feature.position.q,
          r: feature.position.r,
          cover: false,
          radius: REACTOR_SIGHT_RADIUS,
        });
    this.#bodyCache = { state: this.#state, bodies };
    return bodies;
  }

  /** halvskydd-skuggar-delvis: intact crates and low walls, per state. */
  #halfCover(): (q: number, r: number) => boolean {
    if (this.#coverCache?.state === this.#state) return this.#coverCache.cover;
    const cells = new Set(
      this.#state.features
        .filter(
          (feature) =>
            !feature.destroyed &&
            (feature.kind === 'cover' ||
              (feature.kind === 'thin-wall' && !!feature.low)),
        )
        .map((feature) => positionKey(feature.position)),
    );
    const cover = (q: number, r: number) => cells.has(`${q},${r}`);
    this.#coverCache = { state: this.#state, cover };
    return cover;
  }

  /**
   * dorrar-som-tunna-vaggar: full thin walls and closed doors block only their
   * slab; smoke and other walls block the whole tile.
   */
  #visionShape(position: BoardingCell): BoardingSightSolid {
    return this.#smokeAt(position) || this.#solidShape(position, false);
  }

  /**
   * granat-over-halvskydd-inte-genom-vagg: what stops a grenade, by shape.
   * Without `glass`, only what also stops sight.
   */
  #solidShape(position: BoardingCell, glass = true): BoardingSightSolid {
    if (!this.#solidWall(position) && !(glass && this.#intactGlass(position)))
      return false;
    const feature = this.#featureAt(position);
    // sammanfogade-tunna-vaggar: the map knows the joined shape.
    if (feature?.kind === 'thin-wall' || feature?.kind === 'window')
      return this.#map.thinWallPieces(position) ?? feature.axis ?? true;
    if (feature?.kind === 'door') return this.#map.doorAxis(position);
    return true;
  }

  /** geometrisk-sikt: blocking tiles, cached for the current state. */
  #visionBlocks(): BoardingSightBlocker {
    if (this.#visionCache?.state === this.#state)
      return this.#visionCache.blocks;
    const width = this.#map.width;
    const height = this.#map.height;
    const grid = new Array<BoardingSightSolid>(width * height);
    for (let r = 0; r < height; r++)
      for (let q = 0; q < width; q++)
        grid[r * width + q] = this.#visionShape({ q, r });
    const blocks = (q: number, r: number) =>
      q < 0 || r < 0 || q >= width || r >= height ? true : grid[r * width + q]!;
    this.#visionCache = { state: this.#state, blocks };
    return blocks;
  }

  /**
   * grannruta-syns-genom-rok: a person always sees the tiles right around
   * them, so smoke never hides a neighbour. Walls and facing still count.
   */
  #nearSight(
    observer: BoardingPerson | undefined,
    target: BoardingCell | undefined,
  ): boolean {
    return (
      !!observer &&
      !!target &&
      Math.max(
        Math.abs(observer.position.q - target.q),
        Math.abs(observer.position.r - target.r),
      ) <= 1
    );
  }

  #smokelessBlocks(): BoardingSightBlocker {
    const blocks = this.#visionBlocks();
    return (q, r) =>
      blocks(q, r) !== false && this.#smokeAt({ q, r })
        ? this.#solidShape({ q, r }, false)
        : blocks(q, r);
  }

  #forwardVector(observer: BoardingPerson): BoardingSightPoint {
    const ahead = BoardingBattle.forward(observer.position, observer.facing);
    return {
      q: ahead.q - observer.position.q,
      r: ahead.r - observer.position.r,
    };
  }

  /**
   * hukad-ser-inte-over-halvskydd: a crouched person's eyes are below half
   * cover, so crates, low walls and crouched people block their sight, except
   * those right beside them that they peek over.
   */
  #visionBlocksFor(
    observer: BoardingPerson | undefined,
    target?: BoardingCell,
  ): BoardingSightBlocker {
    const blocks = this.#nearSight(observer, target)
      ? this.#smokelessBlocks()
      : this.#visionBlocks();
    if (!observer?.crouched) return blocks;
    const cover = this.#halfCover();
    const { q: eyeQ, r: eyeR } = observer.position;
    return (q, r) => {
      const solid = blocks(q, r);
      if (solid !== false) return solid;
      if (!cover(q, r) || Math.max(Math.abs(q - eyeQ), Math.abs(r - eyeR)) <= 1)
        return false;
      const feature = this.#featureAt({ q, r });
      return feature?.kind === 'thin-wall'
        ? (this.#map.thinWallPieces({ q, r }) ?? true)
        : true;
    };
  }

  /** hukad-ser-inte-over-halvskydd: distant crouched people block, too. */
  #bodiesFor(
    observer: BoardingPerson | undefined,
  ): readonly BoardingSightBody[] {
    const bodies = this.#bodies();
    if (!observer?.crouched) return bodies;
    const { q: eyeQ, r: eyeR } = observer.position;
    return bodies.map((body) =>
      body.cover &&
      Math.max(Math.abs(body.q - eyeQ), Math.abs(body.r - eyeR)) > 1
        ? { ...body, cover: false }
        : body,
    );
  }

  /** delvis-synligt-mal: the share of a tile the observer sees. */
  #visibleShare(observer: BoardingPerson, target: BoardingCell): number {
    if (observer.status !== 'active') return 0;
    if (this.#sealedApart(observer.position, target)) return 0;
    return this.#outsideShare(observer, target);
  }

  /**
   * geometrisk-sikt without forseglad-airlock: how much of `target` lies in
   * the observer's line of sight, ignoring that an airlock's doors are shut.
   */
  #outsideShare(observer: BoardingPerson, target: BoardingCell): number {
    return boardingVisibleShare(
      observer.position,
      this.#forwardVector(observer),
      target,
      this.#visionBlocksFor(observer, target),
      this.#bodiesFor(observer),
      this.#sightRadius,
    );
  }

  /** geometrisk-sikt: the selected soldier's sight outline and half cover. */
  sightArea(id: string): BoardingSightArea {
    const observer = this.#state.people.find((entry) => entry.id === id);
    if (!observer || observer.status !== 'active')
      return Object.freeze({ outline: [], halfCover: [], coverShadows: [] });
    // forseglad-airlock: behind closed doors the sight ends at the tile edge.
    if (
      this.#inAirlock(observer.position) &&
      boardingOccupiedAirlockSide(observer.position, this.#state.people) === 0
    ) {
      const { q, r } = observer.position;
      return Object.freeze({
        outline: Object.freeze(
          [
            [-0.5, -0.5],
            [0.5, -0.5],
            [0.5, 0.5],
            [-0.5, 0.5],
          ].map(([dq, dr]) => Object.freeze({ q: q + dq!, r: r + dr! })),
        ),
        halfCover: [],
        coverShadows: [],
      });
    }
    const halfCover = this.#state.features
      .filter(
        (feature) =>
          !feature.destroyed &&
          (feature.kind === 'cover' ||
            (feature.kind === 'thin-wall' && !!feature.low)) &&
          this.#visibleShare(observer, feature.position) > 0,
      )
      .map((feature) => frozenCell(feature.position));
    const crouched = this.#state.people.filter(
      (entry) =>
        entry.id !== observer.id &&
        entry.status === 'active' &&
        entry.crouched &&
        this.#visibleShare(observer, entry.position) > 0,
    );
    return Object.freeze({
      coverShadows: Object.freeze([
        ...halfCover.map((cell) =>
          boardingCoverShadow(
            observer.position,
            cell,
            1.5,
            this.#featureAt(cell)?.kind === 'thin-wall'
              ? this.#map.thinWallPieces(cell)
              : null,
          ),
        ),
        ...crouched.map((entry) =>
          boardingBodyShadow(observer.position, entry.position),
        ),
      ]),
      outline: boardingSightOutline(
        observer.position,
        this.#forwardVector(observer),
        this.#visionBlocksFor(observer),
        this.#bodiesFor(observer),
        this.#sightRadius,
      ),
      halfCover: Object.freeze(halfCover),
    });
  }

  /** geometrisk-sikt: a tile is seen from a tenth of its area upwards. */
  #canSee(observer: BoardingPerson, target: BoardingCell): boolean {
    return this.#visibleShare(observer, target) >= BOARDING_SEEN_SHARE;
  }

  /** geometrisk-sikt / personer-som-pelare-i-sikt: a shot needs a tenth in sight. */
  #canFire(observer: BoardingPerson, target: BoardingCell): boolean {
    return (
      distance(observer.position, target) <= 8 && this.#canSee(observer, target)
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

  /** kameraoverblick-vid-synlig-bordningsrorelse: report actual active player observers. */
  playerObserversOf(position: BoardingCell): readonly BoardingPerson[] {
    return Object.freeze(
      this.#state.people.filter(
        (person) =>
          person.side === 'player' &&
          person.status === 'active' &&
          this.#canSee(person, position),
      ),
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

  /** snabb-bordningsvagsokning: the state the last knowledge refresh produced. */
  #knowledgeState: BoardingBattleState | null = null;

  #refreshKnowledge(): void {
    // The refresh only reads positions, facings, features and smoke, so an
    // unchanged state already holds its own result.
    if (this.#knowledgeState === this.#state) return;
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
    // forseglad-airlock: a player sees the closed doors from outside, so the
    // airlock is known and drawn, but who stands inside stays hidden.
    for (const airlock of this.#map.airlocks)
      if (
        this.#state.people.some(
          (observer) =>
            observer.side === 'player' &&
            observer.status === 'active' &&
            this.#outsideShare(observer, airlock) >= BOARDING_SEEN_SHARE,
        )
      )
        explored.set(positionKey(airlock), frozenCell(airlock));
    const rememberedEnemies = (
      side: 'player' | 'defender',
      currentVisibility: ReadonlySet<string>,
      remembered: readonly BoardingLastKnown[],
    ) => {
      const living = new Map(
        this.#state.people
          .filter(
            (entry) =>
              entry.side === side &&
              entry.status !== 'dead' &&
              entry.status !== 'evacuated',
          )
          .map((entry) => [entry.id, entry]),
      );
      return new Map(
        remembered
          .filter((entry) => {
            const enemy = living.get(entry.id);
            return (
              !!enemy &&
              (!currentVisibility.has(positionKey(entry.position)) ||
                positionKey(enemy.position) === positionKey(entry.position))
            );
          })
          .map((entry) => [entry.id, entry]),
      );
    };
    const lastKnown = rememberedEnemies(
      'defender',
      visibleKeys,
      this.#state.lastKnownEnemies,
    );
    const seenDefenders = this.#state.people.filter(
      (entry) =>
        entry.side === 'defender' &&
        entry.status !== 'dead' &&
        entry.status !== 'evacuated' &&
        visibleKeys.has(positionKey(entry.position)),
    );
    for (const enemy of seenDefenders)
      lastKnown.set(enemy.id, { id: enemy.id, position: enemy.position });
    // fiende-syns-till-sin-tur: enemies and civilians only move on their own
    // turn, so a seen one stays where it was shown until that turn begins.
    // Civilians are forgotten when the civilian phase reaches them.
    const lingering = new Set(
      (this.#state.lingeringPersonIds ?? []).filter((id) => {
        const person = this.#state.people.find((entry) => entry.id === id);
        if (
          !person ||
          id === this.#state.currentActorId ||
          person.status === 'dead' ||
          person.status === 'evacuated'
        )
          return false;
        if (person.side === 'civilian') return true;
        const known = lastKnown.get(id);
        return (
          !!known &&
          positionKey(known.position) === positionKey(person.position)
        );
      }),
    );
    for (const person of this.#state.people)
      if (
        person.side !== 'player' &&
        person.status !== 'dead' &&
        person.status !== 'evacuated' &&
        visibleKeys.has(positionKey(person.position))
      )
        lingering.add(person.id);
    const defenderLastKnown = rememberedEnemies(
      'player',
      defenderVisibleKeys,
      this.#state.defenderLastKnownEnemies,
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
      lingeringPersonIds: [...lingering],
      smokeCells: this.#state.smoke
        .filter(
          (entry) => entry.amount > 0 && this.#smokeCanFill(entry.position),
        )
        .map((entry) => entry.position),
    });
    this.#knowledgeState = this.#state;
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

  /**
   * halvskydd-skuggar-delvis: the share of the target tile's visible part that
   * lies in the shadow of half cover right next to it, seen from `source`.
   */
  #coveredShare(source: BoardingCell, target: BoardingCell): number {
    if (same(source, target)) return 0;
    const shooter = this.#personAt(source);
    return boardingTileSight(
      source,
      { q: target.q - source.q, r: target.r - source.r },
      target,
      this.#visionBlocksFor(shooter, target),
      this.#halfCover(),
      this.#bodiesFor(shooter),
      this.#sightRadius,
    ).covered;
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
      const covered = source ? this.#coveredShare(source, target.position) : 0;
      if (covered >= 0.5) result += target.crouched ? 5 : 2;
      else if (covered >= BOARDING_SEEN_SHARE)
        result += target.crouched ? 3 : 1;
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
    else if (source.loadout.weapon !== 'rifle')
      reason = 'A rifle is not equipped.';
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
    else if (!this.#canSee(source, this.#targetPosition(target)))
      reason = this.#inFieldOfView(source, this.#targetPosition(target))
        ? 'The shot is blocked.'
        : 'The target is outside the 180° field of fire.';
    const share =
      source && target
        ? this.#visibleShare(source, this.#targetPosition(target))
        : 1;
    const defense = target
      ? this.#targetDefense(target, source?.position, true) +
        boardingPartialSightDefense(share) +
        (source
          ? boardingRangeDefense(
              distance(source.position, this.#targetPosition(target)),
            )
          : 0)
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
            // utslagen-fiende-utan-sikte: knocked-out enemies get no crosshair.
            person.status === 'active' &&
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

  #addNoise(
    position: BoardingCell,
    actorSide: BoardingSide,
    sound: BoardingSound,
  ): void {
    const audience =
      actorSide === 'defender' ? 'player' : ('defender' as const);
    if (audience === 'defender') this.#alertDefenders(position, sound);
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

  /**
   * fiender-reagerar-pa-ljud: defenders within earshot remember where the
   * sound came from; an explosion makes them turn towards it at once, so
   * nobody keeps their back to a blast. Those out of earshot do not react.
   */
  #alertDefenders(position: BoardingCell, sound: BoardingSound): void {
    const range = BOARDING_HEARING_RANGE[sound];
    for (const listener of this.#state.people) {
      if (
        listener.side !== 'defender' ||
        listener.status !== 'active' ||
        listener.cockpit
      )
        continue;
      const distance = Math.hypot(
        listener.position.q - position.q,
        listener.position.r - position.r,
      );
      if (distance > range) continue;
      this.#updatePerson(listener.id, (entry) => {
        let facing = entry.facing;
        if (sound === 'explosion')
          for (const direction of boardingTurnsToward(
            entry.position,
            facing,
            position,
          ))
            facing = turnFacing(facing, direction);
        return { ...entry, facing, heardAt: frozenCell(position) };
      });
    }
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
        // fonster-pa-halvhog-vagg: any blow to a low wall breaks its glass.
        ...(entry.kind === 'thin-wall' && entry.low ? { shattered: true } : {}),
        open:
          destroyed &&
          (entry.kind === 'door' ||
            entry.kind === 'wall' ||
            (entry.kind === 'thin-wall' && !entry.low))
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
    let damage = hit
      ? this.#rollDamage(kind === 'Melee' ? 6 : 8, critical ? 2 : 1, 2)
      : 0;
    if (hit) {
      if ('side' in target) this.#damagePerson(target.id, damage);
      else this.#damageFeature(target.id, damage);
    }
    this.#addNoise(
      source.position,
      source.side,
      kind === 'Melee' ? 'melee' : 'shot',
    );
    const targetCell = this.#targetPosition(target);
    // skott-langs-fri-siktlinje: aim before glass breaks along the line.
    let aim =
      kind === 'Melee'
        ? null
        : (boardingAimPoint(
            source.position,
            this.#forwardVector(source),
            targetCell,
            this.#visionBlocksFor(source, targetCell),
            this.#bodiesFor(source),
            this.#sightRadius,
          ) ?? frozenCell(targetCell));
    let impactId: string | undefined;
    if (aim && !hit) {
      const bodies: (BoardingSightBody & { id: string })[] = this.#state.people
        .filter(
          (person) =>
            person.id !== sourceId &&
            person.id !== targetId &&
            person.status === 'active',
        )
        .map((person) => ({
          ...person.position,
          cover: person.crouched,
          id: person.id,
        }));
      for (const feature of this.#state.features)
        if (
          feature.kind === 'reactor' &&
          !feature.destroyed &&
          feature.id !== targetId
        )
          bodies.push({
            ...feature.position,
            cover: false,
            id: feature.id,
            radius: REACTOR_SIGHT_RADIUS,
          });
      const impact = boardingStrayShot(
        source.position,
        targetCell,
        die === 1 ? 20 : Math.max(1, preview.defense - total),
        this.#die(2) === 1 ? -1 : 1,
        this.#map.width,
        this.#map.height,
        (q, r) => {
          const cell = { q, r };
          const feature = this.#featureAt(cell);
          if (feature?.id === targetId) return false;
          if (feature?.kind === 'cover') return true;
          if (feature?.kind === 'thin-wall' && feature.low)
            return this.#map.thinWallPieces(cell) ?? true;
          return this.#solidShape(cell, false);
        },
        bodies,
      );
      aim = impact.to;
      impactId =
        impact.id ??
        (impact.cell ? this.#featureAt(impact.cell)?.id : undefined);
      if (impactId) {
        const unintended = this.#target(impactId);
        if (
          unintended &&
          ('side' in unintended ||
            (unintended.kind !== 'hull' && unintended.kind !== 'exit'))
        ) {
          damage = this.#rollDamage(8, 1, 2);
          if ('side' in unintended) this.#damagePerson(impactId, damage);
          else this.#damageFeature(impactId, damage);
        }
      }
    }
    let panes = aim ? this.#shatterAlong(source.position, aim) : [];
    const impactTarget = impactId ? this.#target(impactId) : null;
    const visibleImpact =
      impactTarget &&
      this.#state.visibleCells.some((cell) =>
        same(cell, impactTarget.position),
      );
    if (aim && impactTarget && !visibleImpact) {
      const visible = new Set(this.#state.visibleCells.map(positionKey));
      const unseen = boardingSegmentSolids(
        source.position,
        aim,
        (q, r) => !visible.has(`${q},${r}`),
      )[0];
      if (unseen) {
        const share = Math.max(0, unseen.at - 0.0001);
        aim = {
          q: source.position.q + (aim.q - source.position.q) * share,
          r: source.position.r + (aim.r - source.position.r) * share,
        };
        panes = panes
          .filter((pane) => pane.at < share)
          .map((pane) => ({ ...pane, at: pane.at / share }));
      }
    }
    if (aim)
      this.#shot = Object.freeze({
        from: frozenCell(source.position),
        to: frozenCell(
          hit ? targetCell : { q: Math.round(aim.q), r: Math.round(aim.r) },
        ),
        aim,
        ...(panes.length ? { panes } : {}),
        presentationIndex: this.#presentation.length,
        hit,
      });
    this.#replace({
      log: [
        ...this.#state.log,
        `${kind} by ${source.label} at ${this.#label(targetId)}: D20 [${die}] + ${source.accuracy} = ${total} vs ${preview.defense}; ${hit ? `${critical ? 'critical, ' : ''}${damage} damage` : 'miss'}${impactId && visibleImpact && damage > 0 ? `, ${this.#label(impactId)} takes ${damage} damage` : ''}.`,
      ],
    });
    this.synchronize();
  }

  /** krossbart-glas: a bullet breaks every pane it passes, hit or miss. */
  #shatterAlong(
    from: BoardingCell,
    to: Readonly<{ q: number; r: number }>,
  ): readonly BoardingShotPane[] {
    const crossed = boardingSegmentSolids(from, to, (q, r) =>
      this.#intactGlass({ q, r })
        ? (this.#map.thinWallPieces({ q, r }) ?? true)
        : false,
    );
    const panes: BoardingShotPane[] = [];
    for (const position of crossed) {
      const feature = this.#featureAt(position);
      if (!feature) continue;
      this.#updateFeature(feature.id, boardingBrokenPane);
      panes.push(Object.freeze({ id: feature.id, at: position.at }));
    }
    return Object.freeze(panes);
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
    // sparad-gangdestination: a move of its own replaces an unfinished walk.
    this.#rememberDestination(actor.id, null);
    this.#takeSteps(actor, path.steps);
  }

  /** vand-mot-vald-ruta: turn towards a tile as far as the AP allows. */
  #face(toward: BoardingCell): void {
    const actor = this.#actor();
    for (const direction of boardingTurnsToward(
      actor.position,
      actor.facing,
      toward,
    )) {
      if (this.#state.activation!.remaining < BOARDING_TURN_AP) break;
      this.#spend(BOARDING_TURN_AP);
      this.#updatePerson(actor.id, (entry) => ({
        ...entry,
        facing: turnFacing(entry.facing, direction),
      }));
    }
  }

  /**
   * gang-mot-avlagset-mal / vandning-mot-nasta-steg / ap-fraktion-sparas /
   * sparad-gangdestination: walk as far as the AP allows, turn towards the
   * next step, then end the activation and keep the AP that did not cover
   * the next step for the next one.
   */
  #walk(destination: BoardingCell): void {
    const actor = this.#actor();
    const route = this.routeTowards(actor.id, destination);
    if (!route) throw new Error('No route to that tile.');
    const budget = this.#state.activation!.remaining;
    let spent = 0;
    let affordable = 0;
    for (const [index, step] of route.steps.entries()) {
      spent += step.cost;
      if (spent > budget) break;
      if (step.type === 'forward') affordable = index + 1;
    }
    let following = affordable;
    if (affordable === route.steps.length) {
      this.#rememberDestination(actor.id, null);
      this.#takeSteps(actor, route.steps);
      return;
    }
    this.#rememberDestination(actor.id, destination);
    if (this.#takeSteps(actor, route.steps.slice(0, affordable))) return;
    let left = this.#state.activation!.remaining;
    for (const step of route.steps.slice(affordable)) {
      if (step.type !== 'turn' || step.cost > left) break;
      left -= step.cost;
      following++;
    }
    if (this.#takeSteps(actor, route.steps.slice(affordable, following)))
      return;
    // ap-fraktion-sparas: whatever is below the next step's cost is saved.
    const next = route.steps[following];
    const remaining = this.#state.activation!.remaining;
    if (
      !next ||
      remaining >= next.cost ||
      this.#state.currentActorId !== actor.id
    )
      return;
    if (remaining > 0)
      this.#updatePerson(actor.id, (entry) => ({
        ...entry,
        carriedAp: remaining,
      }));
    this.#finishActivation();
  }

  #rememberDestination(id: string, destination: BoardingCell | null): void {
    this.#updatePerson(id, (person) => {
      const entry = { ...person };
      delete entry.destination;
      return destination
        ? { ...entry, destination: frozenCell(destination) }
        : entry;
    });
  }

  /** Takes route steps in order; true when something stopped the walk. */
  #takeSteps(actor: BoardingPerson, steps: BoardingPath['steps']): boolean {
    const knownHostiles =
      actor.side === 'civilian'
        ? new Set<string>()
        : this.#hostileIdsInSight(actor.side);
    for (const step of steps) {
      const current = this.#state.people.find(
        (entry) => entry.id === actor.id,
      )!;
      if (current.status !== 'active') return true;
      if (step.type === 'turn') {
        this.#spend(step.cost);
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
      return true;
    }
    return false;
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
    const reason = this.doorReason(actor.id, id, action);
    if (reason) throw new Error(reason);
    this.#spend(1);
    this.#updateFeature(id, (entry) => ({ ...entry, open: action === 'open' }));
  }

  #hack(id: string): void {
    const actor = this.#actor();
    if (actor.loadout.gadget !== 'hacker-tools')
      throw new Error('Hacker tools are not equipped.');
    const door = this.#state.features.find(
      (entry) => entry.id === id && entry.kind === 'door' && !entry.destroyed,
    );
    if (!door || !sharesEdge(actor.position, door.position) || !door.locked)
      throw new Error('Choose an adjacent locked door.');
    this.#spend(HACK_AP);
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
    // granat-kostar-bara-vid-kast: validate before any AP is spent.
    const reason = this.grenadeReason(this.#actor().id, grenade, target);
    if (reason) throw new Error(reason);
    const actor = this.#spend(GRENADE_AP);
    const die = this.#die(20);
    const difficulty = 8 + Math.ceil(distance(actor.position, target));
    let impact = frozenCell(target);
    if (die + actor.accuracy < difficulty) {
      const margin = difficulty - (die + actor.accuracy);
      const deviation = Math.min(3, Math.max(1, Math.ceil(margin / 5)));
      const direction = ADJACENT_DIRECTIONS[this.#die(8) - 1]!;
      for (let index = 0; index < deviation; index++) {
        const next = { q: impact.q + direction.q, r: impact.r + direction.r };
        // granat-over-halvskydd-inte-genom-vagg: a wall stops the scatter.
        if (this.#map.contains(next) && this.#stopsGrenade(next)) break;
        impact = frozenCell(next);
      }
      if (!this.#map.contains(impact)) impact = frozenCell(target);
    }
    this.#shot = Object.freeze({
      kind: 'grenade',
      grenade,
      from: frozenCell(actor.position),
      to: impact,
      presentationIndex: this.#presentation.length,
      hit: true,
    });
    this.#addNoise(
      impact,
      actor.side,
      grenade === 'smoke' ? 'smoke' : 'explosion',
    );
    if (grenade === 'smoke') {
      const amounts = new Map(
        this.#state.smoke.map((entry) => [positionKey(entry.position), entry]),
      );
      const add = (position: BoardingCell, amount: number) => {
        if (!this.#smokeCanFill(position)) return;
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
        if (this.#sealedApart(impact, position)) continue;
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
      loadout: {
        ...entry.loadout,
        uses: Math.max(0, (entry.loadout.uses ?? 0) - 1),
      },
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
      (target.status !== 'incapacitated' &&
        (target.status !== 'active' ||
          target.hitPoints >= target.maxHitPoints)) ||
      !sharesEdge(actor.position, target.position)
    )
      throw new Error('Choose an adjacent injured person.');
    if (actor.loadout.gadget !== 'med-kit')
      throw new Error('A Med kit is not equipped.');
    if ((actor.loadout.uses ?? 0) < 1) throw new Error('No Med kit remains.');
    this.#spend(MED_PACK_AP);
    this.#updatePerson(actor.id, (entry) => ({
      ...entry,
      loadout: {
        ...entry.loadout,
        uses: Math.max(0, (entry.loadout.uses ?? 0) - 1),
      },
    }));
    this.#updatePerson(targetId, (entry) => ({
      ...entry,
      status: 'active',
      hitPoints: Math.min(
        entry.maxHitPoints,
        Math.max(1, entry.hitPoints + Math.ceil(entry.maxHitPoints / 3)),
      ),
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
    if (exit.exit === 'escape-pod')
      this.#updateFeature(exit.id, (entry) => ({
        ...entry,
        destroyed: true,
      }));
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
      this.#spend(BOARDING_TURN_AP);
      this.#updatePerson(actor.id, (entry) => ({
        ...entry,
        facing: turnFacing(entry.facing, command.direction),
      }));
    } else if (command.type === 'move') this.#move(command.to);
    else if (command.type === 'face') this.#face(command.toward);
    else if (command.type === 'walk') this.#walk(command.to);
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
      if (actor.loadout.weapon !== 'rifle')
        throw new Error('A rifle is not equipped.');
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
      activation: saved ?? this.#startActivation(id),
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
    this.#replace({
      finishedActors,
      postponed: [],
      initiativeIndex: index,
      currentActorId: id,
      activation: this.#startActivation(id),
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
        if (this.#smokeCanFill(spread)) {
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

  /** testbordning-med-tva-skepp: the test goals lie in the boarded ship. */
  #inTargetShip(position: BoardingCell): boolean {
    const zone = this.#map.zoneAt(position);
    return zone !== 'attacker' && zone !== 'bridge';
  }

  #holds(room: 'bridge' | 'engineering', side: BoardingSide): boolean {
    return this.#state.people.some(
      (entry) =>
        entry.side === side &&
        entry.status === 'active' &&
        this.#inTargetShip(entry.position) &&
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
      this.#replace({
        lingeringPersonIds: (this.#state.lingeringPersonIds ?? []).filter(
          (id) => id !== initial.id,
        ),
      });
      this.#refreshKnowledge();
      let actor = this.#state.people.find((entry) => entry.id === initial.id)!;
      let remaining = startingActionPoints(actor);
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
      (entry) => entry.kind === 'reactor' && this.#inTargetShip(entry.position),
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

  /** fiender-soker-upp-bordare: a defender who reached a sound stops chasing it. */
  #forgetReachedSound(id: string): void {
    const listener = this.#state.people.find((entry) => entry.id === id);
    const heard = listener?.heardAt;
    if (
      !listener ||
      !heard ||
      Math.max(
        Math.abs(listener.position.q - heard.q),
        Math.abs(listener.position.r - heard.r),
      ) > 1
    )
      return;
    this.#updatePerson(id, (entry) => {
      const rest = { ...entry };
      delete rest.heardAt;
      return rest;
    });
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
      try {
        const command = chooseDefenderCommand(this, actor);
        this.#replace({
          log: [...this.#state.log, hiddenDefenderActivity(command)],
        });
        this.command(command);
      } catch {
        // forsvarartur-fastnar-inte: failed planning or actions still yield the turn.
        if (
          this.#state.phase === 'fighting' &&
          this.#state.currentActorId === beforeId
        )
          this.command({ type: 'end-activation' });
      }
      this.#forgetReachedSound(beforeId);
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
