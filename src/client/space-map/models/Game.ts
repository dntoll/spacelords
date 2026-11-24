import { engineCount } from './ShipEquipment.js';
export { engineCount } from './ShipEquipment.js';
import {
  TurnSimulation,
  type BattleReport,
  type Discovery,
  type SavedTurnSimulation,
} from './TurnSimulation.js';
import { Detection } from './Detection.js';
import {
  PirateFleet,
  type PirateSnapshot,
  type PirateMemory,
  type SavedPirateFleet,
} from './PirateFleet.js';
import type { CombatResult } from './FleetCombat.js';
import {
  TacticalBattle,
  maxHull,
  type BattleState,
  type BattleCommand,
  type BattleFleet,
  type BattlePiece,
} from '../../space-battle/models/index.js';
import {
  BoardingEngagement,
  type BoardingBattleState,
  type BoardingCommand,
  type BoardingShot,
} from '../../boarding/models/index.js';
import { Galaxy, Star, StarSystem, type MapCell } from './Galaxy.js';
import { HexCoordinate } from '../../common/HexCoordinate.js';
import { HexNavigation } from './HexNavigation.js';
import type { TerrainHex } from './Galaxy.js';
import {
  Planet,
  Player,
  type PlanetEnvironmentType,
  type PlanetSnapshot,
} from './Planet.js';
import { MATERIALS, emptyStock, type Stock } from './Economy.js';
import {
  ResearchPlan,
  TECHNOLOGIES,
  type Technology,
} from './research/Research.js';
import type { EventIllustration } from './turn/EventDetails.js';
import { FleetPursuit, type PursuingFleet } from './FleetPursuit.js';
export { TECHNOLOGIES, type Technology } from './research/Research.js';

import { type ShipType, SHIPS, type ShipUnit } from './Catalog.js';
import type {
  ResearchSnapshot,
  FleetSnapshot,
  GameEvent,
} from './GameSnapshots.js';
export * from './Catalog.js';
export * from './GameSnapshots.js';

export type GamePhase = 'planning' | 'simulating' | 'interrupted';

export interface TurnFrame {
  readonly encounters?: boolean;
  readonly settlement?: boolean;
  readonly combats?: readonly CombatResult[];
  readonly movements: readonly {
    readonly fleetId: string;
    readonly from: HexCoordinate;
    readonly to: HexCoordinate;
  }[];
}

interface Fleet {
  navigationIssue?: string;
  shipUnits?: ShipUnit[];
  id: string;
  name: string;
  position: HexCoordinate | null;
  destination: HexCoordinate | null;
  courseOrigin?: HexCoordinate;
  ships: Record<ShipType, number>;
  hold?: Stock;
}
const zeroShips = (): Record<ShipType, number> => ({
  'Colony ship': 0,
  'Exploration ship': 0,
  Fighter: 0,
  'Space pirate': 0,
  'Transport ship': 0,
  'Salvage ship': 0,
  'Civilian shuttle': 0,
  Raptor: 0,
});

interface SavedCoordinate {
  readonly q: number;
  readonly r: number;
}
interface SavedPlanet extends Omit<PlanetSnapshot, 'position'> {
  readonly position: SavedCoordinate;
}
interface SavedFleet extends Omit<
  Fleet,
  'position' | 'destination' | 'courseOrigin' | 'ships'
> {
  readonly position: SavedCoordinate | null;
  readonly destination: SavedCoordinate | null;
  readonly courseOrigin?: SavedCoordinate;
  readonly ships: Partial<Record<ShipType, number>>;
}

/** ap-pa-starmap: the parts of a round; `round` moves everyone together. */
export type TurnStage = 'round' | 'player' | 'enemy';

export interface GameState {
  readonly surveyedPlanets?: readonly string[];
  /** forskningstid: rounds spent per unfinished technology; absent in older saves. */
  readonly researchProgress?: Readonly<Record<string, number>>;
  // sparformat: only the current format loads; older saves are rejected.
  // single-fleet-rensning: version 18 drops the planet economy.
  readonly version: 18;
  readonly knownTerrain?: readonly string[];
  readonly visiblePirates?: readonly string[];
  readonly chartedPirates?: readonly string[];
  readonly knownObjects?: readonly string[];
  readonly simulation?: SavedTurnSimulation | null;
  readonly pirates?: readonly SavedPirateFleet[];
  readonly world: {
    readonly player: { readonly id: string; readonly name: string };
    readonly homePlanetId: string;
    readonly radius: number;
    readonly terrain?: readonly TerrainHex[];
    readonly systems: readonly {
      readonly planetDistance?: 1 | 2;
      readonly star: {
        readonly id: string;
        readonly name: string;
        readonly position: { readonly q: number; readonly r: number };
      };
      readonly planets: readonly SavedPlanet[];
    }[];
  };
  readonly round: number;
  readonly phase: 'planning' | 'interrupted';
  /** ap-pa-starmap: whose part of the round an interruption paused. */
  readonly turnStage?: TurnStage;
  /** ap-pa-starmap: unspent movement per fleet, in sixtieths of a round. */
  readonly actionTime?: Readonly<Record<string, number>>;
  /** ap-pa-starmap: the player's AP are spent and the enemies act next. */
  readonly enemyTurnPending?: boolean;
  readonly sequence: number;
  readonly researched: readonly Technology[];
  readonly researchTarget: Technology | null;
  readonly researchQueue: readonly Technology[];
  readonly fleets: readonly SavedFleet[];
  readonly explored: readonly string[];
  readonly events: readonly GameEvent[];
}

/** Private mutable game state; views receive only immutable snapshots. */
export class Game {
  #surveyedPlanets = new Set<string>();
  #research = new ResearchPlan();
  #round = 1;
  #stage: TurnStage = 'round';
  /** ap-pa-starmap: the fleet's unspent movement, in sixtieths of a round. */
  #actionTime = 60;
  #enemyPending = false;
  #phase: GamePhase = 'planning';
  #sequence = 1;
  /** enda-spelarflottan: the player has exactly one fleet. */
  #fleet: Fleet;
  #pirates: PirateFleet[];
  #explored = new Set<string>();
  #knownTerrain = new Set<string>();
  readonly #navigation: HexNavigation;
  #visible: ReadonlySet<string> = new Set();
  #visiblePirates = new Set<string>();
  #chartedPirates = new Set<string>();
  #events: GameEvent[] = [];
  #knownObjects = new Set<string>();
  #simulation: TurnSimulation | null = null;
  #pendingFrame: TurnFrame | null = null;
  #mapCells: readonly MapCell[] | null = null;
  /** obruten-resa: immutable map snapshots reuse unchanged cells. */
  readonly #changedMapCells = new Set<string>();

