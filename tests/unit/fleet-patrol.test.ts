import { describe, expect, it } from 'vitest';
import { Game, type GameState } from '../../src/client/models/Game.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { collectTurnFrames } from '../fixtures/turn-steps.js';
import {
  FleetPatrol,
  type PatrolOrder,
} from '../../src/client/models/FleetPatrol.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';

const hex = (q: number, r: number) => new HexCoordinate(q, r);
const empty = {
  Fighter: 0,
  'Exploration ship': 0,
  'Transport ship': 0,
  'Colony ship': 0,
  'Civilian shuttle': 0,
  'Salvage ship': 0,
};
function setup(position = hex(1, 0), ion = false, transport = false) {
  const state = new Game(createExampleGalaxy()).exportState();
  return Game.restore({
    ...state,
    researched: ['Fleet patrol', 'Automated exploration'],
    pirates: [],
    fleets: [
      {
        ...state.fleets[0]!,
        position,
        ships: { ...empty, Fighter: 1, 'Transport ship': Number(transport) },
        shipUnits: [
          {
            id: 'fighter',
            type: 'Fighter',
            engines: {
              'Rocket engine': Number(!ion),
              'Ion pulse engine': Number(ion),
            },
          },
          ...(transport
            ? [
                {
                  id: 'transport',
                  type: 'Transport ship' as const,
                  engines: { 'Rocket engine': 1, 'Ion pulse engine': 0 },
                },
              ]
            : []),
        ],
      },
    ],
  });
}
function turn(game: Game) {
  const movements = collectTurnFrames(game).flatMap((frame) => frame.movements);
  game.finishTurn();
  return movements.filter((movement) => movement.fleetId === 'fleet-home');
}
function withPirate(game: Game, position: HexCoordinate, visible = true) {
  const state = game.exportState();
  return Game.restore({
    ...state,
    pirates: [{ id: 'pirate-nadir', systemId: 'nadir', position, count: 1 }],
    fleets: [
      ...state.fleets,
      ...(visible
        ? [
            {
              ...state.fleets[0]!,
              id: 'observer',
              name: 'Observer',
              position,
              ships: { ...empty, 'Exploration ship': 1 },
              shipUnits: [
                {
                  id: 'observer-ship',
                  type: 'Exploration ship' as const,
                  telescope: 3 as const,
                  engines: { 'Rocket engine': 2, 'Ion pulse engine': 0 },
                },
              ],
            },
          ]
        : []),
    ],
  });
}

