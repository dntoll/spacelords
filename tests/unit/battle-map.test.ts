// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import type p5 from 'p5';
import { BattleMapView } from '../../src/client/views/battle/BattleMapView.js';
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
import { createTestBattle } from '../../src/client/models/battle/TestBattle.js';

const runtime = vi.hoisted(() => ({ sketch: null as p5 | null }));
vi.mock('p5', () => ({
  default: class {
    constructor(configure: (sketch: p5) => void) {
      configure(runtime.sketch!);
    }
    get width() {
      return runtime.sketch!.width;
    }
    get height() {
      return runtime.sketch!.height;
    }
    redraw() {
      runtime.sketch!.draw();
    }
    remove() {}
  },
}));
afterEach(() => vi.unstubAllGlobals());

function drawing(
  imagesLoaded: boolean,
  select: (hex: { q: number; r: number }) => void = () => {},
) {
  let rotation = 0;
  const stack: number[] = [];
  const noses: Point[] = [];
  const markers: Point[] = [];
  const arcs: number[] = [];
  const fills: unknown[][] = [];
  const texts: string[] = [];
  const images: { url: string; angle: number }[] = [];
  const point = (x: number, y: number): Point => ({
    x: x * Math.cos(rotation) - y * Math.sin(rotation),
    y: x * Math.sin(rotation) + y * Math.cos(rotation),
  });
  const canvas = document.createElement('canvas');
  canvas.setPointerCapture = () => {};
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
    loadImage: (url: string) =>
      imagesLoaded
        ? Promise.resolve({ width: 384, height: 192, url })
        : new Promise(() => {}),
    redraw: () => runtime.sketch!.draw(),
    background: () => {
      images.length = 0;
      fills.length = 0;
      texts.length = 0;
    },
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
    fill: (...values: unknown[]) => fills.push(values),
    noStroke: noop,
    noFill: noop,
    drawingContext: { globalAlpha: 1 },
    circle: noop,
    imageMode: noop,
    image: (image: { url: string }) => {
      images.push({ url: image.url, angle: rotation });
      noses.push(point(1, 0));
    },
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
    text: (value: string) => texts.push(value),
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
  container.append(canvas);
  Object.defineProperties(container, {
    clientWidth: { value: 800 },
    clientHeight: { value: 600 },
  });
  const view = new BattleMapView(container, select);
  void runtime.sketch.setup();
  return {
    view,
    noses,
    markers,
    arcs,
    images,
    fills,
    texts,
    container,
    canvas,
  };
}

it('flyktzoner-i-rymdstrid: paints and labels all six escape hexes', () => {
  const { view, fills, texts } = drawing(false);
  view.render(createTestBattle().snapshot, null, null, 'Cannon');
  expect(texts.filter((label) => label === 'Escape')).toHaveLength(6);
  expect(fills.filter(([color]) => color === '#176342')).toHaveLength(6);
  view.dispose();
});

it('avfyra-pa-markerat-mal / begransad-stridskamera: drag, pinch, cancelled pointers and wheel never become a shot', () => {
  const select = vi.fn();
  const { view, canvas } = drawing(false, select);
  const state = createTestBattle().snapshot;
  view.render(state, null, { q: 4, r: 3 }, 'Cannon');
  const pointer = (type: string, id: number, x: number, y: number) => {
    const event = new MouseEvent(type, { clientX: x, clientY: y });
    Object.defineProperty(event, 'pointerId', { value: id });
    canvas.dispatchEvent(event);
  };
  pointer('pointerdown', 1, 400, 300);
  pointer('pointermove', 1, 480, 300);
  pointer('pointerup', 1, 480, 300);
  pointer('pointerdown', 2, 350, 300);
  pointer('pointerdown', 3, 450, 300);
  pointer('pointermove', 2, 320, 300);
  pointer('pointerup', 2, 320, 300);
  pointer('pointermove', 3, 451, 300);
  pointer('pointerup', 3, 451, 300);
  pointer('pointerdown', 4, 400, 300);
  pointer('pointercancel', 4, 400, 300);
  pointer('pointerup', 4, 400, 300);
  canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -200 }));
  expect(select).not.toHaveBeenCalled();
  pointer('pointerdown', 5, 400, 300);
  pointer('pointerup', 5, 400, 300);
  expect(select).toHaveBeenCalledOnce();
  select.mockClear();
  canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  canvas.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', repeat: true }),
  );
  expect(select).toHaveBeenCalledExactlyOnceWith({ q: 4, r: 3 });
  view.dispose();
});

