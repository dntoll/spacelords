import { describe, expect, it } from 'vitest';
import {
  boardingThinPieceBounds,
  boardingThinPieces,
  boardingThinWallArms,
  parseBoardingMap,
  type BoardingThinArm,
  type BoardingThinPiece,
} from '../../../src/client/boarding/models/map/BoardingMap.js';
import {
  boardingCoverShadow,
  boardingVisibleShare,
} from '../../../src/client/boarding/models/battle/BoardingSightGeometry.js';
import { boardingLightBlockers } from '../../../src/client/boarding/views/rendering/BoardingLightMap.js';
import { BoardingBattle } from '../../../src/client/boarding/models/battle/BoardingBattle.js';

/** True when the local point (-0.5..0.5 on both axes) lies on the wall. */
function covers(
  pieces: readonly BoardingThinPiece[],
  q: number,
  r: number,
): boolean {
  return pieces.some((piece) => {
    const box = boardingThinPieceBounds({ q: 0, r: 0 }, piece);
    return q >= box.minQ && q <= box.maxQ && r >= box.minR && r <= box.maxR;
  });
}

const ARM_POINTS: Record<BoardingThinArm, readonly [number, number]> = {
  north: [0, -0.45],
  south: [0, 0.45],
  west: [-0.45, 0],
  east: [0.45, 0],
};

function area(pieces: readonly BoardingThinPiece[]): number {
  return pieces.reduce((sum, piece) => {
    const box = boardingThinPieceBounds({ q: 0, r: 0 }, piece);
    return sum + (box.maxQ - box.minQ) * (box.maxR - box.minR);
  }, 0);
}

function campaign(terrain: readonly string[], objects?: readonly string[]) {
  const width = terrain[0]!.length;
  const row = (symbol: string) => symbol.repeat(width);
  return [
    '[meta]',
    'name=Joined walls',
    `width=${width}`,
    `height=${terrain.length}`,
    'rules=campaign',
    '',
    '[terrain]',
    ...terrain,
    '',
    '[objects]',
    ...(objects ?? terrain.map(() => row('-'))),
    '',
    '[rooms]',
    ...terrain.map(() => row('-')),
    '',
    '[spawns]',
    ...terrain.map(() => row('-')),
    '',
  ].join('\n');
}

