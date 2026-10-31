import { completeTacticalBattles } from '../fixtures/tactical-combat.js';
import { collectTurnFrames, turnFrames } from '../fixtures/turn-steps.js';
import { describe, expect, it } from 'vitest';
import { Logistics } from '../../src/client/models/Logistics.js';
import { Game, type GameState } from '../../src/client/models/Game.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';

const empty = {
  Fighter: 0,
  'Colony ship': 0,
  'Exploration ship': 0,
  'Transport ship': 0,
  'Civilian shuttle': 0,
  'Salvage ship': 0,
};
function turn(game: Game) {
  for (const frame of turnFrames(game)) game.applyFrame(frame);
  game.finishTurn();
}
function battle(fighters: number, pirates: number, civilians = 0) {
  const state = new Game(createExampleGalaxy()).exportState();
  return Game.restore({
    ...state,
    pirates: [
      {
        id: 'pirate-nadir',
        systemId: 'nadir',
        position: { q: 8, r: -3 },
        count: pirates,
      },
    ],
    fleets: [
      {
        ...state.fleets[0]!,
        position: { q: 8, r: -4 },
        shipUnits: [],
        ships: { ...empty, Fighter: fighters, 'Exploration ship': civilians },
      },
    ],
  });
}

describe('rymdpirater-per-stjarna / rymdpiraters-patrullering', () => {
  it('seeds exactly one pirate at every non-home star without mixing player fleets', () => {
    const game = new Game(createExampleGalaxy());
    expect(game.exportState().pirates).toEqual([
      {
        id: 'pirate-nadir',
        systemId: 'nadir',
        position: { q: 8, r: -3 },
        count: 1,
      },
      {
        id: 'pirate-aster',
        systemId: 'aster',
        position: { q: -5, r: 6 },
        count: 1,
      },
    ]);
    expect(game.fleetSnapshots()).toHaveLength(1);
    expect(game.pirateSnapshots()).toHaveLength(0);
  });
  it('patrols one adjacent ring hex each year, wraps, and reveals no terrain', () => {
    const game = new Game(createExampleGalaxy());
    const initial = game.exportState();
    let last = new HexCoordinate(8, -3);
    for (let year = 0; year < 6; year++) {
      turn(game);
      const pirate = game.exportState().pirates![0]!;
      const current = new HexCoordinate(pirate.position.q, pirate.position.r);
      expect(current.distanceTo(last)).toBe(1);
      expect(current.distanceTo(new HexCoordinate(7, -3))).toBe(1);
      last = current;
    }
    expect(game.exportState().pirates).toEqual(initial.pirates);
    expect(game.exportState().explored).toEqual(initial.explored);
  });
});

