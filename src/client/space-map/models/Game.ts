import type { TransportAction } from './Decisions.js';
import { ShipOrders, type ShipOrder } from './ShipOrders.js';
import {
  PlanetQueues,
  type PlanetQueueKind,
  type PlanetQueuesSnapshot,
} from './PlanetQueues.js';
import {
  ShipUpgrades,
  type FleetUpgradeOrder,
  type ShipUpgradeTarget,
} from './ShipUpgrades.js';
import {
  CivilianTraffic,
  SHUTTLE_CAPACITY,
  type CivilianOrder,
  type CivilianPlanet,
} from './CivilianTraffic.js';
import { engineCount, armedShipCount } from './ShipEquipment.js';
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
  type BattlePiece,
} from '../../space-battle/models/index.js';
import {
  BoardingEngagement,
  type BoardingBattleState,
  type BoardingCommand,
  type BoardingShot,
} from '../../boarding/models/index.js';
import {
  Salvage,
  type WreckSnapshot,
  type ShipyardSnapshot,
  type Shipyard,
  type BattleReport,
} from './Salvage.js';
import { prioritizeProduction } from './ProductionPriorities.js';
import {
  nearestLeastMannedRoute,
  nearestUnguardedRoute,
  routeEscortTargets,
  tradeAssignmentIssue,
} from './star-map/TradeAssignment.js';
import type { ProductionOption, ProductionGuidance } from './ProductionMap.js';
import {
  ProductionPresence,
  type ProductionPresenceSource,
} from './ProductionPresence.js';
import { Galaxy, Star, StarSystem, type MapCell } from './Galaxy.js';
import { HexCoordinate, HexGeometry } from '../../common/HexCoordinate.js';
import { HexNavigation } from './HexNavigation.js';
import type { TerrainHex } from './Galaxy.js';
import { shipTransferIssue } from './fleets/FleetTransfer.js';
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
  type Material,
  emptyStock,
  type Stock,
  type EconomySnapshot,
} from './Economy.js';
import {
  ResearchPlan,
  RETIRED_ORDER_TECHNOLOGIES,
  TECHNOLOGIES,
  type Technology,
} from './research/Research.js';
import {
  Logistics,
  type LogisticsPort,
  type TransportFleet,
  type TradeRoute,
  type TradeRouteSnapshot,
} from './Logistics.js';
import {
  PopulationLevelling,
  type SettlerTransit,
} from './production-network/PopulationLevelling.js';
import {
  NetworkEconomy,
  type NetworkConsumer,
  type NetworkEconomyState,
  type NetworkLink,
  type NetworkPort,
} from './production-network/NetworkEconomy.js';
import type {
  EventIllustration,
  EventLine,
  ProductionContext,
} from './turn/EventDetails.js';
import {
  DecisionBoard,
  isMessageSetting,
  type Decision,
  type DecisionDescriptor,
} from './Decisions.js';
import { FleetPursuit, type PursuingFleet } from './FleetPursuit.js';
export { TECHNOLOGIES, type Technology } from './research/Research.js';

export type GamePhase = 'planning' | 'simulating' | 'interrupted';

/** produktionsnatverk: read-only view of the production network. */
export interface NetworkConsumerSnapshot {
  readonly id: string;
  readonly planetId: string;
  readonly kind: 'product' | 'building' | 'part';
  readonly needs: Readonly<Partial<Record<Material, number>>>;
  readonly delivered: Readonly<Partial<Record<Material, number>>>;
  /** Rounds until goods already on their way arrive. */
  readonly arrivalRounds: number;
  /** Needed goods that are neither delivered nor on their way. */
  readonly waiting: readonly Material[];
  readonly ready: boolean;
  /** Round the consumer first received goods, or null. */
  readonly startedRound: number | null;
  /** byggtid-per-byggnad: construction rounds once the goods are in place. */
  readonly buildRounds: number;
  /** Round construction began with every good delivered, or null. */
  readonly constructionRound: number | null;
}
export interface NetworkSnapshot {
  readonly groups: readonly (readonly string[])[];
  readonly activeLinkIds: readonly string[];
  readonly consumers: readonly NetworkConsumerSnapshot[];
  /** Materials each planet needs that its group neither holds nor makes. */
  readonly missing: Readonly<Record<string, readonly Material[]>>;
}
export type Resource = 'Iron' | 'Water' | 'Oil';
export type ShipType =
  | 'Colony ship'
  | 'Exploration ship'
  | 'Fighter'
  | 'Space pirate'
  | 'Transport ship'
  | 'Salvage ship'
  | 'Civilian shuttle'
  | 'Raptor';
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
  | 'Raptor factory'
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
        'Builds a planetary facility, shuttles and an orbital station. Repairs one wreck per round.',
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
        'Raises habitability by 5 percentage points per round when staffed, up to 100%.',
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
        'Raises habitability by 5 percentage points per round when staffed, up to 100%.',
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
        'Raises habitability by 5 percentage points per round when staffed, up to 100%.',
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
        'Raises habitability by 5 percentage points per round when staffed, up to 100%.',
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
        'Contributes one research point per round to the selected technology.',
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
    'Raptor factory': {
      permanent: true,
      description: 'Shipyard: builds Raptors that can dock and board.',
      workers: 800,
      cost: { Iron: 8, Water: 5, Oil: 2 },
      crew: 0,
      ship: 'Raptor',
    },
  });
/**
 * byggtid-per-byggnad: rounds of construction once the goods are in place.
 * Simple buildings take two rounds, advanced ones three.
 */
export const BUILD_ROUNDS: Readonly<Record<BuildType, number>> = Object.freeze({
  'Orbital shipyard': 3,
  'Salvage ship factory': 2,
  'Telescope I factory': 2,
  'Telescope II factory': 3,
  'Telescope III factory': 3,
  'Ice dome': 2,
  'Ice terraforming factory': 3,
  'Desert dome': 2,
  'Desert terraforming factory': 3,
  'Ocean dome': 2,
  'Ocean terraforming factory': 3,
  'Toxic dome': 2,
  'Toxic terraforming factory': 3,
  'Iron mine': 2,
  'Rocket engine factory': 2,
  'Ion pulse engine factory': 3,
  'Weapons module factory': 2,
  'Water extractor': 2,
  'Oil extractor': 2,
  'Transport ship factory': 2,
  'Research station': 3,
  'Colony ship factory': 3,
  'Exploration ship factory': 2,
  'Fighter factory': 2,
  'Raptor factory': 3,
});
export function buildRounds(type: string): number {
  return BUILD_ROUNDS[type as BuildType] ?? 1;
}
export const SHIPS: Readonly<
  Record<ShipType, { readonly crew: number; readonly speed: number }>
> = Object.freeze({
  'Salvage ship': { crew: 100, speed: 5 },
  'Colony ship': { crew: 1000, speed: 2 },
  'Exploration ship': { crew: 200, speed: 4 },
  Fighter: { crew: 50, speed: 3 },
  'Space pirate': { crew: 50, speed: 1 },
  'Transport ship': { crew: 50, speed: 2 },
  'Civilian shuttle': { crew: 50, speed: 2 },
  Raptor: { crew: 50, speed: 2 },
});

export interface ShipUnit {
  readonly telescope?: TelescopeLevel;
  readonly id: string;
  readonly type: ShipType;
  /** Fighter missile salvos. Absent means the legacy pair of two. */
  readonly missiles?: number;
  readonly armored?: boolean;
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
      ...(type === 'Fighter' || type === 'Space pirate' || type === 'Raptor'
        ? { 'Weapons module': 1 }
        : {}),
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
  readonly initialOrder?: ShipOrder;
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
  readonly pendingOrder?: ShipOrder;
  readonly upgradeable?: boolean;
  readonly upgrade?: Readonly<FleetUpgradeOrder>;

  readonly ordersPaused?: boolean;
  readonly civilian?: Readonly<
    Omit<CivilianOrder, 'path'> & { readonly path: readonly string[] }
  >;
  readonly automation?: 'salvage' | 'transport' | 'guard';
  readonly homeRouteId?: string;
  readonly colonizationTargetId?: string;
  readonly explorationTargetId?: string;
  readonly planetQueue?: PlanetQueueKind;
  readonly detour?: Readonly<FleetDetour>;
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
  readonly heading?: string;
  readonly illustration?: EventIllustration;
  readonly lines?: readonly EventLine[];
  readonly planetId?: string;
  readonly combatLog?: readonly string[];
  readonly id: string;
  readonly round: number;
  readonly text: string;
  readonly position?: { readonly q: number; readonly r: number };
}
export interface PlanetQueueEntrySnapshot {
  readonly planetId: string;
  readonly name: string;
  readonly position: HexCoordinate;
  readonly assignedFleetId: string | null;
  readonly assignedFleetName: string | null;
  readonly colonyShipBuildReason?: string | null;
  readonly colonyShipBuildingAt?: string | null;
}
export interface PlanetQueueSnapshot {
  readonly exploration: readonly PlanetQueueEntrySnapshot[];
  readonly colonization: readonly PlanetQueueEntrySnapshot[];
}
export interface AttackQueueEntrySnapshot {
  readonly pirateId: string;
  readonly name: string;
  readonly position: HexCoordinate;
  readonly assignedFleetId: string | null;
  readonly assignedFleetName: string | null;
}

interface FleetDetour {
  readonly kind: 'explore-planet' | 'attack-pirate';
  readonly targetId: string;
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
interface FleetUpgradePlan {
  readonly yard: Shipyard;
  readonly projectId: string;
}
interface Project {
  initialOrder?: ShipOrder;
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
  pendingOrder?: ShipOrder;
  upgrade?: FleetUpgradeOrder;
  ordersPaused?: boolean;
  civilian?: CivilianOrder;
  automation?: 'salvage' | 'transport' | 'guard';
  homeRouteId?: string;
  colonizationTargetId?: string;
  explorationTargetId?: string;
  planetQueue?: PlanetQueueKind;
  detour?: FleetDetour;
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
interface SavedPlanet extends Omit<PlanetSnapshot, 'position' | 'colony'> {
  readonly position: SavedCoordinate;
  readonly colony: {
    readonly ownerId: string;
    readonly population: number;
  } | null;
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

export interface GameState {
  readonly productionFleetSequences?: Readonly<Record<string, number>>;
  readonly planetQueues?: PlanetQueuesSnapshot;
  readonly attackQueue?: readonly string[];
  readonly salvageQueue?: readonly string[];
  readonly surveyedPlanets?: readonly string[];
  readonly tradeRoutes: readonly TradeRoute[];
  /** Older saves only: replaced by the production network. */
  readonly shipments?: readonly unknown[];
  readonly componentOrders?: readonly unknown[];
  readonly network?: NetworkEconomyState;
  readonly networkStarted?: Readonly<Record<string, number>>;
  readonly construction?: Readonly<Record<string, number>>;
  readonly settlers?: readonly SettlerTransit[];
  readonly skippedDecisions: readonly string[];
  readonly mutedDecisions?: readonly DecisionDescriptor[];
  readonly version:
    2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;
  readonly knownTerrain?: readonly string[];
  readonly salvage?: ReturnType<Salvage['snapshot']>;
  readonly recoveredResearch?: readonly (
    Technology | (typeof RETIRED_ORDER_TECHNOLOGIES)[number]
  )[];
  readonly visiblePirates?: readonly string[];
  readonly chartedPirates?: readonly string[];
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
  readonly researched: readonly (
    Technology | (typeof RETIRED_ORDER_TECHNOLOGIES)[number]
  )[];
  readonly researchTarget: Technology | null;
  readonly researchQueue: readonly (
    Technology | (typeof RETIRED_ORDER_TECHNOLOGIES)[number]
  )[];
  readonly colonies: readonly (readonly [string, ColonyState])[];
  readonly fleets: readonly SavedFleet[];
  readonly explored: readonly string[];
  readonly events: readonly GameEvent[];
}

/** Private mutable game state; views receive only immutable snapshots. */
export class Game {
  #planetQueues = new PlanetQueues();
  #attackQueue: string[] = [];
  #salvageQueue: string[] = [];
  #surveyedPlanets = new Set<string>();
  readonly #civilianTraffic = new CivilianTraffic();
  #logistics = new Logistics();
  // produktionsnatverk: shared stock and goods moving between planets.
  #network = new NetworkEconomy();
  #networkStarted: Record<string, number> = {};
  // byggtid-per-byggnad: round each building's construction began.
  #construction: Record<string, number> = {};
  // befolkningsutjamning-i-grupp: settlers on their way inside a group.
  #settlers = new PopulationLevelling();
  #salvage: Salvage;
  #decisions = new DecisionBoard();
  #research = new ResearchPlan();
  #round = 1;
  #phase: GamePhase = 'planning';
  #sequence = 1;
  #productionFleetSequences: Record<string, number> = {};
  #colonies = new Map<string, ColonyState>();
  #fleets: Fleet[];
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