describe('sammanfogade-tunna-vaggar', () => {
  const arms: readonly BoardingThinArm[] = ['north', 'south', 'west', 'east'];
  const combinations = Array.from({ length: 16 }, (_, mask) =>
    arms.filter((_, index) => mask & (1 << index)),
  );

  it.each(
    combinations.map(
      (combination) => [combination.join('+') || 'post', combination] as const,
    ),
  )('reaches exactly toward its joined neighbours: %s', (_, joined) => {
    const pieces = boardingThinPieces(new Set(joined));
    expect(covers(pieces, 0, 0)).toBe(true);
    for (const arm of arms)
      expect(covers(pieces, ...ARM_POINTS[arm]), arm).toBe(
        joined.includes(arm),
      );
    // The wall stays one third thick: corners of the cell are always open.
    for (const q of [-0.3, 0.3])
      for (const r of [-0.3, 0.3]) expect(covers(pieces, q, r)).toBe(false);
    // Pieces never overlap, so the area is the post plus one third per arm.
    expect(area(pieces)).toBeCloseTo((1 / 3) * (1 / 3) * (1 + joined.length));
  });

  it('joins thick walls, hull, both thin wall heights and doors in line', () => {
    const terrain = new Map([
      ['5,4', true],
      ['6,5', true],
    ]);
    const joined = boardingThinWallArms(
      { q: 5, r: 5 },
      (q, r) => terrain.has(`${q},${r}`),
      (q, r) => (q === 4 && r === 5 ? 'r' : q === 5 && r === 6 ? 'r' : null),
    );
    // The door west runs toward the wall; the door south lies across it.
    expect([...joined].sort()).toEqual(['east', 'north', 'west']);
  });

  it('builds the shape from the map, whatever thin wall letter was painted', () => {
    const map = parseBoardingMap(
      campaign(['HHHHH', 'H.#.H', 'H.Rq.', 'H.Q.H', 'HHHHH']),
    );
    const wall = map.thinWallPieces({ q: 2, r: 2 })!;
    // # above, Q below and low q to the east; nothing to the west.
    expect(covers(wall, ...ARM_POINTS.north)).toBe(true);
    expect(covers(wall, ...ARM_POINTS.south)).toBe(true);
    expect(covers(wall, ...ARM_POINTS.east)).toBe(true);
    expect(covers(wall, ...ARM_POINTS.west)).toBe(false);
    // The Q below meets the R above and the hull below.
    const end = map.thinWallPieces({ q: 2, r: 3 })!;
    expect(covers(end, ...ARM_POINTS.north)).toBe(true);
    expect(covers(end, ...ARM_POINTS.south)).toBe(true);
    expect(map.thinWallPieces({ q: 1, r: 1 })).toBeNull();
  });

  it('joins a thin wall to a door in its wall line', () => {
    const map = parseBoardingMap(
      campaign(
        ['HHHHHHH', 'H.....H', 'H#Q.Q#H', 'H.....H', 'HHHHHHH'],
        ['-------', '-------', '---D---', '-------', '-------'],
      ),
    );
    const left = map.thinWallPieces({ q: 2, r: 2 })!;
    expect(covers(left, ...ARM_POINTS.east)).toBe(true);
    expect(covers(left, ...ARM_POINTS.west)).toBe(true);
    expect(covers(left, ...ARM_POINTS.north)).toBe(false);
  });

  it('lets sight pass the open quadrant of a corner but not its arms', () => {
    const corner = boardingThinPieces(new Set(['north', 'east'] as const));
    const at = (solid: typeof corner | true) => (q: number, r: number) =>
      q === 1 && r === 1 ? solid : false;
    // Straight east through the post and the east arm: mostly blocked.
    expect(
      boardingVisibleShare(
        { q: 0, r: 1 },
        { q: 1, r: 0 },
        { q: 2, r: 1 },
        at(corner),
      ),
    ).toBeLessThan(0.5);
    // Steeply through the open south-west quadrant: all seen, although a
    // whole blocking tile there would hide part of the target.
    const eye = { q: 0, r: 0 };
    const target = { q: 2, r: 4 };
    expect(boardingVisibleShare(eye, { q: 0, r: 1 }, target, at(corner))).toBe(
      1,
    );
    expect(
      boardingVisibleShare(eye, { q: 0, r: 1 }, target, at(true)),
    ).toBeLessThan(1);
  });

  it('blocks light with the joined footprint', () => {
    const map = parseBoardingMap(
      campaign(['HHHHH', 'H.#.H', 'H.Q..', 'H...H', 'HHHHH']),
    );
    const battle = BoardingBattle.create(map, 5);
    const blockers = boardingLightBlockers(battle.snapshot, map).filter(
      (blocker) => !blocker.cell,
    );
    // A wall below the thick wall only: a north arm and its end, one slab.
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatchObject({ minR: 1.5, maxR: 2 + 1 / 6 });
  });
});

describe('halvskydd-markering-sammanfogad', () => {
  const inside = (
    polygon: readonly { q: number; r: number }[],
    point: { q: number; r: number },
  ) => {
    let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i]!;
      const b = polygon[j]!;
      if (
        a.r > point.r !== b.r > point.r &&
        point.q < ((b.q - a.q) * (point.r - a.r)) / (b.r - a.r) + a.q
      )
        result = !result;
    }
    return result;
  };

  it('casts a low wall shadow from the wall, not from the near half of its tile', () => {
    const eye = { q: 0, r: 2.1 };
    const wall = { q: 3, r: 2 };
    const slab = boardingThinPieces(new Set(['north', 'south'] as const));
    const fromWall = boardingCoverShadow(eye, wall, 1.5, slab);
    const fromTile = boardingCoverShadow(eye, wall);
    const near = { q: 2.65, r: 2 };
    const behind = { q: 3.4, r: 2 };
    expect(inside(fromTile, near)).toBe(true);
    expect(inside(fromWall, near)).toBe(false);
    expect(inside(fromWall, behind)).toBe(true);
  });
});
