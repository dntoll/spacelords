import { MATERIALS, emptyStock, type Material, type Stock } from './Economy.js';
import type { HexCoordinate } from './HexCoordinate.js';

export interface TradeRoute {
  id: string;
  a: string;
  b: string;
  closing: boolean;
}
export interface Shipment {
  id: string;
  resource: Material;
  amount: number;
  path: string[];
  stage: number;
  projectId: string;
  recipient: string;
  fleetId: string | null;
  committed?: boolean;
}
export interface TransportFleet {
  id: string;
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
  stock: Stock;
  demand: Stock;
  projects: readonly { id: string; cost: Readonly<Stock> }[];
}
export interface LogisticsPort {
  planets: readonly LogisticsPlanet[];
  fleets: readonly TransportFleet[];
  speed(fleet: TransportFleet): number;
  id(prefix: string): string;
  event(message: string): void;
  projectExists(id: string): boolean;
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
  readonly waiting: number;
  readonly status: string;
}

// handelsnatverk: shipments retain ownership across warehouses and route links.
export class Logistics {
  constructor(
    public routes: TradeRoute[] = [],
    public shipments: Shipment[] = [],
  ) {}

  incoming(planetId: string): Stock {
    const stock = emptyStock();
    for (const shipment of this.shipments)
      if (shipment.recipient === planetId)
        stock[shipment.resource] += shipment.amount;
    return stock;
  }

  reserved(planetId: string): Stock {
    const reserved = emptyStock();
    for (const shipment of this.shipments)
      if (!shipment.fleetId && shipment.path[shipment.stage] === planetId)
        reserved[shipment.resource] += shipment.amount;
    return reserved;
  }

