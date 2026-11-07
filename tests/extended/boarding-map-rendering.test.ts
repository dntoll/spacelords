// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { BoardingLighting } from '../../src/client/views/boarding/BoardingLighting.js';
import type p5 from 'p5';
import { BoardingMapView } from '../../src/client/views/boarding/BoardingMapView.js';
import {
  boardingCeilingLight,
  type BoardingLight,
  BoardingMap,
} from '../../src/client/models/boarding/BoardingMap.js';
import { BoardingBattle } from '../../src/client/models/boarding/BoardingBattle.js';
import {
  boardingIsoCamera,
  boardingIsoCenter,
} from '../../src/client/views/boarding/BoardingProjection.js';
import {
  BOARDING_METERS,
  boardingHeight,
} from '../../src/client/views/boarding/BoardingScale.js';
import {
  BOARDING_FOOT_PLANT,
  boardingCharacterSprite,
} from '../../src/client/views/boarding/BoardingCharacterSprite.js';
import { boardingEdgeTargetIndicators } from '../../src/client/views/boarding/BoardingTargetIndicatorLayout.js';

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
    resizeCanvas() {}
    loop() {}
    remove() {}
  },
}));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function scene(discovered: boolean, lights: readonly BoardingLight[] = []) {
  const calls: { kind: string; alpha: number; y: number }[] = [];
  const lines: { stroke: string; points: number[] }[] = [];
  const strokes: string[] = [];
  const texts: string[] = [];
  const canvas = document.createElement('canvas');
  canvas.setPointerCapture = () => {};
  const masks: unknown[][] = [];
  const imageLights: number[] = [];
  const pendingImages: ((image: unknown) => void)[] = [];
  let tint = 255;
  let currentStroke = '';
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
    stroke: (value: string) => {
      currentStroke = value;
      strokes.push(value);
    },
    line: (...points: number[]) =>
      lines.push({ stroke: currentStroke, points }),
    text: (value: string) => texts.push(value),
    textWidth: (value: string) => value.length * 7,
    redraw: () => runtime.sketch!.draw(),
    background: () => {
      calls.length = 0;
      lines.length = 0;
      strokes.length = 0;
      texts.length = 0;
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
  let resize = () => {};
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
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
  const clickScreen = (point: { x: number; y: number }) => {
    for (const name of ['pointerdown', 'pointerup']) {
      const event = new MouseEvent(name, {
        clientX: point.x,
        clientY: point.y,
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
    resize: () => resize(),
    calls,
    select,
    click,
    clickScreen,
    player,
    state,
    masks,
    imageLights,
    loadImages,
    map,
    lines,
    strokes,
    texts,
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
    'standing',
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

it('traffchans-vid-synliga-fiender: keeps hit percentages readable when a mobile map is zoomed out', () => {
  const { view, state, player, map } = scene(true);
  const textSize = vi.fn();
  Object.assign(runtime.sketch!, { textSize, textWidth: () => 24 });
  view.render(
    state,
    null,
    null,
    [],
    [
      {
        id: player.id,
        chance: 75,
        defense: 10,
        reason: null,
        affordable: true,
      },
    ],
  );
  view.zoom(0.2);
  const camera = boardingIsoCamera(map, { width: 800, height: 600 });
  expect(
    Number(textSize.mock.lastCall?.[0]) * camera.scale * 0.2,
  ).toBeGreaterThanOrEqual(11);
  view.dispose();
});

it('bordning-utan-riktningspilar / bordning-utan-sikt-och-eldrutor / senast-sedd-fiende-med-fragetecken: simplifies tactical map marks', () => {
  const { view, state, player, lines, strokes, texts } = scene(true);
  view.render(
    {
      ...state,
      people: [
        player,
        {
          ...player,
          id: 'remembered',
          side: 'defender',
          position: { q: 1, r: 1 },
        },
      ],
      lastKnownEnemies: [{ id: 'remembered', position: { q: 1, r: 1 } }],
    },
    player.id,
    null,
    [],
  );
  expect(lines.some((line) => line.stroke === '#ffffff')).toBe(false);
  expect(strokes).not.toContain('#ef6461');
  expect(strokes).not.toContain('#5ac8fa');
  expect(texts).toContain('?');
  view.render(
    {
      ...state,
      people: [
        player,
        {
          ...player,
          id: 'remembered',
          side: 'defender',
          status: 'dead',
          position: { q: 1, r: 1 },
        },
      ],
      lastKnownEnemies: [{ id: 'remembered', position: { q: 1, r: 1 } }],
    },
    player.id,
    null,
    [],
  );
  expect(texts).not.toContain('?');
  view.dispose();
});

it('kantindikator-for-synlig-fiende: clicking an edge target selects and centers it at the same zoom', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const { view, state, player, map, select, clickScreen } = scene(true);
  const viewport = { left: 650, top: 120, right: 790, bottom: 500 };
  view.setViewportProvider(() => viewport);
  view.render(
    state,
    null,
    null,
    [],
    [
      {
        id: player.id,
        chance: 75,
        defense: 10,
        reason: null,
        affordable: true,
      },
    ],
  );
  const camera = boardingIsoCamera(map, { width: 800, height: 600 });
  const body = boardingIsoCenter(player.position);
  const edge = boardingEdgeTargetIndicators(
    [
      {
        id: player.id,
        x: body.x * camera.scale + camera.offset.x,
        y:
          (body.y +
            BOARDING_FOOT_PLANT -
            boardingHeight(BOARDING_METERS.rifle)) *
            camera.scale +
          camera.offset.y,
      },
    ],
    viewport,
  )[0]!;
  const scale = view.cameraSnapshot.scale;
  clickScreen(edge);
  await Promise.resolve();
  expect(select).toHaveBeenLastCalledWith(
    player.position,
    player.id,
    'center-target',
  );
  expect(view.cameraSnapshot.scale).toBe(scale);
  expect(
    view.cameraSnapshot.offset.x + boardingIsoCenter(player.position).x * scale,
  ).toBeCloseTo((viewport.left + viewport.right) / 2);
  view.dispose();
});

it('kamerafokus-vid-bordningssoldatbyte: reduced motion applies the final focus instantly at the original zoom', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const { view, player } = scene(true);
  view.zoom(3);
  const scale = view.cameraSnapshot.scale;
  view.setViewportProvider(() => ({
    left: 400,
    top: 200,
    right: 700,
    bottom: 500,
  }));
  await view.focusActor(player.id);
  expect(view.cameraSnapshot.scale).toBe(scale);
  expect(
    view.cameraSnapshot.offset.x + boardingIsoCenter(player.position).x * scale,
  ).toBeCloseTo(550);
  view.dispose();
});

it('kameraoverblick-fore-bordningsskott: frames two visible combatants but never reveals a missing hidden shooter', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const { view, state, player } = scene(true);
  const defender = {
    ...player,
    id: 'visible-defender',
    side: 'defender' as const,
    position: { q: 5, r: 0 },
  };
  view.render({ ...state, people: [player, defender] }, null, null, []);
  view.zoom(3);
  view.setViewportProvider(() => ({
    left: 250,
    top: 150,
    right: 550,
    bottom: 450,
  }));
  const close = view.cameraSnapshot;
  await view.frameShot(player.position, defender.position);
  expect(view.cameraSnapshot.scale).toBeLessThan(close.scale);

  view.render({ ...state, people: [player] }, null, null, []);
  const hidden = view.cameraSnapshot;
  await view.frameShot(player.position, defender.position);
  expect(view.cameraSnapshot).toEqual(hidden);
  view.dispose();
});

it('kamerafokus-vid-bordningssoldatbyte: a manual zoom cancels pending phases and suppresses later automatic changes in that presentation', async () => {
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const { view, player } = scene(true);
  view.setViewportProvider(() => ({
    left: 400,
    top: 200,
    right: 700,
    bottom: 500,
  }));
  view.beginPresentation();
  const focus = view.focusActor(player.id);
  view.zoom(0.8);
  const manual = view.cameraSnapshot;
  await focus;
  await view.focusActor(player.id);
  expect(view.cameraSnapshot).toEqual(manual);
  view.endPresentation();
  view.dispose();
});

it('kamerafokus-vid-bordningssoldatbyte: resize and disposal settle pending focus without stale camera updates', async () => {
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const { view, player, resize } = scene(true);
  view.setViewportProvider(() => ({
    left: 400,
    top: 200,
    right: 700,
    bottom: 500,
  }));
  const focus = view.focusActor(player.id);
  resize();
  await focus;
  const afterResize = view.cameraSnapshot;
  const next = view.focusActor(player.id);
  view.dispose();
  await next;
  expect(view.cameraSnapshot).toEqual(afterResize);
});

it('kamerafokus-vid-bordningssoldatbyte: fallback clocks finish all phases when browser animation frames are throttled', async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const { view, player } = scene(true);
  const scale = view.cameraSnapshot.scale;
  view.setViewportProvider(() => ({
    left: 400,
    top: 200,
    right: 700,
    bottom: 500,
  }));
  const focus = view.focusActor(player.id);
  await vi.advanceTimersByTimeAsync(1200);
  await focus;
  expect(view.cameraSnapshot.scale).toBe(scale);
  expect(view.cameraSnapshot.offset.x).toBeCloseTo(550);
  view.dispose();
});

it('kamerafokus-vid-bordningssoldatbyte: a new already-visible focus cancels an older pending focus', async () => {
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const { view, player } = scene(true);
  view.setViewportProvider(() => ({
    left: 400,
    top: 200,
    right: 700,
    bottom: 500,
  }));
  const completed = vi.fn();
  const pending = view.focusActor(player.id).then(completed);
  view.setViewportProvider(() => ({
    left: -10000,
    top: -10000,
    right: 10000,
    bottom: 10000,
  }));
  await view.focusActor(player.id);
  await Promise.resolve();
  expect(completed).toHaveBeenCalledOnce();
  view.dispose();
  await pending;
});
