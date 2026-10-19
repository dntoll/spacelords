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
    // engangsreset-ekonomi: explicitly authorized for this release only.
    // Future save-format changes must preserve games unless separately authorized.
    if (this.storage.getItem('spacelords.economy-v2-reset') !== 'done') {
      for (const legacySlot of [1, 2, 3])
        this.storage.removeItem(`spacelords.save.v1.${legacySlot}`);
      try {
        this.storage.setItem('spacelords.economy-v2-reset', 'done');
      } catch {
        throw new Error(
          'Game could not be saved. Browser storage may be unavailable or full.',
        );
      }
    }
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
    try {
      this.storage.setItem(this.#key(slot), JSON.stringify(game));
    } catch {
      throw new Error(
        'Game could not be saved. Browser storage may be unavailable or full.',
      );
    }
  }
  clear(slot: number): void {
    this.storage.removeItem(this.#key(slot));
  }
}
