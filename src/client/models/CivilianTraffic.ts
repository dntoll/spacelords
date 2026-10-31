import type { HexCoordinate } from './HexCoordinate.js';
import type { TradeRoute } from './Logistics.js';

export const SHUTTLE_CAPACITY = 500;

export interface CivilianOrder {
  passengers: number;
  reserved: number;
  sourceId?: string | undefined;
  targetId?: string | undefined;
  nextPlanetId?: string;
  legRouteId?: string;
  path: string[];
  stopping: boolean;
  status: string;
}

export interface CivilianFleet {
  ordersPaused?: boolean;
  id: string;
  name: string;
  ships: { readonly 'Civilian shuttle': number };
  position: HexCoordinate | null;
  destination: HexCoordinate | null;
  courseOrigin?: HexCoordinate;
  civilian?: CivilianOrder;
}

export interface CivilianPlanet {
  id: string;
  name: string;
  position: HexCoordinate;
  population: number;
  capacity: number;
  workforce: number;
}

export interface CivilianPort {
  planets: readonly CivilianPlanet[];
  fleets: readonly CivilianFleet[];
  routes: readonly TradeRoute[];
  travelYears(
    fleet: CivilianFleet,
    from: HexCoordinate,
    to: HexCoordinate,
  ): number;
  event(message: string, position: HexCoordinate): void;
}

/** automatisk-arbetskraftstrafik: reservations protect both jobs and residents. */
export class CivilianTraffic {
  static order(): CivilianOrder {
    return {
      passengers: 0,
      reserved: 0,
      path: [],
      stopping: false,
      status: 'Waiting for passengers and available jobs',
    };
  }

  static validate(
    order: CivilianOrder,
    capacity: number,
    planetExists: (id: string) => boolean,
  ): void {
    if (
      !order ||
      !Number.isSafeInteger(order.passengers) ||
      order.passengers < 0 ||
      order.passengers > capacity ||
      !Number.isSafeInteger(order.reserved) ||
      order.reserved < 0 ||
      order.reserved > capacity ||
      typeof order.stopping !== 'boolean' ||
      typeof order.status !== 'string' ||
      !Array.isArray(order.path) ||
      order.path.some((id) => !planetExists(id)) ||
      [order.sourceId, order.targetId, order.nextPlanetId].some(
        (id) => id !== undefined && !planetExists(id),
      ) ||
      (order.legRouteId !== undefined &&
        typeof order.legRouteId !== 'string') ||
      ((order.passengers > 0 || order.reserved > 0) &&
        (!order.sourceId || !order.targetId))
    )
      throw new Error('Invalid saved civilian transport order.');
  }

  stop(fleet: CivilianFleet): void {
    if (!fleet.civilian) return;
    if (fleet.civilian.passengers) {
      if (!fleet.civilian.stopping)
        fleet.civilian.status = `Stopping after delivery: ${fleet.civilian.status}`;
      fleet.civilian.stopping = true;
    } else {
      delete fleet.civilian;
      fleet.destination = null;
      delete fleet.courseOrigin;
    }
  }

  prepare(port: CivilianPort): void {
    for (const fleet of this.#fleets(port)) {
      if (fleet.ordersPaused) continue;
      const order = fleet.civilian!;
      if (fleet.destination || !fleet.position) continue;
      if (!fleet.ships['Civilian shuttle']) {
        delete fleet.civilian;
        continue;
      }
      const current = port.planets.find(
        (p) => p.position.key === fleet.position!.key,
      );
      if (!current) {
        order.reserved = 0;
        order.status = 'Waiting at a trade route endpoint required';
        continue;
      }
      if (order.passengers) {
        this.#deliveryTarget(fleet, current, port);
      } else {
        if (order.stopping) {
          delete fleet.civilian;
          continue;
        }
        this.#pickup(fleet, current, port);
      }
      if (!fleet.civilian) continue;
      if (order.passengers && !order.reserved) continue;
      const target = port.planets.find(
        (p) => p.id === (order.passengers ? order.targetId : order.sourceId),
      );
      const route = target && this.#path(fleet, current.id, target.id, port);
      order.path = route?.planets ?? [];
      const next = route && port.planets.find((p) => p.id === route.planets[1]);
      if (next) {
        fleet.destination = next.position;
        fleet.courseOrigin = fleet.position;
        order.nextPlanetId = next.id;
        order.legRouteId = port.routes.find(
          (r) =>
            !r.closing &&
            [r.a, r.b].includes(current.id) &&
            [r.a, r.b].includes(next.id),
        )!.id;
        order.status = `${order.stopping ? 'Stopping after delivery: ' : ''}${order.passengers ? `Transporting ${order.passengers} passengers to ${target.name}` : `Collecting passengers at ${target.name}`}`;
      }
    }
  }

