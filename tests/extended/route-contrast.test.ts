import { expect, it, vi } from 'vitest';
import type p5 from 'p5';
import { AppModel } from '../../src/client/models/AppModel.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { renderMapTradeRoutes } from '../../src/client/views/MapTradeRoutesView.js';

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((value) => {
      const channel = parseInt(value, 16) / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

it.each([0.5, 1, 2])(
  'farledskontrast: routes remain distinct against every map fill at zoom %s',
  (zoom) => {
    const stroke = vi.fn();
    const strokeWeight = vi.fn();
    const sketch = {
      stroke,
      strokeWeight,
      line: vi.fn(),
      drawingContext: { setLineDash: vi.fn() },
    } as unknown as p5;
    const model = new AppModel().snapshot;
    renderMapTradeRoutes(sketch, {
      ...model,
      camera: { ...model.camera, zoom },
      tradeRoutes: [
        {
          id: 'route',
          a: 'a',
          b: 'b',
          from: 'A',
          to: 'B',
          start: new HexCoordinate(0, 0),
          end: new HexCoordinate(1, 0),
          closing: false,
          fleetIds: [],
          capacity: 0,
          waiting: 0,
          status: 'Needs transport fleet',
          hasActiveTransport: false,
        },
      ],
    });
    for (const background of ['#0a1520', '#112d34', '#0d1c28', '#1b3e41']) {
      expect(
        (luminance(stroke.mock.calls[0]![0] as string) + 0.05) /
          (luminance(background) + 0.05),
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(strokeWeight.mock.calls[0]![0] * zoom).toBeGreaterThanOrEqual(2.5);
  },
);
