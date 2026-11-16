import { describe, expect, test, vi } from 'vitest';
import type * as SightGeometry from '../../../src/client/boarding/models/battle/BoardingSightGeometry.js';

const sight = vi.hoisted(() => ({ calls: 0 }));
vi.mock(
  '../../../src/client/boarding/models/battle/BoardingSightGeometry.js',
  async (importOriginal) => {
    const original = await importOriginal<typeof SightGeometry>();
    return {
      ...original,
      boardingVisibleShare: (
        ...args: Parameters<typeof original.boardingVisibleShare>
      ) => {
        sight.calls++;
        return original.boardingVisibleShare(...args);
      },
    };
  },
);

// The fast suite shares modules between files; load fresh ones that see the mock.
vi.resetModules();
const { boardingMapForState, createTestBoardingBattle } =
  await import('../../../src/client/boarding/models/map/TestBoarding.js');
const { BoardingBattle } =
  await import('../../../src/client/boarding/models/battle/BoardingBattle.js');

describe('snabb-bordningsvagsokning', () => {
  test('a command works out what everyone sees once, not twice', () => {
    const battle = createTestBoardingBattle();
    for (
      let step = 0;
      step < 50 &&
      battle.snapshot.people.find(
        (person) => person.id === battle.snapshot.currentActorId,
      )?.side !== 'player';
      step++
    )
      battle.actAutomatically(true);
    const map = boardingMapForState(battle.snapshot);
    const turning = BoardingBattle.restore(map, battle.snapshot);
    sight.calls = 0;
    turning.command({ type: 'turn', direction: 1 });
    const commandCalls = sight.calls;

    // One full refresh of the turned state, from a battle without a cache.
    const fresh = BoardingBattle.restore(map, turning.snapshot);
    sight.calls = 0;
    fresh.synchronize();
    const refreshCalls = sight.calls;

    expect(refreshCalls).toBeGreaterThan(0);
    expect(commandCalls).toBe(refreshCalls);
    // Skipping the repeat must not change what the players know.
    expect(fresh.snapshot.visibleCells).toEqual(turning.snapshot.visibleCells);
    expect(fresh.snapshot.lastKnownEnemies).toEqual(
      turning.snapshot.lastKnownEnemies,
    );
  });
});
