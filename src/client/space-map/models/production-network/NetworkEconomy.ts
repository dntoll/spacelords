import { MATERIALS, type Material, type Stock } from '../Economy.js';

// Förenklad produktion (utforskning simple_production):
// produktionsnatverk, delat-lager-i-natverket, en-runda-per-lank,
// kortaste-vag-i-lankar, standardregel-vid-brist, varor-stannar-vid-delning
// and erovrad-last. The model only moves and reserves materials; the game
// decides which consumers exist and what finishing one means.

export interface NetworkLink {
  readonly id: string;
  readonly a: string;
  readonly b: string;
}

/** Mutable warehouse owned by the game; the economy edits it in place. */
export interface NetworkWarehouse {
  readonly id: string;
  readonly stock: Stock;
}

/** Tier order for `standardregel-vid-brist`: products before parts. */
export type ConsumerKind = 'product' | 'building' | 'part';
const KIND_RANK: Readonly<Record<ConsumerKind, number>> = {
  product: 0,
  building: 1,
  part: 2,
};

export interface NetworkConsumer {
  readonly id: string;
  readonly planetId: string;
  readonly kind: ConsumerKind;
  readonly needs: Readonly<Partial<Record<Material, number>>>;
  /** Round the consumer started waiting; older consumers are served first. */
  readonly since: number;
}

export interface NetworkPort {
  readonly warehouses: readonly NetworkWarehouse[];
  readonly links: readonly NetworkLink[];
  id(prefix: string): string;
}

export interface Transit {
  readonly id: string;
  readonly material: Material;
  readonly amount: number;
  /** Planet ids from source to destination. */
  readonly path: readonly string[];
  /** Index in `path` of the planet the goods were last unloaded at. */
  readonly stage: number;
  readonly consumerId: string;
}

export interface Delivery {
  readonly consumerId: string;
  readonly planetId: string;
  readonly stock: Readonly<Partial<Record<Material, number>>>;
}

export interface NetworkEconomyState {
  readonly transits: readonly Transit[];
  readonly deliveries: readonly Delivery[];
}

export interface CapturedCargo {
  readonly material: Material;
  readonly amount: number;
}

function byId(a: string, b: string): number {
  return a.localeCompare(b, 'en');
}

export class NetworkEconomy {
  #transits: Transit[];
  #deliveries = new Map<string, Delivery>();

