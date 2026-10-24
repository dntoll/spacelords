import { expect, it, vi } from 'vitest';
import type p5 from 'p5';
import { AppModel } from '../../src/client/models/AppModel.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { renderMapTradeRoutes } from '../../src/client/views/MapTradeRoutesView.js';

it.each([0.5, 1, 2])(
  'streckade-rutter-utan-transporter: renders transport state at zoom %s and resets dashes',
  (zoom) => {
    const dash = vi.fn();
    const lines: number[][] = [];
    const sketch = {
      drawingContext: { setLineDash: dash },
      stroke: vi.fn(),
      strokeWeight: vi.fn(),
      line: () => lines.push(dash.mock.calls.at(-1)![0] as number[]),
    } as unknown as p5;
    const model = new AppModel().snapshot;
    const route = {
      id: 'test',
      a: 'sol-0',
      b: 'sol-1',
      from: 'Tellus',
      to: 'Vesta',
      start: new HexCoordinate(1, 0),
      end: new HexCoordinate(0, 1),
      closing: false,
      fleetIds: [],
      capacity: 0,
      waiting: 0,
      status: 'Needs transport fleet',
      hasActiveTransport: false,
    };
    renderMapTradeRoutes(sketch, {
      ...model,
      camera: { ...model.camera, zoom },
      tradeRoutes: [
        route,
        { ...route, id: 'active', hasActiveTransport: true },
        { ...route, id: 'closing', hasActiveTransport: true, closing: true },
      ],
    });
    expect(lines).toEqual([[7 / zoom, 5 / zoom], [], [7 / zoom, 5 / zoom]]);
    expect(dash).toHaveBeenLastCalledWith([]);
  },
);
