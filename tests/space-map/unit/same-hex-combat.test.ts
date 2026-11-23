import { describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import type { IntentHandler } from '../../../src/client/app/views/ViewContracts.js';
import { discoveryState } from '../../fixtures/exploration.js';
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

describe('strid-i-samma-hex / upptackt-stannar-resan', () => {
  it('starts the combat when discoveries interrupt the arrival in the pirate’s hex', async () => {
    vi.useFakeTimers();
    try {
      const state = discoveryState();
      const lair = state.pirates[0]!.position;
      const model = new AppModel(undefined, {
        load: () => ({ lastPlayed: '2026-11-23T00:00:00Z', state }),
        save() {},
        clear() {},
      });
      model.startSlot(1);
      let emit!: IntentHandler;
      const controller = new MasterController(model, {
        bind(handler) {
          emit = handler;
        },
        render() {},
        animateTurnStep: () => Promise.resolve(),
        dispose() {},
      });
      controller.start();
      const target = new HexCoordinate(lair.q, lair.r);
      emit({ type: 'select', position: target });
      emit({ type: 'select', position: target });
      for (let step = 0; step < 60 && !model.snapshot.tacticalBattle; step++)
        await vi.advanceTimersByTimeAsync(500);
      expect(model.snapshot.fleet.position?.key).toBe(target.key);
      expect(model.snapshot.tacticalBattle).not.toBeNull();
      controller.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});
