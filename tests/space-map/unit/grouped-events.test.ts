import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
import { collectTurnFrames } from '../../fixtures/turn-steps.js';

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
      const state = tradeNetworkState();
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

  it('ankomstbesked-endast-vid-manuell-forflyttning: automatic Explore legs arrive silently while a manual move still reports arrival', () => {
    const state = tradeNetworkState();
    const arrivals = (subject: Game) =>
      subject.events.filter((event) =>
        event.text.startsWith(
          `${subject.fleet('fleet-home')!.name} arrived at `,
        ),
      );
    for (const order of ['explore', 'explore-stars'] as const) {
      const game = Game.restore({ ...state, pirates: [] });
      game.setExploration('fleet-home', order);
      const visited = new Set<string>();
      for (let round = 0; round < 5; round += 1) {
        collectTurnFrames(game);
        game.finishTurn();
        visited.add(game.fleet('fleet-home')!.position!.key);
      }
      expect(visited.size).toBeGreaterThan(2);
      expect(game.fleet('fleet-home')!.exploration).toBe(order);
      expect(arrivals(game)).toHaveLength(0);
    }

    const manual = Game.restore({ ...state, pirates: [] });
    const start = manual.fleet('fleet-home')!.position!;
    const neighbor = start
      .neighbors()
      .find((point) => manual.galaxy.isPassable(point))!;
    manual.setDestination('fleet-home', neighbor);
    collectTurnFrames(manual);
    manual.finishTurn();
    expect(arrivals(manual)).toHaveLength(1);
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
});
