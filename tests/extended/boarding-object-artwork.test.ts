import { describe, expect, it } from 'vitest';
import {
  boardingDoorAxis,
  boardingObjectArtwork,
  boardingObjectBounds,
} from '../../src/client/views/boarding/BoardingObjectArtwork.js';

describe('isometriska-bordningsobjekt', () => {
  it('chooses the door state and the wall axis without changing the model', () => {
    const walls = new Set(['1,2', '3,2']);
    const wallAt = (q: number, r: number) => walls.has(`${q},${r}`);
    expect(boardingDoorAxis({ q: 2, r: 2 }, wallAt)).toBe('q');
    expect(
      boardingObjectArtwork(
        { kind: 'door', position: { q: 2, r: 2 }, open: false },
        wallAt,
      ),
    ).toBe('door-closed-q');
    expect(
      boardingObjectArtwork(
        { kind: 'door', position: { q: 2, r: 2 }, open: true },
        wallAt,
      ),
    ).toBe('door-open-q');
    const otherWall = (q: number, r: number) => q === 2 && (r === 1 || r === 3);
    expect(boardingDoorAxis({ q: 2, r: 2 }, otherWall)).toBe('r');
    expect(
      boardingObjectArtwork(
        { kind: 'door', position: { q: 2, r: 2 }, open: true },
        otherWall,
      ),
    ).toBe('door-open-r');
    expect(
      boardingObjectArtwork(
        { kind: 'door', position: { q: 2, r: 2 }, destroyed: true },
        otherWall,
      ),
    ).toBeNull();
  });
  it('uses distinct intact objects and fits calibrated objects within their meter footprint', () => {
    const wallAt = () => false;
    expect(
      boardingObjectArtwork(
        { kind: 'reactor', position: { q: 0, r: 0 } },
        wallAt,
      ),
    ).toBe('reactor');
    expect(
      boardingObjectArtwork(
        { kind: 'cover', position: { q: 0, r: 0 } },
        wallAt,
      ),
    ).toBe('crate');
    expect(
      boardingObjectArtwork(
        { kind: 'cover', position: { q: 0, r: 0 }, destroyed: true },
        wallAt,
      ),
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
