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
} from '../../src/client/views/boarding/BoardingCharacterSprite.js';

const verticalMeter = 16 * Math.sqrt(6);
describe('meterskala-i-bordning', () => {
  it('keeps the 1 m square floor and gives walls, openings and cover their agreed meter heights', () => {
    const alongQ = boardingIsoCenter({ q: 1, r: 0 });
    const alongR = boardingIsoCenter({ q: 0, r: 1 });
    expect(alongQ).toEqual({ x: 32, y: 16 });
    expect(alongR).toEqual({ x: -32, y: 16 });
    expect(BOARDING_WALL_HEIGHT / verticalMeter).toBeCloseTo(2.4);
    expect(BOARDING_DOOR_HEIGHT / verticalMeter).toBeCloseTo(2.1);
    expect(BOARDING_COVER_HEIGHT / verticalMeter).toBeCloseTo(1.2);
  });
  it('calibrates the free opening rather than the complete image and keeps door frames stationary', () => {
    for (const axis of ['q', 'r'] as const) {
      const closed = `door-closed-${axis}` as const,
        open = `door-open-${axis}` as const;
      expect(
        BOARDING_SPRITE_METRICS[open].openingHeight / verticalMeter,
      ).toBeCloseTo(2.1);
      expect(boardingObjectBounds(open, { x: 10, y: 20 })).toEqual(
        boardingObjectBounds(closed, { x: 10, y: 20 }),
      );
      expect(boardingObjectBounds(open, { x: 10, y: 20 }).width).toBeLessThan(
        64,
      );
    }
    expect(
      BOARDING_SPRITE_METRICS.airlock.openingHeight / verticalMeter,
    ).toBeCloseTo(2.1);
  });
  it('plants a standing 1.8 m person at its feet and keeps the camera above the highest wall', () => {
    const sprite = boardingCharacterSprite(
      'player',
      { x: 0, y: 0 },
      'standing',
    ).destination;
    expect(sprite.height / verticalMeter).toBeCloseTo(1.8);
    expect(sprite.y + sprite.height).toBe(BOARDING_FOOT_PLANT);
    const camera = boardingIsoCamera(
      { width: 3, height: 3 },
      { width: 430, height: 500 },
    );
    expect(
      camera.offset.y + (-16 - 2.4 * verticalMeter) * camera.scale,
    ).toBeGreaterThanOrEqual(18 - 1e-6);
  });
});
