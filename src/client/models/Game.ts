import {
  CivilianTraffic,
  SHUTTLE_CAPACITY,
  type CivilianOrder,
  type CivilianPort,
} from './CivilianTraffic.js';
import { engineCount } from './ShipEquipment.js';
import { FactoryTechnology } from './FactoryTechnology.js';
import { FleetPatrol, type PatrolOrder } from './FleetPatrol.js';
export { engineCount } from './ShipEquipment.js';
import {
  TurnSimulation,
  nearestUnexplored,
  type Discovery,
  type ExplorationOrder,
  type SavedTurnSimulation,
} from './TurnSimulation.js';
import { Detection, TELESCOPES, type TelescopeLevel } from './Detection.js';
import {
  PirateFleet,
  type PirateSnapshot,
  type SavedPirateFleet,
} from './PirateFleet.js';
import type { CombatResult } from './FleetCombat.js';
import {
  TacticalBattle,
  type BattleState,
  type BattleCommand,
  type BattleFleet,
} from './TacticalBattle.js';
import {
  Salvage,
  type WreckSnapshot,
  type ShipyardSnapshot,
  type BattleReport,
} from './Salvage.js';
import { prioritizeProduction } from './ProductionPriorities.js';
import { routeEscortTargets, tradeAssignmentIssue } from './TradeAssignment.js';
import {
  projectSupplyChain,
  type SupplyChainSnapshot,
} from './ProjectSupplyChain.js';
import type { ProductionOption, ProductionGuidance } from './ProductionMap.js';
import {
  ProductionPresence,
  type ProductionPresenceSource,
} from './ProductionPresence.js';
import { ProjectSupply, type ProjectSupplySnapshot } from './ProjectSupply.js';
import { Galaxy, Star, StarSystem, type MapCell } from './Galaxy.js';
import { HexCoordinate } from './HexCoordinate.js';
import { HexNavigation } from './HexNavigation.js';
import type { TerrainHex } from './Galaxy.js';
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
  | 'Colony ship'
  | 'Exploration ship'
  | 'Fighter'
  | 'Transport ship'
  | 'Salvage ship'
  | 'Civilian shuttle';
export type BuildType =
  | 'Orbital shipyard'
  | 'Salvage ship factory'
  | 'Telescope I factory'
  | 'Telescope II factory'
  | 'Telescope III factory'
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

export type ProjectType = BuildType | ShipType | Component | 'Shipyard station';

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
  readonly ships?: readonly ShipType[];
  readonly component?: Component;
  readonly parts?: Readonly<Partial<Record<Component, number>>>;
  readonly extraction?: Resource;
}
export const BUILDINGS: Readonly<Record<BuildType, BuildDefinition>> =
  Object.freeze({
    'Orbital shipyard': {
      permanent: true,
      description:
        'Builds a planetary facility, shuttles and an orbital station. Repairs one wreck per year.',
      workers: 800,
      cost: { Iron: 24, Water: 12, Oil: 6 },
      crew: 0,
    },
    'Salvage ship factory': {
      permanent: true,
      description: 'Builds Salvage ships to tow wrecks to orbital shipyards.',
      workers: 600,
      cost: { Iron: 12, Water: 6, Oil: 3 },
      crew: 0,
      ship: 'Salvage ship',
    },
    'Telescope I factory': {
      permanent: true,
      description:
        'Produces Telescope I and gives this planet detection range 1 hex.',
      workers: 300,
      cost: { Iron: 8, Water: 4, Oil: 2 },
      crew: 0,
      component: 'Telescope I',
    },
    'Telescope II factory': {
      permanent: true,
      description:
        'Produces Telescope II and gives this planet detection range 2 hexes.',
      workers: 300,
      cost: { Iron: 16, Water: 8, Oil: 4 },
      crew: 0,
      component: 'Telescope II',
    },
    'Telescope III factory': {
      permanent: true,
      description:
        'Produces Telescope III and gives this planet detection range 3 hexes.',
      workers: 300,
      cost: { Iron: 24, Water: 12, Oil: 6 },
      crew: 0,
      component: 'Telescope III',
    },
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
      description: 'Builds Transport ships and researched Civilian shuttles.',
      ships: ['Transport ship', 'Civilian shuttle'],
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
  'Salvage ship': { crew: 100, speed: 5 },
  'Colony ship': { crew: 1000, speed: 2 },
  'Exploration ship': { crew: 200, speed: 4 },
  Fighter: { crew: 50, speed: 3 },
  'Transport ship': { crew: 50, speed: 2 },
  'Civilian shuttle': { crew: 50, speed: 2 },
});

export interface ShipUnit {
  readonly telescope?: TelescopeLevel;
  readonly id: string;
  readonly type: ShipType;
  readonly engines: Readonly<{
    'Rocket engine': number;
    'Ion pulse engine': number;
  }>;
}

export function projectDefinition(type: ProjectType): BuildDefinition {
  if (type === 'Shipyard station')
    return {
      permanent: false,
      description:
        'Rebuilds a destroyed orbital station using its existing planetary facility.',
      workers: 0,
      crew: 0,
      cost: { Iron: 12, Water: 6, Oil: 3 },
    };
  if (type in BUILDINGS) return BUILDINGS[type as BuildType];
  if (COMPONENTS.includes(type as Component))
    return {
      permanent: false,
      description: `Produces one ${type} for local storage or shipment.`,
      workers: 0,
      crew: 0,
      component: type as Component,
      cost: TELESCOPES.includes(type as (typeof TELESCOPES)[number])
        ? {
            Iron:
              3 * (TELESCOPES.indexOf(type as (typeof TELESCOPES)[number]) + 1),
            Water: TELESCOPES.indexOf(type as (typeof TELESCOPES)[number]) + 1,
            Oil: TELESCOPES.indexOf(type as (typeof TELESCOPES)[number]) + 1,
          }
        : type === 'Ion pulse engine'
          ? { Iron: 6, Water: 2, Oil: 2 }
          : { Iron: type === 'Rocket engine' ? 3 : 2, Water: 1, Oil: 1 },
    };
  return {
    permanent: false,
    description:
      type === 'Civilian shuttle'
        ? 'Carries up to 500 passengers to available jobs through open Trade routes. Starts Civilian transport automatically in its own fleet.'
        : `Produces one ${type}. Factory staff operate the shipyard.`,
    cost:
      type === 'Salvage ship'
        ? { Iron: 5, Water: 3, Oil: 2 }
        : type === 'Transport ship' || type === 'Civilian shuttle'
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
      ...(type === 'Exploration ship' ? { 'Telescope I': 1 } : {}),
    },
  };
}
export function factoryShips(type: BuildType): readonly ShipType[] {
  return (
    BUILDINGS[type].ships ??
    (BUILDINGS[type].ship ? [BUILDINGS[type].ship] : [])
  );
}