  constructor(readonly galaxy: Galaxy) {
    this.#navigation = new HexNavigation(galaxy);
    this.#pirates = PirateFleet.seed(galaxy);
    this.#reveal(galaxy.homePlanet.position);
    this.#fleet = {
      id: 'fleet-home',
      name: 'Home Fleet',
      position: galaxy.homePlanet.position,
      destination: null,
      // startflotta-med-raptor: the game begins with a single Raptor.
      ships: { ...zeroShips(), Raptor: 1 },
    };
    this.#normalizeShips();
    if (this.#fleet.shipUnits)
      this.#fleet.shipUnits = this.#fleet.shipUnits.map((unit) =>
        unit.type === 'Fighter' && unit.missiles === undefined
          ? { ...unit, missiles: 0 }
          : unit,
      );
    this.#updateSight();
    this.#updateSight();
    this.#visiblePirates = new Set(
      this.pirateSnapshots().map((pirate) => pirate.id),
    );
    this.#visibleDiscoveries().forEach((discovery) =>
      this.#knownObjects.add(discovery.id),
    );
    this.#surveyedPlanets.add(galaxy.homePlanet.id);
  }

  // spara-avbrutet-ar: only planning and discovery checkpoints are serializable.
  exportState(): GameState {
    if (this.#phase === 'simulating')
      throw new Error('Wait for the turn to finish before saving.');
    return structuredClone({
      version: 18,
      surveyedPlanets: [...this.#surveyedPlanets],
      knownTerrain: [...this.#knownTerrain],
      researchProgress: Object.fromEntries(this.#research.progress),
      visiblePirates: [...this.#visiblePirates],
      chartedPirates: [...this.#chartedPirates],
      knownObjects: [...this.#knownObjects],
      simulation: this.#simulation?.snapshot() ?? null,
      pirates: this.#pirates.map((pirate) => pirate.snapshot()),
      world: {
        player: { id: this.galaxy.player.id, name: this.galaxy.player.name },
        homePlanetId: this.galaxy.homePlanet.id,
        radius: this.galaxy.radius,
        terrain: this.galaxy.terrain,
        systems: this.galaxy.systems.map((system) => ({
          planetDistance: system.planetDistance,
          star: {
            id: system.star.id,
            name: system.star.name,
            position: system.star.position,
          },
          planets: system.planets.map((planet) => ({ ...planet })),
        })),
      },
      round: this.#round,
      phase: this.#phase,
      ...(this.#simulation && this.#stage !== 'round'
        ? { turnStage: this.#stage }
        : {}),
      ...(this.#actionTime !== 60
        ? { actionTime: { [this.#fleet.id]: this.#actionTime } }
        : {}),
      ...(this.#enemyPending ? { enemyTurnPending: true } : {}),
      sequence: this.#sequence,
      researched: [...this.#research.completed],
      researchTarget: this.#research.queue[0] ?? null,
      researchQueue: this.#research.queue,
      // enda-spelarflottan: the save format keeps a list of exactly one.
      fleets: [this.#fleet],
      explored: [...this.#explored],
      events: this.#events,
    });
  }

  static restore(state: GameState): Game {
    if (
      state.version !== 18 ||
      !Number.isSafeInteger(state.round) ||
      state.round < 1 ||
      !Number.isSafeInteger(state.sequence) ||
      state.sequence < 1 ||
      !['planning', 'interrupted'].includes(state.phase)
    )
      throw new Error('This saved game cannot be loaded.');
    const position = (point: {
      readonly q: number;
      readonly r: number;
    }): HexCoordinate => new HexCoordinate(point.q, point.r);
    const world = state.world;
    const galaxy = new Galaxy(
      new Player(world.player.id, world.player.name),
      world.systems.map(
        (system) =>
          new StarSystem(
            new Star(
              system.star.id,
              system.star.name,
              position(system.star.position),
            ),
            system.planets.map(
              (planet) =>
                new Planet({
                  ...planet,
                  position: position(planet.position),
                }),
            ),
            system.planetDistance ?? 1,
          ),
      ),
      world.homePlanetId,
      world.radius,
      world.terrain ?? [],
    );
    const game = new Game(galaxy);
    const copy = structuredClone(state) as Omit<
      GameState,
      'researched' | 'researchQueue'
    > & {
      researched: string[];
      researchQueue: string[];
    };
    if (!Array.isArray(state.pirates))
      throw new Error('Missing saved pirate fleets.');
    game.#pirates = copy.pirates!.map((pirate) =>
      PirateFleet.restore(
        pirate,
        galaxy,
        copy.phase === 'interrupted' &&
          (copy.simulation?.tacticalBattles ?? []).some((battle) =>
            battle.fleets.some(
              (fleet) => fleet.id === pirate.id && fleet.side === 'enemy',
            ),
          ),
      ),
    );
    const ids = [
      ...copy.fleets.map((fleet) => fleet.id),
      ...game.#pirates.map((pirate) => pirate.id),
    ];
    if (new Set(ids).size !== ids.length)
      throw new Error('Duplicate fleet ID.');
    game.#round = copy.round;
    game.#phase = 'planning';
    const time = copy.actionTime?.[copy.fleets[0]?.id ?? ''];
    if (time !== undefined && Number.isFinite(time) && time >= 0 && time <= 60)
      game.#actionTime = time;
    game.#enemyPending = copy.enemyTurnPending === true;
    game.#sequence = copy.sequence;
    const isTechnology = (technology: string): technology is Technology =>
      TECHNOLOGIES.includes(technology as Technology);
    const researched = copy.researched.filter(isTechnology);
    const researchQueue = copy.researchQueue.filter(isTechnology);
    game.#research = new ResearchPlan(
      new Set(researched),
      [...researchQueue],
      new Map(
        Object.entries(copy.researchProgress ?? {}).filter(
          (entry): entry is [Technology, number] =>
            isTechnology(entry[0]) &&
            Number.isInteger(entry[1]) &&
            entry[1] > 0 &&
            !researched.includes(entry[0]),
        ),
      ),
    );
    if (copy.fleets.length !== 1)
      throw new Error('A saved game has exactly one fleet.');
    {
      const {
        position: current,
        destination,
        courseOrigin,
        ships,
        ...rest
      } = copy.fleets[0]!;
      const fleet = { ...rest, ships: { ...zeroShips(), ...ships } };
      const empty = game.#shipCount(fleet.ships) === 0;
      if (!empty && !current)
        throw new Error('A fleet with ships needs a position.');
      game.#fleet = {
        ...fleet,
        ships: { ...fleet.ships },
        position: empty ? null : position(current!),
        destination: !empty && destination ? position(destination) : null,
        ...(!empty && courseOrigin
          ? { courseOrigin: position(courseOrigin) }
          : {}),
      };
    }
    game.#fleet.name = game.#fleet.name.trim().slice(0, 40) || 'Fleet';
    game.#fleet.ships = { ...zeroShips(), ...game.#fleet.ships };
    game.#normalizeShips();
    game.#explored = new Set(copy.explored);
    const planetIds = new Set(
      galaxy.systems.flatMap((system) =>
        system.planets.map((planet) => planet.id),
      ),
    );
    const surveyedPlanets: unknown = copy.surveyedPlanets;
    if (
      surveyedPlanets !== undefined &&
      (!Array.isArray(surveyedPlanets) ||
        surveyedPlanets.some(
          (id: unknown) => typeof id !== 'string' || !planetIds.has(id),
        ))
    )
      throw new Error('Invalid surveyed planets.');
    const restoredSurveyed =
      surveyedPlanets === undefined
        ? (state.knownObjects ?? []).filter((id) => planetIds.has(id))
        : (surveyedPlanets as string[]);
    game.#surveyedPlanets = new Set(restoredSurveyed);
    game.#knownTerrain = new Set(copy.knownTerrain ?? copy.explored);
    for (const key of game.#knownTerrain) {
      const coordinates = key.split(',').map(Number);
      if (
        coordinates.length !== 2 ||
        coordinates.some((value) => !Number.isInteger(value)) ||
        !galaxy.contains(new HexCoordinate(coordinates[0]!, coordinates[1]!))
      )
        throw new Error('Invalid known terrain.');
    }
    game.#events = copy.events
      .filter(
        (event) =>
          !/^Fleet .* moved to -?\d+,-?\d+\.$|^Exploration from .* revealed \d+ hexes\.$/.test(
            event.text,
          ),
      )
      .map((event) => {
        const { position: eventPosition, ...details } = event;
        const valid =
          eventPosition &&
          Number.isSafeInteger(eventPosition.q) &&
          Number.isSafeInteger(eventPosition.r) &&
          galaxy.contains(position(eventPosition));
        return Object.freeze({
          ...details,
          ...(details.illustration
            ? { illustration: Object.freeze({ ...details.illustration }) }
            : {}),
          ...(details.lines
            ? {
                lines: Object.freeze(
                  details.lines.map((line) =>
                    Object.freeze({
                      ...line,
                      ...(line.illustration
                        ? {
                            illustration: Object.freeze({
                              ...line.illustration,
                            }),
                          }
                        : {}),
                    }),
                  ),
                ),
              }
            : {}),
          ...(details.combatLog
            ? { combatLog: Object.freeze([...details.combatLog]) }
            : {}),
          ...(valid ? { position: Object.freeze({ ...eventPosition }) } : {}),
        });
      });
    game.#updateSight();
    if (!Array.isArray(copy.knownObjects))
      throw new Error('Missing discovered objects.');
    game.#knownObjects = new Set<string>(copy.knownObjects);
    if (state.phase === 'interrupted') {
      game.#simulation = TurnSimulation.restore(
        copy.simulation!,
        new Set(ids),
        (point) =>
          Number.isInteger(point?.q) &&
          Number.isInteger(point?.r) &&
          !!galaxy.cellAt(position(point)),
      );
      game.#phase = 'interrupted';
      game.#stage =
        copy.turnStage === 'player' || copy.turnStage === 'enemy'
          ? copy.turnStage
          : 'round';
      game.#validateTacticalParticipants();
      // avbryt-gammal-bordning-vid-laddning
      const boarding = game.#simulation.boarding;
      if (boarding?.outdated) game.#resolveBoarding(boarding);
    } else if (copy.simulation)
      throw new Error('Unexpected interrupted round.');
    if (
      !Array.isArray(copy.visiblePirates) ||
      copy.visiblePirates.some(
        (id) => !game.#pirates.some((pirate) => pirate.id === id),
      )
    )
      throw new Error('Invalid saved pirate contacts.');
    game.#visiblePirates = new Set<string>(copy.visiblePirates);
    const chartedPirates = state.chartedPirates ?? [];
    if (
      state.chartedPirates !== undefined &&
      (!Array.isArray(state.chartedPirates) ||
        chartedPirates.some(
          (id) => !game.#pirates.some((pirate) => pirate.id === id),
        ))
    )
      throw new Error('Invalid charted pirate contacts.');
    game.#chartedPirates = new Set(chartedPirates);
    for (const pirate of game.#pirates)
      if (game.#chartedPirates.has(pirate.id) && !pirate.lastKnownPosition)
        pirate.observe();
    const recoveredBoarding = game.#simulation?.boarding;
    if (recoveredBoarding?.battle.snapshot.phase === 'complete')
      game.#resolveBoarding(recoveredBoarding);
    game.#linkInterruptionEvents();
    // Recover older saves made after the last enemy ship was captured.
    const battle = game.#simulation?.tacticalBattles[0];
    if (battle && !game.#simulation?.boarding && battle.finishIfDecided())
      game.#finishTacticalBattle();
    // Exercise derived data before accepting a stored record.
    game.mapSnapshot();
    game.fleetSnapshot();
    return game;
  }

  get round(): number {
    return this.#round;
  }
  get phase(): GamePhase {
    return this.#phase;
  }
  get events(): readonly GameEvent[] {
    return Object.freeze([...this.#events]);
  }

  mapSnapshot(): readonly MapCell[] {
    if (!this.#mapCells || this.#changedMapCells.size)
      this.#mapCells = this.galaxy.mapSnapshot(
        this.#explored,
        this.#visible,
        this.#knownTerrain,
        new Map(
          this.galaxy.systems
            .flatMap((system) => system.planets)
            .map((planet) => [planet.id, planet.environmentType]),
        ),
        this.#surveyedPlanets,
        this.#mapCells ?? undefined,
        this.#changedMapCells,
      );
    this.#changedMapCells.clear();
    return this.#mapCells;
  }
  mapCellAt(position: HexCoordinate): MapCell | null {
    return this.galaxy.snapshotCell(position, this.mapSnapshot());
  }
  // planetinformation-pa-kartan: unknown planets never cross the read-model boundary.
  planetIntel(position: HexCoordinate):
    | Readonly<{
        id: string;
        name: string;
        surveyed: false;
        environment?: PlanetEnvironmentType | 'Gas';
        habitability?: number;
        resources?: PlanetSnapshot['resources'];
      }>
    | Readonly<{
        id: string;
        name: string;
        surveyed: true;
        environment: PlanetEnvironmentType | 'Gas';
        habitability: number;
        resources: PlanetSnapshot['resources'];
      }>
    | null {
    const planet = this.galaxy.systems
      .flatMap((system) => system.planets)
      .find((candidate) => candidate.position.key === position.key);
    if (!planet || !this.#knownObjects.has(planet.id)) return null;
    if (!this.#surveyedPlanets.has(planet.id))
      return Object.freeze({
        id: planet.id,
        name: planet.name,
        surveyed: false,
      });
    return Object.freeze({
      id: planet.id,
      name: planet.name,
      surveyed: true,
      environment: planet.environmentType,
      habitability: planet.habitability,
      resources: planet.resources,
    });
  }
  planetKnowledge(position: HexCoordinate): Readonly<{
    name: string;
    environment: PlanetEnvironmentType | 'Gas';
    habitability: number;
  }> | null {
    const intel = this.planetIntel(position);
    return intel?.surveyed
      ? Object.freeze({
          name: intel.name,
          environment: intel.environment,
          habitability: intel.habitability,
        })
      : null;
  }
  get research(): ResearchSnapshot {
    return Object.freeze({
      available: TECHNOLOGIES,
      completed: Object.freeze([...this.#research.completed]),
      selected: this.#research.queue[0] ?? null,
      queue: Object.freeze([...this.#research.queue]),
      progress: Object.freeze(Object.fromEntries(this.#research.progress)),
    });
  }

  selectResearch(type: Technology | null): void {
    this.#requirePlanning();
    if (type === null) this.#research.queue = [];
    else this.#research.add(type);
  }
  moveResearch(type: Technology, index: number): void {
    this.#requirePlanning();
    this.#research.move(type, index);
  }
  removeResearch(type: Technology): void {
    this.#requirePlanning();
    this.#research.remove(type);
  }

  // planetutforskning-vid-ankomst: details are learned only after an
  // Exploration ship or a Raptor survives arrival and any combat there.
  #completePlanetExplorations(): readonly Discovery[] {
    const fleet = this.#fleet;
    if (
      !fleet.position ||
      (!fleet.ships['Exploration ship'] && !fleet.ships.Raptor)
    )
      return Object.freeze([]);
    const planet = this.galaxy.systems
      .flatMap((system) => system.planets)
      .find((candidate) => candidate.position.key === fleet.position!.key);
    if (
      !planet ||
      !this.#knownObjects.has(planet.id) ||
      this.#surveyedPlanets.has(planet.id) ||
      this.#hostileAt(planet.position)
    )
      return Object.freeze([]);
    this.#surveyedPlanets.add(planet.id);
    const eventId = this.#event(
      `Planet explored: ${planet.name}.`,
      planet.position,
    );
    this.#changedMapCells.add(planet.position.key);
    return Object.freeze([
      {
        eventId,
        id: planet.id,
        kind: 'planet-explored' as const,
        name: planet.name,
        position: planet.position,
        fleetId: fleet.id,
      },
    ]);
  }
  pirateSnapshots(): readonly PirateSnapshot[] {
    return Object.freeze(
      this.#pirates
        .filter((pirate) => this.#visible.has(pirate.position.key))
        .map((pirate) => pirate.snapshot()),
    );
  }

  /** pirat-minne-efter-sikt: expose only a contact's last observed location. */
  pirateMemories(): readonly PirateMemory[] {
    return Object.freeze(
      this.#pirates
        .filter(
          (pirate) =>
            pirate.lastKnownPosition && !this.#visible.has(pirate.position.key),
        )
        .map((pirate) =>
          Object.freeze({
            position: pirate.lastKnownPosition!,
            moved: pirate.movedSinceSeen,
            pirate: Object.freeze({
              ...pirate.snapshot(),
              position: pirate.lastKnownPosition!,
            }),
          }),
        ),
    );
  }

  /** enda-spelarflottan: the player's only fleet. */
  fleetSnapshot(): FleetSnapshot {
    const fleet = this.#fleet;
    return Object.freeze({
      id: fleet.id,
      name: this.#fleetDisplayName(fleet),
      ownName: fleet.name,
      detectionRange: this.#fleetDetectionRange(fleet),
      navigationIssue: fleet.navigationIssue,
      remainingMovement: this.#simulation
        ? this.#simulation.movement(
            fleet.id,
            fleet.position
              ? this.#navigation.stepSpeed(
                  fleet.position,
                  fleet.position,
                  this.#speed(fleet),
                )
              : this.#speed(fleet),
          )
        : undefined,
      actionPoints: this.#actionPoints(fleet),
      canIssueOrders: this.canIssueFleetOrders(fleet.id),
      position: fleet.position,
      destination: fleet.destination,
      ships: Object.freeze({ ...fleet.ships }),
      shipUnits: Object.freeze(
        fleet.shipUnits!.map((unit) =>
          Object.freeze({
            ...unit,
            engines: Object.freeze({ ...unit.engines }),
          }),
        ),
      ),
      speed: this.#speed(fleet),
      crew: this.#crew(fleet.ships),
      cargo: Object.freeze(this.#cargo(fleet.id)),
    });
  }
  fleet(id: string): FleetSnapshot | null {
    return id === this.#fleet.id ? this.fleetSnapshot() : null;
  }

  #hostileAt(position: HexCoordinate): boolean {
    return this.#pirates.some(
      (pirate) => pirate.hasShips && pirate.position.key === position.key,
    );
  }

  renameFleet(id: string, name: string): void {
    this.#requirePlanning();
    const fleet = this.#fleetState(id);
    const clean = name.trim();
    if (!clean || clean.length > 40)
      throw new Error('Fleet names must be 1–40 characters.');
    fleet.name = clean;
  }
  setDestination(id: string, destination: HexCoordinate): void {
    this.#requireFleetOrders(id);
    if (!this.galaxy.cellAt(destination))
      throw new Error('Choose a hex on the map.');
    if (
      this.galaxy.isStar(destination) ||
      (this.#knownTerrain.has(destination.key) &&
        !this.galaxy.isPassable(destination))
    )
      throw new Error('This hex is impassable.');
    const fleet = this.#fleetState(id);
    if (this.#shipCount(fleet.ships) === 0)
      throw new Error('Empty fleets cannot receive destinations.');
    fleet.destination = destination;
    delete fleet.navigationIssue;
    fleet.courseOrigin = fleet.position!;
  }
  /** hexval-med-vag: the route a fleet would take, without giving the order. */
  routePreview(id: string, target: HexCoordinate): readonly HexCoordinate[] {
    const fleet = this.#fleetState(id);
    if (!fleet.position || !this.galaxy.cellAt(target))
      return Object.freeze([]);
    return Object.freeze([
      ...this.#navigation.path(
        fleet.position,
        target,
        this.#speed(fleet),
        this.#knownTerrain,
        fleet.destination?.key === target.key
          ? (fleet.courseOrigin ?? fleet.position)
          : fleet.position,
      ),
    ]);
  }
  routeOrigin(id: string, target: HexCoordinate): HexCoordinate | null {
    const fleet = this.#fleetState(id);
    return fleet.destination?.key === target.key
      ? (fleet.courseOrigin ?? fleet.position)
      : fleet.position;
  }
  clearDestination(id: string): void {
    this.#requireFleetOrders(id);
    this.#fleetState(id).destination = null;
    delete this.#fleetState(id).courseOrigin;
  }
  get interruption(): SavedTurnSimulation | null {
    return this.#phase === 'interrupted' ? this.#simulation!.snapshot() : null;
  }
  get tacticalBattle(): BattleState | null {
    const battle = this.#simulation?.tacticalBattles[0];
    if (!battle) return null;
    if (battle.shift?.kind === 'boarding') return null;
    return battle.visibleSnapshot;
  }
  get boardingDefenderActing(): boolean {
    if (
      !this.#simulation?.boarding ||
      this.#simulation.tacticalBattles[0]?.shift?.kind === 'space'
    )
      return false;
    const boarding = this.#simulation.boarding.battle.snapshot;
    if (boarding.phase !== 'fighting') return false;
    const actor = boarding.people.find(
      (person) => person.id === boarding.currentActorId,
    );
    return actor?.side === 'defender' && actor.status === 'active';
  }
  get boardingBattle(): BoardingBattleState | null {
    const simulation = this.#simulation;
    if (
      !simulation?.boarding ||
      simulation.tacticalBattles[0]?.shift?.kind === 'space'
    )
      return null;
    return simulation.boarding.battle.visibleSnapshot;
  }
  get boardingPresentation(): readonly BoardingBattleState[] {
    if (!this.boardingBattle) return [];
    return this.#simulation!.boarding!.battle.presentation;
  }
  get boardingShot(): BoardingShot | null {
    if (!this.boardingBattle) return null;
    return this.#simulation!.boarding!.battle.shot;
  }
  #validateTacticalParticipants(): void {
    const used = new Set<string>();
    for (const battle of this.#simulation!.tacticalBattles) {
      const state = battle.snapshot;
      const position = new HexCoordinate(state.position.q, state.position.r);
      if (
        !state.fleets.some((f) => f.side === 'player') ||
        !state.fleets.some((f) => f.side === 'enemy')
      )
        throw new Error('Missing battle participants.');
      for (const participant of state.fleets) {
        if (used.has(participant.id))
          throw new Error('Duplicate battle participant.');
        used.add(participant.id);
        const pieces = state.pieces.filter((p) => p.fleetId === participant.id);
        const fleet =
          participant.side === 'player'
            ? this.#fleetById(participant.id)
            : this.#pirates.find((f) => f.id === participant.id);
        if (!fleet || fleet.position?.key !== position.key)
          throw new Error('Battle fleet is not at the encounter.');
        if (participant.side === 'player') {
          const units = this.#fleetState(participant.id).shipUnits!;
          if (
            pieces.length !== units.length ||
            pieces.some(
              (p) =>
                !units.some((unit) => unit.id === p.id && unit.type === p.type),
            )
          )
            throw new Error('Battle ships do not match their fleet.');
        } else {
          const pirate = this.#pirates.find((f) => f.id === participant.id)!;
          const remaining = pieces.filter((p) => p.side === 'enemy');
          if (
            remaining.filter((piece) => piece.type === 'Space pirate')
              .length !== pirate.count ||
            remaining.filter((piece) => piece.type === 'Transport ship')
              .length !== pirate.transports ||
            remaining.some((piece) => {
              const prefix =
                piece.type === 'Space pirate'
                  ? `${pirate.id}:ship-`
                  : piece.type === 'Transport ship'
                    ? `${pirate.id}:transport-`
                    : '';
              return (
                !prefix ||
                !piece.id.startsWith(prefix) ||
                !/^[1-9]\d*$/.test(piece.id.slice(prefix.length))
              );
            })
          )
            throw new Error('Invalid pirate participants.');
        }
        if (participant.retreat) {
          const retreat = new HexCoordinate(
            participant.retreat.q,
            participant.retreat.r,
          );
          if (
            position.distanceTo(retreat) !== 1 ||
            !this.galaxy.isPassable(retreat)
          )
            throw new Error('Invalid battle retreat hex.');
        }
      }
    }
  }
  commandBattle(command: BattleCommand): BattleState {
    const battle = this.#simulation?.tacticalBattles[0];
    if (this.#phase !== 'interrupted' || !battle)
      throw new Error('No tactical battle is active.');
    if (battle.shift?.kind === 'boarding')
      throw new Error('Finish the boarding rounds first.');
    const destroyed = battle.snapshot.pieces
      .filter((piece) => piece.dockedWith && piece.status === 'active')
      .map((piece) => piece.id);
    const beforeRound = battle.snapshot.round;
    battle.command(command);
    for (const id of destroyed) {
      const piece = battle.snapshot.pieces.find((entry) => entry.id === id);
      if (piece?.status === 'destroyed' || piece?.status === 'wreck')
        this.#boardingShipDestroyed(id);
    }
    this.#syncBoarding(battle);
    this.#tickSpaceShift(battle, beforeRound);
    const result = battle.snapshot;
    this.#finishTacticalBattle();
    return result;
  }
  finishBoarding(outcome: 'victory' | 'defeat' | 'aborted' = 'aborted'): void {
    const engagement = this.#simulation?.boarding;
    const battle = this.#simulation?.tacticalBattles[0];
    if (!engagement || !battle) return;
    engagement.battle.finish(outcome);
    this.#resolveBoarding(engagement);
  }
  commandBoarding(command: BoardingCommand): BoardingBattleState {
    const simulation = this.#simulation;
    const engagement = simulation?.boarding;
    const battle = simulation?.tacticalBattles[0];
    if (this.#phase !== 'interrupted' || !engagement || !battle)
      throw new Error('No boarding is active.');
    if (battle.shift?.kind === 'space')
      throw new Error('Finish the space combat rounds first.');
    engagement.battle.command(command);
    return this.#afterBoarding(engagement, battle);
  }
  playBoardingActivation(singleStep = false): BoardingBattleState {
    const simulation = this.#simulation;
    const engagement = simulation?.boarding;
    const battle = simulation?.tacticalBattles[0];
    if (this.#phase !== 'interrupted' || !engagement || !battle)
      throw new Error('No boarding is active.');
    engagement.battle.actAutomatically(singleStep);
    return this.#afterBoarding(engagement, battle);
  }
  #afterBoarding(
    engagement: BoardingEngagement,
    battle: TacticalBattle,
  ): BoardingBattleState {
    const state = engagement.battle.snapshot;
    if (state.round > engagement.seenRound) {
      engagement.seenRound = state.round;
      if (battle.tickShiftRound() === 'space') battle.setShift('space', 2);
    }
    if (state.phase === 'complete') this.#resolveBoarding(engagement);
    return engagement.battle.visibleSnapshot;
  }
  playBattleActivation(
    singleStep = false,
    options?: { readonly allowDock?: boolean },
  ): BattleState {
    const battle = this.#simulation?.tacticalBattles[0];
    if (this.#phase !== 'interrupted' || !battle)
      throw new Error('No tactical battle is active.');
    if (battle.shift?.kind === 'boarding')
      throw new Error('Finish the boarding rounds first.');
    const beforeRound = battle.snapshot.round;
    battle.actAutomatically(singleStep, options);
    this.#syncBoarding(battle);
    this.#tickSpaceShift(battle, beforeRound);
    const result = battle.snapshot;
    this.#finishTacticalBattle();
    return result;
  }
  #tickSpaceShift(battle: TacticalBattle, beforeRound: number): void {
    if (
      !this.#simulation?.boarding ||
      battle.shift?.kind !== 'space' ||
      battle.snapshot.round <= beforeRound
    )
      return;
    if (battle.tickShiftRound() === 'boarding') battle.setShift('boarding', 2);
  }
  #syncBoarding(battle: TacticalBattle): void {
    const pending = battle.consumeBoardingReady();
    if (!pending || this.#simulation!.boarding) return;
    const attacker = battle.snapshot.pieces.find(
      (piece) => piece.id === pending.attackerId,
    )!;
    const defender = battle.snapshot.pieces.find(
      (piece) => piece.id === pending.defenderId,
    )!;
    this.#simulation!.boarding = BoardingEngagement.start(
      attacker.id,
      defender.id,
      attacker.type,
      defender.type,
      attacker.side === 'player',
      battle.snapshot.random,
    );
    battle.setShift('boarding', 2);
  }
  #boardingShipDestroyed(pieceId: string): void {
    const simulation = this.#simulation;
    const battle = simulation?.tacticalBattles[0];
    const engagement = simulation?.boarding;
    if (!battle || !engagement) return;
    if (
      engagement.attackerId !== pieceId &&
      engagement.defenderId !== pieceId
    ) {
      battle.unlockDock(pieceId);
      return;
    }
    this.#event('A locked ship was destroyed. Boarding ends.');
    battle.unlockDock(pieceId);
    simulation.boarding = null;
    battle.clearShift();
  }
  #resolveBoarding(engagement: BoardingEngagement): void {
    const simulation = this.#simulation!;
    const battle = simulation.tacticalBattles[0]!;
    const outcome = engagement.battle.snapshot.outcome;
    const attacker = battle.snapshot.pieces.find(
      (piece) => piece.id === engagement.attackerId,
    );
    const defender = battle.snapshot.pieces.find(
      (piece) => piece.id === engagement.defenderId,
    );
    if (outcome === 'aborted' || !attacker || !defender) {
      battle.unlockDock(engagement.attackerId);
      simulation.boarding = null;
      battle.clearShift();
      this.#event('Boarding aborted. The ships undock.');
      return;
    }
    const winner: 'player' | 'enemy' =
      outcome === 'victory' ? 'player' : 'enemy';
    this.#captureBattleShip(attacker, winner);
    this.#captureBattleShip(defender, winner);
    this.#grantBoardingRewards(winner);
    simulation.boarding = null;
    battle.clearShift();
    this.#event(
      winner === 'player'
        ? 'Boarding won. Both ships join your fleet.'
        : 'Boarding lost. Pirates take both ships.',
    );
    if (battle.finishIfDecided()) this.#finishTacticalBattle();
  }
  #captureBattleShip(piece: BattlePiece, winner: 'player' | 'enemy'): void {
    const battle = this.#simulation!.tacticalBattles[0]!;
    if (piece.side === winner) {
      battle.unlockDock(piece.id);
      return;
    }
    if (winner === 'player') {
      const fleet = this.#fleet;
      const pirate = this.#pirates.find((entry) => entry.id === piece.fleetId);
      if (pirate) {
        if (piece.type === 'Space pirate')
          pirate.count = Math.max(0, pirate.count - 1);
        if (piece.type === 'Transport ship') {
          pirate.transports = Math.max(0, pirate.transports - 1);
          fleet.hold = this.#mergeHold(fleet.hold, pirate.hold);
          pirate.hold = emptyStock();
        }
      }
      if (!fleet.shipUnits!.some((unit) => unit.id === piece.id)) {
        fleet.ships[piece.type] += 1;
        fleet.shipUnits!.push({
          id: piece.id,
          type: piece.type,
          engines: { 'Rocket engine': 1, 'Ion pulse engine': 0 },
        });
      }
      fleet.position ??= new HexCoordinate(
        battle.snapshot.position.q,
        battle.snapshot.position.r,
      );
      battle.transferPiece(piece.id, fleet.id, 'player');
      return;
    }
    const pirate =
      this.#pirates.find((entry) =>
        battle.snapshot.pieces.some(
          (candidate) =>
            candidate.fleetId === entry.id && candidate.side === 'enemy',
        ),
      ) ?? this.#pirates[0];
    if (!pirate) return;
    const playerFleet = this.#fleetById(piece.fleetId);
    if (playerFleet) {
      playerFleet.shipUnits = playerFleet.shipUnits!.filter(
        (unit) => unit.id !== piece.id,
      );
      playerFleet.ships[piece.type] = Math.max(
        0,
        playerFleet.ships[piece.type] - 1,
      );
      if (piece.type === 'Transport ship' && playerFleet.hold) {
        pirate.hold = this.#mergeHold(pirate.hold, playerFleet.hold);
        delete playerFleet.hold;
      }
      this.#releaseEmptyFleet(playerFleet);
    }
    if (piece.type === 'Space pirate' || piece.type === 'Raptor')
      pirate.count += 1;
    else pirate.transports += 1;
    battle.transferPiece(piece.id, pirate.id, 'enemy');
  }
  #mergeHold(base: Stock | undefined, extra: Stock | undefined): Stock {
    const hold = { ...emptyStock(), ...base };
    if (extra)
      for (const material of MATERIALS) hold[material] += extra[material];
    return hold;
  }
  #grantBoardingRewards(winner: 'player' | 'enemy'): void {
    if (winner !== 'player') return;
    const here = new HexCoordinate(
      this.#simulation!.tacticalBattles[0]!.snapshot.position.q,
      this.#simulation!.tacticalBattles[0]!.snapshot.position.r,
    );
    const other = this.#pirates
      .filter((pirate) => pirate.hasShips && pirate.position.key !== here.key)
      .sort(
        (a, b) =>
          a.position.distanceTo(here) - b.position.distanceTo(here) ||
          a.id.localeCompare(b.id),
      )[0];
    const origin = other?.position;
    if (!origin) return;
    for (const offset of HexCoordinate.disk(4)) {
      const hex = new HexCoordinate(origin.q + offset.q, origin.r + offset.r);
      if (this.galaxy.cellAt(hex) && !this.#explored.has(hex.key)) {
        this.#explored.add(hex.key);
        this.#changedMapCells.add(hex.key);
      }
    }
    this.#chartedPirates.add(other.id);
    other.observe();
    this.#updateSight();
    this.#event('Captured charts reveal a pirate presence.');
  }
  #createTacticalBattles(): TacticalBattle[] {
    const fleet = this.#fleet;
    const positions =
      fleet.position &&
      this.#shipCount(fleet.ships) &&
      this.#hostileAt(fleet.position)
        ? [fleet.position]
        : [];
    return positions.map((position) => {
      const fleets: BattleFleet[] = [fleet].map((f) => {
        return {
          id: f.id,
          side: 'player',
          retreat: this.#retreatHex(f.id, position, false),
          ships: f.shipUnits!.map((unit) => ({
            id: unit.id,
            type: unit.type,
            ion: unit.engines['Ion pulse engine'] > 0,
            towing: false,
            missiles: unit.type === 'Fighter' ? (unit.missiles ?? 2) : 0,
            armored: unit.armored === true,
            ...(unit.damage ? { damage: unit.damage } : {}),
          })),
        };
      });
      fleets.push(
        ...this.#pirates
          .filter((p) => p.position.key === position.key)
          .map((p) => ({
            id: p.id,
            side: 'enemy' as const,
            retreat: this.#retreatHex(p.id, position, true),
            ships: p.combatRoster().map((ship) => ({
              id: ship.id,
              type: ship.type,
              ion: false,
            })),
          })),
      );
      const id = this.#id('battle');
      let seed = this.#round;
      for (const c of id + position.key)
        seed = (Math.imul(seed, 31) + c.charCodeAt(0)) >>> 0;
      return TacticalBattle.create(id, position, fleets, seed);
    });
  }
  #retreatHex(
    id: string,
    position: HexCoordinate,
    enemy: boolean,
  ): HexCoordinate | null {
    const previous = this.#simulation!.previousPositions.get(id);
    const ring = enemy
      ? this.galaxy.systems
          .find(
            (s) =>
              s.star.id === this.#pirates.find((p) => p.id === id)!.systemId,
          )!
          .star.position.neighbors()
      : null;
    const candidates = [
      ...(previous &&
      new HexCoordinate(previous.q, previous.r).distanceTo(position) === 1
        ? [new HexCoordinate(previous.q, previous.r)]
        : []),
      ...position.neighbors(),
    ];
    return (
      candidates.find(
        (p) =>
          this.galaxy.isPassable(p) &&
          (enemy
            ? this.#fleet.position?.key !== p.key &&
              !!ring?.some((r) => r.key === p.key)
            : !this.#hostileAt(p)),
      ) ?? null
    );
  }
  #finishTacticalBattle(): void {
    const simulation = this.#simulation!,
      battle = simulation.tacticalBattles[0]!;
    const state = battle.snapshot;
    if (state.phase !== 'complete') return;
    const position = new HexCoordinate(state.position.q, state.position.r);
    const playerIds = state.fleets
      .filter((f) => f.side === 'player')
      .map((f) => f.id);
    for (const participant of state.fleets) {
      const pieces = state.pieces.filter((p) => p.fleetId === participant.id);
      const killed = new Set(
        pieces
          .filter((p) => p.status === 'destroyed' || p.status === 'wreck')
          .map((p) => p.id),
      );
      const escaped = pieces.some((p) => p.status === 'escaped');
      if (participant.side === 'enemy') {
        const pirate = this.#pirates.find((p) => p.id === participant.id)!;
        const lost = pieces.filter(
          (p) => p.status === 'destroyed' || p.status === 'wreck',
        );
        pirate.count -= lost.filter((p) => p.type === 'Space pirate').length;
        pirate.transports -= lost.filter(
          (p) => p.type === 'Transport ship',
        ).length;
        if (pirate.transports <= 0) pirate.hold = emptyStock();
        if (escaped && participant.retreat) {
          pirate.moveTo(
            new HexCoordinate(participant.retreat.q, participant.retreat.r),
          );
          simulation.remaining.set(pirate.id, 0);
        }
        continue;
      }
      const fleet = this.#fleetState(participant.id);
      const lostUnits = fleet.shipUnits!.filter((unit) => killed.has(unit.id));
      for (const unit of lostUnits) fleet.ships[unit.type]--;
      // permanenta-skador: survivors keep the hull they lost.
      fleet.shipUnits = fleet
        .shipUnits!.filter((unit) => !killed.has(unit.id))
        .map((unit) => {
          const piece = pieces.find((p) => p.id === unit.id);
          if (!piece) return unit;
          const damage = maxHull(piece) - piece.hull;
          const { damage: _previous, ...rest } = unit;
          void _previous;
          return damage > 0 ? { ...rest, damage } : rest;
        });
      if (escaped && participant.retreat && this.#shipCount(fleet.ships)) {
        fleet.position = new HexCoordinate(
          participant.retreat.q,
          participant.retreat.r,
        );
        fleet.destination = null;
        delete fleet.courseOrigin;
        simulation.remaining.set(fleet.id, 0);
      }
      this.#releaseEmptyFleet(fleet);
    }
    for (const pirate of this.#pirates)
      if (!pirate.hasShips) {
        simulation.remaining.delete(pirate.id);
        simulation.previousPositions.delete(pirate.id);
      }
    this.#pirates = this.#pirates.filter((p) => p.hasShips);
    this.#visiblePirates = new Set(
      [...this.#visiblePirates].filter((id) =>
        this.#pirates.some((p) => p.id === id),
      ),
    );
    this.#chartedPirates = new Set(
      [...this.#chartedPirates].filter((id) =>
        this.#pirates.some((p) => p.id === id),
      ),
    );
    const lost = state.pieces.filter(
      (p) =>
        p.side === 'player' &&
        (p.status === 'destroyed' || p.status === 'wreck'),
    );
    const losses =
      (Object.keys(SHIPS) as ShipType[])
        .map((type) => ({
          type,
          count: lost.filter((p) => p.type === type).length,
        }))
        .filter((p) => p.count)
        .map((p) => `${p.count} ${p.type}`)
        .join(', ') || 'no ships';
    const pirateLosses = state.pieces.filter(
      (p) =>
        p.side === 'enemy' &&
        (p.status === 'destroyed' || p.status === 'wreck'),
    ).length;
    const surviving = state.pieces.filter(
      (p) =>
        p.side === 'player' && p.status !== 'destroyed' && p.status !== 'wreck',
    );
    const captured = surviving.filter((p) => p.type === 'Space pirate').length;
    const summary = `Lost ${losses}; destroyed ${pirateLosses} pirates. Survivors: ${surviving.filter((p) => p.type === 'Fighter').length} Fighters, ${captured ? `${captured} captured pirates, ` : ''}${state.pieces.filter((p) => p.side === 'enemy' && p.status !== 'destroyed' && p.status !== 'wreck').length} pirates, ${surviving.filter((p) => p.type !== 'Fighter' && p.type !== 'Space pirate').length} civilian ships. ${state.pieces.filter((p) => p.status === 'escaped').length} ships escaped.`;
    const names = playerIds
      .map((id) => this.#fleetDisplayName(this.#fleetState(id)))
      .join(', ');
    const eventId = this.#event(
      `Combat: ${names} versus Space pirate. ${summary}`,
      position,
      state.log,
    );
    simulation.battles = [
      ...simulation.battles,
      {
        eventId,
        position,
        fleetId: playerIds[0] ?? null,
        fleetIds: playerIds,
        title: `${names} versus Space pirate`,
        summary,
      },
    ];
    simulation.tacticalBattles.shift();
    this.#updateSight();
    if (!simulation.tacticalBattles.length) {
      simulation.awaitingCombat = false;
      this.#afterCombat();
    }
  }
  #afterCombat(): void {
    this.#simulation!.battles = this.#simulation!.battles.map((report) => ({
      ...report,
      fleetId:
        report.fleetIds?.find((id) => id === this.#fleet.id) ??
        (report.fleetId === this.#fleet.id ? report.fleetId : null),
    }));
    this.#updateSight();
    const exploredPlanets = this.#completePlanetExplorations();
    if (exploredPlanets.length)
      this.#simulation!.discoveries = Object.freeze([
        ...this.#simulation!.discoveries,
        ...exploredPlanets,
      ]);
    this.#visiblePirates = new Set(
      this.pirateSnapshots()
        .map((p) => p.id)
        .filter((id) => this.#visiblePirates.has(id)),
    );
  }
  canIssueFleetOrders(id: string): boolean {
    const fleet = this.#fleetById(id);
    return (
      !!fleet?.position &&
      (this.#phase === 'planning' ||
        (this.#phase === 'interrupted' && !!this.#simulation?.permits(id)))
    );
  }
  #requireFleetOrders(id: string): void {
    const fleet = this.#fleetState(id);
    if (!fleet.position)
      throw new Error('Empty fleets cannot receive destinations.');
    if (!this.canIssueFleetOrders(id))
      throw new Error(
        'Orders are only available while planning or handling a discovery.',
      );
  }
  // gemensamt-handelseflode: retain event identity and review progress at checkpoints.
  presentEvent(id: string): void {
    if (
      this.#simulation &&
      this.#events.some(
        (event) => event.id === id && event.round === this.#round,
      )
    )
      this.#simulation.presentedEventIds.add(id);
  }
  handleEvent(id: string): void {
    const pending = [
      ...(this.#simulation?.discoveries ?? []),
      ...(this.#simulation?.battles ?? []),
    ];
    if (
      this.#phase !== 'interrupted' ||
      !pending.some((item) => item.eventId === id)
    )
      throw new Error('No event to handle.');
    this.#simulation!.activeEventId = id;
    this.handleDiscoveries();
    this.presentEvent(id);
  }
  finishHandlingEvent(): void {
    if (this.#phase !== 'interrupted' || !this.#simulation!.handling)
      throw new Error('No event is being handled.');
    this.#simulation!.handling = false;
    this.#simulation!.activeEventId = undefined;
  }
  #linkInterruptionEvents(): void {
    const simulation = this.#simulation;
    if (!simulation) return;
    const pending = [...simulation.battles, ...simulation.discoveries];
    const used = new Set(
      pending.flatMap((item) => (item.eventId ? [item.eventId] : [])),
    );
    // Legacy checkpoints have no links. Associate their trailing events by location
    // without parsing localized display text or generating new simulation outcomes.
    const link = <T extends Discovery | BattleReport>(item: T): T => {
      if (item.eventId) return item;
      const event = this.#events.findLast(
        (event) =>
          event.round === this.#round &&
          !used.has(event.id) &&
          (!event.position ||
            (event.position.q === item.position.q &&
              event.position.r === item.position.r)),
      );
      if (!event) {
        const description = 'kind' in item ? `${item.name}.` : item.summary;
        const id = this.#event(
          String(description),
          new HexCoordinate(item.position.q, item.position.r),
        );
        used.add(id);
        return { ...item, eventId: id };
      }
      used.add(event.id);
      if (!event.position) {
        this.#events[this.#events.indexOf(event)] = Object.freeze({
          ...event,
          position: Object.freeze({ q: item.position.q, r: item.position.r }),
        });
      }
      return { ...item, eventId: event.id };
    };
    const discoveryOrder = new Map(
      this.#visibleDiscoveries().map((item, index) => [item.id, index]),
    );
    const linked = new Map(
      [...simulation.discoveries]
        .sort(
          (a, b) =>
            (discoveryOrder.get(a.id) ?? -1) - (discoveryOrder.get(b.id) ?? -1),
        )
        .reverse()
        .map((item) => [item.id, link(item)]),
    );
    simulation.discoveries = simulation.discoveries.map((item) =>
      linked.get(item.id)!,
    );
    simulation.battles = [...simulation.battles].reverse().map(link).reverse();
    const eventIds = new Set(
      this.#events
        .filter((event) => event.round === this.#round)
        .map((event) => event.id),
    );
    if (
      [...simulation.presentedEventIds].some((id) => !eventIds.has(id)) ||
      [...simulation.discoveries, ...simulation.battles].some(
        (item) => !item.eventId || !eventIds.has(item.eventId),
      ) ||
      (simulation.activeEventId &&
        (!simulation.handling ||
          ![...simulation.discoveries, ...simulation.battles].some(
            (item) => item.eventId === simulation.activeEventId,
          )))
    )
      throw new Error('Invalid interrupted event review.');
    if (simulation.handling && !simulation.activeEventId) {
      simulation.activeEventId =
        simulation.battles[0]?.eventId ??
        this.#pausingDiscoveries(simulation.discoveries)[0]?.eventId;
      if (simulation.activeEventId)
        simulation.presentedEventIds.add(simulation.activeEventId);
    }
  }
  handleDiscoveries(): void {
    if (this.#phase !== 'interrupted')
      throw new Error('No discovery to handle.');
    this.#simulation!.handling = true;
    if (!this.#simulation!.activeEventId) {
      this.#simulation!.activeEventId =
        this.#simulation!.battles[0]?.eventId ??
        this.#pausingDiscoveries(this.#simulation!.discoveries)[0]?.eventId;
      if (this.#simulation!.activeEventId)
        this.presentEvent(this.#simulation!.activeEventId);
    }
  }
  continueTurn(): void {
    if (this.#phase !== 'interrupted') throw new Error('No interrupted round.');
    if (this.#simulation!.tacticalBattles.length)
      throw new Error('Complete tactical combat before continuing the round.');
    this.#simulation!.discoveries = [];
    this.#simulation!.battles = [];
    this.#simulation!.activeEventId = undefined;
    this.#simulation!.handling = false;
    this.#phase = 'simulating';
  }
  /** game-over-utan-skepp: the home fleet is lost when none of its ships remain. */
  get defeated(): boolean {
    return this.#shipCount(this.#fleet.ships) === 0;
  }
  /** ap-pa-starmap: whether the enemies act next, after the player's AP. */
  get enemyTurnPending(): boolean {
    return this.#enemyPending;
  }
  #actionPoints(fleet: Fleet): number {
    const speed = this.#speed(fleet);
    if (this.#simulation && this.#stage === 'player')
      return this.#simulation.movement(fleet.id, speed);
    return Math.floor((this.#actionTime * speed) / 60 + 1e-9);
  }
  /**
   * ap-pa-starmap: `player` moves only the player's fleets with their unspent
   * AP, `enemy` moves only the pirates and ends the round, and `round` moves
   * everyone at once as before.
   */
  startTurn(stage: TurnStage = 'round'): void {
    if (this.defeated) throw new Error('The game is over.');
    this.#requirePlanning();
    this.#stage = stage;
    this.#simulation = new TurnSimulation([
      [this.#fleet.id, this.#speed(this.#fleet)] as const,
      ...this.#pirates.map((pirate) => [pirate.id, 1] as const),
    ]);
    if (stage === 'player') {
      this.#simulation.remaining.set(this.#fleet.id, this.#actionTime);
      for (const pirate of this.#pirates)
        this.#simulation.remaining.set(pirate.id, 0);
    } else if (stage === 'enemy') {
      this.#simulation.remaining.set(this.#fleet.id, 0);
      // piratens-aktivering: pirates the player has not met stand still.
      for (const pirate of this.#pirates)
        if (!pirate.active) this.#simulation.remaining.set(pirate.id, 0);
    }
    // strid-i-samma-hex: fleets that already share a hex fight before moving.
    if (
      this.#fleet.position &&
      this.#shipCount(this.#fleet.ships) &&
      this.#hostileAt(this.#fleet.position)
    )
      this.#simulation.awaitingCombat = true;
    this.#phase = 'simulating';
  }
  nextTurnFrame(): TurnFrame | null {
    if (this.#phase !== 'simulating') return null;
    if (this.#pendingFrame) return this.#pendingFrame;
    if (this.#simulation!.economyApplied) return null;
    if (this.#simulation!.awaitingCombat) {
      return (this.#pendingFrame = Object.freeze({
        movements: Object.freeze([]),
        encounters: true,
        combats: Object.freeze([]),
      }));
    }
    const pirates = new Map(this.#pirates.map((pirate) => [pirate.id, pirate]));
    const frame = FleetPursuit.plan(
      this.#movingFleets(),
      (fleet) =>
        pirates.has(fleet.id)
          ? [pirates.get(fleet.id)!.nextPosition(this.galaxy)]
          : this.#availableRoute(fleet),
      (fleet) =>
        this.#simulation!.movement(
          fleet.id,
          pirates.has(fleet.id) ? 1 : this.#speed(fleet),
        ) > 0
          ? 1
          : 0,
    )[0];
    // strid-i-samma-hex: a pirate whose hex the player enters stays to fight.
    const entered = new Set(
      frame?.movements
        .filter((movement) => !pirates.has(movement.fleetId))
        .map((movement) => movement.to.key),
    );
    const movements = frame?.movements.filter(
      (movement) =>
        !pirates.has(movement.fleetId) || !entered.has(movement.from.key),
    );
    // ap-pa-starmap: the player's part of the round ends without settling it.
    if (!movements?.length && this.#stage === 'player') return null;
    return (this.#pendingFrame = movements?.length
      ? Object.freeze({ movements: Object.freeze(movements) })
      : Object.freeze({ movements: Object.freeze([]), settlement: true }));
  }
  #movingFleets(): PursuingFleet[] {
    return [
      this.#fleet,
      ...this.#pirates.map((pirate) => pirate.movingFleet()),
    ];
  }
  applyFrame(frame: TurnFrame): void {
    if (this.#phase !== 'simulating')
      throw new Error('No turn is being simulated.');
    if (frame !== this.#pendingFrame)
      throw new Error('This turn step is no longer current.');
    this.#pendingFrame = null;
    if (frame.settlement) {
      this.#settleYear();
      this.#simulation!.economyApplied = true;
      for (const id of this.#simulation!.remaining.keys())
        this.#simulation!.remaining.set(id, 0);
      this.#updateSight();
      const discoveries = Object.freeze([
        ...this.#simulation!.discoveries,
        ...this.#newDiscoveries(frame),
      ]);
      if (this.#pausingDiscoveries(discoveries).length) {
        this.#simulation!.discoveries = discoveries;
        this.#phase = 'interrupted';
      }
      return;
    }
    for (const movement of frame.movements) {
      this.#simulation!.previousPositions.set(movement.fleetId, movement.from);
      const moving = this.#fleetById(movement.fleetId);
      this.#simulation!.spend(
        movement.fleetId,
        this.#navigation.stepSpeed(
          movement.from,
          movement.to,
          moving ? this.#speed(moving) : 1,
        ),
      );
      const pirate = this.#pirates.find(
        (pirate) => pirate.id === movement.fleetId,
      );
      if (pirate) {
        pirate.moveTo(movement.to);
        continue;
      }
      const fleet = this.#fleetState(movement.fleetId);
      fleet.position = movement.to;
      this.#recordArrival(fleet);
    }
    this.#updateSight();
    if (frame.combats === undefined) {
      this.#simulation!.awaitingCombat = true;
      const discoveries = this.#newDiscoveries(frame);
      if (this.#pausingDiscoveries(discoveries).length) {
        this.#simulation!.discoveries = discoveries;
        this.#phase = 'interrupted';
      }
      return;
    }
    if (frame.encounters) {
      this.#simulation!.tacticalBattles = this.#createTacticalBattles();
      if (this.#simulation!.tacticalBattles.length) {
        this.#phase = 'interrupted';
        return;
      }
    }
    this.#simulation!.awaitingCombat = false;
    this.#afterCombat();
    if (
      this.#simulation!.battles.length ||
      this.#pausingDiscoveries(this.#simulation!.discoveries).length
    )
      this.#phase = 'interrupted';
  }
  finishTurn(): void {
    if (this.#phase !== 'simulating')
      throw new Error('No turn is being simulated.');
    if (this.#simulation?.awaitingCombat || this.nextTurnFrame())
      throw new Error('Complete the remaining turn steps first.');
    if (this.#stage === 'player') {
      const fleet = this.#fleet;
      this.#recordArrival(fleet);
      this.#actionTime = this.#simulation!.remaining.get(fleet.id) ?? 0;
      this.#enemyPending = this.#apSpent(fleet);
    } else {
      this.#round += 1;
      this.#actionTime = 60;
      this.#enemyPending = false;
    }
    this.#stage = 'round';
    this.#phase = 'planning';
    this.#simulation = null;
  }
  #settleYear(): void {
    this.#recordArrival(this.#fleet);
    const exploredPlanets = this.#completePlanetExplorations();
    if (exploredPlanets.length)
      this.#simulation!.discoveries = Object.freeze([
        ...this.#simulation!.discoveries,
        ...exploredPlanets,
      ]);
    // flottforskning-av-tekniker: no research capacity until it is decided.
    const researched = this.#research.advance(0);
    if (researched)
      this.#event(
        `Research completed: ${researched}.`,
        undefined,
        undefined,
        undefined,
        this.#round,
        { illustration: { kind: 'research', type: researched } },
      );
  }
  #cargo(fleetId: string): Stock {
    const stock = emptyStock();
    const hold = this.#fleetById(fleetId)?.hold;
    if (hold)
      for (const material of MATERIALS) stock[material] += hold[material];
    return stock;
  }

  #route(fleet: PursuingFleet): {
    fleet: PursuingFleet;
    path: HexCoordinate[];
  } {
    if (!fleet.destination || !fleet.position) return { fleet, path: [] };
    const path = [
      ...this.#navigation.path(
        fleet.position,
        fleet.destination,
        this.#speed(fleet),
        this.#knownTerrain,
        fleet.courseOrigin ?? fleet.position,
      ),
    ];
    return { fleet, path };
  }
  #availableRoute(fleet: PursuingFleet): readonly HexCoordinate[] {
    const state = this.#fleetState(fleet.id);
    delete state.navigationIssue;
    let path = this.#route(fleet).path;
    while (path[0] && !this.galaxy.isPassable(path[0])) {
      this.#knownTerrain.add(path[0].key);
      this.#changedMapCells.add(path[0].key);
      path = this.#route(fleet).path;
    }
    const next = path[0];
    if (!next) {
      if (fleet.destination && fleet.position?.key !== fleet.destination.key)
        state.navigationIssue =
          'No known passable route. Choose another destination.';
      return [];
    }
    const speed = this.#navigation.stepSpeed(
      fleet.position!,
      next,
      this.#speed(fleet),
    );
    if (
      speed === 1 &&
      this.#speed(fleet) > 1 &&
      !this.#knownTerrain.has(next.key)
    ) {
      this.#knownTerrain.add(next.key);
      this.#changedMapCells.add(next.key);
      path = this.#route(fleet).path;
      if (path[0]?.key !== next.key) return this.#availableRoute(fleet);
    }
    if (!this.#simulation!.movement(fleet.id, speed)) {
      state.navigationIssue =
        'Asteroid passage requires a full round of movement.';
      return [];
    }
    return path;
  }
  #fleetDisplayName(fleet: Fleet): string {
    return fleet.name;
  }

  #visibleDiscoveries(): Discovery[] {
    const discoveries: Discovery[] = [];
    for (const system of this.galaxy.systems) {
      if (this.#explored.has(system.star.position.key))
        discoveries.push({
          id: system.star.id,
          kind: 'star',
          name: system.star.name,
          position: system.star.position,
          fleetId: null,
        });
      for (const planet of system.planets)
        if (this.#explored.has(planet.position.key))
          discoveries.push({
            id: planet.id,
            kind: 'planet',
            name: planet.name,
            position: planet.position,
            fleetId: null,
          });
    }
    for (const pirate of this.#pirates)
      if (this.#visible.has(pirate.position.key))
        discoveries.push({
          id: pirate.id,
          kind: 'pirate',
          name: 'Space pirate',
          position: pirate.position,
          fleetId: null,
        });
    return discoveries;
  }
  #newDiscoveries(frame: TurnFrame): readonly Discovery[] {
    const discoveries = this.#visibleDiscoveries().filter((discovery) =>
      discovery.kind === 'pirate'
        ? !this.#visiblePirates.has(discovery.id)
        : !this.#knownObjects.has(discovery.id),
    );
    this.#updateSight();
    this.#visiblePirates = new Set(
      this.pirateSnapshots().map((pirate) => pirate.id),
    );
    for (const discovery of discoveries) {
      this.#knownObjects.add(discovery.id);
      const position = new HexCoordinate(
        discovery.position.q,
        discovery.position.r,
      );
      const observer = [this.#fleet]
        .filter(
          (fleet) =>
            fleet.position &&
            fleet.position.distanceTo(position) <=
              this.#fleetDetectionRange(fleet),
        )
        .sort(
          (a, b) =>
            Number(
              frame.movements.some((movement) => movement.fleetId === b.id),
            ) -
              Number(
                frame.movements.some((movement) => movement.fleetId === a.id),
              ) || a.id.localeCompare(b.id),
        )[0];
      (discovery as { fleetId: string | null }).fleetId = observer?.id ?? null;
      const eventId = this.#event(
        `${discovery.kind === 'pirate' ? 'Pirate ship in sight' : discovery.kind === 'star' ? 'Star explored' : 'Planet discovered'}: ${discovery.name}.`,
        position,
      );
      (discovery as { eventId: string }).eventId = eventId;
    }
    return Object.freeze(
      discoveries.sort(
        (a, b) =>
          Number(b.kind === 'pirate') - Number(a.kind === 'pirate') ||
          a.id.localeCompare(b.id),
      ),
    );
  }
  // upptackt-stannar-resan: every new discovery stops the journey for the player.
  #pausingDiscoveries(discoveries: readonly Discovery[]): readonly Discovery[] {
    return discoveries;
  }
  /** upptackt-stannar-resan: the round is waiting on a discovery, not a battle. */
  discoveryPause(): boolean {
    return (
      this.#phase === 'interrupted' &&
      !this.#simulation?.tacticalBattles.length &&
      this.#pausingDiscoveries(this.#simulation?.discoveries ?? []).length > 0
    );
  }
  /**
   * fiendeupptackt-utan-end-turn: a pirate sighting continues without End turn.
   * strid-i-samma-hex: so does a discovery on arrival, for example in a
   * pirate's hex, since there is no journey left for the player to resume.
   */
  enemyDiscoveryResume(): boolean {
    const discoveries = this.#simulation?.discoveries ?? [];
    const fleet = this.#fleet;
    return (
      this.discoveryPause() &&
      (discoveries.some((discovery) => discovery.kind === 'pirate') ||
        !fleet.destination ||
        fleet.position?.key === fleet.destination.key)
    );
  }
  #fleetDetectionRange(fleet: Fleet): number {
    return Math.max(
      0,
      ...(fleet.shipUnits ?? []).map((unit) =>
        unit.type === 'Exploration ship'
          ? (unit.telescope ?? 1)
          : // startflotta-med-raptor: the Raptor sees like Telescope I.
            unit.type === 'Raptor'
            ? 1
            : 0,
      ),
    );
  }
  #updateSight(): void {
    const fleet = this.#fleet;
    const sources =
      fleet.position && this.#shipCount(fleet.ships)
        ? [
            {
              position: fleet.position,
              range: this.#fleetDetectionRange(fleet),
            },
          ]
        : [];
    const nebula = (point: HexCoordinate) =>
      this.galaxy.terrainAt(point) === 'nebula';
    const visible = Detection.coverage(sources, nebula);
    for (const key of this.#visible)
      if (!visible.has(key)) this.#changedMapCells.add(key);
    for (const key of visible)
      if (!this.#visible.has(key)) this.#changedMapCells.add(key);
    this.#visible = visible;
    for (const pirate of this.#pirates)
      if (this.#visible.has(pirate.position.key)) pirate.observe();
    for (const key of Detection.coverage(sources, nebula, true)) {
      const point = new HexCoordinate(
        ...(key.split(',').map(Number) as [number, number]),
      );
      if (this.galaxy.contains(point) && !this.#knownTerrain.has(key)) {
        this.#knownTerrain.add(key);
        this.#changedMapCells.add(key);
      }
    }
    for (const key of this.#visible)
      if (
        this.galaxy.cellAt(
          new HexCoordinate(
            ...(key.split(',').map(Number) as [number, number]),
          ),
        )
      )
        if (!this.#explored.has(key)) {
          this.#explored.add(key);
          this.#changedMapCells.add(key);
        }
    this.#updatePirateActivation();
  }
  /**
   * piratens-aktivering: a pirate becomes active when it is seen and stays
   * active until no fleet of the player's is within ten hexes of it.
   */
  #updatePirateActivation(): void {
    for (const pirate of this.#pirates) {
      if (this.#visible.has(pirate.position.key)) pirate.active = true;
      else if (
        pirate.active &&
        !(
          this.#fleet.position &&
          this.#shipCount(this.#fleet.ships) &&
          this.#fleet.position.distanceTo(pirate.position) <= 10
        )
      )
        pirate.active = false;
    }
  }
  #reveal(position: HexCoordinate, radius = true): void {
    for (const cell of [position, ...(radius ? position.neighbors() : [])])
      if (this.galaxy.cellAt(cell) && !this.#explored.has(cell.key)) {
        this.#explored.add(cell.key);
        this.#changedMapCells.add(cell.key);
      }
  }
  // tomma-flottor-utan-position: the last ship releases both location and course.
  #releaseEmptyFleet(fleet: Fleet): void {
    if (this.#shipCount(fleet.ships) !== 0) return;
    fleet.position = null;
    fleet.destination = null;
    delete fleet.courseOrigin;
  }

  #normalizeShips(): void {
    {
      const fleet = this.#fleet;
      const remaining = { ...fleet.ships };
      const units = (fleet.shipUnits ?? []).filter(
        (unit) => remaining[unit.type]-- > 0,
      );
      for (let index = 0; index < units.length; index++) {
        const unit = units[index]!;
        if (
          (unit.missiles !== undefined &&
            (!Number.isInteger(unit.missiles) ||
              (unit.type === 'Fighter'
                ? unit.missiles !== 0 && unit.missiles !== 2
                : unit.missiles !== 0))) ||
          (unit.armored !== undefined && typeof unit.armored !== 'boolean') ||
          (unit.damage !== undefined &&
            (!Number.isSafeInteger(unit.damage) || unit.damage < 0)) ||
          (unit.armored === true &&
            unit.type !== 'Fighter' &&
            unit.type !== 'Transport ship')
        )
          throw new Error('Invalid ship combat upgrade.');
        if (unit.type === 'Exploration ship') {
          if (
            unit.telescope !== undefined &&
            ![1, 2, 3].includes(unit.telescope)
          )
            throw new Error('Invalid installed telescope.');
          units[index] = { ...unit, telescope: unit.telescope ?? 1 };
        }
      }
      for (const type of Object.keys(SHIPS) as ShipType[]) {
        for (
          let index = units.filter((unit) => unit.type === type).length;
          index < fleet.ships[type];
          index++
        )
          units.push({
            id: `${fleet.id}-legacy-${type}-${index}`,
            type,
            ...(type === 'Exploration ship' ? { telescope: 1 as const } : {}),
            engines: {
              'Rocket engine': engineCount(type),
              'Ion pulse engine': 0,
            },
          });
      }
      fleet.shipUnits = units;
    }
  }
  #speed(fleet: PursuingFleet): number {
    const speeds =
      fleet.shipUnits?.map(
        (unit) =>
          SHIPS[unit.type].speed +
          (unit.engines['Ion pulse engine'] > 0 ? 1 : 0),
      ) ??
      Object.entries(fleet.ships).flatMap(([type, count]) =>
        count > 0 ? [SHIPS[type as ShipType].speed] : [],
      );
    const normal = speeds.length === 0 ? 0 : Math.min(...speeds);
    return normal;
  }
  #crew(ships: Record<ShipType, number>): number {
    return (Object.keys(ships) as ShipType[]).reduce(
      (total, type) => total + ships[type] * SHIPS[type].crew,
      0,
    );
  }
  #shipCount(ships: Partial<Record<ShipType, number>>): number {
    return Object.values(ships).reduce((a, b) => a + b, 0);
  }
  #fleetState(id: string): Fleet {
    const fleet = this.#fleetById(id);
    if (!fleet) throw new Error('Fleet was not found.');
    return fleet;
  }
  #fleetById(id: string): Fleet | undefined {
    return id === this.#fleet.id ? this.#fleet : undefined;
  }
  /**
   * ap-pa-starmap: the fleet has spent its AP when none are left or it cannot
   * pay for the next step towards its destination.
   */
  #apSpent(fleet: Fleet): boolean {
    if (!fleet.position || !this.#shipCount(fleet.ships)) return false;
    if (this.#actionPoints(fleet) < 1) return true;
    if (!fleet.destination || fleet.destination.key === fleet.position.key)
      return false;
    if (this.routePreview(fleet.id, fleet.destination).length) return true;
    fleet.destination = null;
    return false;
  }

  // ingen-ankomstbesked: arriving clears the order and does not announce it.
  #recordArrival(fleet: Fleet): void {
    if (!fleet.destination || fleet.destination.key !== fleet.position?.key)
      return;
    fleet.destination = null;
    delete fleet.courseOrigin;
  }
  #event(
    text: string,
    position?: HexCoordinate,
    combatLog?: readonly string[],
    planetId?: string,
    round = this.#round,
    details: Pick<GameEvent, 'heading' | 'illustration' | 'lines'> = {},
  ): string {
    const id = this.#id('event');
    const planet =
      position &&
      this.galaxy.systems
        .flatMap((system) => system.planets)
        .find((item) => item.position.key === position.key);
    const star =
      position &&
      this.galaxy.systems.some(
        (system) => system.star.position.key === position.key,
      );
    const illustration: EventIllustration | undefined =
      details.illustration ??
      (combatLog
        ? { kind: 'ship', type: 'Space pirate' }
        : planet
          ? {
              kind: 'planet',
              type: planet.environmentType,
            }
          : star
            ? { kind: 'star' }
            : undefined);
    this.#events.push(
      Object.freeze({
        id,
        round,
        text,
        ...details,
        ...(illustration ? { illustration: Object.freeze(illustration) } : {}),
        ...(planetId ? { planetId } : {}),
        ...(combatLog ? { combatLog: Object.freeze([...combatLog]) } : {}),
        ...(position
          ? { position: Object.freeze({ q: position.q, r: position.r }) }
          : {}),
      }),
    );
    return id;
  }
  #id(prefix: string): string {
    return `${prefix}-${this.#sequence++}`;
  }
  #requirePlanning(): void {
    if (this.#phase !== 'planning')
      throw new Error('Orders are only available while planning.');
  }
}
