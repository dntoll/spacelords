import { describe, expect, it } from 'vitest';
import {
  BoardingLighting,
  BOARDING_AMBIENT,
} from '../../src/client/views/boarding/BoardingLighting.js';
import {
  BoardingMap,
  parseBoardingMap,
  type BoardingLight,
} from '../../src/client/models/boarding/BoardingMap.js';
import type {
  BoardingBattleState,
  BoardingFeature,
} from '../../src/client/models/boarding/BoardingBattle.js';
import {
  composeBoardingMaps,
  boardingInterior,
} from '../../src/client/models/boarding/BoardingComposer.js';

const lamp = (q: number, r: number): BoardingLight => ({
  position: { q, r },
  height: 2.2,
  radius: 6,
  intensity: 1,
});
const wall: BoardingFeature = {
  id: 'wall',
  kind: 'wall',
  position: { q: 2, r: 2 },
  hitPoints: 10,
  maxHitPoints: 10,
  open: false,
  locked: false,
  destroyed: false,
  exit: null,
};
function lighting(
  lights = [lamp(0, 2)],
  features: readonly BoardingFeature[] = [],
  smokeCells: BoardingBattleState['smokeCells'] = [],
) {
  const map = new BoardingMap(
    'Lighting',
    9,
    5,
    new Map(),
    new Map(),
    [],
    { player: [], defender: [], civilian: [] },
    [],
    [],
    false,
    new Map(),
    lights,
  );
  return new BoardingLighting(map, { features, smokeCells });
}

describe('ljuskallestyrd-bordningsbelysning', () => {
  it('keeps unlit surfaces readable, attenuates with distance and caps combined sources', () => {
    expect(lighting([]).tile({ q: 0, r: 2 })).toBe(BOARDING_AMBIENT);
    const light = lighting();
    expect(light.tile({ q: 0, r: 2 })).toBeGreaterThan(
      light.tile({ q: 3, r: 2 }),
    );
    expect(light.tile({ q: 7, r: 2 })).toBe(BOARDING_AMBIENT);
    expect(lighting([lamp(0, 2), lamp(0, 2)]).tile({ q: 0, r: 2 })).toBe(1);
  });
  it('uses full barriers even for cutaway walls and responds to doors, destruction and smoke', () => {
    const target = { q: 4, r: 2 };
    expect(lighting(undefined, [wall]).tile(target)).toBe(BOARDING_AMBIENT);
    expect(
      lighting(undefined, [{ ...wall, destroyed: true }]).tile(target),
    ).toBeGreaterThan(BOARDING_AMBIENT);
    expect(lighting(undefined, [{ ...wall, kind: 'door' }]).tile(target)).toBe(
      BOARDING_AMBIENT,
    );
    expect(
      lighting(undefined, [{ ...wall, kind: 'door', open: true }]).tile(target),
    ).toBeGreaterThan(BOARDING_AMBIENT);
    expect(lighting(undefined, [], [wall.position]).tile(target)).toBe(
      BOARDING_AMBIENT,
    );
  });
  it('blocks a ray that touches the corner shared by diagonal barriers', () => {
    const light = lighting(
      [lamp(0, 0)],
      [{ ...wall, position: { q: 1, r: 0 } }],
    );
    expect(light.tile({ q: 2, r: 2 })).toBe(BOARDING_AMBIENT);
  });
  it('reads optional fixed lamps and rejects malformed layers and lamps inside walls', () => {
    const base =
      '[meta]\nwidth=3\nheight=1\nrules=campaign\n[terrain]\nH..\n[objects]\n---\n[rooms]\n---\n[spawns]\n---\n';
    expect(parseBoardingMap(base).lights).toEqual([]);
    expect(parseBoardingMap(base + '[lights]\n-L-\n').lights).toEqual([
      lamp(1, 0),
    ]);
    expect(() => parseBoardingMap(base + '[lights]\nL--\n')).toThrow(/floor/i);
    expect(() => parseBoardingMap(base + '[lights]\n-X-\n')).toThrow(/symbol/i);
    expect(() => parseBoardingMap(base + '[lights]\n--\n')).toThrow(/width/i);
  });
  it('preserves translated and mirrored lamps and lights the composed corridor', () => {
    const interior = boardingInterior('Transport ship');
    const composed = composeBoardingMaps(
      'Transport ship',
      'Transport ship',
    ).map;
    expect(interior.lights.length).toBeGreaterThan(0);
    expect(composed.lights.length).toBe(interior.lights.length * 2 + 1);
    for (const source of interior.lights) {
      expect(
        composed.lights.some(
          (light) =>
            light.position.q === source.position.q &&
            light.position.r === source.position.r,
        ),
      ).toBe(true);
      expect(
        composed.lights.some(
          (light) =>
            light.position.q === composed.width - 1 - source.position.q &&
            light.position.r === source.position.r,
        ),
      ).toBe(true);
    }
    expect(composed.zoneAt(composed.lights.at(-1)!.position)).toBe('bridge');
  });
});

