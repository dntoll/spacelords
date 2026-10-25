import {
  TurnSimulation,
  nearestUnexplored,
  type Discovery,
  type ExplorationOrder,
  type SavedTurnSimulation,
} from './TurnSimulation.js';
import {
  PirateFleet,
  type PirateSnapshot,
  type SavedPirateFleet,
} from './PirateFleet.js';
import { FleetCombat, type CombatResult } from './FleetCombat.js';
import { prioritizeProduction } from './ProductionPriorities.js';
import { routeEscortTargets, tradeAssignmentIssue } from './TradeAssignment.js';
import {
  projectSupplyChain,
  type SupplyChainSnapshot,
} from './ProjectSupplyChain.js';
import type { ProductionOption, ProductionGuidance } from './ProductionMap.js';
import { ProjectSupply, type ProjectSupplySnapshot } from './ProjectSupply.js';
import { Galaxy, Star, StarSystem, type MapCell } from './Galaxy.js';
import { HexCoordinate } from './HexCoordinate.js';
import { shipTransferIssue } from './FleetTransfer.js';
import { PlanetEnvironment } from './PlanetEnvironment.js';
import {
  Planet,
  Player,
  Colony,
  type PlanetEnvironmentType,
  type TerraformEnvironment,
  type PlanetSnapshot,
} from './Planet.js';
import {
  PlanetEconomy,
  RESOURCES,
  MATERIALS,
  COMPONENTS,
  type Component,
  emptyStock,
  type Stock,
  type EconomySnapshot,
} from './Economy.js';
import { ResearchPlan, TECHNOLOGIES, type Technology } from './Research.js';
import {
  Logistics,
  type LogisticsPort,
  type TransportFleet,
  type TradeRoute,
  type Shipment,
  type ComponentOrder,
  type TradeRouteSnapshot,
} from './Logistics.js';
import { ComponentPlanner } from './ComponentPlanner.js';
import {
  DecisionBoard,
  type Decision,
  type DecisionDescriptor,
} from './Decisions.js';
import { FleetPursuit, type PursuingFleet } from './FleetPursuit.js';
import {
  SupplyOverview,
  type SupplyPlanetInput,
  type SupplyPlanet,
} from './SupplyOverview.js';
export { TECHNOLOGIES, type Technology } from './Research.js';

export type GamePhase = 'planning' | 'simulating' | 'interrupted';
export type Resource = 'Iron' | 'Water' | 'Oil';
export type ShipType =
  'Colony ship' | 'Exploration ship' | 'Fighter' | 'Transport ship';
export type BuildType =
  | 'Research station'
  | 'Iron mine'
  | 'Water extractor'
  | 'Oil extractor'
  | 'Transport ship factory'
  | 'Colony ship factory'
  | 'Exploration ship factory'
  | 'Rocket engine factory'
  | 'Ion pulse engine factory'
  | 'Weapons module factory'
  | 'Fighter factory'
  | `${TerraformEnvironment} dome`
  | `${TerraformEnvironment} terraforming factory`;

export type ProjectType = BuildType | ShipType | Component;

export interface Cost {
  readonly Iron: number;
  readonly Water: number;
  readonly Oil: number;
}
export interface BuildDefinition {
  readonly permanent: boolean;
  readonly sitePreparation?: boolean;
  readonly environment?: TerraformEnvironment;
  readonly terraforming?: number;
  readonly description: string;
  readonly workers: number;
  readonly cost: Cost;
  readonly crew: number;
  readonly ship?: ShipType;
  readonly component?: Component;
  readonly parts?: Readonly<Partial<Record<Component, number>>>;
  readonly extraction?: Resource;
}
export const BUILDINGS: Readonly<Record<BuildType, BuildDefinition>> =
  Object.freeze({
    'Ice dome': {
      permanent: false,
      sitePreparation: true,
      environment: 'Ice',
      description: 'Prepares one site for construction below 80% habitability.',
      workers: 0,
      cost: { Iron: 8, Water: 4, Oil: 2 },
      crew: 0,
    },
    'Ice terraforming factory': {
      permanent: true,
      environment: 'Ice',
      terraforming: 5,
      description:
        'Raises habitability by 5 percentage points per year when staffed, up to 100%.',
      workers: 300,
      cost: { Iron: 12, Water: 6, Oil: 3 },
      crew: 0,
    },
    'Desert dome': {
      permanent: false,
      sitePreparation: true,
      environment: 'Desert',
      description: 'Prepares one site for construction below 80% habitability.',
      workers: 0,
      cost: { Iron: 8, Water: 4, Oil: 2 },
      crew: 0,
    },
    'Desert terraforming factory': {
      permanent: true,
      environment: 'Desert',
      terraforming: 5,
      description:
        'Raises habitability by 5 percentage points per year when staffed, up to 100%.',
      workers: 300,
      cost: { Iron: 12, Water: 6, Oil: 3 },
      crew: 0,
    },
    'Ocean dome': {
      permanent: false,
      sitePreparation: true,
      environment: 'Ocean',
      description: 'Prepares one site for construction below 80% habitability.',
      workers: 0,
      cost: { Iron: 8, Water: 4, Oil: 2 },
      crew: 0,
    },
    'Ocean terraforming factory': {
      permanent: true,
      environment: 'Ocean',
      terraforming: 5,
      description:
        'Raises habitability by 5 percentage points per year when staffed, up to 100%.',
      workers: 300,
      cost: { Iron: 12, Water: 6, Oil: 3 },
      crew: 0,
    },
    'Toxic dome': {
      permanent: false,
      sitePreparation: true,
      environment: 'Toxic',
      description: 'Prepares one site for construction below 80% habitability.',
      workers: 0,
      cost: { Iron: 8, Water: 4, Oil: 2 },
      crew: 0,
    },
    'Toxic terraforming factory': {
      permanent: true,
      environment: 'Toxic',
      terraforming: 5,
      description:
        'Raises habitability by 5 percentage points per year when staffed, up to 100%.',
      workers: 300,
      cost: { Iron: 12, Water: 6, Oil: 3 },
      crew: 0,
    },
    'Iron mine': {
      permanent: true,
      description: 'Extracts Iron from the local finite deposit.',
      workers: 100,
      cost: { Iron: 5, Water: 2, Oil: 0 },
      crew: 0,
      extraction: 'Iron',
    },
    'Rocket engine factory': {
      permanent: true,
      description: 'Produces Rocket engines for ship construction.',
      workers: 300,
      cost: { Iron: 8, Water: 4, Oil: 2 },
      crew: 0,
      component: 'Rocket engine',
    },
    'Ion pulse engine factory': {
      permanent: true,
      description:
        'Produces Ion pulse engines. At least one gives a ship +1 speed.',
      workers: 300,
      cost: { Iron: 16, Water: 8, Oil: 4 },
      crew: 0,
      component: 'Ion pulse engine',
    },
    'Weapons module factory': {
      permanent: true,
      description: 'Produces Weapons modules for Fighter construction.',
      workers: 300,
      cost: { Iron: 8, Water: 4, Oil: 2 },
      crew: 0,
      component: 'Weapons module',
    },
    'Water extractor': {
      permanent: true,
      description: 'Extracts Water from the local finite deposit.',
      workers: 100,
      cost: { Iron: 4, Water: 0, Oil: 0 },
      crew: 0,
      extraction: 'Water',
    },
    'Oil extractor': {
      permanent: true,
      description: 'Extracts Oil from the local finite deposit.',
      workers: 100,
      cost: { Iron: 6, Water: 2, Oil: 0 },
      crew: 0,
      extraction: 'Oil',
    },
    'Transport ship factory': {
      permanent: true,
      description: 'Builds Transport ships for automated trade routes.',
      workers: 400,
      cost: { Iron: 12, Water: 6, Oil: 3 },
      crew: 0,
      ship: 'Transport ship',
    },
    'Research station': {
      permanent: true,
      description:
        'Contributes one research point per year to the selected technology.',
      workers: 600,
      cost: { Iron: 2, Water: 3, Oil: 1 },
      crew: 0,
    },
    'Colony ship factory': {
      permanent: true,
      description:
        'Shipyard: builds Colony ships for settling uninhabited planets.',
      workers: 2000,
      cost: { Iron: 18, Water: 10, Oil: 6 },
      crew: 0,
      ship: 'Colony ship',
    },
    'Exploration ship factory': {
      permanent: true,
      description:
        'Shipyard: builds Exploration ships that reveal nearby space.',
      workers: 1200,
      cost: { Iron: 10, Water: 8, Oil: 3 },
      crew: 0,
      ship: 'Exploration ship',
    },
    'Fighter factory': {
      permanent: true,
      description: 'Shipyard: builds Fighters for your fleets.',
      workers: 800,
      cost: { Iron: 8, Water: 5, Oil: 2 },
      crew: 0,
      ship: 'Fighter',
    },
  });
export const SHIPS: Readonly<
  Record<ShipType, { readonly crew: number; readonly speed: number }>
> = Object.freeze({
  'Colony ship': { crew: 1000, speed: 2 },
  'Exploration ship': { crew: 200, speed: 4 },
  Fighter: { crew: 50, speed: 3 },
  'Transport ship': { crew: 50, speed: 2 },
});
export function engineCount(type: ShipType): number {
  return type === 'Colony ship' ? 3 : type === 'Exploration ship' ? 2 : 1;
}

export interface ShipUnit {
  readonly id: string;
  readonly type: ShipType;
  readonly engines: Readonly<{
    'Rocket engine': number;
    'Ion pulse engine': number;
  }>;
}

export function projectDefinition(type: ProjectType): BuildDefinition {
  if (type in BUILDINGS) return BUILDINGS[type as BuildType];
  if (COMPONENTS.includes(type as Component))
    return {
      permanent: false,
      description: `Produces one ${type} for local storage or shipment.`,
      workers: 0,
      crew: 0,
      component: type as Component,
      cost:
        type === 'Ion pulse engine'
          ? { Iron: 6, Water: 2, Oil: 2 }
          : { Iron: type === 'Rocket engine' ? 3 : 2, Water: 1, Oil: 1 },
    };
  return {
    permanent: false,
    description: `Produces one ${type}. Factory staff operate the shipyard.`,
    cost:
      type === 'Transport ship'
        ? { Iron: 4, Water: 2, Oil: 1 }
        : type === 'Colony ship'
          ? { Iron: 6, Water: 3, Oil: 1 }
          : type === 'Exploration ship'
            ? { Iron: 3, Water: 2, Oil: 1 }
            : { Iron: 2, Water: 1, Oil: 1 },
    workers: 0,
    crew: SHIPS[type as ShipType].crew,
    ship: type as ShipType,
    parts: {
      'Rocket engine': engineCount(type as ShipType),
      ...(type === 'Fighter' ? { 'Weapons module': 1 } : {}),
    },
  };
}
export function projectCost(type: ProjectType): Stock {
  const definition = projectDefinition(type);
  return { ...emptyStock(), ...definition.cost, ...definition.parts };
}
export interface ResearchSnapshot {
  readonly available: readonly Technology[];
  readonly completed: readonly Technology[];
  readonly selected: Technology | null;
  readonly stations: number;
  readonly queueBlockedReason: string | null;
  readonly queue: readonly Technology[];
}

const emptyCost = (): { Iron: number; Water: number; Oil: number } => ({
  Iron: 0,
  Water: 0,
  Oil: 0,
});
const addCost = (
  target: { Iron: number; Water: number; Oil: number },
  amount: Cost,
): void => {
  target.Iron += amount.Iron;
  target.Water += amount.Water;
  target.Oil += amount.Oil;
};

export interface BuildingSnapshot {
  readonly operational?: boolean;
  readonly id: string;
  readonly type: BuildType;
  readonly slotIndex: number;
  readonly scheduledForDemolition: boolean;
}
export interface ProductionReceipt {
  readonly projectId: string;
  readonly planetId: string;
  readonly product: ProjectType;
  readonly queuePosition: number;
}