  create(a: string, b: string, port: LogisticsPort): string {
    if (
      a === b ||
      !port.planets.some((p) => p.id === a) ||
      !port.planets.some((p) => p.id === b)
    )
      throw new Error('Choose two different owned planets.');
    if (
      this.routes.some((r) => [r.a, r.b].includes(a) && [r.a, r.b].includes(b))
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
    // ruttflotta-till-narmaste-andplanet: travel physically before serving the route.
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
    if (fleet.destination || this.shipments.some((s) => s.fleetId === fleet.id))
      fleet.releaseRequested = true;
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

  cleanup(port: LogisticsPort): void {
    this.shipments = this.shipments.filter(
      (s) =>
        s.fleetId ||
        ((s.committed || port.projectExists(s.projectId)) &&
          s.path
            .slice(s.stage, -1)
            .every((p, i) =>
              this.routes.some(
                (r) =>
                  !r.closing &&
                  [r.a, r.b].includes(p) &&
                  [r.a, r.b].includes(s.path[s.stage + i + 1]!),
              ),
            )),
    );
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
          waiting: this.shipments
            .filter((s) => !s.fleetId && this.#routeFor(s)?.id === r.id)
            .reduce((sum, s) => sum + s.amount, 0),
          status: r.closing
            ? 'Closing after deliveries'
            : fleets.length
              ? 'Active'
              : 'Needs transport fleet',
        });
      }),
    );
  }

  path(
    from: string,
    to: string,
    port: LogisticsPort,
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
      for (const route of this.routes.filter(
        (r) => !r.closing && [r.a, r.b].includes(last),
      )) {
        const next = route.a === last ? route.b : route.a;
        const origin = port.planets.find((p) => p.id === last)!;
        const target = port.planets.find((p) => p.id === next)!;
        const years = port.fleets
          .filter(
            (f) =>
              f.routeId === route.id &&
              !f.releaseRequested &&
              f.ships['Transport ship'] > 0,
          )
          .map((f) => {
            const speed = port.speed(f);
            const reposition = f.position!.distanceTo(origin.position);
            const busy = this.shipments.filter(
              (s) => s.fleetId === f.id,
            ).length;
            return (
              Math.max(
                1,
                Math.ceil(origin.position.distanceTo(target.position) / speed),
              ) +
              Math.ceil(reposition / speed) +
              busy
            );
          });
        if (years.length)
          queue.push({
            planets: [...current.planets, next],
            years: current.years + Math.min(...years),
          });
      }
    }
    return null;
  }

  prepare(port: LogisticsPort): void {
    this.cleanup(port);
    const needs = port.planets
      .flatMap((planet) =>
        planet.projects.map((project) => ({ planet, project })),
      )
      .sort(
        (a, b) =>
          Number(a.project.id.split('-').at(-1)) -
            Number(b.project.id.split('-').at(-1)) ||
          a.planet.id.localeCompare(b.planet.id),
      );
    const local = new Map(port.planets.map((p) => [p.id, { ...p.stock }]));
    for (const { planet, project } of needs) {
      for (const resource of MATERIALS) {
        const localStock = local.get(planet.id)!;
        const usable = Math.max(
          0,
          localStock[resource] - this.reserved(planet.id)[resource],
        );
        const use = Math.min(usable, project.cost[resource]);
        localStock[resource] -= use;
        let missing =
          project.cost[resource] -
          use -
          this.shipments
            .filter(
              (s) => s.projectId === project.id && s.resource === resource,
            )
            .reduce((n, s) => n + s.amount, 0);
        const sources = port.planets
          .filter((p) => p.id !== planet.id)
          .flatMap((p) => {
            const route = this.path(p.id, planet.id, port);
            const available = Math.max(
              0,
              p.stock[resource] -
                p.demand[resource] -
                this.reserved(p.id)[resource],
            );
            return route && available ? [{ planet: p, route, available }] : [];
          })
          .sort(
            (a, b) =>
              a.route.years - b.route.years ||
              a.planet.id.localeCompare(b.planet.id),
          );
        for (const source of sources) {
          const available = Math.max(
            0,
            source.planet.stock[resource] -
              source.planet.demand[resource] -
              this.reserved(source.planet.id)[resource],
          );
          const amount = Math.min(missing, available);
          if (amount <= 0) continue;
          this.shipments.push({
            id: port.id('shipment'),
            projectId: project.id,
            recipient: planet.id,
            resource,
            amount,
            path: source.route.planets,
            stage: 0,
            fleetId: null,
          });
          missing -= amount;
        }
      }
    }
    for (const fleet of [...port.fleets].sort((a, b) =>
      a.id.localeCompare(b.id),
    )) {
      if (!fleet.routeId || fleet.destination || fleet.releaseRequested)
        continue;
      const route = this.routes.find(
        (r) => r.id === fleet.routeId && !r.closing,
      );
      if (!route) continue;
      const task = this.shipments.find(
        (s) => !s.fleetId && this.#routeFor(s)?.id === route.id,
      );
      if (!task) continue;
      const origin = port.planets.find((p) => p.id === task.path[task.stage])!;
      const target = port.planets.find(
        (p) => p.id === task.path[task.stage + 1],
      )!;
      if (fleet.position!.key !== origin.position.key) {
        fleet.destination = origin.position;
      } else {
        let capacity = fleet.ships['Transport ship'] * 30;
        for (const shipment of [...this.shipments].filter(
          (s) =>
            !s.fleetId &&
            s.path[s.stage] === origin.id &&
            s.path[s.stage + 1] === target.id,
        )) {
          const amount = Math.min(
            capacity,
            shipment.amount,
            origin.stock[shipment.resource],
          );
          if (amount <= 0) continue;
          if (amount < shipment.amount)
            this.shipments.push({
              ...shipment,
              id: port.id('shipment'),
              amount: shipment.amount - amount,
              path: [...shipment.path],
            });
          shipment.amount = amount;
          shipment.fleetId = fleet.id;
          shipment.committed = true;
          origin.stock[shipment.resource] -= amount;
          capacity -= amount;
        }
        fleet.destination = target.position;
      }
      fleet.courseOrigin = fleet.position!;
    }
  }

  unload(port: LogisticsPort): void {
    for (const fleet of port.fleets) {
      if (!fleet.routeId || fleet.destination) continue;
      for (const shipment of this.shipments.filter(
        (s) => s.fleetId === fleet.id,
      )) {
        const target = port.planets.find(
          (p) => p.id === shipment.path[shipment.stage + 1],
        )!;
        if (target.position.key !== fleet.position?.key) continue;
        target.stock[shipment.resource] += shipment.amount;
        shipment.stage += 1;
        shipment.fleetId = null;
        port.event(
          `${fleet.id} delivered ${shipment.amount} ${shipment.resource} to ${target.name}.`,
        );
      }
      if (fleet.releaseRequested) this.release(fleet);
    }
    this.shipments = this.shipments.filter((s) => s.stage < s.path.length - 1);
    this.cleanup(port);
  }

  #routeFor(shipment: Shipment): TradeRoute | undefined {
    return this.routes.find(
      (r) =>
        [r.a, r.b].includes(shipment.path[shipment.stage]!) &&
        [r.a, r.b].includes(shipment.path[shipment.stage + 1]!),
    );
  }
}
