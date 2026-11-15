import { describe, expect, it } from 'vitest';
import {
  BOARDING_STEP_MS,
  BOARDING_TURN_STEP_MS,
  boardingFrameMotionDuration,
  boardingMergedTurnFrames,
  boardingMotionDuration,
  boardingMotionFacing,
} from '../../../src/client/boarding/views/battle/BoardingMotionPacing.js';

type Person = Readonly<{
  id: string;
  position: Readonly<{ q: number; r: number }>;
  facing: number;
  status: string;
}>;
const frame = (...people: Person[]) => ({ people });
const person = (q: number, r: number, facing: number, id = 'a'): Person => ({
  id,
  position: { q, r },
  facing,
  status: 'active',
});

describe('vandning-under-forflyttning', () => {
  it('folds turns into the step that follows them', () => {
    const start = frame(person(0, 0, 0), person(5, 5, 2, 'b'));
    const frames = [
      frame(person(0, 0, 1), person(5, 5, 2, 'b')),
      frame(person(0, 0, 2), person(5, 5, 2, 'b')),
      frame(person(1, 0, 2), person(5, 5, 2, 'b')),
      frame(person(1, 0, 3), person(5, 5, 2, 'b')),
      frame(person(1, 1, 3), person(5, 5, 2, 'b')),
    ];
    expect([...boardingMergedTurnFrames(start, frames, null)]).toEqual([
      0, 1, 3,
    ]);
  });

  it('folds a chain of turns that ends the route into one quick turn', () => {
    const start = frame(person(0, 0, 0));
    const frames = [frame(person(0, 0, 1)), frame(person(0, 0, 2))];
    expect([...boardingMergedTurnFrames(start, frames, null)]).toEqual([0]);
  });

  it('keeps a turn when a shot is resolved right after it', () => {
    const start = frame(person(0, 0, 0));
    const frames = [frame(person(0, 0, 1)), frame(person(1, 0, 1))];
    expect([...boardingMergedTurnFrames(start, frames, 1)]).toEqual([]);
  });

  it('keeps a turn when someone else acts in the next frame', () => {
    const start = frame(person(0, 0, 0), person(5, 5, 2, 'b'));
    const frames = [
      frame(person(0, 0, 1), person(5, 5, 2, 'b')),
      frame(person(1, 0, 1), person(5, 6, 2, 'b')),
    ];
    expect([...boardingMergedTurnFrames(start, frames, null)]).toEqual([]);
  });

  it('plays a step at walking pace but a pure turn much faster', () => {
    expect(boardingMotionDuration(true, 2)).toBe(BOARDING_STEP_MS);
    expect(boardingMotionDuration(false, 1)).toBe(BOARDING_TURN_STEP_MS);
    expect(boardingMotionDuration(false, 3)).toBe(3 * BOARDING_TURN_STEP_MS);
    expect(BOARDING_TURN_STEP_MS * 3).toBeLessThan(BOARDING_STEP_MS);
  });

  it('times a frame pair by whether anyone stepped and how far they turned', () => {
    expect(
      boardingFrameMotionDuration(
        frame(person(0, 0, 0)),
        frame(person(1, 0, 2)),
      ),
    ).toBe(BOARDING_STEP_MS);
    expect(
      boardingFrameMotionDuration(
        frame(person(0, 0, 0)),
        frame(person(0, 0, 6)),
      ),
    ).toBe(2 * BOARDING_TURN_STEP_MS);
  });

  it('turns through each facing early in the step, the short way round', () => {
    const duration = BOARDING_STEP_MS;
    expect(boardingMotionFacing(0, 2, 0, duration)).toBe(0);
    expect(boardingMotionFacing(0, 2, BOARDING_TURN_STEP_MS, duration)).toBe(1);
    expect(
      boardingMotionFacing(0, 2, 2 * BOARDING_TURN_STEP_MS, duration),
    ).toBe(2);
    expect(boardingMotionFacing(0, 2, duration, duration)).toBe(2);
    expect(boardingMotionFacing(1, 7, BOARDING_TURN_STEP_MS, duration)).toBe(0);
    expect(boardingMotionFacing(3, 3, 0, duration)).toBe(3);
  });

  it('finishes a long turn within the motion', () => {
    expect(boardingMotionFacing(0, 4, 100, 100)).toBe(4);
  });
});
