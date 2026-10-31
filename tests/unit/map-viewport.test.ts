import { describe, expect, it, vi } from 'vitest';
import { MapViewport } from '../../src/client/models/MapViewport.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../src/client/models/HexCoordinate.js';
import type { MapCell } from '../../src/client/models/Galaxy.js';

const cells: readonly MapCell[] = HexCoordinate.disk(100).map((position) => ({
  position,
  visible: position.q === 0,
  explored: position.q === 0,
  object:
    position.r % 20 === 0
      ? { kind: 'star', name: 'Star', type: 'star', owned: false }
      : null,
}));

describe('rumsligt-kartindex', () => {
  it('does not scan or project offscreen world cells when moving the camera', () => {
    const index = new MapViewport(cells);
    const project = vi.spyOn(HexGeometry, 'toPoint');
    try {
      const selected = index.query(
        { center: { x: 0, y: 0 }, zoom: 1 },
        390,
        660,
      );
      expect(selected.length).toBeGreaterThan(20);
      expect(selected.length).toBeLessThan(300);
      expect(project.mock.calls.length).toBeLessThan(300);
    } finally {
      project.mockRestore();
    }
  });

  it('preserves viewport edges, known space and distant stars at all zoom levels', () => {
    const index = new MapViewport(cells);
    for (const center of [
      { x: 0, y: 0 },
      { x: -1450, y: 2830 },
      { x: 6200, y: -3000 },
    ]) {
      for (const zoom of [0.03, 0.199, 0.5, 1, 2.5]) {
        const expected = cells.filter((cell) => {
          const point = HexGeometry.toPoint(cell.position);
          return (
            (zoom >= 0.5 || cell.explored || cell.object) &&
            Math.abs(point.x - center.x) <= 390 / (2 * zoom) + 108 &&
            Math.abs(point.y - center.y) <= 660 / (2 * zoom) + 108
          );
        });
        expect(
          index
            .query({ center, zoom }, 390, 660)
            .map((cell) => cell.position.key)
            .sort()
            .join(';'),
        ).toBe(
          expected
            .map((cell) => cell.position.key)
            .sort()
            .join(';'),
        );
      }
    }
  });

  it('uses a replacement snapshot after discovery without mutating old knowledge', () => {
    const old = new MapViewport(cells);
    const newlyKnown = {
      ...cells.find((cell) => cell.position.key === '1,1')!,
      explored: true,
    };
    const next = new MapViewport(
      cells.map((cell) => (cell.position.key === '1,1' ? newlyKnown : cell)),
    );
    const camera = { center: { x: 0, y: 0 }, zoom: 0.03 };
    expect(
      old.query(camera, 390, 660).some((cell) => cell.position.key === '1,1'),
    ).toBe(false);
    expect(next.query(camera, 390, 660)).toContain(newlyKnown);
    expect(cells.find((cell) => cell.position.key === '1,1')!.explored).toBe(
      false,
    );
  });
});
