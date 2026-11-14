import { describe, expect, it } from 'vitest';
import {
  boardingFloorLight,
  boardingLightBlockers,
  boardingLightPolygon,
  boardingLightMapTransform,
  boardingLightMapSignature,
  boardingLightOccluders,
  boardingShadowPolygon,
  type BoardingLightPoint,
} from '../../../src/client/boarding/views/rendering/BoardingLightMap.js';
import {
  BoardingLighting,
  BOARDING_AMBIENT,
} from '../../../src/client/boarding/views/rendering/BoardingLighting.js';
import { boardingIsoCenter } from '../../../src/client/boarding/views/rendering/BoardingProjection.js';
import {
  BoardingMap,
  type BoardingLight,
} from '../../../src/client/boarding/models/map/BoardingMap.js';
import type {
  BoardingBattleState,
  BoardingFeature,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';

const lamp: BoardingLight = {
  position: { q: 0, r: 0 },
  height: 2.2,
  radius: 6,
  intensity: 1,
};

function feature(
  kind: BoardingFeature['kind'],
  q: number,
  r: number,
  extra: Partial<BoardingFeature> = {},
): BoardingFeature {
  return {
    id: `${kind}-${q}-${r}`,
    kind,
    position: { q, r },
    hitPoints: 10,
    maxHitPoints: 10,
    open: false,
    locked: false,
    destroyed: false,
    exit: null,
    ...extra,
  };
}

function polygon(
  features: readonly BoardingFeature[],
  smokeCells: BoardingBattleState['smokeCells'] = [],
  source: BoardingLightPoint = lamp.position,
): readonly BoardingLightPoint[] {
  return boardingLightPolygon(
    source,
    lamp.radius,
    boardingLightBlockers({ features, smokeCells }),
  );
}

/** Even-odd test, independent of how the polygon was built. */
function lit(
  shape: readonly BoardingLightPoint[],
  point: BoardingLightPoint,
): boolean {
  let inside = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const a = shape[i]!,
      b = shape[j]!;
    if (
      a.r > point.r !== b.r > point.r &&
      point.q < ((b.q - a.q) * (point.r - a.r)) / (b.r - a.r) + a.q
    )
      inside = !inside;
  }
  return inside;
}

describe('ljuskarta-i-bordning', () => {
  it('lets a shadow edge run through the middle of a cell instead of along cell borders', () => {
    const shape = polygon([feature('wall', 2, 0)]);
    // The wall's near corners at q = 1.5 bound the shadow at |r| = q / 3.
    expect(lit(shape, { q: 3, r: 0.9 })).toBe(false);
    expect(lit(shape, { q: 3, r: 1.1 })).toBe(true);
    expect(lit(shape, { q: 1, r: 0 })).toBe(true);
    expect(lit(shape, { q: 5, r: 3 })).toBe(true);
  });

  it('keeps light from slipping through the corner shared by diagonal walls', () => {
    const shape = polygon([feature('wall', 1, 0), feature('wall', 0, 1)]);
    for (const point of [
      { q: 1, r: 1 },
      { q: 1.2, r: 1 },
      { q: 1, r: 1.2 },
      { q: 3, r: 3 },
    ])
      expect(lit(shape, point)).toBe(false);
    expect(lit(shape, { q: -2, r: 0.5 })).toBe(true);
    expect(lit(shape, { q: 1, r: -2 })).toBe(true);
  });

  it('lets a thin wall block only its middle third and ignores open, low and destroyed barriers', () => {
    const thin = polygon([feature('thin-wall', 2, 0, { axis: 'q' })]);
    expect(lit(thin, { q: 1.7, r: 0 })).toBe(true);
    expect(lit(thin, { q: 2.4, r: 0 })).toBe(false);
    const passable = polygon([
      feature('door', 2, 0, { open: true }),
      feature('thin-wall', 0, 2, { axis: 'r', low: true }),
      feature('wall', -2, 0, { destroyed: true }),
    ]);
    for (const point of [
      { q: 3, r: 0 },
      { q: 0, r: 3 },
      { q: -3, r: 0 },
    ])
      expect(lit(passable, point)).toBe(true);
    expect(lit(polygon([feature('door', 2, 0)]), { q: 3, r: 0 })).toBe(false);
  });

  it('blocks light with smoke, and smoke over the lamp darkens everything', () => {
    expect(lit(polygon([], [{ q: 2, r: 0 }]), { q: 3, r: 0 })).toBe(false);
    expect(polygon([], [{ q: 0, r: 0 }])).toEqual([]);
  });

  it('gives the floor the same light as the tile light that sprites use', () => {
    const map = new BoardingMap(
      'Open',
      9,
      9,
      new Map(),
      new Map(),
      [],
      { player: [], defender: [], civilian: [] },
      [],
      [],
      false,
      new Map(),
      [lamp],
    );
    const lighting = new BoardingLighting(map, {
      features: [],
      smokeCells: [],
    });
    for (const cell of [
      { q: 0, r: 0 },
      { q: 2, r: 1 },
      { q: 4, r: 3 },
    ])
      expect(BOARDING_AMBIENT + boardingFloorLight(lamp, cell)).toBeCloseTo(
        lighting.tile(cell),
        3,
      );
    expect(boardingFloorLight(lamp, { q: 6, r: 0 })).toBe(0);
  });

  it('maps each cell centre in the light map onto the projected cell centre', () => {
    const texels = 16;
    const [a, b, c, d, e, f] = boardingLightMapTransform(texels);
    for (const cell of [
      { q: 0, r: 0 },
      { q: 3, r: 5 },
    ]) {
      const x = 1 + (cell.q + 0.5) * texels,
        y = 1 + (cell.r + 0.5) * texels;
      const center = boardingIsoCenter(cell);
      expect(a * x + c * y + e).toBeCloseTo(center.x, 6);
      expect(b * x + d * y + f).toBeCloseTo(center.y, 6);
    }
  });
});

