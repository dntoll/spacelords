import { turnFrames } from '../fixtures/turn-steps.js';
import { describe, expect, it } from 'vitest';
import { Game, type ShipType } from '../../src/client/models/Game.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';

function setup(
  sourceShip: ShipType = 'Fighter',
  targetShip: ShipType = 'Transport ship',
) {
  const state = new Game(createExampleGalaxy()).exportState();
  const base = state.fleets[0]!;
  const ships = {
    Fighter: 0,
    'Exploration ship': 0,
    'Colony ship': 0,
    'Transport ship': 0,
    'Salvage ship': 0,
  };
  return Game.restore({
    ...state,
    fleets: [
      { ...base, ships: { ...ships, [sourceShip]: 1 } },
      {
        ...base,
        id: 'target',
        name: 'Target Fleet',
        position: { q: 7, r: 0 },
        ships: { ...ships, [targetShip]: 1 },
      },
    ],
  });
}

function turn(game: Game) {
  for (const frame of turnFrames(game)) game.applyFrame(frame);
  game.finishTurn();
}

function reinforcement(game: Game) {
  return game.fleetSnapshots().find((fleet) => fleet.joinFleetId)!;
}

describe('skepp-till-rorlig-flotta', () => {
  it('rejects cyclic saved orders before they can duplicate or lose ships', () => {
    const state = setup().exportState();
    expect(() =>
      Game.restore({
        ...state,
        fleets: state.fleets.map((fleet) => ({
          ...fleet,
          joinFleetId: fleet.id === 'target' ? 'fleet-home' : 'target',
        })),
      }),
    ).toThrow('cycle');
  });
  it('sends physical ships, persists their order and joins only after reaching the target', () => {
    const game = setup();
    game.transferShips('fleet-home', 'Fighter', 1, 'target');
    expect(game.fleet('fleet-home')!.ships.Fighter).toBe(0);
    expect(game.fleet('target')!.ships.Fighter).toBe(0);
    expect(reinforcement(game)).toMatchObject({
      joinFleetId: 'target',
      position: new HexCoordinate(1, 0),
      ships: { Fighter: 1 },
    });
    const group = reinforcement(game).id;
    expect(game.decisions.some((decision) => decision.fleetId === group)).toBe(
      false,
    );
    turn(game);
    expect(game.fleet(group)!.position?.key).toBe('4,0');
    expect(game.fleet('target')!.ships.Fighter).toBe(0);
    const restored = Game.restore(
      JSON.parse(JSON.stringify(game.exportState())) as ReturnType<
        Game['exportState']
      >,
    );
    turn(game);
    turn(restored);
    expect(game.fleet(group)).toBeNull();
    expect(game.fleet('target')!.ships.Fighter).toBe(1);
    expect(restored.exportState()).toEqual(game.exportState());
    expect(
      game.events.some((event) => event.text.includes('joined Target Fleet')),
    ).toBe(true);
  });

  it('follows changes to the moving target rather than its old position', () => {
    const game = setup();
    game.setDestination('target', new HexCoordinate(10, 0));
    game.transferShips('fleet-home', 'Fighter', 1, 'target');
    turn(game);
    expect(game.fleet('target')!.position?.key).toBe('9,0');
    expect(reinforcement(game).position?.key).toBe('4,0');
    game.setDestination('target', new HexCoordinate(0, 0));
    turn(game);
    expect(game.fleet('target')!.position?.key).toBe('7,0');
    expect(game.fleet('target')!.ships.Fighter).toBe(1);
    expect(reinforcement(game)).toBeUndefined();
  });

  it('does not give slower incoming ships extra movement after joining mid-turn', () => {
    const game = setup('Transport ship', 'Exploration ship');
    game.setDestination('target', new HexCoordinate(1, 0));
    game.transferShips('fleet-home', 'Transport ship', 1, 'target');
    turn(game);
    expect(game.fleet('target')!.ships['Transport ship']).toBe(1);
    expect(game.fleet('target')!.position?.key).toBe('3,0');
    expect(game.fleet('target')!.speed).toBe(2);
    turn(game);
    expect(game.fleet('target')!.position?.key).toBe('1,0');
  });

  it('can cancel or replace pursuit with manual orders without losing ships', () => {
    const game = setup();
    game.transferShips('fleet-home', 'Fighter', 1, 'target');
    const group = reinforcement(game).id;
    game.clearDestination(group);
    expect(game.fleet(group)!.joinFleetId).toBeUndefined();
    expect(game.fleet(group)!.destination).toBeNull();
    expect(game.decisions.some((decision) => decision.fleetId === group)).toBe(
      true,
    );
    game.transferShips(group, 'Fighter', 1, 'target');
    const next = reinforcement(game).id;
    game.setDestination(next, new HexCoordinate(0, 1));
    expect(game.fleet(next)!.joinFleetId).toBeUndefined();
    turn(game);
    expect(game.fleet(next)!.position?.key).toBe('0,1');
    expect(game.fleet('target')!.ships.Fighter).toBe(0);
  });

  it('stops at its real location when the target becomes empty or is deleted', () => {
    const game = setup();
    game.transferShips('fleet-home', 'Fighter', 1, 'target');
    const group = reinforcement(game).id;
    turn(game);
    const position = game.fleet(group)!.position;
    game.transferShips('target', 'Transport ship', 1, null);
    game.deleteFleet('target');
    expect(game.fleet(group)).toMatchObject({
      position,
      destination: null,
      ships: { Fighter: 1 },
    });
    expect(game.fleet(group)!.joinFleetId).toBeUndefined();
    expect(game.decisions.some((decision) => decision.fleetId === group)).toBe(
      true,
    );
  });

  it('preserves a partial source fleet and rejects self-transfers without mutation', () => {
    const initial = setup().exportState();
    const game = Game.restore({
      ...initial,
      fleets: initial.fleets.map((fleet) =>
        fleet.id === 'fleet-home'
          ? { ...fleet, ships: { ...fleet.ships, Fighter: 2 } }
          : fleet,
      ),
    });
    const before = game.exportState();
    expect(() =>
      game.transferShips('fleet-home', 'Fighter', 1, 'fleet-home'),
    ).toThrow('another fleet');
    expect(game.exportState()).toEqual(before);
    game.transferShips('fleet-home', 'Fighter', 1, 'target');
    expect(game.fleet('fleet-home')!.ships.Fighter).toBe(1);
    expect(reinforcement(game).ships.Fighter).toBe(1);
  });

  it('keeps slower reinforcements separate while a faster target moves away', () => {
    const game = setup('Transport ship', 'Exploration ship');
    game.setDestination('target', new HexCoordinate(10, 0));
    game.transferShips('fleet-home', 'Transport ship', 1, 'target');
    turn(game);
    expect(reinforcement(game).position?.key).toBe('3,0');
    expect(game.fleet('target')!.position?.key).toBe('10,0');
    expect(game.fleet('target')!.ships['Transport ship']).toBe(0);
    for (let year = 0; year < 4; year++) turn(game);
    expect(reinforcement(game)).toBeUndefined();
    expect(game.fleet('target')!.ships['Transport ship']).toBe(1);
  });

  it('redirects followers when their target is itself a reinforcement that joins another fleet', () => {
    const state = setup('Exploration ship').exportState();
    const game = Game.restore({
      ...state,
      fleets: [
        ...state.fleets,
        {
          ...state.fleets[0]!,
          id: 'second-source',
          name: 'Second Source',
          position: { q: -3, r: 0 },
          ships: { ...state.fleets[1]!.ships, 'Transport ship': 0, Fighter: 1 },
        },
      ],
    });
    game.transferShips('fleet-home', 'Exploration ship', 1, 'target');
    const first = reinforcement(game).id;
    game.transferShips('second-source', 'Fighter', 1, first);
    const second = game
      .fleetSnapshots()
      .find((fleet) => fleet.joinFleetId === first)!.id;
    turn(game);
    turn(game);
    expect(game.fleet(first)).toBeNull();
    expect(game.fleet(second)!.joinFleetId).toBe('target');
    turn(game);
    turn(game);
    expect(game.fleet(second)).toBeNull();
    expect(game.fleet('target')!.ships).toMatchObject({
      Fighter: 1,
      'Exploration ship': 1,
      'Transport ship': 1,
      'Salvage ship': 0,
    });
  });
});
