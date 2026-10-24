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

it.each(
  [0.5, 1, 2].flatMap((zoom) =>
    (['map', 'fleets'] as const).map((screen) => ({ screen, zoom })),
  ),
)(
  'synliga-handelsrutter / flottfokuserad-kartvy: background layers and opacity on $screen at zoom $zoom',
  ({ screen, zoom }) => {
    document.body.replaceChildren();
    runtime.events = [];
    const container = document.createElement('div');
    document.body.append(container);
    let fill = '',
      stroke = '';
    const noop = () => {};
    const context = { globalAlpha: 1, setLineDash: () => {} };
    const alphaStack: number[] = [];
    const planetAlphas: number[] = [];
    const planetLabelAlphas: number[] = [];
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
      describe: vi.fn(),
      background: noop,
      noStroke: noop,
      noFill: noop,
      drawingContext: context,
      push: () => {
        alphaStack.push(context.globalAlpha);
      },
      pop: () => {
        context.globalAlpha = alphaStack.pop()!;
      },
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
        if (fill === '#b1e4d1') planetAlphas.push(context.globalAlpha);
      },
      ellipse: noop,
      textAlign: noop,
      textSize: noop,
      text: (label: string) => {
        if (label === 'Tellus' || label === 'Vesta')
          planetLabelAlphas.push(context.globalAlpha);
      },
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
        screen,
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
      expect(sketch.describe).toHaveBeenLastCalledWith(
        screen === 'fleets'
          ? 'Fleets map. Fleet positions and destinations are highlighted; planets and trade routes are background landmarks.'
          : 'Star map. Your homeworld and its surroundings are visible. Stars are visible in unexplored space.',
      );
      const selection = runtime.events.indexOf('hex:#1b3e41');
      const route = runtime.events.indexOf(
        screen === 'fleets' ? 'line:#2b3d50' : 'line:#547caa',
      );
      if (screen === 'map') expect(selection).toBeGreaterThanOrEqual(0);
      else expect(selection).toBe(-1);
      expect(planetAlphas.at(-1)).toBe(screen === 'fleets' ? 0.35 : 1);
      expect(planetLabelAlphas.length).toBeGreaterThan(0);
      expect(planetLabelAlphas.every((alpha) => alpha === 1)).toBe(true);
      expect(context.globalAlpha).toBe(1);
      expect(
        container.querySelector('canvas')?.getAttribute('aria-label'),
      ).toContain(screen === 'fleets' ? 'Fleets map.' : 'Star map.');
      expect(route).toBeGreaterThan(selection);
      expect(runtime.events.indexOf('circle:#b1e4d1')).toBeGreaterThan(route);
      expect(runtime.events.indexOf('overlays')).toBeGreaterThan(route);
    }
    view.dispose();
  },
);
