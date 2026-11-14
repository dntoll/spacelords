// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type p5 from 'p5';
import type { BoardingEditorMapView as BoardingEditorMapViewClass } from '../../../src/client/boarding/views/editor/BoardingEditorMapView.js';
import { BoardingEditor } from '../../../src/client/boarding/models/editor/BoardingEditor.js';

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
    loadImage(url: string) {
      return runtime.sketch!.loadImage(url);
    }
    resizeCanvas() {}
    remove() {}
  },
}));

// snabb-testsvit runs with isolate: false, so another file may already have
// loaded the view with the real p5. Reload it after the mock is registered.
let BoardingEditorMapView: typeof BoardingEditorMapViewClass;
beforeAll(async () => {
  vi.resetModules();
  ({ BoardingEditorMapView } =
    await import('../../../src/client/boarding/views/editor/BoardingEditorMapView.js'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('spelidentisk-bordningseditor: renders faction sprites from the shared artwork, and doors and Half cover as geometry', async () => {
  const images: unknown[][] = [];
  const canvas = document.createElement('canvas');
  const context = new Proxy({}, { get: () => () => undefined });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  const base = {
    width: 800,
    height: 600,
    createCanvas: () => ({ elt: canvas }),
    drawingContext: context,
    loadImage: (url: string) =>
      Promise.resolve({ url, width: 512, height: 128, canvas }),
    image: (...args: unknown[]) => images.push(args),
    redraw: () => runtime.sketch!.draw(),
  };
  runtime.sketch = new Proxy(base, {
    get: (target, key) =>
      key in target ? (Reflect.get(target, key) as unknown) : () => undefined,
  }) as unknown as p5;
  const source =
    '[meta]\nwidth=3\nheight=3\nrules=campaign\n[terrain]\nH.H\n...\nHHH\n[objects]\n-D-\n-C-\n---\n[rooms]\n---\n---\n---\n[spawns]\n---\nPDC\n---\n';
  const editor = new BoardingEditor('pirate', source);
  const container = document.createElement('div');
  Object.defineProperties(container, {
    clientWidth: { value: 800 },
    clientHeight: { value: 600 },
  });
  const view = new BoardingEditorMapView(
    container,
    () => undefined,
    () => undefined,
  );
  void runtime.sketch.setup();
  view.render(editor.snapshot);
  await Promise.resolve();
  await Promise.resolve();
  images.length = 0;
  view.render(editor.snapshot);
  // dorrar-som-tunna-vaggar and halvskydd-som-geometri: the door at (1,0)
  // and the Half cover at (1,1) are geometry, not sprites.
  expect(
    images.filter((call) =>
      /door|crate/.test(String((call[0] as { url?: string }).url)),
    ),
  ).toEqual([]);
  expect(images.filter((call) => call.length === 9)).toHaveLength(3);
  view.dispose();
});

const STROKE_SOURCE =
  '[meta]\nwidth=4\nheight=3\nrules=campaign\n[terrain]\n....\n....\n....\n[objects]\n----\n----\n----\n[rooms]\n----\n----\n----\n[spawns]\n----\n----\n----\n';
const HULL_FILL = '#24323ccc';

function editorHarness(projection: 'top-down' | 'isometric') {
  const calls: { name: string; args: unknown[] }[] = [];
  const canvas = document.createElement('canvas');
  canvas.setPointerCapture = () => undefined;
  const context = new Proxy({}, { get: () => () => undefined });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  const base = {
    width: 800,
    height: 600,
    createCanvas: () => ({ elt: canvas }),
    drawingContext: context,
    loadImage: () => new Promise(() => undefined),
    redraw: () => runtime.sketch!.draw(),
  };
  runtime.sketch = new Proxy(base, {
    get: (target, key) =>
      key in target
        ? (Reflect.get(target, key) as unknown)
        : (...args: unknown[]) => {
            calls.push({ name: String(key), args });
          },
  }) as unknown as p5;
  const editor = new BoardingEditor('pirate', STROKE_SOURCE);
  editor.setProjection(projection);
  const container = document.createElement('div');
  Object.defineProperties(container, {
    clientWidth: { value: 800 },
    clientHeight: { value: 600 },
  });
  const strokes: unknown[][] = [];
  const view = new BoardingEditorMapView(
    container,
    (...args) => strokes.push(args),
    () => undefined,
  );
  void runtime.sketch.setup();
  view.render(editor.snapshot);
  const pointer = (
    type: string,
    x: number,
    y: number,
    init: { button?: number; id?: number; touch?: boolean } = {},
  ) => {
    const event = new MouseEvent(type, {
      button: init.button ?? 0,
      clientX: x,
      clientY: y,
      bubbles: true,
    });
    Object.defineProperties(event, {
      pointerId: { value: init.id ?? 1 },
      pointerType: { value: init.touch ? 'touch' : 'mouse' },
    });
    canvas.dispatchEvent(event);
  };
  const lastTranslate = () =>
    calls.filter((call) => call.name === 'translate').at(-1)?.args;
  const fills = (color: string) =>
    calls.filter((call) => call.name === 'fill' && call.args[0] === color)
      .length;
  return { calls, editor, view, strokes, pointer, lastTranslate, fills };
}

describe('direkt-penselstreck-i-editor', () => {
  it('shows painted tiles while the pointer is still held down', () => {
    const harness = editorHarness('top-down');
    const [x, y] = harness.lastTranslate() as [number, number];
    const size = harness.calls.find((call) => call.name === 'rect')
      ?.args[2] as number;
    harness.calls.length = 0;
    harness.pointer('pointerdown', x + 10, y + 10);
    harness.pointer('pointermove', x + size + 10, y + 10);
    harness.calls.length = 0;
    harness.view.render(harness.editor.snapshot);
    // Cells (0,0) and (1,0) are drawn as Hull before the button is released.
    expect(harness.fills(HULL_FILL)).toBe(2);
    expect(harness.strokes).toEqual([]);
    harness.pointer('pointerup', x + size + 10, y + 10);
    expect(harness.strokes).toEqual([
      [
        'primary',
        [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
        ],
      ],
    ]);
    harness.view.dispose();
  });
});

describe('zooma-panorera-bordningseditor', () => {
  it('pans with a left drag in pan mode without painting', () => {
    const harness = editorHarness('top-down');
    const [x, y] = harness.lastTranslate() as [number, number];
    harness.view.setPanMode(true);
    harness.pointer('pointerdown', 100, 100);
    harness.pointer('pointermove', 200, 150);
    harness.pointer('pointerup', 200, 150);
    expect(harness.strokes).toEqual([]);
    expect(harness.lastTranslate()).toEqual([x + 100, y + 50]);
    harness.view.dispose();
  });

  it('keeps the player camera when painting Outside reshapes the ship', () => {
    const harness = editorHarness('isometric');
    harness.view.setPanMode(true);
    harness.pointer('pointerdown', 100, 100);
    harness.pointer('pointermove', 130, 120);
    harness.pointer('pointerup', 130, 120);
    const panned = harness.lastTranslate();
    harness.editor.bindTool('primary', { layer: 'terrain', symbol: 'O' });
    harness.editor.paintStroke('primary', [{ q: 3, r: 2 }]);
    harness.view.render(harness.editor.snapshot);
    expect(harness.lastTranslate()).toEqual(panned);
    harness.view.fitView();
    expect(harness.lastTranslate()).not.toEqual(panned);
    harness.view.dispose();
  });

  it('zooms around the midpoint of a two-finger pinch', () => {
    const harness = editorHarness('top-down');
    const [x, y] = harness.lastTranslate() as [number, number];
    harness.pointer('pointerdown', 300, 300, { id: 1, touch: true });
    harness.pointer('pointerdown', 400, 300, { id: 2, touch: true });
    harness.pointer('pointermove', 350, 300, { id: 2, touch: true });
    harness.pointer('pointerup', 350, 300, { id: 2, touch: true });
    harness.pointer('pointerup', 300, 300, { id: 1, touch: true });
    expect(harness.strokes).toEqual([]);
    // Distance 100 -> 50 halves the zoom while the midpoint moves
    // (350,300) -> (325,300), so the grid follows the fingers.
    const [nx, ny] = harness.lastTranslate() as [number, number];
    expect(nx).toBeCloseTo(325 - (350 - x) * 0.5);
    expect(ny).toBeCloseTo(300 - (300 - y) * 0.5);
    harness.view.dispose();
  });
});
