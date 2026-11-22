import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
import { finishYear } from '../../fixtures/turn-steps.js';

describe('startorder-for-nybyggda-skepp / flottval-pa-orderkarta', () => {
  it('lets an explicit manual order replace a pending start order', () => {
    const state = tradeNetworkState();
    const game = Game.restore({
      ...state,
      researched: [...state.researched],
      fleets: state.fleets.map((fleet) =>
        fleet.id === 'fleet-home'
          ? { ...fleet, pendingOrder: { kind: 'explore' } }
          : fleet,
      ),
    });
    game.setDestination('fleet-home', new HexCoordinate(3, 0));
    expect(game.fleet('fleet-home')!.pendingOrder).toBeUndefined();
    finishYear(game);
    expect(game.fleet('fleet-home')!.exploration).toBeUndefined();
  });
  it('joins a moving fleet physically', () => {
    const game = Game.restore(tradeNetworkState());
    game.issueFleetOrder('fleet-home', {
      kind: 'join-fleet',
      fleetId: 'travellers',
    });
    expect(game.fleet('fleet-home')!.joinFleetId).toBe('travellers');
    expect(game.fleet('fleet-home')!.position).not.toEqual(
      game.fleet('travellers')!.position,
    );
    const restored = Game.restore(game.exportState());
    finishYear(restored);
    expect(restored.fleet('fleet-home')).toBeNull();
  });
});

describe('patrullcentrum-vid-order', () => {
  it('travels to the chosen center before beginning patrol and keeps it across reload', () => {
    const state = tradeNetworkState();
    const game = Game.restore({ ...state, pirates: [] });
    const center = new HexCoordinate(7, 0);
    game.setPatrol('fleet-home', center);
    expect(game.fleet('fleet-home')!.destination).toEqual(center);
    expect(game.fleet('fleet-home')!.patrol!.center).toEqual(center);
    const restored = Game.restore(game.exportState());
    finishYear(restored);
    expect(restored.fleet('fleet-home')!.destination).toEqual(center);
    expect(restored.fleet('fleet-home')!.patrol!.center).toEqual(center);
  });
});
