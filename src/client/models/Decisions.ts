export interface Decision {
  readonly id: string;
  readonly label: string;
  readonly kind: 'research' | 'planet' | 'fleet' | 'route';
  readonly planetId?: string;
  readonly fleetId?: string;
  readonly routeId?: string;
  readonly skipped: boolean;
}

export class DecisionBoard {
  constructor(readonly skipped = new Set<string>()) {}
  snapshot(items: readonly Omit<Decision, 'skipped'>[]): readonly Decision[] {
    return Object.freeze(
      items.map((item) =>
        Object.freeze({ ...item, skipped: this.skipped.has(item.id) }),
      ),
    );
  }
}
