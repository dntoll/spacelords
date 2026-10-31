import { TacticalBattle } from './TacticalBattle.js';

/** fuskknapp-for-teststrid: isolated combat with targets already in weapon range. */
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
  const positions = [
    { q: 1, r: 3 },
    { q: 1, r: 5 },
    { q: 0, r: 7 },
    { q: 4, r: 3 },
    { q: 4, r: 5 },
  ];
  return TacticalBattle.restore({
    ...battle.snapshot,
    phase: 'fighting',
    round: 1,
    turn: 'player',
    asteroids: [],
    pieces: battle.snapshot.pieces.map((piece, index) => ({
      ...piece,
      position: positions[index]!,
      facing: piece.side === 'player' ? 0 : 3,
    })),
    log: ['Test battle. Saved games are unchanged.'],
  });
}
