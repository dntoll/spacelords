import { describe, expect, it } from 'vitest';
import {
  Game,
  TECHNOLOGIES,
  type GameState,
  type ProjectType,
} from '../../src/client/models/Game.js';
import { ProductionPresence } from '../../src/client/models/ProductionPresence.js';
import {
  distantTradeNetworkState,
  tradeNetworkState,
} from '../fixtures/trade-network.js';
import { turnFrames } from '../fixtures/turn-steps.js';

function networkState(): GameState {
  const state = distantTradeNetworkState();
  state.colonies[1]![1].projects = [];
  state.colonies[1]![1].buildings = [
    { id: 'water', type: 'Water extractor', slotIndex: 0, demolition: false },
  ];
  state.colonies[2]![1].buildings = [
    { id: 'oil', type: 'Oil extractor', slotIndex: 0, demolition: false },
  ];
  return {
    ...state,
    researched: TECHNOLOGIES,
    tradeRoutes: state.tradeRoutes.map((route) =>
      route.id === 'route-distant' ? { ...route, a: 'sol-1' } : route,
    ),
  };
}

function option(state: GameState, type: ProjectType) {
  const game = Game.restore(state);
  return game
    .productionOptions(game.galaxy.homePlanet)
    .find((entry) => entry.type === type)!;
}

describe('produktionsvalens-statusfarger', () => {
  it('counts local buildings and active multihop suppliers without changing the world', () => {
    const game = Game.restore(networkState());
    const before = game.exportState();
    const options = game.productionOptions(game.galaxy.homePlanet);
    expect(options.find((entry) => entry.type === 'Iron mine')).toMatchObject({
      presence: 'local',
      localCount: 1,
    });
    expect(
      options.find((entry) => entry.type === 'Water extractor'),
    ).toMatchObject({ presence: 'network', networkCount: 1 });
    expect(
      options.find((entry) => entry.type === 'Oil extractor'),
    ).toMatchObject({ presence: 'network', networkCount: 1 });
    expect(game.exportState()).toEqual(before);
    expect(Object.isFrozen(options[0])).toBe(true);
  });
  it.each(['carrier', 'closing', 'disconnected'] as const)(
    'does not color unavailable network buildings as supplied when %s is missing',
    (failure) => {
      const state = networkState();
      const altered =
        failure === 'carrier'
          ? {
              ...state,
              fleets: state.fleets.filter((fleet) => fleet.id !== 'freighters'),
            }
          : failure === 'closing'
            ? {
                ...state,
                tradeRoutes: state.tradeRoutes.map((route) =>
                  route.id === 'route-test'
                    ? { ...route, closing: true }
                    : route,
                ),
              }
            : {
                ...state,
                tradeRoutes: state.tradeRoutes.filter(
                  (route) => route.id !== 'route-test',
                ),
              };
      expect(option(altered, 'Oil extractor')).toMatchObject({
        presence: 'missing',
        networkCount: 0,
        empireCount: 1,
      });
    },
  );
  it('distinguishes physical goods from factories and cargo, and retains queued counts alongside existing stock', () => {
    const state = networkState();
    state.colonies[0]![1].stock['Rocket engine'] = 0;
    state.colonies[2]![1].stock['Rocket engine'] = 7;
    state.colonies[0]![1].projects = [
      {
        id: 'engine-next',
        type: 'Rocket engine',
        slotIndex: null,
        factoryId: 'engine',
        destinationFleetId: null,
      },
    ];
    expect(option(state, 'Rocket engine')).toMatchObject({
      presence: 'network',
      localCount: 0,
      networkCount: 7,
      queuedLocalCount: 1,
    });
    state.colonies[0]![1].stock['Rocket engine'] = 2;
    expect(option(state, 'Rocket engine')).toMatchObject({
      presence: 'local',
      queuedLocalCount: 1,
    });
    state.colonies[0]![1].stock['Rocket engine'] = 0;
    state.colonies[2]![1].stock['Rocket engine'] = 0;
    const cargo = {
      ...state,
      shipments: [
        {
          id: 'cargo',
          resource: 'Rocket engine' as const,
          amount: 3,
          path: ['nadir-1', 'sol-1', 'sol-0'],
          stage: 0,
          projectId: 'engine-next',
          recipient: 'sol-0',
          fleetId: 'travellers',
        },
      ],
    };
    expect(option(cargo, 'Rocket engine')).toMatchObject({
      presence: 'queued',
      networkCount: 0,
      empireCount: 3,
    });
  });
  it('includes network queues and changes yellow to green when construction completes', () => {
    const state = networkState();
    state.colonies[2]![1].projects = [
      {
        id: 'remote-station',
        type: 'Research station',
        slotIndex: 1,
        factoryId: null,
        destinationFleetId: null,
      },
    ];
    expect(option(state, 'Research station')).toMatchObject({
      presence: 'queued',
      queuedNetworkCount: 1,
      queuedLocalCount: 0,
    });
    const game = Game.restore(tradeNetworkState(false));
    game.scheduleBuild(game.galaxy.homePlanet, 'Research station');
    const selected = () =>
      game
        .productionOptions(game.galaxy.homePlanet)
        .find((entry) => entry.type === 'Research station')!;
    expect(selected()).toMatchObject({
      presence: 'queued',
      queuedLocalCount: 1,
    });
    for (const frame of turnFrames(game)) game.applyFrame(frame);
    game.finishTurn();
    expect(selected()).toMatchObject({
      presence: 'local',
      queuedLocalCount: 0,
    });
  });
  it('counts ships at actual planets and applies local/network/queue precedence for all product types', () => {
    for (const type of [
      'Research station',
      'Rocket engine',
      'Transport ship',
    ] as const) {
      const local = {
        id: 'local',
        counts: new Map<ProjectType, number>(),
        queued: new Map<ProjectType, number>([[type, 1]]),
      };
      const remote = {
        id: 'remote',
        counts: new Map<ProjectType, number>(),
        queued: new Map<ProjectType, number>(),
      };
      const presence = new ProductionPresence(local, [remote]);
      expect(presence.snapshot(type).presence).toBe('queued');
      remote.counts.set(type, 2);
      expect(presence.snapshot(type).presence).toBe('network');
      local.counts.set(type, 1);
      expect(presence.snapshot(type).presence).toBe('local');
      expect(presence.snapshot(type).queuedLocalCount).toBe(1);
    }
    const state = networkState();
    state.colonies[0]![1].buildings.push({
      id: 'transport-factory',
      type: 'Transport ship factory',
      slotIndex: 2,
      demolition: false,
    });
    expect(option(state, 'Transport ship')).toMatchObject({
      presence: 'local',
      localCount: 2,
      networkCount: 1,
    });
  });
});
