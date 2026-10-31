import type { Cost, ShipType, ShipUnit } from './Game.js';
import { HexCoordinate } from './HexCoordinate.js';
import type { Component } from './Economy.js';
import { engineCount as requiredEngines } from './ShipEquipment.js';
import type { Galaxy } from './Galaxy.js';

export interface Wreck {
  readonly id: string;
  readonly ship: ShipUnit;
  position: HexCoordinate;
  known: boolean;
  reservedBy: string | null;
  towedBy: string | null;
  yardId: string | null;
}
export interface Shipyard {
  readonly id: string;
  readonly facilityId: string;
  readonly planetId: string;
  readonly position: HexCoordinate;
  readonly builtRound: number;
  destroyed: boolean;
  queue: string[];
  orbitFleetId: string | null;
  issue: string | null;
}
export interface SalvageOrder {
  readonly fleetId: string;
  targets: string[];
  yardId: string | null;
  issue: string | null;
}
export interface BattleReport {
  readonly fleetIds?: readonly string[];
  readonly eventId?: string;
  readonly position: { readonly q: number; readonly r: number };
  readonly fleetId: string | null;
  readonly title: string;
  readonly summary: string;
  readonly wreckIds: readonly string[];
}
export interface SalvageFleet {
  readonly id: string;
  readonly ships: Readonly<Record<ShipType, number>>;
  position: HexCoordinate | null;
  destination: HexCoordinate | null;
  courseOrigin?: HexCoordinate;
}
export type WreckSnapshot = Readonly<Omit<Wreck, 'ship'>> & {
  readonly ship: ShipUnit;
};
export type ShipyardSnapshot = Readonly<Omit<Shipyard, 'queue'>> & {
  readonly queue: readonly string[];
};

/** bargningsorder / orbitalt-varv: physical wrecks and docking have one owner. */
export class Salvage {
  readonly wrecks: Wreck[] = [];
  readonly yards: Shipyard[] = [];
  readonly orders: SalvageOrder[] = [];

  static seed(galaxy: Galaxy): Salvage {
    const salvage = new Salvage();
    const positions = HexCoordinate.disk(galaxy.radius).filter((position) =>
      galaxy.isPassable(position),
    );
    for (const [name, level, ion] of [
      ['nadir', 2, 0],
      ['aster', 3, 2],
    ] as const) {
      const star = galaxy.systems.find(
        (system) => system.star.id === name,
      )?.star;
      if (!star) continue;
      // vrak-utanfor-stjarnor: derelicts must be reachable by salvage fleets.
      const position = positions
        .toSorted(
          (a, b) => a.distanceTo(star.position) - b.distanceTo(star.position),
        )
        .find(
          (position) =>
            !salvage.wrecks.some(
              (wreck) => wreck.position.key === position.key,
            ),
        );
      if (!position) continue;
      salvage.addWreck(
        `wreck-${name}-explorer`,
        {
          id: `derelict-${name}-explorer`,
          type: 'Exploration ship',
          telescope: level,
          engines: { 'Rocket engine': 2 - ion, 'Ion pulse engine': ion },
        },
        position,
        false,
      );
    }
    return salvage;
  }

