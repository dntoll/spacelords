import type { SavedGame, SaveRepository } from '../models/SaveRepository.js';

export class BrowserSaveRepository implements SaveRepository {
  constructor(
    private readonly storage: Pick<
      Storage,
      'getItem' | 'setItem' | 'removeItem'
    >,
  ) {}

  #key(slot: number): string {
    if (!Number.isInteger(slot) || slot < 1 || slot > 3)
      throw new Error('Unknown save slot.');
    return `spacelords.save.v2.${slot}`;
  }
  load(slot: number): SavedGame | null {
    this.#prepareStorage();
    const raw = this.storage.getItem(this.#key(slot));
    if (raw === null) return null;
    const record = JSON.parse(raw) as SavedGame;
    if (
      !record ||
      typeof record.lastPlayed !== 'string' ||
      !Number.isFinite(Date.parse(record.lastPlayed)) ||
      !record.state
    )
      throw new Error('This saved game cannot be loaded.');
    return record;
  }
  save(slot: number, game: SavedGame): void {
    this.#prepareStorage();
    try {
      this.storage.setItem(this.#key(slot), JSON.stringify(game));
    } catch {
      throw new Error(
        'Game could not be saved. Browser storage may be unavailable or full.',
      );
    }
  }
  #prepareStorage(): void {
    // engangsreset-utokad-galax: explicitly authorized on 2026-10-26.
    // Ask again before future incompatible changes; this is not a reset policy.
    if (this.storage.getItem('spacelords.expanded-galaxy-v12-reset') === 'done')
      return;
    try {
      for (const slot of [1, 2, 3]) {
        this.storage.removeItem(`spacelords.save.v1.${slot}`);
        this.storage.removeItem(this.#key(slot));
      }
      this.storage.setItem('spacelords.terraforming-v5-reset', 'done');
      this.storage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    } catch {
      throw new Error(
        'Game storage could not be initialized. Browser storage may be unavailable or full.',
      );
    }
  }
  clear(slot: number): void {
    this.storage.removeItem(this.#key(slot));
  }
}