describe('flottstrid-per-hex', () => {
  it.each([
    [1, 1],
    [1, 2],
    [2, 2],
    [2, 3],
    [2, 5],
    [3, 4],
  ])(
    'gemensamt-stridsdeltagande: %i Fighters versus %i pirates preserves every survivor and wreck',
    (fighters, pirates) => {
      const game = battle(fighters, pirates);
      turn(game);
      const survivors = game.fleet('fleet-home')!.ships.Fighter;
      const enemySurvivors = game
        .exportState()
        .pirates!.reduce((sum, p) => sum + p.count, 0);
      expect(survivors === 0 || enemySurvivors === 0).toBe(true);
      expect(survivors + enemySurvivors + game.wrecks.length).toBe(
        fighters + pirates,
      );
      expect(game.fleet('fleet-home')!.shipUnits).toHaveLength(survivors);
      expect(
        game.events.filter((e) => e.text.startsWith('Combat at HEX')),
      ).toHaveLength(1);
      expect(Game.restore(game.exportState()).exportState()).toEqual(
        game.exportState(),
      );
    },
  );
  it('riktning-och-vapen: civilians participate as individual targets rather than automatic losses', () => {
    const game = battle(1, 2, 1);
    game.startTurn();
    for (let step = 0; !game.tacticalBattle && step < 20; step++) {
      if (game.phase === 'interrupted') game.continueTurn();
      game.applyFrame(game.nextTurnFrame()!);
    }
    expect(game.tacticalBattle).not.toBeNull();
    expect(game.fleet('fleet-home')!.ships['Exploration ship']).toBe(1);
    expect(
      game.tacticalBattle!.pieces.filter((p) => p.type === 'Exploration ship'),
    ).toHaveLength(1);
    completeTacticalBattles(game);
    expect(game.interruption!.battles).toHaveLength(1);
  });
  it('stops a destroyed fleet before subsequent planned steps and preserves its empty identity', () => {
    const game = battle(0, 1, 1);
    game.setDestination('fleet-home', new HexCoordinate(9, -4));
    // The pirate and explorer arrive at the explorer's first destination together.
    const state = game.exportState();
    const moving = Game.restore({
      ...state,
      fleets: state.fleets.map((f) => ({
        ...f,
        position: { q: 7, r: -4 },
        destination: { q: 10, r: -4 },
      })),
    });
    const frames = collectTurnFrames(moving);
    expect(
      frames
        .flatMap((f) => f.movements)
        .filter((m) => m.fleetId === 'fleet-home'),
    ).toHaveLength(1);

    moving.finishTurn();
    expect(moving.fleet('fleet-home')).toMatchObject({
      position: null,
      destination: null,
    });
    expect(moving.fleet('fleet-home')!.ships['Exploration ship']).toBe(0);
  });
  it('gemensamt-stridsdeltagande: pools escorts while retaining both fleet identities', () => {
    const state = battle(1, 3, 1).exportState();
    const first = state.fleets[0]!;
    const game = Game.restore({
      ...state,
      fleets: [
        { ...first, id: 'b', name: 'B' },
        { ...first, id: 'a', name: 'A', shipUnits: [] },
      ],
    });
    turn(game);
    expect(game.fleet('a')).not.toBeNull();
    expect(game.fleet('b')).not.toBeNull();
    expect(game.exportState().pirates).toEqual([]);
    const reports = game.events.filter((e) =>
      e.text.startsWith('Combat at HEX'),
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.text).toContain('A');
    expect(reports[0]!.text).toContain('B');
  });
  it('does not fight fleets that swap hexes in the same movement step', () => {
    const state = battle(0, 1, 1).exportState();
    const game = Game.restore({
      ...state,
      fleets: state.fleets.map((f) => ({ ...f, destination: { q: 8, r: -3 } })),
    });
    turn(game);
    expect(game.fleet('fleet-home')!.ships['Exploration ship']).toBe(1);
    expect(game.events.some((e) => e.text.startsWith('Combat at HEX'))).toBe(
      false,
    );
  });
});

describe('rymdpiraters-sparning', () => {
  it.each([2, 3, 4, 5, 6] as const)(
    'loads version %i without introducing pirates and preserves defeated pirates on reload',
    (version) => {
      const state = new Game(createExampleGalaxy()).exportState();
      const old: GameState = { ...state, version };
      delete (old as { pirates?: unknown }).pirates;
      const restored = Game.restore(old);
      expect(restored.exportState().pirates).toEqual([]);
      const game = battle(1, 1);
      turn(game);
      const saved = game.exportState();
      const loaded = Game.restore(
        JSON.parse(JSON.stringify(saved)) as GameState,
      );
      expect(loaded.exportState()).toEqual(saved);
      turn(loaded);
      expect(loaded.exportState().pirates).toEqual([]);
    },
  );
});

