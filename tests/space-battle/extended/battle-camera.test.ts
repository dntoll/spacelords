import { expect, it } from 'vitest';
import { BattleCameraController } from '../../../src/client/space-battle/views/BattleCameraController.js';

it.each([
  [320, 568],
  [393, 851],
  [844, 390],
  [1440, 1000],
])(
  'begransad-stridskamera: fits the whole map in %s × %s while filling at least one axis and bounding extreme gestures',
  (width, height) => {
    const camera = new BattleCameraController();
    camera.configure({ width: 15, height: 9 }, width, height);
    const initial = camera.snapshot;
    const mapWidth = initial.bounds.right - initial.bounds.left;
    const mapHeight = initial.bounds.bottom - initial.bounds.top;
    expect(mapWidth * initial.scale).toBeLessThanOrEqual(width + 0.0001);
    expect(mapHeight * initial.scale).toBeLessThanOrEqual(height + 0.0001);
    expect(
      Math.max(
        (mapWidth * initial.scale) / width,
        (mapHeight * initial.scale) / height,
      ),
    ).toBeCloseTo(1);
    for (const factor of [0.00001, 100000, 0.00001]) {
      camera.zoom(factor, { x: 2, y: 3 });
      for (const sign of [-1, 1]) {
        camera.pan({ x: 1e6 * sign, y: 1e6 * sign });
        const s = camera.snapshot;
        expect(s.scale).toBeGreaterThanOrEqual(s.minScale);
        expect(s.scale).toBeLessThanOrEqual(s.maxScale);
        expect(
          Math.max(
            (mapWidth * s.scale) / width,
            (mapHeight * s.scale) / height,
          ),
        ).toBeGreaterThanOrEqual(1 - 0.0001);
        for (const [size, low, high, offset] of [
          [width, s.bounds.left, s.bounds.right, s.offset.x],
          [height, s.bounds.top, s.bounds.bottom, s.offset.y],
        ] as const) {
          if ((high - low) * s.scale < size) {
            expect(((low + high) * s.scale) / 2 + offset).toBeCloseTo(size / 2);
          } else {
            expect(low * s.scale + offset).toBeLessThanOrEqual(24.0001);
            expect(high * s.scale + offset).toBeGreaterThanOrEqual(
              size - 24.0001,
            );
          }
        }
      }
    }
  },
);

it('begransad-stridskamera: preserves a zoom anchor until bounds intervene and recalculates on rotation', () => {
  const camera = new BattleCameraController();
  camera.configure({ width: 15, height: 9 }, 393, 851);
  const anchor = { x: 196.5, y: 425.5 };
  const world = camera.unproject(anchor);
  camera.zoom(1.2, anchor);
  expect(camera.unproject(anchor).x).toBeCloseTo(world.x);
  expect(camera.unproject(anchor).y).toBeCloseTo(world.y);
  camera.configure({ width: 15, height: 9 }, 844, 390);
  expect(camera.snapshot.width).toBe(844);
  expect(camera.snapshot.scale).toBeGreaterThanOrEqual(
    camera.snapshot.minScale,
  );
});
