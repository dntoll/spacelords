export const RESOURCES = ['Iron', 'Water', 'Oil'] as const;
export type Resource = (typeof RESOURCES)[number];
export type Stock = Record<Resource, number>;
export const emptyStock = (): Stock => ({ Iron: 0, Water: 0, Oil: 0 });

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
      RESOURCES.map((r) => [r, Math.max(0, cost[r] - stock[r])]),
    ) as Stock;
  }
}
