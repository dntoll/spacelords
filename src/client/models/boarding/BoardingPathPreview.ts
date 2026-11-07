import { BOARDING_RIFLE_AP, type BoardingPath } from './BoardingBattle.js';
import type { BoardingCell } from './BoardingMap.js';

export type BoardingPathMarkKind = 'fire' | 'reach';

export interface BoardingPathMark {
  readonly position: BoardingCell;
  readonly kind: BoardingPathMarkKind;
}

/** ap-fargad-bordningsvag: affordable prefix only, split by leftover rifle AP. */
export function boardingPathMarks(
  path: BoardingPath,
  remainingAp: number,
  fireCost = BOARDING_RIFLE_AP,
): readonly BoardingPathMark[] {
  const marks: BoardingPathMark[] = [];
  let cost = 0;
  for (const step of path.steps) {
    cost += step.cost;
    if (step.type === 'turn') continue;
    if (cost > remainingAp) break;
    marks.push({
      position: step.position,
      kind: cost <= remainingAp - fireCost ? 'fire' : 'reach',
    });
  }
  return Object.freeze(marks);
}
