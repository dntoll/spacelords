import { describe, expect, it } from 'vitest';
import { Game, type BuildType } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';

function setup(
  types: readonly BuildType[] = [
    'Fighter factory',
    'Rocket engine factory',
    'Weapons module factory',
  ],
) {
  const state = new Game(createExampleGalaxy()).exportState();
  const colony = state.colonies[0]![1];
  const game = Game.restore({
    ...state,
    version: 3,
    colonies: [
      [
        state.colonies[0]![0],
        {
          ...colony,
          stock: { ...colony.stock, Iron: 1000, Water: 1000, Oil: 1000 },
          buildings: types.map((type, index) => ({
            id: `factory-${index}`,
            type,
            slotIndex: index,
            demolition: false,
            queue: [],
          })),
        },
      ],
    ],
  });
  const home = game.galaxy.homePlanet;
  const snapshot = () => game.planetSnapshot(home)!;
  const turn = () => {
    for (const frame of game.startTurn()) game.applyFrame(frame);
    game.finishTurn();
  };
  return { game, home, snapshot, turn };
}

describe('gemensam-planetko / delfabriker / automatiska-delorder', () => {
  it('uses existing component stock before scheduling new parts for a later ship', () => {
    const base = setup().game.exportState();
    const game = Game.restore({
      ...base,
      colonies: base.colonies.map(([id, colony]) => [
        id,
        {
          ...colony,
          stock: { ...colony.stock, 'Rocket engine': 1, 'Weapons module': 1 },
        },
      ]),
    });
    game.scheduleShip(game.galaxy.homePlanet, 'Fighter');
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.projects.map((p) => p.type),
    ).toEqual(['Fighter']);
    game.scheduleShip(game.galaxy.homePlanet, 'Fighter');
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.projects.map((p) => p.type),
    ).toEqual(['Fighter', 'Rocket engine', 'Weapons module', 'Fighter']);
  });

  it('queues only the components that have local factories and keeps invalid orders atomic', () => {
    const { game, home, snapshot } = setup([
      'Fighter factory',
      'Rocket engine factory',
    ]);
    const before = game.exportState();
    expect(() => game.scheduleShip(home, 'Fighter', 'missing')).toThrow();
    expect(game.exportState()).toEqual(before);
    game.scheduleShip(home, 'Fighter');
    expect(snapshot().projects.map((p) => p.type)).toEqual([
      'Rocket engine',
      'Fighter',
    ]);
  });
  it('queues missing Fighter parts before the ship and completes only one item per planet-year', () => {
    const { game, home, snapshot, turn } = setup();
    game.scheduleShip(home, 'Fighter');
    game.scheduleBuild(home, 'Research station');
    expect(snapshot().projects.map((p) => p.type)).toEqual([
      'Rocket engine',
      'Weapons module',
      'Fighter',
      'Research station',
    ]);
    turn();
    expect(snapshot().economy.stock['Rocket engine']).toBe(1);
    expect(game.fleet('fleet-home')!.ships.Fighter).toBe(1);
    expect(snapshot().projects).toHaveLength(3);
    turn();
    expect(snapshot().economy.stock['Weapons module']).toBe(1);
    turn();
    expect(game.fleet('fleet-home')!.ships.Fighter).toBe(2);
    expect(snapshot().economy.stock['Rocket engine']).toBe(0);
    expect(snapshot().economy.stock['Weapons module']).toBe(0);
    expect(snapshot().buildings).toHaveLength(3);
    turn();
    expect(snapshot().buildings).toHaveLength(4);
  });

  it('uses stock and earlier queued parts once without creating duplicate automatic orders', () => {
    const { game, home, snapshot } = setup();
    game.scheduleComponent(home, 'Rocket engine');
    game.scheduleComponent(home, 'Weapons module');
    game.scheduleShip(home, 'Fighter');
    expect(snapshot().projects.map((p) => p.type)).toEqual([
      'Rocket engine',
      'Weapons module',
      'Fighter',
    ]);
    game.scheduleShip(home, 'Fighter');
    expect(snapshot().projects.map((p) => p.type)).toEqual([
      'Rocket engine',
      'Weapons module',
      'Fighter',
      'Rocket engine',
      'Weapons module',
      'Fighter',
    ]);
    const saved = game.exportState();
    expect(
      Game.restore(
        JSON.parse(JSON.stringify(saved)) as typeof saved,
      ).exportState(),
    ).toEqual(saved);
  });

  it('waits for missing parts without local factories and never charges a blocked ship', () => {
    const { game, home, snapshot, turn } = setup(['Fighter factory']);
    game.scheduleShip(home, 'Fighter');
    expect(snapshot().projects.map((p) => p.type)).toEqual(['Fighter']);
    const stock = snapshot().economy.stock;
    turn();
    expect(snapshot().economy.stock).toEqual(stock);
    expect(snapshot().projects[0]!.blockedReason).toContain('Rocket engine');
    expect(() => game.scheduleComponent(home, 'Rocket engine')).toThrow(
      'factory',
    );
  });

  it('does not count component orders as reserved building sites', () => {
    const { game, home, snapshot } = setup();
    for (let i = 0; i < 8; i++) game.scheduleShip(home, 'Fighter');
    expect(snapshot().budget.availableSlots).toBe(home.buildSlots - 3);
    expect(game.planetOrders()[0]!.emptySites).toBe(home.buildSlots - 3);
  });

  it('offers one production decision per idle planet rather than one per factory', () => {
    const { game, home } = setup();
    expect(
      game.decisions.filter((decision) => decision.kind === 'planet'),
    ).toHaveLength(1);
    game.scheduleShip(home, 'Fighter');
    expect(
      game.decisions.filter((decision) => decision.kind === 'planet'),
    ).toHaveLength(0);
  });

  it('does not mark an idle queue when a full planet has no production capability', () => {
    const { game } = setup(
      Array.from({ length: 10 }, () => 'Research station'),
    );
    expect(game.planetOrders()[0]).toMatchObject({
      emptySites: 0,
      emptyQueues: 0,
    });
  });
});

