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
