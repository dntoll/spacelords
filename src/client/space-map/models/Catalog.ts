// spelkatalog: buildings, ships and their costs, shared by the game model.
import type { TerraformEnvironment } from './Planet.js';
import {
  COMPONENTS,
  emptyStock,
  type Component,
  type Stock,
} from './Economy.js';
import { TELESCOPES, type TelescopeLevel } from './Detection.js';
import { engineCount } from './ShipEquipment.js';
import type { Technology } from './research/Research.js';
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
        'Lets the queued research advance each round. A technology takes 1 to 3 rounds.',
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
/** en-order-ett-skepp: ships that man a link rather than escort it. */
export const TRANSPORTS: readonly ShipType[] = [
  'Transport ship',
  'Civilian shuttle',
];

/** byggval-bara-framforskat: ships that need research beyond their factory. */
export const SHIP_RESEARCH: Readonly<Partial<Record<ShipType, Technology>>> = {
  'Civilian shuttle': 'Civilian transport',
};

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