  // civiltrafik-pa-handelsnatet: arrivals never grant movement on the next leg this year.
  arrive(port: CivilianPort): void {
    for (const fleet of this.#fleets(port)) {
      if (fleet.destination || !fleet.position) continue;
      const order = fleet.civilian!;
      delete order.nextPlanetId;
      delete order.legRouteId;
      order.path = [];
      if (!order.passengers) continue;
      const current = port.planets.find(
        (p) => p.position.key === fleet.position!.key,
      );
      if (!current) continue;
      const fallback = this.#deliveryTarget(fleet, current, port);
      if (order.targetId !== current.id) continue;
      const amount = Math.min(
        order.passengers,
        this.#room(current, fleet, port),
        fallback ? Infinity : this.#need(current, fleet, port),
      );
      if (amount <= 0) continue;
      current.population += amount;
      order.passengers -= amount;
      order.reserved = Math.max(0, order.reserved - amount);
      port.event(
        `${fleet.name} arrived at ${current.name} and delivered ${amount} passengers.`,
        current.position,
      );
      if (!order.passengers) {
        if (order.stopping) delete fleet.civilian;
        else fleet.civilian = CivilianTraffic.order();
      }
    }
  }

  #fleets(port: CivilianPort): CivilianFleet[] {
    return port.fleets
      .filter((f) => f.civilian)
      .toSorted((a, b) => a.id.localeCompare(b.id));
  }

  #booked(
    planet: CivilianPlanet,
    fleet: CivilianFleet,
    port: CivilianPort,
  ): number {
    return port.fleets
      .filter((f) => f.id !== fleet.id && f.civilian?.targetId === planet.id)
      .reduce((n, f) => n + f.civilian!.reserved, 0);
  }
  #room(
    planet: CivilianPlanet,
    fleet: CivilianFleet,
    port: CivilianPort,
  ): number {
    return Math.max(
      0,
      planet.capacity - planet.population - this.#booked(planet, fleet, port),
    );
  }
  #need(
    planet: CivilianPlanet,
    fleet: CivilianFleet,
    port: CivilianPort,
  ): number {
    return Math.max(
      0,
      Math.min(
        planet.workforce -
          planet.population -
          this.#booked(planet, fleet, port),
        this.#room(planet, fleet, port),
      ),
    );
  }
  #surplus(
    planet: CivilianPlanet,
    fleet: CivilianFleet,
    port: CivilianPort,
  ): number {
    const booked = port.fleets
      .filter(
        (f) =>
          f.id !== fleet.id &&
          f.civilian?.sourceId === planet.id &&
          !f.civilian.passengers,
      )
      .reduce((n, f) => n + f.civilian!.reserved, 0);
    return Math.max(
      0,
      planet.population - Math.max(1000, planet.workforce) - booked,
    );
  }

  #pickup(
    fleet: CivilianFleet,
    current: CivilianPlanet,
    port: CivilianPort,
  ): void {
    const order = fleet.civilian!;
    const candidates = port.planets
      .flatMap((source) => {
        const surplus = this.#surplus(source, fleet, port);
        if (!surplus) return [];
        const pickup = this.#path(fleet, current.id, source.id, port);
        if (!pickup) return [];
        return port.planets.flatMap((target) => {
          if (target.id === source.id) return [];
          const need = this.#need(target, fleet, port);
          if (!need) return [];
          const delivery = this.#path(fleet, source.id, target.id, port);
          return delivery
            ? [
                {
                  source,
                  target,
                  amount: Math.min(
                    surplus,
                    need,
                    fleet.ships['Civilian shuttle'] * SHUTTLE_CAPACITY,
                  ),
                  years: pickup.years + delivery.years,
                },
              ]
            : [];
        });
      })
      .sort(
        (a, b) =>
          a.years - b.years ||
          a.source.id.localeCompare(b.source.id) ||
          a.target.id.localeCompare(b.target.id),
      );
    const chosen = candidates[0];
    order.reserved = chosen?.amount ?? 0;
    order.path = [];
    delete order.sourceId;
    delete order.targetId;
    if (!chosen) {
      order.status = 'Waiting for passengers and available jobs';
      return;
    }
    order.sourceId = chosen.source.id;
    order.targetId = chosen.target.id;
    if (current.id === chosen.source.id) {
      chosen.source.population -= chosen.amount;
      order.passengers = chosen.amount;
      port.event(
        `${fleet.name} boarded ${chosen.amount} passengers at ${chosen.source.name} for ${chosen.target.name}.`,
        chosen.source.position,
      );
    }
  }

  #deliveryTarget(
    fleet: CivilianFleet,
    current: CivilianPlanet,
    port: CivilianPort,
  ): boolean {
    const order = fleet.civilian!;
    const candidates = port.planets
      .flatMap((target) => {
        const need = this.#need(target, fleet, port);
        const route = need && this.#path(fleet, current.id, target.id, port);
        return route ? [{ target, route, need }] : [];
      })
      .sort(
        (a, b) =>
          Number(b.target.id === order.targetId && b.need >= order.passengers) -
            Number(
              a.target.id === order.targetId && a.need >= order.passengers,
            ) ||
          a.route.years - b.route.years ||
          a.target.id.localeCompare(b.target.id),
      );
    let chosen = candidates[0];
    const fallback = !chosen;
    if (!chosen) {
      chosen = port.planets
        .flatMap((target) => {
          const room = this.#room(target, fleet, port);
          const route = room && this.#path(fleet, current.id, target.id, port);
          return route ? [{ target, route, need: room }] : [];
        })
        .sort(
          (a, b) =>
            Number(b.target.id === order.sourceId) -
              Number(a.target.id === order.sourceId) ||
            a.route.years - b.route.years ||
            a.target.id.localeCompare(b.target.id),
        )[0];
    }
    order.targetId = chosen?.target.id;
    order.reserved = chosen ? Math.min(order.passengers, chosen.need) : 0;
    order.path = chosen?.route.planets ?? [];
    if (chosen)
      order.status = `${order.stopping ? 'Stopping after delivery: ' : ''}${order.passengers} passengers for ${chosen.target.name}`;
    if (!chosen) {
      // Keep a valid home reference even when every reachable colony is full.
      order.targetId = order.sourceId;
      order.status = 'Waiting onboard: no reachable colony has space';
    }
    return fallback;
  }

  #path(
    fleet: CivilianFleet,
    from: string,
    to: string,
    port: CivilianPort,
  ): { planets: string[]; years: number } | null {
    const queue = [{ planets: [from], years: 0 }];
    const visited = new Set<string>();
    while (queue.length) {
      queue.sort(
        (a, b) =>
          a.years - b.years || a.planets.join().localeCompare(b.planets.join()),
      );
      const current = queue.shift()!;
      const last = current.planets.at(-1)!;
      if (last === to) return current;
      if (visited.has(last)) continue;
      visited.add(last);
      const origin = port.planets.find((p) => p.id === last)!;
      for (const route of port.routes.filter(
        (r) => !r.closing && [r.a, r.b].includes(last),
      )) {
        const next = route.a === last ? route.b : route.a;
        const target = port.planets.find((p) => p.id === next);
        if (!target || visited.has(next)) continue;
        const years = port.travelYears(fleet, origin.position, target.position);
        if (Number.isFinite(years))
          queue.push({
            planets: [...current.planets, next],
            years: current.years + Math.max(1, Math.ceil(years)),
          });
      }
    }
    return null;
  }
}
