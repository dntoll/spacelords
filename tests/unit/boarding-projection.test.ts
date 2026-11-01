import { describe, expect, it } from 'vitest';
import {
  boardingHexFromIsoPoint,
  boardingIsoCamera,
  boardingIsoCenter,
  boardingIsoHexPoint,
} from '../../src/client/views/BoardingProjection.js';

describe('isometrisk-bordningsvy', () => {
  it('projects both map axes diagonally and maps a screen point back to its hex', () => {
    const origin = boardingIsoCenter({ q: 0, r: 0 });
    const alongQ = boardingIsoCenter({ q: 1, r: 0 });
    const alongR = boardingIsoCenter({ q: 0, r: 1 });
    expect(alongQ.y).toBeGreaterThan(origin.y);
    expect(alongR.y).toBeGreaterThan(origin.y);
    expect(Math.sign(alongQ.x - origin.x)).not.toBe(
      Math.sign(alongR.x - origin.x),
    );

    const map = { width: 17, height: 11 };
    const view = { width: 390, height: 600 };
    const at = { q: 3, r: 9 };
    const camera = boardingIsoCamera(map, view);
    const screen = boardingIsoHexPoint(map, view, at);
    expect(screen.x).toBeGreaterThan(0);
    expect(screen.x).toBeLessThan(view.width);
    expect(screen.y).toBeGreaterThan(0);
    expect(screen.y).toBeLessThan(view.height);
    expect(
      boardingHexFromIsoPoint({
        x: (screen.x - camera.offset.x) / camera.scale,
        y: (screen.y - camera.offset.y) / camera.scale,
      }),
    ).toEqual(at);
  });
});
