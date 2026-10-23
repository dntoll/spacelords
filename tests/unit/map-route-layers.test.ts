// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import type p5 from 'p5';
import { AppModel } from '../../src/client/models/AppModel.js';
import { GalaxyMapView } from '../../src/client/views/GalaxyMapView.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';

const runtime = vi.hoisted(() => ({
  sketch: null as p5 | null,
  events: [] as string[],
}));
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
vi.mock('../../src/client/views/MapOverlayView.js', () => ({
  renderMapOverlays: () => {
    runtime.events.push('overlays');
  },
}));
afterEach(() => vi.unstubAllGlobals());

it.each([0.5, 1, 2])(
  'synliga-handelsrutter: selected tile fills stay below routes and routes below planets at zoom %s',
  (zoom) => {
    document.body.replaceChildren();
    runtime.events = [];
    const container = document.createElement('div');
    document.body.append(container);
    let fill = '',
      stroke = '';
    const noop = () => {};
    const sketch = {
      width: 800,
      height: 600,
      CLOSE: 'close',
      CENTER: 'center',
      TOP: 'top',
      setup: noop,
      draw: noop,
      createCanvas: () => {
        container.append(document.createElement('canvas'));
      },
      pixelDensity: noop,
      noLoop: noop,
      textFont: noop,
      describe: noop,
      background: noop,
      noStroke: noop,
      noFill: noop,
      push: noop,
      pop: noop,
      translate: noop,
      scale: noop,
      fill: (color: unknown) => {
        fill = String(color);
      },
      stroke: (color: unknown) => {
        stroke = String(color);
      },
      strokeWeight: noop,
      beginShape: noop,
      vertex: noop,
      endShape: () => {
        runtime.events.push(`hex:${fill}`);
      },
      line: () => {
        runtime.events.push(`line:${stroke}`);
      },
      circle: () => {
        runtime.events.push(`circle:${fill}`);
      },
      ellipse: noop,
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
    const view = new GalaxyMapView(container, noop);
    sketch.setup();
    const model = new AppModel().snapshot;
    for (const position of [new HexCoordinate(1, 0), new HexCoordinate(0, 1)]) {
      runtime.events = [];
      view.render({
        ...model,
        camera: { ...model.camera, zoom },
        selected: model.cells.find((c) => c.position.key === position.key)!,
        tradeRoutes: [
          {
            id: 'route',
            a: 'sol-0',
            b: 'sol-1',
            from: 'Tellus',
            to: 'Vesta',
            start: new HexCoordinate(1, 0),
            end: new HexCoordinate(0, 1),
            closing: false,
            fleetIds: [],
            capacity: 0,
            hasActiveTransport: false,
            waiting: 0,
            status: 'Idle',
          },
        ],
      });
      const selection = runtime.events.indexOf('hex:#1b3e41');
      const route = runtime.events.indexOf('line:#547caa');
      expect(selection).toBeGreaterThanOrEqual(0);
      expect(route).toBeGreaterThan(selection);
      expect(runtime.events.indexOf('circle:#b1e4d1')).toBeGreaterThan(route);
      expect(runtime.events.indexOf('overlays')).toBeGreaterThan(route);
    }
    view.dispose();
  },
);