describe('gemensam-planetko / sparat-spel / bevara-aldre-produktionskoer', () => {
  it('migrates separate legacy queues without losing or reversing their orders, fleets or stock', () => {
    const base = setup([
      'Colony ship factory',
      'Exploration ship factory',
    ]).game.exportState();
    const colony = base.colonies[0]![1];
    const order = (
      id: string,
      type: 'Colony ship' | 'Exploration ship' | 'Research station',
    ) => ({
      id,
      type,
      slotIndex: type === 'Research station' ? 3 : null,
      destinationFleetId: null,
      factoryId: null,
    });
    const legacy = {
      ...base,
      version: 2 as const,
      sequence: 10,
      colonies: [
        [
          base.colonies[0]![0],
          {
            ...colony,
            stock: { Iron: 20, Water: 20, Oil: 20 } as typeof colony.stock,
            projects: [order('project-6', 'Research station')],
            buildings: colony.buildings.map((building, index) => ({
              ...building,
              queue:
                index === 0
                  ? [
                      order('project-3', 'Colony ship'),
                      order('project-1', 'Colony ship'),
                    ]
                  : [order('project-2', 'Exploration ship')],
            })),
          },
        ],
      ] as typeof base.colonies,
    };
    const restored = Game.restore(legacy);
    expect(
      restored
        .planetSnapshot(restored.galaxy.homePlanet)!
        .projects.map((p) => p.id),
    ).toEqual(['project-2', 'project-3', 'project-1', 'project-6']);
    expect(restored.exportState().version).toBe(3);
    expect(restored.fleetSnapshots()).toEqual(
      Game.restore(base).fleetSnapshots(),
    );
    expect(
      restored.planetSnapshot(restored.galaxy.homePlanet)!.economy.stock,
    ).toMatchObject({
      Iron: 20,
      Water: 20,
      Oil: 20,
      'Rocket engine': 0,
      'Weapons module': 0,
    });
    const saved = restored.exportState();
    expect(Game.restore(saved).exportState()).toEqual(saved);
  });
});

describe('skeppsdelar / automatisk-resursforsorjning', () => {
  it('ships manufactured parts over a real trade route to a planet without component factories', () => {
    const base = setup(['Fighter factory']).game.exportState();
    const home = base.world.systems[0]!.planets[0]!;
    const destination = base.world.systems[0]!.planets[1]!;
    const colony = base.colonies[0]![1];
    const game = Game.restore({
      ...base,
      world: {
        ...base.world,
        systems: base.world.systems.map((system) => ({
          ...system,
          planets: system.planets.map((planet) =>
            planet.id === destination.id
              ? { ...planet, colony: { ownerId: 'player', population: 5000 } }
              : planet,
          ),
        })),
      },
      colonies: [
        [
          home.id,
          {
            ...colony,
            buildings: [],
            stock: { ...colony.stock, 'Rocket engine': 1, 'Weapons module': 1 },
          },
        ],
        [
          destination.id,
          { ...structuredClone(colony), population: 5000, homeFleetId: null },
        ],
      ],
      researched: [
        'Exploration ship factory',
        'Transport ship factory',
        'Trade logistics',
      ],
      fleets: [
        ...base.fleets,
        {
          ...base.fleets[0]!,
          id: 'freighters',
          name: 'Freighters',
          ships: {
            Fighter: 0,
            'Exploration ship': 0,
            'Colony ship': 0,
            'Transport ship': 1,
          },
        },
      ],
    });
    const target = game.galaxy.systems[0]!.planets[1]!;
    game.scheduleShip(target, 'Fighter');
    const route = game.createTradeRoute(home.id, target.id);
    game.assignTradeFleet(route, 'freighters');
    const frames = game.startTurn();
    expect(game.fleet('freighters')!.cargo).toMatchObject({
      'Rocket engine': 1,
      'Weapons module': 1,
    });
    for (const frame of frames) game.applyFrame(frame);
    game.finishTurn();
    expect(game.planetSnapshot(target)!.projects).toHaveLength(0);
    expect(
      game
        .fleetSnapshots()
        .find(
          (fleet) =>
            fleet.position?.key === target.position.key && fleet.ships.Fighter,
        )!.ships.Fighter,
    ).toBe(1);
    expect(game.planetSnapshot(target)!.economy.stock['Rocket engine']).toBe(0);
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.economy.stock[
        'Weapons module'
      ],
    ).toBe(0);
  });
});