  constructor(readonly galaxy: Galaxy) {
    this.#navigation = new HexNavigation(galaxy);
    this.#salvage = Salvage.seed(galaxy);
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
    for (const fleet of this.#fleets)
      if (fleet.shipUnits)
        fleet.shipUnits = fleet.shipUnits.map((unit) =>
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
    for (const planet of this.#ownedPlanets())
      this.#surveyedPlanets.add(planet.id);
  }

  // spara-avbrutet-ar: only planning and discovery checkpoints are serializable.
  exportState(): GameState {
    if (this.#phase === 'simulating')
      throw new Error('Wait for the turn to finish before saving.');
    return structuredClone({
      version: 17,
      network: this.#network.snapshot(),
      networkStarted: { ...this.#networkStarted },
      construction: { ...this.#construction },
      settlers: [...this.#settlers.transits],
      productionFleetSequences: { ...this.#productionFleetSequences },
      planetQueues: this.#planetQueues.snapshot(),
      attackQueue: [...this.#attackQueue],
      salvageQueue: [...this.#salvageQueue],
      surveyedPlanets: [...this.#surveyedPlanets],
      knownTerrain: [...this.#knownTerrain],
      salvage: this.#salvage.snapshot(),
      recoveredResearch: [...this.#research.recovered],
      visiblePirates: [...this.#visiblePirates],
      chartedPirates: [...this.#chartedPirates],
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
      ![2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].includes(
        state.version,
      ) ||
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
    const copy = structuredClone(state) as Omit<
      GameState,
      'researched' | 'researchQueue' | 'recoveredResearch'
    > & {
      researched: string[];
      researchQueue: string[];
      recoveredResearch: Technology[];
    };
    if (
      state.version >= 15 &&
      (!copy.productionFleetSequences ||
        Object.entries(copy.productionFleetSequences).some(
          ([key, next]) => !key || !Number.isSafeInteger(next) || next < 1,
        ))
    )
      throw new Error('Invalid saved production fleet sequences.');
    game.#productionFleetSequences = {
      ...(copy.productionFleetSequences ?? {}),
    };
    if (state.version >= 7 && !Array.isArray(state.pirates))
      throw new Error('Missing saved pirate fleets.');
    game.#pirates =
      state.version >= 7
        ? copy.pirates!.map((pirate) =>
            PirateFleet.restore(pirate, galaxy, state.version < 14),
          )
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
    const retired = new Set<string>(RETIRED_ORDER_TECHNOLOGIES);
    const isTechnology = (technology: string): technology is Technology =>
      TECHNOLOGIES.includes(technology as Technology);
    const researched = copy.researched.filter(isTechnology);
    const researchQueue = copy.researchQueue.filter(isTechnology);
    const recoveredResearch = (copy.recoveredResearch ?? []).filter(
      (technology) => !retired.has(technology),
    );
    if (
      state.version >= 10 &&
      (!Array.isArray(state.recoveredResearch) ||
        recoveredResearch.some(
          (technology) => !TECHNOLOGIES.includes(technology),
        ))
    )
      throw new Error('Invalid recovered technology.');
    game.#research = new ResearchPlan(
      new Set(researched),
      [...researchQueue],
      new Set(recoveredResearch),
    );
    if (state.version < 6) {
      if (
        researched.some(
          (technology) =>
            technology.endsWith('ship factory') ||
            technology === 'Fighter factory',
        )
      )
        game.#research.completed.add('Rocket engine factory');
      const queue = [...researchQueue];
      game.#research.queue = [];
      for (const technology of queue)
        if (!game.#research.completed.has(technology))
          game.#research.add(technology);
    }
    // produktionsnatverk: older saves lose goods in transit and part orders.
    game.#logistics = new Logistics([...copy.tradeRoutes]);
    game.#network = new NetworkEconomy(
      state.version >= 17 && copy.network
        ? copy.network
        : { transits: [], deliveries: [] },
    );
    game.#networkStarted =
      state.version >= 17 ? { ...(copy.networkStarted ?? {}) } : {};
    game.#construction = { ...(copy.construction ?? {}) };
    game.#decisions = new DecisionBoard(
      new Set(copy.skippedDecisions),
      copy.mutedDecisions ?? [],
    );
    game.#colonies = new Map(copy.colonies);
    if (copy.settlers !== undefined)
      PopulationLevelling.validate(copy.settlers, (id) =>
        game.#colonies.has(id),
      );
    game.#settlers = new PopulationLevelling(copy.settlers ?? []);
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
      for (const project of colony.projects)
        if (project.initialOrder) {
          if (
            (project.initialOrder as { kind?: string }).kind ===
            'auto-transport'
          )
            delete project.initialOrder;
          else {
            ShipOrders.validate(project.initialOrder);
            if (!projectDefinition(project.type).ship)
              throw new Error('Invalid saved ship order.');
          }
        }
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
      ({ position: current, destination, courseOrigin, ships, ...rest }) => {
        const fleet = { ...rest, ships: { ...zeroShips(), ...ships } };
        if (
          (fleet.pendingOrder as { kind?: string } | undefined)?.kind ===
          'auto-transport'
        ) {
          delete fleet.pendingOrder;
          fleet.automation ??= 'transport';
        }
        const empty = game.#shipCount(fleet.ships) === 0;
        let landed = false;
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
            (fleet.automation && fleet.automation !== 'transport') ||
            fleet.patrol ||
            fleet.exploration ||
            fleet.joinFleetId ||
            fleet.colonizationTargetId
          )
            throw new Error('Invalid saved civilian fleet.');
          // befolkningsutjamning-i-grupp: passengers of the old shuttle trips
          // land at their destination, or back home, and the shuttle stops.
          const { passengers, reserved, targetId, sourceId } = fleet.civilian;
          if (passengers || reserved) {
            const colony =
              game.#colonies.get(targetId!) ?? game.#colonies.get(sourceId!);
            if (colony) colony.population += passengers;
            fleet.civilian = CivilianTraffic.order();
            landed = true;
          }
        }
        if (
          fleet.automation !== undefined &&
          (!['salvage', 'transport', 'guard'].includes(fleet.automation) ||
            empty ||
            (fleet.automation === 'salvage'
              ? !fleet.ships['Salvage ship']
              : fleet.automation === 'guard'
                ? !armedShipCount(fleet.ships)
                : !fleet.ships['Transport ship'] &&
                  !fleet.ships['Civilian shuttle']) ||
            (fleet.routeId &&
              !(fleet.automation === 'transport' && fleet.releaseRequested)) ||
            fleet.patrol ||
            fleet.exploration ||
            fleet.joinFleetId ||
            fleet.colonizationTargetId)
        )
          throw new Error('Invalid saved automatic fleet order.');
        if (
          fleet.homeRouteId !== undefined &&
          (typeof fleet.homeRouteId !== 'string' || !fleet.homeRouteId)
        )
          throw new Error('Invalid saved civilian home route.');
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
        if (
          fleet.explorationTargetId !== undefined &&
          (typeof fleet.explorationTargetId !== 'string' ||
            !galaxy.systems.some((system) =>
              system.planets.some(
                (planet) => planet.id === fleet.explorationTargetId,
              ),
            ) ||
            !fleet.ships['Exploration ship'] ||
            fleet.routeId ||
            fleet.patrol ||
            fleet.exploration ||
            fleet.joinFleetId)
        )
          throw new Error('Invalid saved planet exploration order.');
        if (
          fleet.planetQueue !== undefined &&
          (fleet.planetQueue === 'exploration'
            ? !fleet.explorationTargetId || !!fleet.colonizationTargetId
            : fleet.planetQueue === 'colonization'
              ? !fleet.colonizationTargetId || !!fleet.explorationTargetId
              : true)
        )
          throw new Error('Invalid saved planet queue assignment.');
        if (fleet.patrol !== undefined) {
          FleetPatrol.validate(fleet.patrol, (point) => !!galaxy.cellAt(point));
          if (
            empty ||
            !armedShipCount(fleet.ships) ||
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
          destination:
            !empty && !landed && destination ? position(destination) : null,
          ...(!empty && !landed && courseOrigin
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
    game.#planetQueues = new PlanetQueues(copy.planetQueues);
    if (
      copy.attackQueue !== undefined &&
      (!Array.isArray(copy.attackQueue) ||
        copy.attackQueue.some((id: unknown) => typeof id !== 'string' || !id) ||
        new Set(copy.attackQueue).size !== copy.attackQueue.length)
    )
      throw new Error('Invalid saved attack queue.');
    game.#attackQueue = [...((copy.attackQueue ?? []) as string[])];
    if (
      copy.salvageQueue !== undefined &&
      (!Array.isArray(copy.salvageQueue) ||
        copy.salvageQueue.some(
          (id: unknown) => typeof id !== 'string' || !id,
        ) ||
        new Set(copy.salvageQueue).size !== copy.salvageQueue.length)
    )
      throw new Error('Invalid saved salvage queue.');
    game.#salvageQueue = [...((copy.salvageQueue ?? []) as string[])];
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
    for (const planet of game.#ownedPlanets())
      game.#surveyedPlanets.add(planet.id);
    for (const kind of ['exploration', 'colonization'] as const)
      for (const id of game.#planetQueues.snapshot()[kind])
        if (!planetIds.has(id)) throw new Error('Invalid saved planet queue.');
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
      if (
        fleet.detour &&
        (!(['explore-planet', 'attack-pirate'] as const).includes(
          fleet.detour.kind,
        ) ||
          typeof fleet.detour.targetId !== 'string' ||
          !fleet.detour.targetId)
      )
        throw new Error('Invalid saved fleet detour.');
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
                      ...(line.production
                        ? { production: Object.freeze({ ...line.production }) }
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
    for (const fleet of game.#fleets)
      if (fleet.pendingOrder) ShipOrders.validate(fleet.pendingOrder);
    for (const fleet of game.#fleets)
      if (fleet.upgrade) {
        ShipUpgrades.validate(
          fleet.upgrade,
          fleet.shipUnits!,
          game.#research.completed,
        );
        if (
          fleet.routeId ||
          fleet.civilian ||
          fleet.automation ||
          fleet.patrol ||
          fleet.exploration ||
          fleet.joinFleetId ||
          fleet.colonizationTargetId ||
          !fleet.position ||
          !game.#colonies.has(fleet.upgrade.planetId)
        )
          throw new Error('Invalid saved fleet upgrade.');
      }
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
      // avbryt-gammal-bordning-vid-laddning
      const boarding = game.#simulation.boarding;
      if (boarding?.outdated) game.#resolveBoarding(boarding);
    } else if (state.version >= 8 && copy.simulation)
      throw new Error('Unexpected interrupted round.');
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
    game.#linkInterruptionEvents();
    for (const fleet of game.#fleets) {
      if (!fleet.planetQueue) continue;
      const target =
        fleet.planetQueue === 'exploration'
          ? fleet.explorationTargetId
          : fleet.colonizationTargetId;
      if (
        !target ||
        !game.#planetQueues.snapshot()[fleet.planetQueue].includes(target)
      )
        throw new Error('Invalid saved planet queue assignment.');
    }
    if (['planning', 'interrupted'].includes(game.#phase))
      game.#assignTaskQueues();
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
  get planetQueues(): PlanetQueueSnapshot {
    const saved = this.#planetQueues.snapshot();
    const entries = (kind: PlanetQueueKind) =>
      Object.freeze(
        saved[kind].flatMap((planetId) => {
          const planet = this.#planetById(planetId);
          if (!planet) return [];
          const fleet = this.#fleets.find((candidate) =>
            kind === 'exploration'
              ? candidate.explorationTargetId === planetId
              : candidate.colonizationTargetId === planetId,
          );
          return [
            Object.freeze({
              planetId,
              name: planet.name,
              position: planet.position,
              assignedFleetId: fleet?.id ?? null,
              assignedFleetName: fleet?.name ?? null,
              ...(kind === 'colonization'
                ? this.colonyShipRequest(planetId)
                : {}),
            }),
          ];
        }),
      );
    return Object.freeze({
      exploration: entries('exploration'),
      colonization: entries('colonization'),
    });
  }

  get salvageQueue() {
    return Object.freeze(
      this.#salvageQueue.flatMap((wreckId) => {
        const wreck = this.#salvage.wrecks.find(
          (item) => item.id === wreckId && item.known && !item.yardId,
        );
        if (!wreck) return [];
        const fleet = this.#fleets.find(
          (item) => item.id === (wreck.towedBy ?? wreck.reservedBy),
        );
        return [
          Object.freeze({
            wreckId,
            name: `${wreck.ship.type} wreck`,
            position: wreck.position,
            assignedFleetId: fleet?.id ?? null,
            assignedFleetName: fleet?.name ?? null,
          }),
        ];
      }),
    );
  }

  addWreckToSalvageQueue(wreckId: string): void {
    this.#requirePlanetQueueEditing();
    const wreck = this.#salvage.wrecks.find(
      (item) =>
        item.id === wreckId &&
        item.known &&
        !item.yardId &&
        !item.reservedBy &&
        !item.towedBy,
    );
    if (this.#salvageQueue.includes(wreckId)) return;
    if (!wreck) throw new Error('Choose an available discovered wreck.');
    this.#salvageQueue.push(wreckId);
    this.#updateSalvage();
  }

  removeWreckFromSalvageQueue(wreckId: string): void {
    this.#requirePlanetQueueEditing();
    if (!this.#salvageQueue.includes(wreckId)) return;
    this.#salvageQueue = this.#salvageQueue.filter((id) => id !== wreckId);
    const wreck = this.#salvage.wrecks.find((item) => item.id === wreckId);
    if (wreck?.reservedBy && !wreck.towedBy) {
      const order = this.#salvage.order(wreck.reservedBy);
      if (order) order.targets = order.targets.filter((id) => id !== wreckId);
      wreck.reservedBy = null;
    }
    this.#updateSalvage();
  }

  moveWreckInSalvageQueue(wreckId: string, index: number): void {
    this.#requirePlanetQueueEditing();
    const from = this.#salvageQueue.indexOf(wreckId);
    if (
      from < 0 ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.#salvageQueue.length
    )
      throw new Error('Choose a valid salvage queue position.');
    this.#salvageQueue.splice(from, 1);
    this.#salvageQueue.splice(index, 0, wreckId);
    this.#updateSalvage();
  }

  get attackQueue(): readonly AttackQueueEntrySnapshot[] {
    return Object.freeze(
      this.#attackQueue.flatMap((pirateId) => {
        const pirate = this.#pirates.find(
          (candidate) => candidate.id === pirateId,
        );
        if (!pirate) return [];
        const fleet = this.#fleets.find(
          (candidate) =>
            candidate.detour?.kind === 'attack-pirate' &&
            candidate.detour.targetId === pirateId,
        );
        return [
          Object.freeze({
            pirateId,
            name: 'Space pirate',
            position: pirate.position,
            assignedFleetId: fleet?.id ?? null,
            assignedFleetName: fleet?.name ?? null,
          }),
        ];
      }),
    );
  }

  addPirateToAttackQueue(pirateId: string): void {
    this.#requirePlanetQueueEditing();
    if (
      !this.#pirates.some(
        (pirate) =>
          pirate.id === pirateId && this.#visible.has(pirate.position.key),
      )
    )
      throw new Error('Choose a visible pirate.');
    if (!this.#attackQueue.includes(pirateId)) this.#attackQueue.push(pirateId);
    this.#assignTaskQueues();
  }

  removePirateFromAttackQueue(pirateId: string): void {
    this.#requirePlanetQueueEditing();
    this.#attackQueue = this.#attackQueue.filter((id) => id !== pirateId);
    for (const fleet of this.#fleets)
      if (
        fleet.detour?.kind === 'attack-pirate' &&
        fleet.detour.targetId === pirateId
      )
        this.#resumeDetour(fleet);
    this.#assignTaskQueues();
  }

  movePirateAttackQueue(pirateId: string, index: number): void {
    this.#requirePlanetQueueEditing();
    const from = this.#attackQueue.indexOf(pirateId);
    if (
      from < 0 ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.#attackQueue.length
    )
      throw new Error('Choose a valid attack queue position.');
    this.#attackQueue.splice(from, 1);
    this.#attackQueue.splice(index, 0, pirateId);
    this.#assignTaskQueues();
  }

  addPlanetToQueue(kind: PlanetQueueKind, planetId: string): void {
    this.#requirePlanetQueueEditing();
    const planet = this.#planetById(planetId);
    if (!planet || !this.#knownObjects.has(planetId))
      throw new Error('Choose a discovered planet.');
    if (kind === 'exploration') {
      if (this.#surveyedPlanets.has(planetId))
        throw new Error('Choose a planet that has not been explored.');
    } else if (
      !this.#surveyedPlanets.has(planetId) ||
      planet.colony ||
      this.#colonies.has(planetId)
    )
      throw new Error('Choose an explored uninhabited planet.');
    this.#planetQueues.add(kind, planetId);
    this.#assignTaskQueues();
  }

  colonyShipRequest(planetId: string): Readonly<{
    colonyShipBuildReason: string | null;
    colonyShipBuildingAt: string | null;
  }> {
    const planet = this.#planetById(planetId);
    if (
      !planet ||
      !this.#surveyedPlanets.has(planetId) ||
      planet.colony ||
      this.#colonies.has(planetId)
    )
      return Object.freeze({
        colonyShipBuildReason: 'Choose an explored uninhabited planet.',
        colonyShipBuildingAt: null,
      });
    const assigned = this.#fleets.some(
      (fleet) => fleet.colonizationTargetId === planetId,
    );
    if (assigned)
      return Object.freeze({
        colonyShipBuildReason: 'A Colony ship is already assigned.',
        colonyShipBuildingAt: null,
      });
    const available = this.#fleets.some((fleet) => {
      if (!this.#isIdleFleet(fleet) || !fleet.ships['Colony ship'])
        return false;
      const path = this.#navigation.path(
        fleet.position!,
        planet.position,
        this.#speed(fleet),
        this.#knownTerrain,
      );
      return fleet.position!.key === planet.position.key || path.length > 0;
    });
    if (available)
      return Object.freeze({
        colonyShipBuildReason: 'An available Colony ship can take this target.',
        colonyShipBuildingAt: null,
      });
    const existing = [...this.#colonies].flatMap(([id, state]) =>
      state.projects
        .filter(
          (project) =>
            project.type === 'Colony ship' &&
            project.initialOrder?.kind === 'colonize' &&
            project.initialOrder.planetId === planetId,
        )
        .map(() => this.#planetById(id)!),
    )[0];
    if (existing)
      return Object.freeze({
        colonyShipBuildReason: 'A Colony ship is already being built.',
        colonyShipBuildingAt: existing.name,
      });
    const factory = this.#nearestColonyShipFactory(planet);
    return Object.freeze({
      colonyShipBuildReason: factory
        ? null
        : 'No reachable completed Colony ship factory.',
      colonyShipBuildingAt: factory?.planet.name ?? null,
    });
  }

  requestColonyShip(planetId: string): ProductionReceipt {
    this.#requirePlanetQueueEditing();
    const status = this.colonyShipRequest(planetId);
    if (status.colonyShipBuildReason)
      throw new Error(status.colonyShipBuildReason);
    const target = this.#planetById(planetId)!;
    const factory = this.#nearestColonyShipFactory(target)!;
    const receipt = this.#scheduleShip(
      factory.planet,
      'Colony ship',
      null,
      factory.factoryId,
      { kind: 'colonize', planetId },
    );
    if (!this.#planetQueues.snapshot().colonization.includes(planetId)) {
      this.#planetQueues.add('colonization', planetId);
      this.#assignTaskQueues();
    }
    return receipt;
  }

  #nearestColonyShipFactory(target: Planet): {
    planet: Planet;
    factoryId: string;
  } | null {
    return (
      this.#ownedPlanets()
        .flatMap((planet) =>
          this.#state(planet)
            .buildings.filter(
              (building) =>
                building.type === 'Colony ship factory' && !building.demolition,
            )
            .map((building) => {
              const path = this.#navigation.path(
                planet.position,
                target.position,
                SHIPS['Colony ship'].speed,
                this.#knownTerrain,
              );
              return {
                planet,
                factoryId: building.id,
                distance:
                  planet.position.key === target.position.key
                    ? 0
                    : path.length || Number.POSITIVE_INFINITY,
              };
            }),
        )
        .filter((item) => Number.isFinite(item.distance))
        .sort(
          (a, b) =>
            a.distance - b.distance ||
            a.planet.id.localeCompare(b.planet.id) ||
            a.factoryId.localeCompare(b.factoryId),
        )[0] ?? null
    );
  }

  movePlanetQueue(
    kind: PlanetQueueKind,
    planetId: string,
    index: number,
  ): void {
    this.#requirePlanetQueueEditing();
    this.#planetQueues.move(kind, planetId, index);
    this.#assignTaskQueues();
  }

  removePlanetFromQueue(kind: PlanetQueueKind, planetId: string): void {
    this.#requirePlanetQueueEditing();
    this.#planetQueues.remove(kind, planetId);
    for (const fleet of this.#fleets)
      if (
        fleet.planetQueue === kind &&
        (kind === 'exploration'
          ? fleet.explorationTargetId === planetId
          : fleet.colonizationTargetId === planetId)
      )
        this.#clearPlanetQueueOrder(fleet);
    this.#assignTaskQueues();
  }
  mapSnapshot(): readonly MapCell[] {
    this.#mapCells ??= this.galaxy.mapSnapshot(
      this.#explored,
      new Set(this.#colonies.keys()),
      this.#visible,
      this.#knownTerrain,
      new Map(
        this.galaxy.systems
          .flatMap((system) => system.planets)
          .map((planet) => [planet.id, this.#environment(planet).type]),
      ),
      this.#surveyedPlanets,
    );
    return this.#mapCells;
  }
  planetAt(position: HexCoordinate): Planet | undefined {
    return this.#ownedPlanets().find(
      (planet) => planet.position.key === position.key,
    );
  }
  // planetinformation-pa-kartan: unknown planets never cross the read-model boundary.
  planetIntel(position: HexCoordinate):
    | Readonly<{
        id: string;
        name: string;
        surveyed: false;
        environment?: PlanetEnvironmentType | 'Gas';
        habitability?: number;
        buildSlots?: number;
        maxBuildSlots?: number;
        resources?: PlanetSnapshot['resources'];
      }>
    | Readonly<{
        id: string;
        name: string;
        surveyed: true;
        environment: PlanetEnvironmentType | 'Gas';
        habitability: number;
        buildSlots: number;
        maxBuildSlots: number;
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
    const environment = this.#environment(planet);
    return Object.freeze({
      id: planet.id,
      name: planet.name,
      surveyed: true,
      environment: environment.type,
      habitability:
        this.#colonies.get(planet.id)?.habitability ?? planet.habitability,
      buildSlots: environment.buildSlots,
      maxBuildSlots: planet.buildSlots,
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
        ...(project.initialOrder
          ? {
              initialOrder: Object.freeze(
                structuredClone(project.initialOrder),
              ),
            }
          : {}),
        ...(project.parts
          ? { parts: Object.freeze({ ...project.parts }) }
          : {}),
        blockedReason: this.#networkBlock(planet, state, project, blocks),
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
      environment: environment.type,
      breathable: environment.breathable,
      populationCapacity: environment.populationCapacity,
      potentialBuildSlots: planet.buildSlots,
      habitability: environment.habitability,
      buildSlots: environment.buildSlots,
      budget: Object.freeze(budget),
      economy: this.#economySnapshot(planet, state),
      buildings,
      projects,
      // delar-tillverkas-pa-behov: parts cannot be ordered by hand.
      availableComponents: Object.freeze([]),
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
                      environment.type)),
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
    if (
      !planet ||
      !this.#explored.has(planet.position.key) ||
      !this.#knownObjects.has(planet.id) ||
      !this.#surveyedPlanets.has(planet.id) ||
      planet.colony ||
      this.#colonies.has(planet.id)
    )
      return 'Choose an explored uninhabited planet.';
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
      !this.#explored.has(planet.position.key) ||
      !this.#knownObjects.has(planet.id) ||
      !this.#surveyedPlanets.has(planet.id) ||
      planet.colony ||
      this.#colonies.has(planet.id)
    )
      throw new Error('Choose an explored uninhabited planet.');
    this.setDestination(fleetId, position);
    fleet.colonizationTargetId = planet.id;
    if (
      this.#phase === 'planning' &&
      fleet.position?.key === position.key &&
      !this.#hostileAt(position)
    )
      this.#foundColony(fleet, planet);
  }
  setPlanetExploration(fleetId: string, position: HexCoordinate): void {
    this.#requireFleetOrders(fleetId);
    const fleet = this.#fleetState(fleetId);
    if (!fleet.ships['Exploration ship'])
      throw new Error('An Exploration ship is required.');
    const planet = this.galaxy.systems
      .flatMap((system) => system.planets)
      .find((candidate) => candidate.position.key === position.key);
    if (
      !planet ||
      !this.#knownObjects.has(planet.id) ||
      this.#surveyedPlanets.has(planet.id)
    )
      throw new Error('Choose a discovered unexplored planet.');
    this.setDestination(fleetId, position);
    fleet.explorationTargetId = planet.id;
  }
  #foundColony(fleet: Fleet, planet: Planet): readonly Discovery[] {
    this.#surveyedPlanets.add(planet.id);
    this.#planetQueues.remove('colonization', planet.id);
    delete fleet.colonizationTargetId;
    delete fleet.explorationTargetId;
    delete fleet.planetQueue;
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
        delete fleet.planetQueue;
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

  // planetutforskning-vid-ankomst: details are learned only after an
  // Exploration ship survives arrival and any combat at the planet.
  #completePlanetExplorations(): readonly Discovery[] {
    const discoveries: Discovery[] = [];
    for (const fleet of this.#fleets) {
      if (!fleet.position || !fleet.ships['Exploration ship']) continue;
      const planet = this.galaxy.systems
        .flatMap((system) => system.planets)
        .find((candidate) => candidate.position.key === fleet.position!.key);
      if (
        !planet ||
        !this.#knownObjects.has(planet.id) ||
        this.#surveyedPlanets.has(planet.id) ||
        this.#hostileAt(planet.position)
      )
        continue;
      this.#surveyedPlanets.add(planet.id);
      this.#planetQueues.remove('exploration', planet.id);
      if (fleet.explorationTargetId === planet.id) {
        delete fleet.explorationTargetId;
        delete fleet.planetQueue;
        if (fleet.destination?.key === planet.position.key) {
          fleet.destination = null;
          delete fleet.courseOrigin;
        }
        if (fleet.detour?.kind === 'explore-planet') this.#resumeDetour(fleet);
      }
      const eventId = this.#event(
        `Planet explored: ${planet.name} at HEX ${planet.position.key}.`,
        planet.position,
      );
      discoveries.push({
        eventId,
        id: planet.id,
        kind: 'planet-explored',
        name: planet.name,
        position: planet.position,
        fleetId: fleet.id,
      });
    }
    this.#mapCells = null;
    return Object.freeze(discoveries);
  }
  pirateSnapshots(): readonly PirateSnapshot[] {
    return Object.freeze(
      this.#pirates
        .filter(
          (pirate) =>
            this.#visible.has(pirate.position.key) ||
            this.#chartedPirates.has(pirate.id),
        )
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
          ...(fleet.pendingOrder
            ? {
                pendingOrder: Object.freeze(
                  structuredClone(fleet.pendingOrder),
                ),
              }
            : {}),
          upgradeable:
            ShipUpgrades.targets(fleet.shipUnits!, this.#research.completed)
              .length > 0,
          ...(fleet.upgrade
            ? {
                upgrade: Object.freeze({
                  ...fleet.upgrade,
                  targets: Object.freeze(
                    fleet.upgrade.targets.map((target) =>
                      Object.freeze({ ...target }),
                    ),
                  ),
                  productionIds: Object.freeze([
                    ...fleet.upgrade.productionIds,
                  ]),
                }),
              }
            : {}),
          ...(fleet.colonizationTargetId
            ? { colonizationTargetId: fleet.colonizationTargetId }
            : {}),
          ...(fleet.explorationTargetId
            ? { explorationTargetId: fleet.explorationTargetId }
            : {}),
          ...(fleet.planetQueue ? { planetQueue: fleet.planetQueue } : {}),
          ...(fleet.detour
            ? { detour: Object.freeze({ ...fleet.detour }) }
            : {}),
          ...(fleet.automation ? { automation: fleet.automation } : {}),
          ...(fleet.homeRouteId ? { homeRouteId: fleet.homeRouteId } : {}),
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
  #validateShipOrder(
    order: ShipOrder,
    ships: Readonly<Partial<Record<ShipType, number>>>,
  ): void {
    ShipOrders.validate(order);
    const option = ShipOrders.options(ships, [
      ...this.#research.completed,
    ]).find((option) => option.kind === order.kind);
    if (!option) throw new Error('This ship cannot receive that order.');
    if (option.blockedReason) throw new Error(option.blockedReason);
    if (order.kind === 'join-fleet') {
      const target = this.#fleets.find((fleet) => fleet.id === order.fleetId);
      if (
        !target?.position ||
        target.routeId ||
        target.upgrade ||
        target.civilian?.passengers
      )
        throw new Error(
          'Choose a positioned fleet without a trade route, Upgrade or passengers.',
        );
    } else if (order.kind === 'join-route') {
      const route = this.#logistics.routes.find(
        (route) => route.id === order.routeId && !route.closing,
      );
      if (!route) throw new Error('Choose an open trade route.');
      if (
        !ships['Transport ship'] &&
        !routeEscortTargets(route.id, this.fleetSnapshots()).length
      )
        throw new Error(
          'Assign a transport to this route before adding Fighters.',
        );
    } else if (order.kind === 'patrol') {
      const center = new HexCoordinate(order.position.q, order.position.r);
      if (!this.galaxy.cellAt(center) || !this.galaxy.isPassable(center))
        throw new Error('Choose a passable Patrol center.');
    } else if (order.kind === 'salvage') {
      if (
        !this.#salvage.wrecks.some(
          (wreck) =>
            wreck.id === order.wreckId &&
            wreck.known &&
            !wreck.reservedBy &&
            !wreck.towedBy &&
            !wreck.yardId,
        )
      )
        throw new Error('Choose an available wreck.');
    } else if (order.kind === 'colonize') {
      if (
        !this.#ownedPlanets().length ||
        !this.galaxy.systems.some((system) =>
          system.planets.some(
            (planet) =>
              planet.id === order.planetId &&
              this.#surveyedPlanets.has(planet.id) &&
              !planet.colony &&
              !this.#colonies.has(planet.id),
          ),
        )
      )
        throw new Error('Choose an explored uninhabited planet.');
    } else if (order.kind === 'explore-planet') {
      const planet = this.#planetById(order.planetId);
      if (
        !planet ||
        !this.#knownObjects.has(planet.id) ||
        this.#surveyedPlanets.has(planet.id)
      )
        throw new Error('Choose a discovered unexplored planet.');
    }
  }

  issueFleetOrder(id: string, order: ShipOrder): void {
    this.#requireFleetOrders(id);
    const fleet = this.#fleetState(id);
    this.#validateShipOrder(order, fleet.ships);
    if (order.kind === 'join-fleet') {
      if (order.fleetId === id) throw new Error('Choose another fleet.');
      if (this.#salvage.towing(id).length)
        throw new Error('Deliver or release towed wrecks first.');
      const target = this.#fleetState(order.fleetId);
      // Validate the chain before replacing the current order.
      for (
        let cursor: Fleet | undefined = target;
        cursor;
        cursor = cursor.joinFleetId
          ? this.#fleets.find((fleet) => fleet.id === cursor.joinFleetId)
          : undefined
      )
        if (cursor.id === id)
          throw new Error('Reinforcement orders cannot form a cycle.');
      this.clearDestination(id);
      fleet.joinFleetId = target.id;
      fleet.destination = target.position;
      fleet.courseOrigin = fleet.position!;
      this.#refreshReinforcements();
      this.#mergeReinforcements();
    } else if (order.kind === 'join-route') {
      if (this.#salvage.towing(id).length)
        throw new Error('Deliver or release towed wrecks first.');
      this.clearDestination(id);
      this.assignTradeFleet(order.routeId, id);
    } else if (order.kind === 'patrol')
      this.setPatrol(id, new HexCoordinate(order.position.q, order.position.r));
    else if (order.kind === 'salvage') this.orderSalvage(id, order.wreckId);
    else if (order.kind === 'colonize') {
      const planet = this.galaxy.systems
        .flatMap((system) => system.planets)
        .find((planet) => planet.id === order.planetId)!;
      this.setColonization(id, planet.position);
    } else if (order.kind === 'explore-planet') {
      const planet = this.#planetById(order.planetId)!;
      this.setPlanetExploration(id, planet.position);
    } else if (order.kind === 'auto-salvage') this.setAutomaticSalvage(id);
    else if (order.kind === 'civilian-transport') this.setCivilianTransport(id);
    else if (order.kind === 'guard-routes') this.setGuardRoutes(id);
    else this.setExploration(id, order.kind);
  }

  #activateShipOrders(): void {
    for (const fleet of [...this.#fleets]) {
      const order = fleet.pendingOrder;
      if (!order) continue;
      delete fleet.pendingOrder;
      try {
        this.issueFleetOrder(fleet.id, order);
      } catch (error) {
        fleet.navigationIssue = `Start order could not begin: ${error instanceof Error ? error.message : 'Choose another order.'}`;
        this.#event(
          `${fleet.name}: ${fleet.navigationIssue}`,
          fleet.position ?? undefined,
          undefined,
          undefined,
          this.#round - 1,
        );
      }
    }
  }

  upgradeFleet(fleetId: string): void {
    this.#requirePlanning();
    this.#requireFleetOrders(fleetId);
    const fleet = this.#fleetState(fleetId);
    if (fleet.upgrade) throw new Error('An Upgrade order is already active.');
    if (this.#salvage.towing(fleetId).length)
      throw new Error('Deliver or release towed wrecks first.');
    const targets = ShipUpgrades.targets(
      fleet.shipUnits!,
      this.#research.completed,
    );
    if (!targets.length)
      throw new Error('No researched equipment upgrade is available.');
    const selected = this.#planFleetUpgrade(fleet, targets);
    if (!selected)
      throw new Error(
        'No reachable working shipyard can obtain the upgrade components.',
      );
    this.clearDestination(fleetId);
    this.#commitFleetUpgrade(fleet, targets, selected);
  }

  #planFleetUpgrade(fleet: Fleet, targets: readonly ShipUpgradeTarget[]) {
    if (!fleet.position) return null;
    const candidates = this.#salvage.yards
      .filter((yard) => {
        const state = this.#colonies.get(yard.planetId);
        return (
          !yard.destroyed &&
          state?.buildings.some(
            (building) =>
              building.id === yard.facilityId && !building.demolition,
          )
        );
      })
      .flatMap((yard) => {
        const path = this.#navigation.path(
          fleet.position!,
          yard.position,
          this.#speed(fleet),
          this.#knownTerrain,
        );
        return fleet.position!.key === yard.position.key || path.length
          ? [{ yard, distance: path.length }]
          : [];
      })
      .sort(
        (a, b) => a.distance - b.distance || a.yard.id.localeCompare(b.yard.id),
      );
    // automatisk-uppgraderingsforsorjning: the first reachable yard whose
    // group holds or makes every part (delat-lager-i-natverket).
    const cost = ShipUpgrades.cost(targets);
    const reserved = new Map<Component, number>();
    for (const other of this.#fleets)
      if (other.upgrade && other !== fleet)
        for (const [part, amount] of Object.entries(
          ShipUpgrades.cost(other.upgrade.targets),
        ))
          if (COMPONENTS.includes(part as Component))
            reserved.set(
              part as Component,
              (reserved.get(part as Component) ?? 0) + amount,
            );
    for (const { yard } of candidates) {
      const group = this.#networkGroup(yard.planetId);
      if (
        COMPONENTS.every(
          (part) =>
            cost[part] <= 0 ||
            this.#groupHasPart(
              part,
              group,
              cost[part] + (reserved.get(part) ?? 0),
            ),
        )
      )
        return { yard, projectId: this.#id('upgrade') };
    }
    return null;
  }

  #commitFleetUpgrade(
    fleet: Fleet,
    targets: readonly ShipUpgradeTarget[],
    selected: FleetUpgradePlan,
  ) {
    // delar-tillverkas-pa-behov: the network makes and brings the parts.
    fleet.upgrade = {
      id: selected.projectId,
      yardId: selected.yard.id,
      planetId: selected.yard.planetId,
      targets,
      productionIds: [],
      issue: null,
    };
    fleet.destination =
      fleet.position!.key === selected.yard.position.key
        ? null
        : selected.yard.position;
    if (fleet.destination) fleet.courseOrigin = fleet.position!;
  }

  #cancelFleetUpgrade(fleet: Fleet): void {
    const order = fleet.upgrade;
    if (!order) return;
    delete fleet.upgrade;
    this.#network.cancel(order.id, this.#networkPort());
    for (const state of this.#colonies.values())
      state.projects = state.projects.filter(
        (project) => !order.productionIds.includes(project.id),
      );
  }

  #updateFleetUpgrades(): void {
    for (const fleet of this.#fleets) {
      const order = fleet.upgrade;
      if (!order) continue;
      const targets = order.targets.filter((target) =>
        fleet.shipUnits!.some((ship) => ship.id === target.shipId),
      );
      if (!fleet.position || !targets.length) {
        this.#cancelFleetUpgrade(fleet);
        fleet.destination = null;
        continue;
      }
      const yard = this.#salvage.yards.find(
        (yard) => yard.id === order.yardId && !yard.destroyed,
      );
      const facility = this.#colonies
        .get(order.planetId)
        ?.buildings.find(
          (building) =>
            building.id === yard?.facilityId && !building.demolition,
        );
      if (
        !yard ||
        !facility ||
        targets.length !== order.targets.length ||
        order.issue === 'No working shipyard can obtain upgrade components.'
      ) {
        this.#cancelFleetUpgrade(fleet);
        const selected = this.#planFleetUpgrade(fleet, targets);
        if (selected) this.#commitFleetUpgrade(fleet, targets, selected);
        else {
          fleet.upgrade = {
            ...order,
            targets,
            productionIds: [],
            issue: 'No working shipyard can obtain upgrade components.',
          };
          fleet.destination = null;
          delete fleet.courseOrigin;
        }
      }
    }
  }

  #completeFleetUpgrades(): void {
    this.#updateFleetUpgrades();
    for (const fleet of this.#fleets) {
      const order = fleet.upgrade;
      if (!order) continue;
      const yard = this.#salvage.yards.find(
        (yard) =>
          yard.id === order.yardId &&
          !yard.destroyed &&
          yard.builtRound < this.#round,
      );
      if (
        !yard ||
        fleet.position?.key !== yard.position.key ||
        this.#hostileAt(yard.position)
      )
        continue;
      const planet = this.#ownedPlanets().find(
        (planet) => planet.id === yard.planetId,
      )!;
      const state = this.#state(planet);
      const cost = ShipUpgrades.cost(order.targets);
      const held = emptyStock();
      const workers = state.buildings
        .filter((building) => !building.demolition)
        .reduce(
          (total, building) => total + BUILDINGS[building.type].workers,
          0,
        );
      order.issue =
        workers > state.population
          ? 'Waiting for shipyard workers.'
          : MATERIALS.some(
                (material) =>
                  state.stock[material] - held[material] < cost[material],
              )
            ? 'Waiting for upgrade components.'
            : null;
      if (order.issue) continue;
      for (const material of MATERIALS) state.stock[material] -= cost[material];
      fleet.shipUnits = fleet.shipUnits!.map((ship) => {
        const target = order.targets.find(
          (target) => target.shipId === ship.id,
        );
        return target ? ShipUpgrades.install(ship, target, state.stock) : ship;
      });
      const count = order.targets.length;
      this.#cancelFleetUpgrade(fleet);
      fleet.destination = null;
      delete fleet.courseOrigin;
      this.#planetEvent(
        `${fleet.name} upgraded ${count} ship${count === 1 ? '' : 's'} at ${planet.name}.`,
        planet,
      );
    }
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
    fleet.automation = 'transport';
    this.#updateAutomaticTransport();
  }

  /**
   * befolkningsutjamning-i-grupp: workers for finished buildings plus the
   * workers and crew of every queued project, since they build in parallel.
   */
  #settlerPlanets(): CivilianPlanet[] {
    return this.#ownedPlanets().map((planet) => {
      const state = this.#state(planet);
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
          state.projects.reduce((n, project) => {
            const definition = this.#projectDefinition(state, project);
            return n + definition.workers + definition.crew;
          }, 0),
      };
    });
  }

  /**
   * befolkningsutjamning-i-grupp: settlers land, then each group's Civilian
   * shuttles send the next ones. A shuttle belongs to the group of the
   * planet it waits at, or of its home route.
   */
  #levelPopulation(): void {
    const owned = new Map(
      this.#settlerPlanets().map((planet) => [planet.id, planet]),
    );
    const landed = new Map<string, Map<string, number>>();
    for (const transit of this.#settlers.arrivals(this.#round)) {
      const planet = owned.get(transit.to) ?? owned.get(transit.from);
      if (!planet) continue;
      planet.population += transit.amount;
      const sources = landed.get(planet.id) ?? new Map<string, number>();
      sources.set(
        transit.from,
        (sources.get(transit.from) ?? 0) + transit.amount,
      );
      landed.set(planet.id, sources);
    }
    for (const [id, sources] of landed) {
      const planet = this.#ownedPlanets().find((item) => item.id === id)!;
      for (const [from, amount] of sources)
        this.#planetEvent(
          `${amount} settlers arrived at ${planet.name} from ${
            owned.get(from)?.name ?? 'a lost colony'
          }.`,
          planet,
        );
    }
    const links = this.#networkLinks();
    const routes = new Map(
      this.#logistics.routes.map((route) => [route.id, route]),
    );
    for (const group of NetworkEconomy.groups([...owned.keys()], links)) {
      if (group.length < 2) continue;
      const positions = new Set(group.map((id) => owned.get(id)!.position.key));
      const shuttles = this.#fleets
        .filter((fleet) => {
          if (!fleet.civilian || fleet.destination || !fleet.position)
            return false;
          const home = fleet.homeRouteId
            ? routes.get(fleet.homeRouteId)
            : undefined;
          return (
            positions.has(fleet.position.key) ||
            (!!home && (group.includes(home.a) || group.includes(home.b)))
          );
        })
        .reduce((sum, fleet) => sum + fleet.ships['Civilian shuttle'], 0);
      if (!shuttles) continue;
      const distances = new Map(
        group.map((id) => [id, NetworkEconomy.rounds(id, links)] as const),
      );
      this.#settlers.dispatch(
        group.map((id) => owned.get(id)!),
        shuttles,
        (from, to) => distances.get(from)?.get(to) ?? 1,
        this.#round,
      );
    }
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
    const fleet = this.#fleetState(fleetId);
    if (!fleet.ships['Transport ship'] && !fleet.ships['Civilian shuttle'])
      throw new Error('A Transport ship or Civilian shuttle is required.');
    if (this.#salvage.towing(fleetId).length)
      throw new Error('Deliver towed wrecks first.');
    this.clearDestination(fleetId);
    if (fleet.ships['Civilian shuttle'] && !fleet.civilian)
      fleet.civilian = CivilianTraffic.order();
    fleet.automation = 'transport';
    this.#updateAutomaticTransport();
  }
  setGuardRoutes(fleetId: string): void {
    this.#requirePlanning();
    this.#requireFleetOrders(fleetId);
    const fleet = this.#fleetState(fleetId);
    if (!armedShipCount(fleet.ships))
      throw new Error('An armed ship is required.');
    if (this.#salvage.towing(fleetId).length)
      throw new Error('Deliver towed wrecks first.');
    this.clearDestination(fleetId);
    fleet.automation = 'guard';
    this.#updateGuardRoutes();
  }
  // automatisk-farledsbemanning: assign one waiting fleet at a time so manning stays current.
  #updateAutomaticTransport(): void {
    for (const fleet of this.#fleets) {
      if (fleet.automation !== 'transport' || !fleet.position) continue;
      if (this.#salvage.towing(fleet.id).length) continue;
      if (fleet.civilian?.passengers) continue;
      if (fleet.routeId) continue;
      if (fleet.ships['Transport ship'] && fleet.destination && !fleet.patrol)
        continue;
      const route = nearestLeastMannedRoute(
        fleet.position,
        this.tradeRoutes,
        this.fleetSnapshots(),
      );
      if (!route) continue;
      if (fleet.ships['Transport ship'])
        this.assignTradeFleet(route.id, fleet.id);
      else if (fleet.ships['Civilian shuttle'])
        this.#assignHomeRoute(fleet, route);
    }
  }
  // guard-routes: fighters wait until a transport route needs escort.
  #updateGuardRoutes(): void {
    for (const fleet of this.#fleets) {
      if (
        fleet.automation !== 'guard' ||
        !fleet.position ||
        !armedShipCount(fleet.ships)
      )
        continue;
      if (this.#salvage.towing(fleet.id).length) continue;
      const route = nearestUnguardedRoute(
        fleet.position,
        this.tradeRoutes,
        this.fleetSnapshots(),
      );
      if (route) this.assignTradeFleet(route.id, fleet.id);
    }
  }
  #assignHomeRoute(fleet: Fleet, route: TradeRouteSnapshot): void {
    fleet.homeRouteId = route.id;
    delete fleet.automation;
    const a = this.#ownedPlanets().find((planet) => planet.id === route.a);
    const b = this.#ownedPlanets().find((planet) => planet.id === route.b);
    if (!a || !b || !fleet.position) return;
    const endpoint =
      fleet.position.distanceTo(a.position) <=
      fleet.position.distanceTo(b.position)
        ? a
        : b;
    if (fleet.position.key !== endpoint.position.key) {
      fleet.courseOrigin = fleet.position;
      fleet.destination = endpoint.position;
    }
  }
  orderSalvage(fleetId: string, wreckId: string): void {
    this.#requireFleetOrders(fleetId);
    const fleet = this.#fleetState(fleetId);
    this.#salvage.assign(fleet, wreckId);
    this.#cancelFleetUpgrade(fleet);
    delete fleet.pendingOrder;
    delete fleet.automation;
    delete fleet.civilian;
    delete fleet.colonizationTargetId;
    delete fleet.explorationTargetId;
    delete fleet.planetQueue;
    delete fleet.detour;
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
    this.#cancelFleetUpgrade(fleet);
    delete fleet.pendingOrder;
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
  #assignSalvageQueue(): void {
    this.#salvageQueue = this.#salvageQueue.filter((id) =>
      this.#salvage.wrecks.some(
        (wreck) => wreck.id === id && wreck.known && !wreck.yardId,
      ),
    );
    for (const id of this.#salvageQueue) {
      const wreck = this.#salvage.wrecks.find((item) => item.id === id)!;
      if (wreck.reservedBy || wreck.towedBy) continue;
      const fleet = this.#fleets
        .filter(
          (item) =>
            item.ships['Salvage ship'] > 0 &&
            (this.#isIdleFleet(item) ||
              (item.automation === 'salvage' &&
                !!item.position &&
                !item.destination &&
                !this.#salvage.order(item.id) &&
                !this.#salvage.towing(item.id).length)),
        )
        .flatMap((item) => {
          const path = this.#navigation.path(
            item.position!,
            wreck.position,
            this.#speed(item),
            this.#knownTerrain,
          );
          return item.position!.key === wreck.position.key || path.length
            ? [{ fleet: item, distance: path.length }]
            : [];
        })
        .sort(
          (a, b) =>
            a.distance - b.distance || a.fleet.id.localeCompare(b.fleet.id),
        )[0]?.fleet;
      if (fleet) this.#salvage.assign(fleet, id);
    }
  }

