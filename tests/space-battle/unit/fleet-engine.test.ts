import { describe, expect, it } from 'vitest';
import { TacticalBattle } from '../../../src/client/space-battle/models/TacticalBattle.js';

describe('fleet-motorer-och-last', () => {
  it('preserves an unpowered ship in combat saves and prevents thrust', () => {
    const battle = TacticalBattle.create(
      'test',
      { q: 0, r: 0 },
      [
        {
          id: 'player',
          side: 'player',
          retreat: null,
          ships: [{ id: 'ship', type: 'Raptor', ion: false, powered: false }],
        },
        {
          id: 'enemy',
          side: 'enemy',
          retreat: null,
          ships: [{ id: 'pirate', type: 'Space pirate', ion: false }],
        },
      ],
      1,
    );
    const restored = TacticalBattle.restore(battle.snapshot);
    expect(
      restored.snapshot.pieces.find((piece) => piece.id === 'ship')!.movement,
    ).toBe(0);
  });
});
