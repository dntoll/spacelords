import { describe, expect, it } from 'vitest';
import {
  Game,
  type GameState,
} from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';

describe('sparformat', () => {
  it('loads the current format and rejects older saved games instead of migrating them', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    expect(state.version).toBe(17);
    expect(Game.restore(state).exportState()).toEqual(state);
    for (const version of [2, 9, 16])
      expect(() =>
        Game.restore({ ...state, version } as unknown as GameState),
      ).toThrow('This saved game cannot be loaded.');
    expect(() =>
      Game.restore({ ...state, phase: 'summary' } as unknown as GameState),
    ).toThrow('This saved game cannot be loaded.');
  });
});
