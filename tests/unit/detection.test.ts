import { completeTacticalBattles } from '../fixtures/tactical-combat.js';
import { describe, expect, it } from 'vitest';
import { Game, type BuildType } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { TELESCOPES } from '../../src/client/models/Detection.js';
import { ResearchPlan } from '../../src/client/models/Research.js';
import { turnFrames } from '../fixtures/turn-steps.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { renderDetectionBoundary } from '../../src/client/views/DetectionMapView.js';
import type p5 from 'p5';

function equipped(level: 1 | 2 | 3, factory?: BuildType) {
  const state = new Game(createExampleGalaxy()).exportState();
  const fleet = state.fleets[0]!;
  const colony = state.colonies[0]![1];
  if (factory)
    colony.buildings.push({
      id: 'telescope-factory',
      type: factory,
      slotIndex: 0,
      demolition: false,
    });
  return Game.restore({
    ...state,
    fleets: [
      {
        ...fleet,
        position: { q: 4, r: 0 },
        shipUnits: fleet.shipUnits!.map((ship) =>
          ship.type === 'Exploration ship'
            ? { ...ship, telescope: level }
            : ship,
        ),
      },
    ],
  });
}

function year(game: Game) {
  for (const frame of turnFrames(game)) game.applyFrame(frame);
  game.finishTurn();
}

describe('aktuell-detektionssikt', () => {
  it('kartans-sikttillstand: overlapping sight has a single external boundary', () => {
    const game = new Game(createExampleGalaxy());
    const cells = game
      .mapSnapshot()
      .filter((cell) => ['1,0', '2,0'].includes(cell.position.key));
    let lines = 0;
    const noop = () => {};
    renderDetectionBoundary(
      {
        push: noop,
        pop: noop,
        stroke: noop,
        strokeWeight: noop,
        line: () => lines++,
      } as unknown as p5,
      cells,
      1,
    );
    expect(lines).toBe(10);
  });
  it('hides a pirate in previously explored space without a current observer', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    const game = Game.restore({
      ...state,
      explored: [...state.explored, '8,-3'],
    });
    expect(game.pirateSnapshots()).toEqual([]);
  });

  it('spara-avbrutet-ar: migrates an obsolete out-of-sight pirate pause without repeating spent movement', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    const game = Game.restore({
      ...state,
      version: 8,
      phase: 'interrupted',
      knownObjects: [...state.knownObjects!, 'nadir-0', 'pirate-nadir'],
      explored: [...state.explored, '8,-3'],
      simulation: {
        remaining: [
          ['fleet-home', 2],
          ['pirate-nadir', 0],
          ['pirate-aster', 0],
        ],
        awaitingCombat: true,
        handling: false,
        otherFleets: false,
        discoveries: [
          {
            id: 'pirate-nadir',
            kind: 'pirate',
            name: 'Space pirate',
            position: { q: 8, r: -3 },
            fleetId: null,
          },
        ],
      },
    });
    expect(game.interruption!.discoveries).toEqual([]);
    expect(game.interruption!.handling).toBe(true);
    expect(game.fleet('fleet-home')!.remainingMovement).toBe(2);
    expect(Game.restore(game.exportState()).interruption).toEqual(
      game.interruption,
    );
    for (const frame of turnFrames(game, false)) game.applyFrame(frame);
    game.finishTurn();
    expect(game.round).toBe(2);
  });

  it.each([1, 2, 3] as const)(
    'teleskopnivaer / kartans-sikttillstand: installed level %i controls sight, not map memory',
    (level) => {
      const game = equipped(level);
      const at = (q: number, r: number) =>
        game.mapSnapshot().find((cell) => cell.position.key === `${q},${r}`)!;
      expect(at(4 + level, 0).visible).toBe(true);
      expect(at(5 + level, 0).visible).toBe(false);
      expect(at(4 + level, 0).explored).toBe(true);
      game.setDestination('fleet-home', new HexCoordinate(4, 4));
      year(game);
      year(game);
      expect(at(4 + level, 0).visible).toBe(false);
      expect(at(4 + level, 0).explored).toBe(true);
    },
  );

  it.each([1, 2, 3] as const)(
    'teleskopfabriker: a completed level %i factory determines planetary range even without staff',
    (level) => {
      const state = equipped(
        1,
        `${TELESCOPES[level - 1]!} factory`,
      ).exportState();
      state.colonies[0]![1].population = 0;
      const game = Game.restore(state);
      const home = game.galaxy.homePlanet.position;
      const within = new HexCoordinate(home.q - level, home.r);
      const outside = new HexCoordinate(home.q - level - 1, home.r);
      expect(
        game.mapSnapshot().find((cell) => cell.position.key === within.key)!
          .visible,
      ).toBe(true);
      expect(
        game.mapSnapshot().find((cell) => cell.position.key === outside.key)!
          .visible,
      ).toBe(false);
    },
  );

  it('teleskopfabriker: scheduled demolition retains sight until completion and leaves map memory afterwards', () => {
    const game = equipped(1, 'Telescope III factory');
    const cell = () =>
      game.mapSnapshot().find((cell) => cell.position.key === '-2,0')!;
    game.toggleDemolition(game.galaxy.homePlanet, 'telescope-factory');
    expect(cell().visible).toBe(true);
    year(game);
    expect(cell()).toMatchObject({ explored: true, visible: false });
  });

  it('other ships only see their own hex; transferring the explorer preserves its telescope', () => {
    const game = equipped(3);
    const split = game.transferShips('fleet-home', 'Exploration ship', 1, null);
    expect(split.shipUnits![0]!.telescope).toBe(3);
    game.setDestination(split.id, new HexCoordinate(4, 4));
    year(game);
    expect(
      game.mapSnapshot().find((cell) => cell.position.key === '4,0')!.visible,
    ).toBe(true);
    expect(
      game.mapSnapshot().find((cell) => cell.position.key === '4,-1')!.visible,
    ).toBe(false);
    expect(
      Game.restore(game.exportState()).fleet(split.id)!.shipUnits![0]!
        .telescope,
    ).toBe(3);
  });

  it('pirat-aterupptackt: reports each re-entry, never continued visibility or reload', () => {
    const state = equipped(1).exportState();
    let game = Game.restore({
      ...state,
      fleets: [{ ...state.fleets[0]!, position: { q: 5, r: -3 } }],
    });
    let sightings = 0;
    for (let round = 0; round < 13; round++) {
      game.startTurn();
      for (let step = 0; step < 40; step++) {
        if (game.phase === 'interrupted') {
          if (
            game.interruption!.discoveries.some(
              (discovery) => discovery.kind === 'pirate',
            )
          ) {
            sightings++;
            const restored = Game.restore(game.exportState());
            expect(restored.interruption).toEqual(game.interruption);
            game = restored;
          }
          completeTacticalBattles(game);
          game.continueTurn();
        }
        const frame = game.nextTurnFrame();
        if (!frame) break;
        game.applyFrame(frame);
      }
      game.finishTurn();
    }
    expect(sightings).toBe(2);
  });

  it('saves discoveries from year-end factory completion without applying production or population twice', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    state.colonies[0]![1].projects.push({
      id: 'factory-build',
      type: 'Telescope II factory',
      slotIndex: 0,
      factoryId: null,
      destinationFleetId: null,
    });
    let game = Game.restore(state);
    game.startTurn();
    while (game.phase === 'simulating') {
      const frame = game.nextTurnFrame();
      if (!frame) break;
      game.applyFrame(frame);
    }
    expect(game.phase).toBe('interrupted');
    expect(game.interruption!.economyApplied).toBe(true);
    const colony = game.exportState().colonies[0]![1];
    expect(colony.buildings).toHaveLength(1);
    game = Game.restore(game.exportState());
    game.handleDiscoveries();
    expect(game.fleet('fleet-home')!.remainingMovement).toBe(0);
    completeTacticalBattles(game);
    game.continueTurn();
    expect(game.nextTurnFrame()).toBeNull();
    game.finishTurn();
    expect(game.exportState().colonies[0]![1]).toEqual(colony);
    expect(game.round).toBe(2);
  });
});

