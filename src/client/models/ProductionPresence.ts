import type { ProjectType } from './Game.js';

export interface ProductionPresenceSnapshot {
  readonly presence: 'local' | 'network' | 'queued' | 'missing';
  readonly networkCount: number;
  readonly queuedLocalCount: number;
  readonly queuedNetworkCount: number;
}

export interface ProductionPresenceSource {
  readonly id: string;
  readonly counts: ReadonlyMap<ProjectType, number>;
  readonly queued: ReadonlyMap<ProjectType, number>;
}

/** produktionsvalens-statusfarger: physical presence is independent of build permission. */
export class ProductionPresence {
  constructor(
    private readonly local: ProductionPresenceSource,
    private readonly network: readonly ProductionPresenceSource[],
  ) {}

  snapshot(type: ProjectType): ProductionPresenceSnapshot {
    const localCount = this.local.counts.get(type) ?? 0;
    const networkCount = this.network.reduce(
      (total, source) => total + (source.counts.get(type) ?? 0),
      0,
    );
    const queuedLocalCount = this.local.queued.get(type) ?? 0;
    const queuedNetworkCount = this.network.reduce(
      (total, source) => total + (source.queued.get(type) ?? 0),
      0,
    );
    return Object.freeze({
      presence:
        localCount > 0
          ? 'local'
          : networkCount > 0
            ? 'network'
            : queuedLocalCount + queuedNetworkCount > 0
              ? 'queued'
              : 'missing',
      networkCount,
      queuedLocalCount,
      queuedNetworkCount,
    });
  }
}
