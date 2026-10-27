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
    circle: vi.fn<(x: number, y: number, diameter: number) => void>(),
    line: vi.fn<(x1: number, y1: number, x2: number, y2: number) => void>(),
    push: vi.fn(),
    pop: vi.fn(),
    ellipse: vi.fn(),
    beginShape: vi.fn(),
    vertex: vi.fn(),
    endShape: vi.fn(),
    image:
      vi.fn<
        (
          sprite: p5.Image,
          x: number,
          y: number,
          width: number,
          height: number,
        ) => void
      >(),
    drawingContext: {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      clip: vi.fn(),
    },
  };
}

describe('stjarnornas-hexutseende', () => {
  it.each([0.03, 0.19])(
    'stjarnvariation: preserves size differences in point stars at zoom %s',
    (zoom) => {
      const large = drawing(),
        small = drawing();
      renderStarGlyph(large as unknown as p5, { x: 0, y: 0 }, zoom, {
        q: 0,
        r: 0,
      });
      renderStarGlyph(small as unknown as p5, { x: 0, y: 0 }, zoom, {
        q: 7,
        r: -3,
      });
      expect(large.circle.mock.calls.at(-1)![2]).toBeGreaterThan(
        small.circle.mock.calls.at(-1)![2],
      );
    },
  );
  it('clips the star image inside its own hex without spikes', () => {
    const sketch = drawing();
    const sprite = {} as p5.Image;
    renderStarGlyph(
      sketch as unknown as p5,
      { x: 0, y: 0 },
      1,
      { q: 0, r: 0 },
      Array.from({ length: 5 }, () => sprite),
    );
    expect(sketch.drawingContext.clip).toHaveBeenCalledOnce();
    expect(sketch.image).toHaveBeenCalledOnce();
    const [, x, y, width, height] = sketch.image.mock.calls[0]!;
    expect(Math.abs(x)).toBeLessThan((Math.sqrt(3) * HexGeometry.size) / 2);
    expect(width).toBeLessThan(Math.sqrt(3) * HexGeometry.size);
    expect(height).toBe(width);
    expect(y).toBe(x);
    expect(sketch.line).not.toHaveBeenCalled();
  });
  it.each([0.03, 0.35, 1, 2.5])(
    'stjarnvariation: simplifies stars at zoom %s without spikes',
    (zoom) => {
      const sketch = drawing();
      renderStarGlyph(
        sketch as unknown as p5,
        { x: 0, y: 0 },
        zoom,
        { q: 0, r: 0 },
        Array.from({ length: 5 }, () => ({}) as p5.Image),
      );
      if (zoom >= 0.65)
        expect(sketch.image.mock.calls[0]![3]).toBeLessThan(
          Math.sqrt(3) * HexGeometry.size,
        );
      else {
        expect(sketch.image).not.toHaveBeenCalled();
        expect(sketch.circle).toHaveBeenCalled();
      }
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
