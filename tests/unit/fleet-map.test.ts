import { describe, expect, it, vi } from 'vitest';
import type p5 from 'p5';
import type { FleetSnapshot } from '../../src/client/models/Game.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../src/client/models/HexCoordinate.js';
import { renderMapFleets } from '../../src/client/views/FleetMapView.js';

function fleet(id: string, count = 3): FleetSnapshot {
  return {
    id,
    name: id,
    position: new HexCoordinate(0, 0),
    destination: new HexCoordinate(2, 0),
    ships: { Fighter: count, 'Colony ship': 0, 'Exploration ship': 0 },
    speed: 1,
    crew: 0,
  };
}
function drawing() {
  const sketch = {
    fill: vi.fn(),
    noStroke: vi.fn(),
    circle: vi.fn(),
    stroke: vi.fn(),
    strokeWeight: vi.fn(),
    line: vi.fn<(x: number, y: number, endX: number, endY: number) => void>(),
    triangle:
      vi.fn<
        (
          a: number,
          b: number,
          c: number,
          d: number,
          e: number,
          f: number,
        ) => void
      >(),
  };
  return {
    sketch,
    render: (fleets: readonly FleetSnapshot[], zoom = 1) =>
      renderMapFleets(sketch as unknown as p5, fleets, zoom),
  };
}

describe('kartflottor', () => {
  it('separates colocated fleets and starts each destination arrow at its own marker', () => {
    const { sketch, render } = drawing();
    render([fleet('first'), fleet('second'), fleet('empty', 0)]);
    const lines = sketch.line.mock.calls;
    expect(lines).toHaveLength(2);
    expect(lines[0]!.slice(0, 2)).not.toEqual(lines[1]!.slice(0, 2));
    for (const [x, y, endX, endY] of lines) {
      expect(Math.hypot(x, y)).toBeGreaterThan(10);
      expect([endX, endY]).toEqual(
        Object.values(HexGeometry.toPoint(new HexCoordinate(2, 0))),
      );
      const ships = sketch.triangle.mock.calls.filter(
        (points) => points[0] !== endX || points[1] !== endY,
      );
      expect(
        ships.some(
          ([a, b, c, d, e, f]) =>
            Math.hypot((a + c + e) / 3 - x, (b + d + f) / 3 - y) < 0.001,
        ),
      ).toBe(true);
      // Each arrow has an actual triangular head at the destination.
      expect(
        sketch.triangle.mock.calls.some(
          (points) => points[0] === endX && points[1] === endY,
        ),
      ).toBe(true);
    }
  });

  it('renders ship swarms with different sizes and keeps them readable through zoom', () => {
    const mixed = {
      ...fleet('mixed'),
      destination: null,
      ships: { Fighter: 1, 'Colony ship': 1, 'Exploration ship': 1 },
    };
    const first = drawing();
    first.render([mixed]);
    expect(first.sketch.circle).not.toHaveBeenCalled();
    expect(first.sketch.triangle).toHaveBeenCalledTimes(3);
    const areas = first.sketch.triangle.mock.calls.map(([a, b, c, d, e, f]) =>
      Math.abs((c - a) * (f - b) - (e - a) * (d - b)),
    );
    expect(new Set(areas).size).toBe(3);
    const second = drawing();
    second.render([mixed], 0.5);
    expect(second.sketch.triangle.mock.calls).toEqual(
      first.sketch.triangle.mock.calls.map((points) =>
        points.map((value: number) => value * 2),
      ),
    );
  });

  it('keeps large fleets compact and omits empty fleets', () => {
    const { sketch, render } = drawing();
    render([
      { ...fleet('large', 1000000), destination: null },
      fleet('empty', 0),
    ]);
    expect(sketch.triangle.mock.calls.length).toBeGreaterThan(1);
    expect(sketch.triangle.mock.calls.length).toBeLessThanOrEqual(9);
    expect(sketch.line).not.toHaveBeenCalled();
  });
});
