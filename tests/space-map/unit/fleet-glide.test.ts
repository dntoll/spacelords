import { describe, expect, it } from 'vitest';
import {
  fleetGlidePoint,
  fleetGlideProgress,
} from '../../../src/client/space-map/views/star-map/FleetGlide.js';

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
