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
  readonly stock: Quantities;
  readonly reserved: Quantities;
  readonly demand: Quantities;
  readonly extraction: Quantities;
  readonly deposits: Quantities;
  readonly capabilities: readonly ProductionCapability[];
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
  readonly unprovided: number;
  readonly localYears: number | null;
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

export interface SupplySelectionSnapshot {
  readonly query: string;
  readonly material: string | null;
  readonly expanded: readonly string[];
  readonly inventories: readonly string[];
}

export class SupplySelection {
  #query = '';
  #material: string | null = null;
  readonly #expanded = new Set<string>();
  readonly #inventories = new Set<string>();
  get snapshot(): SupplySelectionSnapshot {
    return Object.freeze({
      query: this.#query,
      material: this.#material,
      expanded: Object.freeze([...this.#expanded]),
      inventories: Object.freeze([...this.#inventories]),
    });
  }
  search(query: string): void {
    this.#query = query;
    this.#material = null;
  }
  select(material: string | null): void {
    this.#material = material;
    this.#query = '';
  }
  expand(id: string): void {
    this.#expanded.add(id);
  }
  toggle(id: string, inventory = false): void {
    const collection = inventory ? this.#inventories : this.#expanded;
    if (collection.has(id)) collection.delete(id);
    else collection.add(id);
  }
  reset(): void {
    this.#query = '';
    this.#material = null;
    this.#expanded.clear();
    this.#inventories.clear();
  }
}

// forsorjningsstatus: assess commitments separately from possible production.
export class SupplyOverview {
  readonly planets: readonly SupplyPlanet[];
  readonly materials: readonly string[];

  constructor(
    inputs: readonly SupplyPlanetInput[],
    shipments: readonly ShipmentSnapshot[],
    catalogue: readonly string[] = [],
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
              const remainder = Math.max(0, required - available - supplied);
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
                unprovided: remainder - local,
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
          const missing = materials.filter((m) => m.unprovided > 0);
          const waiting = materials.filter((m) => m.required > m.available);
          const status: SupplyStatus = !input.project
            ? 'Idle'
            : input.issue || missing.length
              ? 'Needs attention'
              : waiting.length
                ? 'Waiting'
                : 'Ready';
          const summary = !input.project
            ? 'No project queued'
            : (input.issue ??
              (missing.length
                ? missing
                    .map((m) => `${m.unprovided} ${m.material} unprovided`)
                    .join(' · ')
                : waiting.length
                  ? waiting
                      .map((m) =>
                        m.localYears !== null
                          ? `Waiting for local ${m.material} extraction (~${m.localYears} year(s))`
                          : `Waiting for ${m.material} delivery`,
                      )
                      .join(' · ')
                  : 'Materials and production requirements ready'));
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
