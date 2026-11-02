import { describe, expect, it } from 'vitest';
import { Game, TECHNOLOGIES } from '../../src/client/models/Game.js';
import { RETIRED_ORDER_TECHNOLOGIES } from '../../src/client/models/Research.js';
import { ShipOrders } from '../../src/client/models/ShipOrders.js';
import {
  distantTradeNetworkState,
  tradeNetworkState,
} from '../fixtures/trade-network.js';
import { finishYear } from '../fixtures/salvage.js';

const FIXTURE_FLEETS = new Set([
  'fleet-home',
  'freighters',
  'travellers',
  'empty',
]);

function withShipyard(state = tradeNetworkState()) {
  const colony = state.colonies[0]![1];
  colony.stock = {
    ...colony.stock,
    Iron: 500,
    Water: 500,
    Oil: 500,
    'Rocket engine': 20,
    'Weapons module': 5,
  };
  colony.population = 4000;
  if (
    !colony.buildings.some(
      (building) => building.type === 'Transport ship factory',
    )
  )
    colony.buildings.push({
      id: 'transport-yard',
      type: 'Transport ship factory',
      slotIndex: 2,
      demolition: false,
    });
  return state;
}

function builtFleets(game: Game) {
  return game.fleetSnapshots().filter((fleet) => !FIXTURE_FLEETS.has(fleet.id));
}

describe('automatisk-farledsbemanning', () => {
  it('sends a newly built Transport ship to the nearest least-manned open route without research', () => {
    const game = Game.restore(withShipyard());
    expect(game.research.completed).not.toContain('Automated transport');
    game.scheduleShip(game.galaxy.homePlanet, 'Transport ship');
    finishYear(game);
    const built = builtFleets(game).find(
      (fleet) => fleet.ships['Transport ship'] === 1,
    )!;
    expect(built.routeId).toBe('route-test');
    expect(game.fleet('fleet-home')!.ships['Transport ship']).toBe(0);
  });

  it('sends a newly built Civilian shuttle to the least-manned nearby route without Automated transport', () => {
    const state = withShipyard();
    const game = Game.restore({
      ...state,
      researched: [...state.researched, 'Civilian transport'],
    });
    game.scheduleShip(game.galaxy.homePlanet, 'Civilian shuttle');
    finishYear(game);
    const shuttle = builtFleets(game).find(
      (fleet) => fleet.ships['Civilian shuttle'],
    )!;
    expect(shuttle.homeRouteId).toBe('route-test');
    expect(shuttle.routeId).toBeUndefined();
    expect(shuttle.civilian).toBeDefined();
  });

  it('assigns simultaneous completions one at a time so later ships see updated manning', () => {
    const base = distantTradeNetworkState();
    const fleets = base.fleets.map((fleet) =>
      fleet.id === 'travellers'
        ? { ...fleet, ships: { ...fleet.ships, 'Transport ship': 3 } }
        : fleet,
    );
    const freighter = { ...fleets.find((fleet) => fleet.id === 'freighters')! };
    delete freighter.routeId;
    const waiting = {
      ...freighter,
      destination: null,
      position: { q: 0, r: 0 },
      ships: {
        Fighter: 0,
        'Exploration ship': 0,
        'Colony ship': 0,
        'Transport ship': 1,
        'Civilian shuttle': 0,
        'Space pirate': 0,
        'Salvage ship': 0,
        Raptor: 0,
      },
      automation: 'transport' as const,
    };
    const game = Game.restore({
      ...base,
      pirates: [],
      fleets: [
        ...fleets,
        {
          ...waiting,
          id: 'new-a',
          name: 'New A',
          shipUnits: [
            {
              id: 'a-ship',
              type: 'Transport ship' as const,
              engines: { 'Rocket engine': 1, 'Ion pulse engine': 0 },
            },
          ],
        },
        {
          ...waiting,
          id: 'new-b',
          name: 'New B',
          shipUnits: [
            {
              id: 'b-ship',
              type: 'Transport ship' as const,
              engines: { 'Rocket engine': 1, 'Ion pulse engine': 0 },
            },
          ],
        },
      ],
    });
    game.startTurn();
    expect(
      new Set(['new-a', 'new-b'].map((id) => game.fleet(id)!.routeId)).size,
    ).toBe(2);
  });

  it('waits when no open route exists and claims a newly created route', () => {
    const state = withShipyard(tradeNetworkState(false));
    const game = Game.restore(state);
    game.scheduleShip(game.galaxy.homePlanet, 'Transport ship');
    finishYear(game);
    const built = builtFleets(game).find(
      (fleet) => fleet.ships['Transport ship'] && !fleet.routeId,
    )!;
    expect(built.automation).toBe('transport');
    const route = game.createTradeRoute('sol-0', 'sol-1');
    expect(game.fleet(built.id)!.routeId).toBe(route);
  });
});