export function projectCost(type: ProjectType): Stock {
  const definition = projectDefinition(type);
  return { ...emptyStock(), ...definition.cost, ...definition.parts };
}
export interface ResearchSnapshot {
  readonly recovered?: readonly Technology[];
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
  readonly upgrade?: Readonly<{
    type: BuildType;
    blockedReason: string | null;
  }>;
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
  readonly upgradeBuildingId?: string;
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
  readonly availableComponents?: readonly Component[];
  readonly detectionRange?: number;
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
  readonly ordersPaused?: boolean;
  readonly civilian?: Readonly<
    Omit<CivilianOrder, 'path'> & { readonly path: readonly string[] }
  >;
  readonly automation?: 'salvage' | 'transport';
  readonly colonizationTargetId?: string;
  readonly navigationIssue?: string | undefined;
  readonly patrol?: Readonly<{
    center: HexCoordinate;
    range: number;
    targetPirateId?: string;
  }>;
  readonly salvage?: Readonly<{
    targets: readonly string[];
    yardId: string | null;
    issue: string | null;
  }> | null;
  readonly towing?: readonly string[];
  readonly detectionRange?: number;
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
  readonly planetId?: string;
  readonly combatLog?: readonly string[];
  readonly id: string;
  readonly round: number;
  readonly text: string;
  readonly position?: { readonly q: number; readonly r: number };
}
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
  upgradeBuildingId?: string;
  stationPosition?: { readonly q: number; readonly r: number };
  parts?: Partial<Record<Component, number>>;
  id: string;
  type: ProjectType;
  slotIndex: number | null;
  factoryId: string | null;
  destinationFleetId: string | null;
}
interface Fleet {
  ordersPaused?: boolean;
  civilian?: CivilianOrder;
  automation?: 'salvage' | 'transport';
  colonizationTargetId?: string;
  navigationIssue?: string;
  starSurvey?: {
    starId: string;
    startIndex: number;
    completed: number;
    arrived: boolean;
  };
  patrol?: PatrolOrder;
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
  'Salvage ship': 0,
  'Civilian shuttle': 0,
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
  readonly version: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
  readonly knownTerrain?: readonly string[];
  readonly salvage?: ReturnType<Salvage['snapshot']>;
  readonly recoveredResearch?: readonly Technology[];
  readonly visiblePirates?: readonly string[];
  readonly knownObjects?: readonly string[];
  readonly simulation?: SavedTurnSimulation | null;
  readonly pirates?: readonly SavedPirateFleet[];
  readonly world: {
    readonly player: { readonly id: string; readonly name: string };
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
  readonly #civilianTraffic = new CivilianTraffic();
  #logistics = new Logistics();
  #salvage: Salvage;
  #decisions = new DecisionBoard();
  #research = new ResearchPlan();
  #round = 1;
  #phase: GamePhase = 'planning';
  #sequence = 1;
  #colonies = new Map<string, ColonyState>();
  #fleets: Fleet[];
  #pirates: PirateFleet[];
  #explored = new Set<string>();
  #knownTerrain = new Set<string>();
  readonly #navigation: HexNavigation;
  #visible: ReadonlySet<string> = new Set();
  #visiblePirates = new Set<string>();
  #events: GameEvent[] = [];
  #knownObjects = new Set<string>();
  #simulation: TurnSimulation | null = null;
  #pendingFrame: TurnFrame | null = null;
  #mapCells: readonly MapCell[] | null = null;

  constructor(readonly galaxy: Galaxy) {
    this.#navigation = new HexNavigation(galaxy);
    this.#salvage = Salvage.seed(galaxy.systems.map((system) => system.star));
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
    this.#updateSight();
    this.#updateSight();
    this.#visiblePirates = new Set(
      this.pirateSnapshots().map((pirate) => pirate.id),
    );
    this.#visibleDiscoveries().forEach((discovery) =>
      this.#knownObjects.add(discovery.id),
    );
  }

  // spara-avbrutet-ar: only planning and discovery checkpoints are serializable.
  exportState(): GameState {
    if (this.#phase === 'simulating')
      throw new Error('Wait for the turn to finish before saving.');
    return structuredClone({
      version: 13,
      knownTerrain: [...this.#knownTerrain],
      salvage: this.#salvage.snapshot(),
      recoveredResearch: [...this.#research.recovered],
      visiblePirates: [...this.#visiblePirates],
      knownObjects: [...this.#knownObjects],
      simulation: this.#simulation?.snapshot() ?? null,
      pirates: this.#pirates.map((pirate) => pirate.snapshot()),
      world: {
        player: { id: this.galaxy.player.id, name: this.galaxy.player.name },
        radius: this.galaxy.radius,
        terrain: this.galaxy.terrain,
        systems: this.galaxy.systems.map((system) => ({
          planetDistance: system.planetDistance,
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
      ![2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(state.version) ||
      !Number.isSafeInteger(state.round) ||
      state.round < 1 ||
      !Number.isSafeInteger(state.sequence) ||
      state.sequence < 1 ||
      ![
        'planning',
        'summary',
        ...(state.version >= 8 ? ['interrupted'] : []),
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
            system.planetDistance ?? 1,
          ),
      ),
      world.radius,
      world.terrain ?? [],
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
    if (
      state.version >= 10 &&
      (!Array.isArray(copy.recoveredResearch) ||
        copy.recoveredResearch.some(
          (technology: Technology) => !TECHNOLOGIES.includes(technology),
        ))
    )
      throw new Error('Invalid recovered technology.');
    game.#research = new ResearchPlan(
      new Set(copy.researched),
      [...copy.researchQueue],
      new Set(copy.recoveredResearch ?? []),
    );
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
      const upgradeTargets = new Set<string>();
      for (const project of colony.projects) {
        if (project.upgradeBuildingId === undefined) continue;
        const building = colony.buildings.find(
          (item) => item.id === project.upgradeBuildingId,
        );
        if (
          !building ||
          building.demolition ||
          building.slotIndex !== project.slotIndex ||
          !FactoryTechnology.canUpgrade(
            building.type,
            project.type as BuildType,
          ) ||
          !game.#research.completed.has(project.type as Technology) ||
          upgradeTargets.has(building.id)
        )
          throw new Error('Invalid saved factory upgrade.');
        upgradeTargets.add(building.id);
      }
    }
    game.#fleets = copy.fleets.map(
      ({ position: current, destination, courseOrigin, ...fleet }) => {
        fleet.ships = { ...zeroShips(), ...fleet.ships };
        const empty = game.#shipCount(fleet.ships) === 0;
        if (fleet.civilian !== undefined) {
          CivilianTraffic.validate(
            fleet.civilian,
            fleet.ships['Civilian shuttle'] * SHUTTLE_CAPACITY,
            (id) => game.#colonies.has(id),
          );
          if (
            empty ||
            !fleet.ships['Civilian shuttle'] ||
            fleet.routeId ||
            fleet.automation ||
            fleet.patrol ||
            fleet.exploration ||
            fleet.joinFleetId ||
            fleet.colonizationTargetId
          )
            throw new Error('Invalid saved civilian fleet.');
        }
        if (
          fleet.automation !== undefined &&
          (!['salvage', 'transport'].includes(fleet.automation) ||
            empty ||
            !fleet.ships[
              fleet.automation === 'salvage' ? 'Salvage ship' : 'Transport ship'
            ] ||
            fleet.routeId ||
            fleet.patrol ||
            fleet.exploration ||
            fleet.joinFleetId ||
            fleet.colonizationTargetId)
        )
          throw new Error('Invalid saved automatic fleet order.');
        if (
          fleet.colonizationTargetId !== undefined &&
          (typeof fleet.colonizationTargetId !== 'string' ||
            !galaxy.systems.some((system) =>
              system.planets.some(
                (planet) => planet.id === fleet.colonizationTargetId,
              ),
            ) ||
            !fleet.ships['Colony ship'] ||
            fleet.routeId ||
            fleet.patrol ||
            fleet.exploration ||
            fleet.joinFleetId)
        )
          throw new Error('Invalid saved colonization order.');
        if (fleet.patrol !== undefined) {
          FleetPatrol.validate(fleet.patrol, (point) => !!galaxy.cellAt(point));
          if (
            empty ||
            !fleet.ships.Fighter ||
            fleet.routeId ||
            fleet.joinFleetId ||
            fleet.exploration
          )
            throw new Error('Invalid saved Patrol fleet.');
        }
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
    for (const fleet of game.#fleets)
      fleet.ships = { ...zeroShips(), ...fleet.ships };
    game.#normalizeShips();
    game.#explored = new Set(copy.explored);
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
    for (const fleet of game.#fleets) {
      const survey = fleet.starSurvey;
      if (
        survey &&
        (fleet.exploration !== 'explore-stars' ||
          !galaxy.systems.some((system) => system.star.id === survey.starId) ||
          !Number.isInteger(survey.startIndex) ||
          survey.startIndex < 0 ||
          survey.startIndex > 5 ||
          !Number.isInteger(survey.completed) ||
          survey.completed < 0 ||
          survey.completed > 6 ||
          typeof survey.arrived !== 'boolean')
      )
        throw new Error('Invalid star survey.');
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
          ...(details.combatLog
            ? { combatLog: Object.freeze([...details.combatLog]) }
            : {}),
          ...(valid ? { position: Object.freeze({ ...eventPosition }) } : {}),
        });
      });
    game.#salvage =
      state.version >= 10
        ? Salvage.restore(
            copy.salvage,
            (position) => !!galaxy.cellAt(position),
            new Set(copy.fleets.map((fleet) => fleet.id)),
            new Map(
              [...game.#colonies].flatMap(([id, colony]) =>
                colony.buildings
                  .filter((building) => building.type === 'Orbital shipyard')
                  .map((building) => [building.id, id]),
              ),
            ),
          )
        : new Salvage();
    game.#refreshReinforcements();
    game.#updateSight();
    if (state.version >= 8 && !Array.isArray(copy.knownObjects))
      throw new Error('Missing discovered objects.');
    game.#knownObjects = new Set(
      state.version >= 8
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
        state.version < 10,
        (id) => {
          const fleet = game.#fleets.find((fleet) => fleet.id === id);
          return fleet ? game.#speed(fleet) : 1;
        },
      );
      game.#phase = 'interrupted';
      game.#validateTacticalParticipants();
    } else if (state.version >= 8 && copy.simulation)
      throw new Error('Unexpected interrupted year.');
    if (state.version < 9) {
      if (game.#research.completed.has('Exploration ship factory'))
        game.#research.completed.add('Telescope I factory');
      const queue = [...game.#research.queue];
      game.#research.queue = [];
      for (const technology of queue)
        if (!game.#research.completed.has(technology))
          game.#research.add(technology);
      game.#migrateTelescopeOrders();
      if (game.#simulation) {
        game.#simulation.discoveries = game.#simulation.discoveries.filter(
          (discovery) =>
            discovery.kind !== 'pirate' ||
            game.#visible.has(
              `${discovery.position.q},${discovery.position.r}`,
            ),
        );
        if (!game.#simulation.discoveries.length)
          game.#simulation.handling = true;
      }
    }
    if (
      state.version >= 9 &&
      (!Array.isArray(copy.visiblePirates) ||
        copy.visiblePirates.some(
          (id) => !game.#pirates.some((pirate) => pirate.id === id),
        ))
    )
      throw new Error('Invalid saved pirate contacts.');
    game.#visiblePirates = new Set(
      state.version >= 9
        ? copy.visiblePirates
        : game.pirateSnapshots().map((pirate) => pirate.id),
    );
    game.#linkInterruptionEvents();
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
      this.#visible,
      this.#knownTerrain,
    );
    return this.#mapCells;
  }
  planetAt(position: HexCoordinate): Planet | undefined {
    return this.#ownedPlanets().find(
      (planet) => planet.position.key === position.key,
    );
  }
  // planetinformation-pa-kartan: unknown planets never cross the read-model boundary.
  planetKnowledge(position: HexCoordinate): Readonly<{
    name: string;
    environment: PlanetEnvironmentType | 'Gas';
    habitability: number;
  }> | null {
    if (!this.#explored.has(position.key)) return null;
    const planet = this.galaxy.systems
      .flatMap((system) => system.planets)
      .find((candidate) => candidate.position.key === position.key);
    return planet
      ? Object.freeze({
          name: planet.name,
          environment: planet.type === 'gas' ? 'Gas' : planet.environment,
          habitability:
            this.#colonies.get(planet.id)?.habitability ?? planet.habitability,
        })
      : null;
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
          ...(FactoryTechnology.successor(
            building.type,
            this.#research.completed,
          )
            ? {
                upgrade: Object.freeze({
                  type: FactoryTechnology.successor(
                    building.type,
                    this.#research.completed,
                  )!,
                  blockedReason: this.canUpgrade(planet, building.id),
                }),
              }
            : {}),
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
      detectionRange: Detection.planetRange(state.buildings),
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
      availableComponents: Object.freeze([
        ...new Set(
          state.buildings.flatMap((building) => {
            const component = BUILDINGS[building.type].component;
            return component &&
              !FactoryTechnology.isObsoleteComponent(
                component,
                this.#research.completed,
              )
              ? [component]
              : [];
          }),
        ),
      ]),
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
                type in BUILDINGS &&
                this.#research.completed.has(type) &&
                !FactoryTechnology.successor(
                  type as BuildType,
                  this.#research.completed,
                ) &&
                (!BUILDINGS[type as BuildType].environment ||
                  (planet.type === 'solid' &&
                    BUILDINGS[type as BuildType].environment ===
                      planet.environment)),
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
      recovered: Object.freeze([...this.#research.recovered]),
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
            state.projects.filter(
              (p) => p.slotIndex !== null && !p.upgradeBuildingId,
            ).length,
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
    return this.#foundColony(fleet, planet);
  }
  setColonization(fleetId: string, position: HexCoordinate): void {
    this.#requireFleetOrders(fleetId);
    const fleet = this.#fleetState(fleetId);
    if (!fleet.ships['Colony ship'])
      throw new Error('A Colony ship is required.');
    const planet = this.galaxy.systems
      .flatMap((system) => system.planets)
      .find((planet) => planet.position.key === position.key);
    if (
      !planet ||
      !this.#explored.has(position.key) ||
      planet.colony ||
      this.#colonies.has(planet.id)
    )
      throw new Error('Choose a discovered uninhabited planet.');
    this.setDestination(fleetId, position);
    fleet.colonizationTargetId = planet.id;
    if (
      this.#phase === 'planning' &&
      fleet.position?.key === position.key &&
      !this.#hostileAt(position)
    )
      this.#foundColony(fleet, planet);
  }
  #foundColony(fleet: Fleet, planet: Planet): readonly Discovery[] {
    delete fleet.colonizationTargetId;
    if (fleet.destination?.key === planet.position.key) {
      fleet.destination = null;
      delete fleet.courseOrigin;
    }
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
    this.#updateSight();
    const discoveries =
      this.#phase === 'planning' ? this.#newDiscoveries({ movements: [] }) : [];
    this.#mapCells = null;
    this.#events.push(
      Object.freeze({
        id: this.#id('event'),
        round: this.#round,
        text: `${planet.name} was colonized by ${fleet.name}.`,
        position: Object.freeze({ q: planet.position.q, r: planet.position.r }),
      }),
    );
    return discoveries;
  }
  // koloniseringsorder: settle only after arrival combat has resolved.
  #completeColonizations(): boolean {
    let colonized = false;
    for (const fleet of this.#fleets) {
      if (!fleet.colonizationTargetId) continue;
      const planet = this.galaxy.systems
        .flatMap((system) => system.planets)
        .find((planet) => planet.id === fleet.colonizationTargetId)!;
      if (
        fleet.position?.key !== planet.position.key ||
        this.#hostileAt(planet.position)
      )
        continue;
      if (planet.colony || this.#colonies.has(planet.id)) {
        delete fleet.colonizationTargetId;
        fleet.destination = null;
        delete fleet.courseOrigin;
        this.#event(
          `${fleet.name}: colonization cancelled; ${planet.name} is already inhabited.`,
          planet.position,
        );
        continue;
      }
      if (!fleet.ships['Colony ship']) continue;
      this.#foundColony(fleet, planet);
      colonized = true;
    }
    return colonized;
  }
  pirateSnapshots(): readonly PirateSnapshot[] {
    return Object.freeze(
      this.#pirates
        .filter((pirate) => this.#visible.has(pirate.position.key))
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
          ...(fleet.colonizationTargetId
            ? { colonizationTargetId: fleet.colonizationTargetId }
            : {}),
          ...(fleet.automation ? { automation: fleet.automation } : {}),
          ...(fleet.ordersPaused ? { ordersPaused: true } : {}),
          salvage: this.#salvage.order(fleet.id)
            ? Object.freeze({
                ...this.#salvage.order(fleet.id)!,
                targets: Object.freeze([
                  ...this.#salvage.order(fleet.id)!.targets,
                ]),
              })
            : null,
          towing: Object.freeze(
            this.#salvage.towing(fleet.id).map((wreck) => wreck.id),
          ),
          detectionRange: this.#fleetDetectionRange(fleet),
          ...(fleet.patrol
            ? {
                patrol: Object.freeze({
                  center: new HexCoordinate(
                    fleet.patrol.center.q,
                    fleet.patrol.center.r,
                  ),
                  range: this.#speed(fleet),
                  ...(fleet.patrol.targetPirateId
                    ? { targetPirateId: fleet.patrol.targetPirateId }
                    : {}),
                }),
              }
            : {}),
          exploration: fleet.exploration,
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
          ...(fleet.civilian
            ? {
                civilian: Object.freeze({
                  ...fleet.civilian,
                  path: Object.freeze([...fleet.civilian.path]),
                }),
              }
            : {}),
        }),
      ),
    );
  }
  fleet(id: string): FleetSnapshot | null {
    return this.fleetSnapshots().find((fleet) => fleet.id === id) ?? null;
  }

  get wrecks(): readonly WreckSnapshot[] {
    return this.#salvage.wreckSnapshots();
  }
  get shipyards(): readonly ShipyardSnapshot[] {
    return this.#salvage.yardSnapshots();
  }
  freeShipyardHexes(planetId: string): readonly HexCoordinate[] {
    const planet = this.#ownedPlanets().find(
      (planet) => planet.id === planetId,
    );
    if (!planet) return [];
    const occupied = new Set(
      this.galaxy.systems.flatMap((system) => [
        system.star.position.key,
        ...system.planets.map((planet) => planet.position.key),
      ]),
    );
    for (const yard of this.#salvage.yards.filter((yard) => !yard.destroyed))
      occupied.add(yard.position.key);
    for (const state of this.#colonies.values())
      for (const project of state.projects)
        if (project.stationPosition)
          occupied.add(
            `${project.stationPosition.q},${project.stationPosition.r}`,
          );
    return Object.freeze(
      planet.position
        .neighbors()
        .filter(
          (position) =>
            this.galaxy.isPassable(position) && !occupied.has(position.key),
        ),
    );
  }
  #requireOrderResearch(technology: Technology): void {
    if (!this.#research.completed.has(technology))
      throw new Error(`Research ${technology} first.`);
  }
  setCivilianTransport(fleetId: string): void {
    this.#requirePlanning();
    this.#requireFleetOrders(fleetId);
    this.#requireOrderResearch('Civilian transport');
    const fleet = this.#fleetState(fleetId);
    if (!fleet.ships['Civilian shuttle'])
      throw new Error('A Civilian shuttle is required.');
    if (this.#salvage.towing(fleetId).length)
      throw new Error('Release towed wrecks first.');
    this.clearDestination(fleetId);
    fleet.civilian = CivilianTraffic.order();
  }

  #civilianPort(): CivilianPort {
    return {
      planets: this.#ownedPlanets().map((planet) => {
        const state = this.#state(planet);
        const head = state.projects[0];
        const definition = head && this.#projectDefinition(state, head);
        return {
          id: planet.id,
          name: planet.name,
          position: planet.position,
          get population() {
            return state.population;
          },
          set population(value: number) {
            state.population = value;
          },
          capacity: this.#environment(planet, state).populationCapacity,
          workforce:
            state.buildings
              .filter((b) => !b.demolition)
              .reduce((n, b) => n + BUILDINGS[b.type].workers, 0) +
            (definition?.workers ?? 0) +
            (definition?.crew ?? 0),
        };
      }),
      fleets: this.#fleets,
      routes: this.#logistics.routes,
      travelYears: (fleet, from, to) => {
        const actual = this.#fleetState(fleet.id);
        if (from.key === to.key) return 0;
        const speed = this.#speed(actual);
        const path = this.#navigation.path(from, to, speed, this.#knownTerrain);
        return path.length
          ? this.#navigation.years(path, from, speed, this.#knownTerrain)
          : Infinity;
      },
      event: (message, position) => this.#event(message, position),
    };
  }

  setAutomaticSalvage(fleetId: string): void {
    this.#requireFleetOrders(fleetId);
    this.#requireOrderResearch('Automated salvage');
    const fleet = this.#fleetState(fleetId);
    if (!fleet.ships['Salvage ship'])
      throw new Error('A Salvage ship is required.');
    this.clearDestination(fleetId);
    fleet.automation = 'salvage';
    this.#updateSalvage();
  }
  // automatisk-bargning: one wreck per trip; delivery finishes before the next reservation.
  #updateAutomaticSalvage(): void {
    for (const fleet of this.#fleets) {
      if (
        fleet.automation !== 'salvage' ||
        !fleet.position ||
        !fleet.ships['Salvage ship'] ||
        this.#salvage.order(fleet.id)
      )
        continue;
      if (this.#salvage.towing(fleet.id).length) {
        this.#salvage.returnHome(fleet);
        continue;
      }
      const target = this.#salvage.wrecks
        .filter((w) => w.known && !w.reservedBy && !w.towedBy && !w.yardId)
        .sort(
          (a, b) =>
            fleet.position!.distanceTo(a.position) -
              fleet.position!.distanceTo(b.position) ||
            a.id.localeCompare(b.id),
        )[0];
      if (target) this.#salvage.assign(fleet, target.id);
    }
  }
  setAutomaticTransport(fleetId: string): void {
    this.#requirePlanning();
    this.#requireFleetOrders(fleetId);
    this.#requireOrderResearch('Automated transport');
    const fleet = this.#fleetState(fleetId);
    if (!fleet.ships['Transport ship'])
      throw new Error('A Transport ship is required.');
    if (this.#salvage.towing(fleetId).length)
      throw new Error('Deliver towed wrecks first.');
    this.clearDestination(fleetId);
    fleet.automation = 'transport';
    this.#updateAutomaticTransport();
  }
  // automatisk-rutttilldelning: each assignment removes the route from the next fleet's candidates.
  #updateAutomaticTransport(): void {
    for (const fleet of this.#fleets) {
      if (
        fleet.automation !== 'transport' ||
        !fleet.position ||
        !fleet.ships['Transport ship']
      )
        continue;
      const distance = (route: TradeRouteSnapshot) =>
        Math.min(
          fleet.position!.distanceTo(route.start),
          fleet.position!.distanceTo(route.end),
        );
      const route = this.tradeRoutes
        .filter(
          (r) =>
            !r.closing &&
            !r.fleetIds.some((id) => {
              const carrier = this.#fleetState(id);
              return (
                !carrier.releaseRequested && carrier.ships['Transport ship'] > 0
              );
            }),
        )
        .sort(
          (a, b) => distance(a) - distance(b) || a.id.localeCompare(b.id),
        )[0];
      if (route) this.assignTradeFleet(route.id, fleet.id);
    }
  }
  orderSalvage(fleetId: string, wreckId: string): void {
    this.#requireFleetOrders(fleetId);
    const fleet = this.#fleetState(fleetId);
    this.#salvage.assign(fleet, wreckId);
    delete fleet.automation;
    delete fleet.civilian;
    delete fleet.colonizationTargetId;
    delete fleet.patrol;
    delete fleet.exploration;
    delete fleet.starSurvey;
    delete fleet.joinFleetId;
    this.#updateSalvage();
  }
  returnToShipyard(fleetId: string): void {
    this.#requireFleetOrders(fleetId);
    const fleet = this.#fleetState(fleetId);
    this.#salvage.returnHome(fleet);
    delete fleet.automation;
    delete fleet.civilian;
    delete fleet.colonizationTargetId;
    delete fleet.patrol;
    delete fleet.exploration;
    delete fleet.starSurvey;
    delete fleet.joinFleetId;
    this.#updateSalvage();
  }
  releaseWreck(fleetId: string, wreckId: string): void {
    this.#requireFleetOrders(fleetId);
    this.#salvage.release(this.#fleetState(fleetId), wreckId);
    delete this.#fleetState(fleetId).automation;
    this.#updateSalvage();
  }
  scheduleRebuildShipyard(
    yardId: string,
    position: HexCoordinate,
  ): ProductionReceipt {
    this.#requirePlanning();
    const yard = this.#salvage.yards.find(
      (yard) => yard.id === yardId && yard.destroyed,
    );
    const planet =
      yard &&
      this.#ownedPlanets().find((planet) => planet.id === yard.planetId);
    if (
      !yard ||
      !planet ||
      !this.#state(planet).buildings.some(
        (building) => building.id === yard.facilityId && !building.demolition,
      )
    )
      throw new Error('A surviving shipyard facility is required.');
    if (
      this.#state(planet).projects.some(
        (project) =>
          project.factoryId === yard.facilityId &&
          project.type === 'Shipyard station',
      )
    )
      throw new Error('A replacement station is already queued.');
    if (
      !this.freeShipyardHexes(planet.id).some((hex) => hex.key === position.key)
    )
      throw new Error('Choose an available neighboring hex for the shipyard.');
    return this.#scheduleProject(planet, 'Shipyard station', {
      slotIndex: null,
      factoryId: yard.facilityId,
      destinationFleetId: null,
      stationPosition: position,
    });
  }
  #updateSalvage(): void {
    for (let pass = 0; pass < 2; pass++) {
      this.#updateAutomaticSalvage();
      this.#salvage.update(
        this.#fleets,
        (position) => this.#hostileAt(position),
        (wreck, yard) => {
          for (const [part, amount] of Object.entries(
            Salvage.components(wreck.ship),
          )) {
            const technology = `${part} factory` as Technology;
            if (
              amount > 0 &&
              TECHNOLOGIES.includes(technology) &&
              !this.#research.completed.has(technology) &&
              !this.#research.recovered.has(technology)
            ) {
              this.#research.recovered.add(technology);
              this.#event(
                `Recovered technology: ${technology}. Research is available without its usual prerequisites.`,
              );
            }
          }
          this.#event(
            `${wreck.ship.type} wreck delivered to Orbit at ${this.#planetName(yard.planetId)}.`,
            yard.position,
          );
        },
      );
    }
  }
  #hostileAt(position: HexCoordinate): boolean {
    return this.#pirates.some(
      (pirate) => pirate.count > 0 && pirate.position.key === position.key,
    );
  }
  moveRepair(yardId: string, wreckId: string, index: number): void {
    this.#requirePlanning();
    const yard = this.#salvage.yards.find(
      (candidate) => candidate.id === yardId,
    );
    if (
      !yard ||
      !this.#ownedPlanets().some((planet) => planet.id === yard.planetId)
    )
      throw new Error('Choose your shipyard.');
    this.#salvage.moveRepair(yardId, wreckId, index);
  }
  #planetName(id: string): string {
    return this.#ownedPlanets().find((planet) => planet.id === id)!.name;
  }
  #destroyHostileShipyards(): BattleReport[] {
    return this.#salvage.yards
      .filter((yard) => !yard.destroyed && this.#hostileAt(yard.position))
      .map((yard) => {
        this.#salvage.destroyYard(yard);
        const summary = `Orbital shipyard at ${this.#planetName(yard.planetId)} was destroyed. The planetary facility survives; waiting wrecks remain in this hex.`;
        const eventId = this.#event(summary, yard.position);
        return {
          position: yard.position,
          fleetId: null,
          title: 'Shipyard destroyed',
          eventId,
          summary,
          wreckIds: [],
        };
      });
  }
  #createShipyard(
    planet: Planet,
    facilityId: string,
    point: { q: number; r: number },
  ): void {
    const old = this.#salvage.yards.findIndex(
      (yard) => yard.facilityId === facilityId,
    );
    if (old >= 0) this.#salvage.yards.splice(old, 1);
    this.#salvage.yards.push({
      id: this.#id('shipyard'),
      facilityId,
      planetId: planet.id,
      position: new HexCoordinate(point.q, point.r),
      builtRound: this.#round,
      destroyed: false,
      queue: [],
      orbitFleetId: null,
      issue: null,
    });
  }
  #repairShipyards(): void {
    for (const yard of this.#salvage.yards
      .filter((yard) => !yard.destroyed && yard.builtRound < this.#round)
      .toSorted((a, b) => a.id.localeCompare(b.id))) {
      const planet = this.#ownedPlanets().find(
        (planet) => planet.id === yard.planetId,
      )!;
      const state = this.#state(planet);
      const wreck = this.#salvage.wrecks.find(
        (wreck) => wreck.id === yard.queue[0],
      );
      yard.issue = null;
      if (!wreck) continue;
      const cost = Salvage.repairCost(
        wreck.ship,
        (type) => projectDefinition(type).cost,
      );
      const workers = state.buildings
        .filter((building) => !building.demolition)
        .reduce(
          (total, building) => total + BUILDINGS[building.type].workers,
          0,
        );
      const held = this.#logistics.reserved(planet.id);
      yard.issue =
        state.population - workers < SHIPS[wreck.ship.type].crew
          ? 'Not enough workers or crew for repair.'
          : RESOURCES.some(
                (resource) =>
                  state.stock[resource] - held[resource] < cost[resource],
              )
            ? 'Waiting for repair materials.'
            : null;
      if (yard.issue) continue;
      for (const resource of RESOURCES) state.stock[resource] -= cost[resource];
      state.population -= SHIPS[wreck.ship.type].crew;
      const ship = this.#salvage.completeRepair(yard);
      let fleet = this.#fleets.find(
        (fleet) =>
          fleet.id === yard.orbitFleetId &&
          fleet.position?.key === yard.position.key,
      );
      if (!fleet) {
        fleet = {
          id: this.#id('fleet'),
          name: this.#uniqueFleetName(`Orbit ${planet.name}`),
          position: yard.position,
          destination: null,
          ships: zeroShips(),
          shipUnits: [],
        };
        this.#fleets.push(fleet);
        yard.orbitFleetId = fleet.id;
      }
      fleet.ships[ship.type]++;
      fleet.shipUnits!.push(ship);
      this.#event(
        `${ship.type} repaired at ${planet.name}; ready in ${fleet.name}.`,
        yard.position,
      );
    }
  }
  canBuild(planet: Planet, type: BuildType, slotIndex?: number): string | null {
    if (
      type === 'Orbital shipyard' &&
      !this.freeShipyardHexes(planet.id).length
    )
      return 'No available neighboring hex for a shipyard.';
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
    stationPosition?: HexCoordinate,
  ): ProductionReceipt {
    const why = this.canBuild(planet, type, slotIndex);
    if (why) throw new Error(why);
    if (
      type === 'Orbital shipyard' &&
      (!stationPosition ||
        !this.freeShipyardHexes(planet.id).some(
          (hex) => hex.key === stationPosition.key,
        ))
    )
      throw new Error('Choose an available neighboring hex for the shipyard.');
    const state = this.#state(planet);
    return this.#scheduleProject(planet, type, {
      destinationFleetId: null,
      slotIndex: slotIndex ?? this.#emptySlot(planet, state, type),
      factoryId: null,
      ...(stationPosition ? { stationPosition } : {}),
    });
  }
  cancelProject(planet: Planet, projectId: string): void {
    this.#requirePlanning();
    const state = this.#state(planet);
    state.projects = state.projects.filter((p) => p.id !== projectId);
    this.#logistics.reserve(this.#logisticsPort());
  }
  canUpgrade(planet: Planet, buildingId: string): string | null {
    if (this.#phase !== 'planning')
      return 'Orders are locked during simulation.';
    const state = this.#colonies.get(planet.id);
    if (!state) return 'This planet is not owned.';
    const building = state.buildings.find((item) => item.id === buildingId);
    if (!building) return 'Building was not found.';
    if (building.demolition) return 'This factory is scheduled for demolition.';
    if (
      state.projects.some((project) => project.upgradeBuildingId === buildingId)
    )
      return 'An upgrade is already queued for this factory.';
    if (!FactoryTechnology.successor(building.type, this.#research.completed))
      return 'No newer factory technology has been researched.';
    return null;
  }
  scheduleUpgrade(planet: Planet, buildingId: string): ProductionReceipt {
    const why = this.canUpgrade(planet, buildingId);
    if (why) throw new Error(why);
    const building = this.#state(planet).buildings.find(
      (item) => item.id === buildingId,
    )!;
    const type = FactoryTechnology.successor(
      building.type,
      this.#research.completed,
    )!;
    return this.#scheduleProject(planet, type, {
      upgradeBuildingId: building.id,
      slotIndex: building.slotIndex,
      factoryId: null,
      destinationFleetId: null,
    });
  }
  toggleDemolition(planet: Planet, buildingId: string): void {
    this.#requirePlanning();
    const building = this.#state(planet).buildings.find(
      (item) => item.id === buildingId,
    );
    if (!building) throw new Error('Building was not found.');
    if (
      this.#state(planet).projects.some(
        (project) => project.upgradeBuildingId === buildingId,
      )
    )
      throw new Error(
        'Cancel the queued upgrade before demolishing this factory.',
      );
    building.demolition = !building.demolition;
  }
  productionIssue(planet: Planet, type: ProjectType): string | null {
    try {
      this.#requirePlanning();
      if (type === 'Civilian shuttle')
        this.#requireOrderResearch('Civilian transport');
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
                ? factoryShips(b.type).includes(type as ShipType)
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
    const domeResearch = this.#pendingDomeResearch(planet, this.#state(planet));
    if (domeResearch)
      return Object.freeze({
        kind: 'waiting',
        message: domeResearch,
        dome: null,
      });
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
    return Object.freeze({
      kind: 'full',
      message:
        'No building sites are available. Free a site or increase habitability.',
      dome: null,
    });
  }

  productionOptions(planet: Planet): readonly ProductionOption[] {
    const presence = this.#productionPresence(planet);
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
        snapshot.buildings.flatMap<ProjectType>((b) => {
          const definition = BUILDINGS[b.type];
          return definition.ship ? factoryShips(b.type) : [];
        }),
      ),
      ...(snapshot.availableComponents ?? []),
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
            : TELESCOPES.includes(component as (typeof TELESCOPES)[number])
              ? TELESCOPES.some((telescope) => telescope === produced)
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
      let displayedParts = definition.parts ?? {};
      if (type === 'Exploration ship') {
        try {
          displayedParts = this.#planProject(planet, type).plan.parts;
        } catch {
          /* The existing production issue explains missing supply. */
        }
      }
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
        parts: Object.freeze({ ...displayedParts }),
        blockedReason: this.productionIssue(planet, type),
        dependencyWarning: groups.length
          ? `Missing production factories: ${groups.map((group) => group.join(' or ')).join('; ')}.`
          : null,
        ...counts,
        ...presence.snapshot(type),
      });
    });
    return prioritizeProduction(options, missing);
  }

  #productionPresence(planet: Planet): ProductionPresence {
    const port = this.#logisticsPort();
    const sources = this.#ownedPlanets().map(
      (owned): ProductionPresenceSource => {
        const state = this.#state(owned);
        const counts = new Map<ProjectType, number>();
        const queued = new Map<ProjectType, number>();
        const add = (
          map: Map<ProjectType, number>,
          type: ProjectType,
          amount = 1,
        ) => map.set(type, (map.get(type) ?? 0) + amount);
        for (const building of state.buildings) add(counts, building.type);
        const dome = this.#domeType(owned);
        if (dome) add(counts, dome, state.domes?.length ?? 0);
        for (const component of COMPONENTS)
          add(counts, component, state.stock[component]);
        for (const fleet of this.#fleets) {
          if (fleet.position?.key !== owned.position.key) continue;
          for (const type of Object.keys(SHIPS) as ShipType[])
            add(counts, type, fleet.ships[type]);
        }
        for (const project of state.projects) add(queued, project.type);
        return { id: owned.id, counts, queued };
      },
    );
    const local = sources.find((source) => source.id === planet.id)!;
    const network = sources.filter(
      (source) =>
        source !== local && this.#logistics.path(source.id, planet.id, port),
    );
    return new ProductionPresence(local, network);
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
    if (type === 'Civilian shuttle') {
      this.#requireOrderResearch('Civilian transport');
      destinationFleetId = null;
    }
    this.#validateProjectFleet(planet, destinationFleetId);
    const building = this.#state(planet).buildings.find(
      (b) =>
        (!factoryId || b.id === factoryId) &&
        factoryShips(b.type).includes(type) &&
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

  #planProject(
    planet: Planet,
    type: ProjectType,
    existingId?: string,
    telescopeOnly = false,
  ) {
    let sequence = this.#sequence;
    const id = (prefix: string) => `${prefix}-${sequence++}`;
    const projectId = existingId ?? id('project');
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
    const start = sequence;
    const parts = telescopeOnly ? {} : (projectDefinition(type).parts ?? {});
    let lastError: unknown;
    for (const telescope of type === 'Exploration ship'
      ? [...TELESCOPES].reverse()
      : [null]) {
      sequence = start;
      const selected = { ...parts };
      if (telescope) {
        delete selected['Telescope I'];
        selected[telescope] = 1;
      }
      try {
        const plan = new ComponentPlanner(
          sites,
          this.#logistics,
          this.#logisticsPort(),
          id,
        ).plan(projectId, planet.id, selected);
        return { plan, sequence, projectId };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  #migrateTelescopeOrders(): void {
    for (const planet of this.#ownedPlanets())
      for (const project of [...this.#state(planet).projects]) {
        if (
          project.type !== 'Exploration ship' ||
          TELESCOPES.some((part) => project.parts?.[part])
        )
          continue;
        project.parts = { ...project.parts, 'Telescope I': 1 };
        try {
          const { plan, sequence } = this.#planProject(
            planet,
            project.type,
            project.id,
            true,
          );
          for (const production of plan.production)
            this.#colonies.get(production.planetId)!.projects.unshift({
              id: production.id,
              type: production.component,
              factoryId: production.factoryId,
              slotIndex: null,
              destinationFleetId: null,
            });
          project.parts = { ...project.parts, 'Telescope I': 0, ...plan.parts };
          this.#logistics.componentOrders.push(...plan.orders);
          this.#sequence = sequence;
        } catch {
          // teleskop-i-exploration-ships: keep legacy orders blocked until supply exists.
        }
      }
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
    if (project?.type === 'Civilian shuttle')
      throw new Error('Civilian shuttles start in their own automatic fleet.');
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
    if (fleet?.civilian)
      throw new Error(
        'Choose a fleet without Civilian transport for new ships.',
      );
    if (fleet?.routeId)
      throw new Error('Choose a fleet without a trade route for new ships.');
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
    if (ship === 'Salvage ship' && this.#salvage.towing(sourceId).length)
      throw new Error(
        'Release towed wrecks before transferring a Salvage ship.',
      );
    const issue = shipTransferIssue({
      ...(source.civilian ? { civilian: source.civilian } : {}),
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
      if (target.civilian?.passengers)
        throw new Error('Wait until passengers have disembarked.');
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
    if (
      this.galaxy.isStar(destination) ||
      (this.#knownTerrain.has(destination.key) &&
        !this.galaxy.isPassable(destination))
    )
      throw new Error('This hex is impassable.');
    const fleet = this.#fleetState(id);
    this.#salvage.stop(id);
    this.#requireManualFleet(fleet);
    if (this.#shipCount(fleet.ships) === 0)
      throw new Error('Empty fleets cannot receive destinations.');
    delete fleet.joinFleetId;
    delete fleet.exploration;
    delete fleet.starSurvey;
    delete fleet.automation;
    delete fleet.civilian;
    delete fleet.colonizationTargetId;
    fleet.destination = destination;
    delete fleet.navigationIssue;
    delete fleet.patrol;
    fleet.courseOrigin = fleet.position!;
  }
  clearDestination(id: string): void {
    const civilFleet = this.#fleetState(id);
    if (civilFleet.civilian) {
      if (!this.canIssueFleetOrders(id))
        throw new Error('Orders are locked during simulation.');
      this.#civilianTraffic.stop(civilFleet);
      return;
    }
    this.#requireFleetOrders(id);
    this.#salvage.stop(id);
    delete this.#fleetState(id).automation;
    delete this.#fleetState(id).colonizationTargetId;
    delete this.#fleetState(id).exploration;
    delete this.#fleetState(id).starSurvey;
    this.#requireManualFleet(this.#fleetState(id));
    delete this.#fleetState(id).patrol;
    this.#fleetState(id).destination = null;
    delete this.#fleetState(id).joinFleetId;
    delete this.#fleetState(id).courseOrigin;
  }
  get interruption(): SavedTurnSimulation | null {
    return this.#phase === 'interrupted' ? this.#simulation!.snapshot() : null;
  }
  get tacticalBattle(): BattleState | null {
    return this.#simulation?.tacticalBattles[0]?.visibleSnapshot ?? null;
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
            ? this.#fleets.find((f) => f.id === participant.id)
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
        } else if (
          pieces.length !==
            this.#pirates.find((f) => f.id === participant.id)!.count ||
          pieces.some((p) => p.type !== 'Space pirate')
        )
          throw new Error('Invalid pirate participants.');
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
  commandBattle(command: BattleCommand): void {
    const battle = this.#simulation?.tacticalBattles[0];
    if (this.#phase !== 'interrupted' || !battle)
      throw new Error('No tactical battle is active.');
    battle.command(command);
    this.#finishTacticalBattle();
  }
  resumeFleetOrders(id: string): void {
    const fleet = this.#fleetState(id);
    if (this.#phase !== 'planning' || !fleet.ordersPaused)
      throw new Error('Resume this fleet while planning.');
    delete fleet.ordersPaused;
    const cargo = this.#logistics.shipments.find(
      (shipment) => shipment.fleetId === id,
    );
    const delivery =
      cargo &&
      this.#ownedPlanets().find((p) => p.id === cargo.path[cargo.stage + 1]);
    if (delivery) {
      fleet.destination = delivery.position;
      fleet.courseOrigin = fleet.position!;
    }
    this.#logistics.prepare(this.#logisticsPort());
    if (fleet.civilian?.passengers && !fleet.destination) {
      const target = this.#ownedPlanets().find(
        (p) => p.id === fleet.civilian!.targetId,
      );
      if (target) {
        fleet.destination = target.position;
        fleet.courseOrigin = fleet.position!;
      }
    }
  }
  playBattleActivation(): void {
    const battle = this.#simulation?.tacticalBattles[0];
    if (this.#phase !== 'interrupted' || !battle)
      throw new Error('No tactical battle is active.');
    battle.actAutomatically();
    this.#finishTacticalBattle();
  }
  #createTacticalBattles(): TacticalBattle[] {
    const positions = [
      ...new Map(
        this.#fleets
          .filter((f) => f.position && this.#hostileAt(f.position))
          .map((f) => [f.position!.key, f.position!]),
      ).values(),
    ].sort((a, b) => a.q - b.q || a.r - b.r);
    return positions.map((position) => {
      const fleets: BattleFleet[] = this.#fleets
        .filter(
          (f) => f.position?.key === position.key && this.#shipCount(f.ships),
        )
        .map((f) => {
          const towing = new Set(
            f
              .shipUnits!.filter((unit) => unit.type === 'Salvage ship')
              .toSorted((a, b) => a.id.localeCompare(b.id))
              .slice(
                0,
                this.#salvage.wrecks.filter((w) => w.towedBy === f.id).length,
              )
              .map((unit) => unit.id),
          );
          return {
            id: f.id,
            side: 'player',
            retreat: this.#retreatHex(f.id, position, false),
            ships: f.shipUnits!.map((unit) => ({
              id: unit.id,
              type: unit.type,
              ion: unit.engines['Ion pulse engine'] > 0,
              towing: towing.has(unit.id),
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
            ships: Array.from({ length: p.count }, (_, i) => ({
              id: `${p.id}:ship-${i + 1}`,
              type: 'Space pirate' as const,
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
            ? !this.#fleets.some((f) => f.position?.key === p.key) &&
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
    const wreckIds: string[] = [];
    const playerIds = state.fleets
      .filter((f) => f.side === 'player')
      .map((f) => f.id);
    for (const participant of state.fleets) {
      const pieces = state.pieces.filter((p) => p.fleetId === participant.id);
      const killed = new Set(
        pieces.filter((p) => p.status === 'destroyed').map((p) => p.id),
      );
      const escaped = pieces.some((p) => p.status === 'escaped');
      if (participant.side === 'enemy') {
        const pirate = this.#pirates.find((p) => p.id === participant.id)!;
        pirate.count -= killed.size;
        for (const id of killed)
          wreckIds.push(
            this.#salvage.addWreck(
              this.#id('wreck'),
              {
                id,
                type: 'Fighter',
                engines: { 'Rocket engine': 1, 'Ion pulse engine': 0 },
              },
              position,
            ).id,
          );
        if (escaped && participant.retreat) {
          pirate.position = new HexCoordinate(
            participant.retreat.q,
            participant.retreat.r,
          );
          simulation.remaining.set(pirate.id, 0);
        }
        continue;
      }
      const fleet = this.#fleetState(participant.id);
      const lostUnits = fleet.shipUnits!.filter((unit) => killed.has(unit.id));
      for (const unit of lostUnits) {
        fleet.ships[unit.type]--;
        wreckIds.push(
          this.#salvage.addWreck(this.#id('wreck'), unit, position).id,
        );
      }
      fleet.shipUnits = fleet.shipUnits!.filter((unit) => !killed.has(unit.id));
      this.#salvage.releaseLostCapacity(fleet, position);
      if (lostUnits.some((unit) => unit.type === 'Transport ship'))
        this.#logistics.destroyCargo(fleet.id);
      if (
        lostUnits.some((unit) => unit.type === 'Civilian shuttle') &&
        fleet.civilian
      ) {
        const passengers = Math.min(
          fleet.civilian.passengers,
          lostUnits.filter((unit) => unit.type === 'Civilian shuttle').length *
            SHUTTLE_CAPACITY,
        );
        fleet.civilian.passengers -= passengers;
        if (passengers)
          this.#event(
            `${fleet.name} lost ${passengers} passengers in combat.`,
            position,
          );
      }
      if (escaped && participant.retreat && this.#shipCount(fleet.ships)) {
        fleet.position = new HexCoordinate(
          participant.retreat.q,
          participant.retreat.r,
        );
        fleet.destination = null;
        delete fleet.courseOrigin;
        delete fleet.joinFleetId;
        delete fleet.patrol;
        delete fleet.exploration;
        delete fleet.starSurvey;
        delete fleet.automation;
        delete fleet.colonizationTargetId;
        this.#salvage.stop(fleet.id);
        if (fleet.routeId || fleet.civilian?.passengers)
          fleet.ordersPaused = true;
        else delete fleet.civilian;
        simulation.remaining.set(fleet.id, 0);
        this.#salvage.follow(fleet);
      }
      this.#releaseEmptyFleet(fleet);
    }
    for (const id of wreckIds) this.#knownObjects.add(id);
    for (const pirate of this.#pirates)
      if (pirate.count <= 0) {
        simulation.remaining.delete(pirate.id);
        simulation.previousPositions.delete(pirate.id);
      }
    this.#pirates = this.#pirates.filter((p) => p.count > 0);
    this.#visiblePirates = new Set(
      [...this.#visiblePirates].filter((id) =>
        this.#pirates.some((p) => p.id === id),
      ),
    );
    const lost = state.pieces.filter(
      (p) => p.side === 'player' && p.status === 'destroyed',
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
      (p) => p.side === 'enemy' && p.status === 'destroyed',
    ).length;
    const surviving = state.pieces.filter(
      (p) => p.side === 'player' && p.status !== 'destroyed',
    );
    const summary = `Lost ${losses}; destroyed ${pirateLosses} pirates. Survivors: ${surviving.filter((p) => p.type === 'Fighter').length} Fighters, ${state.pieces.filter((p) => p.side === 'enemy' && p.status !== 'destroyed').length} pirates, ${surviving.filter((p) => p.type !== 'Fighter').length} civilian ships. ${state.pieces.filter((p) => p.status === 'escaped').length} ships escaped.`;
    const names = playerIds
      .map((id) => this.#fleetDisplayName(this.#fleetState(id)))
      .join(', ');
    const eventId = this.#event(
      `Combat at HEX ${position.key}: ${names} versus Space pirate. ${summary}`,
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
        wreckIds,
      },
    ];
    simulation.tacticalBattles.shift();
    if (!simulation.tacticalBattles.length) {
      simulation.awaitingCombat = false;
      this.#afterCombat();
    }
  }
  #afterCombat(): void {
    this.#mergeReinforcements();
    this.#simulation!.battles = this.#simulation!.battles.map((report) => ({
      ...report,
      fleetId:
        report.fleetIds?.find((id) =>
          this.#fleets.some((fleet) => fleet.id === id),
        ) ??
        (this.#fleets.some((fleet) => fleet.id === report.fleetId)
          ? report.fleetId
          : null),
    }));
    this.#refreshReinforcements();
    this.#updateSight();
    const colonized = this.#completeColonizations();
    if (colonized)
      this.#simulation!.discoveries = this.#newDiscoveries({ movements: [] });
    this.#visiblePirates = new Set(
      this.pirateSnapshots()
        .map((p) => p.id)
        .filter((id) => this.#visiblePirates.has(id)),
    );
    for (const fleet of this.#fleets) {
      this.#updateExploration(fleet);
      this.#updatePatrol(fleet);
    }
    this.#simulation!.battles = [
      ...this.#simulation!.battles,
      ...this.#destroyHostileShipyards(),
    ];
    this.#updateSalvage();
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
    if (fleet.civilian?.passengers)
      throw new Error('Wait until passengers have disembarked.');
    if (!this.canIssueFleetOrders(id))
      throw new Error(
        'Orders are only available while planning or handling a discovery.',
      );
  }
  setExploration(id: string, order: ExplorationOrder): void {
    this.#requireFleetOrders(id);
    this.#requireOrderResearch('Automated exploration');
    if (!['explore', 'explore-stars'].includes(order))
      throw new Error('Unknown exploration order.');
    const fleet = this.#fleetState(id);
    if (!fleet.ships['Exploration ship'])
      throw new Error('An Exploration ship is required.');
    this.#salvage.stop(id);
    delete fleet.patrol;
    delete fleet.joinFleetId;
    fleet.exploration = order;
    delete fleet.automation;
    delete fleet.civilian;
    delete fleet.colonizationTargetId;
    delete fleet.starSurvey;
    this.#updateExploration(fleet);
  }
  setPatrol(id: string): void {
    this.#requireFleetOrders(id);
    this.#requireOrderResearch('Fleet patrol');
    const fleet = this.#fleetState(id);
    if (!fleet.ships.Fighter)
      throw new Error('A Fighter is required for Patrol.');
    if (fleet.patrol) return;
    this.#salvage.stop(id);
    delete fleet.exploration;
    delete fleet.joinFleetId;
    fleet.patrol = { center: fleet.position!, nextIndex: 0 };
    delete fleet.automation;
    delete fleet.civilian;
    delete fleet.colonizationTargetId;
    delete fleet.starSurvey;
    this.#updatePatrol(fleet);
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
    this.#simulation!.otherFleets = false;
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
        const description =
          'kind' in item
            ? `${item.name} at HEX ${item.position.q},${item.position.r}.`
            : item.summary;
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
        simulation.battles[0]?.eventId ?? simulation.discoveries[0]?.eventId;
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
        this.#simulation!.discoveries[0]?.eventId;
      if (this.#simulation!.activeEventId)
        this.presentEvent(this.#simulation!.activeEventId);
    }
  }
  allowOtherFleetOrders(): void {
    if (this.#phase !== 'interrupted' || !this.#simulation!.handling)
      throw new Error('Handle the discovery first.');
    this.#simulation!.otherFleets = true;
  }
  continueTurn(): void {
    if (this.#phase !== 'interrupted') throw new Error('No interrupted year.');
    if (this.#simulation!.tacticalBattles.length)
      throw new Error('Complete tactical combat before continuing the year.');
    this.#simulation!.discoveries = [];
    this.#simulation!.battles = [];
    this.#simulation!.activeEventId = undefined;
    this.#simulation!.handling = false;
    this.#simulation!.otherFleets = false;
    this.#phase = 'simulating';
    this.#updateSalvage();
  }
  startTurn(): void {
    this.#requirePlanning();
    this.#updateAutomaticTransport();
    this.#updateSalvage();
    this.#logistics.prepare(this.#logisticsPort());
    this.#civilianTraffic.prepare(this.#civilianPort());
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
    if (this.#simulation!.economyApplied) return null;
    if (this.#simulation!.awaitingCombat) {
      return (this.#pendingFrame = Object.freeze({
        movements: Object.freeze([]),
        encounters: true,
        combats: Object.freeze([]),
      }));
    }
    this.#updateSalvage();
    for (const fleet of this.#fleets) this.#updateExploration(fleet);
    for (const fleet of this.#fleets) this.#updatePatrol(fleet);
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
    return (this.#pendingFrame = frame
      ? Object.freeze({ movements: frame.movements })
      : Object.freeze({ movements: Object.freeze([]), settlement: true }));
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
    if (frame.settlement) {
      this.#settleYear();
      this.#simulation!.economyApplied = true;
      for (const id of this.#simulation!.remaining.keys())
        this.#simulation!.remaining.set(id, 0);
      this.#updateSight();
      const battles = this.#destroyHostileShipyards();
      this.#updateSalvage();
      const discoveries = this.#newDiscoveries(frame);
      if (discoveries.length || battles.length) {
        this.#simulation!.battles = battles;
        this.#simulation!.discoveries = discoveries;
        this.#phase = 'interrupted';
      }
      return;
    }
    for (const movement of frame.movements) {
      this.#simulation!.previousPositions.set(movement.fleetId, movement.from);
      const moving = this.#fleets.find(
        (fleet) => fleet.id === movement.fleetId,
      );
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
        pirate.position = movement.to;
        continue;
      }
      const fleet = this.#fleetState(movement.fleetId);
      fleet.position = movement.to;
      this.#salvage.follow(fleet);
      this.#recordArrival(fleet);
    }
    this.#updateSight();
    if (frame.combats === undefined) {
      this.#simulation!.awaitingCombat = true;
      const discoveries = this.#newDiscoveries(frame);
      if (discoveries.length) {
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
      this.#simulation!.discoveries.length
    )
      this.#phase = 'interrupted';
  }
  finishTurn(): void {
    if (this.#phase !== 'simulating')
      throw new Error('No turn is being simulated.');
    if (this.#simulation?.awaitingCombat || this.nextTurnFrame())
      throw new Error('Complete the remaining turn steps first.');
    this.#round += 1;
    this.#decisions.skipped.clear();
    this.#phase = 'planning';
    this.#simulation = null;
    this.#logistics.reserve(this.#logisticsPort());
  }
  #settleYear(): void {
    for (const fleet of this.#fleets) this.#recordArrival(fleet);
    this.#completeColonizations();
    this.#logistics.unload(this.#logisticsPort());
    this.#civilianTraffic.arrive(this.#civilianPort());
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
        this.#planetEvent(
          `${building.type} was demolished on ${planet.name}.`,
          planet,
        );
      state.buildings = state.buildings.filter((b) => !b.demolition);
      for (const yard of [...this.#salvage.yards].filter(
        (yard) =>
          yard.planetId === planet.id &&
          !state.buildings.some((building) => building.id === yard.facilityId),
      )) {
        this.#salvage.destroyYard(yard);
        this.#salvage.yards.splice(this.#salvage.yards.indexOf(yard), 1);
      }
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
        this.#planetEvent(
          `Habitability on ${planet.name} increased to ${state.habitability}%.`,
          planet,
        );
      const { blocks } = this.#allocation(planet, state);
      const active = state.projects.slice(0, 1);
      for (const project of active) {
        const blocked = blocks.get(project.id);
        if (blocked)
          this.#planetEvent(
            `${project.type} is waiting on ${planet.name}: ${blocked}`,
            planet,
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
      this.#planetEvent(
        `Population on ${planet.name} changed by +${growth}.`,
        planet,
      );
    }
    const researched = this.#research.advance(researchStations);
    if (researched) this.#event(`Research completed: ${researched}.`);
    this.#repairShipyards();
    this.#logistics.cleanup(this.#logisticsPort());
    this.#refreshReinforcements();
  }
  #completeProject(planet: Planet, state: ColonyState, project: Project): void {
    if (project.upgradeBuildingId) {
      const building = state.buildings.find(
        (item) => item.id === project.upgradeBuildingId,
      )!;
      const previous = building.type;
      building.type = project.type as BuildType;
      this.#planetEvent(
        `${previous} was upgraded to ${project.type} on ${planet.name}.`,
        planet,
      );
      return;
    }
    if (project.type === 'Shipyard station') {
      this.#createShipyard(
        planet,
        project.factoryId!,
        project.stationPosition!,
      );
      this.#planetEvent(`Orbital shipyard rebuilt at ${planet.name}.`, planet);
      return;
    }
    const d = projectDefinition(project.type);
    if (d.sitePreparation) {
      state.domes ??= [];
      state.domes.push(project.slotIndex!);
      this.#planetEvent(
        `${project.type} was completed at site ${project.slotIndex! + 1} on ${planet.name}.`,
        planet,
      );
    } else if (d.permanent) {
      const buildingId = this.#id('building');
      state.buildings.push({
        id: buildingId,
        type: project.type as BuildType,
        slotIndex: project.slotIndex!,
        demolition: false,
      });
      if (project.type === 'Orbital shipyard')
        this.#createShipyard(planet, buildingId, project.stationPosition!);
      this.#planetEvent(
        `${project.type} was completed on ${planet.name}.`,
        planet,
      );
    } else if (d.component) {
      state.stock[d.component] += 1;
      this.#logistics.completeComponent(project.id);
      this.#planetEvent(
        `${d.component} was produced at ${planet.name}.`,
        planet,
      );
    } else if (d.ship) {
      this.#createShip(
        planet,
        state,
        d.ship,
        project.destinationFleetId,
        project.parts,
      );
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
    if (ship === 'Civilian shuttle') {
      const fleet: Fleet = {
        id: this.#id('fleet'),
        name: this.#uniqueFleetName(`${planet.name} Civilian transport`),
        position: planet.position,
        destination: null,
        ships: { ...zeroShips(), [ship]: 1 },
        shipUnits: [
          {
            id: this.#id('ship'),
            type: ship,
            engines: {
              'Rocket engine': parts['Rocket engine'] ?? engineCount(ship),
              'Ion pulse engine': parts['Ion pulse engine'] ?? 0,
            },
          },
        ],
        civilian: CivilianTraffic.order(),
      };
      this.#fleets.push(fleet);
      this.#planetEvent(
        `${ship} was produced at ${planet.name} and started Civilian transport.`,
        planet,
      );
      return;
    }
    // nybyggda-skepp-utan-ruttflotta: recheck assignments made after the order was queued.
    let reserve =
      this.#fleets.find(
        (fleet) =>
          fleet.id === destinationFleetId &&
          !fleet.routeId &&
          !fleet.civilian &&
          (!fleet.position || fleet.position.key === planet.position.key),
      ) ??
      this.#fleets.find(
        (fleet) =>
          fleet.id === state.homeFleetId &&
          !fleet.routeId &&
          !fleet.civilian &&
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
      ...(ship === 'Exploration ship'
        ? {
            telescope: (TELESCOPES.findIndex((part) => (parts[part] ?? 0) > 0) +
              1) as TelescopeLevel,
          }
        : {}),
      engines: {
        'Rocket engine': parts['Rocket engine'] ?? engineCount(ship),
        'Ion pulse engine': parts['Ion pulse engine'] ?? 0,
      },
    });
    this.#planetEvent(`${ship} was produced at ${planet.name}.`, planet);
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
    return Object.freeze(
      this.#logistics.snapshots(this.#logisticsPort()).map((route) => {
        const waiting =
          !route.closing && !route.capacity
            ? this.#transportWaiting(route)
            : null;
        return waiting ? Object.freeze({ ...route, status: waiting }) : route;
      }),
    );
  }
  createTradeRoute(a: string, b: string): string {
    this.#requirePlanning();
    if (!this.#research.completed.has('Trade logistics'))
      throw new Error('Research Trade logistics first.');
    const id = this.#logistics.create(a, b, this.#logisticsPort());
    this.#updateAutomaticTransport();
    return id;
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
      if (source.patrol) {
        source.destination = null;
        delete source.courseOrigin;
      }
      this.#logistics.assign(routeId, source, this.#logisticsPort());
      delete source.automation;
      delete source.colonizationTargetId;
      delete source.patrol;
      delete source.exploration;
      delete source.starSurvey;
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
    if (
      this.#research.queue.length &&
      this.#researchQueueIssue() &&
      ![...this.#colonies.values()].some((state) =>
        state.projects.some((project) => project.type === 'Research station'),
      )
    )
      items.push({
        id: 'research-stalled',
        label: 'Build a Research station to resume queued research',
        kind: 'planet',
        planetId: this.#ownedPlanets()[0]!.id,
      });
    for (const order of this.#salvage.orders.filter((order) => order.issue))
      items.push({
        id: `salvage-${order.fleetId}`,
        label: `${this.#fleetDisplayName(this.#fleetState(order.fleetId))}: ${order.issue}`,
        kind: 'fleet',
        fleetId: order.fleetId,
      });
    for (const yard of this.#salvage.yards.filter(
      (yard) => yard.destroyed || yard.issue,
    ))
      items.push({
        id: `shipyard-${yard.id}`,
        label: `${this.#planetName(yard.planetId)} shipyard: ${yard.destroyed ? 'station destroyed; rebuild required' : yard.issue}`,
        kind: 'planet',
        planetId: yard.planetId,
      });
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
      const project = state.projects[0];
      const factory = project
        ? this.#factoryRequirement(planet, state, project)
        : null;
      if (factory?.status === 'Needs attention')
        items.push({
          id: `production-${planet.id}`,
          label: `${planet.name}: ${factory.message}`,
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
      if (
        supply.materials.some(
          (material) => material.unprovided > 0 && !material.waitingReason,
        )
      )
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
        !f.patrol &&
        !f.automation &&
        !f.civilian &&
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
      (r) => !r.closing && !r.capacity && !this.#transportWaiting(r),
    ))
      items.push({
        id: `route-idle-${route.id}`,
        label: `${route.from} ↔ ${route.to}: ${this.#transportNextStep(route)}`,
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
    const assessments = this.supplyOverview().planets;
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
          const definition = this.#projectDefinition(state, project);
          const factory = this.#factoryRequirement(planet, state, project);
          const issue =
            factory.status === 'Needs attention'
              ? factory.message
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
            waitingReason:
              factory.status === 'Waiting' ? factory.message : null,
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
      (planetId, projectId, material, missing) =>
        assessments
          .find(
            (planet) =>
              planet.id === planetId && planet.project?.id === projectId,
          )
          ?.materials.find(
            (item) => item.material === material && item.unprovided >= missing,
          )?.waitingReason ?? null,
      (from, to) => this.#pendingTransportPath(from, to, to),
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
      const factory = project
        ? this.#factoryRequirement(planet, state, project)
        : null;
      const staffed =
        state.buildings
          .filter((b) => !b.demolition)
          .reduce((n, b) => n + BUILDINGS[b.type].workers, 0) <=
        state.population;
      const products = [
        ...new Set(
          state.buildings.flatMap<ProjectType>((b) => {
            const definition = BUILDINGS[b.type];
            return definition.component
              ? [definition.component]
              : definition.ship
                ? factoryShips(b.type)
                : [];
          }),
        ),
      ];
      return {
        id: planet.id,
        name: planet.name,
        project,
        issue:
          block === 'Waiting for resources.' || factory?.status === 'Waiting'
            ? null
            : block,
        waitingReason: factory?.status === 'Waiting' ? factory.message : null,
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
                factoryShips(b.type).includes(product as ShipType)),
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
    const waitingStock = new Map<string, number>();
    inputs.sort(
      (a, b) =>
        (a.project?.id ?? '').localeCompare(b.project?.id ?? '') ||
        a.id.localeCompare(b.id),
    );
    return new SupplyOverview(
      inputs,
      this.shipments,
      MATERIALS,
      (planetId, projectId, material, missing) =>
        this.#pendingMaterial(
          planetId,
          projectId,
          material,
          missing,
          waitingStock,
        ),
    );
  }

  supplyStatus(planetId: string): string {
    const assessment = this.supplyOverview().planets.find(
      (p) => p.id === planetId,
    );
    if (!assessment) return '';
    return this.#supplyDescription(assessment);
  }

  #supplyDescription(assessment: SupplyPlanet): string {
    const missing = assessment.materials.filter(
      (m) => m.unprovided > 0 && !m.waitingReason,
    );
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
      if (
        assessment.summary.startsWith('Waiting for ') &&
        !assessment.materials.some((m) => m.required > m.available)
      )
        return assessment.summary;
      return assessment.materials
        .filter((m) => m.required > m.available)
        .map((m) => {
          if (m.waitingReason) return m.waitingReason;
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
  #componentProduction(projectId?: string): readonly {
    orderId: string;
    material: Component;
    amount: number;
    issue: string | null;
  }[] {
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
        return {
          orderId: order.id,
          material: order.component,
          amount: order.amount,
          issue,
        };
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
      travelYears: (fleet, from, to) => {
        if (from.key === to.key) return 0;
        const speed = this.#speed(this.#fleetState(fleet.id));
        const path = this.#navigation.path(from, to, speed, this.#knownTerrain);
        return path.length
          ? this.#navigation.years(path, from, speed, this.#knownTerrain)
          : Infinity;
      },
      id: (prefix: string) => this.#id(prefix),
      event: (message: string, position?: HexCoordinate, planetId?: string) => {
        const planet = this.#ownedPlanets().find(
          (item) => item.id === planetId,
        );
        if (planet) this.#planetEvent(message, planet);
        else this.#event(message, position);
      },
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
        fleet.position ?? undefined,
      ),
    );
    this.#updateSight();
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
      this.#event(
        `${group.name} joined ${target.name}.`,
        target.position ?? undefined,
      );
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
    const producer = state.buildings.some(
      (building) =>
        !building.demolition &&
        !!(BUILDINGS[building.type].ship || BUILDINGS[building.type].component),
    );
    if (!producer && this.#pendingDomeResearch(planet, state)) return false;
    return (
      producer ||
      state.buildings.length < this.#environment(planet, state).buildSlots
    );
  }

  // beslut-vantar-pa-paborjad-atgard: projections explain waiting without granting capacity or placing orders.
  #pendingDomeResearch(planet: Planet, state: ColonyState): string | null {
    const dome = this.#domeType(planet) as Technology | null;
    if (!dome || !this.#research.queue.includes(dome)) return null;
    const environment = this.#environment(planet, state);
    const prepared = Array.from(
      { length: environment.buildSlots },
      (_, index) => index,
    ).some(
      (index) =>
        !state.buildings.some((building) => building.slotIndex === index) &&
        !state.projects.some((project) => project.slotIndex === index) &&
        (environment.breathable || state.domes?.includes(index)),
    );
    return prepared ? null : `Waiting for ${dome} research.`;
  }

  #factoryRequirement(
    planet: Planet,
    state: ColonyState,
    project: Project,
  ): {
    status: 'Ready' | 'Waiting' | 'Needs attention';
    message: string;
  } {
    if (project.upgradeBuildingId) {
      const building = state.buildings.find(
        (item) => item.id === project.upgradeBuildingId,
      );
      return building &&
        !building.demolition &&
        building.slotIndex === project.slotIndex &&
        FactoryTechnology.canUpgrade(building.type, project.type as BuildType)
        ? { status: 'Ready', message: '' }
        : {
            status: 'Needs attention',
            message: 'The original factory is required for this upgrade.',
          };
    }
    const definition = projectDefinition(project.type);
    const matching = (building: { type: BuildType; id?: string }) =>
      project.type === 'Shipyard station'
        ? building.type === 'Orbital shipyard' &&
          building.id === project.factoryId
        : definition.ship
          ? factoryShips(building.type).includes(definition.ship)
          : !!definition.component &&
            BUILDINGS[building.type].component === definition.component;
    if (
      ((definition.permanent || definition.sitePreparation) &&
        project.type !== 'Shipyard station') ||
      state.buildings.some(
        (building) => !building.demolition && matching(building),
      )
    )
      return { status: 'Ready', message: '' };
    const factories = (Object.keys(BUILDINGS) as BuildType[]).filter((type) =>
      matching({ type }),
    );
    const queued = state.projects.find((candidate) =>
      factories.includes(candidate.type as BuildType),
    );
    if (queued)
      return state.projects.indexOf(queued) < state.projects.indexOf(project)
        ? {
            status: 'Waiting',
            message: `Waiting for ${queued.type} construction.`,
          }
        : {
            status: 'Needs attention',
            message: `Move ${queued.type} before ${project.type} in the build queue.`,
          };
    const research = factories.find((type) =>
      this.#research.queue.includes(type as Technology),
    );
    const waiting = research
      ? `Waiting for ${research} research.`
      : factories.length
        ? this.#pendingDomeResearch(planet, state)
        : null;
    return waiting
      ? { status: 'Waiting', message: waiting }
      : {
          status: 'Needs attention',
          message: `A matching completed factory is required for ${project.type}.`,
        };
  }

  #transportPreparation(excludePlanetId?: string): string | null {
    if (this.#research.queue.includes('Transport ship factory'))
      return 'Waiting for Transport ship factory research.';
    for (const [id, state] of this.#colonies) {
      if (id === excludePlanetId) continue;
      const project = state.projects.find(
        (item) =>
          item.type === 'Transport ship' ||
          item.type === 'Transport ship factory',
      );
      if (project) return `Waiting for ${project.type} construction.`;
    }
    return null;
  }

  #availableTransport(route: TradeRouteSnapshot): boolean {
    return this.fleetSnapshots().some(
      (fleet) =>
        fleet.ships['Transport ship'] > 0 &&
        !tradeAssignmentIssue(fleet, route),
    );
  }

  #transportWaiting(
    route: TradeRouteSnapshot,
    excludePlanetId?: string,
  ): string | null {
    return this.#availableTransport(route)
      ? null
      : this.#transportPreparation(excludePlanetId);
  }

  #transportNextStep(route: TradeRouteSnapshot): string {
    if (this.#availableTransport(route)) return 'assign transport fleet';
    if (!this.#research.completed.has('Transport ship factory'))
      return 'research Transport ship factory in Research';
    const factory = [...this.#colonies.values()].some((state) =>
      state.buildings.some(
        (building) =>
          building.type === 'Transport ship factory' && !building.demolition,
      ),
    );
    return factory
      ? 'build a Transport ship in Production'
      : 'build a Transport ship factory in Production';
  }

  #pendingTransportPath(
    from: string,
    to: string,
    excludePlanetId?: string,
  ): readonly string[] | null {
    const routes = this.#logistics.snapshots(this.#logisticsPort());
    const visited = new Set([from]);
    const paths = [[from]];
    for (const path of paths) {
      const last = path.at(-1)!;
      if (last === to) return path;
      for (const route of routes) {
        if (
          route.closing ||
          ![route.a, route.b].includes(last) ||
          (!route.capacity && !this.#transportWaiting(route, excludePlanetId))
        )
          continue;
        const next = route.a === last ? route.b : route.a;
        if (!visited.has(next)) {
          visited.add(next);
          paths.push([...path, next]);
        }
      }
    }
    return null;
  }

  #pendingMaterial(
    planetId: string,
    projectId: string,
    material: string,
    missing: number,
    waitingStock: Map<string, number>,
  ): string | null {
    let covered = 0;
    for (const shipment of this.shipments) {
      if (
        shipment.projectId === projectId &&
        shipment.material === material &&
        shipment.issue === 'No active transport path' &&
        this.#pendingTransportPath(shipment.locationId, planetId, planetId)
      )
        covered += shipment.amount;
    }
    const orders = this.#logistics.componentOrders.filter(
      (order) =>
        order.projectId === projectId &&
        order.component === material &&
        !order.delivered,
    );
    const production = this.#componentProduction(projectId);
    for (const order of orders) {
      if (!production.find((item) => item.orderId === order.id)?.issue)
        continue;
      const source = this.#colonies.get(order.source)!;
      const producer = source.projects.find(
        (project) => project.id === order.productionProjectId,
      );
      const behind =
        producer &&
        order.source === planetId &&
        source.projects.indexOf(producer) >
          source.projects.findIndex((project) => project.id === projectId);
      const path = this.#pendingTransportPath(
        order.location,
        planetId,
        planetId,
      );
      if (!behind && (!order.productionProjectId || producer) && path)
        covered += order.amount;
    }
    if (covered >= missing)
      return `Waiting for ${material} production or transport preparation.`;
    if (!this.#transportPreparation(planetId)) return null;
    const allocations: { key: string; amount: number; available: number }[] =
      [];
    for (const source of this.#ownedPlanets()) {
      if (
        source.id === planetId ||
        !this.#pendingTransportPath(source.id, planetId, planetId)
      )
        continue;
      if (this.#logistics.path(source.id, planetId, this.#logisticsPort()))
        continue;
      const state = this.#state(source);
      const head = state.projects[0];
      const key = `${source.id}:${material}`;
      const available =
        waitingStock.get(key) ??
        Math.max(
          0,
          state.stock[material as keyof Stock] -
            this.#logistics.reserved(source.id)[material as keyof Stock] -
            (head
              ? this.#projectCost(source, head)[material as keyof Stock]
              : 0),
        );
      const amount = Math.min(available, missing - covered);
      allocations.push({ key, amount, available });
      covered += amount;
      if (covered >= missing) break;
    }
    if (covered < missing) return null;
    for (const { key, amount, available } of allocations)
      waitingStock.set(key, available - amount);
    return `Waiting for ${material} transport preparation.`;
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
        state.projects.filter(
          (p) => p.slotIndex !== null && !p.upgradeBuildingId,
        ).length,
      availableSlots:
        this.#environment(planet, state).buildSlots -
        state.buildings.length -
        state.projects.filter(
          (p) => p.slotIndex !== null && !p.upgradeBuildingId,
        ).length,
    });
    for (const [index, project] of state.projects.entries()) {
      if (index > 0) {
        blocks.set(project.id, 'Waiting for the previous project.');
        continue;
      }
      const definition = this.#projectDefinition(state, project);
      const factory = this.#factoryRequirement(planet, state, project);
      const why =
        factory.status !== 'Ready'
          ? factory.message
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
      this.#mapCells = null;
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
      this.#mapCells = null;
      path = this.#route(fleet).path;
      if (path[0]?.key !== next.key) return this.#availableRoute(fleet);
    }
    if (!this.#simulation!.movement(fleet.id, speed)) {
      state.navigationIssue =
        'Asteroid passage requires a full year of movement.';
      return [];
    }
    return path;
  }
  #fleetDisplayName(fleet: Fleet): string {
    const route = this.#logistics.routes.find(
      (route) => route.id === fleet.routeId,
    );
    return route
      ? `Route ${this.#planetName(route.a)} <> ${this.#planetName(route.b)}`
      : fleet.name;
  }
  #updateExploration(fleet: Fleet): void {
    if (!fleet.exploration) return;
    let target: HexCoordinate | null = null;
    if (fleet.position && fleet.ships['Exploration ship'] > 0) {
      if (fleet.exploration === 'explore-stars')
        target = this.#starSurveyDestination(fleet);
      else {
        delete fleet.starSurvey;
        const home = this.galaxy.homePlanet.position;
        const candidates = this.galaxy
          .mapSnapshot()
          .map((cell) => cell.position)
          .filter(
            (point) =>
              !this.#explored.has(point.key) &&
              !this.galaxy.isStar(point) &&
              (!this.#knownTerrain.has(point.key) ||
                this.galaxy.isPassable(point)) &&
              point
                .neighbors()
                .some((neighbor) => this.#explored.has(neighbor.key)),
          )
          .sort(
            (a, b) =>
              home.distanceTo(a) - home.distanceTo(b) ||
              fleet.position!.distanceTo(a) - fleet.position!.distanceTo(b) ||
              Math.atan2(a.r - home.r, a.q - home.q) -
                Math.atan2(b.r - home.r, b.q - home.q),
          );
        target =
          candidates.find(
            (point) =>
              this.#navigation.path(
                fleet.position!,
                point,
                this.#speed(fleet),
                this.#knownTerrain,
              ).length,
          ) ?? null;
      }
    }
    if (!target) {
      delete fleet.exploration;
      delete fleet.starSurvey;
      fleet.destination = null;
      delete fleet.courseOrigin;
      this.#event(
        `${this.#fleetDisplayName(fleet)}: exploration stopped; no unexplored targets or Exploration ship available.`,
        fleet.position ?? undefined,
      );
    } else if (fleet.destination?.key !== target.key) {
      fleet.destination = target;
      fleet.courseOrigin = fleet.position!;
    }
  }
  #starSurveyDestination(fleet: Fleet): HexCoordinate | null {
    if (!fleet.position) return null;
    if (!fleet.starSurvey) {
      const stars = this.galaxy.systems.map((system) => system.star.position);
      const remaining = new Set(this.#explored);
      for (let attempts = 0; attempts < stars.length; attempts++) {
        const target = nearestUnexplored(fleet.position, stars, remaining);
        if (!target) return null;
        const ring = target.neighbors();
        const approaches = ring
          .map((point, index) => ({
            point,
            index,
            path: this.#navigation.path(
              fleet.position!,
              point,
              this.#speed(fleet),
              this.#knownTerrain,
            ),
          }))
          .filter(
            ({ point, path }) =>
              this.galaxy.isPassable(point) &&
              (path.length || point.key === fleet.position!.key),
          )
          .sort((a, b) => a.path.length - b.path.length || a.index - b.index);
        const approach = approaches[0];
        if (approach) {
          const star = this.galaxy.systems.find(
            (system) => system.star.position.key === target.key,
          )!.star;
          fleet.starSurvey = {
            starId: star.id,
            startIndex: approach.index,
            completed: 0,
            arrived: false,
          };
          break;
        }
        remaining.add(target.key);
      }
    }
    const survey = fleet.starSurvey;
    if (!survey) return null;
    const star = this.galaxy.systems.find(
      (system) => system.star.id === survey.starId,
    )!.star;
    const ring = star.position.neighbors();
    if (!survey.arrived) {
      if (fleet.position.key !== ring[survey.startIndex]!.key)
        return ring[survey.startIndex]!;
      survey.arrived = true;
    }
    const next = ring[(survey.startIndex + survey.completed + 1) % 6]!;
    if (fleet.position.key === next.key) survey.completed++;
    if (survey.completed >= 6) {
      delete fleet.starSurvey;
      return this.#starSurveyDestination(fleet);
    }
    return ring[(survey.startIndex + survey.completed + 1) % 6]!;
  }
  #updatePatrol(fleet: Fleet): void {
    if (!fleet.patrol) return;
    if (!fleet.ships.Fighter || !fleet.position) {
      delete fleet.patrol;
      fleet.destination = null;
      delete fleet.courseOrigin;
      this.#event(
        `${this.#fleetDisplayName(fleet)}: Patrol stopped; no Fighter available.`,
        fleet.position ?? undefined,
      );
      return;
    }
    const destination = FleetPatrol.destination(
      fleet.patrol,
      fleet.position,
      this.#speed(fleet),
      this.pirateSnapshots(),
      (point) =>
        this.galaxy.contains(point) &&
        !this.galaxy.isStar(point) &&
        (!this.#knownTerrain.has(point.key) || this.galaxy.isPassable(point)),
    );
    fleet.destination = destination;
    if (destination) fleet.courseOrigin = fleet.position;
    else delete fleet.courseOrigin;
  }
  #visibleDiscoveries(): Discovery[] {
    const discoveries: Discovery[] = [];
    for (const wreck of this.#salvage.wrecks)
      if (
        this.#visible.has(wreck.position.key) &&
        !wreck.yardId &&
        !wreck.towedBy
      )
        discoveries.push({
          id: wreck.id,
          kind: 'wreck',
          name: `${wreck.ship.type} wreck`,
          position: wreck.position,
          fleetId: null,
        });
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
      const observer = this.#fleets
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
        `${discovery.kind === 'wreck' ? 'Wreck discovered' : discovery.kind === 'pirate' ? 'Pirate ship in sight' : discovery.kind === 'star' ? 'Star explored' : 'Planet discovered'}: ${discovery.name} at HEX ${position.key}.`,
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
  #fleetDetectionRange(fleet: Fleet): number {
    return Math.max(
      0,
      ...(fleet.shipUnits ?? [])
        .filter((unit) => unit.type === 'Exploration ship')
        .map((unit) => unit.telescope ?? 1),
    );
  }
  #updateSight(): void {
    const sources = [
      ...this.#ownedPlanets().map((planet) => ({
        position: planet.position,
        range: Detection.planetRange(this.#state(planet).buildings),
      })),
      ...this.#fleets
        .filter((fleet) => fleet.position && this.#shipCount(fleet.ships))
        .map((fleet) => ({
          position: fleet.position!,
          range: this.#fleetDetectionRange(fleet),
        })),
    ];
    const nebula = (point: HexCoordinate) =>
      this.galaxy.terrainAt(point) === 'nebula';
    this.#visible = Detection.coverage(sources, nebula);
    for (const key of Detection.coverage(sources, nebula, true)) {
      const point = new HexCoordinate(
        ...(key.split(',').map(Number) as [number, number]),
      );
      if (this.galaxy.contains(point)) this.#knownTerrain.add(key);
    }
    for (const key of this.#visible)
      if (
        this.galaxy.cellAt(
          new HexCoordinate(
            ...(key.split(',').map(Number) as [number, number]),
          ),
        )
      )
        this.#explored.add(key);
    for (const wreck of this.#salvage.wrecks)
      if (this.#visible.has(wreck.position.key)) wreck.known = true;
    this.#mapCells = null;
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
    if (fleet.civilian)
      fleet.civilian.reserved = Math.min(
        fleet.civilian.reserved,
        fleet.ships['Civilian shuttle'] * SHUTTLE_CAPACITY,
      );
    if (fleet.civilian && !fleet.ships['Civilian shuttle']) {
      delete fleet.civilian;
      fleet.destination = null;
      delete fleet.courseOrigin;
    }
    if (
      fleet.automation &&
      !fleet.ships[
        fleet.automation === 'salvage' ? 'Salvage ship' : 'Transport ship'
      ]
    ) {
      delete fleet.automation;
      delete fleet.civilian;
      this.#salvage.stop(fleet.id);
      fleet.destination = null;
      delete fleet.courseOrigin;
    }
    if (fleet.colonizationTargetId && !fleet.ships['Colony ship']) {
      delete fleet.colonizationTargetId;
      fleet.destination = null;
      delete fleet.courseOrigin;
      this.#event(
        `${fleet.name}: colonization cancelled; no Colony ship remains.`,
        fleet.position ?? undefined,
      );
    }
    if (fleet.patrol && !fleet.ships.Fighter) this.#updatePatrol(fleet);
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
  // uppgradera-obsoleta-fabriker: existing staff also operate the replacement factory.
  #projectDefinition(state: ColonyState, project: Project): BuildDefinition {
    const definition = projectDefinition(project.type);
    const original = state.buildings.find(
      (building) => building.id === project.upgradeBuildingId,
    );
    return original
      ? {
          ...definition,
          workers: Math.max(
            0,
            definition.workers - BUILDINGS[original.type].workers,
          ),
        }
      : definition;
  }
  // automatisk-motormontering: one projection drives consumption, blocking and supply.
  #projectCost(planet: Planet, project: Project): Stock {
    const cost = {
      ...projectCost(project.type),
      ...(project.type === 'Exploration ship' &&
      TELESCOPES.some((part) => project.parts?.[part])
        ? { 'Telescope I': 0 }
        : {}),
      ...project.parts,
    };
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
      for (let index = 0; index < units.length; index++) {
        const unit = units[index]!;
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
    const towed = this.#salvage.towing(fleet.id).length;
    if (!towed) return normal;
    const towingSpeeds = fleet.shipUnits
      ?.filter((unit) => unit.type === 'Salvage ship')
      .map((unit) => 1 + Number(unit.engines['Ion pulse engine'] > 0))
      .sort((a, b) => b - a)
      .slice(0, towed) ?? [1];
    return Math.min(normal, ...towingSpeeds);
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
    if (fleet.patrol) return;
    if (fleet.joinFleetId) return;
    if (!fleet.destination || fleet.destination.key !== fleet.position?.key)
      return;
    const place =
      this.mapSnapshot().find(
        (cell) => cell.position.key === fleet.position!.key,
      )?.object?.name ?? `HEX ${fleet.position.key}`;
    fleet.destination = null;
    delete fleet.courseOrigin;
    if (fleet.colonizationTargetId) return;
    if (fleet.civilian?.passengers) return;
    // ruttflottor-utan-ankomstbesked: reaching an endpoint does not finish a route order.
    if (fleet.routeId) return;
    this.#event(
      `${this.#fleetDisplayName(fleet)} arrived at ${place}.`,
      fleet.position,
    );
  }
  /** grupperade-planethandelser: settle one immutable report per planet and year. */
  #planetEvent(text: string, planet: Planet): void {
    const index = this.#events.findIndex(
      (event) => event.round === this.#round && event.planetId === planet.id,
    );
    if (index < 0) {
      this.#event(
        `${planet.name}:\n${text}`,
        planet.position,
        undefined,
        planet.id,
      );
      return;
    }
    const previous = this.#events[index]!;
    this.#events[index] = Object.freeze({
      ...previous,
      text: `${previous.text}\n${text}`,
    });
  }
  #event(
    text: string,
    position?: HexCoordinate,
    combatLog?: readonly string[],
    planetId?: string,
  ): string {
    const id = this.#id('event');
    this.#events.push(
      Object.freeze({
        id,
        round: this.#round,
        text,
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
        !(type in BUILDINGS) ||
        !BUILDINGS[type as BuildType].environment ||
        discovered.has(BUILDINGS[type as BuildType].environment!),
    );
  }
  #requirePlanning(): void {
    if (this.#phase !== 'planning')
      throw new Error('Orders are only available while planning.');
  }
}
