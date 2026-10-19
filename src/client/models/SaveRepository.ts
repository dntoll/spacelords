import type { GameState } from './Game.js';

export interface SavedGame {
  readonly lastPlayed: string;
  readonly state: GameState;
}

/** frontend-backend-mock: storage boundary; no browser dependencies in the model. */
export interface SaveRepository {
  load(slot: number): SavedGame | null;
  save(slot: number, game: SavedGame): void;
  clear(slot: number): void;
}
