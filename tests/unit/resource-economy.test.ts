import { describe, expect, it } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { PlanetEconomy, emptyStock } from '../../src/client/models/Economy.js';
import { ResearchPlan } from '../../src/client/models/Research.js';

function turn(game: Game) {
  for (const frame of game.startTurn()) game.applyFrame(frame);
  game.finishTurn();
}

describe('utvinningsbara-resurser / utvinningsbyggnader / planetlager / planetbyggnadsko', () => {
  it('reports understaffed operating buildings even when no construction is queued', () => {
    const game = new Game(createExampleGalaxy());
    game.scheduleBuild(game.galaxy.homePlanet, 'Iron mine');
    turn(game);
    const saved = game.exportState();
    saved.colonies[0]![1].population = 50;
    const restored = Game.restore(saved);
    expect(restored.decisions.some((d) => d.id === 'staff-sol-0')).toBe(true);
    expect(
      restored.planetSnapshot(restored.galaxy.homePlanet)!.economy.extraction
        .Iron,
    ).toBe(0);
  });
  it('stops at depletion without negative deposits or invented material', () => {
    const stock = emptyStock(),
      deposits = { ...emptyStock(), Iron: 3 };
    const economy = new PlanetEconomy(stock, deposits);
    economy.extract({ ...emptyStock(), Iron: 10 });
    economy.extract({ ...emptyStock(), Iron: 10 });
    expect(stock.Iron).toBe(3);
    expect(deposits.Iron).toBe(0);
  });
  it('keeps unused stock, pays only once, and completes one planetary building per year', () => {
    const game = new Game(createExampleGalaxy());
    const home = game.galaxy.homePlanet;
    const initial = game.planetSnapshot(home)!.economy.stock.Iron;
    turn(game);
    expect(game.planetSnapshot(home)!.economy.stock.Iron).toBe(initial);
    game.scheduleBuild(home, 'Iron mine', 0);
    game.scheduleBuild(home, 'Water extractor', 1);
    turn(game);
    expect(game.planetSnapshot(home)!.buildings).toHaveLength(1);
    const afterBuild = game.planetSnapshot(home)!.economy;
    turn(game);
    const afterExtraction = game.planetSnapshot(home)!.economy;
    expect(afterExtraction.stock.Iron).toBeGreaterThan(afterBuild.stock.Iron);
    expect(afterExtraction.deposits.Iron).toBeLessThan(
      afterBuild.deposits.Iron,
    );
    expect(game.planetSnapshot(home)!.buildings).toHaveLength(2);
  });
});

describe('forskningsko / forskningsberoenden', () => {
  it('rejects invalid reorder and removes dependent queued technologies together', () => {
    const research = new ResearchPlan();
    research.add('Trade logistics');
    expect(() => research.move('Trade logistics', 0)).toThrow('Prerequisites');
    research.remove('Transport ship factory');
    expect(research.queue).toEqual(['Exploration ship factory']);
  });
  it('adds prerequisites once and researches in dependency order', () => {
    const game = new Game(createExampleGalaxy());
    game.scheduleBuild(game.galaxy.homePlanet, 'Research station');
    game.selectResearch('Trade logistics');
    game.selectResearch('Trade logistics');
    expect(game.research.queue).toEqual([
      'Exploration ship factory',
      'Transport ship factory',
      'Trade logistics',
    ]);
    turn(game);
    expect(game.research.completed).toEqual([]);
    turn(game);
    turn(game);
    turn(game);
    expect(game.research.completed).toEqual([
      'Exploration ship factory',
      'Transport ship factory',
      'Trade logistics',
    ]);
    expect(game.research.queue).toEqual([]);
  });
});

