import { describe, expect, it } from 'vitest';
import {
  Game,
  type GameState,
  projectDefinition,
} from '../../src/client/models/Game.js';
import { Salvage } from '../../src/client/models/Salvage.js';
import { ResearchPlan } from '../../src/client/models/Research.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { Galaxy } from '../../src/client/models/Galaxy.js';
import {
  advancedExplorer,
  finishYear,
  salvageState,
} from '../fixtures/salvage.js';
import { discoveryState } from '../fixtures/exploration.js';

describe('stridsrapport-i-dialog / vrak-efter-strid', () => {
  it('pauses after resolving combat so the player can read the result before further movement', () => {
    const game = Game.restore(discoveryState());
    game.startTurn();
    for (let step = 0; step < 10; step++) {
      if (game.phase === 'interrupted') game.continueTurn();
      const frame = game.nextTurnFrame()!;
      game.applyFrame(frame);
      if (frame.combats?.length) {
        expect(game.phase).toBe('interrupted');
        expect(game.interruption!.battles).not.toHaveLength(0);
        expect(game.wrecks.length).toBeGreaterThan(0);
        const restored = Game.restore(
          JSON.parse(JSON.stringify(game.exportState())) as GameState,
        );
        expect(restored.interruption).toEqual(game.interruption);
        expect(restored.wrecks).toEqual(game.wrecks);
        return;
      }
    }
    throw new Error('No combat occurred.');
  });
});

describe('bargningsorder / bogsering-av-vrak', () => {
  it('retains the Ion bonus while towing without regaining time at pickup', () => {
    const state = salvageState();
    state.fleets[0]!.shipUnits = [
      {
        id: 'ion-tug',
        type: 'Salvage ship',
        engines: { 'Rocket engine': 0, 'Ion pulse engine': 2 },
      },
    ];
    const game = Game.restore(state);
    expect(game.fleet('fleet-home')!.speed).toBe(6);
    game.orderSalvage('fleet-home', 'advanced-wreck');
    finishYear(game);
    expect(game.fleet('fleet-home')!.speed).toBe(2);
    expect(game.fleet('fleet-home')!.position?.key).toBe('3,0');
    finishYear(game);
    expect(game.wrecks).toHaveLength(0);
  });
  it('rejects competing reservations and capacity overflow without changing the existing mission', () => {
    const state = salvageState();
    state.salvage.wrecks.push({
      ...state.salvage.wrecks[0]!,
      id: 'another-wreck',
      ship: { ...advancedExplorer, id: 'another-ship' },
    });
    state.fleets.push({
      ...structuredClone(state.fleets[0]!),
      id: 'competitor',
      name: 'Competitor',
      shipUnits: [
        {
          id: 'other-tug',
          type: 'Salvage ship',
          engines: { 'Rocket engine': 2, 'Ion pulse engine': 0 },
        },
      ],
    });
    const game = Game.restore(state);
    game.orderSalvage('fleet-home', 'advanced-wreck');
    const before = game.exportState();
    expect(() => game.orderSalvage('competitor', 'advanced-wreck')).toThrow(
      'not available',
    );
    expect(() => game.orderSalvage('fleet-home', 'another-wreck')).toThrow(
      'One Salvage ship',
    );
    expect(game.exportState()).toEqual(before);
  });
  it('reserves one wreck per tug and spends time at the speed used for each step', () => {
    const game = Game.restore(salvageState());
    game.orderSalvage('fleet-home', 'advanced-wreck');
    expect(game.fleet('fleet-home')!.destination?.key).toBe('4,0');
    expect(game.fleet('fleet-home')!.speed).toBe(5);
    expect(() => game.orderSalvage('fleet-home', 'advanced-wreck')).toThrow();
    finishYear(game);
    expect(game.fleet('fleet-home')!.position?.key).toBe('4,0');
    expect(game.fleet('fleet-home')!.speed).toBe(1);
    expect(game.wrecks[0]!.towedBy).toBe('fleet-home');
    finishYear(game);
    expect(game.fleet('fleet-home')!.position?.key).toBe('3,0');
    finishYear(game);
    expect(game.wrecks).toHaveLength(0);
    const repaired = game
      .fleetSnapshots()
      .find((fleet) => fleet.name.startsWith('Orbit'))!;
    expect(repaired.shipUnits).toEqual([advancedExplorer]);
    expect(repaired.position?.key).toBe('2,0');
    expect(game.fleet('fleet-home')!.speed).toBe(5);
  });
  it('keeps a tow after Stop and Move, rejects transfer, and releases explicitly', () => {
    const game = Game.restore(salvageState());
    game.orderSalvage('fleet-home', 'advanced-wreck');
    finishYear(game);
    game.clearDestination('fleet-home');
    expect(game.wrecks[0]!.towedBy).toBe('fleet-home');
    expect(game.fleet('fleet-home')!.salvage).toBeNull();
    expect(() =>
      game.transferShips('fleet-home', 'Salvage ship', 1, null),
    ).toThrow();
    game.setDestination('fleet-home', new HexCoordinate(5, 0));
    finishYear(game);
    expect(game.wrecks[0]!.position.key).toBe('5,0');
    game.releaseWreck('fleet-home', 'advanced-wreck');
    expect(game.wrecks[0]!.towedBy).toBeNull();
    expect(game.fleet('fleet-home')!.speed).toBe(5);
  });
  it('waits with its tow and reports a decision when no shipyard remains', () => {
    const state = salvageState();
    state.salvage.yards = [];
    const game = Game.restore(state);
    game.orderSalvage('fleet-home', 'advanced-wreck');
    finishYear(game);
    expect(game.fleet('fleet-home')!.salvage!.issue).toContain(
      'No completed shipyard',
    );
    expect(
      game.decisions.some((decision) => decision.id === 'salvage-fleet-home'),
    ).toBe(true);
    expect(Game.restore(game.exportState()).wrecks).toEqual(game.wrecks);
  });
});