describe('teleskop-i-exploration-ships', () => {
  it('prefers a higher remote telescope, physically delivers it, and excludes disconnected factories', () => {
    const state = tradeNetworkState();
    const home = state.colonies[0]![1];
    const destination = state.colonies[1]![1];
    home.buildings.push({
      id: 'remote-telescope',
      type: 'Telescope III factory',
      slotIndex: 2,
      demolition: false,
    });
    destination.population = 5000;
    destination.projects = [];
    Object.assign(destination.stock, {
      Iron: 100,
      Water: 100,
      Oil: 100,
      'Rocket engine': 2,
      'Telescope I': 1,
    });
    destination.buildings.push({
      id: 'remote-yard',
      type: 'Exploration ship factory',
      slotIndex: 0,
      demolition: false,
    });
    const disconnected = Game.restore({ ...state, tradeRoutes: [] });
    disconnected.scheduleShip(
      disconnected.galaxy.systems[0]!.planets[1]!,
      'Exploration ship',
    );
    expect(
      disconnected.exportState().colonies[1]![1].projects[0]!.parts![
        'Telescope I'
      ],
    ).toBe(1);
    const game = Game.restore(state);
    game.assignTradeFleet('route-test', 'freighters');
    const target = game.galaxy.systems[0]!.planets[1]!;
    game.scheduleShip(target, 'Exploration ship');
    expect(
      game.planetSnapshot(target)!.projects[0]!.parts!['Telescope III'],
    ).toBe(1);
    for (
      let count = 0;
      count < 8 &&
      !game
        .fleetSnapshots()
        .some(
          (fleet) =>
            fleet.position?.key === target.position.key &&
            fleet.ships['Exploration ship'],
        );
      count++
    )
      year(game);
    const explorer = game
      .fleetSnapshots()
      .flatMap((fleet) =>
        fleet.position?.key === target.position.key
          ? (fleet.shipUnits ?? [])
          : [],
      )
      .find((ship) => ship.type === 'Exploration ship');
    expect(explorer?.telescope).toBe(3);
    expect(game.planetSnapshot(target)!.economy.stock['Telescope I']).toBe(1);
    expect(
      game
        .exportState()
        .componentOrders?.filter(
          (order) => order.component === 'Telescope III',
        ),
    ).toHaveLength(0);
  });
  function shipyard() {
    const state = new Game(createExampleGalaxy()).exportState();
    const colony = state.colonies[0]![1];
    colony.stock['Rocket engine'] = 10;
    colony.buildings.push({
      id: 'shipyard',
      type: 'Exploration ship factory',
      slotIndex: 0,
      demolition: false,
    });
    return state;
  }

  it('requires research in order and real telescope supply before a new ship can be ordered', () => {
    const research = new ResearchPlan();
    research.add('Exploration ship factory');
    expect(research.queue).toEqual([
      'Rocket engine factory',
      'Telescope I factory',
      'Exploration ship factory',
    ]);
    research.add('Telescope III factory');
    expect(research.queue.slice(-2)).toEqual([
      'Telescope II factory',
      'Telescope III factory',
    ]);
    const game = Game.restore(shipyard());
    expect(() =>
      game.scheduleShip(game.galaxy.homePlanet, 'Exploration ship'),
    ).toThrow('Cannot order Telescope I');
  });

  it('chooses the best supplied telescope, consumes exactly one and preserves the old ship level', () => {
    const state = shipyard();
    state.colonies[0]![1].stock['Telescope I'] = 1;
    state.colonies[0]![1].stock['Telescope III'] = 1;
    const game = Game.restore(state);
    game.scheduleShip(game.galaxy.homePlanet, 'Exploration ship');
    const project = game.planetSnapshot(game.galaxy.homePlanet)!.projects[0]!;
    expect(project.parts!['Telescope III']).toBe(1);
    expect(project.parts!['Telescope I']).toBeUndefined();
    year(game);
    const colony = game.planetSnapshot(game.galaxy.homePlanet)!;
    expect(colony.economy.stock['Telescope III']).toBe(0);
    expect(colony.economy.stock['Telescope I']).toBe(1);
    expect(
      game
        .fleet('fleet-home')!
        .shipUnits!.filter((ship) => ship.type === 'Exploration ship')
        .map((ship) => ship.telescope),
    ).toEqual([1, 3]);
  });

  it('automatically queues a telescope in the matching factory and reserves each order only once', () => {
    const state = shipyard();
    state.colonies[0]![1].buildings.push({
      id: 'telescope',
      type: 'Telescope II factory',
      slotIndex: 1,
      demolition: false,
    });
    const game = Game.restore(state);
    game.scheduleShip(game.galaxy.homePlanet, 'Exploration ship');
    game.scheduleShip(game.galaxy.homePlanet, 'Exploration ship');
    expect(
      game
        .planetSnapshot(game.galaxy.homePlanet)!
        .projects.map((project) => project.type),
    ).toEqual([
      'Telescope II',
      'Exploration ship',
      'Telescope II',
      'Exploration ship',
    ]);
    for (let count = 0; count < 4; count++) year(game);
    expect(
      game
        .fleet('fleet-home')!
        .shipUnits!.filter((ship) => ship.type === 'Exploration ship')
        .map((ship) => ship.telescope),
    ).toEqual([1, 2, 2]);
  });

  it('migrates legacy ships, research and queued ship requirements without deleting an order', () => {
    const state = shipyard();
    state.colonies[0]![1].projects.push({
      id: 'legacy-ship',
      type: 'Exploration ship',
      slotIndex: null,
      factoryId: 'shipyard',
      destinationFleetId: null,
      parts: { 'Rocket engine': 2 },
    });
    const game = Game.restore({
      ...state,
      version: 8,
      researched: ['Exploration ship factory'],
      fleets: state.fleets.map((fleet) => ({ ...fleet, shipUnits: [] })),
    });
    expect(game.research.completed).toContain('Telescope I factory');
    expect(game.fleet('fleet-home')!.shipUnits![0]!.telescope).toBe(1);
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.projects[0]!.parts![
        'Telescope I'
      ],
    ).toBe(1);
    year(game);
    expect(game.planetSnapshot(game.galaxy.homePlanet)!.projects[0]!.id).toBe(
      'legacy-ship',
    );
    expect(game.fleet('fleet-home')!.ships['Exploration ship']).toBe(1);
  });

  it.each([2, 3, 4, 5, 6, 7, 8] as const)(
    'saves version %i as version 13 without resetting explored memory or charging existing ships',
    (version) => {
      const state = shipyard();
      const game = Game.restore({
        ...state,
        version,
        explored: [...state.explored, '-6,6'],
        fleets: state.fleets.map((fleet) => ({
          ...fleet,
          shipUnits: [],
        })),
      });
      expect(game.exportState().version).toBe(13);
      expect(game.exportState().explored).toContain('-6,6');
      expect(
        game.planetSnapshot(game.galaxy.homePlanet)!.economy.stock.Iron,
      ).toBe(state.colonies[0]![1].stock.Iron);
      expect(Game.restore(game.exportState()).exportState()).toEqual(
        game.exportState(),
      );
    },
  );
});
