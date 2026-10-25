import { MATERIALS, type Stock } from './Economy.js';
import type { ComponentOrder, ShipmentSnapshot } from './Logistics.js';

export interface SupplyStep {
  readonly label: string;
  readonly status: 'Ready' | 'Waiting' | 'Needs attention';
  readonly planetId?: string;
  readonly projectId?: string;
  readonly routeId?: string;
  readonly fleetId?: string;
  readonly children: readonly SupplyStep[];
  readonly waitingForDependency?: boolean;
}
export interface ProjectSupplySnapshot {
  readonly projectId: string;
  readonly requirements: readonly SupplyStep[];
}
export interface SupplyProjectInput {
  readonly id: string;
  readonly type: string;
  readonly cost: Readonly<Stock>;
  readonly issue: string | null;
  readonly waitingReason?: string | null;
}
export interface ProjectSupplyPlanet {
  readonly id: string;
  readonly name: string;
  readonly stock: Readonly<Stock>;
  readonly reserved: Readonly<Stock>;
  readonly extraction: Readonly<Stock>;
  readonly deposits: Readonly<Stock>;
  readonly projects: readonly SupplyProjectInput[];
}

const step = (
  label: string,
  status: SupplyStep['status'],
  fields: Omit<Partial<SupplyStep>, 'label' | 'status'> = {},
): SupplyStep =>
  Object.freeze({ label, status, children: Object.freeze([]), ...fields });

// projektens-forsorjningssteg: a read-only projection, never a second order planner.
export class ProjectSupply {
  readonly #requirements = new Map<string, readonly SupplyStep[]>();
  readonly #planets = new Map<string, ProjectSupplyPlanet>();