export interface ConstructionProjectSnapshot {
  readonly parts?: Readonly<Partial<Record<Component, number>>>;
  readonly id: string;
  readonly type: ProjectType;
  readonly destinationFleetId: string | null;
  readonly blockedReason: string | null;
  readonly slotIndex: number | null;
  readonly factoryId: string | null;
}
export interface BudgetSnapshot {
  readonly production: Cost;
  readonly reserved: Cost;
  readonly available: Cost;
  readonly workers: number;
  readonly reservedWorkers: number;
  readonly availableWorkers: number;
  readonly reservedCrew: number;
  readonly availableCrew: number;
  readonly slots: number;
  readonly reservedSlots: number;
  readonly availableSlots: number;
}
export interface PlanetGameSnapshot {
  readonly environment: PlanetEnvironmentType | 'Gas';
  readonly breathable: boolean;
  readonly populationCapacity: number;
  readonly potentialBuildSlots: number;
  readonly id: string;
  readonly name: string;
  readonly population: number;
  readonly habitability: number;
  readonly buildSlots: number;
  readonly budget: BudgetSnapshot;
  readonly economy: EconomySnapshot;
  readonly buildings: readonly BuildingSnapshot[];
  readonly projects: readonly ConstructionProjectSnapshot[];
  readonly position: HexCoordinate;
  readonly sites: readonly BuildingSiteSnapshot[];
  readonly buildOptions: readonly {
    readonly type: BuildType;
    readonly blockedReason: string | null;
  }[];
}
export interface BuildingSiteSnapshot {
  readonly locked: boolean;
  readonly requiredHabitability: number;
  readonly hasDome: boolean;
  readonly domeRequired: boolean;
  readonly domeType: BuildType | null;
  readonly domeBlockedReason: string | null;
  readonly index: number;
  readonly building: BuildingSnapshot | null;
  readonly project: ConstructionProjectSnapshot | null;
}
export interface PlanetOrderSnapshot {
  readonly planetId: string;
  readonly position: HexCoordinate;
  readonly emptySites: number;
  readonly emptyQueues: number;
}
export interface FleetSnapshot {
  readonly exploration?: ExplorationOrder | undefined;
  readonly remainingMovement?: number | undefined;
  readonly canIssueOrders?: boolean;
  readonly ownName?: string;
  readonly joinFleetId?: string | undefined;
  readonly routeId?: string | undefined;
  readonly releaseRequested?: boolean | undefined;
  readonly cargo?: Readonly<Stock>;
  readonly id: string;
  readonly name: string;
  readonly position: HexCoordinate | null;
  readonly destination: HexCoordinate | null;
  readonly ships: Readonly<Record<ShipType, number>>;
  readonly shipUnits?: readonly ShipUnit[];
  readonly speed: number;
  readonly crew: number;
}
export interface GameEvent {
  readonly id: string;
  readonly round: number;
  readonly text: string;
}
export interface TurnFrame {
  readonly combats?: readonly CombatResult[];
  readonly movements: readonly {
    readonly fleetId: string;
    readonly from: HexCoordinate;
    readonly to: HexCoordinate;
  }[];
}

interface ColonyState {
  habitability?: number;
  domes?: number[];
  stock: Stock;
  deposits: Stock;
  population: number;
  buildings: Building[];
  projects: Project[];
  homeFleetId: string | null;
}
interface Building {
  id: string;
  type: BuildType;
  slotIndex: number;
  queue?: Project[];
  demolition: boolean;
}
interface Project {
  parts?: Partial<Record<Component, number>>;
  id: string;
  type: ProjectType;
  slotIndex: number | null;
  factoryId: string | null;
  destinationFleetId: string | null;
}
interface Fleet {
  exploration?: ExplorationOrder;
  shipUnits?: ShipUnit[];
  joinFleetId?: string;
  routeId?: string;
  releaseRequested?: boolean;
  id: string;
  name: string;
  position: HexCoordinate | null;
  destination: HexCoordinate | null;
  courseOrigin?: HexCoordinate;
  ships: Record<ShipType, number>;
}
const zeroShips = (): Record<ShipType, number> => ({
  'Colony ship': 0,
  'Exploration ship': 0,
  Fighter: 0,
  'Transport ship': 0,
});

interface SavedCoordinate {
  readonly q: number;
  readonly r: number;
}
interface SavedPlanet extends Omit<PlanetSnapshot, 'position' | 'colony'> {
  readonly position: SavedCoordinate;
  readonly colony: {
    readonly ownerId: string;
    readonly population: number;
  } | null;
}
interface SavedFleet extends Omit<
  Fleet,
  'position' | 'destination' | 'courseOrigin'
> {
  readonly position: SavedCoordinate | null;
  readonly destination: SavedCoordinate | null;
  readonly courseOrigin?: SavedCoordinate;
}

export interface GameState {
  readonly tradeRoutes: readonly TradeRoute[];
  readonly shipments: readonly Shipment[];
  readonly componentOrders?: readonly ComponentOrder[];
  readonly skippedDecisions: readonly string[];
  readonly mutedDecisions?: readonly DecisionDescriptor[];
  readonly version: 2 | 3 | 4 | 5 | 6 | 7 | 8;
  readonly knownObjects?: readonly string[];
  readonly simulation?: SavedTurnSimulation | null;
  readonly pirates?: readonly SavedPirateFleet[];
  readonly world: {
    readonly player: { readonly id: string; readonly name: string };
    readonly radius: number;
    readonly systems: readonly {
      readonly star: {
        readonly id: string;
        readonly name: string;
        readonly position: { readonly q: number; readonly r: number };
      };
      readonly planets: readonly SavedPlanet[];
    }[];
  };
  readonly round: number;
  // summary is accepted only for backwards compatibility with older saves.
  readonly phase: 'planning' | 'summary' | 'interrupted';
  readonly sequence: number;
  readonly researched: readonly Technology[];
  readonly researchTarget: Technology | null;
  readonly researchQueue: readonly Technology[];
  readonly colonies: readonly (readonly [string, ColonyState])[];
  readonly fleets: readonly SavedFleet[];
  readonly explored: readonly string[];
  readonly events: readonly GameEvent[];
}

/** Private mutable game state; views receive only immutable snapshots. */
export class Game {
  #logistics = new Logistics();
  #decisions = new DecisionBoard();
  #research = new ResearchPlan();
  #round = 1;
  #phase: GamePhase = 'planning';
  #sequence = 1;
  #colonies = new Map<string, ColonyState>();
  #fleets: Fleet[];
  #pirates: PirateFleet[];
  #explored = new Set<string>();
  #events: GameEvent[] = [];
  #knownObjects = new Set<string>();
  #simulation: TurnSimulation | null = null;
  #pendingFrame: TurnFrame | null = null;
  #mapCells: readonly MapCell[] | null = null;

