import type { GameEvent } from './Game.js';

export interface EventPlaybackSnapshot {
  readonly round: number;
  readonly events: readonly GameEvent[];
  readonly index: number;
  readonly paused: boolean;
}

/** sekventiella-arshandelser: presentation never advances the game simulation. */
export class EventPlayback {
  #index = 0;
  #paused = false;
  readonly #events: readonly GameEvent[];

  constructor(
    readonly round: number,
    events: readonly GameEvent[],
  ) {
    this.#events = Object.freeze(
      events.filter((event) => event.round === round),
    );
  }

  get snapshot(): EventPlaybackSnapshot {
    return Object.freeze({
      round: this.round,
      events: this.#events,
      index: this.#index,
      paused: this.#paused,
    });
  }

  get current(): GameEvent | undefined {
    return this.#events[this.#index];
  }

  togglePause(): void {
    this.#paused = !this.#paused;
  }

  advance(manual = false): boolean {
    if (this.#paused && !manual) return true;
    if (manual) this.#paused = true;
    this.#index += 1;
    return this.#index < this.#events.length;
  }
}
