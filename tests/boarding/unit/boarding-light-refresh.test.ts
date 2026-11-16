import { describe, expect, it } from 'vitest';
import {
  BOARDING_LIGHT_MAP_TEXELS,
  boardingFigureOccluders,
  boardingLightMapAreaFor,
  boardingLightMapTransform,
  boardingShadowPolygon,
  boardingStaticLightSignature,
  type BoardingLightPoint,
} from '../../../src/client/boarding/views/rendering/BoardingLightMap.js';
import {
  BOARDING_DRAFT_LIGHT_TEXELS,
  BoardingLightRefresh,
  boardingLampReach,
  boardingMovingLightFigures,
} from '../../../src/client/boarding/views/rendering/BoardingLightRefresh.js';
import { boardingIsoCenter } from '../../../src/client/boarding/views/rendering/BoardingProjection.js';
import { boardingSimplifiedOutline } from '../../../src/client/boarding/views/rendering/BoardingOutline.js';
import type { BoardingLight } from '../../../src/client/boarding/models/map/BoardingMap.js';
import type {
  BoardingBattleState,
  BoardingFeature,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';

const lamp = (q: number, r: number): BoardingLight => ({
  position: { q, r },
  height: 2.2,
  radius: 4,
  intensity: 1,
});

type Person = BoardingBattleState['people'][number];

function person(
  id: string,
  q: number,
  r: number,
  extra: Partial<Person> = {},
): Person {
  return {
    id,
    position: { q, r },
    crouched: false,
    status: 'active',
    ...extra,
  } as Person;
}

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

/** Even-odd test, independent of how the polygon was built. */
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

const occluders = (...people: Person[]) => boardingFigureOccluders(people);

describe('jamn-ljuskarta-under-forflyttning', () => {
  it('keeps the lamp images when figures walk, but rebuilds them when a door or cover changes', () => {
    const features = [feature('door', 2, 2), feature('cover', 4, 4)];
    const signature = (
      changed: readonly BoardingFeature[] = features,
      people: readonly Person[] = [],
    ) =>
      boardingStaticLightSignature({
        features: changed,
        smokeCells: [],
        people,
      } as Pick<BoardingBattleState, 'features' | 'smokeCells'>);
    const still = signature();
    expect(signature(features, [person('a', 1, 1)])).toBe(still);
    expect(signature(features, [person('a', 3, 1, { crouched: true })])).toBe(
      still,
    );
    expect(signature([{ ...features[0]!, open: true }, features[1]!])).not.toBe(
      still,
    );
    expect(
      signature([features[0]!, { ...features[1]!, destroyed: true }]),
    ).not.toBe(still);
  });

  it('paints every lamp once, then nothing while no figure moves', () => {
    const refresh = new BoardingLightRefresh(
      [lamp(0, 0), lamp(20, 0)],
      BOARDING_LIGHT_MAP_TEXELS,
    );
    const figures = occluders(person('a', 1, 0));
    expect(refresh.plan(figures, false).lamps.map((l) => l.index)).toEqual([
      0, 1,
    ]);
    expect(refresh.plan(figures, false)).toEqual({ lamps: [], region: null });
  });

  it('paints again only the lamps that reach the moving figure, and only their part of the deck', () => {
    const near = lamp(0, 0),
      far = lamp(20, 0);
    const refresh = new BoardingLightRefresh(
      [near, far],
      BOARDING_LIGHT_MAP_TEXELS,
    );
    const resting = person('b', 21, 0);
    refresh.plan(occluders(person('a', 1, 0), resting), false);
    const plan = refresh.plan(occluders(person('a', 2, 0), resting), false);
    expect(plan.lamps.map((l) => l.index)).toEqual([0]);
    expect(plan.lamps[0]!.occluders).toHaveLength(1);
    expect(plan.region).toEqual(boardingLampReach(near));
  });

  it('paints coarser shadows while walking and sharp ones when the walk ends', () => {
    const refresh = new BoardingLightRefresh(
      [lamp(0, 0), lamp(20, 0)],
      BOARDING_LIGHT_MAP_TEXELS,
    );
    refresh.plan(occluders(person('a', 1, 0)), false);
    const walking = refresh.plan(occluders(person('a', 1.5, 0)), true);
    expect(walking.lamps).toEqual([
      expect.objectContaining({
        index: 0,
        texels: BOARDING_DRAFT_LIGHT_TEXELS,
      }),
    ]);
    // A step shorter than one coarse texel changes nothing on the coarse grid.
    const nudge = 0.4 / BOARDING_DRAFT_LIGHT_TEXELS;
    expect(refresh.plan(occluders(person('a', 1.5 + nudge, 0)), true)).toEqual({
      lamps: [],
      region: null,
    });
    // The lamp without figures is never repainted for the change of grid.
    const done = refresh.plan(occluders(person('a', 2, 0)), false);
    expect(done.lamps).toEqual([
      expect.objectContaining({ index: 0, texels: BOARDING_LIGHT_MAP_TEXELS }),
    ]);
  });

  it('snaps shadows to the painted grid so the plan and the picture agree', () => {
    const refresh = new BoardingLightRefresh(
      [lamp(0, 0)],
      BOARDING_LIGHT_MAP_TEXELS,
    );
    const [planned] = refresh.plan(
      occluders(person('a', 1.53, 0.21)),
      true,
    ).lamps;
    const [shadow] = planned!.occluders;
    const centre = (shadow!.minQ + shadow!.maxQ) / 2;
    expect(centre * BOARDING_DRAFT_LIGHT_TEXELS).toBeCloseTo(
      Math.round(1.53 * BOARDING_DRAFT_LIGHT_TEXELS),
    );
    expect(shadow!.maxQ - shadow!.minQ).toBeCloseTo(0.4);
  });
});

describe('skuggor-mellan-rutor', () => {
  it('places a walking figure part way between its tiles, as its sprite is drawn', () => {
    const from = { people: [person('a', 3, 0), person('b', 5, 5)] };
    const to = {
      people: [person('a', 3, 1), person('b', 5, 5), person('c', 1, 1)],
    };
    const halfway = boardingMovingLightFigures(from, to, 0.5);
    expect(halfway.map((figure) => figure.position)).toEqual([
      { q: 3, r: 0.5 },
      { q: 5, r: 5 },
      { q: 1, r: 1 },
    ]);
    expect(boardingMovingLightFigures(from, to, 1)).toBe(to.people);
  });

  it('casts the shadow from between the tiles, not from where the figure started or ends', () => {
    const light = lamp(0, 0);
    const shadowAt = (q: number, r: number) =>
      boardingShadowPolygon(light, occluders(person('a', q, r))[0]!);
    const [midway] = boardingMovingLightFigures(
      { people: [person('a', 3, 0)] },
      { people: [person('a', 3, 1)] },
      0.5,
    );
    const between = boardingShadowPolygon(
      light,
      boardingFigureOccluders([midway!])[0]!,
    );
    // Just behind the figure, on the ray from the lamp through it.
    const behind = { q: 3.3, r: 0.55 };
    expect(inside(between, behind)).toBe(true);
    expect(inside(shadowAt(3, 0), behind)).toBe(false);
    expect(inside(shadowAt(3, 1), behind)).toBe(false);
  });
});

describe('bordning-jamn-bildfrekvens', () => {
  it('drops sight outline points that lie in line along a wall and keeps every corner', () => {
    const wall = Array.from({ length: 1000 }, (_, index) => ({
      x: index / 10,
      y: 0,
    }));
    const outline = [
      { x: 0, y: 50 },
      ...wall,
      { x: 100, y: 50 },
      { x: 50, y: 80 },
    ];
    expect(boardingSimplifiedOutline(outline, 0.1)).toEqual([
      { x: 0, y: 50 },
      { x: 0, y: 0 },
      { x: 99.9, y: 0 },
      { x: 100, y: 50 },
      { x: 50, y: 80 },
    ]);
  });

  it('keeps an arc within the tolerance of the drawn outline', () => {
    const arc = Array.from({ length: 181 }, (_, index) => {
      const angle = (index / 180) * Math.PI;
      return { x: 100 * Math.cos(angle), y: 100 * Math.sin(angle) };
    });
    const simplified = boardingSimplifiedOutline(arc, 0.1);
    expect(simplified.length).toBeLessThan(arc.length);
    expect(simplified.length).toBeGreaterThan(10);
    for (const point of arc) {
      const nearest = Math.min(
        ...simplified.slice(1).map((end, index) => {
          const start = simplified[index]!;
          const dx = end.x - start.x,
            dy = end.y - start.y;
          const t = Math.max(
            0,
            Math.min(
              1,
              ((point.x - start.x) * dx + (point.y - start.y) * dy) /
                (dx * dx + dy * dy),
            ),
          );
          return Math.hypot(
            point.x - start.x - t * dx,
            point.y - start.y - t * dy,
          );
        }),
      );
      expect(nearest).toBeLessThanOrEqual(0.1 + 1e-9);
    }
  });
});

describe('jamn-ljuskarta-under-forflyttning: light under a refreshed area', () => {
  it('multiplies light over the whole screen-aligned area, not only the lamp square', () => {
    // The refreshed floor area is the screen rectangle around the lamp's
    // square, which is a rhombus on screen. Its corners were left unlit and
    // flashed bright while someone walked on a large deck.
    const texels = BOARDING_LIGHT_MAP_TEXELS;
    const region = boardingLampReach(lamp(14, 12));
    const corners = [
      { q: region.minQ, r: region.minR },
      { q: region.maxQ, r: region.minR },
      { q: region.maxQ, r: region.maxR },
      { q: region.minQ, r: region.maxR },
    ].map((corner) => boardingIsoCenter(corner));
    const world = {
      left: Math.min(...corners.map((point) => point.x)),
      right: Math.max(...corners.map((point) => point.x)),
      top: Math.min(...corners.map((point) => point.y)),
      bottom: Math.max(...corners.map((point) => point.y)),
    };
    const size = { width: 60 * texels + 2, height: 60 * texels + 2 };
    const area = boardingLightMapAreaFor(world, texels, size);
    const [a, b, c, d, e, f] = boardingLightMapTransform(texels);
    const determinant = a * d - b * c;
    for (const [x, y] of [
      [world.left, world.top],
      [world.right, world.top],
      [world.right, world.bottom],
      [world.left, world.bottom],
    ] as const) {
      const tx = (d * (x - e) - c * (y - f)) / determinant;
      const ty = (a * (y - f) - b * (x - e)) / determinant;
      expect(tx).toBeGreaterThanOrEqual(area.sx);
      expect(tx).toBeLessThanOrEqual(area.ex);
      expect(ty).toBeGreaterThanOrEqual(area.sy);
      expect(ty).toBeLessThanOrEqual(area.ey);
    }
  });
});