  constructor(state: NetworkEconomyState = { transits: [], deliveries: [] }) {
    this.#transits = state.transits.map((transit) => ({
      ...transit,
      path: [...transit.path],
    }));
    for (const delivery of state.deliveries)
      this.#deliveries.set(delivery.consumerId, {
        ...delivery,
        stock: { ...delivery.stock },
      });
  }

  snapshot(): NetworkEconomyState {
    return structuredClone({
      transits: this.#transits,
      deliveries: [...this.#deliveries.values()],
    });
  }

  get transits(): readonly Transit[] {
    return this.#transits;
  }

  /** produktionsnatverk: planets joined by the given links, sorted by id. */
  static groups(
    planetIds: readonly string[],
    links: readonly NetworkLink[],
  ): readonly (readonly string[])[] {
    const seen = new Set<string>();
    const groups: string[][] = [];
    for (const id of [...planetIds].sort(byId)) {
      if (seen.has(id)) continue;
      const group = [...NetworkEconomy.rounds(id, links).keys()]
        .filter((member) => planetIds.includes(member))
        .sort(byId);
      for (const member of group) seen.add(member);
      groups.push(group);
    }
    return groups;
  }

  /** en-runda-per-lank: rounds from one planet to every reachable planet. */
  static rounds(
    from: string,
    links: readonly NetworkLink[],
  ): ReadonlyMap<string, number> {
    return new Map(
      [...NetworkEconomy.#paths(from, links)].map(([id, path]) => [
        id,
        path.length - 1,
      ]),
    );
  }

  /** kortaste-vag-i-lankar: fewest links, neighbours visited by id. */
  static #paths(
    from: string,
    links: readonly NetworkLink[],
  ): ReadonlyMap<string, readonly string[]> {
    const paths = new Map<string, readonly string[]>([[from, [from]]]);
    const queue = [from];
    for (let current = queue.shift(); current; current = queue.shift()) {
      const path = paths.get(current) ?? [current];
      const neighbours = links
        .flatMap((link) =>
          link.a === current ? [link.b] : link.b === current ? [link.a] : [],
        )
        .sort(byId);
      for (const neighbour of neighbours)
        if (!paths.has(neighbour)) {
          paths.set(neighbour, [...path, neighbour]);
          queue.push(neighbour);
        }
    }
    return paths;
  }

  delivered(consumerId: string): Readonly<Partial<Record<Material, number>>> {
    return this.#deliveries.get(consumerId)?.stock ?? {};
  }

  incoming(consumerId: string): readonly Transit[] {
    return this.#transits.filter(
      (transit) => transit.consumerId === consumerId,
    );
  }

  /** Rounds until the slowest goods on the way to a consumer arrive. */
  arrivalRounds(consumerId: string): number {
    return Math.max(
      0,
      ...this.incoming(consumerId).map(
        (transit) => transit.path.length - 1 - transit.stage,
      ),
    );
  }

  ready(consumer: NetworkConsumer): boolean {
    const delivered = this.delivered(consumer.id);
    return MATERIALS.every(
      (material) =>
        (delivered[material] ?? 0) >= (consumer.needs[material] ?? 0),
    );
  }

  /** Removes the delivered goods of a finished consumer. */
  consume(consumerId: string): void {
    this.#deliveries.delete(consumerId);
  }

  /**
   * Returns delivered goods to the consumer's planet. Goods on the way
   * continue and are unloaded into the destination's stock.
   */
  cancel(consumerId: string, port: NetworkPort): void {
    const delivery = this.#deliveries.get(consumerId);
    if (delivery) {
      const warehouse = this.#warehouse(port, delivery.planetId);
      if (warehouse) this.#add(warehouse.stock, delivery.stock);
      this.#deliveries.delete(consumerId);
    }
    this.#transits = this.#transits.map((transit) =>
      transit.consumerId === consumerId
        ? { ...transit, consumerId: '' }
        : transit,
    );
  }

  /**
   * standardregel-vid-brist: consumers are served oldest first, then products
   * before buildings before parts. Local goods are reserved at once; goods
   * from other planets in the group start along the shortest path.
   */
  allocate(consumers: readonly NetworkConsumer[], port: NetworkPort): void {
    const ordered = [...consumers].sort(
      (a, b) =>
        a.since - b.since ||
        KIND_RANK[a.kind] - KIND_RANK[b.kind] ||
        byId(a.id, b.id),
    );
    for (const consumer of ordered) {
      const paths = NetworkEconomy.#paths(consumer.planetId, port.links);
      const sources = [...paths.entries()]
        .map(([id, path]) => ({ warehouse: this.#warehouse(port, id), path }))
        .filter(
          (
            source,
          ): source is {
            warehouse: NetworkWarehouse;
            path: readonly string[];
          } => source.warehouse !== undefined,
        )
        .sort(
          (a, b) =>
            a.path.length - b.path.length ||
            byId(a.warehouse.id, b.warehouse.id),
        );
      for (const material of MATERIALS) {
        let missing = this.#missing(consumer, material);
        for (const { warehouse, path } of sources) {
          if (missing <= 0) break;
          const amount = Math.min(missing, warehouse.stock[material]);
          if (amount <= 0) continue;
          warehouse.stock[material] -= amount;
          missing -= amount;
          if (path.length === 1) this.#deliver(consumer, material, amount);
          else
            this.#transits.push({
              id: port.id('transit'),
              material,
              amount,
              path: [...path].reverse(),
              stage: 0,
              consumerId: consumer.id,
            });
        }
      }
    }
  }

  /**
   * One round passes: every transit crosses one link. Goods whose next link
   * is gone stay where they are (varor-stannar-vid-delning).
   */
  advance(consumers: readonly NetworkConsumer[], port: NetworkPort): void {
    const byConsumer = new Map(
      consumers.map((consumer) => [consumer.id, consumer]),
    );
    const moving: Transit[] = [];
    for (const transit of this.#transits) {
      const here = transit.path[transit.stage];
      const next = transit.path[transit.stage + 1];
      if (!here || !next || !this.#linked(port, here, next)) {
        this.#unload(port, here ?? '', transit);
        continue;
      }
      const moved = { ...transit, stage: transit.stage + 1 };
      if (moved.stage < moved.path.length - 1) {
        moving.push(moved);
        continue;
      }
      const consumer = byConsumer.get(transit.consumerId);
      if (consumer && consumer.planetId === next)
        this.#deliver(consumer, transit.material, transit.amount);
      else this.#unload(port, next, transit);
    }
    this.#transits = moving;
  }

  /** erovrad-last: removes and returns what is crossing a lost link. */
  capture(link: NetworkLink): readonly CapturedCargo[] {
    const crossing = (transit: Transit) => {
      const here = transit.path[transit.stage];
      const next = transit.path[transit.stage + 1];
      return (
        (here === link.a && next === link.b) ||
        (here === link.b && next === link.a)
      );
    };
    const captured = this.#transits
      .filter(crossing)
      .map(({ material, amount }) => ({ material, amount }));
    this.#transits = this.#transits.filter((transit) => !crossing(transit));
    return captured;
  }

  #missing(consumer: NetworkConsumer, material: Material): number {
    const delivered = this.delivered(consumer.id)[material] ?? 0;
    const travelling = this.incoming(consumer.id)
      .filter((transit) => transit.material === material)
      .reduce((sum, transit) => sum + transit.amount, 0);
    return (consumer.needs[material] ?? 0) - delivered - travelling;
  }

  #deliver(
    consumer: NetworkConsumer,
    material: Material,
    amount: number,
  ): void {
    const delivery = this.#deliveries.get(consumer.id) ?? {
      consumerId: consumer.id,
      planetId: consumer.planetId,
      stock: {},
    };
    this.#deliveries.set(consumer.id, {
      ...delivery,
      stock: {
        ...delivery.stock,
        [material]: (delivery.stock[material] ?? 0) + amount,
      },
    });
  }

  #unload(port: NetworkPort, planetId: string, transit: Transit): void {
    const warehouse = this.#warehouse(port, planetId);
    if (warehouse) warehouse.stock[transit.material] += transit.amount;
  }

  #add(stock: Stock, goods: Readonly<Partial<Record<Material, number>>>): void {
    for (const material of MATERIALS) stock[material] += goods[material] ?? 0;
  }

  #warehouse(port: NetworkPort, id: string): NetworkWarehouse | undefined {
    return port.warehouses.find((warehouse) => warehouse.id === id);
  }

  #linked(port: NetworkPort, a: string, b: string): boolean {
    return port.links.some(
      (link) =>
        (link.a === a && link.b === b) || (link.a === b && link.b === a),
    );
  }
}
