import { describe, expect, it } from 'vitest';
import {
  BOARDING_EFFECT_DURATION,
  boardingDestructionEffect,
  boardingEffectParticles,
  boardingRubble,
} from '../../src/client/views/boarding/BoardingEffectParticles.js';

describe('bordning-explosioner-och-forstorelse', () => {
  const at = { q: 3, r: 4 };

  it('replays identically, glows for a frag blast and ends after its duration', () => {
    const early = boardingEffectParticles('frag', at, 60);
    expect(early).toEqual(boardingEffectParticles('frag', at, 60));
    expect(early.some((particle) => particle.glow)).toBe(true);
    expect(early.some((particle) => particle.shape === 'shard')).toBe(true);
    expect(
      boardingEffectParticles('frag', at, BOARDING_EFFECT_DURATION.frag),
    ).toEqual([]);
  });

  it('shows smoke grenades as grey smoke without fire', () => {
    const puff = boardingEffectParticles('smoke', at, 200);
    expect(puff.length).toBeGreaterThan(0);
    expect(puff.every((particle) => !particle.glow)).toBe(true);
  });

  it('fades particles out and throws debris outward over time', () => {
    const spread = (elapsed: number) =>
      Math.max(
        ...boardingEffectParticles('debris', at, elapsed)
          .filter((particle) => particle.shape === 'shard')
          .map((particle) => Math.abs(particle.x)),
      );
    expect(spread(500)).toBeGreaterThan(spread(50));
    const alphas = boardingEffectParticles('debris', at, 700).map(
      (particle) => particle.alpha,
    );
    expect(Math.max(...alphas)).toBeLessThan(1);
  });

  it('gives the reactor a larger blast and leaves rubble within its tile', () => {
    expect(boardingDestructionEffect('reactor')).toBe('reactor');
    expect(boardingDestructionEffect('door')).toBe('debris');
    const rubble = boardingRubble(at);
    expect(rubble).toEqual(boardingRubble(at));
    expect(
      rubble.every((piece) => Math.abs(piece.x) < 32 && Math.abs(piece.y) < 27),
    ).toBe(true);
  });
});
