import type { GameEvent } from './Game.js';

export interface EventPlaybackSnapshot {
  readonly round: number;
  readonly events: readonly GameEvent[];
  readonly index: number;
  readonly stage: 'announcing' | 'filing';
}

/** sekventiella-arshandelser: presentation never advances the game simulation. */
export class EventPlayback {
  #index = 0;
  #stage: EventPlaybackSnapshot['stage'] = 'announcing';
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
      stage: this.#stage,
    });
  }

  get current(): GameEvent | undefined {
    return this.#events[this.#index];
  }

  advance(): boolean {
    if (this.#stage === 'announcing') {
      this.#stage = 'filing';
      return true;
    }
    this.#index += 1;
    this.#stage = 'announcing';
    return this.#index < this.#events.length;
  }
}
