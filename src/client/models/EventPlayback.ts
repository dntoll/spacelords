import type { GameEvent } from './Game.js';

export interface EventDecision {
  readonly title: string;
  readonly details: readonly string[];
  readonly fleetId: string | null;
}

export interface PlaybackEvent extends GameEvent {
  readonly decision?: EventDecision;
}

export interface EventPlaybackSnapshot {
  readonly round: number;
  readonly events: readonly PlaybackEvent[];
  readonly history?: readonly GameEvent[];
  readonly index: number;
  readonly stage: 'framing' | 'announcing' | 'awaiting-choice' | 'filing';
  readonly choice?: 'handle' | 'ignore' | null;
}

/** sekventiella-arshandelser: presentation never advances the game simulation. */
export class EventPlayback {
  #index = 0;
  #stage: EventPlaybackSnapshot['stage'] = 'announcing';
  #choice: 'handle' | 'ignore' | null = null;
  readonly #events: readonly PlaybackEvent[];

  constructor(
    readonly round: number,
    events: readonly PlaybackEvent[],
    readonly history: readonly GameEvent[] = [],
  ) {
    this.#events = Object.freeze(
      events.filter((event) => event.round === round),
    );
    this.history = Object.freeze([...history]);
    this.#stage = this.current?.decision ? 'awaiting-choice' : 'announcing';
  }

  get snapshot(): EventPlaybackSnapshot {
    return Object.freeze({
      round: this.round,
      events: this.#events,
      history: this.history,
      index: this.#index,
      stage: this.#stage,
      choice: this.#choice,
    });
  }

  get current(): PlaybackEvent | undefined {
    return this.#events[this.#index];
  }

  beginFraming(): void {
    this.#stage = 'framing';
  }

  finishFraming(): void {
    if (this.#stage === 'framing')
      this.#stage = this.current?.decision ? 'awaiting-choice' : 'announcing';
  }

  choose(choice: 'handle' | 'ignore'): void {
    if (this.#stage !== 'awaiting-choice') return;
    this.#choice = choice;
    this.#stage = 'filing';
  }

  advance(): boolean {
    if (this.#stage === 'framing' || this.#stage === 'awaiting-choice')
      return true;
    if (this.#stage === 'announcing') {
      this.#stage = 'filing';
      return true;
    }
    this.#index += 1;
    this.#choice = null;
    this.#stage = this.current?.decision ? 'awaiting-choice' : 'announcing';
    return this.#index < this.#events.length;
  }
}