describe('flottstrid-per-hex / handelsnatverk', () => {
  it('destroys loaded cargo before unloading and releases its material reservation', () => {
    const state = tradeNetworkState();
    const game = Game.restore({
      ...state,
      pirates: [
        {
          id: 'pirate-test',
          systemId: 'sol',
          position: { q: -1, r: 1 },
          count: 1,
        },
      ],
      fleets: [
        {
          ...state.fleets[0]!,
          id: 'carrier',
          name: 'Carrier',
          position: { q: 0, r: 0 },
          destination: { q: 0, r: 1 },
          routeId: 'route-test',
          shipUnits: [],
          ships: { ...empty, 'Transport ship': 1 },
        },
      ],
      shipments: [
        {
          id: 'lost-iron',
          resource: 'Iron',
          amount: 10,
          path: ['sol-0', 'sol-1'],
          stage: 0,
          projectId: 'vesta-mine',
          recipient: 'sol-1',
          fleetId: 'carrier',
          committed: true,
        },
      ],
    });
    const iron = game.planetSnapshot(game.galaxy.systems[0]!.planets[1]!)!
      .economy.stock.Iron;
    turn(game);
    expect(game.exportState().shipments).toEqual([]);
    expect(game.fleet('carrier')).toMatchObject({
      position: null,
      routeId: undefined,
    });
    expect(
      game.planetSnapshot(game.galaxy.systems[0]!.planets[1]!)!.economy.stock
        .Iron,
    ).toBe(iron);
    expect(
      game.planetSnapshot(game.galaxy.systems[0]!.planets[1]!)!.projects,
    ).toHaveLength(1);
    const saved = game.exportState();
    const replacement = Game.restore({
      ...saved,
      fleets: [
        ...saved.fleets,
        {
          ...saved.fleets[0]!,
          id: 'replacement',
          name: 'Replacement',
          position: { q: 1, r: 0 },
          destination: null,
          routeId: 'route-test',
          shipUnits: [],
          ships: { ...empty, 'Transport ship': 1 },
        },
      ],
    });
    turn(replacement);
    const target = replacement.planetSnapshot(
      replacement.galaxy.systems[0]!.planets[1]!,
    )!;
    expect(target.projects).toHaveLength(0);
    expect(
      target.buildings.some((building) => building.type === 'Iron mine'),
    ).toBe(true);
    expect(replacement.fleet('replacement')!.ships['Transport ship']).toBe(1);
  });
  it('gemensamt-stridsdeltagande: fights together before merging reinforcements at their meeting hex', () => {
    const state = battle(1, 3).exportState();
    const fleet = state.fleets[0]!;
    const game = Game.restore({
      ...state,
      fleets: [
        {
          ...fleet,
          id: 'a',
          name: 'Incoming',
          shipUnits: [],
          position: { q: 7, r: -4 },
          destination: { q: 8, r: -4 },
          joinFleetId: 'b',
        },
        { ...fleet, id: 'b', name: 'Target', ships: { ...fleet.ships } },
      ],
    });
    turn(game);
    expect(game.fleet('a')).toBeNull();
    expect(game.fleet('b')!.ships.Fighter).toBeGreaterThan(0);
    expect(game.exportState().pirates).toEqual([]);
    expect(
      game.events.filter((event) => event.text.startsWith('Combat at HEX')),
    ).toHaveLength(1);
  });
});

describe('flottstrid-per-hex / motorbehov-for-alla-skepp', () => {
  it('retains surviving ship equipment and the original strategic travel budget', () => {
    const state = battle(2, 2).exportState();
    const game = Game.restore({
      ...state,
      fleets: [
        {
          ...state.fleets[0]!,
          position: { q: 7, r: -4 },
          destination: { q: 10, r: -4 },
          ships: { ...empty, Fighter: 2, 'Transport ship': 1 },
          shipUnits: [
            {
              id: 'a',
              type: 'Fighter',
              engines: { 'Rocket engine': 1, 'Ion pulse engine': 0 },
            },
            {
              id: 'b',
              type: 'Fighter',
              engines: { 'Rocket engine': 0, 'Ion pulse engine': 1 },
            },
            {
              id: 't',
              type: 'Transport ship',
              engines: { 'Rocket engine': 1, 'Ion pulse engine': 0 },
            },
          ],
        },
      ],
    });
    const before = game.exportState();
    game.startTurn();
    const frames = turnFrames(game, false);
    expect(game.fleet('fleet-home')!.ships.Fighter).toBe(2);
    expect(game.fleet('fleet-home')!.shipUnits).toEqual(
      before.fleets[0]!.shipUnits,
    );
    for (const frame of frames) game.applyFrame(frame);
    game.finishTurn();
    expect(game.fleet('fleet-home')!.position?.key).toBe('9,-4');
    for (const unit of game.fleet('fleet-home')!.shipUnits!)
      expect(before.fleets[0]!.shipUnits).toContainEqual(unit);
  });
});

