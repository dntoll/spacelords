import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';

function untilBattle(game: Game) {
  game.startTurn();
  for (let step = 0; step < 30 && !game.tacticalBattle; step++) {
    if (game.phase === 'interrupted') game.continueTurn();
    const frame = game.nextTurnFrame();
    if (!frame) break;
    game.applyFrame(frame);
  }
  return game.tacticalBattle;
}

function setup(offset: { q: number; r: number }) {
  const state = new Game(createExampleGalaxy()).exportState();
  const pirate = state.pirates![0]!;
  const start = {
    q: pirate.position.q + offset.q,
    r: pirate.position.r + offset.r,
  };
  return {
    pirate,
    game: Game.restore({
      ...state,
      pirates: [pirate],
      fleets: [{ ...state.fleets[0]!, position: start }],
    }),
  };
}

describe('strid-i-samma-hex', () => {
  it('starts combat before anyone moves when the fleets begin the round in the same hex', () => {
    const { game, pirate } = setup({ q: 0, r: 0 });
    expect(untilBattle(game)).not.toBeNull();
    expect(game.exportState().pirates![0]!.position).toEqual(pirate.position);
  });

  it('holds the pirate in its hex when the player’s fleet moves in, so they fight', () => {
    const { game, pirate } = setup({ q: -1, r: 0 });
    game.setDestination(
      'fleet-home',
      new HexCoordinate(pirate.position.q, pirate.position.r),
    );
    expect(untilBattle(game)).not.toBeNull();
    expect(game.fleet('fleet-home')!.position?.key).toBe(
      `${pirate.position.q},${pirate.position.r}`,
    );
    expect(game.exportState().pirates![0]!.position).toEqual(pirate.position);
  });
});
