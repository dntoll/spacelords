import { describe, expect, it } from 'vitest';
import {
  BOARDING_AIRLOCK_CYCLE_MS,
  boardingAirlockDoorOpenness,
  boardingAirlockPassage,
  boardingAirlockStepDuration,
  boardingAirlockWalkProgress,
} from '../../../src/client/boarding/views/battle/BoardingAirlockCycle.js';
import { boardingOccupiedAirlockSide } from '../../../src/client/boarding/models/battle/BoardingBattle.js';

const airlock = { q: 4, r: 7 };

describe('airlock-oppnar-at-blickriktning', () => {
  it('holds only the door in the active occupant’s facing direction open', () => {
    const occupant = {
      position: airlock,
      facing: 3,
      status: 'active',
    } as const;
    expect(boardingOccupiedAirlockSide(airlock, [occupant])).toBe(1);
    expect(
      boardingOccupiedAirlockSide(airlock, [{ ...occupant, facing: 1 }]),
    ).toBe(-1);
    expect(
      boardingOccupiedAirlockSide(airlock, [{ ...occupant, facing: 0 }]),
    ).toBe(0);
    expect(boardingOccupiedAirlockSide(airlock, [])).toBe(0);
  });
});

describe('automatisk-airlockcykel', () => {
  it('uses the door on the side the walker comes from or goes to', () => {
    expect(
      boardingAirlockPassage({ q: 4, r: 6 }, airlock, [airlock]),
    ).toMatchObject({ entering: true, side: -1 });
    expect(
      boardingAirlockPassage({ q: 4, r: 8 }, airlock, [airlock]),
    ).toMatchObject({ entering: true, side: 1 });
    expect(
      boardingAirlockPassage(airlock, { q: 4, r: 8 }, [airlock]),
    ).toMatchObject({ entering: false, side: 1 });
    expect(
      boardingAirlockPassage(airlock, { q: 3, r: 6 }, [airlock]),
    ).toMatchObject({ entering: false, side: -1 });
    expect(
      boardingAirlockPassage({ q: 1, r: 1 }, { q: 1, r: 2 }, [airlock]),
    ).toBeNull();
  });

  it('keeps the walker still until the door has opened', () => {
    const opened = BOARDING_AIRLOCK_CYCLE_MS.slide;
    expect(boardingAirlockWalkProgress(0)).toBe(0);
    expect(boardingAirlockWalkProgress(opened * 0.9)).toBe(0);
    expect(boardingAirlockDoorOpenness(opened * 0.9)).toBeLessThan(1);
    expect(boardingAirlockDoorOpenness(opened)).toBe(1);
    expect(boardingAirlockWalkProgress(opened + 1)).toBeGreaterThan(0);
    expect(
      boardingAirlockWalkProgress(opened + BOARDING_AIRLOCK_CYCLE_MS.walk),
    ).toBe(1);
  });

  it('closes the door behind someone who stops inside before the step ends', () => {
    const entering = boardingAirlockStepDuration(true);
    expect(boardingAirlockDoorOpenness(entering)).toBe(0);
    expect(entering).toBe(BOARDING_AIRLOCK_CYCLE_MS.total);
    // Leaving, the walk ends once outside; the door closes behind afterwards.
    expect(boardingAirlockStepDuration(false)).toBeLessThan(entering);
  });

  it('never has both doors open while walking straight through', () => {
    // In through one door, then out through the other right after.
    const enter = boardingAirlockStepDuration(true);
    for (let t = 0; t <= enter + BOARDING_AIRLOCK_CYCLE_MS.total; t += 10) {
      const first = boardingAirlockDoorOpenness(t);
      const second = t >= enter ? boardingAirlockDoorOpenness(t - enter) : 0;
      expect(Math.min(first, second)).toBe(0);
    }
  });
});
