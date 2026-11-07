import { TacticalBattle } from '../TacticalBattle.js';

/** fuskknapp-for-teststrid: isolated deployment with both small and large ships. */
export function createTestBattle(): TacticalBattle {
  const battle = TacticalBattle.create(
    'test-battle',
    { q: 0, r: 0 },
    [
      {
        id: 'test-player',
        side: 'player',
        retreat: { q: -1, r: 0 },
        ships: [
          { id: 'test-fighter-1', type: 'Fighter', ion: false },
          { id: 'test-fighter-2', type: 'Fighter', ion: false },
          { id: 'test-explorer', type: 'Exploration ship', ion: false },
          { id: 'test-transport', type: 'Transport ship', ion: false },
          { id: 'test-colonizer', type: 'Colony ship', ion: false },
        ],
      },
      {
        id: 'test-enemy',
        side: 'enemy',
        retreat: { q: 1, r: 0 },
        ships: [
          { id: 'test-pirate-1', type: 'Space pirate', ion: false },
          { id: 'test-pirate-2', type: 'Space pirate', ion: false },
        ],
      },
    ],
    Date.now() >>> 0,
  );
  return TacticalBattle.restore({
    ...battle.snapshot,
    log: [
      'Test battle. Deploy every ship, including the large Transport ship and Colony ship. Retreat through the green Escape hexes from round two. Saved games are unchanged.',
    ],
  });
}