describe('automatisk-vrakreparation / forskning-fran-bargade-delar', () => {
  it('uses resources remaining after this year production without reserving next year production twice', () => {
    const state = salvageState();
    const cost = Salvage.repairCost(
      advancedExplorer,
      (type) => projectDefinition(type).cost,
    );
    const colony = state.colonies[0]![1];
    colony.stock = {
      ...colony.stock,
      Iron: cost.Iron + projectDefinition('Research station').cost.Iron,
      Water: cost.Water + projectDefinition('Research station').cost.Water,
      Oil: cost.Oil + projectDefinition('Research station').cost.Oil,
    };
    colony.projects = [1, 2].map((index) => ({
      id: `research-build-${index}`,
      type: 'Research station',
      slotIndex: index + 1,
      factoryId: null,
      destinationFleetId: null,
    }));
    state.salvage.wrecks[0]!.position = new HexCoordinate(2, 0);
    const game = Game.restore(state);
    finishYear(game);
    expect(game.wrecks).toHaveLength(0);
    expect(game.planetSnapshot(game.galaxy.homePlanet)!.projects).toHaveLength(
      1,
    );
  });
  it('charges a third of hull and installed parts with rounding for each material', () => {
    const cost = Salvage.repairCost(
      advancedExplorer,
      (type) => projectDefinition(type).cost,
    );
    const hull = projectDefinition('Exploration ship').cost;
    const engine = projectDefinition('Ion pulse engine').cost;
    const telescope = projectDefinition('Telescope III').cost;
    for (const resource of ['Iron', 'Water', 'Oil'] as const)
      expect(cost[resource]).toBe(
        Math.ceil(
          (hull[resource] + 2 * engine[resource] + telescope[resource]) / 3,
        ),
      );
  });
  it('unlocks research on delivery before a blocked repair, without granting prerequisites', () => {
    const state = salvageState();
    state.salvage.wrecks[0]!.position = new HexCoordinate(2, 0);
    state.colonies[0]![1].stock = {
      ...state.colonies[0]![1].stock,
      Iron: 0,
      Water: 0,
      Oil: 0,
    };
    const game = Game.restore(state);
    finishYear(game);
    expect(game.shipyards[0]!.queue).toEqual(['advanced-wreck']);
    expect(game.shipyards[0]!.issue).toBeTruthy();
    expect(game.research.recovered).toContain('Telescope III factory');
    expect(game.research.completed).not.toContain('Telescope III factory');
    game.selectResearch('Telescope III factory');
    expect(game.research.queue).toEqual(['Telescope III factory']);
    expect(game.research.completed).not.toContain('Telescope II factory');
    expect(Game.restore(game.exportState()).research.recovered).toEqual(
      game.research.recovered,
    );
  });
  it('keeps unrelated queued research and allows recovered technology to move before missing prerequisites', () => {
    const research = new ResearchPlan();
    research.add('Telescope III factory');
    research.recovered.add('Telescope III factory');
    research.move('Telescope III factory', 0);
    expect(research.queue).toEqual([
      'Telescope III factory',
      'Telescope I factory',
      'Telescope II factory',
    ]);
    research.remove('Telescope I factory');
    expect(research.queue).toEqual(['Telescope III factory']);
    expect(research.completed.size).toBe(0);
  });
  it('repairs one queued wreck per year and preserves the remaining queue order', () => {
    const state = salvageState();
    state.salvage.wrecks[0]!.position = new HexCoordinate(2, 0);
    state.salvage.wrecks.push({
      ...structuredClone(state.salvage.wrecks[0]!),
      id: 'second',
      ship: { ...advancedExplorer, id: 'second-ship' },
    });
    const game = Game.restore(state);
    finishYear(game);
    expect(game.shipyards[0]!.queue).toEqual(['second']);
    expect(
      game.fleetSnapshots().find((fleet) => fleet.name.startsWith('Orbit'))!
        .ships['Exploration ship'],
    ).toBe(1);
    finishYear(game);
    expect(game.shipyards[0]!.queue).toHaveLength(0);
    expect(
      game.fleetSnapshots().find((fleet) => fleet.name.startsWith('Orbit'))!
        .ships['Exploration ship'],
    ).toBe(2);
  });
  it('omordningsbar-reparationsko: persists the chosen order and repairs that wreck first without partial invalid changes', () => {
    const state = salvageState();
    state.salvage.wrecks[0]!.position = new HexCoordinate(2, 0);
    state.salvage.wrecks.push({
      ...structuredClone(state.salvage.wrecks[0]!),
      id: 'second',
      ship: { ...advancedExplorer, id: 'second-ship' },
    });
    state.salvage.yards[0]!.queue = ['advanced-wreck', 'second'];
    for (const wreck of state.salvage.wrecks) wreck.yardId = 'yard';
    const game = Game.restore(state);
    game.moveRepair('yard', 'second', 0);
    expect(() => game.moveRepair('yard', 'advanced-wreck', 8)).toThrow();
    expect(game.shipyards[0]!.queue).toEqual(['second', 'advanced-wreck']);
    const restored = Game.restore(
      JSON.parse(JSON.stringify(game.exportState())) as GameState,
    );
    expect(restored.shipyards[0]!.queue).toEqual(['second', 'advanced-wreck']);
    finishYear(restored);
    expect(restored.shipyards[0]!.queue).toEqual(['advanced-wreck']);
    expect(
      restored
        .fleetSnapshots()
        .flatMap((fleet) => fleet.shipUnits ?? [])
        .some((ship) => ship.id === 'second-ship'),
    ).toBe(true);
    expect(restored.wrecks.map((wreck) => wreck.id)).toContain(
      'advanced-wreck',
    );
  });
});

