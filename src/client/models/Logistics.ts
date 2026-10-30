import {
  MATERIALS,
  emptyStock,
  type Component,
  type Material,
  type Stock,
} from './Economy.js';
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
  componentOrderId?: string;
}
export interface ComponentOrder {
  id: string;
  projectId: string;
  recipient: string;
  source: string;
  location: string;
  component: Component;
  amount: number;
  productionProjectId: string | null;
  shipmentId: string | null;
  delivered: boolean;
  committed?: boolean;
}
export interface ShipmentSnapshot {
  readonly id: string;
  readonly material: string;
  readonly amount: number;
  readonly sourceId: string;
  readonly source: string;
  readonly recipientId: string;
  readonly recipient: string;
  readonly projectId: string | null;
  readonly project: string | null;
  readonly locationId: string;
  readonly location: string;
  readonly nextStop: string;
  readonly remainingStops?: readonly string[];
  readonly fleetId: string | null;
  readonly routeId: string | null;
  readonly state: 'Awaiting pickup' | 'In transit';
  readonly years: number | null;
  readonly issue: string | null;
}
export interface TransportFleet {
  id: string;
  readonly name?: string;
  position: HexCoordinate | null;
  destination: HexCoordinate | null;
  courseOrigin?: HexCoordinate;
  civilian?: { readonly legRouteId?: string };
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
  travelYears?(
    fleet: TransportFleet,
    from: HexCoordinate,
    to: HexCoordinate,
  ): number;
  id(prefix: string): string;
  event(message: string, position?: HexCoordinate): void;
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
  readonly hasActiveTransport: boolean;
  readonly waiting: number;
  readonly status: string;
}

// handelsnatverk: shipments retain ownership across warehouses and route links.
export class Logistics {
  constructor(
    public routes: TradeRoute[] = [],
    public shipments: Shipment[] = [],
    public componentOrders: ComponentOrder[] = [],
  ) {}

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

  completeComponent(projectId: string): void {
    for (const order of this.componentOrders.filter(
      (order) => order.productionProjectId === projectId,
    )) {
      order.productionProjectId = null;
      order.delivered = order.location === order.recipient;
    }
  }

  componentStockReserved(planetId: string, projectId?: string): Stock {
    const stock = emptyStock();
    for (const order of this.componentOrders)
      if (
        order.projectId !== projectId &&
        !order.productionProjectId &&
        order.location === planetId &&
        !this.shipments.some((s) => s.componentOrderId === order.id)
      )
        stock[order.component] += order.amount;
    return stock;
  }

  shipmentSnapshots(port: LogisticsPort): readonly ShipmentSnapshot[] {
    return Object.freeze(
      this.shipments.map((shipment) => {
        const planet = (id: string) => port.planets.find((p) => p.id === id);
        const start = shipment.path[shipment.stage]!;
        const next = shipment.path[shipment.stage + 1]!;
        const fleet = port.fleets.find((f) => f.id === shipment.fleetId);
        let years = 0;
        let issue: string | null = null;
        for (
          let stage = shipment.stage;
          stage < shipment.path.length - 1;
          stage++
        ) {
          const from = planet(shipment.path[stage]!)!;
          const to = planet(shipment.path[stage + 1]!)!;
          const route = this.routes.find(
            (r) => [r.a, r.b].includes(from.id) && [r.a, r.b].includes(to.id),
          );
          if (stage === shipment.stage && fleet?.position) {
            years += Math.max(
              1,
              Math.ceil(
                port.travelYears?.(fleet, fleet.position, to.position) ??
                  fleet.position.distanceTo(to.position) / port.speed(fleet),
              ),
            );
          } else {
            const carriers = route ? this.activeCarriers(route, port) : [];
            if (!route || route.closing || !carriers.length) {
              issue = 'No active transport path';
              break;
            }
            years += Math.min(
              ...carriers.map(
                (carrier) =>
                  Math.ceil(
                    port.travelYears?.(
                      carrier,
                      carrier.position!,
                      from.position,
                    ) ??
                      carrier.position!.distanceTo(from.position) /
                        port.speed(carrier),
                  ) +
                  Math.max(
                    1,
                    Math.ceil(
                      port.travelYears?.(carrier, from.position, to.position) ??
                        from.position.distanceTo(to.position) /
                          port.speed(carrier),
                    ),
                  ) +
                  this.shipments.filter((s) => s.fleetId === carrier.id).length,
              ),
            );
          }
        }
        if (!Number.isFinite(years)) issue = 'No known passable route';
        const project = port.projectExists(shipment.projectId)
          ? shipment.projectId
          : null;
        return Object.freeze({
          id: shipment.id,
          material: shipment.resource,
          amount: shipment.amount,
          sourceId: shipment.path[0]!,
          source: planet(shipment.path[0]!)?.name ?? 'Unknown source',
          recipientId: shipment.recipient,
          recipient: planet(shipment.recipient)?.name ?? 'Unknown recipient',
          projectId: project,
          project: null,
          locationId: start,
          location: planet(start)?.name ?? 'Unknown location',
          nextStop: planet(next)?.name ?? 'Unknown destination',
          remainingStops: Object.freeze(
            shipment.path
              .slice(shipment.stage + 1)
              .map((id) => planet(id)?.name ?? 'Unknown destination'),
          ),
          fleetId: shipment.fleetId,
          routeId: this.#routeFor(shipment)?.id ?? null,
          state: shipment.fleetId
            ? ('In transit' as const)
            : ('Awaiting pickup' as const),
          years: issue ? null : years,
          issue,
        });
      }),
    );
  }

