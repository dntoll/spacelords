import { completeTacticalBattles } from '../fixtures/tactical-combat.js';
import { describe, expect, it } from 'vitest';
import { Game, projectCost, SHIPS } from '../../src/client/models/Game.js';
import { ResearchPlan } from '../../src/client/models/Research.js';
import {
  tradeNetworkState,
  distantTradeNetworkState,
} from '../fixtures/trade-network.js';
import { collectTurnFrames } from '../fixtures/turn-steps.js';
import { finishYear } from '../fixtures/salvage.js';

function shuttleState() {
  const state = tradeNetworkState();
  const home = state.colonies[0]![1];
  home.population = 3000;
  home.buildings.push({
    id: 'transport-factory',
    type: 'Transport ship factory',
    slotIndex: 2,
    demolition: false,
  });
  state.colonies[1]![1].buildings = [
    {
      id: 'research-1',
      type: 'Research station',
      slotIndex: 1,
      demolition: false,
    },
    {
      id: 'research-2',
      type: 'Research station',
      slotIndex: 2,
      demolition: false,
    },
  ];
  return {
    ...state,
    researched: [...state.researched, 'Civilian transport'] as const,
  };
}

describe('civil-skyttelforskning', () => {
  it('queues Trade logistics as a prerequisite and gates direct manufacture until completion', () => {
    const research = new ResearchPlan();
    research.add('Civilian transport');
    expect(research.queue.indexOf('Trade logistics')).toBeLessThan(
      research.queue.indexOf('Civilian transport'),
    );
    const state = shuttleState();
    const game = Game.restore({
      ...state,
      researched: state.researched.filter((t) => t !== 'Civilian transport'),
    });
    const planet = game.planetAt(game.fleetSnapshots()[0]!.position!)!;
    expect(() => game.scheduleShip(planet, 'Civilian shuttle')).toThrow(
      'Research Civilian transport first',
    );
    expect(
      game.productionOptions(planet).find((o) => o.type === 'Civilian shuttle')!
        .blockedReason,
    ).toContain('Research Civilian transport');
  });
});

describe('civil-skytteltillverkning', () => {
  it('builds in the existing transport factory with an engine and crew, starting in its own fleet', () => {
    const game = Game.restore(shuttleState());
    const planet = game.planetAt(game.fleetSnapshots()[0]!.position!)!;
    expect(game.productionOptions(planet).map((o) => o.type)).toEqual(
      expect.arrayContaining(['Civilian shuttle', 'Transport ship']),
    );
    expect(SHIPS['Civilian shuttle']).toEqual({ crew: 50, speed: 2 });
    expect(projectCost('Civilian shuttle')).toMatchObject({
      Iron: 4,
      Water: 2,
      Oil: 1,
      'Rocket engine': 1,
    });
    game.scheduleShip(planet, 'Civilian shuttle', game.fleetSnapshots()[0]!.id);
    finishYear(game);
    const shuttle = game
      .fleetSnapshots()
      .find((f) => f.ships['Civilian shuttle'])!;
    expect(shuttle.civilian!.passengers).toBe(0);
    expect(shuttle.id).not.toBe(game.fleetSnapshots()[0]!.id);
    expect(shuttle.shipUnits![0]!.engines['Rocket engine']).toBe(1);
    expect(game.planetSnapshot(planet)!.economy.stock['Rocket engine']).toBe(2);
    expect(shuttle.routeId).toBeUndefined();
  });
});

describe('automatisk-arbetskraftstrafik', () => {
  it('civiltrafik-pa-handelsnatet / civiltrafik-sparning: a newly built shuttle boards, travels and delivers after reload without a goods carrier', () => {
    const state = shuttleState();
    state.fleets = state.fleets.filter(
      (fleet) => !fleet.ships['Transport ship'],
    );
    let game = Game.restore(state);
    const home = game.galaxy.homePlanet;
    game.scheduleShip(home, 'Civilian shuttle');
    finishYear(game);
    const shuttle = game
      .fleetSnapshots()
      .find((fleet) => fleet.ships['Civilian shuttle'])!;
    expect(shuttle.civilian).toBeDefined();
    const target = game
      .exportState()
      .colonies.find(([id]) => id === 'sol-1')![1];
    const population = target.population;
    for (
      let year = 0;
      year < 8 &&
      !game.events.some(
        (event) =>
          event.text.includes('delivered') && event.text.includes('passengers'),
      );
      year++
    ) {
      game = Game.restore(game.exportState());
      finishYear(game);
    }
    expect(
      game.events.some(
        (event) =>
          event.text.includes('boarded') && event.text.includes('passengers'),
      ),
    ).toBe(true);
    expect(
      game.events.some(
        (event) =>
          event.text.includes('delivered') && event.text.includes('passengers'),
      ),
    ).toBe(true);
    expect(
      game.exportState().colonies.find(([id]) => id === 'sol-1')![1].population,
    ).toBeGreaterThan(population);
    expect(game.fleet(shuttle.id)!.civilian).toBeDefined();
    expect(game.fleet(shuttle.id)!.civilian!.passengers).toBe(0);
  });

  it('counts existing buildings plus only the first queue item and preserves crew at the source', () => {
    const state = shuttleState();
    state.colonies[1]![1].projects.push({
      id: 'later',
      type: 'Colony ship',
      slotIndex: null,
      factoryId: null,
      destinationFleetId: null,
    });
    const game = Game.restore(state);
    const planet = game.planetAt(game.fleetSnapshots()[0]!.position!)!;
    game.scheduleShip(planet, 'Civilian shuttle');
    finishYear(game);
    const shuttle = game
      .fleetSnapshots()
      .find((f) => f.ships['Civilian shuttle'])!;
    const before = game.exportState().colonies[0]![1].population;
    game.startTurn();
    expect(game.fleet(shuttle.id)!.civilian!.passengers).toBe(200);
    expect(game.planetSnapshot(planet)!.population).toBe(before - 200);
    expect(() => game.setDestination(shuttle.id, planet.position)).toThrow(
      'passengers',
    );
    expect(() =>
      game.transferShips(shuttle.id, 'Civilian shuttle', 1, null),
    ).toThrow();
  });
});

