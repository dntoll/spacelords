import { BOARDING_SPRITE_METRICS } from '../../src/client/views/boarding/BoardingSpriteMetrics.js';
import { boardingObjectBounds } from '../../src/client/views/boarding/BoardingObjectArtwork.js';
import { describe, expect, it } from 'vitest';
import {
  BOARDING_WALL_HEIGHT,
  BOARDING_DOOR_HEIGHT,
  BOARDING_COVER_HEIGHT,
  boardingIsoCamera,
  boardingIsoCenter,
} from '../../src/client/views/boarding/BoardingProjection.js';
import {
  boardingCharacterSprite,
  BOARDING_FOOT_PLANT,
  NO_FLIGHT_ADJUSTMENT,
} from '../../src/client/views/boarding/BoardingCharacterSprite.js';

// kameravinkel-60-i-bordning: a 60 degree camera gives a 64 x 32√3 ground diamond.
const groundMeter = 64 / Math.SQRT2;
const halfDepth = 16 * Math.sqrt(3);
const verticalMeter = groundMeter / 2;
// The existing sprites were rendered for the earlier 2:1 (30 degree) camera.
const spriteVerticalMeter = 16 * Math.sqrt(6);
const squash = verticalMeter / spriteVerticalMeter;
describe('meterskala-i-bordning', () => {
  it('keeps the 1 m square floor and gives walls, openings and cover their agreed meter heights', () => {
    const alongQ = boardingIsoCenter({ q: 1, r: 0 });
    const alongR = boardingIsoCenter({ q: 0, r: 1 });
    expect(alongQ.x).toBe(32);
    expect(alongQ.y).toBeCloseTo(halfDepth);
    expect(alongR.x).toBe(-32);
    expect(alongR.y).toBeCloseTo(halfDepth);
    expect(BOARDING_WALL_HEIGHT / verticalMeter).toBeCloseTo(2.4);
    expect(BOARDING_DOOR_HEIGHT / verticalMeter).toBeCloseTo(2.1);
    expect(BOARDING_COVER_HEIGHT / verticalMeter).toBeCloseTo(1.2);
  });
  it('calibrates the free opening rather than the complete image and keeps door frames stationary', () => {
    for (const axis of ['q', 'r'] as const) {
      const closed = `door-closed-${axis}` as const,
        open = `door-open-${axis}` as const;
      expect(
        BOARDING_SPRITE_METRICS[open].openingHeight / spriteVerticalMeter,
      ).toBeCloseTo(2.1);
      expect(boardingObjectBounds(open, { x: 0, y: 0 }).height).toBeCloseTo(
        BOARDING_SPRITE_METRICS[open].height * squash,
      );
      expect(boardingObjectBounds(open, { x: 10, y: 20 })).toEqual(
        boardingObjectBounds(closed, { x: 10, y: 20 }),
      );
      expect(boardingObjectBounds(open, { x: 10, y: 20 }).width).toBeLessThan(
        64,
      );
    }
    expect(
      BOARDING_SPRITE_METRICS.airlock.openingHeight / spriteVerticalMeter,
    ).toBeCloseTo(2.1);
  });
  it('plants a standing 1.8 m person at its feet and keeps the camera above the highest wall', () => {
    const { source, destination: sprite } = boardingCharacterSprite(
      'player',
      { x: 0, y: 0 },
      'standing',
    );
    // kameravinkel-60-i-bordning: a 60-degree figure shows its 1.8 m height
    // and part of its depth, so it is taller than 1.8 vertical meters but
    // shorter than that plus half a tile, and keeps the artwork's proportions.
    expect(sprite.height).toBeGreaterThan(1.8 * verticalMeter);
    expect(sprite.height).toBeLessThan(1.8 * verticalMeter + halfDepth * 1.2);
    expect(sprite.width / sprite.height).toBeCloseTo(
      source.width / source.height,
    );
    expect(sprite.y + sprite.height).toBe(
      BOARDING_FOOT_PLANT + NO_FLIGHT_ADJUSTMENT,
    );
    const camera = boardingIsoCamera(
      { width: 3, height: 3 },
      { width: 430, height: 500 },
    );
    expect(
      camera.offset.y + (-halfDepth - 2.4 * verticalMeter) * camera.scale,
    ).toBeGreaterThanOrEqual(18 - 1e-6);
  });
});