function inside(
  shape: readonly BoardingLightPoint[],
  point: BoardingLightPoint,
): boolean {
  let result = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const a = shape[i]!,
      b = shape[j]!;
    if (
      a.r > point.r !== b.r > point.r &&
      point.q < ((b.q - a.q) * (point.r - a.r)) / (b.r - a.r) + a.q
    )
      result = !result;
  }
  return result;
}

function person(
  q: number,
  r: number,
  extra: Partial<BoardingBattleState['people'][number]> = {},
): BoardingBattleState['people'][number] {
  return {
    id: `person-${q}-${r}`,
    position: { q, r },
    crouched: false,
    status: 'active',
    ...extra,
  } as BoardingBattleState['people'][number];
}

describe('skuggor-fran-figurer-och-foremal', () => {
  it('gives standing, crouched and fallen figures and low objects their heights', () => {
    const occluders = boardingLightOccluders({
      features: [
        feature('cover', 1, 1),
        feature('reactor', 2, 2),
        feature('cover', 3, 3, { destroyed: true }),
        feature('wall', 4, 4),
        { ...feature('thin-wall', 5, 5), axis: 'q', low: true },
      ],
      smokeCells: [],
      people: [
        person(0, 1),
        person(0, 2, { crouched: true }),
        person(0, 3, { status: 'incapacitated' }),
        person(0, 4, { status: 'dead' }),
        person(0, 5, { status: 'evacuated' }),
      ],
    });
    expect(occluders.map((occluder) => occluder.height)).toEqual([
      1.2, 1.8, 1.2, 1.8, 1.2, 0.72,
    ]);
    const low = occluders[2]!;
    expect(low.maxQ - low.minQ).toBeCloseTo(1 / 3);
    expect(low.maxR - low.minR).toBeCloseTo(1);
  });

  it('casts a long shadow behind a standing figure and none beside it', () => {
    const [soldier] = boardingLightOccluders({
      features: [],
      smokeCells: [],
      people: [person(2, 0)],
    });
    const shadow = boardingShadowPolygon(lamp, soldier!);
    expect(inside(shadow, { q: 3, r: 0 })).toBe(true);
    expect(inside(shadow, { q: 5.5, r: 0 })).toBe(true);
    expect(inside(shadow, { q: 1.5, r: 0 })).toBe(false);
    expect(inside(shadow, { q: 3, r: 1 })).toBe(false);
  });

  it('ends the shadow of an object lower than the lamp', () => {
    const [crate] = boardingLightOccluders({
      features: [feature('cover', 2, 0)],
      smokeCells: [],
    });
    const shadow = boardingShadowPolygon(lamp, crate!);
    expect(inside(shadow, { q: 3.5, r: 0 })).toBe(true);
    expect(inside(shadow, { q: 5.5, r: 0 })).toBe(false);
  });

  it('keeps the shadow of a figure under the lamp at its feet', () => {
    const [soldier] = boardingLightOccluders({
      features: [],
      smokeCells: [],
      people: [person(0, 0)],
    });
    const shadow = boardingShadowPolygon(lamp, soldier!);
    expect(inside(shadow, { q: 0.1, r: 0 })).toBe(true);
    // Round, and no wider than the figure: a lamp is a small area, not a point.
    expect(inside(shadow, { q: 0.17, r: 0.17 })).toBe(false);
    expect(inside(shadow, { q: 0.45, r: 0 })).toBe(false);
    expect(inside(shadow, { q: 0, r: -0.45 })).toBe(false);
  });

  it('narrows the shadow of a figure next to the lamp to a short streak', () => {
    const [soldier] = boardingLightOccluders({
      features: [],
      smokeCells: [],
      people: [person(1, 0)],
    });
    const shadow = boardingShadowPolygon(lamp, soldier!);
    expect(inside(shadow, { q: 2, r: 0 })).toBe(true);
    expect(inside(shadow, { q: 2, r: 0.3 })).toBe(false);
    expect(inside(shadow, { q: 1, r: 0.35 })).toBe(false);
  });

  it('changes the light signature when a figure moves or crouches only', () => {
    const base = { features: [feature('cover', 1, 1)], smokeCells: [] };
    const signature = (people: BoardingBattleState['people']) =>
      boardingLightMapSignature({ ...base, people });
    const still = signature([person(2, 0)]);
    expect(signature([person(2, 0, { hitPoints: 1 })])).toBe(still);
    expect(signature([person(3, 0)])).not.toBe(still);
    expect(signature([person(2, 0, { crouched: true })])).not.toBe(still);
  });
});
