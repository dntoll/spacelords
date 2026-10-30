import { describe, expect, it } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { collectTurnFrames } from '../fixtures/turn-steps.js';

function loadedTransports() {
  const state = tradeNetworkState();
  const target = state.world.systems
    .flatMap((system) => system.planets)
    .find((planet) => planet.id === 'sol-1')!;
  return {
    ...state,
    fleets: state.fleets.map((fleet) =>
      ['freighters', 'travellers'].includes(fleet.id)
        ? {
            ...fleet,
            position: { q: 0, r: 0 },
            destination: target.position,
            routeId: 'route-test',
            releaseRequested: fleet.id === 'freighters',
          }
        : fleet,
    ),
    shipments: (
      [
        ['Iron', 4, 'freighters'],
        ['Iron', 6, 'freighters'],
        ['Water', 3, 'freighters'],
        ['Oil', 2, 'freighters'],
        ['Rocket engine', 1, 'freighters'],
        ['Iron', 5, 'travellers'],
      ] as const
    ).map(([resource, amount, fleetId], index) => ({
      id: `loaded-${index}`,
      resource,
      amount,
      fleetId,
      path: ['sol-0', 'sol-1'],
      stage: 0,
      projectId: 'vesta-mine',
      recipient: 'sol-1',
      committed: true,
    })),
  };
}

describe('grupperade-transporthandelser', () => {
  it('announces arrival and all unloaded cargo once per fleet, including repeated materials', () => {
    const game = Game.restore(loadedTransports());
    collectTurnFrames(game);
    game.finishTurn();
    const events = game.events.filter((event) =>
      /arrived|delivered/.test(event.text),
    );
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.text)).toEqual([
      'Freighters arrived at Vesta and delivered 10 Iron, 3 Water, 2 Oil, 1 Rocket engine.',
      'Travellers arrived at Vesta and delivered 5 Iron.',
    ]);
    expect(events.every((event) => event.round === 1)).toBe(true);
    const target = game.galaxy.systems
      .flatMap((system) => system.planets)
      .find((planet) => planet.id === 'sol-1')!;
    expect(
      events.every(
        (event) =>
          event.position?.q === target.position.q &&
          event.position.r === target.position.r,
      ),
    ).toBe(true);
    expect(game.fleet('freighters')!.routeId).toBeUndefined();
    expect(game.exportState().shipments).toHaveLength(0);
    expect(Game.restore(game.exportState()).events).toEqual(game.events);
  });

  it('resumes a saved transport without announcing cargo before unloading or duplicating it', () => {
    const state = loadedTransports();
    const target = state.world.systems
      .flatMap((system) => system.planets)
      .find((planet) => planet.id === 'sol-1')!;
    const game = Game.restore({
      ...state,
      fleets: state.fleets.map((fleet) =>
        fleet.routeId
          ? {
              ...fleet,
              position: { q: target.position.q - 3, r: target.position.r },
            }
          : fleet,
      ),
    });
    collectTurnFrames(game);
    game.finishTurn();
    expect(game.fleet('freighters')!.position).not.toEqual(target.position);
    expect(
      game.events.filter((event) => /arrived|delivered/.test(event.text)),
    ).toHaveLength(0);
    expect(
      game
        .exportState()
        .shipments.some((shipment) => shipment.fleetId === 'freighters'),
    ).toBe(true);
    const resumed = Game.restore(game.exportState());
    for (
      let year = 0;
      year < 5 && resumed.exportState().shipments.length;
      year++
    ) {
      collectTurnFrames(resumed);
      resumed.finishTurn();
    }
    expect(
      resumed.events.filter((event) => /arrived|delivered/.test(event.text)),
    ).toHaveLength(2);
    expect(resumed.exportState().shipments).toHaveLength(0);
  });

  it('keeps an empty route approach as one ordinary arrival', () => {
    const state = loadedTransports();
    const game = Game.restore({ ...state, shipments: [] });
    collectTurnFrames(game);
    game.finishTurn();
    const events = game.events.filter((event) =>
      event.text.includes('arrived'),
    );
    expect(events).toHaveLength(2);
    expect(events.every((event) => !event.text.includes('delivered'))).toBe(
      true,
    );
  });
});
