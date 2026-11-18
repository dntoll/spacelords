import type { FactoryType } from './FactoryCatalog.js';
import type {
  FactoryState,
  NetworkState,
  SiteState,
} from './FactoryNetwork.js';

// Example data for the clickable factory screens prototype. Tests build their
// own networks so this example can be edited freely.

const built = (
  type: FactoryType,
  production: Partial<FactoryState> = {},
): SiteState => ({
  kind: 'factory',
  factory: {
    type,
    phase: 'built',
    roundsDone: 0,
    orders: 0,
    productionDone: 0,
    productionTotal: 0,
    ...production,
  },
});
const building = (type: FactoryType, roundsDone: number): SiteState => ({
  kind: 'factory',
  factory: {
    type,
    phase: 'building',
    roundsDone,
    orders: 0,
    productionDone: 0,
    productionTotal: 0,
  },
});
const empty: SiteState = { kind: 'empty' };
const locked: SiteState = { kind: 'locked' };

export function exampleFactoryNetwork(): NetworkState {
  return {
    planets: [
      {
        name: 'Tellus',
        environment: 'Temperate',
        position: { x: 0, y: 0 },
        deposits: ['Iron', 'Water'],
        stock: { Iron: 8, Water: 2 },
        workers: 300,
        sites: [
          built('Iron mine'),
          built('Iron mine'),
          built('Rocket engine factory'),
          built('Rocket engine factory'),
          empty,
          locked,
        ],
      },
      {
        name: 'Kepler',
        environment: 'Desert',
        position: { x: 3, y: 2 },
        deposits: ['Iron', 'Oil'],
        stock: { Iron: 4, Water: 1, Oil: 1 },
        workers: 100,
        sites: [
          built('Oil extractor'),
          built('Transport ship factory'),
          built('Weapons module factory'),
          building('Iron mine', 0),
        ],
      },
      {
        name: 'Lyra',
        environment: 'Ocean',
        position: { x: 6, y: 0 },
        deposits: ['Water'],
        stock: {},
        workers: 0,
        sites: [
          built('Fighter factory', {
            orders: 3,
            productionDone: 3,
            productionTotal: 4,
          }),
          empty,
          empty,
        ],
      },
      {
        name: 'Vega',
        environment: 'Ice',
        position: { x: 9, y: -3 },
        deposits: ['Water'],
        stock: { Water: 4 },
        workers: 50,
        sites: [
          built('Water extractor'),
          built('Rocket engine factory'),
          empty,
        ],
      },
      {
        name: 'Orion',
        environment: 'Toxic',
        position: { x: -2, y: 5 },
        deposits: ['Iron'],
        stock: {},
        workers: 0,
        sites: [empty, empty, empty],
      },
      {
        name: 'Draco',
        environment: 'Desert',
        position: { x: 8, y: 5 },
        deposits: ['Oil'],
        stock: { Oil: 3 },
        workers: 50,
        sites: [built('Oil extractor'), built('Raptor factory'), empty],
      },
      {
        name: 'Sirius',
        environment: 'Temperate',
        position: { x: 11, y: 7 },
        deposits: ['Iron'],
        stock: { Iron: 6 },
        workers: 50,
        sites: [built('Iron mine'), empty],
      },
    ],
    links: [
      {
        id: 'link-1',
        a: 'Tellus',
        b: 'Kepler',
        transport: 'Hauler 1',
        pending: false,
      },
      {
        id: 'link-2',
        a: 'Kepler',
        b: 'Lyra',
        transport: 'Hauler 3',
        pending: false,
      },
      {
        id: 'link-3',
        a: 'Draco',
        b: 'Sirius',
        transport: 'Hauler 4',
        pending: false,
      },
    ],
    freeTransports: [{ name: 'Hauler 2', planet: 'Kepler' }],
  };
}