it('skadepartiklar-i-strid: disposing during flight cancels its frame and resolves presentation', async () => {
  const { view, container } = drawing(false);
  const cancel = vi.fn();
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 123),
  );
  vi.stubGlobal('cancelAnimationFrame', cancel);
  const state = createTestBattle().snapshot;
  view.render(state, null, null, 'Cannon');
  const complete = vi.fn();
  const pending = view
    .animateShot({
      id: 'shot',
      weapon: 'Cannon',
      from: { q: 1, r: 3 },
      at: { q: 4, r: 3 },
      impacts: [],
    })
    .then(complete);
  expect(container.dataset.shotStage).toBe('flight');
  expect(complete).not.toHaveBeenCalled();
  view.dispose();
  await pending;
  expect(cancel).toHaveBeenCalledWith(123);
  expect(complete).toHaveBeenCalledOnce();
  expect(container.dataset.shotStage).toBeUndefined();
});

it('avslutad-manoveranimation: completes when the browser does not deliver another animation frame', async () => {
  vi.useFakeTimers();
  try {
    const { view } = drawing(false);
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 123),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const state = createTestBattle().snapshot;
    view.render(state, null, null, 'Cannon');
    const maneuver = {
      id: 'first-maneuver',
      shipId: state.pieces[0]!.id,
      from: { position: { q: 1, r: 3 }, facing: 0 },
      steps: [{ position: { q: 2, r: 3 }, facing: 0 }],
    };
    const complete = vi.fn();
    const pending = view.animateManeuver(maneuver).then(complete);

    await vi.advanceTimersByTimeAsync(1_000);

    expect(complete).toHaveBeenCalledOnce();
    await pending;
    view.dispose();
  } finally {
    vi.useRealTimers();
  }
});

it('avslutad-manoveranimation: accepts an animation frame timestamp just before the start time', async () => {
  const { view } = drawing(false);
  let frame: FrameRequestCallback | undefined;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const now = vi.spyOn(performance, 'now').mockReturnValue(100);
  const state = createTestBattle().snapshot;
  view.render(state, null, null, 'Cannon');
  const pending = view.animateManeuver({
    id: 'early-frame',
    shipId: state.pieces[0]!.id,
    from: { position: { q: 1, r: 3 }, facing: 0 },
    steps: [{ position: { q: 2, r: 3 }, facing: 0 }],
  });
  expect(() => frame!(99)).not.toThrow();
  view.dispose();
  await pending;
  now.mockRestore();
});

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
      view.render(state, 'ship', null, 'Cannon');
      battle.command({ type: 'activate', id: 'ship' });
      battle.command({ type: 'maneuver', speed: 1, direction: 0 });
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
      null,
      'Cannon',
    );
    const nose = noses.at(-1)!;
    const marker = markers.at(-1)!;
    expect(nose.x * marker.y - nose.y * marker.x).toBeCloseTo(0, 8);
    expect(nose.x * marker.x + nose.y * marker.y).toBeGreaterThan(0);
  }
  view.dispose();
});

it('dockningskorridor-sprite: draws one aligned corridor per docked pair and none after undocking', async () => {
  const { view, images } = drawing(true);
  await Promise.resolve();
  const state = createTestBattle().snapshot;
  const first = state.pieces[0]!;
  const second = state.pieces[1]!;
  const a = new HexCoordinate(2, 3);
  const b = new HexCoordinate(2, 4);
  const docked = {
    ...state,
    pieces: [
      {
        ...first,
        position: a,
        dockedWith: second.id,
        status: 'active' as const,
      },
      {
        ...second,
        position: b,
        dockedWith: first.id,
        status: 'active' as const,
      },
    ],
  };
  images.length = 0;
  view.render(docked, null, null, 'Cannon');
  const corridors = images.filter((image) =>
    image.url.includes('docking-corridor'),
  );
  expect(corridors).toHaveLength(1);
  const start = HexGeometry.toPoint(a);
  const end = HexGeometry.toPoint(b);
  expect(corridors[0]!.angle).toBeCloseTo(
    Math.atan2(end.y - start.y, end.x - start.x),
  );
  images.length = 0;
  view.render(
    {
      ...docked,
      pieces: [
        { ...first, position: a },
        { ...second, position: b },
      ],
    },
    null,
    null,
    'Cannon',
  );
  expect(
    images.filter((image) => image.url.includes('docking-corridor')),
  ).toHaveLength(0);
  view.dispose();
});
