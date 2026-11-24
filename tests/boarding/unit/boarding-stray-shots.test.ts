import { describe, expect, it } from 'vitest';
import { boardingStrayShot } from '../../../src/client/boarding/models/battle/BoardingSightGeometry.js';

describe('missade-skott-traffar-annat', () => {
  const from = { q: 1, r: 3 };
  const aim = { q: 5, r: 3 };
  const open = () => false;
  it('misses the target and drifts farther for a larger miss', () => {
    const near = boardingStrayShot(from, aim, 1, 1, 12, 7, open, []);
    const far = boardingStrayShot(from, aim, 20, 1, 12, 7, open, []);
    expect(near.to.r).toBeGreaterThan(3);
    expect(far.to.r).toBeGreaterThan(near.to.r);
    expect(near.to.q).toBeCloseTo(11.5);
  });
  it('strikes the nearest person or solid and stops before anything behind it', () => {
    const bodies = [
      { q: 3, r: 3.4, cover: false, id: 'ally' },
      { q: 6, r: 4, cover: false, id: 'other' },
    ];
    const result = boardingStrayShot(from, aim, 1, 1, 12, 7, open, bodies);
    expect(result.id).toBe('ally');
    const blocked = boardingStrayShot(
      from,
      aim,
      1,
      1,
      12,
      7,
      (q, r) => q === 2 && r === 3,
      bodies,
    );
    expect(blocked.id).toBeUndefined();
    expect(blocked.to.q).toBeLessThan(result.to.q);
  });
});

describe('forsvararskott-samma-ruta', () => {
  it('finishes a missed shot when shooter and target share a tile', () => {
    const position = { q: 1, r: 1 };
    expect(
      boardingStrayShot(position, position, 1, 1, 12, 7, () => false, []),
    ).toEqual({ to: position });
  });
});