  #updateSalvage(): void {
    this.#updateFleetUpgrades();
    for (let pass = 0; pass < 2; pass++) {
      this.#assignSalvageQueue();
      this.#updateAutomaticSalvage();
      this.#salvage.update(
        this.#fleets,
        (position) => this.#hostileAt(position),
        (wreck, yard) => {
          this.#salvageQueue = this.#salvageQueue.filter(
            (id) => id !== wreck.id,
          );
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
      (pirate) => pirate.hasShips && pirate.position.key === position.key,
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
      const held = emptyStock();
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
  // varvets-automatiska-materialforsorjning: only the next wreck in each active yard requests supplies.
  #repairProjects(planetId: string): { id: string; cost: Stock }[] {
    return this.#salvage.yards
      .filter((yard) => yard.planetId === planetId && !yard.destroyed)
      .flatMap((yard) => {
        const wreck = this.#salvage.wrecks.find(
          (item) => item.id === yard.queue[0],
        );
        return wreck
          ? [
              {
                id: `repair-${wreck.id}`,
                cost: {
                  ...emptyStock(),
                  ...Salvage.repairCost(
                    wreck.ship,
                    (type) => projectDefinition(type).cost,
                  ),
                },
              },
            ]
          : [];
      });
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
      (planet.type !== 'solid' || definition.environment !== environment.type)
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
    this.#network.cancel(projectId, this.#networkPort());
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
    // skeppsorder-pa-planeten: buildings and parts are handled in Factories.
    void buildings;
    const types: ProjectType[] = [
      ...new Set(
        snapshot.buildings.flatMap<ProjectType>((b) => {
          const definition = BUILDINGS[b.type];
          return definition.ship ? factoryShips(b.type) : [];
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
      // basta-tillgangliga-del: show the parts the group would use.
      const displayedParts = definition.ship
        ? this.#shipParts(planet, {
            id: 'preview',
            type,
            slotIndex: null,
            factoryId: null,
            destinationFleetId: null,
          })
        : (definition.parts ?? {});
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
    // produktionsnatverk: planets in the same group count as supplied.
    const group = this.#networkGroup(planet.id);
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
      (source) => source !== local && group.includes(source.id),
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
          this.#network.transits
            .filter((transit) => transit.material === component)
            .reduce((total, transit) => total + transit.amount, 0),
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

  scheduleShip(
    planet: Planet,
    type: ShipType,
    destinationFleetId: string | null = null,
    factoryId?: string,
    initialOrder?: ShipOrder,
  ): ProductionReceipt {
    this.#requirePlanning();
    return this.#scheduleShip(
      planet,
      type,
      destinationFleetId,
      factoryId,
      initialOrder,
    );
  }

  #scheduleShip(
    planet: Planet,
    type: ShipType,
    destinationFleetId: string | null = null,
    factoryId?: string,
    initialOrder?: ShipOrder,
  ): ProductionReceipt {
    if (!Object.hasOwn(SHIPS, type)) throw new Error('Unknown ship type.');
    if (type === 'Civilian shuttle') {
      this.#requireOrderResearch('Civilian transport');
      destinationFleetId = null;
    }
    if (initialOrder) {
      this.#validateShipOrder(initialOrder, { [type]: 1 });
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
      ...(initialOrder
        ? {
            initialOrder: structuredClone(initialOrder),
            destinationFleetId: null,
          }
        : {}),
    });
  }
  scheduleComponent(planet: Planet, component: Component): ProductionReceipt {
    this.#requirePlanning();
    // delar-tillverkas-pa-behov: factories make parts when something needs them.
    void planet;
    void component;
    throw new Error('Parts are made automatically when ships need them.');
  }

