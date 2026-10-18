import { describe, expect, it, vi } from 'vitest';
import type p5 from 'p5';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { renderPlanetOrders } from '../../src/client/views/PlanetOrderView.js';

describe('kartorderstatus', () => {
  it('labels planets with empty sites and idle shipyards and omits planets with no free orders', () => {
    const text = vi.fn<(label: string, x: number, y: number) => void>();
    const sketch = {
      textAlign: vi.fn(),
      textSize: vi.fn(),
      noStroke: vi.fn(),
      fill: vi.fn(),
      rect: vi.fn(),
      text,
      LEFT: 'left',
      CENTER: 'center',
    };
    renderPlanetOrders(
      sketch as unknown as p5,
      [
        {
          planetId: 'one',
          position: new HexCoordinate(0, 0),
          emptySites: 3,
          emptyQueues: 1,
        },
        {
          planetId: 'two',
          position: new HexCoordinate(1, 0),
          emptySites: 0,
          emptyQueues: 2,
        },
        {
          planetId: 'three',
          position: new HexCoordinate(0, 1),
          emptySites: 0,
          emptyQueues: 0,
        },
      ],
      1,
    );
    expect(text.mock.calls.map(([label]) => label)).toEqual(['S3 Q1', 'Q2']);
  });
});
