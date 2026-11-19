import { describe, expect, it } from 'vitest';
import {
  Game,
  projectCost,
  SHIPS,
} from '../../../src/client/space-map/models/Game.js';
import { ResearchPlan } from '../../../src/client/space-map/models/research/Research.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
import { finishYear } from '../../fixtures/salvage.js';

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

function population(game: Game, id: string): number {
  return game.exportState().colonies.find(([colony]) => colony === id)![1]
    .population;
}

/** A Civilian shuttle waiting at Tellus, ready to level the population. */
function levellingState() {
  const state = shuttleState();
  const fleet = state.fleets[0]!;
  return {
    ...state,
    pirates: [],
    fleets: [
      ...state.fleets,
      {
        ...fleet,
        id: 'shuttles',
        name: 'Shuttles',
        shipUnits: [],
        destination: null,
        automation: 'transport' as const,
        ships: {
          ...Object.fromEntries(
            Object.keys(fleet.ships).map((type) => [type, 0]),
          ),
          'Civilian shuttle': 1,
        } as typeof fleet.ships,
        civilian: {
          passengers: 0,
          reserved: 0,
          path: [],
          stopping: false,
          status: 'Levelling population in the group',
        },
      },
    ],
  };
}

describe('befolkningsutjamning-i-grupp', () => {
  it('en-runda-per-lank / civiltrafik-sparning: a shuttle sends settlers to a linked planet short of workers, and they land after a reload', () => {
    let game = Game.restore(levellingState());
    game.assignTradeFleet('route-test', 'freighters');
    const home = population(game, 'sol-0');
    const vesta = population(game, 'sol-1');
    finishYear(game);
    // Vesta's two Research stations need 1 200 workers; it has 1 000.
    const settlers = game.exportState().settlers!;
    expect(settlers.reduce((sum, transit) => sum + transit.amount, 0)).toBe(
      500,
    );
    expect(settlers.every((transit) => transit.to === 'sol-1')).toBe(true);
    expect(population(game, 'sol-0')).toBeLessThanOrEqual(home - 500 + 300);
    expect(population(game, 'sol-1')).toBeLessThan(vesta + 500);
    game = Game.restore(
      JSON.parse(JSON.stringify(game.exportState())) as ReturnType<
        Game['exportState']
      >,
    );
    const before = population(game, 'sol-1');
    finishYear(game);
    expect(population(game, 'sol-1')).toBeGreaterThanOrEqual(before + 500);
    expect(
      game.events.some((event) =>
        event.text.includes('500 settlers arrived at Vesta from Tellus'),
      ),
    ).toBe(true);
    expect(game.fleet('shuttles')!.destination).toBeNull();
  });

  it('produktionsnatverk: moves no one between planets without a manned link', () => {
    const game = Game.restore(levellingState());
    finishYear(game);
    expect(game.exportState().settlers).toEqual([]);
  });

  it('lands passengers of an older shuttle trip on load and stops the trip', () => {
    const base = levellingState();
    const state = {
      ...base,
      fleets: base.fleets.map((fleet) =>
        fleet.id === 'shuttles'
          ? {
              ...fleet,
              destination: { q: 1, r: 0 },
              civilian: {
                passengers: 300,
                reserved: 300,
                path: [],
                stopping: false,
                sourceId: 'sol-0',
                targetId: 'sol-1',
                status: 'Transporting passengers',
              },
            }
          : fleet,
      ),
    };
    const vesta = state.colonies.find(([id]) => id === 'sol-1')![1].population;
    const game = Game.restore(state);
    expect(population(game, 'sol-1')).toBe(vesta + 300);
    expect(game.fleet('shuttles')).toMatchObject({
      destination: null,
      civilian: { passengers: 0, reserved: 0 },
    });
  });

  it('keeps settlers on their way through a save', () => {
    const game = Game.restore(levellingState());
    game.assignTradeFleet('route-test', 'freighters');
    finishYear(game);
    const saved = game.exportState();
    expect(Game.restore(saved).exportState().settlers).toEqual(saved.settlers);
    expect(() =>
      Game.restore({
        ...saved,
        settlers: [{ from: 'sol-0', to: 'nowhere', amount: 5, arrival: 3 }],
      }),
    ).toThrow('Invalid saved settlers');
  });
});

describe('civiltrafik-sparning', () => {
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
