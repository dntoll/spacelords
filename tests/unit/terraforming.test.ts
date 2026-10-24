import { researchStationState } from '../fixtures/research-station.js';
import { describe, expect, it } from 'vitest';
import {
  Game,
  type GameState,
  type Technology,
  type BuildType,
} from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { BrowserSaveRepository } from '../../src/client/storage/BrowserSaveRepository.js';

function setup(habitability = 25, environment = 'Desert', potential = 6) {
  const state = new Game(createExampleGalaxy()).exportState();
  const world = state.world.systems[0]!.planets[0]!;
  const colony = state.colonies[0]![1];
  const game = Game.restore({
    ...state,
    world: {
      ...state.world,
      systems: state.world.systems.map((system, index) =>
        index
          ? system
          : {
              ...system,
              planets: [
                { ...world, environment, habitability, buildSlots: potential },
                ...system.planets.slice(1),
              ],
            },
      ),
    },
    researched: ['Desert dome', 'Desert terraforming factory'],
    colonies: [
      [world.id, { ...colony, population: 1_000, habitability, domes: [] }],
    ],
  } as GameState);
  const planet = game.galaxy.homePlanet;
  return { game, planet, snapshot: () => game.planetSnapshot(planet)! };
}

function turn(game: Game) {
  for (const frame of game.startTurn()) game.applyFrame(frame);
  game.finishTurn();
}

describe('befolkningsutveckling / gastvanlighet / habitability-kapacitet / andningsbar-atmosfar', () => {
  it.each([
    [0, 1_000, 1, false],
    [25, 5_000, 1, false],
    [79, 15_800, 4, false],
    [80, 16_000, 4, true],
    [100, 20_000, 6, true],
  ])(
    'derives population, sites and atmosphere at %s percent',
    (h, cap, sites, breathable) => {
      const { snapshot } = setup(h);
      expect(snapshot()).toMatchObject({
        populationCapacity: cap,
        buildSlots: sites,
        breathable,
      });
      expect(snapshot().sites.filter((site) => !site.locked)).toHaveLength(
        sites,
      );
    },
  );

  it('does not invent a building site when physical potential is zero', () => {
    const { game, planet, snapshot } = setup(0, 'Desert', 0);
    expect(snapshot().buildSlots).toBe(0);
    expect(snapshot().sites).toEqual([]);
    expect(game.canBuild(planet, 'Desert dome', 0)).toContain('No build slots');
  });

  it('caps growth without removing people already over the limit', () => {
    const { game } = setup(25);
    const state = game.exportState();
    for (const population of [4_990, 5_500]) {
      const next = Game.restore({
        ...state,
        colonies: state.colonies.map(([id, colony]) => [
          id,
          { ...colony, population },
        ]),
      });
      turn(next);
      expect(next.planetSnapshot(next.galaxy.homePlanet)!.population).toBe(
        population > 5_000 ? population : 5_000,
      );
    }
  });
});

describe('domes-per-byggplats / terraformning', () => {
  it('prepares the same site before construction, then improves capacity starting the following year', () => {
    const { game, planet, snapshot } = setup();
    expect(game.canBuild(planet, 'Research station', 0)).toContain('Dome');
    game.scheduleBuild(planet, 'Desert dome', 0);
    expect(() => game.scheduleBuild(planet, 'Desert dome', 0)).toThrow(
      'No build slots',
    );
    turn(game);
    expect(snapshot().buildings).toHaveLength(0);
    expect(snapshot().sites[0]!.hasDome).toBe(true);
    expect(snapshot().economy.stock.Iron).toBe(92);
    expect(snapshot().budget.availableSlots).toBe(1);
    game.scheduleBuild(planet, 'Desert terraforming factory', 0);
    turn(game);
    expect(snapshot().habitability).toBe(25);
    turn(game);
    expect(snapshot()).toMatchObject({
      habitability: 30,
      populationCapacity: 6_000,
      buildSlots: 1,
    });
    turn(game);
    expect(snapshot().buildSlots).toBe(2);
    expect(snapshot().economy.stock.Iron).toBe(80);
    expect(game.planetOrders()[0]!.emptySites).toBe(1);
    expect(game.canBuild(planet, 'Research station', 1)).toContain('Dome');
    const restored = Game.restore(game.exportState());
    expect(restored.planetSnapshot(restored.galaxy.homePlanet)).toEqual(
      snapshot(),
    );
    game.toggleDemolition(planet, snapshot().buildings[0]!.id);
    turn(game);
    expect(snapshot().habitability).toBe(35);
    expect(snapshot().sites[0]!.hasDome).toBe(true);
  });

  it('finds another unprepared site when ordering Domes without an explicit site', () => {
    const { game, planet, snapshot } = setup(50);
    game.scheduleBuild(planet, 'Desert dome');
    turn(game);
    game.scheduleBuild(planet, 'Desert dome');
    expect(snapshot().projects[0]!.slotIndex).toBe(1);
    const restored = Game.restore(game.exportState());
    turn(restored);
    expect(
      restored.planetSnapshot(restored.galaxy.homePlanet)!.sites[1]!.hasDome,
    ).toBe(true);
  });

  it('requires the correct technology and planet type and releases cancelled Dome reservations', () => {
    const { game, planet, snapshot } = setup();
    expect(game.canBuild(planet, 'Ice dome', 0)).not.toBeNull();
    expect(game.canBuild(planet, 'Desert dome', 1)).toContain('No build slots');
    game.scheduleBuild(planet, 'Desert dome', 0);
    game.cancelProject(planet, snapshot().projects[0]!.id);
    expect(snapshot().sites[0]!.hasDome).toBe(false);
    expect(snapshot().budget.availableSlots).toBe(1);
    const state = game.exportState();
    const locked = Game.restore({ ...state, researched: [] });
    expect(
      locked.canBuild(locked.galaxy.homePlanet, 'Desert dome', 0),
    ).toContain('Research');
    const wrong = setup(25, 'Ice');
    expect(wrong.game.canBuild(wrong.planet, 'Desert dome', 0)).toContain(
      'planet type',
    );
  });

  it('sums staffed factories, stops at 100 and removes the Dome requirement at 80', () => {
    const { game } = setup(75);
    const state = game.exportState();
    const next = Game.restore({
      ...state,
      colonies: state.colonies.map(([id, colony]) => [
        id,
        {
          ...colony,
          domes: [0, 1],
          buildings: [0, 1].map((slotIndex) => ({
            id: `factory-${slotIndex}`,
            type: 'Desert terraforming factory',
            slotIndex,
            demolition: false,
          })),
        },
      ]),
    });
    turn(next);
    const planet = next.galaxy.homePlanet;
    expect(next.planetSnapshot(planet)!.habitability).toBe(85);
    expect(next.canBuild(planet, 'Research station', 2)).toBeNull();
    for (let year = 0; year < 3; year++) turn(next);
    expect(next.planetSnapshot(planet)!.habitability).toBe(100);
    const understaffed = Game.restore({
      ...state,
      colonies: next
        .exportState()
        .colonies.map(([id, colony]) => [
          id,
          { ...colony, population: 100, habitability: 75 },
        ]),
    });
    turn(understaffed);
    expect(
      understaffed.planetSnapshot(understaffed.galaxy.homePlanet)!.habitability,
    ).toBe(75);
  });
});

