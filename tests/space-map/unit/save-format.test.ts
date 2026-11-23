import { describe, expect, it } from 'vitest';
import {
  Game,
  type GameState,
} from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { BrowserSaveRepository } from '../../../src/client/space-map/storage/BrowserSaveRepository.js';

describe('sparformat', () => {
  it('loads the current format and rejects older saved games instead of migrating them', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    expect(state.version).toBe(18);
    expect(Game.restore(state).exportState()).toEqual(state);
    // single-fleet-rensning: saves from before the Single fleet cleanup are rejected.
    for (const version of [2, 9, 16, 17])
      expect(() =>
        Game.restore({ ...state, version } as unknown as GameState),
      ).toThrow('This saved game cannot be loaded.');
    expect(() =>
      Game.restore({ ...state, phase: 'summary' } as unknown as GameState),
    ).toThrow('This saved game cannot be loaded.');
  });
});

describe('sparformat / single-fleet-rensning', () => {
  it('shows a version 17 slot as unreadable, keeps it until cleared and then starts a new game', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    const old = JSON.stringify({
      lastPlayed: '2026-11-01T00:00:00Z',
      state: { ...state, version: 17 },
    });
    const storage = new Map([['spacelords.save.v2.1', old]]);
    const model = new AppModel(
      undefined,
      new BrowserSaveRepository({
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
        removeItem: (key) => {
          storage.delete(key);
        },
      }),
    );
    expect(model.snapshot.saveSlots[0]?.error).toBe(
      'Saved game unavailable. Clear this slot to start again.',
    );
    expect(() => model.startSlot(1)).toThrow();
    expect(storage.get('spacelords.save.v2.1')).toBe(old);
    model.requestClearSlot(1);
    model.confirmClearSlot();
    model.startSlot(1);
    expect(model.snapshot).toMatchObject({ screen: 'map', round: 1 });
    const home = state.fleets[0]!.position!;
    expect(model.snapshot.fleet?.position?.key).toBe(`${home.q},${home.r}`);
  });
});