describe('rymdpirater-per-stjarna / lokal-sikt', () => {
  it('aktuell-detektionssikt: shows only pirates in current sight and never accepts player orders for them', () => {
    const initial = new Game(createExampleGalaxy()).exportState();
    const game = Game.restore({
      ...initial,
      explored: [...initial.explored, '8,-3'],
      fleets: [
        {
          ...initial.fleets[0]!,
          position: { q: 8, r: -3 },
          ships: {
            'Exploration ship': 0,
            Fighter: 1,
            'Colony ship': 0,
            'Transport ship': 0,
            'Civilian shuttle': 0,
            'Salvage ship': 0,
          },
          shipUnits: [],
        },
      ],
    });
    expect(game.pirateSnapshots()).toHaveLength(1);
    expect(Object.isFrozen(game.pirateSnapshots())).toBe(true);
    const before = game.exportState();
    expect(() =>
      game.setDestination('pirate-nadir', new HexCoordinate(1, 0)),
    ).toThrow();
    expect(() =>
      game.transferShips('fleet-home', 'Fighter', 1, 'pirate-nadir'),
    ).toThrow();
    expect(game.exportState()).toEqual(before);
    turn(game);
    expect(game.pirateSnapshots()).toEqual([]);
    expect(game.exportState().explored).toEqual(before.explored);
  });
  it('does not attack other pirate fleets sharing a patrol hex', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    const pirate = state.pirates![0]!;
    const game = Game.restore({
      ...state,
      pirates: [pirate, { ...pirate, id: 'second-pirate' }],
    });
    turn(game);
    expect(game.exportState().pirates!.map((pirate) => pirate.count)).toEqual([
      1, 1,
    ]);
    expect(
      game.events.some((event) => event.text.startsWith('Combat at HEX')),
    ).toBe(false);
  });
});

describe('flottstrid-per-hex / automatiska-delorder', () => {
  it('releases lost component orders while preserving shipments on other carriers', () => {
    const order = {
      id: 'lost-order',
      projectId: 'ship',
      recipient: 'target',
      source: 'source',
      location: 'source',
      component: 'Rocket engine' as const,
      amount: 1,
      productionProjectId: null,
      shipmentId: 'lost',
      delivered: false,
      committed: true,
    };
    const shipment = {
      id: 'lost',
      resource: 'Rocket engine' as const,
      amount: 1,
      path: ['source', 'target'],
      stage: 0,
      projectId: 'ship',
      recipient: 'target',
      fleetId: 'lost-carrier',
      componentOrderId: order.id,
      committed: true,
    };
    const safeOrder = { ...order, id: 'safe-order', shipmentId: 'safe' };
    const safeShipment = {
      ...shipment,
      id: 'safe',
      fleetId: 'safe-carrier',
      componentOrderId: safeOrder.id,
    };
    const logistics = new Logistics(
      [],
      [shipment, safeShipment],
      [order, safeOrder],
    );
    logistics.destroyCargo('lost-carrier');
    expect(logistics.shipments).toEqual([safeShipment]);
    expect(logistics.componentOrders).toEqual([safeOrder]);
  });
});

describe('flottstrid-per-hex / skepp-till-rorlig-flotta', () => {
  it('cancels pursuit when pirates destroy its target without advancing the follower again', () => {
    const state = battle(0, 1, 1).exportState();
    const game = Game.restore({
      ...state,
      fleets: [
        ...state.fleets,
        {
          ...state.fleets[0]!,
          id: 'follower',
          name: 'Follower',
          position: { q: 6, r: -4 },
          destination: { q: 8, r: -4 },
          joinFleetId: 'fleet-home',
          shipUnits: [],
          ships: { ...empty, Fighter: 1 },
        },
      ],
    });
    turn(game);
    expect(game.fleet('fleet-home')!.position).toBeNull();
    expect(game.fleet('follower')).toMatchObject({
      position: new HexCoordinate(7, -4),
      destination: null,
      joinFleetId: undefined,
    });
    expect(game.fleet('follower')!.ships.Fighter).toBe(1);
    expect(
      game.events.some((event) =>
        event.text.includes('reinforcement target unavailable'),
      ),
    ).toBe(true);
  });
});
