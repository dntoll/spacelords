// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import type p5 from 'p5';
import { BattleMapView } from '../../src/client/views/BattleMapView.js';
import {
  SHIP_SPRITES,
  type ShipSpriteType,
} from '../../src/client/views/ShipImages.js';
import {
  HexCoordinate,
  HexGeometry,
  type Point,
} from '../../src/client/models/HexCoordinate.js';
import { TacticalBattle } from '../../src/client/models/TacticalBattle.js';

const runtime = vi.hoisted(() => ({ sketch: null as p5 | null }));
vi.mock('p5', () => ({
  default: class {
    constructor(configure: (sketch: p5) => void) {
      configure(runtime.sketch!);
    }
    redraw() {
      runtime.sketch!.draw();
    }
    remove() {}
  },
}));
afterEach(() => vi.unstubAllGlobals());

function drawing(imagesLoaded: boolean) {
  let rotation = 0;
  const stack: number[] = [];
  const noses: Point[] = [];
  const markers: Point[] = [];
  const arcs: number[] = [];
  const point = (x: number, y: number): Point => ({
    x: x * Math.cos(rotation) - y * Math.sin(rotation),
    y: x * Math.sin(rotation) + y * Math.cos(rotation),
  });
  const canvas = document.createElement('canvas');
  const noop = () => {};
  const sketch = {
    width: 800,
    height: 600,
    CLOSE: 'close',
    CENTER: 'center',
    PIE: 'pie',
    createCanvas: () => ({ elt: canvas }),
    pixelDensity: noop,
    noLoop: noop,
    textFont: noop,
    loadImage: () =>
      imagesLoaded
        ? Promise.resolve({ width: 384, height: 192 })
        : new Promise(() => {}),
    redraw: () => runtime.sketch!.draw(),
    background: noop,
    push: () => stack.push(rotation),
    pop: () => {
      rotation = stack.pop()!;
    },
    translate: noop,
    scale: noop,
    rotate: (angle: number) => {
      rotation += angle;
    },
    beginShape: noop,
    vertex: noop,
    endShape: noop,
    stroke: noop,
    strokeWeight: noop,
    fill: noop,
    noStroke: noop,
    circle: noop,
    imageMode: noop,
    image: () => noses.push(point(1, 0)),
    triangle: (x: number, y: number) => noses.push(point(x, y)),
    line: (x: number, y: number, endX: number, endY: number) =>
      markers.push(point(endX - x, endY - y)),
    arc: (
      _x: number,
      _y: number,
      _w: number,
      _h: number,
      start: number,
      end: number,
    ) => arcs.push((start + end) / 2),
    rect: noop,
    textAlign: noop,
    textSize: noop,
    text: noop,
  };
  runtime.sketch = sketch as unknown as p5;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  const container = document.createElement('div');
  Object.defineProperties(container, {
    clientWidth: { value: 800 },
    clientHeight: { value: 600 },
  });
  const view = new BattleMapView(container, noop);
  void runtime.sketch.setup();
  return { view, noses, markers, arcs };
}

it.each(Object.keys(SHIP_SPRITES) as ShipSpriteType[])(
  'skeppets-framat-foljer-spriten: %s nose, direction marker and movement agree in all six facings',
  async (type) => {
    const { view, noses, markers, arcs } = drawing(true);
    await Promise.resolve();
    const initial = TacticalBattle.create(
      'orientation',
      { q: 0, r: 0 },
      [
        {
          id: 'friendly',
          side: 'player',
          retreat: null,
          ships: [{ id: 'ship', type, ion: false }],
        },
        {
          id: 'hostile',
          side: 'enemy',
          retreat: null,
          ships: [{ id: 'enemy', type: 'Space pirate', ion: false }],
        },
      ],
      1,
    ).snapshot;
    const origin = new HexCoordinate(2, 4);
    for (let facing = 0; facing < 6; facing++) {
      const battle = TacticalBattle.restore({
        ...initial,
        phase: 'fighting',
        turn: 'player',
        asteroids: [],
        pieces: initial.pieces.map((piece) => ({
          ...piece,
          position: piece.id === 'ship' ? origin : new HexCoordinate(9, 4),
          facing,
        })),
      });
      const state = {
        ...battle.snapshot,
        pieces: battle.snapshot.pieces.filter((piece) => piece.id === 'ship'),
      };
      noses.length = 0;
      markers.length = 0;
      arcs.length = 0;
      view.render(state, 'ship', [], 'Cannon');
      battle.command({ type: 'activate', id: 'ship' });
      battle.command({ type: 'forward' });
      const destination = battle.snapshot.pieces.find(
        (piece) => piece.id === 'ship',
      )!.position!;
      const before = HexGeometry.toPoint(origin);
      const after = HexGeometry.toPoint(
        new HexCoordinate(destination.q, destination.r),
      );
      const direction = { x: after.x - before.x, y: after.y - before.y };
      for (const vector of [noses.at(-1)!, markers.at(-1)!]) {
        expect(
          vector.x * direction.y - vector.y * direction.x,
          `Facing ${facing} points along movement`,
        ).toBeCloseTo(0, 8);
        expect(vector.x * direction.x + vector.y * direction.y).toBeGreaterThan(
          0,
        );
      }
      if (type === 'Fighter' || type === 'Space pirate') {
        const arc = arcs.at(-1)!;
        expect(
          Math.cos(arc) * direction.y - Math.sin(arc) * direction.x,
        ).toBeCloseTo(0, 8);
      }
    }
    view.dispose();
  },
);

it('skeppets-framat-foljer-spriten: the fallback triangle points toward the same forward marker before images load', () => {
  const { view, noses, markers } = drawing(false);
  const initial = TacticalBattle.create(
    'fallback',
    { q: 0, r: 0 },
    [
      {
        id: 'friendly',
        side: 'player',
        retreat: null,
        ships: [{ id: 'ship', type: 'Fighter', ion: false }],
      },
      {
        id: 'hostile',
        side: 'enemy',
        retreat: null,
        ships: [{ id: 'enemy', type: 'Space pirate', ion: false }],
      },
    ],
    1,
  ).snapshot;
  for (let facing = 0; facing < 6; facing++) {
    view.render(
      {
        ...initial,
        pieces: [
          { ...initial.pieces[0]!, position: new HexCoordinate(2, 4), facing },
        ],
      },
      'ship',
      [],
      'Cannon',
    );
    const nose = noses.at(-1)!;
    const marker = markers.at(-1)!;
    expect(nose.x * marker.y - nose.y * marker.x).toBeCloseTo(0, 8);
    expect(nose.x * marker.x + nose.y * marker.y).toBeGreaterThan(0);
  }
  view.dispose();
});
