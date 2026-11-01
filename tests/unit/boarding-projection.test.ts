import { describe, expect, it } from 'vitest';
import {
  boardingCellFromIsoPoint,
  boardingFeatureFootprint,
  boardingIsoCamera,
  boardingIsoCenter,
  boardingIsoCorners,
  boardingIsoCellPoint,
} from '../../src/client/views/BoardingProjection.js';

describe('isometrisk-bordningsvy', () => {
  it('uses classic 2:1 diamond tiles and maps a screen point back to its square cell', () => {
    const origin = boardingIsoCenter({ q: 0, r: 0 });
    const alongQ = boardingIsoCenter({ q: 1, r: 0 });
    const alongR = boardingIsoCenter({ q: 0, r: 1 });
    expect(alongQ.y).toBeGreaterThan(origin.y);
    expect(alongR.y).toBeGreaterThan(origin.y);
    expect(Math.sign(alongQ.x - origin.x)).not.toBe(
      Math.sign(alongR.x - origin.x),
    );
    const corners = boardingIsoCorners({ q: 0, r: 0 });
    expect(corners).toHaveLength(4);
    const width =
      Math.max(...corners.map((point) => point.x)) -
      Math.min(...corners.map((point) => point.x));
    const height =
      Math.max(...corners.map((point) => point.y)) -
      Math.min(...corners.map((point) => point.y));
    expect(width / height).toBe(2);
    expect(boardingFeatureFootprint('wall')).toEqual({
      width: width / 2,
      depth: height / 2,
    });
    expect(boardingFeatureFootprint('hull')).toEqual({
      width: width / 2,
      depth: height / 2,
    });

    const map = { width: 17, height: 11 };
    const view = { width: 390, height: 600 };
    const at = { q: 3, r: 9 };
    const camera = boardingIsoCamera(map, view);
    const screen = boardingIsoCellPoint(map, view, at);
    expect(screen.x).toBeGreaterThan(0);
    expect(screen.x).toBeLessThan(view.width);
    expect(screen.y).toBeGreaterThan(0);
    expect(screen.y).toBeLessThan(view.height);
    expect(
      boardingCellFromIsoPoint({
        x: (screen.x - camera.offset.x) / camera.scale,
        y: (screen.y - camera.offset.y) / camera.scale,
      }),
    ).toEqual(at);
  });
});
