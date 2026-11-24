import { describe, expect, it } from 'vitest';
import {
  ASTEROID_GLIDE_FACTOR,
  fleetGlideDuration,
  fleetGlidePoint,
  fleetGlideProgress,
} from '../../../src/client/space-map/views/star-map/FleetGlide.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import type { MapCell } from '../../../src/client/space-map/models/Galaxy.js';

describe('glidande-hexsteg', () => {
  it('eases from one hex centre to the next without skipping the middle', () => {
    expect(fleetGlideProgress(0)).toBe(0);
    expect(fleetGlideProgress(1)).toBe(1);
    expect(fleetGlideProgress(0.5)).toBe(0.5);
    expect(fleetGlideProgress(0.25)).toBeLessThan(0.25);
    const from = { x: 0, y: 0 };
    const to = { x: 40, y: 0 };
    expect(fleetGlidePoint(from, to, 0)).toEqual(from);
    expect(fleetGlidePoint(from, to, 1)).toEqual(to);
    expect(fleetGlidePoint(from, to, 0.5).x).toBe(20);
  });
});

describe('langsam-forflyttning-i-asteroidbalte', () => {
  const cell = (q: number, r: number, terrain: MapCell['terrain']) =>
    ({ position: new HexCoordinate(q, r), terrain }) as MapCell;
  const cells = [
    cell(0, 0, 'space'),
    cell(1, 0, 'sparse-asteroids'),
    cell(2, 0, 'space'),
    cell(3, 0, 'space'),
  ];
  const step = (from: number, to: number) => ({
    fleetId: 'fleet-home',
    from: new HexCoordinate(from, 0),
    to: new HexCoordinate(to, 0),
  });

  it('slows a step into or out of a sparse asteroid belt and keeps other steps', () => {
    expect(fleetGlideDuration(480, [step(2, 3)], cells)).toBe(480);
    expect(fleetGlideDuration(480, [step(0, 1)], cells)).toBe(
      480 * ASTEROID_GLIDE_FACTOR,
    );
    expect(fleetGlideDuration(480, [step(1, 2)], cells)).toBe(
      480 * ASTEROID_GLIDE_FACTOR,
    );
    expect(ASTEROID_GLIDE_FACTOR).toBeGreaterThan(1);
  });
});

describe('flytande-forflyttning', () => {
  it('moves linearly between steps and eases only at the ends of a journey', () => {
    expect(fleetGlideProgress(0.25, { start: false, end: false })).toBe(0.25);
    expect(fleetGlideProgress(0.25, { start: true, end: false })).toBeLessThan(
      0.25,
    );
    expect(
      fleetGlideProgress(0.75, { start: false, end: true }),
    ).toBeGreaterThan(0.75);
    const epsilon = 0.0001;
    expect(
      (1 - fleetGlideProgress(1 - epsilon, { start: true, end: false })) /
        epsilon,
    ).toBeCloseTo(1, 2);
    expect(
      fleetGlideProgress(epsilon, { start: false, end: true }) / epsilon,
    ).toBeCloseTo(1, 2);
  });
});

describe('rak-och-jamn-resa', () => {
  it('places intermediate markers on the straight line when it touches the route hex', async () => {
    const { fleetGlideWaypoint } =
      await import('../../../src/client/space-map/views/star-map/FleetGlide.js');
    const { HexGeometry } =
      await import('../../../src/client/common/HexCoordinate.js');
    const start = new HexCoordinate(0, 0);
    const target = new HexCoordinate(3, 3);
    const hex = new HexCoordinate(1, 0);
    const point = fleetGlideWaypoint(start, target, hex);
    const a = HexGeometry.toPoint(start),
      b = HexGeometry.toPoint(target);
    expect(
      (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x),
    ).toBeCloseTo(0, 8);
    expect(point).not.toEqual(HexGeometry.toPoint(hex));
  });
  it('stays in the detour hex when the direct line misses it', async () => {
    const { fleetGlideWaypoint } =
      await import('../../../src/client/space-map/views/star-map/FleetGlide.js');
    const { HexGeometry } =
      await import('../../../src/client/common/HexCoordinate.js');
    const detour = new HexCoordinate(1, -1);
    expect(
      fleetGlideWaypoint(
        new HexCoordinate(0, 0),
        new HexCoordinate(3, 3),
        detour,
      ),
    ).toEqual(HexGeometry.toPoint(detour));
  });
});

it('rak-och-jamn-resa: rejects a shortcut through a third hex', async () => {
  const { fleetGlideSegmentSafe } =
    await import('../../../src/client/space-map/views/star-map/FleetGlide.js');
  const { HexGeometry } =
    await import('../../../src/client/common/HexCoordinate.js');
  const from = new HexCoordinate(0, 0),
    to = new HexCoordinate(1, 0);
  const a = HexGeometry.toPoint(from),
    b = HexGeometry.toPoint(to);
  expect(fleetGlideSegmentSafe(from, to, a, b)).toBe(true);
  expect(
    fleetGlideSegmentSafe(
      from,
      to,
      { x: a.x, y: a.y - 36 },
      { x: b.x, y: b.y - 36 },
    ),
  ).toBe(false);
});

it('sikt-under-forflyttning: updates sight where the drawn path crosses the shared hex edge', async () => {
  const { fleetGlideCrossed } =
    await import('../../../src/client/space-map/views/star-map/FleetGlide.js');
  const { HexGeometry } =
    await import('../../../src/client/common/HexCoordinate.js');
  const from = new HexCoordinate(0, 0),
    to = new HexCoordinate(1, 0);
  const a = HexGeometry.toPoint(from),
    b = HexGeometry.toPoint(to);
  expect(
    fleetGlideCrossed(from, to, { x: a.x * 0.51 + b.x * 0.49, y: a.y }),
  ).toBe(false);
  expect(
    fleetGlideCrossed(from, to, { x: a.x * 0.49 + b.x * 0.51, y: a.y }),
  ).toBe(true);
});
