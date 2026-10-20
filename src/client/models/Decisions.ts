export interface DecisionDescriptor {
  readonly id: string;
  readonly label: string;
  readonly kind: 'research' | 'planet' | 'fleet' | 'route';
  readonly planetId?: string;
  readonly fleetId?: string;
  readonly routeId?: string;
}

export interface Decision extends DecisionDescriptor {
  readonly skipped: boolean;
  readonly muted: boolean;
  readonly current: boolean;
}

export function needsAttention(decision: Decision): boolean {
  return decision.current && !decision.skipped && !decision.muted;
}

export class DecisionBoard {
  readonly #muted = new Map<string, Readonly<DecisionDescriptor>>();

  constructor(
    readonly skipped = new Set<string>(),
    muted: readonly DecisionDescriptor[] = [],
  ) {
    for (const item of muted) this.mute(item);
  }

  get muted(): readonly DecisionDescriptor[] {
    return Object.freeze([...this.#muted.values()]);
  }

  mute(item: DecisionDescriptor): void {
    this.#muted.set(
      item.id,
      Object.freeze({
        id: item.id,
        label: item.label,
        kind: item.kind,
        ...(item.planetId ? { planetId: item.planetId } : {}),
        ...(item.fleetId ? { fleetId: item.fleetId } : {}),
        ...(item.routeId ? { routeId: item.routeId } : {}),
      }),
    );
    this.skipped.delete(item.id);
  }

  unmute(id: string): void {
    this.#muted.delete(id);
    this.skipped.delete(id);
  }

  snapshot(items: readonly DecisionDescriptor[]): readonly Decision[] {
    const current = new Set(items.map((item) => item.id));
    const all = [
      ...items,
      ...this.muted.filter((item) => !current.has(item.id)),
    ];
    return Object.freeze(
      all.map((item) =>
        Object.freeze({
          ...item,
          skipped: this.skipped.has(item.id),
          muted: this.#muted.has(item.id),
          current: current.has(item.id),
        }),
      ),
    );
  }
}
