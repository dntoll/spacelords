import { describe, expect, it } from 'vitest';
import { BOARDING_RIFLE_AP } from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import { boardingPathMarks } from '../../../src/client/boarding/models/battle/BoardingPathPreview.js';
import type { BoardingPath } from '../../../src/client/boarding/models/battle/BoardingBattle.js';

function path(forwards: number, turns = 0, stepCost = 2): BoardingPath {
  const positions = Array.from({ length: forwards }, (_, index) => ({
    q: index + 1,
    r: 0,
  }));
  return {
    cost: turns + forwards * stepCost,
    turns,
    positions,
    finalFacing: 0,
    steps: [
      ...Array.from({ length: turns }, () => ({
        type: 'turn' as const,
        direction: 1 as const,
        cost: 1,
      })),
      ...positions.map((position) => ({
        type: 'forward' as const,
        position,
        cost: stepCost,
      })),
    ],
  };
}

describe('ap-fargad-bordningsvag', () => {
  it('marks only affordable tiles and splits fire leftover from remaining reach', () => {
    const marks = boardingPathMarks(path(4), 7);
    expect(BOARDING_RIFLE_AP).toBe(4);
    expect(marks).toEqual([
      { position: { q: 1, r: 0 }, kind: 'fire' },
      { position: { q: 2, r: 0 }, kind: 'reach' },
      { position: { q: 3, r: 0 }, kind: 'reach' },
    ]);
  });

  it('counts turns before a step and uses crouched step cost', () => {
    const marks = boardingPathMarks(path(2, 1, 3), 7);
    expect(marks).toEqual([
      { position: { q: 1, r: 0 }, kind: 'reach' },
      { position: { q: 2, r: 0 }, kind: 'reach' },
    ]);
  });
});

// ap-fargad-bordningsvag: mixed cardinal and diagonal steps cannot use an average cost.
it('ap-fargad-bordningsvag: sums actual mixed step costs at AP boundaries', () => {
  const mixed: BoardingPath = {
    cost: 7,
    turns: 0,
    finalFacing: 0,
    positions: [],
    steps: [
      { type: 'forward', position: { q: 1, r: 0 }, cost: 2 },
      { type: 'forward', position: { q: 2, r: 1 }, cost: 3 },
      { type: 'forward', position: { q: 3, r: 1 }, cost: 2 },
    ],
  };
  expect(boardingPathMarks(mixed, 6)).toEqual([
    { position: { q: 1, r: 0 }, kind: 'fire' },
    { position: { q: 2, r: 1 }, kind: 'reach' },
  ]);
});
