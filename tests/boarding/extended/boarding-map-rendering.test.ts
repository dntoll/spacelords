// @vitest-environment jsdom
import { BOARDING_LIGHT_MAP_TEXELS } from '../../../src/client/boarding/views/rendering/BoardingLightMap.js';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { BoardingLighting } from '../../../src/client/boarding/views/rendering/BoardingLighting.js';
import type p5 from 'p5';
import type { BoardingMapView as BoardingMapViewClass } from '../../../src/client/boarding/views/battle/BoardingMapView.js';
import {
  boardingCeilingLight,
  type BoardingLight,
  BoardingMap,
} from '../../../src/client/boarding/models/map/BoardingMap.js';
import { BoardingBattle } from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import {
  BOARDING_TILE_HEIGHT,
  boardingIsoCamera,
  boardingIsoCenter,
} from '../../../src/client/boarding/views/rendering/BoardingProjection.js';
import {
  BOARDING_METERS,
  boardingHeight,
} from '../../../src/client/boarding/views/rendering/BoardingScale.js';
import {
  BOARDING_FOOT_PLANT,
  boardingCharacterSprite,
} from '../../../src/client/boarding/views/rendering/BoardingCharacterSprite.js';
import { boardingEdgeTargetIndicators } from '../../../src/client/boarding/views/battle/BoardingTargetIndicatorLayout.js';
import factionSpritesUrl from '../../../src/client/boarding/assets/characters/directional-faction-sprites.webp';

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
// snabb-testsvit runs with isolate: false, so another file may already have
// loaded the view with the real p5. Reload it after the mock is registered.
let BoardingMapView: typeof BoardingMapViewClass;
beforeAll(async () => {
  vi.resetModules();
  ({ BoardingMapView } =
    await import('../../../src/client/boarding/views/battle/BoardingMapView.js'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function scene(discovered: boolean, lights: readonly BoardingLight[] = []) {
  const calls: { kind: string; alpha: number; y: number }[] = [];
  const lines: { stroke: string; points: number[] }[] = [];
  const strokes: string[] = [];
  const fills: unknown[][] = [];
  const texts: string[] = [];
  const canvas = document.createElement('canvas');
  canvas.setPointerCapture = () => {};
  const masks: unknown[][] = [];
  const imageLights: number[] = [];
  const pendingImages: {
    url: string;
    resolve: (image: unknown) => void;
  }[] = [];
  let spriteCanvas: HTMLCanvasElement | null = null;
  let currentStroke = '';
  const effectCalls: string[] = [];
  // halvskydd-markering-sammanfogad: fills on the canvas and strokes on the
  // offscreen outline layer.
  const contextFills: string[] = [];
  const layerStrokes: string[] = [];
  const context = {
    canvas,
    fillStyle: '',
    setTransform() {},
    getTransform: () => ({}),
    globalAlpha: 1,
    filter: 'none',
    globalCompositeOperation: 'source-over',
    // bordning-explosioner-och-forstorelse: record particle drawing.
    arc() {
      effectCalls.push('arc');
    },
    rect() {
      effectCalls.push('rect');
    },
    ellipse() {
      effectCalls.push('ellipse');
    },
    fill() {
      contextFills.push(this.fillStyle);
    },
    stroke() {},
    createRadialGradient: () => ({ addColorStop() {} }),
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    clip() {},
    clearRect() {},
    transform() {},
    drawImage(...args: unknown[]) {
      // tileljus-for-sprites: sprites are lit with a brightness filter.
      if (spriteCanvas && args[0] === spriteCanvas) {
        const brightness = /brightness\(([^)]+)\)/.exec(this.filter)?.[1];
        imageLights.push(255 * (brightness ? Number(brightness) : 1));
      } else masks.push(args);
    },
    save() {
      stack.push({ alpha: this.globalAlpha, filter: this.filter });
    },
    restore() {
      const saved = stack.pop()!;
      this.globalAlpha = saved.alpha;
      this.filter = saved.filter;
    },
  };
  const stack: { alpha: number; filter: string }[] = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createImageData: (width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData() {},
    // ljuskarta-i-bordning: the light map paints lit polygons offscreen.
    fillRect() {},
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    clip() {},
    fill() {},
    drawImage() {},
    clearRect() {},
    setTransform() {},
    strokeStyle: '',
    stroke(this: { strokeStyle: string }) {
      layerStrokes.push(this.strokeStyle);
    },
  } as unknown as CanvasRenderingContext2D);
  const noop = () => {};
  const base = {
    width: 800,
    height: 600,
    createCanvas: () => ({ elt: canvas }),
    drawingContext: context,
    loadImage: (url: string) =>
      new Promise((resolve) => pendingImages.push({ url, resolve })),
    pixelDensity: () => 1,
    // bordning-jamn-bildfrekvens: the cached floor layer shares the recorders.
    createGraphics: (width: number, height: number) =>
      new Proxy(
        {
          ...base,
          width,
          height,
          elt: document.createElement('canvas'),
          remove: noop,
        },
        {
          get(target, prop) {
            return prop in target
              ? (Reflect.get(target, prop) as unknown)
              : noop;
          },
        },
      ),
    stroke: (value: string) => {
      currentStroke = value;
      strokes.push(value);
    },
    fill: (...values: unknown[]) => fills.push(values),
    line: (...points: number[]) =>
      lines.push({ stroke: currentStroke, points }),
    text: (value: string) => texts.push(value),
    textWidth: (value: string) => value.length * 7,
    redraw: () => runtime.sketch!.draw(),
    background: () => {
      calls.length = 0;
      lines.length = 0;
      strokes.length = 0;
      fills.length = 0;
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
    for (const { url, resolve } of pendingImages) {
      const image = document.createElement('canvas');
      if (url === factionSpritesUrl) spriteCanvas = image;
      resolve({ width: 512, height: 128, canvas: image });
    }
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
    effectCalls,
    loadImages,
    map,
    lines,
    strokes,
    texts,
    contextFills,
    layerStrokes,
    fills,
  };
}

it('ap-kostnad-och-handlingssymbol-pa-bordningsruta: outlines the path but writes total AP only on the yellow destination', () => {
  const { view, state, strokes, fills, texts } = scene(true);
  view.render(
    state,
    null,
    { q: 3, r: 2 },
    [
      { position: { q: 2, r: 2 }, kind: 'fire', cost: 2.25 },
      { position: { q: 3, r: 2 }, kind: 'reach', cost: 5 },
    ],
    [],
    null,
    { position: { q: 3, r: 2 }, action: 'Move', cost: 5 },
  );
  expect(strokes).toEqual(expect.arrayContaining(['#62d48a', '#c58a4a']));
  expect(fills).not.toContainEqual([98, 212, 138, 115]);
  expect(fills).not.toContainEqual([240, 179, 90, 115]);
  expect(texts).not.toContain('2.25');
  expect(texts).toContain('5');
  view.dispose();
});

it('ap-kostnad-och-handlingssymbol-pa-bordningsruta: shows the fallback action symbol over a selected locked door', () => {
  const { view, state, texts } = scene(true);
  view.render(state, 'wall', null, [], [], null, {
    position: { q: 4, r: 4 },
    action: 'Hack door',
  });
  expect(texts).toContain('⌁');
  view.dispose();
});

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
  ).toBeCloseTo(wallTop - BOARDING_TILE_HEIGHT / 2);
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

/** ljuskarta-i-bordning: floors sample the top-down light map, recognised by its size. */
const lightMapOf =
  (map: { width: number; height: number }) =>
  (args: readonly unknown[]): boolean =>
    (args[0] as HTMLCanvasElement | undefined)?.width ===
      map.width * BOARDING_LIGHT_MAP_TEXELS + 2 &&
    (args[0] as HTMLCanvasElement).height ===
      map.height * BOARDING_LIGHT_MAP_TEXELS + 2;

it('ljuskallestyrd-bordningsbelysning / vertexljus-i-bordning / bordning-jamn-bildfrekvens: sight changes reuse identical physical light masks', () => {
  const { view, state, masks } = scene(true, [
    boardingCeilingLight({ q: 2, r: 3 }),
  ]);
  const lightMasks = () =>
    masks.filter((args) => args.length === 3).map((args) => args[0]);
  view.render({ ...state, visibleCells: state.exploredCells }, null, null, []);
  const first = lightMasks();
  expect(first.length).toBeGreaterThan(0);
  view.render(state, null, null, []);
  expect(lightMasks()).toEqual(first);
  view.dispose();
});

it('bordning-jamn-bildfrekvens / ljuskarta-i-bordning: unchanged sight reuses the cached floor layer and its floor light', () => {
  const { view, state, masks, map } = scene(true, [
    boardingCeilingLight({ q: 2, r: 3 }),
  ]);
  const floorLight = () => masks.filter(lightMapOf(map)).length;
  // Newly seen cells paint the floors and their light again.
  view.render(
    {
      ...state,
      exploredCells: [...state.exploredCells, { q: 0, r: 0 }, { q: 1, r: 0 }],
    },
    null,
    null,
    [],
  );
  expect(floorLight()).toBeGreaterThan(0);
  runtime.sketch!.draw();
  expect(floorLight()).toBe(0);
  expect(masks.filter((args) => args.length === 5)).toHaveLength(1);
  view.dispose();
});

it('jamn-ljuskarta-under-forflyttning / bordning-jamn-bildfrekvens: floors look the same in sight and in memory, so a change of sight alone keeps them', () => {
  const { view, state, masks, map } = scene(true, [
    boardingCeilingLight({ q: 2, r: 3 }),
  ]);
  view.render({ ...state, visibleCells: state.exploredCells }, null, null, []);
  view.render({ ...state, visibleCells: [] }, null, null, []);
  expect(masks.filter(lightMapOf(map))).toHaveLength(0);
  view.dispose();
});

it('jamn-ljuskarta-under-forflyttning / skuggor-mellan-rutor: a walking figure relights only the floor around its lamp, every frame', async () => {
  const { view, state, player, masks, map } = scene(true, [
    boardingCeilingLight({ q: 2, r: 3 }),
  ]);
  const clock = vi.spyOn(performance, 'now').mockReturnValue(1000);
  const next = {
    ...state,
    people: [
      {
        ...player,
        position: { q: player.position.q + 1, r: player.position.r },
      },
    ],
  };
  const animation = view.playMotion(state, next);
  const relit = () => masks.filter(lightMapOf(map));
  for (const time of [1060, 1130]) {
    clock.mockReturnValue(time);
    runtime.sketch!.draw();
    // Only the texels under the lamp's reach, never the whole map.
    expect(relit()).toHaveLength(1);
    expect(relit()[0]).toHaveLength(9);
  }
  clock.mockReturnValue(1300);
  runtime.sketch!.draw();
  await animation;
  view.dispose();
});

it('texturerad-vaggovansida / vertexljus-i-bordning / tileljus-for-sprites: loaded textures keep cutaway masks and sprites interpolate physical tile light during movement', async () => {
  const sources = [boardingCeilingLight({ q: 1, r: 3 })];
  const { view, state, player, masks, imageLights, loadImages, map } = scene(
    true,
    sources,
  );
  await loadImages();
  // A change of sight alone keeps the lit floor layer.
  view.render({ ...state, visibleCells: state.exploredCells }, null, null, []);
  const lighting = new BoardingLighting(map, state);
  expect(masks.filter((args) => args.length === 3)).toHaveLength(3);
  expect(masks.filter(lightMapOf(map))).toHaveLength(0);
  const wallTextures = masks.filter(
    (args) => args.length === 9 && !lightMapOf(map)(args),
  );
  expect(wallTextures).toHaveLength(3);
  expect(wallTextures.slice(0, 2).every((args) => Number(args[2]) > 0)).toBe(
    true,
  );
  expect(Number(wallTextures[2]![2])).toBe(0);
  expect(imageLights).toEqual([255 * lighting.tile(player.position)]);
  const visibleLight = imageLights[0];
  view.render(state, null, null, []);
  expect(imageLights[0]).toBe(visibleLight);
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

it('kamerafokus-vid-bordningssoldatbyte: one player zoom centers whichever soldier is selected', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const { view, state, player } = scene(true);
  const ally = {
    ...player,
    id: 'ally',
    label: 'Ally',
    position: { q: 5, r: 0 },
  };
  const playing = (actorId: string): typeof state => ({
    ...state,
    currentActorId: actorId,
    activation: { id: actorId, remaining: 8 },
    people: [player, ally],
  });
  view.render(playing(player.id), null, null, []);
  view.zoom(2);
  view.render(playing(ally.id), null, null, []);
  view.zoom(0.5);
  const shared = view.cameraSnapshot.scale;
  await view.focusActor(player.id);
  expect(view.cameraSnapshot.scale).toBeCloseTo(shared);
  const playerPan = view.cameraSnapshot.offset.x;
  await view.focusActor(ally.id);
  expect(view.cameraSnapshot.scale).toBeCloseTo(shared);
  expect(view.cameraSnapshot.offset.x).not.toBeCloseTo(playerPan);
  view.dispose();
});

it('kamerafokus-vid-bordningssoldatbyte: a shot overview returns to the player zoom and the previous pan', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const { view, state, player } = scene(true);
  const defender = {
    ...player,
    id: 'defender',
    side: 'defender' as const,
    position: { q: 0, r: 0 },
  };
  view.render(
    {
      ...state,
      currentActorId: player.id,
      activation: { id: player.id, remaining: 8 },
      people: [player, defender],
    },
    null,
    null,
    [],
  );
  view.zoom(2);
  const played = view.cameraSnapshot;
  view.beginPresentation();
  view.setViewportProvider(() => ({
    left: 300,
    top: 250,
    right: 420,
    bottom: 370,
  }));
  await view.frameShot(player.position, defender.position);
  expect(view.cameraSnapshot.scale).toBeLessThan(played.scale);
  await view.restorePlayView();
  expect(view.cameraSnapshot.scale).toBeCloseTo(played.scale);
  expect(view.cameraSnapshot.offset.x).toBeCloseTo(played.offset.x);
  expect(view.cameraSnapshot.offset.y).toBeCloseTo(played.offset.y);
  view.endPresentation();
  view.dispose();
});

it('kameraoverblick-vid-synlig-bordningsrorelse: a new sound the player can hear is framed, then the play view returns', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const { view, state, player } = scene(true);
  view.render(
    {
      ...state,
      currentActorId: player.id,
      people: [player],
      noiseMarkers: [],
    },
    null,
    null,
    [],
  );
  view.zoom(2);
  const played = view.cameraSnapshot;
  view.beginPresentation();
  view.setViewportProvider(() => ({
    left: 300,
    top: 250,
    right: 420,
    bottom: 370,
  }));
  const heard = {
    ...state,
    currentActorId: player.id,
    people: [player],
    noiseMarkers: [{ position: { q: 0, r: 0 }, audience: 'player' as const }],
  };
  await view.frameVisibleMovement({ ...heard, noiseMarkers: [] }, heard);
  expect(view.cameraSnapshot.scale).toBeLessThan(played.scale);
  await view.restorePlayView();
  expect(view.cameraSnapshot.scale).toBeCloseTo(played.scale);
  expect(view.cameraSnapshot.offset.x).toBeCloseTo(played.offset.x);
  const quiet = view.cameraSnapshot;
  await view.frameVisibleMovement(heard, {
    ...heard,
    noiseMarkers: [{ position: { q: 0, r: 0 }, audience: 'defender' as const }],
  });
  expect(view.cameraSnapshot).toEqual(quiet);
  view.endPresentation();
  view.dispose();
});

it('kameraoverblick-vid-synlig-bordningsrorelse: an off-screen event is panned into the center instead of zooming out further than needed', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const { view, state, player } = scene(true);
  const quiet = {
    ...state,
    currentActorId: player.id,
    people: [player],
    noiseMarkers: [],
  };
  view.render(quiet, null, null, []);
  view.zoom(2);
  const played = view.cameraSnapshot;
  const sound = boardingIsoCenter({ q: 0, r: 0 });
  const screenX = sound.x * played.scale + played.offset.x;
  const screenY = sound.y * played.scale + played.offset.y;
  const viewport = {
    left: screenX + 100,
    right: screenX + 700,
    top: screenY - 300,
    bottom: screenY + 300,
  };
  view.beginPresentation();
  view.setViewportProvider(() => viewport);
  await view.frameVisibleMovement(quiet, {
    ...quiet,
    noiseMarkers: [{ position: { q: 0, r: 0 }, audience: 'player' as const }],
  });
  const framed = view.cameraSnapshot;
  expect(framed.scale).toBeCloseTo(played.scale);
  const subjectCenterY = sound.y - 65 + 35;
  expect(sound.x * framed.scale + framed.offset.x).toBeCloseTo(
    (viewport.left + viewport.right) / 2,
  );
  expect(subjectCenterY * framed.scale + framed.offset.y).toBeCloseTo(
    (viewport.top + viewport.bottom) / 2,
  );
  view.endPresentation();
  view.dispose();
});

