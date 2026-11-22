// Read-only snapshots the game model hands to controllers and views.
import type { HexCoordinate } from '../../common/HexCoordinate.js';
import type {
  BuildType,
  Cost,
  ProjectType,
  ShipType,
  ShipUnit,
} from './Catalog.js';
import type { Component, EconomySnapshot, Stock } from './Economy.js';
import type { PlanetEnvironmentType } from './Planet.js';
import type { ShipOrder } from './ShipOrders.js';
import type { FleetUpgradeOrder } from './ShipUpgrades.js';
import type { ExplorationOrder } from './TurnSimulation.js';
import type { Technology } from './research/Research.js';
import type { EventIllustration, EventLine } from './turn/EventDetails.js';

export interface StationConstruction {
  readonly planet: string;
  readonly roundsLeft: number;
  /** False while the station still waits for goods. */
  readonly started: boolean;
}
export interface ResearchSnapshot {
  readonly recovered?: readonly Technology[];
  readonly available: readonly Technology[];
  readonly completed: readonly Technology[];
  readonly selected: Technology | null;
  readonly stations: number;
  /** forskningsvy-utan-station: finished stations, operating or not. */
  readonly builtStations: number;
  /** forskningstid: rounds spent per unfinished technology. */
  readonly progress?: Readonly<Partial<Record<Technology, number>>>;
  /**
   * forsta-station-pa-vag: the Research station closest to completion, so
   * Research can say one is coming. Null when none is queued.
   */
  readonly stationConstruction?: StationConstruction | null;
  readonly queueBlockedReason: string | null;
  readonly queue: readonly Technology[];
}

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

/** byggorsak-i-kon: why a queued ship is built, as facts for the view. */
export type ShipPurpose =
  | { readonly kind: 'colonize' | 'explore'; readonly planet: string }
  | { readonly kind: 'fleet'; readonly fleet: string }
  | { readonly kind: 'order'; readonly order: ShipOrder['kind'] }
  | { readonly kind: 'home-fleet' };

export interface ConstructionProjectSnapshot {
  readonly initialOrder?: ShipOrder;
  /** byggorsak-i-kon: set for ship projects only. */
  readonly purpose?: ShipPurpose;
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
  readonly automation?: 'salvage';
  readonly colonizationTargetId?: string;
  readonly explorationTargetId?: string;
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
