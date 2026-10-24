import { COMPONENTS, type Component, type Stock } from './Economy.js';
import type { ComponentOrder, Logistics, LogisticsPort } from './Logistics.js';

export interface ComponentProject {
  readonly id: string;
  readonly component: Component | undefined;
  readonly parts: Readonly<Partial<Record<Component, number>>> | undefined;
}
export interface ComponentProductionSite {
  readonly id: string;
  readonly stock: Readonly<Stock>;
  readonly projects: readonly ComponentProject[];
  readonly factories: Readonly<Partial<Record<Component, string>>>;
}
export interface PlannedComponentProduction {
  readonly id: string;
  readonly planetId: string;
  readonly component: Component;
  readonly factoryId: string;
}
interface ComponentPool {
  stock: number;
  incoming: string[];
  production: string[];
}

// automatiska-delorder: plan against private pools before committing any order or ID.
export class ComponentPlanner {
  readonly #production: PlannedComponentProduction[] = [];
  readonly #orders: ComponentOrder[] = [];

  constructor(
    readonly sites: readonly ComponentProductionSite[],
    readonly logistics: Logistics,
    readonly port: LogisticsPort,
    readonly id: (prefix: string) => string,
  ) {}

  plan(
    projectId: string,
    recipient: string,
    parts: Readonly<Partial<Record<Component, number>>>,
  ): {
    production: readonly PlannedComponentProduction[];
    orders: readonly ComponentOrder[];
    parts: Partial<Record<Component, number>>;
  } {
    const selected = { ...parts };
    const engines =
      (parts['Rocket engine'] ?? 0) + (parts['Ion pulse engine'] ?? 0);
    if (engines)
      Object.assign(selected, this.#planEngines(projectId, recipient, engines));
    const local = this.sites.find((site) => site.id === recipient)!;
    for (const component of COMPONENTS) {
      if (component === 'Rocket engine' || component === 'Ion pulse engine')
        continue;
      let missing = parts[component] ?? 0;
      if (!missing) continue;
      const pools = new Map(
        this.sites.map((site) => [
          site.id,
          this.#pool(site, component, missing),
        ]),
      );
      const take = (
        site: ComponentProductionSite,
        kind: keyof ComponentPool,
      ) => {
        const pool = pools.get(site.id)!;
        while (
          missing > 0 &&
          (kind === 'stock' ? pool.stock > 0 : pool[kind].length > 0)
        ) {
          const productionProjectId =
            kind === 'production' ? pool.production.shift()! : null;
          const shipmentId =
            kind === 'incoming' ? pool.incoming.shift()! : null;
          const shipment = this.logistics.shipments.find(
            (s) => s.id === shipmentId,
          );
          if (kind === 'stock') pool.stock--;
          this.#orders.push({
            id: this.id('component-order'),
            projectId,
            recipient,
            source: shipment?.path[0] ?? site.id,
            location: shipment?.path[shipment.stage] ?? site.id,
            component,
            amount: 1,
            productionProjectId,
            shipmentId,
            delivered: kind === 'stock' && site.id === recipient,
          });
          missing--;
        }
      };
      const produce = (site: ComponentProductionSite) => {
        while (missing > 0) {
          const id = this.id('project');
          this.#production.push({
            id,
            planetId: site.id,
            component,
            factoryId: site.factories[component]!,
          });
          this.#orders.push({
            id: this.id('component-order'),
            projectId,
            recipient,
            source: site.id,
            location: site.id,
            component,
            amount: 1,
            productionProjectId: id,
            shipmentId: null,
            delivered: false,
          });
          missing--;
        }
      };
      take(local, 'stock');
      take(local, 'incoming');
      if (local.factories[component]) {
        take(local, 'production');
        if (missing) produce(local);
      }
      if (!missing) continue;
      const sources = this.sites
        .filter((site) => site.id !== recipient)
        .flatMap((site) => {
          const path = this.logistics.path(site.id, recipient, this.port);
          return path ? [{ site, years: path.years }] : [];
        })
        .sort(
          (a, b) => a.years - b.years || a.site.id.localeCompare(b.site.id),
        );
      for (const { site } of sources) take(site, 'stock');
      const producers = sources.filter(({ site }) => site.factories[component]);
      for (const { site } of producers) take(site, 'production');
      if (missing && producers.length) produce(producers[0]!.site);
      if (missing)
        throw new Error(
          `Cannot order ${component}: no available supplier or completed factory with an active transport path.`,
        );
    }
    return {
      production: this.#production,
      orders: this.#orders,
      parts: selected,
    };
  }

  // automatisk-motormontering: engine variants share a need, never two reservations.
  #planEngines(
    projectId: string,
    recipient: string,
    count: number,
  ): Partial<Record<Component, number>> {
    const chosen = { 'Rocket engine': 0, 'Ion pulse engine': 0 };
    let missing = count;
    const candidates = this.sites
      .flatMap((site) => {
        const years =
          site.id === recipient
            ? 0
            : this.logistics.path(site.id, recipient, this.port)?.years;
        return years === undefined
          ? []
          : (['Ion pulse engine', 'Rocket engine'] as const).map(
              (component) => ({
                site,
                component,
                years,
                pool: this.#pool(site, component, count),
              }),
            );
      })
      .sort(
        (a, b) =>
          a.years - b.years ||
          Number(b.component === 'Ion pulse engine') -
            Number(a.component === 'Ion pulse engine') ||
          a.site.id.localeCompare(b.site.id),
      );
    const take = (
      candidate: (typeof candidates)[number],
      kind: keyof ComponentPool | 'new',
    ) => {
      const { site, component, pool } = candidate;
      while (
        missing > 0 &&
        (kind === 'new'
          ? !!site.factories[component]
          : kind === 'stock'
            ? pool.stock > 0
            : pool[kind].length > 0)
      ) {
        let productionProjectId: string | null = null;
        const shipmentId = kind === 'incoming' ? pool.incoming.shift()! : null;
        if (kind === 'stock') pool.stock--;
        if (kind === 'production')
          productionProjectId = pool.production.shift()!;
        if (kind === 'new') {
          productionProjectId = this.id('project');
          this.#production.push({
            id: productionProjectId,
            planetId: site.id,
            component,
            factoryId: site.factories[component]!,
          });
        }
        const shipment = this.logistics.shipments.find(
          (s) => s.id === shipmentId,
        );
        this.#orders.push({
          id: this.id('component-order'),
          projectId,
          recipient,
          source: shipment?.path[0] ?? site.id,
          location: shipment?.path[shipment.stage] ?? site.id,
          component,
          amount: 1,
          productionProjectId,
          shipmentId,
          delivered: kind === 'stock' && site.id === recipient,
        });
        chosen[component]++;
        missing--;
      }
    };
    for (const candidate of candidates.filter((c) => c.site.id === recipient))
      take(candidate, 'stock');
    for (const candidate of candidates.filter((c) => c.site.id === recipient))
      take(candidate, 'incoming');
    for (const candidate of candidates.filter((c) => c.site.id !== recipient))
      take(candidate, 'stock');
    for (const candidate of candidates.filter(
      (c) => c.site.factories[c.component],
    ))
      take(candidate, 'production');
    for (const candidate of candidates) take(candidate, 'new');
    if (missing)
      throw new Error(
        'Cannot order Rocket engine or Ion pulse engine: no available supplier or completed factory with an active transport path.',
      );
    return chosen;
  }

  #pool(
    site: ComponentProductionSite,
    component: Component,
    limit: number,
  ): ComponentPool {
    const deliveries = this.logistics.shipmentSnapshots(this.port);
    const pool: ComponentPool = {
      stock: Math.max(
        0,
        site.stock[component] - this.logistics.reserved(site.id)[component],
      ),
      incoming: this.logistics.shipments
        .filter(
          (s) =>
            s.recipient === site.id &&
            s.resource === component &&
            !s.componentOrderId &&
            !this.port.projectExists(s.projectId) &&
            !deliveries.find((delivery) => delivery.id === s.id)?.issue,
        )
        .flatMap((s) =>
          Array.from({ length: Math.min(s.amount, limit) }, () => s.id),
        ),
      production: [],
    };
    let unmet = 0;
    for (const project of site.projects) {
      if (
        project.component === component &&
        !this.logistics.componentOrders.some(
          (order) => order.productionProjectId === project.id,
        )
      ) {
        if (unmet > 0) unmet--;
        else pool.production.push(project.id);
      }
      const allocated = this.logistics.componentOrders
        .filter(
          (order) =>
            order.projectId === project.id && order.component === component,
        )
        .reduce((n, order) => n + order.amount, 0);
      const incoming = this.logistics.shipments
        .filter(
          (shipment) =>
            shipment.projectId === project.id &&
            shipment.resource === component &&
            !shipment.componentOrderId,
        )
        .reduce((n, shipment) => n + shipment.amount, 0);
      let needed = Math.max(
        0,
        (project.parts?.[component] ?? 0) - allocated - incoming,
      );
      const stock = Math.min(pool.stock, needed);
      pool.stock -= stock;
      needed -= stock;
      const queued = Math.min(pool.production.length, needed);
      pool.production.splice(0, queued);
      unmet += needed - queued;
    }
    return pool;
  }
}
