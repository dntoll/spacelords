import type { Resource } from '../Economy.js';
import type { BuildType, ShipType } from '../Game.js';

// tre-produktionsnivaer: the prototype's small catalog of the three tiers.
export type FactoryTier = 'Resources' | 'Parts' | 'Products';
export const FACTORY_TIERS: readonly FactoryTier[] = Object.freeze([
  'Resources',
  'Parts',
  'Products',
]);

export type PrototypePart = 'Rocket engine' | 'Weapons module';
export type PrototypeMaterial = Resource | PrototypePart;

export type FactoryType =
  | 'Iron mine'
  | 'Water extractor'
  | 'Oil extractor'
  | 'Rocket engine factory'
  | 'Weapons module factory'
  | 'Fighter factory'
  | 'Transport ship factory'
  | 'Raptor factory';

export interface FactoryDefinition {
  readonly type: FactoryType & BuildType;
  readonly tier: FactoryTier;
  readonly output: PrototypeMaterial | ShipType;
  /** utvinning-vid-fyndighet: extractors need their resource on the planet. */
  readonly deposit?: Resource;
  readonly inputs: readonly PrototypeMaterial[];
  /** byggnader-kostar-raavaror */
  readonly cost: Readonly<Partial<Record<Resource, number>>>;
  readonly workers: number;
  readonly buildRounds: number;
}

const define = (definition: FactoryDefinition): FactoryDefinition =>
  Object.freeze({
    ...definition,
    inputs: Object.freeze([...definition.inputs]),
  });

export const FACTORY_CATALOG: readonly FactoryDefinition[] = Object.freeze([
  define({
    type: 'Iron mine',
    tier: 'Resources',
    output: 'Iron',
    deposit: 'Iron',
    inputs: [],
    cost: { Iron: 5, Water: 2 },
    workers: 50,
    buildRounds: 1,
  }),
  define({
    type: 'Water extractor',
    tier: 'Resources',
    output: 'Water',
    deposit: 'Water',
    inputs: [],
    cost: { Iron: 4 },
    workers: 50,
    buildRounds: 1,
  }),
  define({
    type: 'Oil extractor',
    tier: 'Resources',
    output: 'Oil',
    deposit: 'Oil',
    inputs: [],
    cost: { Iron: 6, Water: 2 },
    workers: 50,
    buildRounds: 1,
  }),
  define({
    type: 'Rocket engine factory',
    tier: 'Parts',
    output: 'Rocket engine',
    inputs: ['Iron', 'Oil'],
    cost: { Iron: 12, Water: 6, Oil: 3 },
    workers: 100,
    buildRounds: 2,
  }),
  define({
    type: 'Weapons module factory',
    tier: 'Parts',
    output: 'Weapons module',
    inputs: ['Iron', 'Water'],
    cost: { Iron: 8, Water: 4, Oil: 2 },
    workers: 100,
    buildRounds: 2,
  }),
  define({
    type: 'Fighter factory',
    tier: 'Products',
    output: 'Fighter',
    inputs: ['Rocket engine', 'Weapons module'],
    cost: { Iron: 16, Water: 8, Oil: 4 },
    workers: 150,
    buildRounds: 3,
  }),
  define({
    type: 'Transport ship factory',
    tier: 'Products',
    output: 'Transport ship',
    inputs: ['Rocket engine'],
    cost: { Iron: 12, Water: 6, Oil: 3 },
    workers: 150,
    buildRounds: 2,
  }),
  define({
    type: 'Raptor factory',
    tier: 'Products',
    output: 'Raptor',
    inputs: ['Rocket engine', 'Weapons module'],
    cost: { Iron: 18, Water: 10, Oil: 6 },
    workers: 150,
    buildRounds: 3,
  }),
]);

export function factoryDefinition(type: FactoryType): FactoryDefinition {
  const definition = FACTORY_CATALOG.find((entry) => entry.type === type);
  if (!definition) throw new Error(`Unknown factory ${type}.`);
  return definition;
}