describe('orbitalt-varv / forstort-varv / bargningsskepp', () => {
  it('reserves a free neighboring hex, creates a station and postpones its first repair to next year', () => {
    const state = salvageState();
    state.salvage.yards = [];
    state.colonies[0]![1].buildings.shift();
    state.salvage.wrecks[0]!.position = new HexCoordinate(2, 0);
    const game = Game.restore(state);
    const home = game.galaxy.homePlanet;
    expect(() =>
      game.scheduleBuild(home, 'Orbital shipyard', undefined, home.position),
    ).toThrow('neighboring');
    game.scheduleBuild(
      home,
      'Orbital shipyard',
      undefined,
      new HexCoordinate(2, 0),
    );
    expect(game.freeShipyardHexes(home.id).map((hex) => hex.key)).not.toContain(
      '2,0',
    );
    finishYear(game);
    expect(game.shipyards[0]!.position.key).toBe('2,0');
    expect(game.wrecks).toHaveLength(1);
    expect(game.shipyards[0]!.queue).toEqual(['advanced-wreck']);
    finishYear(game);
    expect(game.wrecks).toHaveLength(0);
  });
  it('rebuilds a destroyed station through the planet queue and frees wrecks on demolition', () => {
    const state = salvageState();
    state.salvage.yards[0]!.destroyed = true;
    const game = Game.restore(state);
    game.scheduleRebuildShipyard('yard', new HexCoordinate(2, 0));
    expect(() =>
      game.scheduleRebuildShipyard('yard', new HexCoordinate(2, -1)),
    ).toThrow('already queued');
    finishYear(game);
    expect(game.shipyards[0]!.destroyed).toBe(false);
    game.toggleDemolition(game.galaxy.homePlanet, 'yard-facility');
    finishYear(game);
    expect(game.shipyards).toHaveLength(0);
  });
  it('manufactures a tug using its own factory, two engines and new crew', () => {
    const state = salvageState();
    const colony = state.colonies[0]![1];
    colony.buildings.push({
      id: 'tug-factory',
      type: 'Salvage ship factory',
      slotIndex: 2,
      demolition: false,
    });
    colony.stock['Rocket engine'] = 2;
    const game = Game.restore(state);
    game.scheduleShip(game.galaxy.homePlanet, 'Salvage ship');
    finishYear(game);
    expect(
      game
        .fleetSnapshots()
        .reduce((total, fleet) => total + fleet.ships['Salvage ship'], 0),
    ).toBe(2);
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.economy.stock[
        'Rocket engine'
      ],
    ).toBe(0);
  });
  it('destroys an undefended station when pirates reach its hex and preserves the facility', () => {
    const state = salvageState();
    const pirate = new Game(Game.restore(state).galaxy).exportState()
      .pirates![0]!;
    state.salvage.yards[0] = {
      ...state.salvage.yards[0]!,
      position: new HexCoordinate(1, -1),
    };
    const game = Game.restore({
      ...state,
      pirates: [{ ...pirate, systemId: 'sol', position: { q: 1, r: 0 } }],
    });
    finishYear(game);
    expect(game.shipyards[0]!.destroyed).toBe(true);
    expect(
      game
        .planetSnapshot(game.galaxy.homePlanet)!
        .buildings.some((building) => building.id === 'yard-facility'),
    ).toBe(true);
  });
});

