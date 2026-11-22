import type { HexCoordinate } from '../../common/HexCoordinate.js';

// fraktskepp-ger-forbindelse: trade routes and the transports that man them.
// Goods move through the production network (NetworkEconomy), not here.

export interface TradeRoute {
  id: string;
  a: string;
  b: string;
  closing: boolean;
}
export interface TransportFleet {
  ordersPaused?: boolean;
  id: string;
  readonly name?: string;
  position: HexCoordinate | null;
  destination: HexCoordinate | null;
  courseOrigin?: HexCoordinate;
  routeId?: string;
  releaseRequested?: boolean;
  ships: { readonly 'Transport ship': number };
}
export interface LogisticsPlanet {
  id: string;
  name: string;
  position: HexCoordinate;
}
export interface LogisticsPort {
  planets: readonly LogisticsPlanet[];
  fleets: readonly TransportFleet[];
  speed(fleet: TransportFleet): number;
  travelYears?(
    fleet: TransportFleet,
    from: HexCoordinate,
    to: HexCoordinate,
  ): number;
  id(prefix: string): string;
}
export interface TradeRouteSnapshot {
  readonly id: string;
  readonly a: string;
  readonly b: string;
  readonly from: string;
  readonly to: string;
  readonly start: HexCoordinate;
  readonly end: HexCoordinate;
  readonly closing: boolean;
  readonly fleetIds: readonly string[];
  readonly capacity: number;
  readonly hasActiveTransport: boolean;
  readonly waiting: number;
  readonly status: string;
}

export class Logistics {
  constructor(public routes: TradeRoute[] = []) {}

  activeCarriers(
    route: TradeRoute,
    port: LogisticsPort,
  ): readonly TransportFleet[] {
    return route.closing
      ? []
      : port.fleets.filter(
          (fleet) =>
            fleet.routeId === route.id &&
            !fleet.releaseRequested &&
            fleet.position &&
            fleet.ships['Transport ship'] > 0,
        );
  }

  create(a: string, b: string, port: LogisticsPort): string {
    if (
      a === b ||
      !port.planets.some((p) => p.id === a) ||
      !port.planets.some((p) => p.id === b)
    )
      throw new Error('Choose two different owned planets.');
    if (
      this.routes.some(
        (r) => !r.closing && [r.a, r.b].includes(a) && [r.a, r.b].includes(b),
      )
    )
      throw new Error('A trade route already connects these planets.');
    const id = port.id('route');
    this.routes.push({ id, a, b, closing: false });
    return id;
  }

  assign(routeId: string, fleet: TransportFleet, port: LogisticsPort): void {
    const route = this.routes.find((r) => r.id === routeId && !r.closing);
    if (
      !route ||
      fleet.routeId ||
      fleet.destination ||
      fleet.ships['Transport ship'] < 1 ||
      !fleet.position
    )
      throw new Error('Assign an idle transport fleet with a position.');
    fleet.routeId = routeId;
    fleet.releaseRequested = false;
    // ruttflotta-till-narmaste-andplanet / fraktskepp-pendlar: travel to the
    // nearer end first; Game then sends it between the ends every round.
    const a = port.planets.find((planet) => planet.id === route.a)!;
    const b = port.planets.find((planet) => planet.id === route.b)!;
    const endpoint =
      fleet.position.distanceTo(a.position) <=
      fleet.position.distanceTo(b.position)
        ? a
        : b;
    if (fleet.position.key !== endpoint.position.key) {
      fleet.courseOrigin = fleet.position;
      fleet.destination = endpoint.position;
    }
  }

  release(fleet: TransportFleet): void {
    if (fleet.destination) fleet.releaseRequested = true;
    else {
      delete fleet.routeId;
      delete fleet.releaseRequested;
    }
  }

  close(id: string, port: LogisticsPort): void {
    const route = this.routes.find((r) => r.id === id);
    if (!route) throw new Error('Trade route not found.');
    route.closing = true;
    for (const fleet of port.fleets.filter((f) => f.routeId === id))
      this.release(fleet);
    this.cleanup(port);
  }

  /** Closed routes disappear once no fleet still refers to them. */
  cleanup(port: LogisticsPort): void {
    this.routes = this.routes.filter(
      (r) => !r.closing || port.fleets.some((f) => f.routeId === r.id),
    );
  }

  snapshots(port: LogisticsPort): readonly TradeRouteSnapshot[] {
    return Object.freeze(
      this.routes.map((r) => {
        const a = port.planets.find((p) => p.id === r.a)!;
        const b = port.planets.find((p) => p.id === r.b)!;
        const fleets = port.fleets.filter((f) => f.routeId === r.id);
        const active = this.activeCarriers(r, port).length > 0;
        return Object.freeze({
          ...r,
          from: a.name,
          to: b.name,
          start: a.position,
          end: b.position,
          fleetIds: Object.freeze(fleets.map((f) => f.id)),
          capacity: fleets.reduce(
            (sum, f) => sum + f.ships['Transport ship'] * 30,
            0,
          ),
          hasActiveTransport: active,
          waiting: 0,
          status: r.closing
            ? 'Closing'
            : active
              ? 'Active'
              : 'Needs transport fleet',
        });
      }),
    );
  }

  /** Planets along the open routes with the fewest links. */
  path(from: string, to: string): { planets: string[]; years: number } | null {
    const queue = [{ planets: [from], years: 0 }];
    const visited = new Set<string>();
    while (queue.length) {
      const current = queue.shift()!;
      const last = current.planets.at(-1)!;
      if (last === to) return current;
      if (visited.has(last)) continue;
      visited.add(last);
      for (const route of this.routes
        .filter((r) => !r.closing && [r.a, r.b].includes(last))
        .sort((x, y) => x.id.localeCompare(y.id))) {
        const next = route.a === last ? route.b : route.a;
        queue.push({
          planets: [...current.planets, next],
          years: current.years + 1,
        });
      }
    }
    return null;
  }
}
