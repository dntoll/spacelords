import { describe, expect, it } from 'vitest';
import {
  boardingObjectArtwork,
  boardingObjectBounds,
} from '../../src/client/views/boarding/BoardingObjectArtwork.js';

describe('isometriska-bordningsobjekt', () => {
  it('draws doors as thin walls instead of sprites', () => {
    // dorrar-som-tunna-vaggar replaces the door sprites.
    for (const open of [false, true])
      expect(
        boardingObjectArtwork({ kind: 'door', position: { q: 2, r: 2 }, open }),
      ).toBeNull();
  });
  it('uses distinct intact objects and fits calibrated objects within their meter footprint', () => {
    expect(
      boardingObjectArtwork({ kind: 'reactor', position: { q: 0, r: 0 } }),
    ).toBe('reactor');
    expect(
      boardingObjectArtwork({ kind: 'cover', position: { q: 0, r: 0 } }),
    ).toBe('crate');
    expect(
      boardingObjectArtwork({
        kind: 'cover',
        position: { q: 0, r: 0 },
        destroyed: true,
      }),
    ).toBeNull();
    // kameravinkel-60-i-bordning: the crate stays within one tile and shows
    // its top face as well as its sides.
    const box = boardingObjectBounds('crate', { x: 100, y: 100 });
    expect(box.width).toBeLessThan(64);
    const verticalMeter = 64 / Math.SQRT2 / 2;
    const tileDepth = 32 * Math.sqrt(3);
    expect(box.height).toBeGreaterThan(verticalMeter);
    expect(box.height).toBeLessThan(1.2 * verticalMeter + tileDepth);
    expect(box.y + box.height).toBeGreaterThan(100);
    expect(box.x + box.width / 2).toBe(100);
  });
});
