import { describe, expect, it } from 'vitest';
import {
  Game,
  type GameState,
} from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';

/** Runs one stage the way the app does, ignoring discovery pauses. */
function stage(game: Game) {
  game.startTurn(game.enemyTurnPending ? 'enemy' : 'player');
  for (let step = 0; step < 40; step++) {
    if (game.phase === 'interrupted') game.continueTurn();
    const frame = game.nextTurnFrame();
    if (!frame) break;
    game.applyFrame(frame);
  }
  game.finishTurn();
}

function start() {
  const state = new Game(createExampleGalaxy()).exportState();
  const fleet = state.fleets[0]!;
  const game = Game.restore({ ...state });
  return { game, fleet, pirates: () => game.exportState().pirates! };
}

describe('ap-pa-starmap', () => {
  it('moves only the player’s fleet and keeps unspent AP without ending the round', () => {
    const { game, fleet, pirates } = start();
    const speed = game.fleetSnapshots()[0]!.speed;
    expect(speed).toBeGreaterThanOrEqual(2);
    expect(game.fleetSnapshots()[0]!.actionPoints).toBe(speed);
    const before = pirates();
    const target = new HexCoordinate(fleet.position!.q + 1, fleet.position!.r);
    game.setDestination(fleet.id, target);
    stage(game);
    expect(game.fleet(fleet.id)!.position?.key).toBe(target.key);
    expect(game.fleetSnapshots()[0]!.actionPoints).toBe(speed - 1);
    expect(game.round).toBe(1);
    expect(game.enemyTurnPending).toBe(false);
    expect(pirates()).toEqual(before);
  });

  it('lets the enemies act once the AP are spent, then begins the next round with full AP', () => {
    const { game, fleet, pirates } = start();
    const speed = game.fleetSnapshots()[0]!.speed;
    const before = pirates();
    const far = new HexCoordinate(
      fleet.position!.q + speed + 2,
      fleet.position!.r,
    );
    game.setDestination(fleet.id, far);
    stage(game);
    expect(game.fleetSnapshots()[0]!.actionPoints).toBe(0);
    expect(game.enemyTurnPending).toBe(true);
    expect(game.round).toBe(1);
    expect(pirates()).toEqual(before);
    stage(game);
    expect(game.enemyTurnPending).toBe(false);
    expect(game.round).toBe(2);
    expect(game.fleetSnapshots()[0]!.actionPoints).toBe(speed);
    expect(pirates()).not.toEqual(before);
    // The fleet did not move while the enemies acted.
    expect(game.fleet(fleet.id)!.destination?.key).toBe(far.key);
  });

  it('keeps AP and a pending enemy turn in a saved game', () => {
    const { game, fleet } = start();
    game.setDestination(
      fleet.id,
      new HexCoordinate(fleet.position!.q + 1, fleet.position!.r),
    );
    stage(game);
    const saved = JSON.parse(JSON.stringify(game.exportState())) as GameState;
    const loaded = Game.restore(saved);
    expect(loaded.fleetSnapshots()[0]!.actionPoints).toBe(
      game.fleetSnapshots()[0]!.actionPoints,
    );
    expect(loaded.enemyTurnPending).toBe(game.enemyTurnPending);
    expect(loaded.exportState()).toEqual(saved);
  });
});
