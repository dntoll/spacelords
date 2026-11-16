import { describe, expect, test } from 'vitest';
import {
  boardingMapForState,
  createTestBoardingBattle,
} from '../../../src/client/boarding/models/map/TestBoarding.js';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';

function playerTurn(): BoardingBattle {
  const battle = createTestBoardingBattle();
  const actorSide = (state: BoardingBattleState) =>
    state.people.find((person) => person.id === state.currentActorId)?.side;
  for (
    let step = 0;
    step < 50 && actorSide(battle.snapshot) !== 'player';
    step++
  )
    battle.actAutomatically(true);
  expect(actorSide(battle.snapshot)).toBe('player');
  return battle;
}

describe('snabb-bordningsvagsokning', () => {
  test('answers a route to every tile of the test boarding in well under a second', () => {
    // A civilian without a reachable exit asks for every tile at once; the old
    // search re-sorted its queue on every step and took seconds per question.
    const battle = playerTurn();
    const state = battle.snapshot;
    const map = boardingMapForState(state);
    const actorId = state.currentActorId!;
    const started = performance.now();
    let reachable = 0;
    for (let r = 0; r < map.height; r++)
      for (let q = 0; q < map.width; q++)
        if (battle.pathTo(actorId, { q, r })) reachable++;
    expect(reachable).toBeGreaterThan(50);
    expect(performance.now() - started).toBeLessThan(1000);
  }, 60_000);

  test('a cached route never outlives the state it was searched in', () => {
    const battle = playerTurn();
    const actorId = battle.snapshot.currentActorId!;
    const before = battle.snapshot.people.find((p) => p.id === actorId)!;
    const map = boardingMapForState(battle.snapshot);
    let destination: { q: number; r: number } | null = null;
    for (let r = 0; r < map.height && !destination; r++)
      for (let q = 0; q < map.width && !destination; q++) {
        const route = battle.pathTo(actorId, { q, r });
        if (
          route &&
          route.positions.length > 0 &&
          route.cost <= (battle.snapshot.activation?.remaining ?? 0)
        )
          destination = { q, r };
      }
    expect(destination).not.toBeNull();
    battle.command({ type: 'move', to: destination! });
    const after = battle.snapshot.people.find((p) => p.id === actorId)!;
    expect(after.position).toEqual(destination);
    const back = battle.pathTo(actorId, before.position);
    expect(back).not.toBeNull();
    expect(back!.positions.at(-1)).toEqual(before.position);
    expect(battle.pathTo(actorId, destination!)?.cost).toBe(0);
  });

  test('a restored battle finds the same route as the original', () => {
    const battle = playerTurn();
    const state = battle.snapshot;
    const map = boardingMapForState(state);
    const restored = BoardingBattle.restore(map, state);
    const actorId = state.currentActorId!;
    for (let r = 0; r < map.height; r += 3)
      for (let q = 0; q < map.width; q += 3)
        expect(restored.pathTo(actorId, { q, r })).toEqual(
          battle.pathTo(actorId, { q, r }),
        );
  });
});
