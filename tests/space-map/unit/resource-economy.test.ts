import { turnFrames } from '../../fixtures/turn-steps.js';
import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import {
  PlanetEconomy,
  emptyStock,
} from '../../../src/client/space-map/models/Economy.js';
import { ResearchPlan } from '../../../src/client/space-map/models/research/Research.js';

function turn(game: Game) {
  for (const frame of turnFrames(game)) game.applyFrame(frame);
  game.finishTurn();
}

describe('utvinningsbara-resurser / utvinningsbyggnader / planetlager / planetbyggnadsko', () => {
  it('stops at depletion without negative deposits or invented material', () => {
    const stock = emptyStock(),
      deposits = { ...emptyStock(), Iron: 3 };
    const economy = new PlanetEconomy(stock, deposits);
    economy.extract({ ...emptyStock(), Iron: 10 });
    economy.extract({ ...emptyStock(), Iron: 10 });
    expect(stock.Iron).toBe(3);
    expect(deposits.Iron).toBe(0);
  });
  it('parallella-byggen: keeps unused stock, pays only once, and builds both buildings in the same year', () => {
    const game = new Game(createExampleGalaxy());
    const home = game.galaxy.homePlanet;
    const initial = game.planetSnapshot(home)!.economy.stock.Iron;
    turn(game);
    expect(game.planetSnapshot(home)!.economy.stock.Iron).toBe(initial);
    game.scheduleBuild(home, 'Iron mine', 0);
    game.scheduleBuild(home, 'Water extractor', 1);
    // byggtid-per-byggnad: paid when construction starts, built two rounds on.
    turn(game);
    expect(game.planetSnapshot(home)!.buildings).toHaveLength(0);
    expect(game.planetSnapshot(home)!.economy.stock.Iron).toBe(initial - 5 - 4);
    turn(game);
    expect(game.planetSnapshot(home)!.buildings).toHaveLength(2);
    const afterBuild = game.planetSnapshot(home)!.economy;
    expect(afterBuild.stock.Iron).toBe(initial - 5 - 4);
    turn(game);
    const afterExtraction = game.planetSnapshot(home)!.economy;
    expect(afterExtraction.stock.Iron).toBeGreaterThan(afterBuild.stock.Iron);
    expect(afterExtraction.deposits.Iron).toBeLessThan(
      afterBuild.deposits.Iron,
    );
  });
});

describe('forskningsko / forskningsberoenden / transport-ship-efter-rocket-engine', () => {
  it('rejects invalid reorder and removes dependent queued technologies together', () => {
    const research = new ResearchPlan();
    research.add('Trade logistics');
    expect(() => research.move('Trade logistics', 0)).toThrow('Prerequisites');
    research.remove('Transport ship factory');
    expect(research.queue).toEqual(['Rocket engine factory']);
  });
  it('adds prerequisites once and researches in dependency order', () => {
    const game = new Game(createExampleGalaxy());
    game.scheduleBuild(game.galaxy.homePlanet, 'Research station');
    for (let round = 0; round < 3; round++) turn(game);
    expect(game.research.completed).toEqual([]);
    game.selectResearch('Trade logistics');
    game.selectResearch('Trade logistics');
    expect(game.research.queue).toEqual([
      'Rocket engine factory',
      'Transport ship factory',
      'Trade logistics',
    ]);
    // forskningstid: 1, 2 and 3 rounds by depth in the tree.
    turn(game);
    expect(game.research.completed).toEqual(['Rocket engine factory']);
    turn(game);
    expect(game.research.completed).toEqual(['Rocket engine factory']);
    expect(game.research.progress).toEqual({ 'Transport ship factory': 1 });
    turn(game);
    expect(game.research.completed).toEqual([
      'Rocket engine factory',
      'Transport ship factory',
    ]);
    turn(game);
    turn(game);
    expect(game.research.queue).toEqual(['Trade logistics']);
    turn(game);
    expect(game.research.completed).toEqual([
      'Rocket engine factory',
      'Transport ship factory',
      'Trade logistics',
    ]);
    expect(game.research.queue).toEqual([]);
  });
});
