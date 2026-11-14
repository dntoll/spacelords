import { describe, expect, it } from 'vitest';
import {
  boardingObjectArtwork,
  boardingObjectBounds,
} from '../../../src/client/boarding/views/rendering/BoardingObjectArtwork.js';
import {
  BOARDING_COVER_HEIGHT,
  boardingFeatureFootprint,
  boardingFeatureHeight,
  boardingIsoBlockFaces,
  boardingIsoCenter,
  boardingIsoCorners,
} from '../../../src/client/boarding/views/rendering/BoardingProjection.js';

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
    ).toBeNull();
    const box = boardingObjectBounds('reactor', { x: 100, y: 100 });
    expect(box.width).toBeLessThan(64);
    expect(box.x + box.width / 2).toBe(100);
  });
  it('halvskydd-som-geometri: builds Half cover as a 1.2 m box inside its tile', () => {
    const footprint = boardingFeatureFootprint('cover');
    const faces = boardingIsoBlockFaces(
      boardingIsoCenter({ q: 2, r: 2 }),
      footprint.width,
      footprint.depth,
      boardingFeatureHeight('cover'),
    );
    const tile = boardingIsoCorners({ q: 2, r: 2 });
    const xs = tile.map((corner) => corner.x);
    for (const point of [...faces.southEast, ...faces.southWest]) {
      expect(point.x).toBeGreaterThanOrEqual(Math.min(...xs));
      expect(point.x).toBeLessThanOrEqual(Math.max(...xs));
    }
    expect(boardingFeatureHeight('cover')).toBe(BOARDING_COVER_HEIGHT);
    // The top is the footprint diamond lifted by the box height.
    expect(faces.top[2].y - faces.top[0].y).toBeCloseTo(footprint.depth * 2);
  });
});