describe('civil-farledsbyte', () => {
  it('updates the shuttle home route when a passenger job uses another route and keeps passengers', () => {
    const state = withShipyard(distantTradeNetworkState());
    const game = Game.restore({
      ...state,
      researched: [...state.researched, 'Civilian transport'],
      fleets: state.fleets.map((fleet) =>
        fleet.id === 'travellers'
          ? {
              ...fleet,
              destination: null,
              ships: { ...fleet.ships, 'Transport ship': 4 },
            }
          : fleet,
      ),
    });
    game.scheduleShip(game.galaxy.homePlanet, 'Civilian shuttle');
    finishYear(game);
    const shuttleId = builtFleets(game).find(
      (fleet) => fleet.ships['Civilian shuttle'],
    )!.id;
    const shuttle = game.fleet(shuttleId)!;
    expect(shuttle.homeRouteId).toBe('route-test');
    const saved = game.exportState();
    const resumed = Game.restore({
      ...saved,
      colonies: saved.colonies.map(([id, colony]) => [
        id,
        {
          ...colony,
          population: id === 'nadir-1' ? 200 : 1_000_000,
        },
      ]),
      fleets: saved.fleets.map((fleet) =>
        fleet.id === shuttleId
          ? {
              ...fleet,
              civilian: {
                passengers: 200,
                reserved: 200,
                sourceId: 'sol-0',
                targetId: 'nadir-1',
                path: [],
                stopping: false,
                status: 'Transporting passengers',
              },
            }
          : fleet,
      ),
    });
    resumed.startTurn();
    const travelling = resumed.fleet(shuttleId)!;
    expect(travelling.civilian!.passengers).toBe(200);
    expect(travelling.homeRouteId).toBe('route-distant');
  });
});

describe('ombemanning-vid-stangd-farled', () => {
  it('sends idle transports from a closed route to the remaining least-manned route', () => {
    const state = distantTradeNetworkState();
    const game = Game.restore({
      ...state,
      fleets: state.fleets.map((fleet) =>
        fleet.id === 'travellers' ? { ...fleet, destination: null } : fleet,
      ),
    });
    game.closeTradeRoute('route-distant');
    expect(game.fleet('travellers')!.routeId).toBe('route-test');
    expect(game.fleet('freighters')!.routeId).toBe('route-test');
  });

  it('keeps waiting when the closed route is the last one', () => {
    const game = Game.restore(tradeNetworkState());
    game.assignTradeFleet('route-test', 'freighters');
    game.closeTradeRoute('route-test');
    expect(game.fleet('freighters')!.routeId).toBeUndefined();
    expect(game.fleet('freighters')!.automation).toBe('transport');
  });
});

describe('guard-routes', () => {
  it('is available at construction without research and waits when no escorted transport exists', () => {
    const options = ShipOrders.options({ Fighter: 1 }, []);
    const guard = options.find((option) => option.kind === 'guard-routes')!;
    expect(guard.blockedReason).toBeNull();
    const game = Game.restore({ ...tradeNetworkState(false), pirates: [] });
    game.issueFleetOrder('fleet-home', { kind: 'guard-routes' });
    expect(game.fleet('fleet-home')!.automation).toBe('guard');
    expect(game.fleet('fleet-home')!.routeId).toBeUndefined();
  });

  it('joins the nearest route that has transports and the fewest escorts', () => {
    const state = distantTradeNetworkState();
    const game = Game.restore({
      ...state,
      pirates: [],
      fleets: [
        ...state.fleets.map((fleet) =>
          fleet.id === 'freighters'
            ? {
                ...fleet,
                ships: { ...fleet.ships, Fighter: 2 },
              }
            : fleet,
        ),
        {
          ...state.fleets[0]!,
          id: 'escorts',
          name: 'Escorts',
          ships: {
            Fighter: 1,
            'Exploration ship': 0,
            'Colony ship': 0,
            'Transport ship': 0,
            'Civilian shuttle': 0,
            'Space pirate': 0,
            'Salvage ship': 0,
            Raptor: 0,
          },
          shipUnits: [
            {
              id: 'escort-fighter',
              type: 'Fighter' as const,
              engines: { 'Rocket engine': 1, 'Ion pulse engine': 0 },
              missiles: 0,
            },
          ],
          position: { q: 0, r: 0 },
          destination: null,
        },
      ],
    });
    game.issueFleetOrder('escorts', { kind: 'guard-routes' });
    expect(
      game
        .fleetSnapshots()
        .some(
          (fleet) =>
            fleet.joinFleetId === 'travellers' && fleet.ships.Fighter === 1,
        ),
    ).toBe(true);
    expect(
      game.fleetSnapshots().some((fleet) => fleet.joinFleetId === 'freighters'),
    ).toBe(false);
  });
});

describe('fria-utforsknings-och-patrullorder', () => {
  it('lets Explore, Explore stars and Patrol start without the retired technologies', () => {
    const game = Game.restore({
      ...tradeNetworkState(),
      researched: [],
      pirates: [],
    });
    expect(() => game.setPatrol('fleet-home')).not.toThrow();
    const exploring = Game.restore({
      ...tradeNetworkState(),
      researched: [],
      pirates: [],
    });
    exploring.setExploration('fleet-home', 'explore');
    expect(exploring.fleet('fleet-home')!.exploration).toBe('explore');
    exploring.setExploration('fleet-home', 'explore-stars');
    expect(exploring.fleet('fleet-home')!.exploration).toBe('explore-stars');
  });

  it('drops retired order technologies from research and still loads the save', () => {
    const state = tradeNetworkState();
    const game = Game.restore({
      ...state,
      researched: [
        ...state.researched,
        'Automated transport',
        'Fleet patrol',
        'Automated exploration',
      ],
      researchQueue: ['Fleet patrol'],
      recoveredResearch: ['Automated exploration'],
    });
    for (const technology of RETIRED_ORDER_TECHNOLOGIES)
      expect(game.research.completed).not.toContain(technology);
    expect(game.research.queue).not.toContain('Fleet patrol');
    expect(TECHNOLOGIES).not.toContain('Automated transport');
  });
});
