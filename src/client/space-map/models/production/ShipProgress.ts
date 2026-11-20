import type { Material } from '../Economy.js';
import type {
  ConstructionProjectSnapshot,
  NetworkSnapshot,
  ShipPurpose,
} from '../Game.js';
import { SHIPS } from '../Game.js';

/** byggkons-framsteg: one part of a queued ship and where it stands. */
export interface ShipPartProgress {
  readonly part: Material;
  readonly needed: number;
  readonly delivered: number;
  /**
   * `delivered`: in place. `coming`: in stock, being made or on its way.
   * `missing`: the group can neither supply nor make it.
   */
  readonly status: 'delivered' | 'coming' | 'missing';
}

/** byggkons-framsteg: what a queued ship waits for. */
export interface ShipProgressSnapshot {
  readonly projectId: string;
  readonly type: string;
  readonly purpose: ShipPurpose | null;
  /**
   * `factory`: another ship is using its factory. `parts`: parts are being
   * gathered. `ready`: every part is in place and the ship completes.
   */
  readonly state: 'factory' | 'parts' | 'ready';
  readonly parts: readonly ShipPartProgress[];
  /** Estimated rounds until the ship is finished, null while queued. */
  readonly roundsLeft: number | null;
}

export function shipProgress(
  planetId: string,
  projects: readonly ConstructionProjectSnapshot[],
  network: NetworkSnapshot,
): readonly ShipProgressSnapshot[] {
  const missing = new Set(network.missing[planetId] ?? []);
  return Object.freeze(
    projects
      .filter((project) => Object.hasOwn(SHIPS, project.type))
      .map((project): ShipProgressSnapshot => {
        const consumer = network.consumers.find(
          (item) => item.id === project.id,
        );
        const purpose = project.purpose ?? null;
        if (!consumer)
          return Object.freeze({
            projectId: project.id,
            type: project.type,
            purpose,
            state: 'factory',
            parts: Object.freeze([]),
            roundsLeft: null,
          });
        const parts = (Object.entries(consumer.needs) as [Material, number][])
          .filter(([, needed]) => needed > 0)
          .map(([part, needed]) => {
            const delivered = Math.min(needed, consumer.delivered[part] ?? 0);
            return Object.freeze({
              part,
              needed,
              delivered,
              status:
                delivered >= needed
                  ? ('delivered' as const)
                  : missing.has(part)
                    ? ('missing' as const)
                    : ('coming' as const),
            });
          });
        const ready = parts.every((part) => part.status === 'delivered');
        return Object.freeze({
          projectId: project.id,
          type: project.type,
          purpose,
          state: ready ? 'ready' : 'parts',
          parts: Object.freeze(parts),
          roundsLeft: parts.some((part) => part.status === 'missing')
            ? null
            : ready
              ? 1
              : Math.max(
                  1,
                  consumer.arrivalRounds + (consumer.waiting.length ? 1 : 0),
                ),
        });
      }),
  );
}
