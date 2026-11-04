// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { BoardingLighting } from '../../src/client/views/BoardingLighting.js';
import type p5 from 'p5';
import { BoardingMapView } from '../../src/client/views/BoardingMapView.js';
import {
  boardingCeilingLight,
  type BoardingLight,
  BoardingMap,
} from '../../src/client/models/BoardingMap.js';
import { BoardingBattle } from '../../src/client/models/BoardingBattle.js';
import {
  boardingIsoCamera,
  boardingIsoCenter,
} from '../../src/client/views/BoardingProjection.js';
import { boardingHeight } from '../../src/client/views/BoardingScale.js';
import { boardingCharacterSprite } from '../../src/client/views/BoardingCharacterSprite.js';

const runtime = vi.hoisted(() => ({ sketch: null as p5 | null }));
vi.mock('p5', () => ({
  default: class {
    constructor(configure: (sketch: p5) => void) {
      configure(runtime.sketch!);
    }
    get width() {
      return 800;
    }
    get height() {
      return 600;
    }
    redraw() {
      runtime.sketch!.draw();
    }
    noLoop() {}
    loop() {}
    remove() {}
  },
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function scene(discovered: boolean, lights: readonly BoardingLight[] = []) {
  const calls: { kind: string; alpha: number; y: number }[] = [];
  const canvas = document.createElement('canvas');
  canvas.setPointerCapture = () => {};
  const masks: unknown[][] = [];
  const imageLights: number[] = [];
  const pendingImages: ((image: unknown) => void)[] = [];
  let tint = 255;
  const context = {
    globalAlpha: 1,
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    clip() {},
    transform() {},
    drawImage(...args: unknown[]) {
      masks.push(args);
    },
    save() {
      stack.push(this.globalAlpha);
    },
    restore() {
      this.globalAlpha = stack.pop()!;
    },
  };
  const stack: number[] = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createImageData: (width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData() {},
  } as unknown as CanvasRenderingContext2D);
  const noop = () => {};
  const base = {
    width: 800,
    height: 600,
    createCanvas: () => ({ elt: canvas }),
    drawingContext: context,
    loadImage: () => new Promise((resolve) => pendingImages.push(resolve)),
    tint: (value: number) => {
      tint = value;
    },
    image: () => {
      imageLights.push(tint);
    },
    redraw: () => runtime.sketch!.draw(),
    background: () => {
      calls.length = 0;
      masks.length = 0;
      imageLights.length = 0;
    },
    quad: (...points: number[]) =>
      calls.push({ kind: 'wall', alpha: context.globalAlpha, y: points[1]! }),
    circle: (_x: number, y: number) =>
      calls.push({ kind: 'person', alpha: context.globalAlpha, y }),
  };
  runtime.sketch = new Proxy(base, {
    get(target, prop) {
      return prop in target ? (Reflect.get(target, prop) as unknown) : noop;
    },
  }) as unknown as p5;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  const ground = new Map<string, 'floor' | 'wall'>();
  for (let q = 0; q < 6; q++)
    for (let r = 0; r < 6; r++)
      ground.set(`${q},${r}`, q === 4 && r === 4 ? 'wall' : 'floor');
  const map = new BoardingMap(
    'Metric test',
    6,
    6,
    ground,
    new Map(),
    [{ id: 'wall', kind: 'wall', position: { q: 4, r: 4 } }],
    { player: [{ q: 3, r: 3 }], defender: [{ q: 1, r: 1 }], civilian: [] },
    [],
    [],
    false,
    new Map(),
    lights,
  );
  const battle = BoardingBattle.create(map, 17);
  const player = battle.snapshot.people.find(
    (person) => person.side === 'player',
  )!;
  const state = {
    ...battle.snapshot,
    people: [player],
    visibleCells: [],
    exploredCells: discovered
      ? [
          { q: 3, r: 3 },
          { q: 4, r: 4 },
        ]
      : [{ q: 4, r: 4 }],
  };
  const container = document.createElement('div');
  Object.defineProperties(container, {
    clientWidth: { value: 800 },
    clientHeight: { value: 600 },
  });
  const select = vi.fn();
  const view = new BoardingMapView(container, map, select);
  void runtime.sketch.setup();
  view.render(state, null, null, []);
  const click = (point: { x: number; y: number }) => {
    const camera = boardingIsoCamera(map, { width: 800, height: 600 });
    for (const name of ['pointerdown', 'pointerup']) {
      const event = new MouseEvent(name, {
        clientX: camera.offset.x + point.x * camera.scale,
        clientY: camera.offset.y + point.y * camera.scale,
      });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      canvas.dispatchEvent(event);
    }
  };
  const loadImages = async () => {
    for (const resolve of pendingImages)
      resolve({
        width: 512,
        height: 128,
        canvas: document.createElement('canvas'),
      });
    await Promise.resolve();
    view.render(state, null, null, []);
  };
  return {
    view,
    calls,
    select,
    click,
    player,
    state,
    masks,
    imageLights,
    loadImages,
    map,
  };
}

it('genomskinliga-skymmande-vaggar: fallback walls are opaque 40 cm sections, follow people in depth and allow picking the person behind', () => {
  const { view, calls, select, click, player } = scene(true);
  expect(
    calls.filter((call) => call.kind === 'wall').length,
  ).toBeGreaterThanOrEqual(3);
  const wallTop = boardingIsoCenter({ q: 4, r: 4 }).y - boardingHeight(0.4);
  expect(
    Math.min(
      ...calls.filter((call) => call.kind === 'wall').map((call) => call.y),
    ),
  ).toBeCloseTo(wallTop - 16);
  expect(
    calls
      .filter((call) => call.kind === 'wall')
      .every((call) => call.alpha === 1),
  ).toBe(true);
  expect(calls.findIndex((call) => call.kind === 'person')).toBeLessThan(
    calls.findIndex((call) => call.kind === 'wall'),
  );
  const sprite = boardingCharacterSprite(
    'player',
    boardingIsoCenter(player.position),
    false,
  ).destination;
  click({ x: sprite.x + sprite.width / 2, y: sprite.y + sprite.height / 2 });
  expect(select).toHaveBeenLastCalledWith(player.position, player.id);
  click(boardingIsoCenter({ q: 4, r: 4 }));
  expect(select).toHaveBeenLastCalledWith({ q: 4, r: 4 }, undefined);
  view.dispose();
});

it('genomskinliga-skymmande-vaggar: unknown floor leaves a wall opaque and a hidden enemy never gets a sprite', () => {
  const { view, calls, state } = scene(false);
  expect(
    calls
      .filter((call) => call.kind === 'wall')
      .every((call) => call.alpha === 1),
  ).toBe(true);
  const enemy = {
    ...state.people[0]!,
    id: 'hidden',
    side: 'defender' as const,
  };
  view.render({ ...state, people: [enemy] }, null, null, []);
  expect(calls.some((call) => call.kind === 'person')).toBe(false);
  view.render({ ...state, people: [], exploredCells: [] }, null, null, []);
  expect(calls.some((call) => call.kind === 'wall')).toBe(false);
  view.dispose();
});

it('ljuskallestyrd-bordningsbelysning / vertexljus-i-bordning: sight changes reuse identical physical light masks', () => {
  const { view, state, masks } = scene(true, [
    boardingCeilingLight({ q: 2, r: 3 }),
  ]);
  const first = masks.map((args) => args[0]);
  expect(first.length).toBeGreaterThan(0);
  masks.length = 0;
  view.render({ ...state, visibleCells: state.exploredCells }, null, null, []);
  expect(masks.map((args) => args[0])).toEqual(first);
  view.dispose();
});

it('vertexljus-i-bordning / tileljus-for-sprites: loaded textures keep cutaway masks and sprites interpolate physical tile light during movement', async () => {
  const sources = [boardingCeilingLight({ q: 1, r: 3 })];
  const { view, state, player, masks, imageLights, loadImages, map } = scene(
    true,
    sources,
  );
  await loadImages();
  const lighting = new BoardingLighting(map, state);
  expect(masks.filter((args) => args.length === 3)).toHaveLength(4);
  const wallTextures = masks.filter((args) => args.length === 9);
  expect(wallTextures).toHaveLength(2);
  expect(wallTextures.every((args) => Number(args[2]) > 0)).toBe(true);
  expect(imageLights).toEqual([255 * lighting.tile(player.position)]);
  const rememberedLight = imageLights[0];
  view.render({ ...state, visibleCells: state.exploredCells }, null, null, []);
  expect(imageLights[0]).toBe(rememberedLight);
  const clock = vi.spyOn(performance, 'now').mockReturnValue(1000);
  const target = { q: 5, r: 3 };
  const next = { ...state, people: [{ ...player, position: target }] };
  const animation = view.playMotion(state, next);
  clock.mockReturnValue(1130);
  runtime.sketch!.draw();
  expect(imageLights[0]).toBeCloseTo(
    (255 * (lighting.tile(player.position) + lighting.tile(target))) / 2,
  );
  clock.mockReturnValue(1260);
  runtime.sketch!.draw();
  expect(imageLights[0]).toBeCloseTo(255 * lighting.tile(target));
  await animation;
  view.dispose();
});
