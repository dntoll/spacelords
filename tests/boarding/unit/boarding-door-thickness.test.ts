import { describe, expect, it } from 'vitest';
import {
  boardingAirlockDoorDepth,
  boardingAirlockDoorGeometry,
  boardingIsoCenter,
  boardingThinWallMesh,
} from '../../../src/client/boarding/views/rendering/BoardingProjection.js';
import { BOARDING_METERS } from '../../../src/client/boarding/views/rendering/BoardingScale.js';

describe('tunnare-dorrar', () => {
  it('draws a door slab half as deep as a thin wall', () => {
    const depth = (thickness?: number) => {
      const mesh = boardingThinWallMesh(
        { q: 3, r: 3 },
        'r',
        2,
        undefined,
        0,
        thickness,
      );
      return Math.hypot(
        mesh.topAlongThickness.x - mesh.topOrigin.x,
        mesh.topAlongThickness.y - mesh.topOrigin.y,
      );
    };
    expect(BOARDING_METERS.door).toBeCloseTo(BOARDING_METERS.thinWall / 2);
    expect(depth(BOARDING_METERS.door)).toBeCloseTo(depth() / 2);
  });
});

describe('airlockdorr-framfor-soldat', () => {
  const airlock = { q: 4, r: 6 };
  const soldier = boardingIsoCenter(airlock).y;

  it('sorts the inner door of an airlock opening upward after a soldier inside it', () => {
    const inner = boardingAirlockDoorGeometry(airlock, 'top').find(
      (door) => door.role === 'inner',
    )!;
    expect(boardingAirlockDoorDepth(inner)).toBeGreaterThan(soldier);
  });

  it('keeps the far door behind the soldier', () => {
    const outer = boardingAirlockDoorGeometry(airlock, 'top').find(
      (door) => door.role === 'outer',
    )!;
    expect(boardingAirlockDoorDepth(outer)).toBeLessThan(soldier);
  });
});