  static restore(
    saved: unknown,
    contains: (position: HexCoordinate) => boolean,
    fleetIds: ReadonlySet<string>,
    facilities: ReadonlyMap<string, string>,
  ): Salvage {
    const data = saved as {
      wrecks: Wreck[];
      yards: Shipyard[];
      orders: SalvageOrder[];
    };
    if (
      !data ||
      !Array.isArray(data.wrecks) ||
      !Array.isArray(data.yards) ||
      !Array.isArray(data.orders)
    )
      throw new Error('Invalid salvage state.');
    const result = new Salvage();
    for (const yard of structuredClone(data.yards)) {
      const position = new HexCoordinate(yard.position.q, yard.position.r);
      if (
        !contains(position) ||
        facilities.get(yard.facilityId) !== yard.planetId ||
        !Array.isArray(yard.queue) ||
        typeof yard.destroyed !== 'boolean' ||
        !Number.isSafeInteger(yard.builtRound) ||
        yard.builtRound < 1
      )
        throw new Error('Invalid saved shipyard.');
      result.yards.push({ ...yard, position });
    }
    for (const wreck of structuredClone(data.wrecks)) {
      const position = new HexCoordinate(wreck.position.q, wreck.position.r);
      if (
        !contains(position) ||
        typeof wreck.known !== 'boolean' ||
        (wreck.towedBy && !fleetIds.has(wreck.towedBy)) ||
        (wreck.reservedBy && !fleetIds.has(wreck.reservedBy)) ||
        (wreck.yardId &&
          !result.yards.some(
            (yard) => yard.id === wreck.yardId && !yard.destroyed,
          )) ||
        !wreck.ship?.id ||
        ![
          'Fighter',
          'Space pirate',
          'Exploration ship',
          'Colony ship',
          'Transport ship',
          'Salvage ship',
          'Civilian shuttle',
        ].includes(wreck.ship.type) ||
        !Number.isInteger(wreck.ship.engines?.['Rocket engine']) ||
        !Number.isInteger(wreck.ship.engines?.['Ion pulse engine']) ||
        Object.values(wreck.ship.engines).some((n) => n < 0) ||
        (wreck.ship.type === 'Exploration ship' &&
          ![1, 2, 3].includes(wreck.ship.telescope!))
      )
        throw new Error('Invalid saved wreck.');
      result.wrecks.push({ ...wreck, position });
    }
    for (const order of structuredClone(data.orders)) {
      if (
        !fleetIds.has(order.fleetId) ||
        !Array.isArray(order.targets) ||
        order.targets.some(
          (id) =>
            !result.wrecks.some(
              (wreck) => wreck.id === id && wreck.reservedBy === order.fleetId,
            ),
        )
      )
        throw new Error('Invalid saved salvage order.');
      result.orders.push(order);
    }
    for (const items of [result.wrecks, result.yards])
      if (new Set(items.map((item) => item.id)).size !== items.length)
        throw new Error('Duplicate salvage object ID.');
    if (
      new Set(result.orders.map((order) => order.fleetId)).size !==
      result.orders.length
    )
      throw new Error('Duplicate salvage order.');
    for (const yard of result.yards)
      if (
        !yard.id ||
        new Set(yard.queue).size !== yard.queue.length ||
        (yard.destroyed && yard.queue.length) ||
        yard.queue.some(
          (id) =>
            !result.wrecks.some(
              (wreck) => wreck.id === id && wreck.yardId === yard.id,
            ),
        )
      )
        throw new Error('Invalid repair queue.');
    if (
      new Set(result.yards.map((yard) => yard.facilityId)).size !==
        result.yards.length ||
      new Set(
        result.yards
          .filter((yard) => !yard.destroyed)
          .map((yard) => yard.position.key),
      ).size !== result.yards.filter((yard) => !yard.destroyed).length
    )
      throw new Error('Duplicate shipyard station.');
    for (const wreck of result.wrecks) {
      const engineCount = Object.values(wreck.ship.engines).reduce(
        (total, amount) => total + amount,
        0,
      );
      if (!wreck.id || engineCount !== requiredEngines(wreck.ship.type))
        throw new Error('Invalid wreck engines.');
      if (
        wreck.yardId &&
        (wreck.towedBy ||
          wreck.reservedBy ||
          !result.yards.some(
            (yard) =>
              yard.id === wreck.yardId &&
              yard.position.key === wreck.position.key &&
              yard.queue.includes(wreck.id),
          ))
      )
        throw new Error('Inconsistent wreck docking.');
      if (wreck.towedBy && wreck.reservedBy !== wreck.towedBy)
        throw new Error('Invalid tow reservation.');
      if (
        wreck.reservedBy &&
        !wreck.towedBy &&
        !result.orders.some(
          (order) =>
            order.fleetId === wreck.reservedBy &&
            order.targets.includes(wreck.id),
        )
      )
        throw new Error('Missing salvage order.');
    }
    return result;
  }