describe('vertexljus-i-bordning', () => {
  it('samples four distinct floor vertices and lets wall faces receive light without self shadow', () => {
    const light = lighting([lamp(0, 2)], [wall]);
    const floor = light.surface({ q: 1, r: 2 }, 'floor');
    expect(floor).toHaveLength(4);
    expect(new Set(floor).size).toBeGreaterThan(1);
    // The visible south-east face points toward positive q.
    const frontLight = lighting([lamp(4, 2)], [wall]);
    expect(
      frontLight
        .surface(wall.position, 'southEast', 2.4)
        .some((value) => value > BOARDING_AMBIENT),
    ).toBe(true);
    expect(
      frontLight
        .surface(wall.position, 'top', 0.4)
        .some((value) => value > BOARDING_AMBIENT),
    ).toBe(true);
  });
});

describe('tileljus-for-sprites', () => {
  it('uses a center visibility test rather than averaging illuminated corners', () => {
    const light = lighting([lamp(0, 2)], [wall]);
    const target = { q: 4, r: 3 };
    expect(
      light.surface(target, 'floor').some((value) => value > BOARDING_AMBIENT),
    ).toBe(true);
    expect(light.tile(target)).toBe(BOARDING_AMBIENT);
    expect(light.tile({ q: 0, r: 2 })).toBeGreaterThan(BOARDING_AMBIENT);
  });
});

it('vertexljus-i-bordning: triangular interpolation preserves every corner and stays continuous across the diagonal', async () => {
  const { boardingQuadLight } =
    await import('../../src/client/views/boarding/BoardingLightPainter.js');
  const values = [0.65, 0.8, 1, 0.7];
  expect(boardingQuadLight(values, 0, 0)).toBe(values[0]);
  expect(boardingQuadLight(values, 1, 0)).toBe(values[1]);
  expect(boardingQuadLight(values, 1, 1)).toBe(values[2]);
  expect(boardingQuadLight(values, 0, 1)).toBe(values[3]);
  expect(boardingQuadLight(values, 0.5, 0.5)).toBeCloseTo(0.825);
  expect(boardingQuadLight(values, 0.5, 0.500001)).toBeCloseTo(
    boardingQuadLight(values, 0.500001, 0.5),
  );
});

it('ljuskallestyrd-bordningsbelysning: all shipped interiors have valid lamps, and lighting cache keys track barriers and smoke', () => {
  for (const type of [
    'Transport ship',
    'Colony ship',
    'Exploration ship',
    'Salvage ship',
    'Civilian shuttle',
    'Space pirate',
    'Raptor',
  ] as const) {
    const map = boardingInterior(type);
    expect(map.lights.length).toBeGreaterThan(0);
    for (const light of map.lights)
      expect(map.terrainAt(light.position)).toBe('floor');
  }
  const signature = BoardingLighting.signature({
    features: [wall],
    smokeCells: [],
  });
  expect(
    BoardingLighting.signature({
      features: [{ ...wall, hitPoints: 1 }],
      smokeCells: [],
    }),
  ).toBe(signature);
  expect(
    BoardingLighting.signature({
      features: [{ ...wall, open: true }],
      smokeCells: [],
    }),
  ).not.toBe(signature);
  expect(
    BoardingLighting.signature({
      features: [wall],
      smokeCells: [wall.position],
    }),
  ).not.toBe(signature);
});
