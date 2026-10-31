import { completeTacticalBattles } from '../fixtures/tactical-combat.js';
import { describe, expect, it } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { emptyStock } from '../../src/client/models/Economy.js';
import { colonizationState } from '../fixtures/colonization.js';
import { collectTurnFrames } from '../fixtures/turn-steps.js';

function planet(game: Game, id = 'sol-1') {
  return game.galaxy.systems
    .flatMap((system) => system.planets)
    .find((item) => item.id === id)!;
}
function turn(game: Game) {
  collectTurnFrames(game);
  game.finishTurn();
}

describe('koloniseringsorder', () => {
  it.each([0, 1])(
    'resolves arrival combat before founding a colony (%s escorts)',
    (fighters) => {
      const state = colonizationState(1);
      let game = Game.restore({
        ...state,
        pirates: [
          {
            id: 'pirate-nadir',
            systemId: 'nadir',
            position: { q: 6, r: -2 },
            count: 1,
          },
        ],
        fleets: [
          {
            ...state.fleets[0]!,
            position: { q: 7, r: 0 },
            ships: {
              ...state.fleets[0]!.ships,
              Fighter: fighters,
              'Exploration ship': 0,
            },
          },
        ],
      });
      const target = planet(game, 'nadir-1');
      game.setColonization('fleet-home', target.position);
      game.startTurn();
      for (
        let step = 0;
        step < 50 &&
        game.fleet('fleet-home')!.position?.key !== target.position.key;
        step++
      ) {
        if (game.phase === 'interrupted') {
          game = Game.restore(game.exportState());
          completeTacticalBattles(game);
          game.continueTurn();
        }
        game.applyFrame(game.nextTurnFrame()!);
      }
      expect(game.fleet('fleet-home')!.position).toEqual(target.position);
      expect(game.planetAt(target.position)).toBeUndefined();
      expect(game.phase).toBe('interrupted');
      game = Game.restore(game.exportState());
      for (let step = 0; !game.tacticalBattle && step < 50; step++) {
        if (game.phase === 'interrupted') game.continueTurn();
        game.applyFrame(game.nextTurnFrame()!);
      }
      expect(game.planetAt(target.position)).toBeUndefined();
      completeTacticalBattles(game);
      expect(game.interruption?.battles).toHaveLength(1);
      expect(!!game.planetAt(target.position)).toBe(fighters > 0);
      expect(game.fleet('fleet-home')!.colonizationTargetId).toBeUndefined();
      const results = game.events.filter((event) =>
        /Combat at|was colonized/.test(event.text),
      );
      expect(results[0]!.text).toMatch(/^Combat at/);
      expect(
        results.filter((event) => event.text.includes('was colonized')),
      ).toHaveLength(fighters);
    },
  );

  it('cancels when the last Colony ship is transferred and reads saves without an order', () => {
    const game = Game.restore(colonizationState());
    game.setColonization('fleet-home', planet(game).position);
    game.transferShips('fleet-home', 'Colony ship', 2, null);
    expect(game.fleet('fleet-home')!.colonizationTargetId).toBeUndefined();
    expect(game.fleet('fleet-home')!.destination).toBeNull();
    turn(game);
    expect(game.planetAt(planet(game).position)).toBeUndefined();
    expect(
      Game.restore(colonizationState()).fleet('fleet-home')!
        .colonizationTargetId,
    ).toBeUndefined();
  });

  it('rejects invalid saved targets and locks new orders during simulation', () => {
    const state = colonizationState();
    expect(() =>
      Game.restore({
        ...state,
        fleets: [
          { ...state.fleets[0]!, colonizationTargetId: 'missing-planet' },
        ],
      }),
    ).toThrow('Invalid saved colonization order');
    const game = Game.restore(state);
    game.startTurn();
    expect(() =>
      game.setColonization('fleet-home', planet(game).position),
    ).toThrow('Orders are only available');
  });

  it('colonizes immediately when the chosen planet is already occupied by the fleet', () => {
    const state = colonizationState();
    const game = Game.restore({
      ...state,
      fleets: [{ ...state.fleets[0]!, position: { q: 0, r: 1 } }],
    });
    const target = planet(game);
    game.setColonization('fleet-home', target.position);
    expect(game.planetSnapshot(target)!.population).toBe(1000);
    expect(game.fleet('fleet-home')!.ships['Colony ship']).toBe(1);
    expect(game.fleet('fleet-home')!.destination).toBeNull();
  });

  it('travels physically across saved years and consumes one ship exactly once on arrival', () => {
    let game = Game.restore(colonizationState());
    const target = planet(game, 'nadir-1');
    game.setColonization('fleet-home', target.position);
    expect(game.fleet('fleet-home')!.colonizationTargetId).toBe(target.id);
    expect(game.planetAt(target.position)).toBeUndefined();
    let years = 0;
    for (; years < 15 && !game.planetAt(target.position); years++) {
      const before = game.fleet('fleet-home')!;
      turn(game);
      expect(
        before.position!.distanceTo(game.fleet('fleet-home')!.position!),
      ).toBeLessThanOrEqual(before.speed);
      game = Game.restore(game.exportState());
    }
    expect(years).toBeGreaterThan(1);
    expect(game.planetAt(target.position)?.id).toBe(target.id);
    expect(game.fleet('fleet-home')!.ships['Colony ship']).toBe(1);
    expect(game.fleet('fleet-home')!.colonizationTargetId).toBeUndefined();
    expect(game.events.some((event) => event.text.includes('arrived'))).toBe(
      false,
    );
    turn(game);
    expect(
      game.events.filter((event) => event.text.includes('was colonized')),
    ).toHaveLength(1);
    expect(game.fleet('fleet-home')!.ships['Colony ship']).toBe(1);
  });

  it('founds the colony on arrival before year-end and retains sight after consuming the only ship', () => {
    const state = colonizationState(1);
    const game = Game.restore({
      ...state,
      fleets: [
        {
          ...state.fleets[0]!,
          ships: {
            ...state.fleets[0]!.ships,
            Fighter: 0,
            'Exploration ship': 0,
          },
        },
      ],
    });
    const target = planet(game);
    game.setColonization('fleet-home', target.position);
    game.startTurn();
    for (let step = 0; step < 50 && !game.planetAt(target.position); step++) {
      if (game.phase === 'interrupted') {
        completeTacticalBattles(game);
        game.continueTurn();
      }
      const frame = game.nextTurnFrame();
      expect(frame?.settlement).not.toBe(true);
      game.applyFrame(frame!);
    }
    expect(game.planetSnapshot(target)!.population).toBe(1000);
    expect(game.planetSnapshot(target)!.economy.stock).toEqual(emptyStock());
    expect(game.fleet('fleet-home')!.position).toBeNull();
    expect(
      game
        .mapSnapshot()
        .find((cell) => cell.position.key === target.position.key),
    ).toMatchObject({ visible: true, object: { owned: true } });
  });

  it('rejects inhabited, unknown and non-planet targets without replacing an existing order', () => {
    const state = colonizationState();
    const unknown = state.world.systems[1]!.planets[1]!;
    const game = Game.restore({
      ...state,
      explored: state.explored.filter(
        (key) => key !== `${unknown.position.q},${unknown.position.r}`,
      ),
    });
    game.setColonization('fleet-home', planet(game).position);
    const saved = game.exportState();
    for (const target of [
      game.galaxy.homePlanet.position,
      new HexCoordinate(3, 0),
      new HexCoordinate(unknown.position.q, unknown.position.r),
    ]) {
      expect(() => game.setColonization('fleet-home', target)).toThrow();
      expect(game.exportState()).toEqual(saved);
    }
    const noShip = Game.restore(colonizationState(0));
    expect(() =>
      noShip.setColonization('fleet-home', planet(noShip).position),
    ).toThrow('Colony ship');
  });

  it.each(['clear', 'move', 'explore', 'patrol'] as const)(
    'cancels colonization when replaced by %s',
    (order) => {
      const game = Game.restore(colonizationState());
      const target = planet(game);
      game.setColonization('fleet-home', target.position);
      if (order === 'clear') game.clearDestination('fleet-home');
      if (order === 'move')
        game.setDestination('fleet-home', new HexCoordinate(3, 0));
      if (order === 'explore') game.setExploration('fleet-home', 'explore');
      if (order === 'patrol') game.setPatrol('fleet-home');
      expect(game.fleet('fleet-home')!.colonizationTargetId).toBeUndefined();
      turn(game);
      expect(game.planetAt(target.position)).toBeUndefined();
      expect(game.fleet('fleet-home')!.ships['Colony ship']).toBe(2);
    },
  );

  it('lets only one of two arriving fleets settle the same planet without consuming the other ship', () => {
    const state = colonizationState(1);
    const game = Game.restore({
      ...state,
      fleets: [
        state.fleets[0]!,
        { ...state.fleets[0]!, id: 'second', name: 'Second fleet' },
      ],
    });
    const target = planet(game);
    game.setColonization('fleet-home', target.position);
    game.setColonization('second', target.position);
    turn(game);
    expect(
      game
        .fleetSnapshots()
        .reduce((total, fleet) => total + fleet.ships['Colony ship'], 0),
    ).toBe(1);
    expect(
      game.fleetSnapshots().every((fleet) => !fleet.colonizationTargetId),
    ).toBe(true);
    expect(
      game.events.filter((event) => event.text.includes('was colonized')),
    ).toHaveLength(1);
  });
});
