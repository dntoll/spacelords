// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import type p5 from 'p5';
import { BoardingEditor } from '../../src/client/models/boarding/BoardingEditor.js';
import { BoardingEditorMapView } from '../../src/client/views/boarding/BoardingEditorMapView.js';
import {
  BOARDING_OBJECT_IMAGES,
  boardingObjectBounds,
} from '../../src/client/views/boarding/BoardingObjectArtwork.js';
import { boardingIsoCenter } from '../../src/client/views/boarding/BoardingProjection.js';

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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('spelidentisk-bordningseditor: renders calibrated door, cover and faction sprites from the shared artwork', async () => {
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
  const door = images.find(
    (call) =>
      (call[0] as { url?: string }).url ===
      BOARDING_OBJECT_IMAGES['door-closed-q'],
  );
  const cover = images.find(
    (call) =>
      (call[0] as { url?: string }).url ===
      BOARDING_OBJECT_IMAGES['half-cover'],
  );
  expect(door?.slice(1)).toEqual(
    Object.values(
      boardingObjectBounds('door-closed-q', boardingIsoCenter({ q: 1, r: 0 })),
    ),
  );
  expect(cover?.slice(1)).toEqual(
    Object.values(
      boardingObjectBounds('half-cover', boardingIsoCenter({ q: 1, r: 1 })),
    ),
  );
  expect(images.filter((call) => call.length === 9)).toHaveLength(3);
  view.dispose();
});
