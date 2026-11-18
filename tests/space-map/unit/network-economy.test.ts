import { describe, expect, it } from 'vitest';
import {
  emptyStock,
  type Stock,
} from '../../../src/client/space-map/models/Economy.js';
import {
  NetworkEconomy,
  type NetworkConsumer,
  type NetworkLink,
  type NetworkPort,
} from '../../../src/client/space-map/models/production-network/NetworkEconomy.js';

// Förenklad produktion: the network economy in isolation, with its own
// small chain A–B–C and a separate planet D.

function port(
  stocks: Record<string, Partial<Stock>>,
  links: NetworkLink[],
): NetworkPort {
  let next = 1;
  return {
    warehouses: Object.entries(stocks).map(([id, stock]) => ({
      id,
      stock: { ...emptyStock(), ...stock },
    })),
    links,
    id: (prefix) => `${prefix}-${next++}`,
  };
}
const chain = (): NetworkLink[] => [
  { id: 'ab', a: 'A', b: 'B' },
  { id: 'bc', a: 'B', b: 'C' },
];
const stock = (world: NetworkPort, id: string) =>
  world.warehouses.find((warehouse) => warehouse.id === id)!.stock;
const consumer = (
  id: string,
  planetId: string,
  needs: NetworkConsumer['needs'],
  extra: Partial<NetworkConsumer> = {},
): NetworkConsumer => ({
  id,
  planetId,
  kind: 'product',
  needs,
  since: 1,
  ...extra,
});

describe('network economy', () => {
  it('produktionsnatverk: groups follow active links only', () => {
    expect(NetworkEconomy.groups(['A', 'B', 'C', 'D'], chain())).toEqual([
      ['A', 'B', 'C'],
      ['D'],
    ]);
  });

  it('en-runda-per-lank: goods two links away arrive after two rounds', () => {
    const world = port({ A: { Iron: 5 }, B: {}, C: {} }, chain());
    const economy = new NetworkEconomy();
    const ship = consumer('ship', 'C', { Iron: 3 });
    economy.allocate([ship], world);
    expect(stock(world, 'A').Iron).toBe(2);
    expect(economy.arrivalRounds('ship')).toBe(2);
    economy.advance([ship], world);
    expect(economy.ready(ship)).toBe(false);
    economy.advance([ship], world);
    expect(economy.ready(ship)).toBe(true);
    economy.consume('ship');
    expect(economy.delivered('ship')).toEqual({});
  });

  it('delat-lager-i-natverket: local goods are reserved at once and nearer stock is used first', () => {
    const world = port(
      { A: { Iron: 5 }, B: { Iron: 1 }, C: { Iron: 1 } },
      chain(),
    );
    const economy = new NetworkEconomy();
    const ship = consumer('ship', 'C', { Iron: 3 });
    economy.allocate([ship], world);
    expect(economy.delivered('ship')).toEqual({ Iron: 1 });
    expect(stock(world, 'B').Iron).toBe(0);
    expect(stock(world, 'A').Iron).toBe(4);
    expect(NetworkEconomy.groups(['D'], chain())).toEqual([['D']]);
  });

  it('produktionsnatverk: never takes goods from another group', () => {
    const world = port({ A: {}, D: { Iron: 9 } }, chain());
    const economy = new NetworkEconomy();
    economy.allocate([consumer('ship', 'A', { Iron: 1 })], world);
    expect(stock(world, 'D').Iron).toBe(9);
    expect(economy.transits).toEqual([]);
  });

  it('standardregel-vid-brist: the longest waiting consumer, then products before parts, gets scarce goods', () => {
    const world = port({ A: { Oil: 1 } }, []);
    const economy = new NetworkEconomy();
    const part = consumer('part', 'A', { Oil: 1 }, { kind: 'part' });
    const product = consumer('product', 'A', { Oil: 1 });
    economy.allocate([part, product], world);
    expect(economy.delivered('product')).toEqual({ Oil: 1 });
    const older = new NetworkEconomy();
    const oldPart = { ...part, since: 0 };
    older.allocate([product, oldPart], port({ A: { Oil: 1 } }, []));
    expect(older.delivered('part')).toEqual({ Oil: 1 });
  });

  it('varor-stannar-vid-delning: goods whose next link is lost stay where they are', () => {
    const world = port({ A: { Iron: 2 }, B: {}, C: {} }, chain());
    const economy = new NetworkEconomy();
    const ship = consumer('ship', 'C', { Iron: 2 });
    economy.allocate([ship], world);
    economy.advance([ship], world);
    const split = { ...world, links: [chain()[0]!] };
    economy.advance([ship], split);
    expect(stock(world, 'B').Iron).toBe(2);
    expect(economy.transits).toEqual([]);
  });

  it('erovrad-last: a captured link loses the goods crossing it', () => {
    const world = port({ A: { Iron: 2 }, B: {}, C: {} }, chain());
    const economy = new NetworkEconomy();
    economy.allocate([consumer('ship', 'C', { Iron: 2 })], world);
    expect(economy.capture({ id: 'bc', a: 'B', b: 'C' })).toEqual([]);
    expect(economy.capture({ id: 'ab', a: 'A', b: 'B' })).toEqual([
      { material: 'Iron', amount: 2 },
    ]);
  });

  it('keeps reservations across a save and returns delivered goods when cancelled', () => {
    const world = port({ A: { Iron: 2 }, B: {} }, chain());
    const economy = new NetworkEconomy();
    const ship = consumer('ship', 'A', { Iron: 2 });
    economy.allocate([ship], world);
    const restored = new NetworkEconomy(economy.snapshot());
    expect(restored.ready(ship)).toBe(true);
    restored.cancel('ship', world);
    expect(stock(world, 'A').Iron).toBe(2);
  });
});
