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
    // byggval-bara-framforskat: no build choice until it is researched.
    expect(game.productionOptions(planet).map((o) => o.type)).not.toContain(
      'Civilian shuttle',
    );
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
