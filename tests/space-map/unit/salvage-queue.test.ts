import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { salvageState, finishYear } from '../../fixtures/salvage.js';

describe('bargningsko', () => {
  it('assigns a known wreck to an idle salvage ship and restores the queue from saves', () => {
    const game = Game.restore(salvageState());
    game.addWreckToSalvageQueue('advanced-wreck');
    expect(game.salvageQueue[0]).toMatchObject({
      wreckId: 'advanced-wreck',
      assignedFleetId: 'fleet-home',
    });
    expect(game.fleet('fleet-home')?.salvage?.targets).toContain(
      'advanced-wreck',
    );
    expect(Game.restore(game.exportState()).salvageQueue).toEqual(
      game.salvageQueue,
    );
    for (let i = 0; i < 8 && game.salvageQueue.length; i++) finishYear(game);
    expect(game.salvageQueue).toEqual([]);
    expect(
      game.events.some((event) => event.text.includes('wreck delivered')),
    ).toBe(true);
  });
  it('waits without a salvage ship, allows removal, and reads older saves', () => {
    const state = salvageState();
    const old = { ...state, fleets: [] };
    const game = Game.restore(old);
    game.addWreckToSalvageQueue('advanced-wreck');
    expect(game.salvageQueue[0]?.assignedFleetId).toBeNull();
    expect(Game.restore(game.exportState()).salvageQueue).toEqual(
      game.salvageQueue,
    );
    game.removeWreckFromSalvageQueue('advanced-wreck');
    expect(game.salvageQueue).toEqual([]);
    expect(Game.restore(old).salvageQueue).toEqual([]);
  });
  it('reorders waiting wrecks and preserves unrelated manual orders on removal', () => {
    const state = salvageState();
    state.salvage.wrecks.push({
      ...structuredClone(state.salvage.wrecks[0]!),
      id: 'second-wreck',
    });
    const waiting = Game.restore({ ...state, fleets: [] });
    waiting.addWreckToSalvageQueue('advanced-wreck');
    waiting.addWreckToSalvageQueue('second-wreck');
    waiting.addWreckToSalvageQueue('second-wreck');
    waiting.moveWreckInSalvageQueue('second-wreck', 0);
    expect(waiting.salvageQueue.map((item) => item.wreckId)).toEqual([
      'second-wreck',
      'advanced-wreck',
    ]);
    const active = Game.restore({
      ...state,
      salvageQueue: waiting.exportState().salvageQueue ?? [],
    });
    active.startTurn();
    expect(active.fleet('fleet-home')?.salvage?.targets).toContain(
      'second-wreck',
    );
  });
  it('removes an assigned queue target before pickup without disturbing manual salvage', () => {
    const game = Game.restore(salvageState());
    game.addWreckToSalvageQueue('advanced-wreck');
    game.removeWreckFromSalvageQueue('advanced-wreck');
    expect(
      game.wrecks.find((wreck) => wreck.id === 'advanced-wreck')?.reservedBy,
    ).toBeNull();
    game.orderSalvage('fleet-home', 'advanced-wreck');
    game.removeWreckFromSalvageQueue('advanced-wreck');
    expect(
      game.wrecks.find((wreck) => wreck.id === 'advanced-wreck')?.reservedBy,
    ).toBe('fleet-home');
  });
});