describe('flottpatrullering', () => {
  it('circles the fixed center in neighbor order over multiple years without idle decisions', () => {
    const game = setup(hex(3, 0));
    const center = game.fleet('fleet-home')!.position!;
    game.setPatrol('fleet-home');
    expect(
      game.decisions.some((item) => item.id === 'fleet-idle-fleet-home'),
    ).toBe(false);
    const visited = [...turn(game), ...turn(game), ...turn(game)].map(
      (step) => step.to.key,
    );
    const ring = center.neighbors().map((point) => point.key);
    expect(visited).toEqual([...ring, ...ring.slice(0, 3)]);
    expect(game.fleet('fleet-home')!.patrol?.center).toEqual(center);
  });

  it.each([
    [false, false, 3],
    [true, false, 4],
    [true, true, 2],
  ] as const)(
    'uses effective fleet speed as range (ion=%s, transport=%s)',
    (ion, transport, range) => {
      const game = setup(hex(4, -3), ion, transport);
      game.setPatrol('fleet-home');
      expect(game.fleet('fleet-home')!.patrol?.range).toBe(range);
      expect(turn(game)).toHaveLength(range);
    },
  );

  it('chases a moving pirate at the range boundary using shared sight and fights as one fleet', () => {
    const game = withPirate(setup(hex(5, -3), false, true), hex(7, -4));
    game.setPatrol('fleet-home');
    expect(game.fleet('fleet-home')!.patrol?.targetPirateId).toBe(
      'pirate-nadir',
    );
    expect(game.fleet('fleet-home')!.detectionRange).toBe(0);
    const steps = turn(game);
    expect(steps[0]!.to.distanceTo(hex(7, -4))).toBe(1);
    expect(game.exportState().pirates).toEqual([]);
    expect(game.fleet('fleet-home')!.ships['Transport ship']).toBe(1);
    expect(game.fleet('fleet-home')!.patrol?.center).toEqual(hex(5, -3));
    turn(game);
    expect(game.fleet('fleet-home')!.position!.distanceTo(hex(5, -3))).toBe(1);
  });

  it('does not use invisible or out-of-range pirate positions', () => {
    for (const game of [
      withPirate(setup(hex(5, -3)), hex(7, -4), false),
      withPirate(setup(hex(2, -3)), hex(7, -4)),
    ]) {
      game.setPatrol('fleet-home');
      expect(game.fleet('fleet-home')!.patrol?.targetPirateId).toBeUndefined();
      expect(game.fleet('fleet-home')!.destination).toEqual(
        game.fleet('fleet-home')!.position!.neighbors()[0],
      );
    }
  });

  it('drops a contact lost on reload and returns to its original ring', () => {
    const game = withPirate(setup(hex(5, -3)), hex(7, -4));
    game.setPatrol('fleet-home');
    const state = game.exportState();
    const restored = Game.restore({
      ...state,
      fleets: state.fleets.filter((fleet) => fleet.id !== 'observer'),
    });
    restored.startTurn();
    const first = restored.nextTurnFrame()!;
    expect(
      restored.fleet('fleet-home')!.patrol?.targetPirateId,
    ).toBeUndefined();
    expect(
      first.movements.find((movement) => movement.fleetId === 'fleet-home')!.to,
    ).toEqual(hex(6, -3));
  });

  it('survives reload with identical remaining movement during an interrupted year', () => {
    const game = Game.restore({ ...setup().exportState(), knownObjects: [] });
    game.setPatrol('fleet-home');
    game.startTurn();
    game.applyFrame(game.nextTurnFrame()!);
    expect(game.phase).toBe('interrupted');
    const state = game.exportState();
    const restored = Game.restore(
      JSON.parse(JSON.stringify(state)) as GameState,
    );
    expect(restored.fleet('fleet-home')!.patrol).toEqual(
      game.fleet('fleet-home')!.patrol,
    );
    expect(restored.fleet('fleet-home')!.remainingMovement).toBe(2);
    restored.continueTurn();
    game.continueTurn();
    expect(collectTurnFrames(restored, false)).toEqual(
      collectTurnFrames(game, false),
    );
    expect(restored.fleet('fleet-home')!.position).toEqual(
      game.fleet('fleet-home')!.position,
    );
  });

  it('cancels on manual orders and the last Fighter transfer without assigning Patrol to the new group', () => {
    const game = setup(hex(1, 0), false, true);
    game.setPatrol('fleet-home');
    game.setDestination('fleet-home', hex(5, 0));
    expect(game.fleet('fleet-home')!.patrol).toBeUndefined();
    game.setPatrol('fleet-home');
    game.clearDestination('fleet-home');
    expect(game.fleet('fleet-home')!.destination).toBeNull();
    expect(game.fleet('fleet-home')!.patrol).toBeUndefined();
    game.setPatrol('fleet-home');
    const group = game.transferShips('fleet-home', 'Fighter', 1, null);
    expect(group.patrol).toBeUndefined();
    expect(game.fleet('fleet-home')!.patrol).toBeUndefined();
    expect(game.fleet('fleet-home')!.destination).toBeNull();
    expect(() => game.setPatrol('fleet-home')).toThrow('Fighter');
  });

  it('keeps all steps on the map at the boundary and preserves older saves', () => {
    const game = setup(hex(10, 0));
    game.setPatrol('fleet-home');
    const steps = [...turn(game), ...turn(game), ...turn(game)];
    expect(steps).toHaveLength(9);
    for (const step of steps) {
      expect(game.galaxy.cellAt(step.to)).toBeTruthy();
      expect(step.from.distanceTo(step.to)).toBe(1);
    }
    const state = setup().exportState();
    expect(
      Game.restore({ ...state, version: 10 }).fleet('fleet-home')!.patrol,
    ).toBeUndefined();
  });

  it('keeps a valid target, selects nearest with stable ties, and drops targets leaving movement range', () => {
    const order: PatrolOrder = { center: hex(0, 0), nextIndex: 0 };
    const contacts = [
      { id: 'b', position: hex(2, 0) },
      { id: 'a', position: hex(0, 2) },
    ];
    expect(
      FleetPatrol.destination(order, hex(0, 0), 2, contacts, () => true),
    ).toEqual(hex(0, 2));
    contacts.push({ id: 'c', position: hex(1, 0) });
    FleetPatrol.destination(order, hex(0, 0), 2, contacts, () => true);
    expect(order.targetPirateId).toBe('a');
    FleetPatrol.destination(order, hex(0, 0), 1, contacts, () => true);
    expect(order.targetPirateId).toBe('c');
    FleetPatrol.destination(order, hex(-5, 0), 1, contacts, () => true);
    expect(order.targetPirateId).toBeUndefined();
    expect(order.center).toEqual(hex(0, 0));
  });

  it('ends Patrol after combat removes its last Fighter while civilians survive', () => {
    const first = withPirate(setup(hex(5, -3), false, true), hex(7, -4));
    const state = first.exportState();
    const game = Game.restore({
      ...state,
      pirates: state.pirates!.map((pirate) => ({ ...pirate, count: 2 })),
    });
    game.setPatrol('fleet-home');
    turn(game);
    expect(game.fleet('fleet-home')!.ships).toMatchObject({
      Fighter: 0,
      'Transport ship': 1,
    });
    expect(game.fleet('fleet-home')!.patrol).toBeUndefined();
    expect(game.fleet('fleet-home')!.destination).toBeNull();
  });

  it('replaces Explore and is replaced by Explore or a trade route', () => {
    const game = Game.restore(tradeNetworkState());
    game.transferShips('freighters', 'Transport ship', 1, 'fleet-home');
    game.setExploration('fleet-home', 'explore');
    game.setPatrol('fleet-home');
    expect(game.fleet('fleet-home')!.exploration).toBeUndefined();
    game.setExploration('fleet-home', 'explore-stars');
    expect(game.fleet('fleet-home')!.patrol).toBeUndefined();
    game.setPatrol('fleet-home');
    game.assignTradeFleet('route-test', 'fleet-home');
    expect(game.fleet('fleet-home')!.patrol).toBeUndefined();
    expect(() => game.setPatrol('fleet-home')).toThrow('trade route');
  });

  it('preserves a receiving patrol when reinforcement joins and does not reset its center on repeated activation', () => {
    const game = setup(hex(1, 0), true);
    const group = game.transferShips('fleet-home', 'Fighter', 1, null);
    game.transferShips(group.id, 'Fighter', 1, 'fleet-home');
    game.setPatrol('fleet-home');
    turn(game);
    const before = game.fleet('fleet-home')!.patrol;
    game.setPatrol('fleet-home');
    expect(game.fleet('fleet-home')!.patrol).toEqual(before);
    // A remote reinforcement group keeps its own physical travel order.
    const state = game.exportState();
    const incoming = { ...structuredClone(state.fleets[0]!) };
    incoming.id = 'reinforcement';
    incoming.name = 'Reinforcement';
    incoming.position = { q: 1, r: 0 };
    incoming.destination = state.fleets[0]!.position;
    incoming.joinFleetId = 'fleet-home';
    delete incoming.patrol;
    incoming.shipUnits = incoming.shipUnits!.map((unit) => ({
      ...unit,
      id: `incoming-${unit.id}`,
    }));
    const reinforced = Game.restore({
      ...state,
      fleets: [...state.fleets, incoming],
    });
    for (let year = 0; year < 3 && reinforced.fleet('reinforcement'); year++)
      turn(reinforced);
    expect(reinforced.fleet('reinforcement')).toBeNull();
    expect(reinforced.fleet('fleet-home')!.ships.Fighter).toBe(2);
    expect(reinforced.fleet('fleet-home')!.patrol?.center).toEqual(hex(1, 0));
  });

  it('accepts Patrol during Handle without refunding movement and resolves pending combat first', () => {
    const game = Game.restore({ ...setup().exportState(), knownObjects: [] });
    game.setDestination('fleet-home', hex(5, 0));
    game.startTurn();
    game.applyFrame(game.nextTurnFrame()!);
    expect(game.phase).toBe('interrupted');
    expect(() => game.setPatrol('fleet-home')).toThrow('Orders are only');
    game.handleDiscoveries();
    game.allowOtherFleetOrders();
    game.setPatrol('fleet-home');
    expect(game.fleet('fleet-home')!.patrol?.center).toEqual(hex(2, 0));
    expect(game.fleet('fleet-home')!.remainingMovement).toBe(2);
    game.continueTurn();
    const combat = game.nextTurnFrame()!;
    expect(combat.movements).toEqual([]);
    expect(combat.combats).toBeDefined();
    game.applyFrame(combat);
    expect(
      collectTurnFrames(game, false)
        .flatMap((frame) => frame.movements)
        .filter((move) => move.fleetId === 'fleet-home'),
    ).toHaveLength(2);
  });

  it('preserves the patrol and remaining budget through a saved combat report', () => {
    const game = withPirate(setup(hex(5, -3)), hex(7, -4));
    game.setPatrol('fleet-home');
    game.startTurn();
    for (let step = 0; step < 12; step++) {
      game.applyFrame(game.nextTurnFrame()!);
      if (game.phase === 'interrupted') {
        if (game.interruption!.battles?.length) break;
        game.continueTurn();
      }
    }
    expect(game.interruption!.battles).toHaveLength(1);
    const restored = Game.restore(
      JSON.parse(JSON.stringify(game.exportState())) as GameState,
    );
    expect(
      restored.fleet('fleet-home')!.patrol?.targetPirateId,
    ).toBeUndefined();
    expect(restored.fleet('fleet-home')!.remainingMovement).toBe(2);
    restored.continueTurn();
    game.continueTurn();
    expect(collectTurnFrames(restored, false)).toEqual(
      collectTurnFrames(game, false),
    );
    restored.finishTurn();
    game.finishTurn();
    expect(restored.exportState()).toEqual(game.exportState());
  });

  it('rejects malformed saved orders and a Patrol fleet without Fighters', () => {
    const game = setup();
    game.setPatrol('fleet-home');
    const state = game.exportState();
    for (const patrol of [
      { center: hex(11, 0), nextIndex: 0 },
      { center: hex(1, 0), nextIndex: 6 },
      { center: { q: 0.5, r: 0 }, nextIndex: 0 },
      { center: hex(1, 0), nextIndex: 0, targetPirateId: '' },
    ]) {
      expect(() =>
        Game.restore({
          ...state,
          fleets: state.fleets.map((fleet) => ({ ...fleet, patrol })),
        }),
      ).toThrow('Patrol');
    }
    expect(() =>
      Game.restore({
        ...state,
        fleets: state.fleets.map((fleet) => ({
          ...fleet,
          ships: { ...empty, 'Transport ship': 1 },
        })),
      }),
    ).toThrow('Patrol');
  });
});
