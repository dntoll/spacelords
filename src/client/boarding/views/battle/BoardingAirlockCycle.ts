import type { BoardingCell } from '../../models/map/BoardingMap.js';
import { BOARDING_STEP_MS } from './BoardingMotionPacing.js';

/**
 * automatisk-airlockcykel: times for one airlock door: it slides open, the
 * walker takes the step, and it slides shut again.
 */
export const BOARDING_AIRLOCK_CYCLE_MS = Object.freeze({
  slide: 300,
  walk: BOARDING_STEP_MS,
  total: 300 + BOARDING_STEP_MS + 300,
});

/** A step into or out of an airlock, through the door on `side` (±r). */
export interface BoardingAirlockPassage {
  readonly airlock: BoardingCell;
  readonly entering: boolean;
  readonly side: -1 | 1;
}

const same = (a: BoardingCell, b: BoardingCell) => a.q === b.q && a.r === b.r;

/** automatisk-airlockcykel: the airlock door a step passes, if any. */
export function boardingAirlockPassage(
  from: BoardingCell,
  to: BoardingCell,
  airlocks: readonly BoardingCell[],
): BoardingAirlockPassage | null {
  const into = airlocks.find((cell) => same(cell, to));
  const outOf = airlocks.find((cell) => same(cell, from));
  if (!!into === !!outOf) return null;
  const airlock = (into ?? outOf)!;
  const side = Math.sign((into ? from : to).r - airlock.r);
  if (side === 0) return null;
  return Object.freeze({
    airlock,
    entering: !!into,
    side: side as -1 | 1,
  });
}

/**
 * automatisk-airlockcykel: someone stepping in waits for the door to close
 * behind them; someone stepping out walks on while it closes.
 */
export function boardingAirlockStepDuration(entering: boolean): number {
  const { slide, walk, total } = BOARDING_AIRLOCK_CYCLE_MS;
  return entering ? total : slide + walk;
}

/** automatisk-airlockcykel: how far (0–1) the step has come. */
export function boardingAirlockWalkProgress(elapsed: number): number {
  const { slide, walk } = BOARDING_AIRLOCK_CYCLE_MS;
  const raw = Math.min(1, Math.max(0, (elapsed - slide) / walk));
  return raw * raw * (3 - 2 * raw);
}

/** automatisk-airlockcykel: how far open (0–1) the passed door is. */
export function boardingAirlockDoorOpenness(elapsed: number): number {
  const { slide, walk, total } = BOARDING_AIRLOCK_CYCLE_MS;
  if (elapsed <= 0 || elapsed >= total) return 0;
  if (elapsed < slide) return elapsed / slide;
  if (elapsed <= slide + walk) return 1;
  return (total - elapsed) / slide;
}