  #migrateTelescopeOrders(): void {
    // teleskop-i-exploration-ships: legacy orders wait for a Telescope I.
    for (const planet of this.#ownedPlanets())
      for (const project of this.#state(planet).projects)
        if (
          project.type === 'Exploration ship' &&
          !TELESCOPES.some((part) => project.parts?.[part])
        )
          project.parts = { ...project.parts, 'Telescope I': 1 };
  }
  #scheduleProject(
    planet: Planet,
    type: ProjectType,
    fields: Omit<Project, 'id' | 'type'>,
  ): ProductionReceipt {
    // delar-tillverkas-pa-behov: parts are made when the network needs them.
    const projectId = this.#id('project');
    const project: Project = { id: projectId, type, ...fields };
    this.#state(planet).projects.push(project);
    const definition = projectDefinition(type);
    if (definition.ship && !definition.permanent)
      project.parts = this.#shipParts(planet, project);
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
    delete project.initialOrder;
  }
  setProjectInitialOrder(
    planet: Planet,
    id: string,
    order: ShipOrder | null,
  ): void {
    this.#requirePlanning();
    const project = this.#state(planet).projects.find(
      (project) => project.id === id,
    );
    const ship = project && projectDefinition(project.type).ship;
    if (!project || !ship) throw new Error('Choose a queued ship.');
    if (order) {
      this.#validateShipOrder(order, { [ship]: 1 });
      project.initialOrder = structuredClone(order);
      project.destinationFleetId = null;
    } else delete project.initialOrder;
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
      ...(source.upgrade ? { upgrade: source.upgrade } : {}),
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
      if (target.upgrade)
        throw new Error('Cancel Upgrade before transferring ships.');
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
        this.#assignTaskQueues();
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
    this.#assignTaskQueues();
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
    this.#cancelFleetUpgrade(fleet);
    delete fleet.pendingOrder;
    delete fleet.automation;
    delete fleet.civilian;
    delete fleet.colonizationTargetId;
    delete fleet.explorationTargetId;
    delete fleet.planetQueue;
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
    this.#cancelFleetUpgrade(this.#fleetState(id));
    delete this.#fleetState(id).pendingOrder;
    delete this.#fleetState(id).automation;
    delete this.#fleetState(id).colonizationTargetId;
    delete this.#fleetState(id).explorationTargetId;
    delete this.#fleetState(id).planetQueue;
    delete this.#fleetState(id).detour;
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
        } else {
          const pirate = this.#pirates.find((f) => f.id === participant.id)!;
          const roster = pirate.combatRoster();
          const remaining = pieces.filter((p) => p.side === 'enemy');
          if (
            remaining.some(
              (piece) =>
                !roster.some(
                  (ship) => ship.id === piece.id && ship.type === piece.type,
                ),
            )
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
  resumeFleetOrders(id: string): void {
    const fleet = this.#fleetState(id);
    if (this.#phase !== 'planning' || !fleet.ordersPaused)
      throw new Error('Resume this fleet while planning.');
    delete fleet.ordersPaused;
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
  }
  #captureBattleShip(piece: BattlePiece, winner: 'player' | 'enemy'): void {
    const battle = this.#simulation!.tacticalBattles[0]!;
    if (piece.side === winner) {
      battle.unlockDock(piece.id);
      return;
    }
    if (winner === 'player') {
      const fleet =
        this.#fleets.find(
          (candidate) =>
            candidate.position?.key ===
            new HexCoordinate(
              battle.snapshot.position.q,
              battle.snapshot.position.r,
            ).key,
        ) ?? this.#fleets.find((candidate) => candidate.shipUnits?.length);
      if (!fleet) return;
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
      if (!fleet.position) fleet.position = this.#fleets[0]?.position ?? null;
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
    const playerFleet = this.#fleets.find(
      (fleet) => fleet.id === piece.fleetId,
    );
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
    if (!this.#research.completed.has('Raptor factory')) {
      this.#research.recovered.add('Raptor factory');
      this.#event(
        'Recovered technology: Raptor factory. Research is available without its usual prerequisites.',
      );
    }
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
      if (this.galaxy.cellAt(hex)) this.#explored.add(hex.key);
    }
    this.#chartedPirates.add(other.id);
    this.#mapCells = null;
    this.#updateSight();
    this.#event(
      `Captured charts reveal a pirate presence near HEX ${origin.q},${origin.r}.`,
    );
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
              missiles: unit.type === 'Fighter' ? (unit.missiles ?? 2) : 0,
              armored: unit.armored === true,
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
        for (const piece of lost.filter((p) => p.status === 'wreck'))
          wreckIds.push(
            this.#salvage.addWreck(
              this.#id('wreck'),
              {
                id: piece.id,
                type: piece.type,
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
      const attackDetour = fleet.detour?.kind === 'attack-pirate';
      const lostUnits = fleet.shipUnits!.filter((unit) => killed.has(unit.id));
      for (const unit of lostUnits) {
        fleet.ships[unit.type]--;
        if (pieces.find((piece) => piece.id === unit.id)?.status === 'wreck')
          wreckIds.push(
            this.#salvage.addWreck(this.#id('wreck'), unit, position).id,
          );
      }
      fleet.shipUnits = fleet.shipUnits!.filter((unit) => !killed.has(unit.id));
      this.#salvage.releaseLostCapacity(fleet, position);
      if (lostUnits.some((unit) => unit.type === 'Transport ship'))
        this.#captureRouteCargo(fleet);
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
        if (!attackDetour) {
          delete fleet.patrol;
          delete fleet.exploration;
          delete fleet.starSurvey;
        }
        this.#cancelFleetUpgrade(fleet);
        delete fleet.pendingOrder;
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
    for (const id of playerIds) {
      const fleet = this.#fleets.find((candidate) => candidate.id === id);
      if (fleet?.detour?.kind !== 'attack-pirate') continue;
      this.#attackQueue = this.#attackQueue.filter(
        (pirateId) => pirateId !== fleet.detour!.targetId,
      );
      this.#resumeDetour(fleet);
    }
    this.#updateFleetUpgrades();
    for (const id of wreckIds) this.#knownObjects.add(id);
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
    this.#updateSight();
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
    const exploredPlanets = this.#completePlanetExplorations();
    if (exploredPlanets.length)
      this.#simulation!.discoveries = Object.freeze([
        ...this.#simulation!.discoveries,
        ...exploredPlanets,
      ]);
    const colonized = this.#completeColonizations();
    if (colonized) {
      const discoveries = this.#newDiscoveries({ movements: [] });
      if (this.#pausingDiscoveries(discoveries).length)
        this.#simulation!.discoveries = Object.freeze([
          ...this.#simulation!.discoveries,
          ...discoveries,
        ]);
    }
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
    this.#assignTaskQueues();
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
    if (!['explore', 'explore-stars'].includes(order))
      throw new Error('Unknown exploration order.');
    const fleet = this.#fleetState(id);
    if (!fleet.ships['Exploration ship'])
      throw new Error('An Exploration ship is required.');
    this.#salvage.stop(id);
    delete fleet.patrol;
    delete fleet.joinFleetId;
    fleet.exploration = order;
    this.#cancelFleetUpgrade(fleet);
    delete fleet.pendingOrder;
    delete fleet.automation;
    delete fleet.civilian;
    delete fleet.colonizationTargetId;
    delete fleet.explorationTargetId;
    delete fleet.planetQueue;
    delete fleet.starSurvey;
    fleet.destination = null;
    delete fleet.courseOrigin;
    this.#updateExploration(fleet);
  }
  setPatrol(id: string, center?: HexCoordinate): void {
    this.#requireFleetOrders(id);
    const fleet = this.#fleetState(id);
    if (!armedShipCount(fleet.ships))
      throw new Error('An armed ship is required for Patrol.');
    if (
      center &&
      (!this.galaxy.cellAt(center) || !this.galaxy.isPassable(center))
    )
      throw new Error('Choose a passable Patrol center.');
    if (fleet.patrol && !center) return;
    this.#salvage.stop(id);
    delete fleet.exploration;
    delete fleet.joinFleetId;
    fleet.patrol = {
      center: center ?? fleet.position!,
      nextIndex: 0,
      ...(center && center.key !== fleet.position!.key
        ? { approaching: true }
        : {}),
    };
    this.#cancelFleetUpgrade(fleet);
    delete fleet.pendingOrder;
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
  allowOtherFleetOrders(): void {
    if (this.#phase !== 'interrupted' || !this.#simulation!.handling)
      throw new Error('Handle the discovery first.');
    this.#simulation!.otherFleets = true;
  }
  continueTurn(): void {
    if (this.#phase !== 'interrupted') throw new Error('No interrupted round.');
    if (this.#simulation!.tacticalBattles.length)
      throw new Error('Complete tactical combat before continuing the round.');
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
    this.#updateGuardRoutes();
    this.#updateSalvage();
    this.#assignTaskQueues();
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
    this.#assignTaskQueues();
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
      const discoveries = Object.freeze([
        ...this.#simulation!.discoveries,
        ...this.#newDiscoveries(frame),
      ]);
      if (this.#pausingDiscoveries(discoveries).length || battles.length) {
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
    this.#round += 1;
    this.#decisions.skipped.clear();
    this.#phase = 'planning';
    this.#simulation = null;
    this.#activateShipOrders();
    this.#updateAutomaticTransport();
    this.#updateGuardRoutes();
    this.#assignTaskQueues();
  }
  #settleYear(): void {
    for (const fleet of this.#fleets) this.#recordArrival(fleet);
    const exploredPlanets = this.#completePlanetExplorations();
    if (exploredPlanets.length)
      this.#simulation!.discoveries = Object.freeze([
        ...this.#simulation!.discoveries,
        ...exploredPlanets,
      ]);
    this.#completeColonizations();
    this.#unloadHolds();
    this.#levelPopulation();
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
      const previousEnvironment = this.#environment(planet, state);
      const improvement =
        planet.type === 'solid' && staffed
          ? state.buildings.reduce(
              (total, b) =>
                total +
                (BUILDINGS[b.type].environment === previousEnvironment.type
                  ? (BUILDINGS[b.type].terraforming ?? 0)
                  : 0),
              0,
            )
          : 0;
      const previousHabitability = previousEnvironment.habitability;
      state.habitability = Math.min(100, previousHabitability + improvement);
      if (
        state.habitability !== previousHabitability &&
        !this.#decisions.muted.some(
          (item) => item.id === 'message-habitability',
        )
      )
        this.#planetEvent(
          `Habitability on ${planet.name} increased to ${state.habitability}%.`,
          planet,
        );
      // fardig-terraformning-till-temperate: retire completed infrastructure before production.
      if (planet.type === 'solid' && state.habitability === 100) {
        const isTerraformer = (type: ProjectType) =>
          !!BUILDINGS[type as BuildType]?.terraforming;
        const obsolete =
          state.buildings.some((building) => isTerraformer(building.type)) ||
          state.projects.some((project) => isTerraformer(project.type));
        if (previousEnvironment.type !== 'Temperate' || obsolete) {
          state.buildings = state.buildings.filter(
            (building) => !isTerraformer(building.type),
          );
          state.projects = state.projects.filter(
            (project) => !isTerraformer(project.type),
          );
          this.#mapCells = null;
          this.#planetEvent(
            `Terraforming completed on ${planet.name}: now Temperate. Terraforming factories were removed.`,
            planet,
          );
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
      if (
        growth !== 0 &&
        !this.#decisions.muted.some((item) => item.id === 'message-population')
      )
        this.#planetEvent(
          `Population on ${planet.name} changed by +${growth}.`,
          planet,
        );
    }
    this.#runNetworkRound();
    const researched = this.#research.advance(researchStations);
    if (researched)
      this.#event(
        `Research completed: ${researched}.`,
        undefined,
        undefined,
        undefined,
        this.#round,
        { illustration: { kind: 'research', type: researched } },
      );
    this.#completeFleetUpgrades();
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
        { kind: 'building', type: project.type as BuildType },
      );
      return;
    }
    if (project.type === 'Shipyard station') {
      this.#createShipyard(
        planet,
        project.factoryId!,
        project.stationPosition!,
      );
      this.#planetEvent(`Orbital shipyard rebuilt at ${planet.name}.`, planet, {
        kind: 'building',
        type: 'Orbital shipyard',
      });
      return;
    }
    const d = projectDefinition(project.type);
    if (d.sitePreparation) {
      state.domes ??= [];
      state.domes.push(project.slotIndex!);
      this.#planetEvent(
        `${project.type} was completed at site ${project.slotIndex! + 1} on ${planet.name}.`,
        planet,
        { kind: 'building', type: project.type as BuildType },
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
        { kind: 'building', type: project.type as BuildType },
      );
    } else if (d.component) {
      state.stock[d.component] += 1;
      this.#planetEvent(
        `${d.component} was produced at ${planet.name}.`,
        planet,
        {
          kind: 'component',
          type: d.component,
        },
      );
    } else if (d.ship) {
      this.#createShip(
        planet,
        state,
        d.ship,
        project.destinationFleetId,
        project.parts,
        project.initialOrder,
      );
    }
  }
  #createShip(
    planet: Planet,
    state: ColonyState,
    ship: ShipType,
    destinationFleetId: string | null,
    parts: Partial<Record<Component, number>> = {},
    initialOrder?: ShipOrder,
  ): void {
    state.population -= SHIPS[ship].crew;
    if (
      !initialOrder &&
      (ship === 'Civilian shuttle' ||
        (ship === 'Transport ship' && !destinationFleetId))
    ) {
      const fleet: Fleet = {
        id: this.#id('fleet'),
        name: this.#productionFleetName(ship, planet),
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
        automation: 'transport',
        ...(ship === 'Civilian shuttle'
          ? { civilian: CivilianTraffic.order() }
          : {}),
      };
      this.#fleets.push(fleet);
      this.#planetEvent(
        ship === 'Civilian shuttle'
          ? `${ship} was produced at ${planet.name} and started Civilian transport.`
          : `${ship} was produced at ${planet.name}.`,
        planet,
        { kind: 'ship', type: ship },
      );
      return;
    }
    // nybyggda-skepp-utan-ruttflotta: recheck assignments made after the order was queued.
    // produktionsflotta-efter-kolonisering: an implicit home fleet must be local.
    let reserve = initialOrder
      ? undefined
      : (this.#fleets.find(
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
            fleet.position?.key === planet.position.key,
        ));
    if (!reserve) {
      reserve = {
        id: this.#id('fleet'),
        name: this.#productionFleetName(ship, planet),
        position: planet.position,
        destination: null,
        ships: zeroShips(),
      };
      this.#fleets.push(reserve);
      if (!initialOrder) state.homeFleetId = reserve.id;
    }
    if (initialOrder) reserve.pendingOrder = structuredClone(initialOrder);
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
      ...(ship === 'Fighter' ? { missiles: 0 } : {}),
    });
    this.#planetEvent(`${ship} was produced at ${planet.name}.`, planet, {
      kind: 'ship',
      type: ship,
    });
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
    this.#updateGuardRoutes();
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
      delete source.explorationTargetId;
      delete source.planetQueue;
      delete source.patrol;
      delete source.exploration;
      delete source.starSurvey;
    } else {
      // rutt-eskortfordelning: include reinforcements already on their way.
      const targets = routeEscortTargets(routeId, snapshots).map((fleet) => ({
        id: fleet.id,
        fighters:
          armedShipCount(fleet.ships) +
          snapshots
            .filter((group) => group.joinFleetId === fleet.id)
            .reduce((total, group) => total + armedShipCount(group.ships), 0),
        ships: { Fighter: 0, 'Space pirate': 0 },
      }));
      for (const type of ['Fighter', 'Space pirate'] as const) {
        for (let count = source.ships[type]; count > 0; count--) {
          targets.sort(
            (a, b) => a.fighters - b.fighters || a.id.localeCompare(b.id),
          );
          targets[0]!.fighters++;
          targets[0]!.ships[type]++;
        }
      }
      for (const target of targets) {
        for (const type of ['Fighter', 'Space pirate'] as const)
          if (target.ships[type])
            this.transferShips(fleetId, type, target.ships[type], target.id);
      }
      delete source.automation;
    }
  }
  releaseTradeFleet(fleetId: string): void {
    this.#requirePlanning();
    this.#logistics.release(this.#fleetState(fleetId));
  }
  closeTradeRoute(id: string): void {
    this.#requirePlanning();
    const displaced = this.#fleets.filter(
      (fleet) => fleet.routeId === id || fleet.homeRouteId === id,
    );
    this.#logistics.close(id, this.#logisticsPort());
    for (const fleet of displaced) {
      if (fleet.ships['Transport ship'] || fleet.ships['Civilian shuttle']) {
        if (fleet.ships['Civilian shuttle'] && !fleet.civilian)
          fleet.civilian = CivilianTraffic.order();
        fleet.automation = 'transport';
      }
    }
    this.#updateAutomaticTransport();
    this.#updateGuardRoutes();
  }
  skipDecision(id: string): void {
    this.#requirePlanning();
    if (this.decisions.some((item) => item.id === id))
      this.#decisions.skipped.add(id);
  }
  muteDecision(id: string): void {
    this.#requirePlanning();
    const decision = [...this.decisions, ...this.messageSettings].find(
      (item) => item.id === id,
    );
    if (decision) this.#decisions.mute(decision);
  }
  unmuteDecision(id: string): void {
    this.#requirePlanning();
    this.#decisions.unmute(id);
  }
  get messageSettings(): readonly Decision[] {
    return this.#decisions
      .snapshot([
        {
          id: 'message-population',
          label: 'Population messages',
          kind: 'planet',
        },
        {
          id: 'message-habitability',
          label: 'Habitability messages',
          kind: 'planet',
        },
      ])
      .filter((item) => isMessageSetting(item.id));
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
    for (const fleet of this.#fleets.filter(
      (fleet) =>
        fleet.upgrade?.issue && !fleet.upgrade.issue.startsWith('Waiting for '),
    ))
      items.push({
        id: `upgrade-${fleet.id}`,
        label: `${fleet.name}: ${fleet.upgrade!.issue}`,
        kind: 'fleet',
        fleetId: fleet.id,
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
      // blockerad-fabrik: something here needs goods its group cannot make.
      const missing = this.#missingInGroup(planet);
      if (missing.length)
        items.push({
          id: `supply-${planet.id}`,
          label: `${planet.name}: no ${missing.join(', ')} in its group`,
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
        !f.upgrade &&
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
        transportAction: this.#routeTransportAction(route),
      });
    return this.#decisions
      .snapshot(items)
      .filter((item) => !isMessageSetting(item.id));
  }
  #cargo(fleetId: string): Stock {
    const stock = emptyStock();
    const hold = this.#fleets.find((fleet) => fleet.id === fleetId)?.hold;
    if (hold)
      for (const material of MATERIALS) stock[material] += hold[material];
    return stock;
  }
  #unloadHolds(): void {
    for (const fleet of this.#fleets) {
      if (!fleet.hold || !fleet.position) continue;
      const planet = this.#ownedPlanets().find(
        (candidate) => candidate.position.key === fleet.position!.key,
      );
      if (!planet) continue;
      const stock = this.#state(planet).stock;
      let delivered = false;
      for (const material of MATERIALS) {
        const amount = fleet.hold[material];
        if (amount <= 0) continue;
        stock[material] += amount;
        delivered = true;
      }
      if (delivered)
        this.#event(
          `${fleet.name} unloaded captured cargo at ${planet.name}.`,
          planet.position,
        );
      delete fleet.hold;
    }
  }
  #logisticsPort(): LogisticsPort {
    return {
      planets: this.#ownedPlanets().map((planet) => ({
        id: planet.id,
        name: planet.name,
        position: planet.position,
      })),
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
    for (const project of this.#repairProjects(planet.id))
      for (const material of MATERIALS)
        demand[material] += project.cost[material];
    for (const fleet of this.#fleets)
      if (fleet.upgrade?.planetId === planet.id)
        for (const material of MATERIALS)
          demand[material] += ShipUpgrades.cost(fleet.upgrade.targets)[
            material
          ];
    for (const project of state.projects.slice(0, 1))
      for (const material of MATERIALS)
        demand[material] += this.#projectCost(planet, project)[material];
    return Object.freeze({
      stock: Object.freeze({ ...state.stock }),
      deposits: Object.freeze({ ...state.deposits }),
      extraction: Object.freeze(this.#extraction(planet, state)),
      demand: Object.freeze(demand),
      incoming: Object.freeze(this.#incoming(planet.id)),
    });
  }
  /** en-runda-per-lank: goods on their way to a planet's projects. */
  #incoming(planetId: string): Stock {
    const stock = emptyStock();
    for (const transit of this.#network.transits)
      if (transit.path.at(-1) === planetId)
        stock[transit.material] += transit.amount;
    return stock;
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
      if (project) {
        const planet = this.#planetById(id);
        return `Waiting for ${project.type} queued at ${planet?.name ?? id}.`;
      }
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

  #routeTransportAction(route: TradeRouteSnapshot): TransportAction {
    if (this.#availableTransport(route)) return { kind: 'assign' };
    if (!this.#research.completed.has('Transport ship factory')) {
      const issue = this.#researchQueueIssue();
      return { kind: 'research', ...(issue ? { blockedReason: issue } : {}) };
    }
    const planets = this.#ownedPlanets().sort(
      (a, b) =>
        Number(![route.a, route.b].includes(a.id)) -
          Number(![route.a, route.b].includes(b.id)) ||
        a.id.localeCompare(b.id),
    );
    const factory = planets.find((planet) =>
      this.#state(planet).buildings.some(
        (building) =>
          building.type === 'Transport ship factory' && !building.demolition,
      ),
    );
    if (factory)
      return { kind: 'ship', planetId: factory.id, planetName: factory.name };
    const buildable = planets.find(
      (planet) => !this.canBuild(planet, 'Transport ship factory'),
    );
    if (buildable)
      return {
        kind: 'factory',
        planetId: buildable.id,
        planetName: buildable.name,
      };
    return {
      kind: 'factory',
      blockedReason:
        'No owned planet can build a Transport ship factory. Check available building sites and Domes.',
    };
  }

  prepareRouteTransport(routeId: string): ProductionReceipt | null {
    this.#requirePlanning();
    const route = this.tradeRoutes.find(
      (candidate) =>
        candidate.id === routeId && !candidate.closing && !candidate.capacity,
    );
    if (!route || this.#transportWaiting(route))
      throw new Error('This route no longer needs transport preparation.');
    const action = this.#routeTransportAction(route);
    if (action.blockedReason) throw new Error(action.blockedReason);
    if (action.kind === 'research') {
      this.selectResearch('Transport ship factory');
      return null;
    }
    if (action.kind === 'assign')
      throw new Error('Select an available transport fleet to assign it.');
    const planet = this.#planetById(action.planetId!)!;
    return action.kind === 'factory'
      ? this.scheduleBuild(planet, 'Transport ship factory')
      : this.scheduleShip(planet, 'Transport ship');
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

  /** fraktskepp-ger-forbindelse / fraktskepp-ligger-stilla */
  #networkLinks(): NetworkLink[] {
    return this.#logistics.routes
      .filter(
        (route) =>
          !route.closing &&
          this.#fleets.some(
            (fleet) =>
              fleet.routeId === route.id &&
              fleet.ships['Transport ship'] > 0 &&
              fleet.position !== null &&
              !fleet.destination &&
              !fleet.releaseRequested,
          ),
      )
      .map(({ id, a, b }) => ({ id, a, b }));
  }

  #networkPort(): NetworkPort {
    return {
      warehouses: this.#ownedPlanets().map((planet) => ({
        id: planet.id,
        stock: this.#state(planet).stock,
      })),
      links: this.#networkLinks(),
      id: (prefix) => this.#id(prefix),
    };
  }

  #networkGroup(planetId: string): readonly string[] {
    return (
      NetworkEconomy.groups(
        this.#ownedPlanets().map((planet) => planet.id),
        this.#networkLinks(),
      ).find((group) => group.includes(planetId)) ?? [planetId]
    );
  }

  /** basta-tillgangliga-del: whether the group makes or holds a part. */
  #groupHasPart(
    component: Component,
    group: readonly string[],
    amount = 1,
  ): boolean {
    let stock = 0;
    for (const planet of this.#ownedPlanets().filter((item) =>
      group.includes(item.id),
    )) {
      const state = this.#state(planet);
      if (
        state.buildings.some(
          (building) =>
            !building.demolition &&
            BUILDINGS[building.type].component === component,
        )
      )
        return true;
      stock += state.stock[component];
    }
    return stock >= amount;
  }

  /** skepp-kostar-bara-delar / basta-tillgangliga-del */
  #shipParts(
    planet: Planet,
    project: Project,
  ): Partial<Record<Component, number>> {
    // basta-tillgangliga-del: a family is fixed only once one of its parts
    // has been delivered or is on its way; the rest is chosen afresh.
    const delivered = this.#network.delivered(project.id);
    const incoming = this.#network.incoming(project.id);
    const committed = (family: readonly Component[]) =>
      family.some(
        (part) =>
          (delivered[part] ?? 0) > 0 ||
          incoming.some((transit) => transit.material === part),
      );
    const engineFamily: readonly Component[] = [
      'Rocket engine',
      'Ion pulse engine',
    ];
    const keep = (family: readonly Component[]) =>
      !!project.parts && committed(family);
    const definition = projectDefinition(project.type);
    const ship = definition.ship!;
    const group = this.#networkGroup(planet.id);
    const parts: Partial<Record<Component, number>> = {
      ...(definition.parts ?? {}),
    };
    const engines = engineCount(ship);
    if (engines > 0) {
      if (keep(engineFamily)) {
        parts['Rocket engine'] = project.parts!['Rocket engine'] ?? 0;
        parts['Ion pulse engine'] = project.parts!['Ion pulse engine'] ?? 0;
      } else {
        const ion = this.#groupHasPart('Ion pulse engine', group, engines);
        parts['Rocket engine'] = ion ? 0 : engines;
        parts['Ion pulse engine'] = ion ? engines : 0;
      }
    }
    if (parts['Telescope I']) {
      delete parts['Telescope I'];
      const best = keep(TELESCOPES)
        ? (TELESCOPES.find((telescope) => project.parts![telescope]) ??
          'Telescope I')
        : ([...TELESCOPES]
            .reverse()
            .find((telescope) => this.#groupHasPart(telescope, group)) ??
          'Telescope I');
      parts[best] = 1;
    }
    return parts;
  }

  /**
   * Consumers waiting for goods this round: every building project in
   * parallel (parallella-byggen), one ship per product factory
   * (skeppsorder-pa-planeten), fleet upgrades and the parts they all need.
   */
  #networkConsumers(): NetworkConsumer[] {
    const since = (id: string) => Number(id.split('-').at(-1)) || 0;
    const consumers: NetworkConsumer[] = [];
    for (const planet of this.#ownedPlanets()) {
      const state = this.#state(planet);
      const busy = new Set<string>();
      for (const project of state.projects) {
        const definition = projectDefinition(project.type);
        if (definition.component && !definition.permanent) continue;
        if (definition.ship && !definition.permanent) {
          const factory = state.buildings.find(
            (building) =>
              !building.demolition &&
              !busy.has(building.id) &&
              factoryShips(building.type).includes(definition.ship!),
          );
          if (!factory) continue;
          busy.add(factory.id);
          project.factoryId = factory.id;
          project.parts = this.#shipParts(planet, project);
          consumers.push({
            id: project.id,
            planetId: planet.id,
            kind: 'product',
            needs: { ...project.parts },
            since: since(project.id),
          });
          continue;
        }
        consumers.push({
          id: project.id,
          planetId: planet.id,
          kind: 'building',
          needs: { ...this.#projectDefinition(state, project).cost },
          since: since(project.id),
        });
      }
    }
    // varvets-automatiska-materialforsorjning: the yard's next repair.
    for (const yard of this.#salvage.yards) {
      if (yard.destroyed || yard.builtRound >= this.#round) continue;
      const repair = this.#repairProjects(yard.planetId).find(
        (item) => item.id === `repair-${yard.queue[0]}`,
      );
      if (repair)
        consumers.push({
          id: repair.id,
          planetId: yard.planetId,
          kind: 'product',
          needs: {
            Iron: repair.cost.Iron,
            Water: repair.cost.Water,
            Oil: repair.cost.Oil,
          },
          since: since(repair.id),
        });
    }
    for (const fleet of this.#fleets)
      if (fleet.upgrade)
        consumers.push({
          id: fleet.upgrade.id,
          planetId: fleet.upgrade.planetId,
          kind: 'product',
          needs: ShipUpgrades.cost(fleet.upgrade.targets),
          since: since(fleet.upgrade.id),
        });
    return [...consumers, ...this.#partConsumers(consumers)];
  }

  /** delar-tillverkas-pa-behov: one unit per part factory and round. */
  #partConsumers(demanding: readonly NetworkConsumer[]): NetworkConsumer[] {
    const links = this.#networkLinks();
    const planets = this.#ownedPlanets();
    const parts: NetworkConsumer[] = [];
    for (const group of NetworkEconomy.groups(
      planets.map((planet) => planet.id),
      links,
    ))
      for (const component of COMPONENTS) {
        let need = 0;
        let oldest = Number.MAX_SAFE_INTEGER;
        for (const consumer of demanding) {
          if (!group.includes(consumer.planetId)) continue;
          const travelling = this.#network
            .incoming(consumer.id)
            .filter((transit) => transit.material === component)
            .reduce((sum, transit) => sum + transit.amount, 0);
          const missing =
            (consumer.needs[component] ?? 0) -
            (this.#network.delivered(consumer.id)[component] ?? 0) -
            travelling;
          if (missing <= 0) continue;
          need += missing;
          oldest = Math.min(oldest, consumer.since);
        }
        for (const planet of planets.filter((item) => group.includes(item.id)))
          need -= this.#state(planet).stock[component];
        const factories = planets
          .filter((planet) => group.includes(planet.id))
          .flatMap((planet) =>
            this.#state(planet)
              .buildings.filter(
                (building) =>
                  !building.demolition &&
                  BUILDINGS[building.type].component === component,
              )
              .map((building) => ({ planet, building })),
          )
          .sort((a, b) => a.building.id.localeCompare(b.building.id));
        for (const { planet, building } of factories) {
          if (need <= 0) break;
          need -= 1;
          parts.push({
            id: `part:${building.id}`,
            planetId: planet.id,
            kind: 'part',
            needs: { ...projectDefinition(component).cost },
            since: oldest,
          });
        }
      }
    return parts;
  }

  /** One round of the production network, run while the year settles. */
  #runNetworkRound(): void {
    const port = this.#networkPort();
    this.#network.advance(this.#networkConsumers(), port);
    const consumers = this.#networkConsumers();
    const active = new Set(consumers.map((consumer) => consumer.id));
    for (const planet of this.#ownedPlanets())
      for (const building of this.#state(planet).buildings) {
        const id = `part:${building.id}`;
        if (!active.has(id)) this.#network.cancel(id, port);
      }
    this.#network.allocate(consumers, port);
    for (const consumer of consumers)
      if (
        this.#networkStarted[consumer.id] === undefined &&
        (Object.keys(this.#network.delivered(consumer.id)).length > 0 ||
          this.#network.incoming(consumer.id).length > 0)
      )
        this.#networkStarted[consumer.id] = this.#round;
    for (const consumer of consumers)
      if (this.#network.ready(consumer) && this.#constructed(consumer))
        this.#finishConsumer(consumer);
    const waiting = new Set(this.#networkConsumers().map(({ id }) => id));
    for (const id of Object.keys(this.#networkStarted))
      if (!waiting.has(id)) delete this.#networkStarted[id];
    for (const id of Object.keys(this.#construction))
      if (!waiting.has(id)) delete this.#construction[id];
  }

  /**
   * byggtid-per-byggnad: a building with its goods in place is under
   * construction and finishes after its build rounds, counting this one.
   */
  #constructed(consumer: NetworkConsumer): boolean {
    if (consumer.kind !== 'building') return true;
    const started = (this.#construction[consumer.id] ??= this.#round);
    return this.#round - started + 1 >= this.#consumerBuildRounds(consumer);
  }

  #consumerBuildRounds(consumer: NetworkConsumer): number {
    if (consumer.kind !== 'building') return 1;
    const planet = this.#ownedPlanets().find(
      (item) => item.id === consumer.planetId,
    );
    const project =
      planet &&
      this.#state(planet).projects.find((item) => item.id === consumer.id);
    return project ? buildRounds(project.type) : 1;
  }

  networkSnapshot(): NetworkSnapshot {
    const consumers = this.#networkConsumers();
    return Object.freeze({
      groups: NetworkEconomy.groups(
        this.#ownedPlanets().map((planet) => planet.id),
        this.#networkLinks(),
      ),
      activeLinkIds: Object.freeze(this.#networkLinks().map(({ id }) => id)),
      consumers: Object.freeze(
        consumers.map((consumer) => {
          const delivered = this.#network.delivered(consumer.id);
          const incoming = this.#network.incoming(consumer.id);
          return Object.freeze({
            id: consumer.id,
            planetId: consumer.planetId,
            kind: consumer.kind,
            needs: consumer.needs,
            delivered,
            arrivalRounds: this.#network.arrivalRounds(consumer.id),
            waiting: Object.freeze(
              MATERIALS.filter(
                (material) =>
                  (consumer.needs[material] ?? 0) -
                    (delivered[material] ?? 0) -
                    incoming
                      .filter((transit) => transit.material === material)
                      .reduce((sum, transit) => sum + transit.amount, 0) >
                  0,
              ),
            ),
            ready: this.#network.ready(consumer),
            startedRound: this.#networkStarted[consumer.id] ?? null,
            buildRounds: this.#consumerBuildRounds(consumer),
            constructionRound: this.#construction[consumer.id] ?? null,
          });
        }),
      ),
      missing: Object.freeze(
        Object.fromEntries(
          this.#ownedPlanets().map((planet) => [
            planet.id,
            this.#missingInGroup(planet),
          ]),
        ),
      ),
    });
  }

  #finishConsumer(consumer: NetworkConsumer): void {
    const planet = this.#ownedPlanets().find(
      (item) => item.id === consumer.planetId,
    );
    if (!planet) return;
    const state = this.#state(planet);
    if (consumer.kind === 'part') {
      const building = state.buildings.find(
        (item) => `part:${item.id}` === consumer.id,
      );
      const component = building && BUILDINGS[building.type].component;
      if (component) state.stock[component] += 1;
      this.#network.consume(consumer.id);
      return;
    }
    const project = state.projects.find((item) => item.id === consumer.id);
    if (!project) {
      // Fleet upgrades and repairs take their goods from the yard's stock.
      const delivered = this.#network.delivered(consumer.id);
      for (const material of MATERIALS)
        state.stock[material] += delivered[material] ?? 0;
      this.#network.consume(consumer.id);
      return;
    }
    // arbetskraft-och-besattning: workers and crew come from the population.
    const definition = this.#projectDefinition(state, project);
    const employed = state.buildings
      .filter((building) => !building.demolition)
      .reduce((total, building) => total + BUILDINGS[building.type].workers, 0);
    if (state.population - employed < definition.workers + definition.crew)
      return;
    state.projects = state.projects.filter((item) => item !== project);
    this.#network.consume(consumer.id);
    this.#completeProject(planet, state, project);
  }

  /** erovrad-last: goods crossing a lost transport's route are lost. */
  /**
   * produktionsnatverk: why a queued project is not finished yet, from its
   * factory and the goods it still waits for.
   */
  #networkBlock(
    planet: Planet,
    state: ColonyState,
    project: Project,
    blocks: ReadonlyMap<string, string>,
  ): string | null {
    const factory = this.#factoryRequirement(planet, state, project);
    if (factory.status !== 'Ready') return factory.message;
    const block = blocks.get(project.id);
    if (block?.includes('population')) return block;
    const consumer = this.#networkConsumers().find(
      (item) => item.id === project.id,
    );
    if (!consumer) return 'Waiting for a free factory.';
    const delivered = this.#network.delivered(project.id);
    const incoming = this.#network.incoming(project.id);
    // Goods the group already holds are taken when the year settles.
    const group = this.#networkGroup(planet.id);
    const held = (material: Material) =>
      this.#ownedPlanets()
        .filter((item) => group.includes(item.id))
        .reduce((sum, item) => sum + this.#state(item).stock[material], 0);
    const waiting = MATERIALS.filter(
      (material) =>
        (consumer.needs[material] ?? 0) -
          (delivered[material] ?? 0) -
          incoming
            .filter((transit) => transit.material === material)
            .reduce((sum, transit) => sum + transit.amount, 0) -
          held(material) >
        0,
    );
    if (waiting.length) return `Waiting for ${waiting.join(', ')}.`;
    const rounds = this.#network.arrivalRounds(project.id);
    return rounds > 0
      ? `Goods arrive in ${rounds} ${rounds === 1 ? 'round' : 'rounds'}.`
      : null;
  }

  /** blockerad-fabrik: materials neither held nor made in the group. */
  #missingInGroup(planet: Planet): readonly Material[] {
    const group = this.#networkGroup(planet.id);
    const planets = this.#ownedPlanets().filter((item) =>
      group.includes(item.id),
    );
    const needed = new Set<Material>();
    for (const consumer of this.#networkConsumers())
      if (consumer.planetId === planet.id)
        for (const material of MATERIALS)
          if ((consumer.needs[material] ?? 0) > 0) needed.add(material);
    return [...needed].filter(
      (material) =>
        !planets.some((item) => {
          const state = this.#state(item);
          return (
            state.stock[material] > 0 ||
            state.buildings.some(
              (building) =>
                !building.demolition &&
                (BUILDINGS[building.type].component === material ||
                  (BUILDINGS[building.type].extraction === material &&
                    state.deposits[material] > 0)),
            )
          );
        }) &&
        !this.#networkConsumers().some(
          (consumer) =>
            consumer.planetId === planet.id &&
            ((this.#network.delivered(consumer.id)[material] ?? 0) > 0 ||
              this.#network
                .incoming(consumer.id)
                .some((transit) => transit.material === material)),
        ),
    );
  }

  #captureRouteCargo(fleet: Fleet): void {
    const route = this.#logistics.routes.find(
      (item) => item.id === fleet.routeId,
    );
    if (!route) return;
    const lost = this.#network.capture({
      id: route.id,
      a: route.a,
      b: route.b,
    });
    if (lost.length)
      this.#event(
        `Cargo was lost on a route: ${lost
          .map(({ material, amount }) => `${amount} ${material}`)
          .join(', ')}.`,
      );
  }

  #allocation(
    planet: Planet,
    state: ColonyState,
  ): { budget: BudgetSnapshot; blocks: Map<string, string> } {
    const held = emptyStock();
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
        'Asteroid passage requires a full round of movement.';
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
    if (fleet.detour) return;
    if (!fleet.exploration) return;
    let target: HexCoordinate | null = null;
    if (fleet.position && fleet.ships['Exploration ship'] > 0) {
      if (fleet.exploration === 'explore-stars')
        target = this.#starSurveyDestination(fleet);
      else {
        delete fleet.starSurvey;
        const home = this.galaxy.homePlanet.position;
        const homePoint = HexGeometry.toPoint(home);
        const angleFromHome = (point: HexCoordinate): number | null => {
          if (point.key === home.key) return null;
          const target = HexGeometry.toPoint(point);
          return Math.atan2(target.y - homePoint.y, target.x - homePoint.x);
        };
        const angleDistance = (a: number, b: number) => {
          const difference = Math.abs(a - b) % (Math.PI * 2);
          return Math.min(difference, Math.PI * 2 - difference);
        };
        const otherExplorers = this.#fleets.filter(
          (candidate) =>
            candidate.id !== fleet.id && candidate.exploration === 'explore',
        );
        const occupiedTargets = new Set(
          otherExplorers.flatMap((candidate) =>
            candidate.destination ? [candidate.destination.key] : [],
          ),
        );
        const occupiedAngles = otherExplorers.flatMap((candidate) => {
          const point = candidate.destination ?? candidate.position;
          const angle = point ? angleFromHome(point) : null;
          return angle === null ? [] : [angle];
        });
        const preferredPoint =
          fleet.position.key === home.key ? fleet.destination : fleet.position;
        const preferredAngle = preferredPoint
          ? angleFromHome(preferredPoint)
          : null;
        const frontier = this.galaxy
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
          );
        const unclaimed = frontier.filter(
          (point) => !occupiedTargets.has(point.key),
        );
        const candidates = unclaimed.length ? unclaimed : frontier;
        candidates.sort((a, b) => {
          const aAngle = angleFromHome(a) ?? 0;
          const bAngle = angleFromHome(b) ?? 0;
          const direction =
            preferredAngle !== null
              ? angleDistance(aAngle, preferredAngle) -
                angleDistance(bAngle, preferredAngle)
              : Math.min(
                  ...occupiedAngles.map((angle) =>
                    angleDistance(bAngle, angle),
                  ),
                  Math.PI,
                ) -
                Math.min(
                  ...occupiedAngles.map((angle) =>
                    angleDistance(aAngle, angle),
                  ),
                  Math.PI,
                );
          return (
            home.distanceTo(a) - home.distanceTo(b) ||
            direction ||
            fleet.position!.distanceTo(a) - fleet.position!.distanceTo(b) ||
            a.key.localeCompare(b.key)
          );
        });
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
  #assignTaskQueues(): void {
    this.#updateAttackDetours();
    this.#assignPlanetQueues();
    this.#assignAttackQueue();
  }

  // automatisk-tilldelning-av-planetkoer / utforskningsko-som-avstickare:
  // queue priority chooses the target and Explore orders are preserved.
  #assignPlanetQueues(): void {
    this.#prunePlanetQueues();
    for (const kind of ['colonization', 'exploration'] as const) {
      for (const planetId of this.#planetQueues.snapshot()[kind]) {
        const reserved = this.#fleets.some(
          (fleet) =>
            (kind === 'exploration'
              ? fleet.explorationTargetId
              : fleet.colonizationTargetId) === planetId,
        );
        if (reserved) continue;
        const planet = this.#planetById(planetId)!;
        const candidates = this.#fleets
          .filter(
            (fleet) =>
              !fleet.detour &&
              (this.#isIdleFleet(fleet) ||
                (kind === 'exploration' && !!fleet.exploration)) &&
              (kind === 'colonization'
                ? fleet.ships['Colony ship'] > 0
                : fleet.ships['Exploration ship'] > 0),
          )
          .flatMap((fleet) => {
            const path = this.#navigation.path(
              fleet.position!,
              planet.position,
              this.#speed(fleet),
              this.#knownTerrain,
            );
            return fleet.position!.key === planet.position.key || path.length
              ? [{ fleet, distance: path.length }]
              : [];
          })
          .sort(
            (a, b) =>
              a.distance - b.distance || a.fleet.id.localeCompare(b.fleet.id),
          );
        const fleet = candidates[0]?.fleet;
        if (!fleet) continue;
        fleet.planetQueue = kind;
        if (kind === 'exploration')
          fleet.detour = { kind: 'explore-planet', targetId: planetId };
        fleet.destination = planet.position;
        fleet.courseOrigin = fleet.position!;
        if (kind === 'exploration') fleet.explorationTargetId = planetId;
        else fleet.colonizationTargetId = planetId;
      }
    }
  }

  #assignAttackQueue(): void {
    for (const pirateId of this.#attackQueue) {
      if (
        this.#fleets.some(
          (fleet) =>
            fleet.detour?.kind === 'attack-pirate' &&
            fleet.detour.targetId === pirateId,
        )
      )
        continue;
      const pirate = this.#pirates.find(
        (candidate) => candidate.id === pirateId,
      );
      if (!pirate || !this.#visible.has(pirate.position.key)) continue;
      const fleet = this.#fleets
        .filter(
          (candidate) =>
            !candidate.detour &&
            candidate.ships.Fighter > 0 &&
            (this.#isIdleFleet(candidate) || !!candidate.patrol),
        )
        .flatMap((candidate) => {
          const path = this.#navigation.path(
            candidate.position!,
            pirate.position,
            this.#speed(candidate),
            this.#knownTerrain,
          );
          return candidate.position!.key === pirate.position.key || path.length
            ? [{ fleet: candidate, distance: path.length }]
            : [];
        })
        .sort(
          (a, b) =>
            a.distance - b.distance || a.fleet.id.localeCompare(b.fleet.id),
        )[0]?.fleet;
      if (!fleet) continue;
      fleet.detour = { kind: 'attack-pirate', targetId: pirateId };
      fleet.destination = pirate.position;
      fleet.courseOrigin = fleet.position!;
    }
  }

  #updateAttackDetours(): void {
    const visible = new Map(
      this.#pirates
        .filter((pirate) => this.#visible.has(pirate.position.key))
        .map((pirate) => [pirate.id, pirate.snapshot()]),
    );
    for (const pirateId of [...this.#attackQueue])
      if (!visible.has(pirateId)) {
        this.#attackQueue = this.#attackQueue.filter((id) => id !== pirateId);
        for (const fleet of this.#fleets)
          if (
            fleet.detour?.kind === 'attack-pirate' &&
            fleet.detour.targetId === pirateId
          )
            this.#resumeDetour(fleet);
      }
    for (const fleet of this.#fleets) {
      if (fleet.detour?.kind !== 'attack-pirate') continue;
      const pirate = visible.get(fleet.detour.targetId);
      if (!pirate) continue;
      fleet.destination = pirate.position;
      fleet.courseOrigin ??= fleet.position!;
    }
  }

  #isIdleFleet(fleet: Fleet): boolean {
    return !!(
      fleet.position &&
      !fleet.destination &&
      !fleet.pendingOrder &&
      !fleet.routeId &&
      !fleet.patrol &&
      !fleet.exploration &&
      !fleet.automation &&
      !fleet.civilian &&
      !fleet.upgrade &&
      !fleet.joinFleetId &&
      !fleet.ordersPaused &&
      !this.#salvage.order(fleet.id)
    );
  }

  #clearPlanetQueueOrder(fleet: Fleet): void {
    if (fleet.detour?.kind === 'explore-planet') {
      this.#resumeDetour(fleet);
      return;
    }
    delete fleet.planetQueue;
    delete fleet.explorationTargetId;
    delete fleet.colonizationTargetId;
    fleet.destination = null;
    delete fleet.courseOrigin;
  }

  #resumeDetour(fleet: Fleet): void {
    delete fleet.detour;
    delete fleet.planetQueue;
    delete fleet.explorationTargetId;
    fleet.destination = null;
    delete fleet.courseOrigin;
    if (fleet.exploration) this.#updateExploration(fleet);
    else if (fleet.patrol) this.#updatePatrol(fleet);
  }

  #prunePlanetQueues(): void {
    for (const planetId of this.#planetQueues.snapshot().exploration)
      if (this.#surveyedPlanets.has(planetId))
        this.#planetQueues.remove('exploration', planetId);
    for (const planetId of this.#planetQueues.snapshot().colonization) {
      const planet = this.#planetById(planetId);
      if (!planet || planet.colony || this.#colonies.has(planetId))
        this.#planetQueues.remove('colonization', planetId);
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
    if (fleet.detour) return;
    if (!fleet.patrol) return;
    if (!armedShipCount(fleet.ships) || !fleet.position) {
      delete fleet.patrol;
      fleet.destination = null;
      delete fleet.courseOrigin;
      this.#event(
        `${this.#fleetDisplayName(fleet)}: Patrol stopped; no armed ship available.`,
        fleet.position ?? undefined,
      );
      return;
    }
    if (fleet.patrol.approaching) {
      const center = new HexCoordinate(
        fleet.patrol.center.q,
        fleet.patrol.center.r,
      );
      if (fleet.position.key !== center.key) {
        fleet.destination = center;
        fleet.courseOrigin ??= fleet.position;
        return;
      }
      delete fleet.patrol.approaching;
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
  // stjarnupptackt-utan-avbrott: stars are logged, not Handle/Ignore pauses.
  #pausingDiscoveries(discoveries: readonly Discovery[]): readonly Discovery[] {
    return discoveries.filter((discovery) => discovery.kind !== 'star');
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
      !(fleet.automation === 'salvage'
        ? fleet.ships['Salvage ship']
        : fleet.automation === 'guard'
          ? armedShipCount(fleet.ships)
          : fleet.ships['Transport ship'] || fleet.ships['Civilian shuttle'])
    ) {
      this.#cancelFleetUpgrade(fleet);
      delete fleet.pendingOrder;
      delete fleet.automation;
      delete fleet.civilian;
      this.#salvage.stop(fleet.id);
      fleet.destination = null;
      delete fleet.courseOrigin;
    }
    if (fleet.colonizationTargetId && !fleet.ships['Colony ship']) {
      delete fleet.colonizationTargetId;
      delete fleet.planetQueue;
      fleet.destination = null;
      delete fleet.courseOrigin;
      this.#event(
        `${fleet.name}: colonization cancelled; no Colony ship remains.`,
        fleet.position ?? undefined,
      );
    }
    if (fleet.explorationTargetId && !fleet.ships['Exploration ship']) {
      delete fleet.explorationTargetId;
      delete fleet.planetQueue;
      fleet.destination = null;
      delete fleet.courseOrigin;
      delete fleet.detour;
      this.#event(
        `${fleet.name}: planet exploration cancelled; no Exploration ship remains.`,
        fleet.position ?? undefined,
      );
    }
    if (fleet.detour?.kind === 'attack-pirate' && !fleet.ships.Fighter) {
      const targetId = fleet.detour.targetId;
      this.#attackQueue = this.#attackQueue.filter((id) => id !== targetId);
      this.#resumeDetour(fleet);
    }
    if (fleet.patrol && !armedShipCount(fleet.ships)) this.#updatePatrol(fleet);
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
    const held = emptyStock();
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
        if (
          (unit.missiles !== undefined &&
            (!Number.isInteger(unit.missiles) ||
              (unit.type === 'Fighter'
                ? unit.missiles !== 0 && unit.missiles !== 2
                : unit.missiles !== 0))) ||
          (unit.armored !== undefined && typeof unit.armored !== 'boolean') ||
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
  #shipCount(ships: Partial<Record<ShipType, number>>): number {
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
  #planetById(id: string): Planet | undefined {
    return this.galaxy.systems
      .flatMap((system) => system.planets)
      .find((planet) => planet.id === id);
  }

  #requirePlanetQueueEditing(): void {
    if (!['planning', 'interrupted'].includes(this.#phase))
      throw new Error('Planet queues can only be edited during decisions.');
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
    if (fleet.colonizationTargetId || fleet.explorationTargetId) return;
    if (fleet.civilian?.passengers) return;
    // ruttflottor-utan-ankomstbesked / flottorder-upgrade: arrival does not finish these orders.
    if (fleet.routeId || fleet.upgrade) return;
    // ankomstbesked-endast-vid-manuell-forflyttning: automatic legs arrive silently.
    if (fleet.exploration || fleet.automation || fleet.detour) return;
    this.#event(
      `${this.#fleetDisplayName(fleet)} arrived at ${place}.`,
      fleet.position,
    );
  }
  /** grupperade-planethandelser: settle one immutable report per planet and year. */
  #planetEvent(
    text: string,
    planet: Planet,
    illustration?: EventIllustration,
    production?: ProductionContext,
  ): void {
    const line: EventLine = Object.freeze({
      text,
      ...(illustration ? { illustration: Object.freeze(illustration) } : {}),
      ...(production ? { production } : {}),
    });
    const index = this.#events.findIndex(
      (event) => event.round === this.#round && event.planetId === planet.id,
    );
    if (index < 0) {
      this.#event(
        `${planet.name}:\n${text}`,
        planet.position,
        undefined,
        planet.id,
        this.#round,
        {
          heading: planet.name,
          illustration: {
            kind: 'planet',
            type: this.#environment(planet, this.#state(planet)).type,
          },
          lines: Object.freeze([line]),
        },
      );
      return;
    }
    const previous = this.#events[index]!;
    this.#events[index] = Object.freeze({
      ...previous,
      text: `${previous.text}\n${text}`,
      lines: Object.freeze([
        ...(previous.lines ??
          previous.text
            .split('\n')
            .slice(1)
            .map((text) => ({ text }))),
        line,
      ]),
    });
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
              type:
                planet.type === 'gas'
                  ? 'Gas'
                  : this.#colonies.has(planet.id)
                    ? this.#environment(planet, this.#state(planet)).type
                    : planet.environment,
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
  #productionFleetName(ship: ShipType, planet: Planet): string {
    const key = JSON.stringify([planet.id, ship]);
    let number = this.#productionFleetSequences[key] ?? 1;
    let name = '';
    do {
      const suffix = ` ${number}`;
      name = `${ship} ${planet.name}`.slice(0, 40 - suffix.length) + suffix;
      number += 1;
    } while (
      this.#fleets.some(
        (fleet) => fleet.name.toLowerCase() === name.toLowerCase(),
      )
    );
    this.#productionFleetSequences[key] = number;
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
  #environment(
    planet: Planet,
    state = this.#colonies.get(planet.id),
  ): PlanetEnvironment {
    return new PlanetEnvironment(
      planet,
      state?.habitability ?? planet.habitability,
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
            planet.type === 'solid' && this.#surveyedPlanets.has(planet.id),
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
