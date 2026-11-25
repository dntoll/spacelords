import { describe, expect, it } from 'vitest';
import {
  TacticalBattle,
  battleWeapons,
} from '../../../src/client/space-battle/models/TacticalBattle.js';

describe('fleet-vapenplatser', () => {
  it('uses the installed weapons instead of the ship type, including after saving a battle', () => {
    const battle = TacticalBattle.create(
      'weapons',
      { q: 0, r: 0 },
      [
        {
          id: 'player',
          side: 'player',
          retreat: null,
          ships: [
            {
              id: 'fighter',
              type: 'Fighter',
              ion: false,
              weapons: ['Light cannon', 'Cannon'],
            },
            { id: 'raptor', type: 'Raptor', ion: false, weapons: [] },
          ],
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
    const fighter = restored.snapshot.pieces.find(
      (piece) => piece.id === 'fighter',
    )!;
    const raptor = restored.snapshot.pieces.find(
      (piece) => piece.id === 'raptor',
    )!;
    expect(
      battleWeapons(fighter.type, fighter.hasMissiles, fighter.weapons),
    ).toEqual(['Light cannon', 'Cannon']);
    expect(
      battleWeapons(raptor.type, raptor.hasMissiles, raptor.weapons),
    ).toEqual([]);
  });
});
