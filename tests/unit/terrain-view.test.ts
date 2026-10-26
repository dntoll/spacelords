import { describe, expect, it, vi } from 'vitest';
import type p5 from 'p5';
import { renderStarGlyph } from '../../src/client/views/StarGlyph.js';
import { renderTerrain } from '../../src/client/views/TerrainMapView.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../src/client/models/HexCoordinate.js';

function drawing() {
  return {
    noStroke: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    strokeWeight: vi.fn(),
    circle: vi.fn(),
    line: vi.fn(),
    push: vi.fn(),
    pop: vi.fn(),
    ellipse: vi.fn(),
    beginShape: vi.fn(),
    vertex: vi.fn(),
    endShape: vi.fn(),
  };
}

describe('stjarnornas-hexutseende', () => {
  it.each([0.35, 1, 2.5])(
    'fills its hex at zoom %s and removes spikes after discovery',
    (zoom) => {
      const sketch = drawing();
      renderStarGlyph(sketch as unknown as p5, { x: 0, y: 0 }, zoom, false);
      expect(
        Math.max(...sketch.circle.mock.calls.map((call) => call[2] as number)),
      ).toBeCloseTo(Math.sqrt(3) * HexGeometry.size);
      expect(sketch.line).toHaveBeenCalledTimes(4);
      sketch.line.mockClear();
      renderStarGlyph(sketch as unknown as p5, { x: 0, y: 0 }, zoom, true);
      expect(sketch.line).not.toHaveBeenCalled();
    },
  );
});

describe('asteroidbalten / nebulosornas-sikt', () => {
  it('draws discovered cloud surfaces but never paints unknown terrain', () => {
    const sketch = drawing();
    const cell = {
      position: new HexCoordinate(2, 0),
      explored: false,
      visible: false,
      object: null,
    };
    renderTerrain(sketch as unknown as p5, [{ ...cell, terrain: null }]);
    expect(sketch.vertex).not.toHaveBeenCalled();
    renderTerrain(sketch as unknown as p5, [{ ...cell, terrain: 'nebula' }]);
    expect(sketch.vertex).toHaveBeenCalledTimes(6);
  });
});
