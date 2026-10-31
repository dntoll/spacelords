import { describe, expect, it } from 'vitest';
import { upgradeState } from '../fixtures/fleet-upgrades.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import {
  Game,
  engineCount,
  type ShipType,
} from '../../src/client/models/Game.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { finishYear } from '../fixtures/salvage.js';

describe('flottorder-upgrade / automatisk-uppgraderingsforsorjning / spara-flottuppgradering', () => {
  it.each<ShipType>([
    'Fighter',
    'Colony ship',
    'Transport ship',
    'Civilian shuttle',
    'Salvage ship',
    'Exploration ship',
  ])(
    'upgrades the exact engine count of a %s without changing its type or identity',
    (type) => {
      const state = upgradeState();
      state.colonies[0]![1].stock['Ion pulse engine'] = engineCount(type);
      const game = Game.restore({
        ...state,
        fleets: state.fleets.map((fleet) => ({
          ...fleet,
          ships: { ...fleet.ships, 'Exploration ship': 0, [type]: 1 },
          shipUnits: [
            {
              id: 'original-ship',
              type,
              ...(type === 'Exploration ship' ? { telescope: 3 as const } : {}),
              engines: {
                'Rocket engine': engineCount(type),
                'Ion pulse engine': 0,
              },
            },
          ],
        })),
      });
      game.upgradeFleet('fleet-home');
      finishYear(game);
      expect(game.fleet('fleet-home')!.shipUnits![0]).toMatchObject({
        id: 'original-ship',
        type,
        engines: { 'Rocket engine': 0, 'Ion pulse engine': engineCount(type) },
      });
      expect(
        game.planetSnapshot(game.galaxy.homePlanet)!.economy.stock[
          'Ion pulse engine'
        ],
      ).toBe(0);
    },
  );

  it('preserves recovered advanced equipment while upgrading older ships only to researched levels', () => {
    const state = upgradeState();
    state.colonies[0]![1].stock['Telescope II'] = 1;
    const game = Game.restore({
      ...state,
      researched: [
        ...state.researched.filter((tech) => tech !== 'Telescope III factory'),
        'Telescope II factory',
      ],
      fleets: state.fleets.map((fleet) => ({
        ...fleet,
        ships: { ...fleet.ships, 'Exploration ship': 2 },
        shipUnits: [
          ...fleet.shipUnits!,
          {
            id: 'recovered',
            type: 'Exploration ship',
            telescope: 3,
            engines: { 'Rocket engine': 0, 'Ion pulse engine': 2 },
          },
        ],
      })),
    });
    game.upgradeFleet('fleet-home');
    expect(game.fleet('fleet-home')!.upgrade!.targets).toHaveLength(1);
    finishYear(game);
    expect(
      game.fleet('fleet-home')!.shipUnits!.map((ship) => ship.telescope),
    ).toEqual([2, 3]);
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.economy.stock[
        'Telescope III'
      ],
    ).toBe(1);
  });

  it('chooses the nearest reachable suitable yard rather than the first ID', () => {
    const state = upgradeState();
    state.colonies[0]![1].buildings.push({
      id: 'far-facility',
      type: 'Orbital shipyard',
      slotIndex: 2,
      demolition: false,
    });
    const game = Game.restore({
      ...state,
      salvage: {
        ...state.salvage!,
        yards: [
          {
            ...state.salvage!.yards[0]!,
            id: 'a-far-yard',
            facilityId: 'far-facility',
            position: new HexCoordinate(5, 0),
          },
          ...state.salvage!.yards,
        ],
      },
    });
    game.upgradeFleet('fleet-home');
    expect(game.fleet('fleet-home')!.upgrade!.yardId).toBe('yard');
  });

  it('skips a nearer yard that cannot obtain parts and chooses a supplied yard on another planet', () => {
    const state = tradeNetworkState(false);
    const ready = upgradeState();
    state.colonies[0]![1].buildings = ready.colonies[0]![1].buildings;
    const source = state.colonies[1]![1];
    source.projects = [];
    source.stock['Ion pulse engine'] = 2;
    source.stock['Telescope III'] = 1;
    source.buildings = [
      {
        id: 'remote-yard',
        type: 'Orbital shipyard',
        slotIndex: 0,
        demolition: false,
      },
    ];
    const game = Game.restore({
      ...state,
      round: 2,
      researched: ready.researched,
      fleets: ready.fleets,
      salvage: {
        ...ready.salvage!,
        yards: [
          ...ready.salvage!.yards,
          {
            ...ready.salvage!.yards[0]!,
            id: 'supplied-yard',
            facilityId: 'remote-yard',
            planetId: 'sol-1',
            position: new HexCoordinate(0, 2),
          },
        ],
      },
    });
    game.upgradeFleet('fleet-home');
    expect(game.fleet('fleet-home')!.upgrade!.yardId).toBe('supplied-yard');
    expect(game.fleet('fleet-home')!.destination).toEqual(
      new HexCoordinate(0, 2),
    );
  });

  it('manufactures remote components and physically delivers them to the shipyard planet', () => {
    const state = tradeNetworkState();
    const ready = upgradeState();
    const home = state.colonies[0]![1];
    home.buildings = ready.colonies[0]![1].buildings;
    const source = state.colonies[1]![1];
    source.projects = [];
    source.population = 10_000;
    source.stock = { ...source.stock, Iron: 200, Water: 200, Oil: 200 };
    source.buildings = [
      {
        id: 'ion',
        type: 'Ion pulse engine factory',
        slotIndex: 0,
        demolition: false,
      },
      {
        id: 'telescope',
        type: 'Telescope III factory',
        slotIndex: 1,
        demolition: false,
      },
    ];
    const game = Game.restore({
      ...state,
      round: 2,
      researched: [...ready.researched, 'Trade logistics'],
      salvage: ready.salvage!,
      fleets: [
        ready.fleets[0]!,
        {
          ...state.fleets[1]!,
          routeId: 'route-test',
          position: state.world.systems[0]!.planets[1]!.position,
          destination: null,
        },
      ],
    });
    game.upgradeFleet('fleet-home');
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.economy.demand[
        'Ion pulse engine'
      ],
    ).toBe(2);
    expect(
      game
        .exportState()
        .colonies[1]![1].projects.map((project) => project.type),
    ).toEqual(['Ion pulse engine', 'Ion pulse engine', 'Telescope III']);
    finishYear(game);
    expect(game.fleet('fleet-home')!.upgrade).toBeDefined();
    expect(game.fleet('fleet-home')!.shipUnits![0]!.telescope).toBe(1);
    const restored = Game.restore(game.exportState());
    for (
      let year = 0;
      year < 8 && restored.fleet('fleet-home')!.upgrade;
      year++
    )
      finishYear(restored);
    expect(restored.fleet('fleet-home')!.shipUnits![0]).toMatchObject({
      telescope: 3,
      engines: { 'Ion pulse engine': 2 },
    });
    expect(restored.fleet('fleet-home')!.upgrade).toBeUndefined();
    expect(
      restored.events.some((event) =>
        /delivered[^\n]*1 Telescope III[^\n]*to Tellus/.test(event.text),
      ),
    ).toBe(true);
    expect(restored.exportState().componentOrders).toHaveLength(0);
    expect(
      restored.planetSnapshot(restored.galaxy.homePlanet)!.economy.demand[
        'Ion pulse engine'
      ],
    ).toBe(0);
  });

  it('never reserves the same equipment for two fleets', () => {
    const state = upgradeState();
    const game = Game.restore({
      ...state,
      fleets: [
        ...state.fleets,
        {
          ...state.fleets[0]!,
          id: 'second',
          name: 'Second',
          shipUnits: state.fleets[0]!.shipUnits!.map((ship) => ({
            ...ship,
            id: 'second-explorer',
          })),
        },
      ],
    });
    game.upgradeFleet('fleet-home');
    const before = game.exportState();
    expect(() => game.upgradeFleet('second')).toThrow(
      'No reachable working shipyard',
    );
    expect(game.exportState()).toEqual(before);
    finishYear(game);
    expect(game.fleet('second')!.shipUnits![0]!.telescope).toBe(1);
    expect(game.fleet('fleet-home')!.shipUnits![0]!.telescope).toBe(3);
  });

  it('retargets a destroyed shipyard without losing or duplicating reserved components', () => {
    const game = Game.restore(upgradeState());
    game.upgradeFleet('fleet-home');
    const checkpoint = game.exportState();
    checkpoint.colonies[0]![1].buildings.push({
      id: 'replacement',
      type: 'Orbital shipyard',
      slotIndex: 2,
      demolition: false,
    });
    const resumed = Game.restore({
      ...checkpoint,
      salvage: {
        ...checkpoint.salvage!,
        yards: [
          { ...checkpoint.salvage!.yards[0]!, destroyed: true },
          {
            ...checkpoint.salvage!.yards[0]!,
            id: 'replacement-yard',
            facilityId: 'replacement',
            position: new HexCoordinate(3, 1),
          },
        ],
      },
    });
    finishYear(resumed);
    expect(resumed.fleet('fleet-home')!.position).toEqual(
      new HexCoordinate(3, 1),
    );
    expect(resumed.fleet('fleet-home')!.shipUnits![0]!.telescope).toBe(3);
    expect(
      resumed.planetSnapshot(resumed.galaxy.homePlanet)!.economy.stock[
        'Ion pulse engine'
      ],
    ).toBe(0);
  });

  it('waits at a disabled yard and remains cancellable if no replacement exists', () => {
    const game = Game.restore(upgradeState());
    game.upgradeFleet('fleet-home');
    const checkpoint = game.exportState();
    const resumed = Game.restore({
      ...checkpoint,
      salvage: {
        ...checkpoint.salvage!,
        yards: checkpoint.salvage!.yards.map((yard) => ({
          ...yard,
          destroyed: true,
        })),
      },
    });
    finishYear(resumed);
    expect(resumed.fleet('fleet-home')!.upgrade!.issue).toContain(
      'No working shipyard',
    );
    expect(
      resumed.decisions.some(
        (decision) => decision.id === 'upgrade-fleet-home',
      ),
    ).toBe(true);
    resumed.clearDestination('fleet-home');
    expect(resumed.fleet('fleet-home')!.upgrade).toBeUndefined();
  });

  it('does not consume components while the shipyard is understaffed', () => {
    const state = upgradeState();
    state.colonies[0]![1].population = 100;
    const game = Game.restore(state);
    game.upgradeFleet('fleet-home');
    finishYear(game);
    expect(game.fleet('fleet-home')!.upgrade!.issue).toContain('workers');
    expect(game.fleet('fleet-home')!.shipUnits![0]!.telescope).toBe(1);
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.economy.stock[
        'Ion pulse engine'
      ],
    ).toBe(2);
  });

  it('reports a cancelled supplier project rather than silently waiting forever', () => {
    const state = upgradeState();
    const colony = state.colonies[0]![1];
    colony.stock['Ion pulse engine'] = 0;
    colony.buildings.push({
      id: 'ion',
      type: 'Ion pulse engine factory',
      slotIndex: 2,
      demolition: false,
    });
    const game = Game.restore(state);
    game.upgradeFleet('fleet-home');
    game.cancelProject(
      game.galaxy.homePlanet,
      game.fleet('fleet-home')!.upgrade!.productionIds[0]!,
    );
    finishYear(game);
    expect(game.fleet('fleet-home')!.upgrade!.issue).toContain('cancelled');
    expect(
      game.decisions.some((decision) => decision.id === 'upgrade-fleet-home'),
    ).toBe(true);
    game.clearDestination('fleet-home');
    expect(game.planetSnapshot(game.galaxy.homePlanet)!.projects).toHaveLength(
      0,
    );
  });

  it('rejects an invalid saved downgrade and incompatible saved route assignment', () => {
    const game = Game.restore(upgradeState());
    game.upgradeFleet('fleet-home');
    const checkpoint = game.exportState();
    expect(() =>
      Game.restore({
        ...checkpoint,
        fleets: checkpoint.fleets.map((fleet) => ({
          ...fleet,
          upgrade: {
            ...fleet.upgrade!,
            targets: [{ ...fleet.upgrade!.targets[0]!, telescope: 1 }],
          },
        })),
      }),
    ).toThrow('Invalid saved fleet upgrade');
    expect(() =>
      Game.restore({
        ...checkpoint,
        fleets: checkpoint.fleets.map((fleet) => ({
          ...fleet,
          routeId: 'route-test',
        })),
      }),
    ).toThrow('Invalid saved fleet upgrade');
  });

  it('travels to the nearest working shipyard and installs only improved components once', () => {
    const game = Game.restore(upgradeState());
    expect(game.fleet('fleet-home')!.upgradeable).toBe(true);
    game.upgradeFleet('fleet-home');
    expect(game.fleet('fleet-home')!.destination).toEqual(
      new HexCoordinate(2, 0),
    );
    expect(game.fleet('fleet-home')!.shipUnits![0]!.telescope).toBe(1);
    const restored = Game.restore(game.exportState());
    finishYear(restored);
    const fleet = restored.fleet('fleet-home')!;
    expect(fleet.shipUnits![0]).toMatchObject({
      id: 'explorer',
      telescope: 3,
      engines: { 'Rocket engine': 0, 'Ion pulse engine': 2 },
    });
    expect(fleet.upgrade).toBeUndefined();
    expect(fleet.upgradeable).toBe(false);
    expect(fleet.detectionRange).toBe(3);
    expect(fleet.speed).toBeGreaterThan(game.fleet('fleet-home')!.speed);
    const stock = restored.planetSnapshot(restored.galaxy.homePlanet)!.economy
      .stock;
    expect(stock['Ion pulse engine']).toBe(0);
    expect(stock['Telescope III']).toBe(0);
    expect(stock['Rocket engine']).toBe(2);
    expect(stock['Telescope I']).toBe(1);
    expect(
      restored.events.filter((event) => event.text.includes('upgraded')),
    ).toHaveLength(1);
    expect(
      restored.events.some((event) => event.text.includes('arrived')),
    ).toBe(false);
    finishYear(restored);
    expect(
      restored.events.filter((event) => event.text.includes('upgraded')),
    ).toHaveLength(1);
  });

  it('orders missing parts at the shipyard planet and waits for production without an idle-fleet decision', () => {
    const state = upgradeState();
    const colony = state.colonies[0]![1];
    colony.stock['Ion pulse engine'] = 0;
    colony.stock['Telescope III'] = 0;
    colony.buildings.push(
      {
        id: 'ion',
        type: 'Ion pulse engine factory',
        slotIndex: 2,
        demolition: false,
      },
      {
        id: 'telescope',
        type: 'Telescope III factory',
        slotIndex: 3,
        demolition: false,
      },
    );
    const game = Game.restore(state);
    game.upgradeFleet('fleet-home');
    expect(
      game
        .planetSnapshot(game.galaxy.homePlanet)!
        .projects.map((project) => project.type),
    ).toEqual(['Ion pulse engine', 'Ion pulse engine', 'Telescope III']);
    finishYear(game);
    expect(game.fleet('fleet-home')!.upgrade).toBeDefined();
    expect(game.fleet('fleet-home')!.shipUnits![0]!.telescope).toBe(1);
    expect(
      game.decisions.some(
        (decision) => decision.id === 'fleet-idle-fleet-home',
      ),
    ).toBe(false);
    const restored = Game.restore(game.exportState());
    finishYear(restored);
    finishYear(restored);
    expect(restored.fleet('fleet-home')!.shipUnits![0]!.telescope).toBe(3);
    expect(restored.fleet('fleet-home')!.upgrade).toBeUndefined();
  });

  it('cancels cleanly when replaced by a movement order without consuming components', () => {
    const game = Game.restore(upgradeState());
    game.upgradeFleet('fleet-home');
    game.setDestination('fleet-home', new HexCoordinate(4, 0));
    expect(game.fleet('fleet-home')!.upgrade).toBeUndefined();
    expect(game.exportState().componentOrders).toHaveLength(0);
    finishYear(game);
    expect(game.fleet('fleet-home')!.shipUnits![0]!.telescope).toBe(1);
    expect(
      game.planetSnapshot(game.galaxy.homePlanet)!.economy.stock[
        'Ion pulse engine'
      ],
    ).toBe(2);
  });

  it('rejects unavailable upgrades and never downgrades recovered equipment', () => {
    const state = upgradeState();
    const game = Game.restore({ ...state, researched: [] });
    expect(game.fleet('fleet-home')!.upgradeable).toBe(false);
    expect(() => game.upgradeFleet('fleet-home')).toThrow();
    const destroyed = Game.restore({
      ...state,
      salvage: {
        ...state.salvage!,
        yards: state.salvage!.yards.map((yard) => ({
          ...yard,
          destroyed: true,
        })),
      },
    });
    expect(() => destroyed.upgradeFleet('fleet-home')).toThrow();
    expect(destroyed.exportState().componentOrders).toHaveLength(0);
  });
});
