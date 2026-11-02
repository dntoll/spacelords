// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import type p5 from 'p5';
import { AppModel } from '../../src/client/models/AppModel.js';
import { GalaxyMapView } from '../../src/client/views/GalaxyMapView.js';

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

it('responsiv-stjarnkarta: coalesces updates into one paint and cancels pending paints on disposal', () => {
  const container = document.createElement('div');
  document.body.replaceChildren(container);
  const noop = () => {};
  const sketch = {
    setup: noop,
    draw: noop,
    createCanvas: () => container.append(document.createElement('canvas')),
    pixelDensity: noop,
    noLoop: noop,
    textFont: noop,
    loadImage: () => new Promise(() => {}),
  };
  runtime.sketch = sketch as unknown as p5;
  const callbacks = new Map<number, FrameRequestCallback>();
  let sequence = 0;
  const request = vi.fn((callback: FrameRequestCallback) => {
    callbacks.set(++sequence, callback);
    return sequence;
  });
  const cancel = vi.fn((id: number) => callbacks.delete(id));
  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  const view = new GalaxyMapView(container, noop);
  sketch.setup();
  const draw = vi.fn();
  sketch.draw = draw;
  const model = new AppModel().snapshot;
  for (let i = 0; i < 20; i++) view.render(model);
  expect(request).toHaveBeenCalledOnce();
  expect(draw).not.toHaveBeenCalled();
  callbacks.get(sequence)!(16);
  callbacks.delete(sequence);
  expect(draw).toHaveBeenCalledOnce();
  view.render(model);
  expect(request).toHaveBeenCalledTimes(2);
  view.dispose();
  expect(callbacks.size).toBe(0);
  expect(draw).toHaveBeenCalledOnce();
});