  incoming(planetId: string): Stock {
    const stock = emptyStock();
    for (const shipment of this.shipments)
      if (shipment.recipient === planetId)
        stock[shipment.resource] += shipment.amount;
    return stock;
  }

  reserved(planetId: string, projectId?: string): Stock {
    const reserved = this.componentStockReserved(planetId, projectId);
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
    this.componentOrders = this.componentOrders.filter((order) =>
      port.projectExists(order.projectId),
    );
    // automatisk-motormontering: surplus cargo becomes available to another order.
    const activeOrders = new Set(this.componentOrders.map((order) => order.id));
    for (const shipment of this.shipments)
      if (
        shipment.componentOrderId &&
        !activeOrders.has(shipment.componentOrderId)
      )
        delete shipment.componentOrderId;
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
      (r) =>
        !r.closing ||
        port.fleets.some(
          (f) => f.routeId === r.id || f.civilian?.legRouteId === r.id,
        ),
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
          hasActiveTransport: this.activeCarriers(r, port).length > 0,
          waiting: this.shipments
            .filter((s) => !s.fleetId && this.#routeFor(s)?.id === r.id)
            .reduce((sum, s) => sum + s.amount, 0),
          status: r.closing
            ? 'Closing after deliveries'
            : this.activeCarriers(r, port).length
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
        const years = this.activeCarriers(route, port).map((f) => {
          const speed = port.speed(f);
          const reposition =
            port.travelYears?.(f, f.position!, origin.position) ??
            f.position!.distanceTo(origin.position) / speed;
          const busy = this.shipments.filter((s) => s.fleetId === f.id).length;
          return (
            Math.max(
              1,
              Math.ceil(
                port.travelYears?.(f, origin.position, target.position) ??
                  origin.position.distanceTo(target.position) / speed,
              ),
            ) +
            Math.ceil(reposition) +
            busy
          );
        });
        if (years.some(Number.isFinite))
          queue.push({
            planets: [...current.planets, next],
            years: current.years + Math.min(...years),
          });
      }
    }
    return null;
  }

  // forsorjningsstatus / leveransfloden: reserve during planning; load at turn start.
  reserve(port: LogisticsPort): void {
    this.cleanup(port);
    this.#reserveComponents(port);
    for (const planet of port.planets) {
      for (const resource of MATERIALS) {
        const waiting = this.shipments.filter(
          (s) =>
            !s.fleetId &&
            s.path[s.stage] === planet.id &&
            s.resource === resource,
        );
        let available = Math.max(
          0,
          planet.stock[resource] -
            planet.demand[resource] -
            this.componentStockReserved(planet.id)[resource] -
            waiting
              .filter((s) => s.committed || s.componentOrderId)
              .reduce((n, s) => n + s.amount, 0),
        );
        for (const shipment of waiting.filter(
          (s) => !s.committed && !s.componentOrderId,
        )) {
          shipment.amount = Math.min(shipment.amount, available);
          available -= shipment.amount;
        }
      }
    }
    this.shipments = this.shipments.filter((s) => s.amount > 0);
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
          localStock[resource] - this.reserved(planet.id, project.id)[resource],
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
            .reduce((n, s) => n + s.amount, 0) -
          this.componentOrders
            .filter(
              (order) =>
                order.projectId === project.id &&
                order.component === resource &&
                !order.delivered &&
                !this.shipments.some((s) => s.componentOrderId === order.id),
            )
            .reduce((n, order) => n + order.amount, 0);
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
  }

  #reserveComponents(port: LogisticsPort): void {
    for (const order of this.componentOrders) {
      if (
        order.productionProjectId ||
        order.delivered ||
        this.shipments.some((s) => s.componentOrderId === order.id)
      )
        continue;
      if (order.shipmentId) {
        const shipment = this.shipments.find((s) => s.id === order.shipmentId);
        if (shipment) {
          order.committed = !!shipment.committed;
          if (shipment.amount > order.amount) {
            shipment.amount -= order.amount;
            this.shipments.push({
              ...shipment,
              path: [...shipment.path],
              id: port.id('shipment'),
              amount: order.amount,
              componentOrderId: order.id,
              projectId: order.projectId,
            });
          } else {
            shipment.componentOrderId = order.id;
            shipment.projectId = order.projectId;
          }
          order.shipmentId = null;
          continue;
        }
        order.shipmentId = null;
      }
      const route = this.path(order.location, order.recipient, port);
      if (!route) continue;
      this.shipments.push({
        id: port.id('shipment'),
        resource: order.component,
        amount: order.amount,
        projectId: order.projectId,
        recipient: order.recipient,
        path: route.planets,
        stage: 0,
        fleetId: null,
        componentOrderId: order.id,
        ...(order.committed ? { committed: true } : {}),
      });
    }
  }

  prepare(port: LogisticsPort): void {
    this.reserve(port);
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
          const order = this.componentOrders.find(
            (order) => order.id === shipment.componentOrderId,
          );
          if (order) order.committed = true;
          origin.stock[shipment.resource] -= amount;
          capacity -= amount;
        }
        fleet.destination = target.position;
      }
      fleet.courseOrigin = fleet.position!;
    }
  }

  // flottstrid-per-hex: lost cargo cannot be delivered or remain reserved.
  destroyCargo(fleetId: string): void {
    const lost = this.shipments.filter(
      (shipment) => shipment.fleetId === fleetId,
    );
    const orders = new Set(lost.map((shipment) => shipment.componentOrderId));
    this.componentOrders = this.componentOrders.filter(
      (order) => !orders.has(order.id),
    );
    this.shipments = this.shipments.filter(
      (shipment) => shipment.fleetId !== fleetId,
    );
  }

  unload(port: LogisticsPort): void {
    for (const fleet of port.fleets) {
      if (!fleet.routeId || fleet.destination) continue;
      const deliveries = new Map<LogisticsPlanet, Stock>();
      for (const shipment of this.shipments.filter(
        (s) => s.fleetId === fleet.id,
      )) {
        const target = port.planets.find(
          (p) => p.id === shipment.path[shipment.stage + 1],
        )!;
        if (target.position.key !== fleet.position?.key) continue;
        target.stock[shipment.resource] += shipment.amount;
        const cargo = deliveries.get(target) ?? emptyStock();
        cargo[shipment.resource] += shipment.amount;
        deliveries.set(target, cargo);
        shipment.stage += 1;
        shipment.fleetId = null;
        const order = this.componentOrders.find(
          (order) => order.id === shipment.componentOrderId,
        );
        if (order) {
          order.location = target.id;
          order.committed = true;
          order.delivered = shipment.stage === shipment.path.length - 1;
          order.shipmentId = null;
        }
      }
      // grupperade-transporthandelser: one arrival contains every delivered material.
      for (const [target, cargo] of deliveries) {
        const summary = MATERIALS.filter((material) => cargo[material] > 0)
          .map((material) => `${cargo[material]} ${material}`)
          .join(', ');
        port.event(
          `${fleet.name ?? fleet.id} arrived at ${target.name} and delivered ${summary}.`,
          target.position,
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
