import type { Material, Resource } from '../Economy.js';
import type { BuildType, ShipType } from '../Game.js';
import type { PlanetEnvironmentType } from '../Planet.js';

// Förenklad produktion: what the Factories screens show. Structured facts
// only; the view chooses every sentence the player reads.

export type FactoryTier = 'Resources' | 'Parts' | 'Products' | 'Other';
export const FACTORY_TIERS: readonly FactoryTier[] = Object.freeze([
  'Resources',
  'Parts',
  'Products',
  'Other',
]);

export type FactoriesScreen = 'sites' | 'build' | 'connect' | 'links';

export type FactoryStatus =
  'working' | 'idle' | 'building' | 'queued' | 'producing' | 'missing';

export interface MapPosition {
  readonly x: number;
  readonly y: number;
}

export interface FactorySiteSnapshot {
  readonly index: number;
  /** `dome` needs a Dome before other buildings; `locked` is unusable. */
  readonly kind: 'empty' | 'dome' | 'locked' | 'factory';
  readonly factory: {
    readonly type: BuildType;
    readonly tier: FactoryTier;
    readonly status: FactoryStatus;
    readonly missing: readonly Material[];
    readonly roundsDone: number;
    readonly roundsTotal: number;
    /** Ship orders waiting behind the one in production. */
    readonly moreOrders: number;
    readonly makesShips: boolean;
  } | null;
}

export interface FactoryPlanetSnapshot {
  readonly id: string;
  readonly name: string;
  readonly environment: PlanetEnvironmentType | 'Gas';
  readonly position: MapPosition;
  readonly deposits: readonly Resource[];
  readonly collapsed: boolean;
  readonly usedSites: number;
  readonly sites: readonly FactorySiteSnapshot[];
}

export interface FactoryCountSnapshot {
  readonly type: BuildType;
  readonly built: number;
  readonly building: number;
  readonly missing: readonly Material[];
}

export interface FactoryGroupSnapshot {
  readonly key: string;
  readonly planets: readonly FactoryPlanetSnapshot[];
  readonly links: readonly {
    readonly a: string;
    readonly b: string;
    readonly pending: boolean;
  }[];
  readonly counts: readonly FactoryCountSnapshot[];
  readonly collapsed: boolean;
  readonly canConnect: boolean;
  readonly emptySites: number;
  /** eskort-pa-routes: manned links in the group without armed escort. */
  readonly unescortedLinks: number;
}

export interface BuildOptionSnapshot {
  readonly type: BuildType;
  readonly tier: FactoryTier;
  readonly cost: Readonly<Record<Resource, number>>;
  readonly inGroup: number;
  readonly buildingInGroup: number;
  readonly here: number;
  readonly buildRounds: number;
  readonly missingDeposit: Resource | null;
  /** Rounds to the nearest supply of every input; null when one is missing. */
  readonly inputRounds: number | null;
  readonly missingInputs: readonly Material[];
  readonly product: ShipType | null;
  readonly productRounds: number | null;
  readonly shortage: readonly {
    readonly resource: Resource;
    readonly amount: number;
  }[];
}

export interface BuildScreenSnapshot {
  readonly planetId: string;
  readonly planet: string;
  readonly siteIndex: number;
  readonly group: readonly string[];
  readonly deposits: readonly Resource[];
  readonly stock: Readonly<Record<Resource, number>>;
  readonly workers: number;
  readonly options: readonly BuildOptionSnapshot[];
  /** A Dome site whose Dome still needs this research. */
  readonly research: BuildType | null;
  /** parallella-byggen: the building queued here, which can be cancelled. */
  readonly project: BuildType | null;
}

export type TransportChoice =
  | { readonly kind: 'free'; readonly fleetId: string; readonly name: string }
  | {
      readonly kind: 'build';
      readonly planetId: string;
      readonly planet: string;
    };

export interface TransportOptionSnapshot {
  readonly choice: TransportChoice;
  readonly selected: boolean;
}

