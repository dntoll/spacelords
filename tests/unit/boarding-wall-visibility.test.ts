import {
  BOARDING_METERS,
  boardingHeight,
} from '../../src/client/views/boarding/BoardingScale.js';
import { describe, expect, it } from 'vitest';
import {
  BoardingWallVisibility,
  boardingDepthOrder,
} from '../../src/client/views/boarding/BoardingWallVisibility.js';
import {
  BOARDING_WALL_HEIGHT,
  boardingIsoCenter,
} from '../../src/client/views/boarding/BoardingProjection.js';

describe('genomskinliga-skymmande-vaggar', () => {
  it('cuts only walls that actually cover discovered floor behind them', () => {
    const wall = { q: 4, r: 4 };
    expect(new BoardingWallVisibility([{ q: 3, r: 3 }]).height(wall)).toBe(
      boardingHeight(BOARDING_METERS.cutawayWall),
    );
    expect(new BoardingWallVisibility([{ q: 5, r: 5 }]).height(wall)).toBe(
      BOARDING_WALL_HEIGHT,
    );
    expect(new BoardingWallVisibility([{ q: 1, r: 7 }]).height(wall)).toBe(
      BOARDING_WALL_HEIGHT,
    );
    expect(new BoardingWallVisibility([{ q: 0, r: 0 }]).height(wall)).toBe(
      BOARDING_WALL_HEIGHT,
    );
    expect(new BoardingWallVisibility([]).height(wall)).toBe(
      BOARDING_WALL_HEIGHT,
    );
  });
  it('allows picking above the section but keeps both tall walls and the remaining section solid', () => {
    const wall = { q: 4, r: 4 };
    const behind = { q: 3, r: 3 };
    const center = boardingIsoCenter(wall);
    const point = { x: center.x, y: center.y - BOARDING_WALL_HEIGHT / 2 };
    expect(new BoardingWallVisibility([]).blocks(point, behind, [wall])).toBe(
      true,
    );
    expect(
      new BoardingWallVisibility([behind]).blocks(point, behind, [wall]),
    ).toBe(false);
    expect(
      new BoardingWallVisibility([behind]).blocks(
        { x: center.x, y: center.y - 4 },
        behind,
        [wall],
      ),
    ).toBe(true);
    expect(
      new BoardingWallVisibility([]).blocks(point, { q: 5, r: 5 }, [wall]),
    ).toBe(false);
  });
  it('interleaves objects and people by ground depth, including fractional movement', () => {
    const entries = [
      { depth: 80, order: 0, id: 'wall' },
      { depth: 65, order: 1, id: 'moving' },
      { depth: 95, order: 1, id: 'front' },
      { depth: 50, order: 0, id: 'reactor' },
    ];
    expect(entries.sort(boardingDepthOrder).map((entry) => entry.id)).toEqual([
      'reactor',
      'moving',
      'wall',
      'front',
    ]);
  });
});
