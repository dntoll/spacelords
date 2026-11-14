import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';

function setup() {
  const state = tradeNetworkState();
  state.colonies[0]![1].buildings.push({
    id: 'research',
    type: 'Research station',
    slotIndex: 2,
    demolition: false,
  });
  return {
    ...state,
    fleets: state.fleets.filter((fleet) => fleet.id === 'fleet-home'),
  };
}

describe('atgarder-for-rutttransport', () => {
  it('offers and queues research, then factory, then a ship as each becomes available', () => {
    const state = setup();
    const game = Game.restore({
      ...state,
      researched: state.researched.filter(
        (technology) =>
          technology !== 'Transport ship factory' &&
          technology !== 'Trade logistics',
      ),
    });
    const action = () =>
      game.decisions.find((decision) => decision.id === 'route-idle-route-test')
        ?.transportAction;
    expect(action()?.kind).toBe('research');
    game.prepareRouteTransport('route-test');
    expect(game.research.queue).toContain('Transport ship factory');
    const researched = game.exportState();
    const ready = Game.restore({
      ...researched,
      researchQueue: [],
      researched: [...researched.researched, 'Transport ship factory'],
    });
    expect(
      ready.decisions.find(
        (decision) => decision.id === 'route-idle-route-test',
      )?.transportAction?.kind,
    ).toBe('factory');
    ready.prepareRouteTransport('route-test');
    expect(
      ready
        .planetSnapshot(ready.galaxy.homePlanet)
        ?.projects.some((p) => p.type === 'Transport ship factory'),
    ).toBe(true);
    const withFactory = ready.exportState();
    withFactory.colonies[0]![1].projects = [];
    withFactory.colonies[0]![1].buildings.push({
      id: 'transport-factory',
      type: 'Transport ship factory',
      slotIndex: 3,
      demolition: false,
    });
    const built = Game.restore(withFactory);
    expect(
      built.decisions.find(
        (decision) => decision.id === 'route-idle-route-test',
      )?.transportAction?.kind,
    ).toBe('ship');
    built.prepareRouteTransport('route-test');
    expect(
      built
        .planetSnapshot(built.galaxy.homePlanet)
        ?.projects.some((p) => p.type === 'Transport ship'),
    ).toBe(true);
  });
  it('explains a missing station and rejects stale requests without changing queues', () => {
    const state = setup();
    state.colonies[0]![1].buildings = [];
    const game = Game.restore({
      ...state,
      researched: state.researched.filter(
        (technology) =>
          technology !== 'Transport ship factory' &&
          technology !== 'Trade logistics',
      ),
    });
    const action = game.decisions.find(
      (decision) => decision.id === 'route-idle-route-test',
    )?.transportAction;
    expect(action?.blockedReason).toContain('Research station');
    expect(() => game.prepareRouteTransport('route-test')).toThrow(
      'Research station',
    );
    expect(game.research.queue).toEqual([]);
    expect(() => game.prepareRouteTransport('missing')).toThrow(
      'no longer needs',
    );
  });

  it('offers assignment instead of duplicate construction when a transport is available', () => {
    const game = Game.restore(tradeNetworkState());
    const decision = game.decisions.find(
      (item) => item.id === 'route-idle-route-test',
    );
    expect(decision?.transportAction?.kind).toBe('assign');
    expect(() => game.prepareRouteTransport('route-test')).toThrow(
      'Select an available transport fleet',
    );
  });
});
