import { describe, expect, it } from 'vitest';
import {
  BOARDING_DOOR_SLIDE_MS,
  boardingDoorLeaves,
  boardingDoorOpenness,
} from '../../src/client/views/boarding/BoardingDoorSlide.js';
import {
  BOARDING_WALL_HEIGHT,
  boardingThinWallCells,
} from '../../src/client/views/boarding/BoardingProjection.js';
import { BoardingWallVisibility } from '../../src/client/views/boarding/BoardingWallVisibility.js';
import {
  BOARDING_METERS,
  boardingHeight,
} from '../../src/client/views/boarding/BoardingScale.js';

describe('animerade-dorrar', () => {
  it('slides from the old state to the new one over the slide time', () => {
    expect(boardingDoorOpenness(true, null, 0)).toBe(1);
    expect(boardingDoorOpenness(false, null, 0)).toBe(0);
    const started = 1000;
    expect(boardingDoorOpenness(true, started, started)).toBe(0);
    const half = boardingDoorOpenness(
      true,
      started,
      started + BOARDING_DOOR_SLIDE_MS / 2,
    );
    expect(half).toBeGreaterThan(0.2);
    expect(half).toBeLessThan(0.8);
    expect(
      boardingDoorOpenness(true, started, started + BOARDING_DOOR_SLIDE_MS),
    ).toBe(1);
    // Closing runs the same way backwards.
    expect(boardingDoorOpenness(false, started, started)).toBe(1);
    expect(
      boardingDoorOpenness(false, started, started + BOARDING_DOOR_SLIDE_MS),
    ).toBe(0);
  });
  it('parts two leaves into the wall and keeps their texture attached', () => {
    expect(boardingDoorLeaves(0)).toEqual([
      { span: [-0.5, 0.5], texture: [0, 1] },
    ]);
    expect(boardingDoorLeaves(1)).toEqual([]);
    const [left, right] = boardingDoorLeaves(0.5);
    // Each leaf has slid a quarter tile; the hidden part is inside the wall.
    expect(left).toEqual({ span: [-0.5, -0.25], texture: [0.25, 0.5] });
    expect(right).toEqual({ span: [0.25, 0.5], texture: [0.5, 0.75] });
  });
  it('builds a thin wall slab over part of its length', () => {
    const { wall } = boardingThinWallCells({ q: 2, r: 3 }, 'q', [0.25, 0.5]);
    expect(Math.min(...wall.map((point) => point.r))).toBeCloseTo(3.25);
    expect(Math.max(...wall.map((point) => point.r))).toBeCloseTo(3.5);
    const across = boardingThinWallCells({ q: 2, r: 3 }, 'r', [-0.5, -0.25]);
    expect(Math.min(...across.wall.map((point) => point.q))).toBeCloseTo(1.5);
    expect(Math.max(...across.wall.map((point) => point.q))).toBeCloseTo(1.75);
  });
});

describe('dorrar-falls-inte', () => {
  it('keeps a door at full height where a thin wall would be cut away', () => {
    const door = { q: 4, r: 4 };
    const visibility = new BoardingWallVisibility([{ q: 3, r: 4 }]);
    expect(visibility.height(door, { axis: 'q' })).toBe(
      boardingHeight(BOARDING_METERS.cutawayWall),
    );
    expect(visibility.height(door, { axis: 'q', door: true })).toBe(
      BOARDING_WALL_HEIGHT,
    );
  });
});