  snapshot() {
    return structuredClone({
      wrecks: this.wrecks,
      yards: this.yards,
      orders: this.orders,
    });
  }
  wreckSnapshots(): readonly WreckSnapshot[] {
    return Object.freeze(
      this.wrecks
        .filter((wreck) => wreck.known)
        .map((wreck) =>
          Object.freeze({
            ...wreck,
            ship: Object.freeze({
              ...wreck.ship,
              engines: Object.freeze({ ...wreck.ship.engines }),
            }),
          }),
        ),
    );
  }
  yardSnapshots(): readonly ShipyardSnapshot[] {
    return Object.freeze(
      this.yards.map((yard) =>
        Object.freeze({ ...yard, queue: Object.freeze([...yard.queue]) }),
      ),
    );
  }
  addWreck(
    id: string,
    ship: ShipUnit,
    position: HexCoordinate,
    known = true,
  ): Wreck {
    const wreck = {
      id,
      ship: structuredClone(ship),
      position,
      known,
      reservedBy: null,
      towedBy: null,
      yardId: null,
    };
    this.wrecks.push(wreck);
    return wreck;
  }
  towing(fleetId: string): readonly Wreck[] {
    return this.wrecks.filter((wreck) => wreck.towedBy === fleetId);
  }
  order(fleetId: string): SalvageOrder | undefined {
    return this.orders.find((order) => order.fleetId === fleetId);
  }
  static availableCapacity(
    fleet: Pick<SalvageFleet, 'id' | 'ships'>,
    wrecks: readonly Pick<Wreck, 'reservedBy' | 'towedBy'>[],
  ): number {
    const assigned = wrecks.filter(
      (wreck) => wreck.reservedBy === fleet.id || wreck.towedBy === fleet.id,
    ).length;
    return Math.max(0, fleet.ships['Salvage ship'] - assigned);
  }
  assign(fleet: SalvageFleet, id: string): void {
    const wreck = this.wrecks.find((wreck) => wreck.id === id && wreck.known);
    if (!fleet.position || !fleet.ships['Salvage ship'])
      throw new Error('Choose a fleet with a Salvage ship.');
    if (!wreck || wreck.reservedBy || wreck.towedBy || wreck.yardId)
      throw new Error('This wreck is not available for salvage.');
    if (Salvage.availableCapacity(fleet, this.wrecks) === 0)
      throw new Error('One Salvage ship is required for each assigned wreck.');
    wreck.reservedBy = fleet.id;
    const order = this.order(fleet.id) ?? {
      fleetId: fleet.id,
      targets: [],
      yardId: null,
      issue: null,
    };
    if (!this.orders.includes(order)) this.orders.push(order);
    order.targets.push(id);
  }
  stop(fleetId: string): void {
    for (const wreck of this.wrecks)
      if (wreck.reservedBy === fleetId && !wreck.towedBy)
        wreck.reservedBy = null;
    const index = this.orders.findIndex((order) => order.fleetId === fleetId);
    if (index >= 0) this.orders.splice(index, 1);
  }
  returnHome(fleet: SalvageFleet): void {
    if (!this.towing(fleet.id).length)
      throw new Error('This fleet is not towing a wreck.');
    this.stop(fleet.id);
    this.orders.push({
      fleetId: fleet.id,
      targets: [],
      yardId: null,
      issue: null,
    });
  }
  release(fleet: SalvageFleet, id: string): void {
    const wreck = this.wrecks.find(
      (wreck) => wreck.id === id && wreck.towedBy === fleet.id,
    );
    if (!wreck || !fleet.position)
      throw new Error('Choose a wreck towed by this fleet.');
    wreck.position = fleet.position;
    wreck.towedBy = null;
    wreck.reservedBy = null;
  }
  follow(fleet: SalvageFleet): void {
    if (fleet.position)
      for (const wreck of this.towing(fleet.id))
        wreck.position = fleet.position;
  }
  releaseLostCapacity(fleet: SalvageFleet, position: HexCoordinate): void {
    const excess = this.towing(fleet.id).slice(fleet.ships['Salvage ship']);
    for (const wreck of excess) {
      wreck.position = position;
      wreck.towedBy = null;
      wreck.reservedBy = null;
    }
    if (!fleet.position) this.stop(fleet.id);
  }
  destroyYard(yard: Shipyard): void {
    yard.destroyed = true;
    for (const wreck of this.wrecks.filter((wreck) => wreck.yardId === yard.id))
      wreck.yardId = null;
    yard.queue = [];
    yard.issue = null;
  }
  update(
    fleets: readonly SalvageFleet[],
    hostile: (position: HexCoordinate) => boolean,
    delivered: (wreck: Wreck, yard: Shipyard) => void,
  ): void {
    for (const fleet of fleets) this.follow(fleet);
    for (const yard of this.yards.filter(
      (yard) => !yard.destroyed && !hostile(yard.position),
    ))
      for (const wreck of this.wrecks.filter(
        (wreck) =>
          !wreck.yardId &&
          wreck.position.key === yard.position.key &&
          (wreck.towedBy || !wreck.reservedBy),
      )) {
        wreck.known = true;
        wreck.reservedBy = null;
        wreck.towedBy = null;
        wreck.yardId = yard.id;
        yard.queue.push(wreck.id);
        delivered(wreck, yard);
      }
    for (const order of [...this.orders]) {
      const fleet = fleets.find((fleet) => fleet.id === order.fleetId);
      if (!fleet?.position || !fleet.ships['Salvage ship']) {
        this.stop(order.fleetId);
        continue;
      }
      order.targets = order.targets.filter((id) =>
        this.wrecks.some(
          (wreck) =>
            wreck.id === id &&
            wreck.reservedBy === fleet.id &&
            !wreck.yardId &&
            !wreck.towedBy,
        ),
      );
      if (!hostile(fleet.position))
        for (const id of [...order.targets]) {
          const wreck = this.wrecks.find((wreck) => wreck.id === id)!;
          if (
            wreck.position.key === fleet.position.key &&
            this.towing(fleet.id).length < fleet.ships['Salvage ship']
          ) {
            wreck.towedBy = fleet.id;
            order.targets = order.targets.filter((target) => target !== id);
          }
        }
      const target = order.targets
        .map((id) => this.wrecks.find((wreck) => wreck.id === id)!)
        .sort(
          (a, b) =>
            fleet.position!.distanceTo(a.position) -
              fleet.position!.distanceTo(b.position) ||
            a.id.localeCompare(b.id),
        )[0];
      const yard =
        !target && this.towing(fleet.id).length
          ? this.yards
              .filter((yard) => !yard.destroyed)
              .sort(
                (a, b) =>
                  fleet.position!.distanceTo(a.position) -
                    fleet.position!.distanceTo(b.position) ||
                  a.id.localeCompare(b.id),
              )[0]
          : undefined;
      order.yardId = yard?.id ?? null;
      order.issue =
        !target && this.towing(fleet.id).length && !yard
          ? 'No completed shipyard is available.'
          : null;
      const destination = target?.position ?? yard?.position ?? null;
      if (fleet.destination?.key !== destination?.key) {
        fleet.destination = destination;
        if (destination) fleet.courseOrigin = fleet.position;
      }
      if (!target && !this.towing(fleet.id).length) {
        fleet.destination = null;
        this.stop(fleet.id);
      }
    }
  }
  completeRepair(yard: Shipyard): ShipUnit {
    const id = yard.queue.shift();
    const index = this.wrecks.findIndex((wreck) => wreck.id === id);
    if (index < 0) throw new Error('No wreck is awaiting repair.');
    return this.wrecks.splice(index, 1)[0]!.ship;
  }
  moveRepair(yardId: string, wreckId: string, index: number): void {
    const yard = this.yards.find(
      (candidate) => candidate.id === yardId && !candidate.destroyed,
    );
    if (
      !yard ||
      !yard.queue.includes(wreckId) ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= yard.queue.length
    )
      throw new Error('Choose a valid repair queue position.');
    const previous = yard.queue.indexOf(wreckId);
    yard.queue.splice(previous, 1);
    yard.queue.splice(index, 0, wreckId);
  }
  static components(ship: ShipUnit): Partial<Record<Component, number>> {
    return {
      ...ship.engines,
      ...(ship.type === 'Fighter' || ship.type === 'Space pirate'
        ? { 'Weapons module': 1 }
        : {}),
      ...(ship.telescope
        ? {
            [(['Telescope I', 'Telescope II', 'Telescope III'] as const)[
              ship.telescope - 1
            ]!]: 1,
          }
        : {}),
    };
  }
  static repairCost(
    ship: ShipUnit,
    costOf: (type: ShipType | Component) => Cost,
  ): Cost {
    const total = { ...costOf(ship.type) };
    for (const [part, amount] of Object.entries(this.components(ship))) {
      const cost = costOf(part as Component);
      for (const resource of ['Iron', 'Water', 'Oil'] as const)
        total[resource] += cost[resource] * amount;
    }
    return Object.fromEntries(
      Object.entries(total).map(([resource, amount]) => [
        resource,
        Math.ceil(amount / 3),
      ]),
    ) as unknown as Cost;
  }
}
