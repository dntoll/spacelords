import { turnFrames } from '../fixtures/turn-steps.js';
import { expect, it } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';

it('ruttflotta-till-narmaste-andplanet: saves the approach, moves physically and starts deliveries after arrival', () => {
  const original = tradeNetworkState();
  const state = {
    ...original,
    fleets: original.fleets.map((f) =>
      f.id === 'freighters' ? { ...f, position: { q: 4, r: 0 } } : f,
    ),
  };
  let game = Game.restore(state);
  game.assignTradeFleet('route-test', 'freighters');
  const fleet = () => game.fleetSnapshots().find((f) => f.id === 'freighters')!;
  expect(fleet().position).toEqual(new HexCoordinate(4, 0));
  expect(fleet().destination).toEqual(new HexCoordinate(1, 0));
  game = Game.restore(game.exportState());
  expect(fleet().routeId).toBe('route-test');
  expect(fleet().destination).toEqual(new HexCoordinate(1, 0));
  let delivered = false;
  for (let year = 0; year < 15; year++) {
    const before = fleet().position!;
    for (const frame of turnFrames(game)) game.applyFrame(frame);
    game.finishTurn();
    expect(before.distanceTo(fleet().position!)).toBeLessThanOrEqual(
      fleet().speed,
    );
    delivered ||= game.events.some((event) => event.text.includes('delivered'));
  }
  expect(delivered).toBe(true);
});