describe('planettypsforskning', () => {
  it.each(['Ice', 'Desert', 'Ocean', 'Toxic'])(
    'researches and operates the independent %s chain',
    (environment) => {
      const { game: initial } = setup(80, environment);
      const game = Game.restore({ ...initial.exportState(), researched: [] });
      const planet = game.galaxy.homePlanet;
      game.scheduleBuild(planet, 'Research station');
      turn(game);
      game.selectResearch(`${environment} terraforming factory` as Technology);
      turn(game);
      turn(game);
      turn(game);
      expect(game.research.completed).toEqual([
        `${environment} dome`,
        `${environment} terraforming factory`,
      ]);
      game.scheduleBuild(
        planet,
        `${environment} terraforming factory` as BuildType,
      );
      turn(game);
      turn(game);
      expect(game.planetSnapshot(planet)!.habitability).toBe(85);
    },
  );

  it('rejects terraforming and Domes on an owned gas planet even with completed research', () => {
    const { game: initial } = setup();
    const state = initial.exportState();
    const game = Game.restore({
      ...state,
      world: {
        ...state.world,
        systems: state.world.systems.map((system) => ({
          ...system,
          planets: system.planets.map((planet) => ({
            ...planet,
            type: 'gas' as const,
          })),
        })),
      },
    });
    const planet = game.galaxy.homePlanet;
    expect(game.canBuild(planet, 'Desert dome', 0)).toContain(
      'solid planet type',
    );
    expect(game.canBuild(planet, 'Desert terraforming factory', 0)).toContain(
      'solid planet type',
    );
    expect(game.research.available).not.toContain('Desert dome');
    expect(game.planetSnapshot(planet)!.environment).toBe('Gas');
  });

  it('requests more research only when an unfinished discovered project exists', () => {
    const initial = Game.restore(researchStationState());
    const state = {
      ...initial.exportState(),
      researched: initial.research.available,
    };
    const finished = Game.restore(state);
    expect(
      finished.decisions.some(
        (decision) => decision.id === 'research-empty' && decision.current,
      ),
    ).toBe(false);
    const ice = finished.galaxy.systems[1]!.planets[0]!;
    const discovered = Game.restore({
      ...state,
      explored: [...state.explored, ice.position.key],
    });
    expect(
      discovered.decisions.some(
        (decision) => decision.id === 'research-empty' && decision.current,
      ),
    ).toBe(true);
  });

  it('reveals both projects through visibility and queues the matching Dome prerequisite', () => {
    const game = Game.restore(researchStationState());
    expect(game.research.available).toContain('Desert dome');
    expect(game.research.available).toContain('Desert terraforming factory');
    expect(game.research.available).not.toContain('Ice dome');
    expect(() => game.selectResearch('Ice terraforming factory')).toThrow(
      'Discover',
    );
    expect(game.research.queue).toEqual([]);
    game.selectResearch('Desert terraforming factory');
    expect(game.research.queue).toEqual([
      'Desert dome',
      'Desert terraforming factory',
    ]);
    const saved = game.exportState();
    const discovered = Game.restore({
      ...saved,
      explored: [
        ...saved.explored,
        game.galaxy.systems[1]!.planets[0]!.position.key,
      ],
    });
    expect(discovered.research.available).toContain('Ice dome');
    const gas = game.galaxy.systems[0]!.planets[2]!;
    expect(game.planetSnapshot(gas)).toBeNull();
  });
});

describe('engangsreset-terraformning', () => {
  it('clears all three previous slots once and preserves new saves and unrelated storage', () => {
    const values = new Map([
      ['another-app', 'keep'],
      ...[1, 2, 3].map(
        (slot) => [`spacelords.save.v2.${slot}`, 'old'] as [string, string],
      ),
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    const repository = new BrowserSaveRepository(storage);
    for (const slot of [1, 2, 3]) expect(repository.load(slot)).toBeNull();
    const saved = {
      lastPlayed: new Date().toISOString(),
      state: new Game(createExampleGalaxy()).exportState(),
    };
    repository.save(2, saved);
    expect(new BrowserSaveRepository(storage).load(2)).toEqual(saved);
    expect(values.get('another-app')).toBe('keep');
  });
});