  constructor(readonly galaxy: Galaxy) {
    this.#pirates = PirateFleet.seed(galaxy);
    for (const planet of galaxy.systems.flatMap((system) => system.planets)) {
      if (planet.colony?.ownerId === galaxy.player.id)
        this.#colonies.set(planet.id, {
          stock: { ...emptyStock(), Iron: 100, Water: 75, Oil: 30 },
          deposits: this.#initialDeposits(planet),
          habitability: planet.habitability,
          domes: [],
          population: planet.colony.population,
          buildings: [],
          projects: [],
          homeFleetId: planet.id === galaxy.homePlanet.id ? 'fleet-home' : null,
        });
    }
    this.#reveal(galaxy.homePlanet.position);
    this.#fleets = [
      {
        id: 'fleet-home',
        name: 'Home Fleet',
        position: galaxy.homePlanet.position,
        destination: null,
        ships: { ...zeroShips(), 'Exploration ship': 1, Fighter: 1 },
      },
    ];
    this.#normalizeShips();
    this.#visibleDiscoveries().forEach((discovery) =>
      this.#knownObjects.add(discovery.id),
    );
  }

  // spara-avbrutet-ar: only planning and discovery checkpoints are serializable.
  exportState(): GameState {
    if (this.#phase === 'simulating')
      throw new Error('Wait for the turn to finish before saving.');
    return structuredClone({
      version: 8,
      knownObjects: [...this.#knownObjects],
      simulation: this.#simulation?.snapshot() ?? null,
      pirates: this.#pirates.map((pirate) => pirate.snapshot()),
      world: {
        player: { id: this.galaxy.player.id, name: this.galaxy.player.name },
        radius: this.galaxy.radius,
        systems: this.galaxy.systems.map((system) => ({
          star: {
            id: system.star.id,
            name: system.star.name,
            position: system.star.position,
          },
          planets: system.planets.map((planet) => ({
            ...planet,
            colony: planet.colony ? { ...planet.colony } : null,
          })),
        })),
      },
      round: this.#round,
      phase: this.#phase,
      sequence: this.#sequence,
      researched: [...this.#research.completed],
      researchTarget: this.#research.queue[0] ?? null,
      researchQueue: this.#research.queue,
      tradeRoutes: this.#logistics.routes,
      shipments: this.#logistics.shipments,
      componentOrders: this.#logistics.componentOrders,
      skippedDecisions: [...this.#decisions.skipped],
      mutedDecisions: this.#decisions.muted,
      colonies: [...this.#colonies],
      fleets: this.#fleets,
      explored: [...this.#explored],
      events: this.#events,
    });
  }

  static restore(state: GameState): Game {
    if (
      ![2, 3, 4, 5, 6, 7, 8].includes(state.version) ||
      !Number.isSafeInteger(state.round) ||
      state.round < 1 ||
      !Number.isSafeInteger(state.sequence) ||
      state.sequence < 1 ||
      ![
        'planning',
        'summary',
        ...(state.version === 8 ? ['interrupted'] : []),
      ].includes(state.phase)
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
                  colony: planet.colony
                    ? new Colony(
                        planet.colony.ownerId,
                        planet.colony.population,
                      )
                    : null,
                }),
            ),
          ),
      ),
      world.radius,
    );
    const game = new Game(galaxy);
    const copy = structuredClone(state);
    if (state.version >= 7 && !Array.isArray(state.pirates))
      throw new Error('Missing saved pirate fleets.');
    game.#pirates =
      state.version >= 7
        ? copy.pirates!.map((pirate) => PirateFleet.restore(pirate, galaxy))
        : [];
    const ids = [
      ...copy.fleets.map((fleet) => fleet.id),
      ...game.#pirates.map((pirate) => pirate.id),
    ];
    if (new Set(ids).size !== ids.length)
      throw new Error('Duplicate fleet ID.');
    game.#round = copy.round;
    game.#phase = 'planning';
    game.#sequence = copy.sequence;
    game.#research = new ResearchPlan(new Set(copy.researched), [
      ...copy.researchQueue,
    ]);
    if (state.version < 6) {
      if (
        copy.researched.some(
          (technology) =>
            technology.endsWith('ship factory') ||
            technology === 'Fighter factory',
        )
      )
        game.#research.completed.add('Rocket engine factory');
      const queue = [...copy.researchQueue];
      game.#research.queue = [];
      for (const technology of queue)
        if (!game.#research.completed.has(technology))
          game.#research.add(technology);
    }
    game.#logistics = new Logistics(
      [...copy.tradeRoutes],
      [...copy.shipments],
      state.version >= 4 ? [...(copy.componentOrders ?? [])] : [],
    );
    game.#decisions = new DecisionBoard(
      new Set(copy.skippedDecisions),
      copy.mutedDecisions ?? [],
    );
    game.#colonies = new Map(copy.colonies);
    for (const colony of game.#colonies.values()) {
      colony.stock = { ...emptyStock(), ...colony.stock };
      colony.deposits = { ...emptyStock(), ...colony.deposits };
      if (state.version === 2) {
        // gemensam-planetko: preserve each legacy queue's order when interleaving.
        const queues = [
          colony.projects,
          ...colony.buildings.map((building) => building.queue ?? []),
        ].map((queue) => [...queue]);
        colony.projects = [];
        while (queues.some((queue) => queue.length)) {
          const next = queues
            .filter((queue) => queue.length)
            .sort(
              (a, b) =>
                Number(a[0]!.id.split('-').at(-1)) -
                Number(b[0]!.id.split('-').at(-1)),
            )[0]!;
          colony.projects.push(next.shift()!);
        }
      }
      for (const building of colony.buildings) delete building.queue;
    }
    game.#fleets = copy.fleets.map(
      ({ position: current, destination, courseOrigin, ...fleet }) => {
        const empty = game.#shipCount(fleet.ships) === 0;
        if (!empty && !current)
          throw new Error('A fleet with ships needs a position.');
        return {
          ...fleet,
          ships: { ...fleet.ships },
          position: empty ? null : position(current!),
          destination: !empty && destination ? position(destination) : null,
          ...(!empty && courseOrigin
            ? { courseOrigin: position(courseOrigin) }
            : {}),
        };
      },
    );
    const named = new Set<string>();
    for (const fleet of game.#fleets) {
      fleet.name = game.#uniqueFleetName(fleet.name, named);
      named.add(fleet.name.toLowerCase());
    }
    game.#normalizeShips();
    game.#explored = new Set(copy.explored);
    game.#events = copy.events.filter(
      (event) =>
        !/^Fleet .* moved to -?\d+,-?\d+\.$|^Exploration from .* revealed \d+ hexes\.$/.test(
          event.text,
        ),
    );
    game.#refreshReinforcements();
    if (state.version === 8 && !Array.isArray(copy.knownObjects))
      throw new Error('Missing discovered objects.');
    game.#knownObjects = new Set(
      state.version === 8
        ? copy.knownObjects
        : game.#visibleDiscoveries().map((discovery) => discovery.id),
    );
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
    } else if (state.version === 8 && copy.simulation)
      throw new Error('Unexpected interrupted year.');
    if (game.#phase === 'planning')
      game.#logistics.reserve(game.#logisticsPort());
    // Exercise derived data before accepting a stored record.
    game.mapSnapshot();
    game.fleetSnapshots();
    for (const planet of galaxy.systems.flatMap((system) => system.planets))
      game.planetSnapshot(planet);
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
    this.#mapCells ??= this.galaxy.mapSnapshot(
      this.#explored,
      new Set(this.#colonies.keys()),
    );
    return this.#mapCells;
  }
  planetAt(position: HexCoordinate): Planet | undefined {
    return this.#ownedPlanets().find(
      (planet) => planet.position.key === position.key,
    );
  }
  planetSnapshot(
    planet: Planet,
    slotIndex?: number,
  ): PlanetGameSnapshot | null {
    const state = this.#colonies.get(planet.id);
    if (!state) return null;
    const environment = this.#environment(planet, state);
    const { budget, blocks } = this.#allocation(planet, state);
    const projectSnapshot = (project: Project): ConstructionProjectSnapshot =>
      Object.freeze({
        ...project,
        ...(project.parts
          ? { parts: Object.freeze({ ...project.parts }) }
          : {}),
        blockedReason:
          blocks.get(project.id) === 'Waiting for resources.'
            ? this.supplyStatus(planet.id)
            : (blocks.get(project.id) ?? null),
      });
    const buildings = Object.freeze(
      state.buildings.map((building) =>
        Object.freeze({
          id: building.id,
          type: building.type,
          slotIndex: building.slotIndex,
          scheduledForDemolition: building.demolition,
          operational:
            !building.demolition &&
            state.buildings
              .filter((b) => !b.demolition)
              .reduce((n, b) => n + BUILDINGS[b.type].workers, 0) <=
              state.population,
        }),
      ),
    );
    const projects = Object.freeze(state.projects.map(projectSnapshot));
    return Object.freeze({
      id: planet.id,
      name: planet.name,
      population: state.population,
      environment: planet.type === 'gas' ? 'Gas' : planet.environment,
      breathable: environment.breathable,
      populationCapacity: environment.populationCapacity,
      potentialBuildSlots: planet.buildSlots,
      habitability: environment.habitability,
      buildSlots: environment.buildSlots,
      budget: Object.freeze(budget),
      economy: this.#economySnapshot(planet, state),
      buildings,
      projects,
      position: planet.position,
      sites: Object.freeze(
        Array.from({ length: planet.buildSlots }, (_, index) =>
          Object.freeze({
            index,
            locked: index >= environment.buildSlots,
            requiredHabitability: environment.thresholdForSite(index),
            hasDome: state.domes?.includes(index) ?? false,
            domeRequired: planet.type === 'solid' && !environment.breathable,
            domeType: this.#domeType(planet),
            domeBlockedReason: this.#domeType(planet)
              ? this.canBuild(planet, this.#domeType(planet)!, index)
              : 'No Dome technology exists for this planet type.',
            building:
              buildings.find((building) => building.slotIndex === index) ??
              null,
            project:
              projects.find((project) => project.slotIndex === index) ?? null,
          }),
        ),
      ),
      buildOptions: Object.freeze(
        (
          [
            'Research station',
            'Iron mine',
            'Water extractor',
            'Oil extractor',
            ...TECHNOLOGIES.filter(
              (type) =>
                type !== 'Trade logistics' &&
                this.#research.completed.has(type) &&
                (!BUILDINGS[type].environment ||
                  (planet.type === 'solid' &&
                    BUILDINGS[type].environment === planet.environment)),
            ),
          ] as BuildType[]
        ).map((type) =>
          Object.freeze({
            type,
            blockedReason: this.canBuild(planet, type, slotIndex),
          }),
        ),
      ),
    });
  }
  #researchQueueIssue(): string | null {
    return this.#ownedPlanets().some((planet) =>
      this.#state(planet).buildings.some(
        (building) =>
          building.type === 'Research station' && !building.demolition,
      ),
    )
      ? null
      : 'Build a Research station before queuing research.';
  }
  get research(): ResearchSnapshot {
    return Object.freeze({
      queueBlockedReason: this.#researchQueueIssue(),
      available: Object.freeze(this.#availableResearch()),
      completed: Object.freeze([...this.#research.completed]),
      selected: this.#research.queue[0] ?? null,
      queue: Object.freeze([...this.#research.queue]),
      stations: this.#ownedPlanets().reduce(
        (count, planet) =>
          count +
          (this.#costBlock(this.#budget(planet, this.#state(planet)))
            ? 0
            : this.#state(planet).buildings.filter(
                (b) => b.type === 'Research station' && !b.demolition,
              ).length),
        0,
      ),
    });
  }
  selectResearch(type: Technology | null): void {
    this.#requirePlanning();
    if (type === null) this.#research.queue = [];
    else {
      const issue = this.#researchQueueIssue();
      if (issue) throw new Error(issue);
      if (!this.#availableResearch().includes(type))
        throw new Error(
          'Discover this planet type before researching its technology.',
        );
      this.#research.add(type);
    }
  }
  moveResearch(type: Technology, index: number): void {
    this.#requirePlanning();
    this.#research.move(type, index);
  }
  removeResearch(type: Technology): void {
    this.#requirePlanning();
    this.#research.remove(type);
  }
  planetOrders(): readonly PlanetOrderSnapshot[] {
    return Object.freeze(
      this.#ownedPlanets().map((planet) => {
        const state = this.#state(planet);
        return Object.freeze({
          planetId: planet.id,
          position: planet.position,
          emptySites:
            this.#environment(planet, state).buildSlots -
            state.buildings.length -
            state.projects.filter((p) => p.slotIndex !== null).length,
          emptyQueues:
            !state.projects.length && this.#canChooseProduction(planet, state)
              ? 1
              : 0,
        });
      }),
    );
  }
  canColonize(fleetId: string): string | null {
    if (this.#phase !== 'planning')
      return 'Orders are locked during simulation.';
    const fleet = this.#fleetState(fleetId);
    if (fleet.routeId) return 'Release this fleet from its trade route first.';
    const planet = this.galaxy.systems
      .flatMap((system) => system.planets)
      .find((p) => p.position.key === fleet.position?.key);
    if (!planet || planet.colony || this.#colonies.has(planet.id))
      return 'Choose an uninhabited planet.';
    if (fleet.ships['Colony ship'] < 1)
      return 'A Colony ship is required at this planet.';
    return null;
  }
  colonize(fleetId: string): readonly Discovery[] {
    const why = this.canColonize(fleetId);
    if (why) throw new Error(why);
    const fleet = this.#fleetState(fleetId);
    const planet = this.galaxy.systems
      .flatMap((system) => system.planets)
      .find((p) => p.position.key === fleet.position?.key)!;
    const coloniser = fleet
      .shipUnits!.toSorted((a, b) => a.id.localeCompare(b.id))
      .find((unit) => unit.type === 'Colony ship')!;
    fleet.shipUnits = fleet.shipUnits!.filter(
      (unit) => unit.id !== coloniser.id,
    );
    fleet.ships['Colony ship'] -= 1;
    this.#releaseEmptyFleet(fleet);
    this.#colonies.set(planet.id, {
      stock: emptyStock(),
      deposits: this.#initialDeposits(planet),
      habitability: planet.habitability,
      domes: [],
      population: SHIPS['Colony ship'].crew,
      buildings: [],
      projects: [],
      homeFleetId: fleet.id,
    });
    this.#refreshReinforcements();
    this.#reveal(planet.position);
    const discoveries = this.#newDiscoveries({ movements: [] });
    this.#mapCells = null;
    this.#events.push(
      Object.freeze({
        id: this.#id('event'),
        round: this.#round,
        text: `${planet.name} was colonized by ${fleet.name}.`,
      }),
    );
    return discoveries;
  }
  pirateSnapshots(): readonly PirateSnapshot[] {
    return Object.freeze(
      this.#pirates
        .filter((pirate) => this.#explored.has(pirate.position.key))
        .map((pirate) => pirate.snapshot()),
    );
  }

  fleetSnapshots(): readonly FleetSnapshot[] {
    return Object.freeze(
      this.#fleets.map((fleet) =>
        Object.freeze({
          id: fleet.id,
          name: this.#fleetDisplayName(fleet),
          ownName: fleet.name,
          exploration: fleet.exploration,
          remainingMovement: this.#simulation?.remaining.get(fleet.id),
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
          routeId: fleet.routeId,
          joinFleetId: fleet.joinFleetId,
          releaseRequested: fleet.releaseRequested,
          cargo: Object.freeze(this.#cargo(fleet.id)),
        }),
      ),
    );
  }
  fleet(id: string): FleetSnapshot | null {
    return this.fleetSnapshots().find((fleet) => fleet.id === id) ?? null;
  }
  canBuild(planet: Planet, type: BuildType, slotIndex?: number): string | null {
    const state = this.#colonies.get(planet.id);
    if (!state) return 'This planet is not owned.';
    if (this.#phase !== 'planning')
      return 'Orders are locked during simulation.';
    if (!Object.hasOwn(BUILDINGS, type)) return 'Unknown building type.';
    if (
      ![
        'Research station',
        'Iron mine',
        'Water extractor',
        'Oil extractor',
      ].includes(type) &&
      !this.#research.completed.has(type as Technology)
    )
      return 'Research this building first.';
    const definition = BUILDINGS[type];
    const environment = this.#environment(planet, state);
    if (
      definition.environment &&
      (planet.type !== 'solid' || definition.environment !== planet.environment)
    )
      return 'This building requires a matching solid planet type.';
    const slot = slotIndex ?? this.#emptySlot(planet, state, type);
    if (
      slot < 0 &&
      !definition.sitePreparation &&
      planet.type === 'solid' &&
      !environment.breathable &&
      this.#emptySlot(planet, state) >= 0
    )
      return 'Build a Dome at this site first.';
    if (
      slot < 0 ||
      !Number.isInteger(slot) ||
      slot >= environment.buildSlots ||
      state.buildings.some((b) => b.slotIndex === slot) ||
      state.projects.some((p) => p.slotIndex === slot)
    )
      return 'No build slots are available at this site.';
    if (definition.sitePreparation) {
      if (environment.breathable)
        return 'Domes are unnecessary in a breathable atmosphere.';
      if (state.domes?.includes(slot)) return 'This site already has a Dome.';
    } else if (
      planet.type === 'solid' &&
      !environment.breathable &&
      !state.domes?.includes(slot)
    )
      return 'Build a Dome at this site first.';
    const resource = BUILDINGS[type].extraction;
    if (resource && state.deposits[resource] <= 0)
      return 'This planet has no remaining deposit of this resource.';
    return null;
  }
  scheduleBuild(
    planet: Planet,
    type: BuildType,
    slotIndex?: number,
  ): ProductionReceipt {
    const why = this.canBuild(planet, type, slotIndex);
    if (why) throw new Error(why);
    const state = this.#state(planet);
    return this.#scheduleProject(planet, type, {
      destinationFleetId: null,
      slotIndex: slotIndex ?? this.#emptySlot(planet, state, type),
      factoryId: null,
    });
  }
  cancelProject(planet: Planet, projectId: string): void {
    this.#requirePlanning();
    const state = this.#state(planet);
    state.projects = state.projects.filter((p) => p.id !== projectId);
    this.#logistics.reserve(this.#logisticsPort());
  }
  toggleDemolition(planet: Planet, buildingId: string): void {
    this.#requirePlanning();
    const building = this.#state(planet).buildings.find(
      (item) => item.id === buildingId,
    );
    if (!building) throw new Error('Building was not found.');
    building.demolition = !building.demolition;
  }
  productionIssue(planet: Planet, type: ProjectType): string | null {
    try {
      this.#requirePlanning();
      const state = this.#state(planet);
      if (Object.hasOwn(BUILDINGS, type)) {
        const issue = this.canBuild(planet, type as BuildType);
        if (issue) return issue;
      } else {
        const definition = projectDefinition(type);
        if (
          !state.buildings.some(
            (b) =>
              !b.demolition &&
              (definition.ship
                ? BUILDINGS[b.type].ship === type
                : BUILDINGS[b.type].component === type),
          )
        )
          return definition.ship
            ? 'A matching completed shipyard is required.'
            : 'A matching completed component factory is required.';
      }
      this.#planProject(planet, type);
      return null;
    } catch (error) {
      return error instanceof Error
        ? error.message
        : 'The order could not be completed.';
    }
  }

  // dome-fore-fabriksforslag: factories need a prepared, unoccupied site.
  #productionSites(snapshot: PlanetGameSnapshot) {
    const free = snapshot.sites.filter(
      (site) => !site.locked && !site.building && !site.project,
    );
    return {
      prepared: free.some((site) => !site.domeRequired || site.hasDome),
      domeSite: free.find(
        (site) => site.domeRequired && !site.hasDome && site.domeType,
      ),
    };
  }

  productionGuidance(planet: Planet): ProductionGuidance {
    const snapshot = this.planetSnapshot(planet)!;
    const { prepared, domeSite } = this.#productionSites(snapshot);
    if (prepared)
      return Object.freeze({
        kind: 'factory',
        message: 'Build a matching factory at an available building site.',
        dome: null,
      });
    if (domeSite) {
      const type = domeSite.domeType!;
      const unlocked = this.#research.completed.has(type as Technology);
      return Object.freeze({
        kind: unlocked ? 'dome' : 'research',
        message: unlocked
          ? `Build a ${type} to prepare a building site.`
          : `Research ${type} before preparing a building site.`,
        dome: unlocked ? type : null,
      });
    }
    if (
      snapshot.projects.some(
        (project) => BUILDINGS[project.type as BuildType]?.sitePreparation,
      )
    )
      return Object.freeze({
        kind: 'waiting',
        message:
          'A Dome is already queued. Wait for it to complete before building a factory.',
        dome: null,
      });
    return Object.freeze({
      kind: 'full',
      message:
        'No building sites are available. Free a site or increase habitability.',
      dome: null,
    });
  }

  productionOptions(planet: Planet): readonly ProductionOption[] {
    const snapshot = this.planetSnapshot(planet)!;
    const { prepared, domeSite } = this.#productionSites(snapshot);
    const buildings = snapshot.buildOptions.filter((option) =>
      BUILDINGS[option.type].sitePreparation ? !!domeSite : prepared,
    );
    buildings.sort(
      (a, b) =>
        Number(!!BUILDINGS[b.type].sitePreparation) -
        Number(!!BUILDINGS[a.type].sitePreparation),
    );
    const types: ProjectType[] = [
      ...buildings.map((o) => o.type),
      ...new Set(
        snapshot.buildings.flatMap((b) => {
          const definition = BUILDINGS[b.type];
          return definition.ship
            ? [definition.ship]
            : definition.component
              ? [definition.component]
              : [];
        }),
      ),
    ];
    const missing = new Map<ProjectType, readonly BuildType[]>();
    const factoryTypes = Object.keys(BUILDINGS) as BuildType[];
    const producers = new Set(
      [...this.#colonies.values()].flatMap((colony) =>
        colony.buildings
          .filter((building) => !building.demolition)
          .map((building) => building.type),
      ),
    );
    const options = types.map((type): ProductionOption => {
      const definition = projectDefinition(type);
      const product = Object.hasOwn(BUILDINGS, type)
        ? (definition.ship ?? definition.component)
        : null;
      const parts = {
        ...definition.parts,
        ...(product ? projectDefinition(product).parts : {}),
      };
      const groups: BuildType[][] = [];
      for (const component of COMPONENTS) {
        if (!(parts[component] ?? 0)) continue;
        const alternatives = factoryTypes.filter((factory) => {
          const produced = BUILDINGS[factory].component;
          return component === 'Rocket engine' ||
            component === 'Ion pulse engine'
            ? produced === 'Rocket engine' || produced === 'Ion pulse engine'
            : produced === component;
        });
        if (
          !alternatives.some((factory) => producers.has(factory)) &&
          !groups.some((group) => group.join() === alternatives.join())
        )
          groups.push(alternatives);
      }
      missing.set(type, groups.flat());
      const counts = this.#productionCounts(planet, snapshot, type);
      return Object.freeze({
        type,
        category: Object.hasOwn(BUILDINGS, type)
          ? 'Buildings'
          : definition.ship
            ? 'Ships'
            : 'Components',
        description: definition.description,
        cost: Object.freeze({ ...definition.cost }),
        workers: definition.workers,
        crew: definition.crew,
        parts: Object.freeze({ ...(definition.parts ?? {}) }),
        blockedReason: this.productionIssue(planet, type),
        dependencyWarning: groups.length
          ? `Missing production factories: ${groups.map((group) => group.join(' or ')).join('; ')}.`
          : null,
        ...counts,
      });
    });
    return prioritizeProduction(options, missing);
  }

  #productionCounts(
    planet: Planet,
    snapshot: PlanetGameSnapshot,
    type: ProjectType,
  ) {
    if (COMPONENTS.includes(type as Component)) {
      const component = type as Component;
      return {
        localCount: this.#state(planet).stock[component],
        empireCount:
          [...this.#colonies.values()].reduce(
            (total, colony) => total + colony.stock[component],
            0,
          ) +
          this.#logistics.shipments
            .filter(
              (shipment) =>
                shipment.resource === component && shipment.fleetId !== null,
            )
            .reduce((total, shipment) => total + shipment.amount, 0),
      };
    }
    if (Object.hasOwn(SHIPS, type)) {
      const ship = type as ShipType;
      return {
        localCount: this.#fleets
          .filter((fleet) => fleet.position?.key === planet.position.key)
          .reduce((total, fleet) => total + fleet.ships[ship], 0),
        empireCount: this.#fleets.reduce(
          (total, fleet) => total + fleet.ships[ship],
          0,
        ),
      };
    }
    const building = type as BuildType;
    if (BUILDINGS[building].sitePreparation)
      return {
        localCount: this.#state(planet).domes?.length ?? 0,
        empireCount: this.#ownedPlanets()
          .filter((owned) => this.#domeType(owned) === type)
          .reduce(
            (total, owned) => total + (this.#state(owned).domes?.length ?? 0),
            0,
          ),
      };
    return {
      localCount: snapshot.buildings.filter((built) => built.type === type)
        .length,
      empireCount: [...this.#colonies.values()].reduce(
        (total, colony) =>
          total +
          colony.buildings.filter((built) => built.type === type).length,
        0,
      ),
    };
  }

  supplyChain(projectId: string | null): SupplyChainSnapshot {
    return projectSupplyChain(
      projectId,
      [...this.#colonies].flatMap(([planetId, state]) =>
        state.projects.map((p) => ({ id: p.id, planetId })),
      ),
      this.#logistics.componentOrders,
      this.#logistics.shipments,
      (from, to) =>
        this.#logistics.path(from, to, this.#logisticsPort())?.planets ?? null,
      (from, to) =>
        this.#logistics.routes.find(
          (r) => [r.a, r.b].includes(from) && [r.a, r.b].includes(to),
        )?.id,
    );
  }

  scheduleShip(
    planet: Planet,
    type: ShipType,
    destinationFleetId: string | null = null,
    factoryId?: string,
  ): ProductionReceipt {
    this.#requirePlanning();
    if (!Object.hasOwn(SHIPS, type)) throw new Error('Unknown ship type.');
    this.#validateProjectFleet(planet, destinationFleetId);
    const building = this.#state(planet).buildings.find(
      (b) =>
        (!factoryId || b.id === factoryId) &&
        BUILDINGS[b.type].ship === type &&
        !b.demolition,
    );
    if (!building)
      throw new Error('A matching completed shipyard is required.');
    return this.#scheduleProject(planet, type, {
      destinationFleetId,
      slotIndex: null,
      factoryId: building.id,
    });
  }
  scheduleComponent(planet: Planet, component: Component): ProductionReceipt {
    this.#requirePlanning();
    if (!COMPONENTS.includes(component))
      throw new Error('Unknown component type.');
    const state = this.#state(planet);
    const factory = state.buildings.find(
      (b) => !b.demolition && BUILDINGS[b.type].component === component,
    );
    if (!factory)
      throw new Error('A matching completed component factory is required.');
    return this.#scheduleProject(planet, component, {
      destinationFleetId: null,
      slotIndex: null,
      factoryId: factory.id,
    });
  }

  #planProject(planet: Planet, type: ProjectType) {
    let sequence = this.#sequence;
    const id = (prefix: string) => `${prefix}-${sequence++}`;
    const projectId = id('project');
    const sites = this.#ownedPlanets().map((site) => {
      const state = this.#state(site);
      const factories: Partial<Record<Component, string>> = {};
      for (const building of state.buildings) {
        const component = BUILDINGS[building.type].component;
        if (component && !building.demolition)
          factories[component] = building.id;
      }
      return {
        id: site.id,
        stock: state.stock,
        factories,
        projects: state.projects.map((project) => {
          const definition = projectDefinition(project.type);
          return {
            id: project.id,
            parts: project.parts ?? definition.parts,
            component: definition.permanent ? undefined : definition.component,
          };
        }),
      };
    });
    const plan = new ComponentPlanner(
      sites,
      this.#logistics,
      this.#logisticsPort(),
      id,
    ).plan(projectId, planet.id, projectDefinition(type).parts ?? {});
    return { plan, sequence, projectId };
  }
  #scheduleProject(
    planet: Planet,
    type: ProjectType,
    fields: Omit<Project, 'id' | 'type'>,
  ): ProductionReceipt {
    const { plan, sequence, projectId } = this.#planProject(planet, type);
    for (const production of plan.production)
      this.#colonies.get(production.planetId)!.projects.push({
        id: production.id,
        type: production.component,
        factoryId: production.factoryId,
        slotIndex: null,
        destinationFleetId: null,
      });
    this.#state(planet).projects.push({
      id: projectId,
      type,
      ...fields,
      parts: plan.parts,
    });
    this.#logistics.componentOrders.push(...plan.orders);
    this.#sequence = sequence;
    this.#logistics.reserve(this.#logisticsPort());
    return Object.freeze({
      projectId,
      planetId: planet.id,
      product: type,
      queuePosition:
        this.#state(planet).projects.findIndex(
          (project) => project.id === projectId,
        ) + 1,
    });
  }
  moveProject(planet: Planet, id: string, index: number): void {
    this.#requirePlanning();
    const state = this.#state(planet);
    const projects = state.projects.some((p) => p.id === id)
      ? state.projects
      : null;
    if (
      !projects ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= projects.length
    )
      throw new Error('Choose a valid planet queue position.');
    const previous = projects.findIndex((p) => p.id === id);
    const [project] = projects.splice(previous, 1);
    projects.splice(index, 0, project!);
    this.#logistics.reserve(this.#logisticsPort());
  }
  setProjectFleet(planet: Planet, id: string, fleetId: string | null): void {
    this.#requirePlanning();
    this.#validateProjectFleet(planet, fleetId);
    const project = this.#state(planet).projects.find((p) => p.id === id);
    if (!project || !projectDefinition(project.type).ship)
      throw new Error('Choose a ship production order.');
    project.destinationFleetId = fleetId;
  }
  #emptySlot(planet: Planet, state: ColonyState, type?: BuildType): number {
    const environment = this.#environment(planet, state);
    const preparation = type && BUILDINGS[type].sitePreparation;
    return (
      Array.from({ length: environment.buildSlots }, (_, index) => index).find(
        (index) =>
          (!preparation || !state.domes?.includes(index)) &&
          (!type ||
            preparation ||
            planet.type === 'gas' ||
            environment.breathable ||
            state.domes?.includes(index)) &&
          !state.buildings.some((b) => b.slotIndex === index) &&
          !state.projects.some((p) => p.slotIndex === index),
      ) ?? -1
    );
  }
  #validateProjectFleet(planet: Planet, id: string | null): void {
    const fleet = id ? this.#fleetState(id) : null;
    if (fleet?.position && fleet.position.key !== planet.position.key)
      throw new Error('Choose an empty fleet or a fleet at this planet.');
  }
  produceFighter(planet: Planet): void {
    this.scheduleShip(planet, 'Fighter');
  }
  renameFleet(id: string, name: string): void {
    this.#requirePlanning();
    const fleet = this.#fleetState(id);
    const clean = name.trim();
    if (!clean || clean.length > 40)
      throw new Error('Fleet names must be 1–40 characters.');
    if (
      this.#fleets.some(
        (other) =>
          other.id !== id && other.name.toLowerCase() === clean.toLowerCase(),
      )
    )
      throw new Error('Fleet names must be unique.');
    fleet.name = clean;
  }
  transferShips(
    sourceId: string,
    ship: ShipType,
    amount: number,
    targetId: string | null,
    shipId?: string,
  ): FleetSnapshot {
    this.#requirePlanning();
    const source = this.#fleetState(sourceId);
    const issue = shipTransferIssue({
      routeId: source.routeId,
      cargo: this.#cargo(source.id),
    });
    if (issue) throw new Error(issue);
    if (!Number.isInteger(amount) || amount < 1 || source.ships[ship] < amount)
      throw new Error('Choose an available number of ships.');
    const selected = source
      .shipUnits!.filter(
        (unit) => unit.type === ship && (!shipId || unit.id === shipId),
      )
      .toSorted((a, b) => a.id.localeCompare(b.id))
      .slice(0, amount);
    if (selected.length !== amount)
      throw new Error('Choose an available ship.');
    const moveUnits = (target: Fleet) => {
      source.shipUnits = source.shipUnits!.filter(
        (unit) => !selected.includes(unit),
      );
      (target.shipUnits ??= []).push(...selected);
    };
    let target: Fleet;
    if (targetId) {
      target = this.#fleetState(targetId);
      if (target.id === source.id) throw new Error('Choose another fleet.');
      if (target.position && target.position.key !== source.position?.key) {
        const group: Fleet = {
          id: this.#id('fleet'),
          name: this.#nextFleetName(),
          position: source.position,
          destination: target.position,
          courseOrigin: source.position!,
          joinFleetId: target.id,
          ships: { ...zeroShips(), [ship]: amount },
        };
        moveUnits(group);
        source.ships[ship] -= amount;
        this.#fleets.push(group);
        this.#releaseEmptyFleet(source);
        this.#refreshReinforcements();
        return this.fleet(group.id)!;
      }
    } else {
      target = {
        id: this.#id('fleet'),
        name: this.#nextFleetName(),
        position: source.position,
        destination: null,
        ships: zeroShips(),
      };
      this.#fleets.push(target);
    }
    if (target.id === source.id) throw new Error('Choose another fleet.');
    target.position = source.position;
    moveUnits(target);
    source.ships[ship] -= amount;
    target.ships[ship] += amount;
    this.#releaseEmptyFleet(source);
    this.#refreshReinforcements();
    return this.fleet(target.id)!;
  }
  createFleet(sourceId?: string): FleetSnapshot {
    this.#requirePlanning();
    if (sourceId) this.#fleetState(sourceId);
    const fleet: Fleet = {
      id: this.#id('fleet'),
      name: this.#nextFleetName(),
      position: null,
      destination: null,
      ships: zeroShips(),
      shipUnits: [],
    };
    this.#fleets.push(fleet);
    return this.fleet(fleet.id)!;
  }
  deleteFleet(id: string): void {
    this.#requirePlanning();
    const fleet = this.#fleetState(id);
    if (this.#shipCount(fleet.ships) !== 0)
      throw new Error('Only empty fleets can be deleted.');
    this.#fleets = this.#fleets.filter((candidate) => candidate.id !== id);
    this.#refreshReinforcements();
  }
  setDestination(id: string, destination: HexCoordinate): void {
    this.#requireFleetOrders(id);
    if (!this.galaxy.cellAt(destination))
      throw new Error('Choose a hex on the map.');
    const fleet = this.#fleetState(id);
    this.#requireManualFleet(fleet);
    if (this.#shipCount(fleet.ships) === 0)
      throw new Error('Empty fleets cannot receive destinations.');
    delete fleet.joinFleetId;
    delete fleet.exploration;
    fleet.destination = destination;
    fleet.courseOrigin = fleet.position!;
  }
  clearDestination(id: string): void {
    this.#requireFleetOrders(id);
    delete this.#fleetState(id).exploration;
    this.#requireManualFleet(this.#fleetState(id));
    this.#fleetState(id).destination = null;
    delete this.#fleetState(id).joinFleetId;
    delete this.#fleetState(id).courseOrigin;
  }
  get interruption(): SavedTurnSimulation | null {
    return this.#phase === 'interrupted' ? this.#simulation!.snapshot() : null;
  }
  canIssueFleetOrders(id: string): boolean {
    const fleet = this.#fleets.find((candidate) => candidate.id === id);
    return (
      !!fleet?.position &&
      !fleet.routeId &&
      (this.#phase === 'planning' ||
        (this.#phase === 'interrupted' && !!this.#simulation?.permits(id)))
    );
  }
  #requireFleetOrders(id: string): void {
    const fleet = this.#fleetState(id);
    if (!fleet.position)
      throw new Error('Empty fleets cannot receive destinations.');
    this.#requireManualFleet(fleet);
    if (!this.canIssueFleetOrders(id))
      throw new Error(
        'Orders are only available while planning or handling a discovery.',
      );
  }
  setExploration(id: string, order: ExplorationOrder): void {
    this.#requireFleetOrders(id);
    if (!['explore', 'explore-stars'].includes(order))
      throw new Error('Unknown exploration order.');
    const fleet = this.#fleetState(id);
    if (!fleet.ships['Exploration ship'])
      throw new Error('An Exploration ship is required.');
    delete fleet.joinFleetId;
    fleet.exploration = order;
    this.#updateExploration(fleet);
  }
  handleDiscoveries(): void {
    if (this.#phase !== 'interrupted')
      throw new Error('No discovery to handle.');
    this.#simulation!.handling = true;
  }
  allowOtherFleetOrders(): void {
    if (this.#phase !== 'interrupted' || !this.#simulation!.handling)
      throw new Error('Handle the discovery first.');
    this.#simulation!.otherFleets = true;
  }
  continueTurn(): void {
    if (this.#phase !== 'interrupted') throw new Error('No interrupted year.');
    this.#simulation!.discoveries = [];
    this.#simulation!.handling = false;
    this.#simulation!.otherFleets = false;
    this.#phase = 'simulating';
  }
  startTurn(): void {
    this.#requirePlanning();
    this.#logistics.prepare(this.#logisticsPort());
    this.#refreshReinforcements();
    this.#mergeReinforcements();
    this.#simulation = new TurnSimulation([
      ...this.#fleets.map((fleet) => [fleet.id, this.#speed(fleet)] as const),
      ...this.#pirates.map((pirate) => [pirate.id, 1] as const),
    ]);
    this.#phase = 'simulating';
  }
  nextTurnFrame(): TurnFrame | null {
    if (this.#phase !== 'simulating') return null;
    if (this.#pendingFrame) return this.#pendingFrame;
    if (this.#simulation!.awaitingCombat) {
      const forecast = this.#movingFleets().map((fleet) => ({
        ...fleet,
        ships: { ...fleet.ships },
        shipUnits: fleet.shipUnits ? [...fleet.shipUnits] : [],
      }));
      return (this.#pendingFrame = Object.freeze({
        movements: Object.freeze([]),
        combats: FleetCombat.resolve(
          forecast,
          new Set(this.#pirates.map((pirate) => pirate.id)),
        ),
      }));
    }
    for (const fleet of this.#fleets) this.#updateExploration(fleet);
    const pirates = new Map(this.#pirates.map((pirate) => [pirate.id, pirate]));
    const frame = FleetPursuit.plan(
      this.#movingFleets(),
      (fleet) =>
        pirates.has(fleet.id)
          ? [pirates.get(fleet.id)!.nextPosition(this.galaxy)]
          : this.#route(fleet).path,
      (fleet) => ((this.#simulation!.remaining.get(fleet.id) ?? 0) > 0 ? 1 : 0),
    )[0];
    return (this.#pendingFrame = frame
      ? Object.freeze({ movements: frame.movements })
      : null);
  }
  #movingFleets(): PursuingFleet[] {
    return [
      ...this.#fleets,
      ...this.#pirates.map((pirate) => pirate.movingFleet()),
    ];
  }
  applyFrame(frame: TurnFrame): void {
    if (this.#phase !== 'simulating')
      throw new Error('No turn is being simulated.');
    if (frame !== this.#pendingFrame)
      throw new Error('This turn step is no longer current.');
    this.#pendingFrame = null;
    for (const movement of frame.movements) {
      this.#simulation!.spend(movement.fleetId);
      const pirate = this.#pirates.find(
        (pirate) => pirate.id === movement.fleetId,
      );
      if (pirate) {
        pirate.position = movement.to;
        continue;
      }
      const fleet = this.#fleetState(movement.fleetId);
      fleet.position = movement.to;
      this.#reveal(movement.to, fleet.ships['Exploration ship'] > 0);
      this.#recordArrival(fleet);
    }
    if (frame.combats === undefined) {
      this.#simulation!.awaitingCombat = true;
      const discoveries = this.#newDiscoveries(frame);
      if (discoveries.length) {
        this.#simulation!.discoveries = discoveries;
        this.#phase = 'interrupted';
      }
      return;
    }
    this.#simulation!.awaitingCombat = false;
    for (const combat of frame.combats ?? []) {
      const fleet = this.#fleetState(combat.fleetId);
      const pirate = this.#pirates.find(
        (pirate) => pirate.id === combat.pirateId,
      )!;
      FleetCombat.applyLosses(fleet, combat.losses);
      pirate.count = combat.survivingPirates;
      if (combat.losses['Transport ship'] > 0)
        this.#logistics.destroyCargo(fleet.id);
      this.#releaseEmptyFleet(fleet);
      const losses =
        (Object.entries(combat.losses) as [ShipType, number][])
          .filter(([, count]) => count > 0)
          .map(([type, count]) => `${count} ${type}`)
          .join(', ') || 'no ships';
      this.#event(
        `Combat at HEX ${combat.position.key}: ${this.#fleetDisplayName(fleet)} versus Space pirate. Lost ${losses}; destroyed ${combat.pirateLosses} pirates. Survivors: ${combat.survivingFighters} Fighters, ${combat.survivingPirates} pirates, ${fleet.ships['Colony ship'] + fleet.ships['Exploration ship'] + fleet.ships['Transport ship']} civilian ships.`,
      );
    }
    for (const pirate of this.#pirates)
      if (pirate.count <= 0) this.#simulation!.remaining.delete(pirate.id);
    this.#pirates = this.#pirates.filter((pirate) => pirate.count > 0);
    this.#mergeReinforcements();
    this.#refreshReinforcements();
    for (const fleet of this.#fleets) this.#updateExploration(fleet);
  }
  finishTurn(): void {
    if (this.#phase !== 'simulating')
      throw new Error('No turn is being simulated.');
    if (this.#simulation?.awaitingCombat || this.nextTurnFrame())
      throw new Error('Complete the remaining turn steps first.');
    for (const fleet of this.#fleets) this.#recordArrival(fleet);
    this.#logistics.unload(this.#logisticsPort());
    const researchStations = this.research.stations;
    for (const planet of this.#ownedPlanets()) {
      const state = this.#state(planet);
      new PlanetEconomy(state.stock, state.deposits).extract(
        this.#extraction(planet, state),
      );
    }
    for (const planet of this.#ownedPlanets()) {
      const state = this.#state(planet);
      for (const building of state.buildings.filter((b) => b.demolition))
        this.#event(`${building.type} was demolished on ${planet.name}.`);
      state.buildings = state.buildings.filter((b) => !b.demolition);
      const staffed =
        state.buildings.reduce(
          (total, b) => total + BUILDINGS[b.type].workers,
          0,
        ) <= state.population;
      const improvement =
        planet.type === 'solid' && staffed
          ? state.buildings.reduce(
              (total, b) =>
                total +
                (BUILDINGS[b.type].environment === planet.environment
                  ? (BUILDINGS[b.type].terraforming ?? 0)
                  : 0),
              0,
            )
          : 0;
      const previousHabitability = this.#environment(
        planet,
        state,
      ).habitability;
      state.habitability = Math.min(100, previousHabitability + improvement);
      if (state.habitability !== previousHabitability)
        this.#event(
          `Habitability on ${planet.name} increased to ${state.habitability}%.`,
        );
      const { blocks } = this.#allocation(planet, state);
      const active = state.projects.slice(0, 1);
      for (const project of active) {
        const blocked = blocks.get(project.id);
        if (blocked)
          this.#event(
            `${project.type} is waiting on ${planet.name}: ${blocked}`,
          );
        else {
          const cost = this.#projectCost(planet, project);
          for (const resource of MATERIALS)
            state.stock[resource] -= cost[resource];
          project.parts = {
            ...project.parts,
            'Rocket engine': cost['Rocket engine'],
            'Ion pulse engine': cost['Ion pulse engine'],
          };
          state.projects.shift();
          this.#completeProject(planet, state, project);
        }
      }
      const environment = this.#environment(planet, state);
      const growth = Math.max(
        0,
        Math.min(
          environment.populationCapacity - state.population,
          Math.floor((state.population * 0.1 * environment.habitability) / 100),
        ),
      );
      state.population += growth;
      this.#event(`Population on ${planet.name} changed by +${growth}.`);
    }
    const researched = this.#research.advance(researchStations);
    if (researched) this.#event(`Research completed: ${researched}.`);
    this.#round += 1;
    this.#decisions.skipped.clear();
    this.#logistics.cleanup(this.#logisticsPort());
    this.#refreshReinforcements();
    this.#phase = 'planning';
    this.#simulation = null;
    this.#logistics.reserve(this.#logisticsPort());
  }
  #completeProject(planet: Planet, state: ColonyState, project: Project): void {
    const d = projectDefinition(project.type);
    if (d.sitePreparation) {
      state.domes ??= [];
      state.domes.push(project.slotIndex!);
      this.#event(
        `${project.type} was completed at site ${project.slotIndex! + 1} on ${planet.name}.`,
      );
    } else if (d.permanent) {
      state.buildings.push({
        id: this.#id('building'),
        type: project.type as BuildType,
        slotIndex: project.slotIndex!,
        demolition: false,
      });
      this.#event(`${project.type} was completed on ${planet.name}.`);
    } else if (d.component) {
      state.stock[d.component] += 1;
      this.#logistics.completeComponent(project.id);
      this.#event(`${d.component} was produced at ${planet.name}.`);
    } else if (d.ship) {
      this.#createShip(
        planet,
        state,
        d.ship,
        project.destinationFleetId,
        project.parts,
      );
      this.#event(`${project.type} completed on ${planet.name}.`);
    }
  }
  #createShip(
    planet: Planet,
    state: ColonyState,
    ship: ShipType,
    destinationFleetId: string | null,
    parts: Partial<Record<Component, number>> = {},
  ): void {
    state.population -= SHIPS[ship].crew;
    let reserve =
      this.#fleets.find(
        (fleet) =>
          fleet.id === destinationFleetId &&
          (!fleet.position || fleet.position.key === planet.position.key),
      ) ??
      this.#fleets.find(
        (fleet) =>
          fleet.id === state.homeFleetId &&
          (!fleet.position || fleet.position.key === planet.position.key),
      );
    if (!reserve) {
      reserve = {
        id: this.#id('fleet'),
        name: this.#uniqueFleetName(`${planet.name} Home Fleet`),
        position: planet.position,
        destination: null,
        ships: zeroShips(),
      };
      this.#fleets.push(reserve);
      state.homeFleetId = reserve.id;
    }
    reserve.position = planet.position;
    reserve.ships[ship] += 1;
    (reserve.shipUnits ??= []).push({
      id: this.#id('ship'),
      type: ship,
      engines: {
        'Rocket engine': parts['Rocket engine'] ?? engineCount(ship),
        'Ion pulse engine': parts['Ion pulse engine'] ?? 0,
      },
    });
    this.#event(`${ship} was produced at ${planet.name}.`);
  }
  #budget(planet: Planet, state: ColonyState): BudgetSnapshot {
    return this.#allocation(planet, state).budget;
  }
  #initialDeposits(planet: Planet): Stock {
    return {
      ...emptyStock(),
      ...Object.fromEntries(
        RESOURCES.map((r) => [
          r,
          (planet.resources.find((yieldOf) => yieldOf.name === r)?.perYear ??
            0) * 100,
        ]),
      ),
    };
  }
  ownedPlanetSnapshots(): readonly PlanetGameSnapshot[] {
    return Object.freeze(
      this.#ownedPlanets().map((p) => this.planetSnapshot(p)!),
    );
  }
  get tradeRoutes(): readonly TradeRouteSnapshot[] {
    return this.#logistics.snapshots(this.#logisticsPort());
  }
  createTradeRoute(a: string, b: string): string {
    this.#requirePlanning();
    if (!this.#research.completed.has('Trade logistics'))
      throw new Error('Research Trade logistics first.');
    return this.#logistics.create(a, b, this.#logisticsPort());
  }
  assignTradeFleet(routeId: string, fleetId: string): void {
    this.#requirePlanning();
    const snapshots = this.fleetSnapshots();
    const source = this.#fleetState(fleetId);
    const route = this.tradeRoutes.find((route) => route.id === routeId);
    if (!route) throw new Error('Route is no longer available.');
    const issue = tradeAssignmentIssue(this.fleet(fleetId)!, route, snapshots);
    if (issue) throw new Error(issue);
    if (source.ships['Transport ship']) {
      this.#logistics.assign(routeId, source, this.#logisticsPort());
    } else {
      // rutt-eskortfordelning: include reinforcements already on their way.
      const targets = routeEscortTargets(routeId, snapshots).map((fleet) => ({
        id: fleet.id,
        fighters:
          fleet.ships.Fighter +
          snapshots
            .filter((group) => group.joinFleetId === fleet.id)
            .reduce((total, group) => total + group.ships.Fighter, 0),
        amount: 0,
      }));
      for (let count = source.ships.Fighter; count > 0; count--) {
        targets.sort(
          (a, b) => a.fighters - b.fighters || a.id.localeCompare(b.id),
        );
        targets[0]!.fighters++;
        targets[0]!.amount++;
      }
      for (const target of targets) {
        if (target.amount)
          this.transferShips(fleetId, 'Fighter', target.amount, target.id);
      }
    }
    this.#logistics.reserve(this.#logisticsPort());
  }
  releaseTradeFleet(fleetId: string): void {
    this.#requirePlanning();
    this.#logistics.release(this.#fleetState(fleetId));
  }
  closeTradeRoute(id: string): void {
    this.#requirePlanning();
    this.#logistics.close(id, this.#logisticsPort());
  }
  skipDecision(id: string): void {
    this.#requirePlanning();
    if (this.decisions.some((item) => item.id === id))
      this.#decisions.skipped.add(id);
  }
  muteDecision(id: string): void {
    this.#requirePlanning();
    const decision = this.decisions.find((item) => item.id === id);
    if (decision) this.#decisions.mute(decision);
  }
  unmuteDecision(id: string): void {
    this.#requirePlanning();
    this.#decisions.unmute(id);
  }
  get decisions(): readonly Decision[] {
    const items: DecisionDescriptor[] = [];
    if (
      !this.#research.queue.length &&
      !this.#researchQueueIssue() &&
      this.#availableResearch().some(
        (type) => !this.#research.completed.has(type),
      )
    )
      items.push({
        id: 'research-empty',
        label: 'Choose research',
        kind: 'research',
      });
    const supplies = this.supplyOverview().planets;
    for (const planet of this.#ownedPlanets()) {
      const state = this.#state(planet);
      if (!state.projects.length && this.#canChooseProduction(planet, state))
        items.push({
          id: `building-empty-${planet.id}`,
          label: `${planet.name}: choose production`,
          kind: 'planet',
          planetId: planet.id,
        });
      const supply = supplies.find((p) => p.id === planet.id)!;
      const status = this.#supplyDescription(supply);
      const { blocks } = this.#allocation(planet, state);
      if (
        [...blocks.values()].some((reason) =>
          reason.includes('factory is required'),
        )
      )
        items.push({
          id: `production-${planet.id}`,
          label: `${planet.name}: a required factory is missing`,
          kind: 'planet',
          planetId: planet.id,
        });
      if (
        [...blocks.values()].some((s) => s.includes('population')) ||
        state.buildings
          .filter((b) => !b.demolition)
          .reduce((n, b) => n + BUILDINGS[b.type].workers, 0) > state.population
      )
        items.push({
          id: `staff-${planet.id}`,
          label: `${planet.name}: not enough workers or crew`,
          kind: 'planet',
          planetId: planet.id,
        });
      if (supply.materials.some((material) => material.unprovided > 0))
        items.push({
          id: `supply-${planet.id}`,
          label: `${planet.name}: ${status.slice(16)}`,
          kind: 'planet',
          planetId: planet.id,
        });
    }
    for (const fleet of this.#fleets.filter(
      (f) =>
        !f.routeId &&
        !f.joinFleetId &&
        !f.destination &&
        this.#shipCount(f.ships),
    ))
      items.push({
        id: `fleet-idle-${fleet.id}`,
        label: `${this.#fleetDisplayName(fleet)}: choose an assignment`,
        kind: 'fleet',
        fleetId: fleet.id,
      });
    for (const route of this.tradeRoutes.filter(
      (r) => !r.closing && !r.capacity,
    ))
      items.push({
        id: `route-idle-${route.id}`,
        label: `${route.from} ↔ ${route.to}: assign transport fleet`,
        kind: 'route',
        routeId: route.id,
      });
    return this.#decisions.snapshot(items);
  }
  get shipments() {
    const projects = new Map(
      [...this.#colonies.values()].flatMap((state) =>
        state.projects.map((p) => [p.id, p.type] as const),
      ),
    );
    return Object.freeze(
      this.#logistics.shipmentSnapshots(this.#logisticsPort()).map((shipment) =>
        Object.freeze({
          ...shipment,
          project: shipment.projectId
            ? (projects.get(shipment.projectId) ?? null)
            : null,
        }),
      ),
    );
  }

  projectSupply(planetId?: string): readonly ProjectSupplySnapshot[] {
    const port = this.#logisticsPort();
    const inputs = this.#ownedPlanets().map((planet) => {
      const state = this.#state(planet);
      const workers = state.buildings
        .filter((b) => !b.demolition)
        .reduce((total, b) => total + BUILDINGS[b.type].workers, 0);
      let plannedWorkers = workers;
      return {
        id: planet.id,
        name: planet.name,
        stock: state.stock,
        reserved: this.#logistics.reserved(planet.id),
        extraction: this.#extraction(planet, state),
        deposits: state.deposits,
        projects: state.projects.map((project) => {
          const definition = projectDefinition(project.type);
          const factoryMissing =
            !definition.permanent &&
            !definition.sitePreparation &&
            !state.buildings.some(
              (b) =>
                !b.demolition &&
                (definition.ship
                  ? BUILDINGS[b.type].ship === definition.ship
                  : BUILDINGS[b.type].component === definition.component),
            );
          const issue = factoryMissing
            ? `A matching completed factory is required for ${project.type}.`
            : plannedWorkers + definition.workers + definition.crew >
                state.population
              ? 'Not enough workers or crew.'
              : null;
          plannedWorkers += definition.workers + definition.crew;
          return {
            id: project.id,
            type: project.type,
            cost: this.#projectCost(planet, project),
            issue,
          };
        }),
      };
    });
    return new ProjectSupply(
      inputs,
      this.#logistics.componentOrders,
      this.shipments,
      (from, to) => this.#logistics.path(from, to, port)?.planets ?? null,
      (from, to) =>
        this.#logistics.routes.find(
          (route) =>
            [route.a, route.b].includes(from) &&
            [route.a, route.b].includes(to),
        )?.id,
    ).forPlanet(planetId);
  }

  supplyOverview(): SupplyOverview {
    const inputs: SupplyPlanetInput[] = this.#ownedPlanets().map((planet) => {
      const state = this.#state(planet);
      const economy = this.#economySnapshot(planet, state);
      const project = state.projects[0] ?? null;
      const block = project
        ? (this.#allocation(planet, state).blocks.get(project.id) ?? null)
        : null;
      const componentProduction = this.#componentProduction(project?.id);
      const staffed =
        state.buildings
          .filter((b) => !b.demolition)
          .reduce((n, b) => n + BUILDINGS[b.type].workers, 0) <=
        state.population;
      const products = [
        ...new Set(
          state.buildings.flatMap((b) => {
            const definition = BUILDINGS[b.type];
            return definition.component
              ? [definition.component]
              : definition.ship
                ? [definition.ship]
                : [];
          }),
        ),
      ];
      return {
        id: planet.id,
        name: planet.name,
        project,
        issue: block === 'Waiting for resources.' ? null : block,
        stock: economy.stock,
        reserved: this.#logistics.reserved(planet.id, project?.id),
        componentProduction,
        demand: economy.demand,
        extraction: economy.extraction,
        deposits: economy.deposits,
        capabilities: products.map((product) => {
          const active = state.buildings.some(
            (b) =>
              !b.demolition &&
              (BUILDINGS[b.type].component === product ||
                BUILDINGS[b.type].ship === product),
          );
          return {
            product,
            kind: MATERIALS.some((material) => material === product)
              ? ('material' as const)
              : ('ship' as const),
            available: active && staffed,
            reason: !active
              ? 'Factory scheduled for demolition'
              : !staffed
                ? 'Not enough workers'
                : null,
            queued: state.projects.filter((p) => p.type === product).length,
          };
        }),
      };
    });
    return new SupplyOverview(inputs, this.shipments, MATERIALS);
  }

  supplyStatus(planetId: string): string {
    const assessment = this.supplyOverview().planets.find(
      (p) => p.id === planetId,
    );
    if (!assessment) return '';
    return this.#supplyDescription(assessment);
  }

  #supplyDescription(assessment: SupplyPlanet): string {
    const missing = assessment.materials.filter((m) => m.unprovided > 0);
    if (missing.length) {
      const port = this.#logisticsPort();
      const messages = missing.map((material) => {
        const sources = this.#ownedPlanets()
          .filter((p) => p.id !== assessment.id)
          .filter((p) => {
            const state = this.#state(p);
            return (
              state.stock[material.material as keyof Stock] -
                this.#logistics.reserved(p.id)[
                  material.material as keyof Stock
                ] >
                0 ||
              this.#extraction(p, state)[material.material as keyof Stock] >
                0 ||
              state.projects.some(
                (project) => project.type === material.material,
              )
            );
          });
        if (!sources.length)
          return `no available source of ${material.material}`;
        if (
          !sources.some((p) => this.#logistics.path(p.id, assessment.id, port))
        )
          return `no active transport path for ${material.material}`;
        return `${material.unprovided} ${material.material} unprovided — no delivery arranged`;
      });
      return `Needs decision: ${messages.join(' · ')}`;
    }
    if (assessment.status === 'Waiting') {
      return assessment.materials
        .filter((m) => m.required > m.available)
        .map((m) => {
          const local =
            m.localYears !== null
              ? `Waiting for local ${m.material} extraction (~${m.localYears} year(s))`
              : '';
          const shipments = this.shipments.filter(
            (s) =>
              s.recipientId === assessment.id &&
              s.material === m.material &&
              !s.issue &&
              (s.projectId === assessment.project?.id || s.projectId === null),
          );
          const years =
            shipments.every((s) => s.years !== null) && shipments.length
              ? Math.max(...shipments.map((s) => s.years!))
              : null;
          const incoming = shipments.length
            ? `${shipments.reduce((n, s) => n + s.amount, 0)} ${m.material} incoming — ${years === null ? 'arrival unknown' : `estimated arrival ${years} year(s)`}`
            : '';
          const production =
            m.ordered > 0
              ? `Waiting for ${m.ordered} ${m.material} in ordered production`
              : '';
          return [local, incoming, production].filter(Boolean).join(' · ');
        })
        .join(' · ');
    }
    return assessment.status === 'Needs attention'
      ? assessment.summary
      : 'Materials available';
  }
  #cargo(fleetId: string): Stock {
    const stock = emptyStock();
    for (const shipment of this.#logistics.shipments.filter(
      (s) => s.fleetId === fleetId,
    ))
      stock[shipment.resource] += shipment.amount;
    return stock;
  }
  #componentProduction(
    projectId?: string,
  ): readonly { material: Component; amount: number; issue: string | null }[] {
    const port = this.#logisticsPort();
    return this.#logistics.componentOrders
      .filter(
        (order) =>
          order.projectId === projectId &&
          !order.delivered &&
          !this.#logistics.shipments.some(
            (s) => s.componentOrderId === order.id,
          ),
      )
      .map((order) => {
        const state = this.#colonies.get(order.source)!;
        const producer = state.projects.find(
          (project) => project.id === order.productionProjectId,
        );
        const factory = state.buildings.some(
          (building) =>
            !building.demolition &&
            BUILDINGS[building.type].component === order.component,
        );
        const route =
          order.location === order.recipient ||
          this.#logistics.path(order.location, order.recipient, port);
        const staffed =
          state.buildings
            .filter((b) => !b.demolition)
            .reduce((n, building) => n + BUILDINGS[building.type].workers, 0) <=
          state.population;
        const head = state.projects[0];
        const source = this.#ownedPlanets().find(
          (planet) => planet.id === order.source,
        )!;
        const held = this.#logistics.reserved(order.source, head?.id);
        const extraction = this.#extraction(source, state);
        const missingResource =
          head &&
          RESOURCES.find((resource) => {
            const incoming = this.#logistics
              .shipmentSnapshots(port)
              .filter(
                (s) =>
                  s.projectId === head.id &&
                  s.material === resource &&
                  !s.issue,
              )
              .reduce((n, s) => n + s.amount, 0);
            const local =
              extraction[resource] > 0 ? state.deposits[resource] : 0;
            return (
              projectCost(head.type)[resource] >
              state.stock[resource] - held[resource] + incoming + local
            );
          });
        const behindRecipient =
          producer &&
          order.source === order.recipient &&
          state.projects.indexOf(producer) >
            state.projects.findIndex(
              (project) => project.id === order.projectId,
            );
        const issue = !route
          ? `No active transport path for ${order.component}`
          : order.productionProjectId && !producer
            ? `${order.component} production order was cancelled`
            : behindRecipient
              ? `Move ${order.component} production before its dependent project`
              : order.productionProjectId && !factory
                ? `A matching completed factory is required for ${order.component}.`
                : order.productionProjectId && !staffed
                  ? `Not enough workers to produce ${order.component}`
                  : order.productionProjectId && missingResource
                    ? `${order.component} production needs ${missingResource} at ${source.name}`
                    : null;
        return { material: order.component, amount: order.amount, issue };
      });
  }
  #logisticsPort(): LogisticsPort {
    return {
      planets: this.#ownedPlanets().map((planet) => {
        const state = this.#state(planet);
        const projects = state.projects
          .slice(0, 1)
          .map((p) => ({ id: p.id, cost: this.#projectCost(planet, p) }));
        const demand = emptyStock();
        for (const project of projects)
          for (const material of MATERIALS)
            demand[material] += project.cost[material];
        for (const order of this.#logistics.componentOrders)
          if (
            order.recipient === planet.id &&
            projects.some((p) => p.id === order.projectId)
          )
            demand[order.component] = Math.max(
              0,
              demand[order.component] - order.amount,
            );
        return {
          id: planet.id,
          name: planet.name,
          position: planet.position,
          stock: state.stock,
          demand,
          projects,
        };
      }),
      fleets: this.#fleets,
      speed: (fleet: TransportFleet) => this.#speed(this.#fleetState(fleet.id)),
      id: (prefix: string) => this.#id(prefix),
      event: (message: string) => this.#event(message),
      projectExists: (id: string) =>
        [...this.#colonies.values()].some((s) =>
          s.projects.some((p) => p.id === id),
        ),
    };
  }
  #requireManualFleet(fleet: Fleet): void {
    if (fleet.routeId)
      throw new Error(
        'Release this fleet from its trade route before issuing manual orders.',
      );
  }
  #refreshReinforcements(): void {
    FleetPursuit.refresh(this.#fleets, (fleet) =>
      this.#event(
        `${fleet.name}: reinforcement target unavailable; choose new orders.`,
      ),
    );
  }
  #mergeReinforcements(): void {
    FleetPursuit.merge(this.#fleets, (group, target) => {
      this.#simulation?.merge(group.id, target.id);
      for (const state of this.#colonies.values()) {
        if (state.homeFleetId === group.id) state.homeFleetId = target.id;
        for (const project of state.projects)
          if (project.destinationFleetId === group.id)
            project.destinationFleetId = target.id;
      }
      this.#event(`${group.name} joined ${target.name}.`);
    });
  }
  #extraction(planet: Planet, state: ColonyState): Stock {
    const rates = emptyStock();
    const workers = state.buildings
      .filter((b) => !b.demolition)
      .reduce((total, b) => total + BUILDINGS[b.type].workers, 0);
    if (workers > state.population) return rates;
    for (const building of state.buildings.filter((b) => !b.demolition)) {
      const resource = BUILDINGS[building.type].extraction;
      if (resource)
        rates[resource] +=
          planet.resources.find((r) => r.name === resource)?.perYear ?? 0;
    }
    for (const resource of RESOURCES)
      rates[resource] = Math.min(rates[resource], state.deposits[resource]);
    return rates;
  }
  #economySnapshot(planet: Planet, state: ColonyState): EconomySnapshot {
    const demand = emptyStock();
    for (const project of state.projects.slice(0, 1))
      for (const material of MATERIALS)
        demand[material] += this.#projectCost(planet, project)[material];
    return Object.freeze({
      stock: Object.freeze({ ...state.stock }),
      deposits: Object.freeze({ ...state.deposits }),
      extraction: Object.freeze(this.#extraction(planet, state)),
      demand: Object.freeze(demand),
      incoming: Object.freeze(this.#logistics.incoming(planet.id)),
    });
  }
  #costBlock(
    budget: BudgetSnapshot,
    definition?: BuildDefinition,
  ): string | null {
    if (
      budget.availableWorkers <
      (definition?.workers ?? 0) + (definition?.crew ?? 0)
    )
      return 'Not enough population for workers and crew.';
    if (
      (['Iron', 'Water', 'Oil'] as const).some(
        (r) => budget.available[r] < (definition?.cost[r] ?? 0),
      )
    )
      return 'Waiting for resources.';
    return null;
  }
  #canChooseProduction(planet: Planet, state: ColonyState): boolean {
    return (
      state.buildings.length < this.#environment(planet, state).buildSlots ||
      state.buildings.some(
        (building) =>
          !building.demolition &&
          !!(
            BUILDINGS[building.type].ship || BUILDINGS[building.type].component
          ),
      )
    );
  }
  #allocation(
    planet: Planet,
    state: ColonyState,
  ): { budget: BudgetSnapshot; blocks: Map<string, string> } {
    const held = this.#logistics.reserved(planet.id, state.projects[0]?.id);
    const production: Cost = {
      Iron: state.stock.Iron - held.Iron,
      Water: state.stock.Water - held.Water,
      Oil: state.stock.Oil - held.Oil,
    };
    const reserved = emptyCost();
    let workers = 0;
    let crew = 0;
    const blocks = new Map<string, string>();
    for (const item of [...state.buildings.filter((b) => !b.demolition)]) {
      const definition = BUILDINGS[item.type];
      workers += definition.workers;
    }
    const snapshot = (): BudgetSnapshot => ({
      production: Object.freeze({ ...production }),
      reserved: Object.freeze({ ...reserved }),
      available: Object.freeze({
        Iron: production.Iron - reserved.Iron,
        Water: production.Water - reserved.Water,
        Oil: production.Oil - reserved.Oil,
      }),
      workers: state.population,
      reservedWorkers: workers,
      availableWorkers: state.population - workers - crew,
      reservedCrew: crew,
      availableCrew: state.population - workers - crew,
      slots: this.#environment(planet, state).buildSlots,
      reservedSlots:
        state.buildings.length +
        state.projects.filter((p) => p.slotIndex !== null).length,
      availableSlots:
        this.#environment(planet, state).buildSlots -
        state.buildings.length -
        state.projects.filter((p) => p.slotIndex !== null).length,
    });
    for (const [index, project] of state.projects.entries()) {
      if (index > 0) {
        blocks.set(project.id, 'Waiting for the previous project.');
        continue;
      }
      const definition = projectDefinition(project.type);
      const missingFactory =
        !definition.permanent &&
        !definition.sitePreparation &&
        !state.buildings.some(
          (building) =>
            !building.demolition &&
            (definition.ship
              ? BUILDINGS[building.type].ship === definition.ship
              : BUILDINGS[building.type].component === definition.component),
        );
      const why = missingFactory
        ? `A matching completed factory is required for ${project.type}.`
        : (this.#costBlock(snapshot(), definition) ??
          (COMPONENTS.some(
            (part) =>
              state.stock[part] - held[part] <
              this.#projectCost(planet, project)[part],
          )
            ? 'Waiting for resources.'
            : null));
      if (why) blocks.set(project.id, why);
      else {
        addCost(reserved, definition.cost);
        workers += definition.workers;
        crew += definition.crew;
      }
    }
    return { budget: snapshot(), blocks };
  }
  #route(fleet: PursuingFleet): {
    fleet: PursuingFleet;
    path: HexCoordinate[];
  } {
    if (!fleet.destination || !fleet.position) return { fleet, path: [] };
    const path: HexCoordinate[] = [];
    let current = fleet.position;
    const destination = fleet.destination;
    const origin = fleet.courseOrigin ?? fleet.position;
    const distance = origin.distanceTo(destination);
    const completedSteps = origin.distanceTo(current);
    for (
      let steps = 0;
      steps < this.#speed(fleet) && current.key !== fleet.destination.key;
      steps += 1
    ) {
      const progress = (completedSteps + steps + 1) / distance;
      const idealQ = origin.q + (destination.q - origin.q) * progress;
      const idealR = origin.r + (destination.r - origin.r) * progress;
      const deviation = (position: HexCoordinate): number => {
        const qError = position.q - idealQ;
        const rError = position.r - idealR;
        return qError ** 2 + rError ** 2 + (qError + rError) ** 2;
      };
      const next = current
        .neighbors()
        .filter((item) => this.galaxy.cellAt(item))
        .sort(
          (a, b) =>
            a.distanceTo(destination) - b.distanceTo(destination) ||
            deviation(a) - deviation(b),
        )[0];
      if (!next) break;
      path.push(next);
      current = next;
    }
    return { fleet, path };
  }
  #fleetDisplayName(fleet: Fleet): string {
    const route = this.tradeRoutes.find((route) => route.id === fleet.routeId);
    return route ? `Route ${route.from} <> ${route.to}` : fleet.name;
  }
  #updateExploration(fleet: Fleet): void {
    if (!fleet.exploration) return;
    const candidates =
      fleet.exploration === 'explore-stars'
        ? this.galaxy.systems.map((system) => system.star.position)
        : this.galaxy.mapSnapshot().map((cell) => cell.position);
    const target =
      fleet.position && fleet.ships['Exploration ship'] > 0
        ? nearestUnexplored(fleet.position, candidates, this.#explored)
        : null;
    if (!target) {
      delete fleet.exploration;
      fleet.destination = null;
      delete fleet.courseOrigin;
      this.#event(
        `${this.#fleetDisplayName(fleet)}: exploration stopped; no unexplored targets or Exploration ship available.`,
      );
    } else if (fleet.destination?.key !== target.key) {
      fleet.destination = target;
      fleet.courseOrigin = fleet.position!;
    }
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
      if (this.#explored.has(pirate.position.key))
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
    const discoveries = this.#visibleDiscoveries().filter(
      (discovery) => !this.#knownObjects.has(discovery.id),
    );
    for (const discovery of discoveries) {
      this.#knownObjects.add(discovery.id);
      const position = new HexCoordinate(
        discovery.position.q,
        discovery.position.r,
      );
      const observer = this.#fleets
        .filter(
          (fleet) =>
            fleet.position &&
            fleet.position.distanceTo(position) <=
              (fleet.ships['Exploration ship'] ? 1 : 0),
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
      this.#event(
        `${discovery.kind === 'pirate' ? 'Pirate ship in sight' : discovery.kind === 'star' ? 'Star explored' : 'Planet discovered'}: ${discovery.name} at HEX ${position.key}.`,
      );
    }
    return Object.freeze(
      discoveries.sort(
        (a, b) =>
          Number(b.kind === 'pirate') - Number(a.kind === 'pirate') ||
          a.id.localeCompare(b.id),
      ),
    );
  }
  #reveal(position: HexCoordinate, radius = true): void {
    let changed = false;
    for (const cell of [position, ...(radius ? position.neighbors() : [])])
      if (this.galaxy.cellAt(cell) && !this.#explored.has(cell.key)) {
        this.#explored.add(cell.key);
        changed = true;
      }
    if (changed) this.#mapCells = null;
  }
  // tomma-flottor-utan-position: the last ship releases both location and course.
  #releaseEmptyFleet(fleet: Fleet): void {
    if (fleet.exploration && !fleet.ships['Exploration ship'])
      this.#updateExploration(fleet);
    // skepp-ur-olastad-ruttflotta: a route needs at least one transport ship.
    if (fleet.routeId && fleet.ships['Transport ship'] === 0) {
      delete fleet.routeId;
      delete fleet.releaseRequested;
      this.#logistics.cleanup(this.#logisticsPort());
    }
    if (this.#shipCount(fleet.ships) !== 0) return;
    fleet.position = null;
    fleet.destination = null;
    delete fleet.courseOrigin;
    delete fleet.joinFleetId;
  }
  // automatisk-motormontering: one projection drives consumption, blocking and supply.
  #projectCost(planet: Planet, project: Project): Stock {
    const cost = { ...projectCost(project.type), ...project.parts };
    const definition = projectDefinition(project.type);
    if (!definition.ship || definition.permanent) return cost;
    const count = engineCount(definition.ship);
    const stock = this.#state(planet).stock;
    const held = this.#logistics.reserved(planet.id, project.id);
    const ion = Math.max(
      0,
      stock['Ion pulse engine'] - held['Ion pulse engine'],
    );
    const rocket = Math.max(0, stock['Rocket engine'] - held['Rocket engine']);
    const chosenIon = Math.min(
      count,
      ion + rocket >= count ? ion : Math.max(ion, cost['Ion pulse engine']),
    );
    return {
      ...cost,
      'Ion pulse engine': chosenIon,
      'Rocket engine': count - chosenIon,
    };
  }

  #normalizeShips(): void {
    for (const fleet of this.#fleets) {
      const remaining = { ...fleet.ships };
      const units = (fleet.shipUnits ?? []).filter(
        (unit) => remaining[unit.type]-- > 0,
      );
      for (const type of Object.keys(SHIPS) as ShipType[]) {
        for (
          let index = units.filter((unit) => unit.type === type).length;
          index < fleet.ships[type];
          index++
        )
          units.push({
            id: `${fleet.id}-legacy-${type}-${index}`,
            type,
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
    return speeds.length === 0 ? 0 : Math.min(...speeds);
  }
  #crew(ships: Record<ShipType, number>): number {
    return (Object.keys(ships) as ShipType[]).reduce(
      (total, type) => total + ships[type] * SHIPS[type].crew,
      0,
    );
  }
  #shipCount(ships: Record<ShipType, number>): number {
    return Object.values(ships).reduce((a, b) => a + b, 0);
  }
  #state(planet: Planet): ColonyState {
    const state = this.#colonies.get(planet.id);
    if (!state) throw new Error('Planet is not owned.');
    return state;
  }
  #fleetState(id: string): Fleet {
    const fleet = this.#fleets.find((item) => item.id === id);
    if (!fleet) throw new Error('Fleet was not found.');
    return fleet;
  }
  #ownedPlanets(): Planet[] {
    return this.galaxy.systems
      .flatMap((s) => s.planets)
      .filter((p) => this.#colonies.has(p.id));
  }
  // handelser: report arrival once, at the point it happens, with a usable place name.
  #recordArrival(fleet: Fleet): void {
    if (fleet.joinFleetId) return;
    if (!fleet.destination || fleet.destination.key !== fleet.position?.key)
      return;
    const place =
      this.mapSnapshot().find(
        (cell) => cell.position.key === fleet.position!.key,
      )?.object?.name ?? `HEX ${fleet.position.key}`;
    fleet.destination = null;
    delete fleet.courseOrigin;
    this.#event(`${this.#fleetDisplayName(fleet)} arrived at ${place}.`);
  }
  #event(text: string): void {
    this.#events.push(
      Object.freeze({ id: this.#id('event'), round: this.#round, text }),
    );
  }
  #id(prefix: string): string {
    return `${prefix}-${this.#sequence++}`;
  }
  #uniqueFleetName(
    base: string,
    names = new Set(this.#fleets.map((fleet) => fleet.name.toLowerCase())),
  ): string {
    const clean = base.trim().slice(0, 40) || 'Fleet';
    let name = clean;
    for (let number = 2; names.has(name.toLowerCase()); number++) {
      const suffix = ` (${number})`;
      name = clean.slice(0, 40 - suffix.length) + suffix;
    }
    return name;
  }
  #nextFleetName(): string {
    let number = 1;
    while (
      this.#fleets.some(
        (fleet) => fleet.name.toLowerCase() === `fleet ${number}`,
      )
    )
      number += 1;
    return `Fleet ${number}`;
  }
  #environment(planet: Planet, state: ColonyState): PlanetEnvironment {
    return new PlanetEnvironment(
      planet,
      state.habitability ?? planet.habitability,
    );
  }
  #domeType(planet: Planet): BuildType | null {
    return planet.type === 'solid' &&
      planet.environment &&
      planet.environment !== 'Temperate'
      ? `${planet.environment} dome`
      : null;
  }
  #availableResearch(): Technology[] {
    const discovered = new Set(
      this.galaxy.systems
        .flatMap((system) => system.planets)
        .filter(
          (planet) =>
            planet.type === 'solid' && this.#explored.has(planet.position.key),
        )
        .map((planet) => planet.environment),
    );
    return TECHNOLOGIES.filter(
      (type) =>
        type === 'Trade logistics' ||
        !BUILDINGS[type].environment ||
        discovered.has(BUILDINGS[type].environment),
    );
  }
  #requirePlanning(): void {
    if (this.#phase !== 'planning')
      throw new Error('Orders are only available while planning.');
  }
}
