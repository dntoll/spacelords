import type { ComponentOrder, Shipment } from './Logistics.js';

export type SupplyPlanetRole = 'Project' | 'Supplier' | 'Producer' | 'Transfer';
export interface SupplyChainSnapshot {
  readonly projectIds: readonly string[];
  readonly planets: readonly {
    readonly id: string;
    readonly roles: readonly SupplyPlanetRole[];
  }[];
  readonly routeIds: readonly string[];
}
export const emptySupplyChain = (): SupplyChainSnapshot =>
  Object.freeze({
    projectIds: Object.freeze([]),
    planets: Object.freeze([]),
    routeIds: Object.freeze([]),
  });

// byggprojektets-forsorjningskedja: traverse commitments, never search for suppliers.
export function projectSupplyChain(
  rootId: string | null,
  projects: readonly { readonly id: string; readonly planetId: string }[],
  orders: readonly ComponentOrder[],
  shipments: readonly Shipment[],
  plannedPath: (from: string, to: string) => readonly string[] | null,
  routeId: (from: string, to: string) => string | undefined,
): SupplyChainSnapshot {
  if (!rootId || !projects.some((p) => p.id === rootId))
    return emptySupplyChain();
  const visited = new Set<string>();
  const planets = new Map<string, Set<SupplyPlanetRole>>();
  const routes = new Set<string>();
  const add = (id: string, role: SupplyPlanetRole) => {
    if (!planets.has(id)) planets.set(id, new Set());
    planets.get(id)!.add(role);
  };
  const path = (stops: readonly string[]) => {
    for (let i = 0; i < stops.length; i++) {
      if (i > 0 && i < stops.length - 1) add(stops[i]!, 'Transfer');
      if (i > 0) {
        const id = routeId(stops[i - 1]!, stops[i]!);
        if (id) routes.add(id);
      }
    }
  };
  const visit = (projectId: string) => {
    if (visited.has(projectId)) return;
    visited.add(projectId);
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    add(project.planetId, projectId === rootId ? 'Project' : 'Producer');
    for (const shipment of shipments.filter(
      (s) =>
        s.projectId === projectId ||
        orders.some((o) => o.projectId === projectId && o.shipmentId === s.id),
    )) {
      add(shipment.path[0]!, 'Supplier');
      path(shipment.path);
    }
    for (const order of orders.filter((o) => o.projectId === projectId)) {
      add(order.source, order.productionProjectId ? 'Producer' : 'Supplier');
      if (order.productionProjectId) visit(order.productionProjectId);
      if (!order.delivered && !order.shipmentId) {
        add(
          order.location,
          order.location === order.source ? 'Supplier' : 'Transfer',
        );
        path(plannedPath(order.location, order.recipient) ?? []);
      }
    }
  };
  visit(rootId);
  return Object.freeze({
    projectIds: Object.freeze([...visited]),
    planets: Object.freeze(
      [...planets].map(([id, roles]) =>
        Object.freeze({ id, roles: Object.freeze([...roles]) }),
      ),
    ),
    routeIds: Object.freeze([...routes]),
  });
}
