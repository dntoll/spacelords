import type { ShipmentSnapshot } from './Logistics.js';

export type SupplyStatus = 'Needs attention' | 'Waiting' | 'Ready' | 'Idle';
type Quantities = Readonly<Record<string, number>>;
export interface ProductionCapability {
  readonly product: string;
  readonly kind: 'material' | 'ship';
  readonly available: boolean;
  readonly reason: string | null;
  readonly queued: number;
}
export interface SupplyPlanetInput {
  readonly id: string;
  readonly name: string;
  readonly project: Readonly<{ id: string; type: string }> | null;
  readonly issue: string | null;
  readonly waitingReason?: string | null;
  readonly stock: Quantities;
  readonly reserved: Quantities;
  readonly demand: Quantities;
  readonly extraction: Quantities;
  readonly deposits: Quantities;
  readonly capabilities: readonly ProductionCapability[];
  readonly componentProduction?: readonly {
    readonly material: string;
    readonly amount: number;
    readonly issue: string | null;
  }[];
}
export interface SupplyMaterial {
  readonly material: string;
  readonly stock: number;
  readonly reserved: number;
  readonly available: number;
  readonly required: number;
  readonly extraction: number;
  readonly deposits: number;
  readonly incoming: number;
  readonly awaitingPickup: number;
  readonly inTransit: number;
  readonly ordered: number;
  readonly unprovided: number;
  readonly localYears: number | null;
  readonly waitingReason?: string | null;
}
export interface SupplyPlanet {
  readonly id: string;
  readonly name: string;
  readonly project: SupplyPlanetInput['project'];
  readonly status: SupplyStatus;
  readonly summary: string;
  readonly materials: readonly SupplyMaterial[];
  readonly capabilities: readonly ProductionCapability[];
}

// forsorjningsstatus: assess commitments separately from possible production.
export class SupplyOverview {
  readonly planets: readonly SupplyPlanet[];
  readonly materials: readonly string[];

  constructor(
    inputs: readonly SupplyPlanetInput[],
    shipments: readonly ShipmentSnapshot[],
    catalogue: readonly string[] = [],
    pendingMaterial?: (
      planetId: string,
      projectId: string,
      material: string,
      missing: number,
    ) => string | null,
  ) {
    const priority: Record<SupplyStatus, number> = {
      'Needs attention': 0,
      Waiting: 1,
      Ready: 2,
      Idle: 3,
    };
    this.planets = Object.freeze(
      inputs
        .map((input): SupplyPlanet => {
          const incoming = shipments.filter((s) => s.recipientId === input.id);
          const names = new Set([
            ...Object.keys(input.stock),
            ...Object.keys(input.demand),
            ...Object.keys(input.extraction),
            ...Object.keys(input.reserved),
            ...incoming.map((s) => s.material),
          ]);
          const materials = [...names]
            .sort()
            .map((material): SupplyMaterial => {
              const stock = input.stock[material] ?? 0;
              const reserved = input.reserved[material] ?? 0;
              const available = Math.max(0, stock - reserved);
              const required = input.project
                ? (input.demand[material] ?? 0)
                : 0;
              const extraction = input.extraction[material] ?? 0;
              const deposits = input.deposits[material] ?? 0;
              const deliveries = incoming.filter(
                (s) => s.material === material,
              );
              const usable = deliveries.filter(
                (s) =>
                  !s.issue &&
                  (s.projectId === input.project?.id || s.projectId === null),
              );
              const supplied = usable.reduce((sum, s) => sum + s.amount, 0);
              const ordered = (input.componentProduction ?? [])
                .filter((order) => order.material === material && !order.issue)
                .reduce((sum, order) => sum + order.amount, 0);
              const remainder = Math.max(
                0,
                required - available - supplied - ordered,
              );
              const local = extraction > 0 ? Math.min(remainder, deposits) : 0;
              return Object.freeze({
                material,
                stock,
                reserved,
                available,
                required,
                extraction,
                deposits,
                incoming: deliveries.reduce((sum, s) => sum + s.amount, 0),
                awaitingPickup: deliveries
                  .filter((s) => s.state === 'Awaiting pickup')
                  .reduce((sum, s) => sum + s.amount, 0),
                inTransit: deliveries
                  .filter((s) => s.state === 'In transit')
                  .reduce((sum, s) => sum + s.amount, 0),
                ordered,
                unprovided: remainder - local,
                waitingReason:
                  remainder > local && input.project
                    ? (pendingMaterial?.(
                        input.id,
                        input.project.id,
                        material,
                        remainder - local,
                      ) ?? null)
                    : null,
                localYears:
                  remainder > 0 && local === remainder
                    ? Math.ceil(remainder / extraction)
                    : null,
              });
            })
            .filter(
              (m) =>
                m.stock > 0 ||
                m.required > 0 ||
                m.extraction > 0 ||
                m.incoming > 0 ||
                m.reserved > 0,
            );
          const missing = materials.filter(
            (m) => m.unprovided > 0 && !m.waitingReason,
          );
          const productionIssue = input.componentProduction?.find(
            (order) =>
              order.issue &&
              missing.some((material) => material.material === order.material),
          )?.issue;
          const issue = input.issue ?? productionIssue;
          const waiting = materials.filter((m) => m.required > m.available);
          const status: SupplyStatus = !input.project
            ? 'Idle'
            : issue || missing.length
              ? 'Needs attention'
              : waiting.length || input.waitingReason
                ? 'Waiting'
                : 'Ready';
          const summary = !input.project
            ? 'No project queued'
            : (issue ??
              (missing.length
                ? missing
                    .map((m) => `${m.unprovided} ${m.material} unprovided`)
                    .join(' · ')
                : (input.waitingReason ??
                  (waiting.length
                    ? waiting
                        .map(
                          (m) =>
                            m.waitingReason ??
                            (m.localYears !== null
                              ? `Waiting for local ${m.material} extraction (~${m.localYears} year(s))`
                              : m.ordered > 0
                                ? `Waiting for ${m.material} production`
                                : `Waiting for ${m.material} delivery`),
                        )
                        .join(' · ')
                    : 'Materials and production requirements ready'))));
          return Object.freeze({
            id: input.id,
            name: input.name,
            project: input.project ? Object.freeze({ ...input.project }) : null,
            status,
            summary,
            materials: Object.freeze(materials),
            capabilities: Object.freeze(
              input.capabilities.map((c) => Object.freeze({ ...c })),
            ),
          });
        })
        .sort(
          (a, b) =>
            priority[a.status] - priority[b.status] ||
            a.name.localeCompare(b.name) ||
            a.id.localeCompare(b.id),
        ),
    );
    this.materials = Object.freeze(
      [
        ...new Set([
          ...catalogue,
          ...this.planets.flatMap((p) => p.materials.map((m) => m.material)),
          ...this.planets.flatMap((p) =>
            p.capabilities
              .filter((c) => c.kind === 'material')
              .map((c) => c.product),
          ),
        ]),
      ].sort(),
    );
    Object.freeze(this);
  }
}