export interface ConnectNodeSnapshot {
  readonly key: string;
  readonly planets: readonly string[];
  readonly position: MapPosition;
  readonly own: boolean;
  readonly connectable: boolean;
}

export interface ConnectionProposalSnapshot {
  readonly targetKey: string;
  readonly target: readonly string[];
  readonly from: string;
  readonly to: string;
  /** blockerad-fabrik: materials the link brings to a planet lacking them. */
  readonly unblocks: readonly {
    readonly planet: string;
    readonly material: Material;
  }[];
  readonly adds: readonly Material[];
  readonly canBuildTransports: boolean;
}

export interface ConnectScreenSnapshot {
  readonly group: readonly string[];
  readonly nodes: readonly ConnectNodeSnapshot[];
  readonly proposals: readonly ConnectionProposalSnapshot[];
  readonly transports: readonly TransportOptionSnapshot[];
  readonly needsResearch: boolean;
}

export interface LinksScreenSnapshot {
  readonly group: readonly string[];
  readonly planets: readonly {
    readonly id: string;
    readonly name: string;
    readonly position: MapPosition;
    readonly picked: boolean;
  }[];
  readonly links: readonly {
    readonly id: string;
    readonly a: string;
    readonly b: string;
    readonly transport: string | null;
    /** eskort-pa-routes: armed ships guarding the link's transports. */
    readonly escorts: number;
    readonly canEscort: boolean;
  }[];
  /** eskort-pa-routes: the free armed fleets offered for one link. */
  readonly escort: {
    readonly routeId: string;
    readonly fleets: readonly {
      readonly fleetId: string;
      readonly name: string;
      readonly armed: number;
      /** Hexes to the nearer end of the link. */
      readonly distance: number;
    }[];
  } | null;
  readonly pick: {
    readonly a: string;
    readonly b: string;
    readonly roundsSaved: number;
    readonly alreadyLinked: boolean;
  } | null;
  readonly pendingMove: {
    readonly routeId: string;
    readonly transport: string;
    readonly splitOff: readonly string[];
  } | null;
  readonly transports: readonly TransportOptionSnapshot[];
}

/** Connect-skärmen: what the last link order did. */
export interface FactoriesReceipt {
  readonly from: string;
  readonly to: string;
  /** The transport now on the route, or null while one is being built. */
  readonly transport: string | null;
  readonly builtAt: string | null;
}

export interface FactoriesSnapshot {
  readonly screen: FactoriesScreen;
  readonly receipt: FactoriesReceipt | null;
  readonly locked: boolean;
  readonly groups: readonly FactoryGroupSnapshot[];
  readonly build: BuildScreenSnapshot | null;
  readonly connect: ConnectScreenSnapshot | null;
  readonly links: LinksScreenSnapshot | null;
}

export type FactoriesAction =
  | { readonly kind: 'back' }
  | { readonly kind: 'toggle-group'; readonly group: string }
  | { readonly kind: 'toggle-planet'; readonly planet: string }
  | {
      readonly kind: 'open-site';
      readonly planet: string;
      readonly site: number;
    }
  | { readonly kind: 'build'; readonly type: BuildType }
  | { readonly kind: 'cancel-site' }
  | { readonly kind: 'open-connect'; readonly group: string }
  | { readonly kind: 'open-links'; readonly group?: string }
  | { readonly kind: 'pick-planet'; readonly planet: string }
  | { readonly kind: 'connect'; readonly target: string }
  | { readonly kind: 'add-link' }
  | { readonly kind: 'choose-transport'; readonly choice: TransportChoice }
  | { readonly kind: 'move-link'; readonly link: string }
  | { readonly kind: 'escort-link'; readonly link: string }
  | { readonly kind: 'assign-escort'; readonly fleet: string }
  | { readonly kind: 'confirm-move' | 'cancel-move' };

/** skeppsorder-pa-planeten: ship factories hand over to the map. */
export type FactoriesOutcome = {
  readonly kind: 'open-production';
  readonly planetId: string;
} | null;