  constructor(
    planets: readonly ProjectSupplyPlanet[],
    orders: readonly ComponentOrder[],
    shipments: readonly ShipmentSnapshot[],
    transportPath: (from: string, to: string) => readonly string[] | null,
    transportRoute?: (from: string, to: string) => string | undefined,
    pendingMaterial?: (
      planetId: string,
      projectId: string,
      material: string,
      missing: number,
    ) => string | null,
    pendingTransportPath?: (
      from: string,
      to: string,
    ) => readonly string[] | null,
  ) {
    for (const planet of planets) this.#planets.set(planet.id, planet);
    for (const planet of planets) {
      const free = { ...planet.stock };
      const deposits = { ...planet.deposits };
      for (const material of MATERIALS)
        free[material] = Math.max(
          0,
          free[material] - planet.reserved[material],
        );
      for (const project of planet.projects) {
        const requirements: SupplyStep[] = [];
        if (project.issue)
          requirements.push(step(project.issue, 'Needs attention'));
        else if (project.waitingReason)
          requirements.push(step(project.waitingReason, 'Waiting'));
        for (const material of MATERIALS) {
          let missing = project.cost[material];
          if (!missing) continue;
          const children: SupplyStep[] = [];
          const related = orders.filter(
            (order) =>
              order.projectId === project.id && order.component === material,
          );
          // Delivered component reservations belong to this project, not the free pool.
          const delivered = Math.min(
            missing,
            related
              .filter((o) => o.delivered && o.location === planet.id)
              .reduce((n, o) => n + o.amount, 0),
          );
          const local =
            delivered + Math.min(missing - delivered, free[material]);
          free[material] -= local - delivered;
          missing -= local;
          if (local)
            children.push(
              step(
                `${local} ${material} available at ${planet.name}`,
                'Ready',
                { planetId: planet.id },
              ),
            );
          for (const order of related.filter(
            (o) => !o.delivered && !o.shipmentId,
          )) {
            const amount = Math.min(missing, order.amount);
            if (!amount) continue;
            const source = this.#planets.get(order.source);
            const producer = source?.projects.find(
              (p) => p.id === order.productionProjectId,
            );
            if (order.productionProjectId) {
              const behind =
                order.source === planet.id &&
                source!.projects.findIndex((p) => p.id === producer?.id) >
                  planet.projects.indexOf(project);
              const waitingForDependency =
                !!producer &&
                !behind &&
                !!pendingMaterial?.(planet.id, project.id, material, amount);
              children.push(
                step(
                  producer
                    ? `Produce ${amount} ${material} at ${source!.name}${behind ? ' · Move production before this project' : ''}`
                    : `${material} production order was cancelled`,
                  !producer ||
                    behind ||
                    (producer.issue && !waitingForDependency)
                    ? 'Needs attention'
                    : 'Waiting',
                  {
                    planetId: order.source,
                    ...(producer ? { projectId: producer.id } : {}),
                    waitingForDependency,
                  },
                ),
              );
            } else
              children.push(
                step(
                  `${amount} ${material} reserved at ${source?.name ?? order.source}`,
                  'Ready',
                  { planetId: order.source },
                ),
              );
            if (order.location !== planet.id) {
              const path = transportPath(order.location, planet.id);
              const pendingPath = !path
                ? pendingTransportPath?.(order.location, planet.id)
                : null;
              const routeId = transportRoute?.(
                order.location,
                path?.[1] ?? planet.id,
              );
              children.push(
                step(
                  `Transport ${amount} ${material} from ${this.#planets.get(order.location)?.name ?? order.location} to ${planet.name} · ${path ? `Planned transport · ${path.map((id) => this.#planets.get(id)?.name ?? id).join(' → ')}` : pendingPath ? 'Waiting for transport preparation' : 'No active transport path'}`,
                  path || pendingPath ? 'Waiting' : 'Needs attention',
                  { planetId: order.location, ...(routeId ? { routeId } : {}) },
                ),
              );
            }
            missing -= amount;
          }
          for (const shipment of shipments.filter(
            (s) => s.projectId === project.id && s.material === material,
          )) {
            const amount = Math.min(missing, shipment.amount);
            if (!amount) continue;
            const pending =
              shipment.issue === 'No active transport path' &&
              pendingTransportPath?.(shipment.locationId, planet.id);
            children.push(
              step(
                `Transport ${amount} ${material} from ${shipment.source} to ${shipment.recipient} · ${shipment.state} · At ${shipment.location} → ${shipment.remainingStops?.join(' → ') ?? shipment.nextStop}${shipment.years === null ? '' : ` · ~${shipment.years} year(s)`}${shipment.issue ? ` · ${shipment.issue}` : ''}`,
                shipment.issue && !pending ? 'Needs attention' : 'Waiting',
                {
                  planetId: shipment.locationId,
                  ...(shipment.routeId ? { routeId: shipment.routeId } : {}),
                  ...(shipment.fleetId ? { fleetId: shipment.fleetId } : {}),
                },
              ),
            );
            missing -= amount;
          }
          if (missing && planet.extraction[material] > 0) {
            const amount = Math.min(missing, deposits[material]);
            deposits[material] -= amount;
            missing -= amount;
            if (amount)
              children.push(
                step(
                  `Extract ${amount} ${material} at ${planet.name} · ${planet.extraction[material]}/year`,
                  'Waiting',
                  { planetId: planet.id },
                ),
              );
          }
          if (missing) {
            const waiting = pendingMaterial?.(
              planet.id,
              project.id,
              material,
              missing,
            );
            children.push(
              step(
                waiting ??
                  `${missing} ${material} unprovided · No supply arranged`,
                waiting ? 'Waiting' : 'Needs attention',
              ),
            );
          }
          const status = children.some((s) => s.status === 'Needs attention')
            ? 'Needs attention'
            : children.some((s) => s.status === 'Waiting')
              ? 'Waiting'
              : 'Ready';
          requirements.push(
            step(`Require ${project.cost[material]} ${material}`, status, {
              children: Object.freeze(children),
            }),
          );
        }
        this.#requirements.set(project.id, Object.freeze(requirements));
      }
    }
  }

  forPlanet(id: string | undefined): readonly ProjectSupplySnapshot[] {
    const expand = (
      item: SupplyStep,
      visited: ReadonlySet<string>,
    ): SupplyStep => {
      if (item.projectId && !visited.has(item.projectId)) {
        const next = new Set([...visited, item.projectId]);
        const children = (this.#requirements.get(item.projectId) ?? []).map(
          (child) => expand(child, next),
        );
        return Object.freeze({
          ...item,
          children: Object.freeze(children),
          status:
            !item.waitingForDependency &&
            children.some((c) => c.status === 'Needs attention')
              ? ('Needs attention' as const)
              : item.status,
        });
      }
      const children = item.children.map((child) => expand(child, visited));
      return Object.freeze({
        ...item,
        status: children.some((c) => c.status === 'Needs attention')
          ? 'Needs attention'
          : item.status,
        children: Object.freeze(children),
      });
    };
    return Object.freeze(
      (this.#planets.get(id ?? '')?.projects ?? []).map((project) =>
        Object.freeze({
          projectId: project.id,
          requirements: Object.freeze(
            (this.#requirements.get(project.id) ?? []).map((item) =>
              expand(item, new Set([project.id])),
            ),
          ),
        }),
      ),
    );
  }
}