describe('civiltrafik-sparning', () => {
  it.each([0, 1])(
    'preserves passenger orders through an interrupted pirate contact with %i escorts and applies civilian losses',
    (fighters) => {
      const base = shuttleState();
      const initial = base.fleets[0]!;
      let game = Game.restore({
        ...base,
        pirates: [
          {
            id: 'pirate-test',
            systemId: 'nadir',
            position: { q: 8, r: -3 },
            count: 1,
          },
        ],
        fleets: [
          {
            ...initial,
            position: { q: 8, r: -4 },
            shipUnits: [],
            destination: null,
            ships: {
              ...initial.ships,
              Fighter: fighters,
              'Exploration ship': 0,
              'Colony ship': 0,
              'Civilian shuttle': 1,
            },
            civilian: {
              passengers: 500,
              reserved: 500,
              path: [],
              sourceId: 'sol-0',
              targetId: 'sol-1',
              stopping: false,
              status: 'Transporting passengers',
            },
          },
        ],
      });
      game.startTurn();
      for (let step = 0; step < 30; step++) {
        if (game.phase === 'interrupted') {
          if (game.interruption?.battles?.length) break;
          game = Game.restore(game.exportState());
          completeTacticalBattles(game);
          if (game.interruption?.battles?.length) break;
          game.continueTurn();
        }
        const frame = game.nextTurnFrame();
        if (!frame) break;
        game.applyFrame(frame);
      }
      expect(game.phase).toBe('interrupted');
      game = Game.restore(game.exportState());
      expect(game.fleet(initial.id)!.ships['Civilian shuttle']).toBe(
        fighters ? 1 : 0,
      );
      expect(game.fleet(initial.id)!.civilian?.passengers ?? 0).toBe(
        fighters ? 500 : 0,
      );
      if (!fighters)
        expect(
          game.events.some((event) =>
            event.text.includes('lost 500 passengers'),
          ),
        ).toBe(true);
    },
  );

  it('loads older fleets without the new ship count and retains passengers through a movement checkpoint', () => {
    const base = shuttleState();
    const distant = distantTradeNetworkState();
    base.colonies[1]![1].buildings = [];
    base.colonies[1]![1].projects = [];
    const state = {
      ...base,
      world: distant.world,
      colonies: [
        ...base.colonies,
        [
          distant.colonies[2]![0],
          {
            ...structuredClone(base.colonies[1]![1]),
            buildings: [
              {
                id: 'remote-research-1',
                type: 'Research station' as const,
                slotIndex: 0,
                demolition: false,
              },
              {
                id: 'remote-research-2',
                type: 'Research station' as const,
                slotIndex: 1,
                demolition: false,
              },
            ],
          },
        ] as (typeof base.colonies)[number],
      ],
      tradeRoutes: distant.tradeRoutes,
    };
    for (const fleet of state.fleets) {
      const counts = fleet.ships as Partial<typeof fleet.ships>;
      delete counts['Civilian shuttle'];
    }
    let game = Game.restore(state);
    expect(game.fleetSnapshots()[0]!.ships['Civilian shuttle']).toBe(0);
    const planet = game.planetAt(game.fleetSnapshots()[0]!.position!)!;
    game.scheduleShip(planet, 'Civilian shuttle');
    finishYear(game);
    game.startTurn();
    const shuttle = game
      .fleetSnapshots()
      .find((f) => f.ships['Civilian shuttle'])!;
    collectTurnFrames(game, false);
    game.finishTurn();
    const travelling = game.fleet(shuttle.id)!;
    expect(travelling.civilian!.passengers).toBeGreaterThan(0);
    const saved = game.exportState();
    game = Game.restore(saved);
    expect(game.fleet(shuttle.id)!.civilian).toEqual(travelling.civilian);
    expect(game.fleet(shuttle.id)!.destination).toEqual(travelling.destination);
    expect(() =>
      game.transferShips(shuttle.id, 'Civilian shuttle', 1, null),
    ).toThrow('passengers');
    expect(() => game.setDestination(shuttle.id, planet.position)).toThrow(
      'passengers',
    );
    game.closeTradeRoute('route-distant');
    expect(
      game.tradeRoutes.find((r) => r.id === 'route-distant')!.closing,
    ).toBe(true);
    expect(
      Game.restore(game.exportState()).fleet(shuttle.id)!.civilian!.passengers,
    ).toBe(travelling.civilian!.passengers);
    expect(game.exportState().colonies).toEqual(saved.colonies);
    expect(Object.isFrozen(game.fleet(shuttle.id)!.civilian!.path)).toBe(true);
  });
  it('rejects corrupt passenger loads', () => {
    const game = Game.restore(shuttleState());
    const planet = game.planetAt(game.fleetSnapshots()[0]!.position!)!;
    game.scheduleShip(planet, 'Civilian shuttle');
    finishYear(game);
    const saved = game.exportState();
    saved.fleets.find((f) => f.civilian)!.civilian!.passengers = 501;
    expect(() => Game.restore(saved)).toThrow('Invalid saved civilian');
  });
});
