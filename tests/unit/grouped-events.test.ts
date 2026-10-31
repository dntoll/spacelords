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

describe('grupperade-planethandelser / grupperade-transporthandelser', () => {
  it.each([
    [20_000, 100],
    [25_000, 100],
    [1_000, 0],
  ])(
    'population-besked-endast-vid-andring: emits no empty report for %s people at %s habitability',
    (population, habitability) => {
      const state = tradeNetworkState(false);
      const game = Game.restore({
        ...state,
        fleets: [],
        colonies: state.colonies.map(([id, colony]) => [
          id,
          { ...colony, population, habitability, buildings: [], projects: [] },
        ]),
      });
      collectTurnFrames(game);
      game.finishTurn();
      expect(game.events.filter((event) => event.round === 1)).toEqual([]);
      expect(
        game
          .ownedPlanetSnapshots()
          .every((planet) => planet.population === population),
      ).toBe(true);
    },
  );

  it('population-besked-endast-vid-andring: retains deliveries and production when population is unchanged', () => {
    const state = loadedTransports();
    const game = Game.restore({
      ...state,
      colonies: state.colonies.map(([id, colony]) => [
        id,
        { ...colony, population: 20_000, habitability: 100 },
      ]),
    });
    collectTurnFrames(game);
    game.finishTurn();
    const report = game.events.find((event) => event.planetId === 'sol-1')!;
    expect(report.text).toContain('delivered 10 Iron');
    expect(report.text).toContain('Iron mine was completed');
    expect(report.text).not.toContain('Population');
  });
  it('includes every fleet and repeated material in a single planet report', () => {
    const game = Game.restore(loadedTransports());
    collectTurnFrames(game);
    game.finishTurn();
    const events = game.events.filter((event) =>
      /arrived|delivered/.test(event.text),
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.text).toContain(
      'Freighters delivered 10 Iron, 3 Water, 2 Oil, 1 Rocket engine to Vesta.',
    );
    expect(events[0]!.text).toContain('Travellers delivered 5 Iron to Vesta.');
    expect(events[0]!.text).toContain('Population on Vesta changed by');
    expect(events[0]!.text).not.toContain('arrived');
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
    ).toHaveLength(1);
    expect(resumed.exportState().shipments).toHaveLength(0);
  });

  it('ruttflottor-utan-ankomstbesked: reaches route endpoints silently while its route order continues', () => {
    const state = loadedTransports();
    const game = Game.restore({ ...state, shipments: [] });
    collectTurnFrames(game);
    game.finishTurn();
    const events = game.events.filter((event) =>
      event.text.includes('arrived'),
    );
    expect(events).toHaveLength(0);
    expect(game.fleet('travellers')!.routeId).toBe('route-test');
    expect(game.fleet('travellers')!.destination).toBeNull();
  });

  it('keeps reports separate for identically named planets and preserves legacy history', () => {
    const state = loadedTransports();
    const legacy = {
      id: 'legacy',
      round: 0,
      text: 'Population on Vesta changed by +0.',
    };
    const game = Game.restore({
      ...state,
      events: [legacy],
      fleets: [],
      shipments: [],
      colonies: state.colonies.map(([id, colony]) => [
        id,
        {
          ...colony,
          population: 1_000,
          habitability: 100,
          projects: [],
        },
      ]),
      world: {
        ...state.world,
        systems: state.world.systems.map((system) => ({
          ...system,
          planets: system.planets.map((planet) => ({
            ...planet,
            name: 'Twin',
          })),
        })),
      },
    });
    collectTurnFrames(game);
    game.finishTurn();
    const reports = game.events.filter((event) => event.round === 1);
    expect(reports).toHaveLength(2);
    expect(new Set(reports.map((event) => event.planetId)).size).toBe(2);
    expect(
      reports.every(
        (event) => event.text === 'Twin:\nPopulation on Twin changed by +100.',
      ),
    ).toBe(true);
    expect(Game.restore(game.exportState()).events[0]).toEqual(legacy);
  });

  it('combines deliveries, completed production, population and habitability without mixing planets or years', () => {
    const state = loadedTransports();
    const target = state.world.systems[0]!.planets[1]!;
    const colony = state.colonies.find(([id]) => id === target.id)![1];
    colony.habitability = 50;
    colony.domes = [0, 1];
    colony.buildings = [
      {
        id: 'terraformer',
        type: 'Desert terraforming factory',
        slotIndex: 1,
        demolition: false,
      },
    ];
    const game = Game.restore({
      ...state,
      world: {
        ...state.world,
        systems: state.world.systems.map((system) => ({
          ...system,
          planets: system.planets.map((planet) =>
            planet.id === target.id
              ? { ...planet, environment: 'Desert', habitability: 50 }
              : planet,
          ),
        })),
      },
    });
    collectTurnFrames(game);
    game.finishTurn();
    const events = game.events.filter((event) => event.text.includes('Vesta'));
    expect(events).toHaveLength(1);
    const report = events[0]!;
    expect(report.text).toContain('delivered 10 Iron');
    expect(report.text).toContain('Iron mine was completed on Vesta.');
    expect(report.text).toContain('Population on Vesta changed by +55.');
    expect(report.text).toContain('Habitability on Vesta increased to 55%.');
    expect(report.text).not.toContain('Tellus');
    expect(report.position).toEqual(target.position);
    expect(Object.isFrozen(report)).toBe(true);
    const restored = Game.restore(game.exportState());
    expect(restored.events).toEqual(game.events);
    collectTurnFrames(restored);
    restored.finishTurn();
    expect(
      restored.events.filter((event) =>
        event.text.includes('Population on Vesta'),
      ),
    ).toHaveLength(2);
    expect(restored.events.find((event) => event.id === report.id)).toEqual(
      report,
    );
  });
});