it('kamerafokus-vid-bordningssoldatbyte: an overview before the soldier acts is not stored as their view', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const { view, state, player } = scene(true);
  const defender = {
    ...player,
    id: 'defender',
    side: 'defender' as const,
    position: { q: 0, r: 0 },
  };
  view.render(
    {
      ...state,
      currentActorId: player.id,
      activation: { id: player.id, remaining: 8 },
      people: [player, defender],
    },
    null,
    null,
    [],
  );
  view.setViewportProvider(() => ({
    left: 300,
    top: 250,
    right: 420,
    bottom: 370,
  }));
  await view.frameShot(player.position, defender.position);
  view.beginPresentation();
  view.endPresentation();
  view.zoom(2);
  const played = view.cameraSnapshot.scale;
  await view.focusActor(player.id);
  expect(view.cameraSnapshot.scale).toBeCloseTo(played);
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

it('bordning-explosioner-och-forstorelse: a known feature that breaks bursts into debris and leaves rubble', () => {
  const { view, state, calls, effectCalls } = scene(true);
  effectCalls.length = 0;
  runtime.sketch!.draw();
  expect(effectCalls).toHaveLength(0);
  const broken = {
    ...state,
    features: state.features.map((feature) =>
      feature.id === 'wall' ? { ...feature, destroyed: true } : feature,
    ),
  };
  view.render(broken, null, null, []);
  // render() starts the p5 loop for the effect; draw its first frame.
  runtime.sketch!.draw();
  expect(effectCalls.filter((call) => call === 'rect').length).toBeGreaterThan(
    0,
  );
  // The intact wall's faces are replaced by low rubble on its tile.
  const wallTop = boardingIsoCenter({ q: 4, r: 4 }).y - boardingHeight(0.4);
  expect(
    calls.filter((call) => call.kind === 'wall' && call.y < wallTop),
  ).toHaveLength(0);
  expect(calls.filter((call) => call.kind === 'wall').length).toBeGreaterThan(
    0,
  );
  view.dispose();
});

it('utslagen-fiende-utan-sikte / ljudmarkor-bara-utom-sikt: no empty HP bar for a knocked-out person and no noise ring on a visible tile', () => {
  const { view, state, player, calls } = scene(true);
  const bars: number[][] = [];
  Object.assign(runtime.sketch!, {
    rect: (...args: number[]) => bars.push(args),
  });
  const visibleTile = { q: 3, r: 3 };
  const hiddenTile = { q: 1, r: 1 };
  const noisy = {
    ...state,
    visibleCells: [visibleTile],
    noiseMarkers: [
      { position: visibleTile, audience: 'player' as const },
      { position: hiddenTile, audience: 'player' as const },
    ],
  };
  view.render(noisy, null, null, []);
  const ringYs = calls
    .filter((call) => call.kind === 'person')
    .map((call) => call.y);
  expect(ringYs).toContain(boardingIsoCenter(hiddenTile).y);
  expect(ringYs).not.toContain(boardingIsoCenter(visibleTile).y);
  const standingBars = bars.length;
  expect(standingBars).toBeGreaterThan(0);
  bars.length = 0;
  view.render(
    {
      ...noisy,
      people: [{ ...player, status: 'incapacitated', hitPoints: 0 }],
    },
    null,
    null,
    [],
  );
  expect(bars).toHaveLength(0);
  view.dispose();
});

it('fiende-syns-till-sin-tur / senast-sedd-fiende-med-fragetecken: draws a lingering enemy out of sight and marks a hidden one with a question mark', () => {
  const { view, state, player, calls, texts } = scene(true);
  const enemy = {
    ...player,
    id: 'lingering',
    side: 'defender' as const,
    position: { q: 1, r: 1 },
  };
  const people = () => calls.filter((call) => call.kind === 'person').length;
  view.render({ ...state, people: [player, enemy] }, null, null, []);
  const withoutEnemy = people();
  view.render(
    {
      ...state,
      people: [player, enemy],
      lastKnownEnemies: [{ id: enemy.id, position: enemy.position }],
      lingeringPersonIds: [enemy.id],
    },
    null,
    null,
    [],
  );
  expect(people()).toBeGreaterThan(withoutEnemy);
  expect(texts).not.toContain('?');
  view.render(
    {
      ...state,
      people: [player],
      lastKnownEnemies: [{ id: enemy.id, position: enemy.position }],
    },
    null,
    null,
    [],
  );
  expect(texts).toContain('?');
  view.dispose();
});

it('geometrisk-sikt: outlines the given sight area and its half cover on the floor', () => {
  const { view, state, player, strokes } = scene(true);
  view.render(state, player.id, null, []);
  expect(strokes).not.toContain('#62d6ff');
  view.render(state, player.id, null, [], [], {
    outline: [
      { q: 3, r: 3 },
      { q: 5, r: 2 },
      { q: 5, r: 4 },
    ],
    halfCover: [{ q: 4, r: 3 }],
    coverShadows: [],
  });
  expect(strokes).toContain('#62d6ff');
  // halvskydd-markering-sammanfogad: no amber tile outline of its own.
  expect(strokes).not.toContain('#f0a050');
  view.dispose();
});

it('halvskydd-skuggar-delvis / halvskydd-markering-sammanfogad: shades the floor behind half cover as one area with one outline', () => {
  const { view, state, player, contextFills, layerStrokes } = scene(true);
  view.render(state, player.id, null, [], [], {
    outline: [
      { q: 3, r: 3 },
      { q: 5, r: 2 },
      { q: 5, r: 4 },
    ],
    halfCover: [],
    coverShadows: [
      [
        { q: 4, r: 3 },
        { q: 4, r: 4 },
        { q: 5, r: 4 },
      ],
      [
        { q: 4.5, r: 3 },
        { q: 5, r: 3 },
        { q: 4.5, r: 4 },
      ],
    ],
  });
  // Overlapping shadows are filled and outlined in a single pass each, so
  // their overlap is not darker and no lines run inside the area.
  expect(
    contextFills.filter((style) => style === 'rgba(240, 160, 80, 0.1)'),
  ).toHaveLength(1);
  expect(layerStrokes.filter((style) => style === '#f0a050')).toHaveLength(1);
  view.dispose();
});

it('aktiv-figur-pa-ruta-med-kroppar: keeps an active person centered regardless of bodies and selection', () => {
  const { view, state, player } = scene(true);
  const ellipses: number[][] = [];
  Object.assign(runtime.sketch!, {
    ellipse: (...args: number[]) => ellipses.push(args),
  });
  const bodies = [
    { ...player, id: 'body-a', status: 'dead' as const, hitPoints: 0 },
    { ...player, id: 'body-b', status: 'incapacitated' as const, hitPoints: 0 },
  ];
  for (const people of [
    [player],
    [...bodies, player],
    [player, ...bodies].reverse(),
  ]) {
    for (const selected of [null, player.id, 'body-b']) {
      ellipses.length = 0;
      view.render(
        { ...state, people, currentActorId: player.id },
        selected,
        null,
        [],
      );
      const ring = ellipses.find((args) => args[2] === 32);
      expect(ring?.[0]).toBeCloseTo(boardingIsoCenter(player.position).x);
      expect(ring?.[1]).toBeCloseTo(
        boardingIsoCenter(player.position).y + BOARDING_FOOT_PLANT - 1,
      );
    }
  }
  view.dispose();
});

it('aktiv-figur-pa-ruta-med-kroppar: keeps the active sprite selectable on a shared tile', () => {
  const { view, state, player, select, click } = scene(true);
  const body = {
    ...player,
    id: 'body',
    status: 'incapacitated' as const,
    hitPoints: 0,
  };
  view.render({ ...state, people: [body, player] }, null, null, []);
  const sprite = boardingCharacterSprite(
    'player',
    boardingIsoCenter(player.position),
    'standing',
  ).destination;
  click({ x: sprite.x + sprite.width / 2, y: sprite.y + sprite.height * 0.2 });
  expect(select).toHaveBeenLastCalledWith(player.position, player.id);
  view.dispose();
});
