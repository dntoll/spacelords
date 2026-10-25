import { turnFrames } from '../fixtures/turn-steps.js';
import { describe, expect, it } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';

describe('tomma-flottor-utan-position', () => {
  it('receives its first ship from any hex and releases position when emptied', () => {
    const game = new Game(createExampleGalaxy());
    const home = game.fleetSnapshots()[0]!;
    const empty = game.createFleet(home.id);
    expect(empty.position).toBeNull();
    game.setDestination(home.id, new HexCoordinate(0, 1));
    for (const frame of turnFrames(game)) game.applyFrame(frame);
    game.finishTurn();

    game.transferShips(home.id, 'Fighter', 1, empty.id);
    game.setDestination(empty.id, new HexCoordinate(1, 0));
    for (const frame of turnFrames(game)) game.applyFrame(frame);
    game.finishTurn();

    game.transferShips(home.id, 'Exploration ship', 1, empty.id);
    expect(game.fleet(empty.id)!.ships['Exploration ship']).toBe(0);
    expect(
      game.fleetSnapshots().some((fleet) => fleet.joinFleetId === empty.id),
    ).toBe(true);
    for (const frame of turnFrames(game)) game.applyFrame(frame);
    game.finishTurn();

    expect(game.fleet(empty.id)!.ships['Exploration ship']).toBe(1);
    expect(game.fleet(home.id)!.position).toBeNull();
    expect(game.fleet(home.id)!.destination).toBeNull();
    expect(() => game.setDestination(home.id, new HexCoordinate(1, 0))).toThrow(
      /Empty/,
    );
  });
  it('restores old empty fleets without keeping their obsolete location', () => {
    const game = new Game(createExampleGalaxy());
    const empty = game.createFleet('fleet-home');
    const state = game.exportState();
    const legacy = {
      ...state,
      fleets: state.fleets.map((fleet) =>
        fleet.id === empty.id ? { ...fleet, position: { q: 7, r: 0 } } : fleet,
      ),
    };
    const restored = Game.restore(legacy);
    expect(restored.fleet(empty.id)!.position).toBeNull();
    expect(
      Game.restore(restored.exportState()).fleet(empty.id)!.position,
    ).toBeNull();
    expect(restored.fleet('fleet-home')!.position).not.toBeNull();
  });
});
