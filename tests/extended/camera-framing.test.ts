import { describe, expect, it } from 'vitest';
import {
  CameraFraming,
  type CameraBounds,
} from '../../src/client/models/CameraFraming.js';
import type { CameraSnapshot } from '../../src/client/models/Camera.js';
import type { Point } from '../../src/client/models/HexCoordinate.js';

const bounds = { left: -150, right: 150, top: -220, bottom: 220 };
const origin = { center: { x: 0, y: 0 }, zoom: 1 };
function expectInside(
  camera: CameraSnapshot,
  positions: readonly Point[],
  area: CameraBounds,
) {
  for (const point of positions) {
    const x = (point.x - camera.center.x) * camera.zoom;
    const y = (point.y - camera.center.y) * camera.zoom;
    expect(x - 36 * camera.zoom).toBeGreaterThanOrEqual(area.left - 1e-7);
    expect(x + 36 * camera.zoom).toBeLessThanOrEqual(area.right + 1e-7);
    expect(y - 36 * camera.zoom).toBeGreaterThanOrEqual(area.top - 1e-7);
    expect(y + 36 * camera.zoom).toBeLessThanOrEqual(area.bottom + 1e-7);
  }
}

describe('handelseanpassad-kartkamera', () => {
  it('zooms out around the player camera before focusing all points of a bent route', () => {
    const points = [
      { x: 500, y: 0 },
      { x: 900, y: -500 },
      { x: 1100, y: 100 },
    ];
    const from = { center: { x: -180, y: 75 }, zoom: 2 };
    const framing = new CameraFraming(from, points, bounds);
    expect(framing.transitions.map((phase) => phase.duration)).toEqual([
      300, 450,
    ]);
    const overview = framing.transitions[0]!;
    expect(overview.from).toEqual(from);
    expect(overview.to.center).toEqual(from.center);
    expect(overview.to.zoom).toBeLessThan(from.zoom);
    expectInside(overview.to, points, bounds);
    expectInside(framing.target, points, bounds);
    expect(framing.target.zoom).toBeLessThan(1);
    expect(Object.isFrozen(framing.transitions)).toBe(true);
    expect(Object.isFrozen(framing.target.center)).toBe(true);
  });

  it('skips unnecessary overview and unchanged phases and caps closeups at normal zoom', () => {
    const points = [{ x: 10, y: 0 }];
    const framing = new CameraFraming(origin, points, bounds);
    expect(framing.transitions.map((phase) => phase.duration)).toEqual([450]);
    expect(framing.target.zoom).toBe(1);
    expect(
      new CameraFraming(framing.target, points, bounds).transitions,
    ).toEqual([]);
    expect(
      new CameraFraming({ ...origin, zoom: 0.1 }, points, bounds).transitions,
    ).toHaveLength(1);
  });

  it('fits small and wide maps, overlay offsets and distant targets below manual minzoom', () => {
    for (const area of [
      bounds,
      { left: -300, right: 180, top: -90, bottom: 90 },
    ]) {
      const points = [
        { x: -15000, y: -5000 },
        { x: 20000, y: 8000 },
      ];
      const framing = new CameraFraming(origin, points, area);
      expect(framing.target.zoom).toBeLessThan(0.03);
      expectInside(framing.target, points, area);
    }
  });

  it('reserves the focus anchor for event text and interpolates smoothly without mutating input', () => {
    const framing = new CameraFraming(origin, [{ x: 600, y: 0 }], bounds, {
      x: 0,
      y: -120,
    });
    expectInside(framing.target, [{ x: 600, y: 0 }], bounds);
    expect((0 - framing.target.center.y) * framing.target.zoom).toBe(-120);
    const phase = framing.transitions.at(-1)!;
    expect(CameraFraming.sample(phase, 0)).toEqual(phase.from);
    expect(CameraFraming.sample(phase, 1)).toEqual(phase.to);
    const halfway = CameraFraming.sample(phase, 0.5);
    expect(halfway.zoom).toBeCloseTo(
      Math.sqrt(phase.from.zoom * phase.to.zoom),
    );
    expect(origin).toEqual({ center: { x: 0, y: 0 }, zoom: 1 });
  });

  it('keeps targets visible throughout a large simultaneous pan and zoom', () => {
    const points = [
      { x: 500, y: -50 },
      { x: 650, y: 50 },
    ];
    const framing = new CameraFraming(
      { center: { x: -10000, y: 1000 }, zoom: 1 },
      points,
      bounds,
    );
    const focus = framing.transitions.at(-1)!;
    for (const progress of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1])
      expectInside(CameraFraming.sample(focus, progress), points, bounds);
  });
});