describe('spara-bargning-och-stridsavbrott / upptackbara-vrak', () => {
  it('seeds no derelicts outside a smaller galaxy without those systems', () => {
    const galaxy = Game.restore(salvageState()).galaxy;
    const game = new Game(new Galaxy(galaxy.player, [galaxy.systems[0]!], 3));
    expect(game.exportState().salvage!.wrecks).toHaveLength(0);
    expect(Game.restore(game.exportState()).round).toBe(1);
  });
  it('seeds advanced derelicts only for new games and preserves old games without retroactive wrecks', () => {
    const state = salvageState();
    expect(
      new Game(Game.restore(state).galaxy).exportState().salvage!.wrecks,
    ).toHaveLength(2);
    expect(
      Game.restore({ ...state, version: 9 }).exportState().salvage!.wrecks,
    ).toHaveLength(0);
  });
  it('rejects inconsistent docking, invalid engines and unknown recovered technologies', () => {
    const state = salvageState();
    const orphan = structuredClone(state);
    orphan.salvage.wrecks[0]!.yardId = 'yard';
    expect(() => Game.restore(orphan)).toThrow();
    const badEngine = structuredClone(state);
    badEngine.salvage.wrecks[0] = {
      ...badEngine.salvage.wrecks[0]!,
      ship: {
        ...advancedExplorer,
        engines: { 'Rocket engine': 8, 'Ion pulse engine': 0 },
      },
    };
    expect(() => Game.restore(badEngine)).toThrow();
    expect(() =>
      Game.restore({
        ...state,
        recoveredResearch: ['Unknown factory'] as never,
      }),
    ).toThrow();
  });
});