describe('automatisk-resursforsorjning / transportfabrik / sparat-spel', () => {
  it('reaches every building and ship through actual play and supplies a new colony automatically', () => {
    let game = new Game(createExampleGalaxy());
    const home = game.galaxy.homePlanet;
    for (const building of [
      'Iron mine',
      'Water extractor',
      'Oil extractor',
      'Research station',
    ] as const)
      game.scheduleBuild(home, building);
    for (let year = 0; year < 4; year++) turn(game);
    game.selectResearch('Trade logistics');
    game.selectResearch('Colony ship factory');
    game.selectResearch('Fighter factory');
    for (let year = 0; year < 5; year++) turn(game);
    for (const factory of [
      'Transport ship factory',
      'Exploration ship factory',
      'Colony ship factory',
      'Fighter factory',
    ] as const)
      game.scheduleBuild(home, factory);
    for (let year = 0; year < 4; year++) turn(game);
    expect(game.planetSnapshot(home)!.buildings).toHaveLength(8);
    const colonyFleet = game.createFleet(),
      tradeFleet = game.createFleet();
    game.scheduleShip(home, 'Colony ship', colonyFleet.id);
    game.scheduleShip(home, 'Transport ship', tradeFleet.id);
    game.scheduleShip(home, 'Exploration ship');
    game.scheduleShip(home, 'Fighter');
    turn(game);
    const target = game.galaxy.systems[0]!.planets[1]!;
    game.setDestination(colonyFleet.id, target.position);
    turn(game);
    game.colonize(colonyFleet.id);
    expect(game.planetSnapshot(target)!.economy.stock).toEqual(emptyStock());
    game.scheduleBuild(target, 'Iron mine');
    const route = game.createTradeRoute(home.id, target.id);
    game.assignTradeFleet(route, tradeFleet.id);
    expect(() => game.setDestination(tradeFleet.id, home.position)).toThrow(
      'Release',
    );
    const head = game.planetSnapshot(target)!.projects[0]!.id;
    const frames = game.startTurn();
    expect(game.fleet(tradeFleet.id)!.cargo!.Iron).toBe(5);
    for (const frame of frames) game.applyFrame(frame);
    game.finishTurn();
    expect(game.planetSnapshot(target)!.buildings[0]!.type).toBe('Iron mine');
    expect(
      game.planetSnapshot(target)!.projects.some((p) => p.id === head),
    ).toBe(false);
    const saved = JSON.parse(JSON.stringify(game.exportState())) as ReturnType<
      Game['exportState']
    >;
    game = Game.restore(saved);
    expect(game.exportState()).toEqual(saved);
    turn(game);
    expect(
      game.planetSnapshot(game.galaxy.systems[0]!.planets[1]!)!.economy.stock
        .Iron,
    ).toBeGreaterThan(0);
    expect(game.decisions.some((d) => d.fleetId === tradeFleet.id)).toBe(false);
    const secondColonizer = game.createFleet();
    game.scheduleShip(home, 'Colony ship', secondColonizer.id);
    turn(game);
    const remote = game.galaxy.systems[1]!.planets[0]!;
    game.setDestination(secondColonizer.id, remote.position);
    for (let i = 0; game.fleet(secondColonizer.id)!.destination && i < 8; i++)
      turn(game);
    game.colonize(secondColonizer.id);
    game.scheduleBuild(remote, 'Iron mine');
    game.releaseTradeFleet(tradeFleet.id);
    game.setDestination(tradeFleet.id, home.position);
    turn(game);
    const longRoute = game.createTradeRoute(home.id, remote.id);
    game.assignTradeFleet(longRoute, tradeFleet.id);
    turn(game);
    expect(game.fleet(tradeFleet.id)!.destination).not.toBeNull();
    expect(game.fleet(tradeFleet.id)!.cargo!.Iron).toBe(5);
    const restored = Game.restore(
      JSON.parse(JSON.stringify(game.exportState())) as ReturnType<
        Game['exportState']
      >,
    );
    turn(game);
    turn(restored);
    expect(restored.exportState()).toEqual(game.exportState());
  });
});
