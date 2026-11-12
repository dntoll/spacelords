import { expect, it } from 'vitest';
import { boardingSmokeParticles } from '../../src/client/views/boarding/BoardingSmokeParticles.js';

it('volymetrisk-bordningsrok: particles rise, fade and cycle through three textures', () => {
  const start = boardingSmokeParticles({ q: 0, r: 0 }, 0);
  const later = boardingSmokeParticles({ q: 0, r: 0 }, 800);
  expect(new Set(start.map((particle) => particle.texture))).toEqual(
    new Set([0, 1, 2]),
  );
  expect(start[0]!.opacity).toBe(0);
  expect(later[0]!.y).toBeLessThan(start[0]!.y);
  expect(later[0]!.opacity).toBeGreaterThan(0);
  expect(boardingSmokeParticles({ q: 0, r: 0 }, 3200)).toEqual(start);
});
