export type PlanetQueueKind = 'exploration' | 'colonization';

export interface PlanetQueuesSnapshot {
  readonly exploration: readonly string[];
  readonly colonization: readonly string[];
}

/** utforskningsko / koloniseringsko: preserve the player's priority order. */
export class PlanetQueues {
  readonly #queues: Record<PlanetQueueKind, string[]>;

  constructor(
    saved: PlanetQueuesSnapshot = { exploration: [], colonization: [] },
  ) {
    this.#queues = { exploration: [], colonization: [] };
    for (const kind of ['exploration', 'colonization'] as const) {
      const queue: unknown = saved[kind];
      if (
        !Array.isArray(queue) ||
        queue.some((id: unknown) => typeof id !== 'string' || !id) ||
        new Set(queue).size !== queue.length
      )
        throw new Error('Invalid saved planet queue.');
      this.#queues[kind] = queue.map((id: unknown) => id as string);
    }
  }

  snapshot(): PlanetQueuesSnapshot {
    return Object.freeze({
      exploration: Object.freeze([...this.#queues.exploration]),
      colonization: Object.freeze([...this.#queues.colonization]),
    });
  }

  add(kind: PlanetQueueKind, planetId: string): void {
    if (!planetId) throw new Error('Choose a planet.');
    if (!this.#queues[kind].includes(planetId))
      this.#queues[kind].push(planetId);
  }

  remove(kind: PlanetQueueKind, planetId: string): void {
    this.#queues[kind] = this.#queues[kind].filter((id) => id !== planetId);
  }

  move(kind: PlanetQueueKind, planetId: string, index: number): void {
    const queue = this.#queues[kind];
    const from = queue.indexOf(planetId);
    if (
      from < 0 ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= queue.length
    )
      throw new Error('Choose a valid planet queue position.');
    queue.splice(from, 1);
    queue.splice(index, 0, planetId);
  }
}
