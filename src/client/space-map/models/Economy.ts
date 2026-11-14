import { TELESCOPES } from './Detection.js';

export const RESOURCES = ['Iron', 'Water', 'Oil'] as const;
export type Resource = (typeof RESOURCES)[number];
export const COMPONENTS = [
  'Rocket engine',
  'Ion pulse engine',
  'Weapons module',
  ...TELESCOPES,
] as const;
export type Component = (typeof COMPONENTS)[number];
export const MATERIALS = [...RESOURCES, ...COMPONENTS] as const;
export type Material = (typeof MATERIALS)[number];
export type Stock = Record<Material, number>;
export const emptyStock = (): Stock => ({
  Iron: 0,
  Water: 0,
  Oil: 0,
  'Rocket engine': 0,
  'Ion pulse engine': 0,
  'Weapons module': 0,
  'Telescope I': 0,
  'Telescope II': 0,
  'Telescope III': 0,
});

export interface EconomySnapshot {
  readonly stock: Readonly<Stock>;
  readonly deposits: Readonly<Stock>;
  readonly extraction: Readonly<Stock>;
  readonly demand: Readonly<Stock>;
  readonly incoming: Readonly<Stock>;
}

// utvinningsbara-resurser: extraction transfers matter; it never creates it.
export class PlanetEconomy {
  constructor(
    readonly stock: Stock,
    readonly deposits: Stock,
  ) {}

  extract(rates: Readonly<Stock>): void {
    for (const resource of RESOURCES) {
      const amount = Math.min(this.deposits[resource], rates[resource]);
      this.deposits[resource] -= amount;
      this.stock[resource] += amount;
    }
  }

  static shortage(stock: Readonly<Stock>, cost: Readonly<Stock>): Stock {
    return Object.fromEntries(
      MATERIALS.map((r) => [r, Math.max(0, cost[r] - stock[r])]),
    ) as Stock;
  }
}
