import { Game, type GameState } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import type { BattleState } from '../../src/client/models/TacticalBattle.js';

export function encounterGame(): Game {
  const state = new Game(createExampleGalaxy()).exportState();
  const first = state.fleets[0]!;
  const game = Game.restore({
    ...state,
    pirates: [state.pirates![0]!],
    fleets: [
      {
        ...first,
        position: { q: 8, r: -4 },
        shipUnits: [],
        ships: { ...first.ships, Fighter: 2, 'Transport ship': 1 },
      },
    ],
  });
  game.startTurn();
  for (let step = 0; !game.tacticalBattle && step < 20; step++) {
    if (game.phase === 'interrupted') game.continueTurn();
    const frame = game.nextTurnFrame();
    if (!frame) throw new Error('No encounter occurred.');
    game.applyFrame(frame);
  }
  if (!game.tacticalBattle) throw new Error('No tactical battle.');
  return game;
}

/** Arrange a legal battle checkpoint without changing the strategic participants. */
export function arrangeBattle(
  game: Game,
  change: (state: BattleState) => BattleState,
): Game {
  const state: GameState = game.exportState();
  const battles = state.simulation!.tacticalBattles!;
  return Game.restore({
    ...state,
    simulation: {
      ...state.simulation!,
      tacticalBattles: [change(battles[0]!), ...battles.slice(1)],
    },
  });
}
