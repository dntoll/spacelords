import { TELESCOPES, type TelescopeLevel } from './Detection.js';
import { emptyStock, type Stock } from './Economy.js';
import type { ShipUnit, Technology } from './Game.js';

export interface ShipUpgradeTarget {
  readonly shipId: string;
  readonly ionEngines: number;
  readonly telescope: TelescopeLevel | null;
}

export interface FleetUpgradeOrder {
  readonly id: string;
  readonly yardId: string;
  readonly planetId: string;
  readonly targets: readonly ShipUpgradeTarget[];
  readonly productionIds: readonly string[];
  issue: string | null;
}

/** flottorder-upgrade: replace only obsolete equipment; preserve each ship's identity. */
export class ShipUpgrades {
  static targets(
    ships: readonly ShipUnit[],
    researched: ReadonlySet<Technology>,
  ): ShipUpgradeTarget[] {
    const telescope = [...TELESCOPES]
      .reverse()
      .find((part) => researched.has(`${part} factory`));
    const level = telescope
      ? ((TELESCOPES.indexOf(telescope) + 1) as TelescopeLevel)
      : null;
    return ships.flatMap((ship) => {
      const ionEngines = researched.has('Ion pulse engine factory')
        ? ship.engines['Rocket engine']
        : 0;
      const target =
        ship.type === 'Exploration ship' &&
        level &&
        level > (ship.telescope ?? 1)
          ? level
          : null;
      return ionEngines || target
        ? [{ shipId: ship.id, ionEngines, telescope: target }]
        : [];
    });
  }

  static cost(targets: readonly ShipUpgradeTarget[]): Stock {
    const cost = emptyStock();
    for (const target of targets) {
      cost['Ion pulse engine'] += target.ionEngines;
      if (target.telescope) cost[TELESCOPES[target.telescope - 1]!]++;
    }
    return cost;
  }

  static install(
    ship: ShipUnit,
    target: ShipUpgradeTarget,
    stock: Stock,
  ): ShipUnit {
    stock['Rocket engine'] += target.ionEngines;
    if (target.telescope && ship.telescope)
      stock[TELESCOPES[ship.telescope - 1]!]++;
    return {
      ...ship,
      engines: {
        'Rocket engine': ship.engines['Rocket engine'] - target.ionEngines,
        'Ion pulse engine':
          ship.engines['Ion pulse engine'] + target.ionEngines,
      },
      ...(target.telescope ? { telescope: target.telescope } : {}),
    };
  }

  static validate(
    order: FleetUpgradeOrder,
    ships: readonly ShipUnit[],
    researched: ReadonlySet<Technology>,
  ): void {
    const available = this.targets(ships, researched);
    if (
      !order ||
      typeof order.id !== 'string' ||
      !order.id ||
      typeof order.yardId !== 'string' ||
      typeof order.planetId !== 'string' ||
      !Array.isArray(order.targets) ||
      !order.targets.length ||
      !Array.isArray(order.productionIds) ||
      order.productionIds.some((id) => typeof id !== 'string') ||
      (order.issue !== null && typeof order.issue !== 'string') ||
      new Set(order.targets.map((target: ShipUpgradeTarget) => target.shipId))
        .size !== order.targets.length ||
      order.targets.some(
        (target: ShipUpgradeTarget) =>
          !available.some(
            (candidate) =>
              candidate.shipId === target.shipId &&
              Number.isInteger(target.ionEngines) &&
              target.ionEngines >= 0 &&
              target.ionEngines <= candidate.ionEngines &&
              (target.telescope === null ||
                ([1, 2, 3].includes(target.telescope) &&
                  !!candidate.telescope &&
                  target.telescope >
                    (ships.find((ship) => ship.id === target.shipId)
                      ?.telescope ?? 1) &&
                  target.telescope <= candidate.telescope)) &&
              (target.ionEngines > 0 || target.telescope !== null),
          ),
      )
    )
      throw new Error('Invalid saved fleet upgrade.');
  }
}
