import { expect, it } from 'vitest';
import { BattleCameraController } from '../../src/client/controllers/BattleCameraController.js';

it.each([
  [320, 568],
  [393, 851],
  [844, 390],
  [1440, 1000],
])(
  'begransad-stridskamera: fills %s × %s and limits all extreme gestures to a 24px border',
  (width, height) => {
    const camera = new BattleCameraController();
    camera.configure({ width: 15, height: 9 }, width, height);
    for (const factor of [0.00001, 100000, 0.00001]) {
      camera.zoom(factor, { x: 2, y: 3 });
      for (const sign of [-1, 1]) {
        camera.pan({ x: 1e6 * sign, y: 1e6 * sign });
        const s = camera.snapshot;
        expect(s.scale).toBeGreaterThanOrEqual(s.minScale);
        expect(s.scale).toBeLessThanOrEqual(s.maxScale);
        expect(s.bounds.left * s.scale + s.offset.x).toBeLessThanOrEqual(
          24.0001,
        );
        expect(s.bounds.right * s.scale + s.offset.x).toBeGreaterThanOrEqual(
          width - 24.0001,
        );
        expect(s.bounds.top * s.scale + s.offset.y).toBeLessThanOrEqual(
          24.0001,
        );
        expect(s.bounds.bottom * s.scale + s.offset.y).toBeGreaterThanOrEqual(
          height - 24.0001,
        );
      }
    }
  },
);

it('begransad-stridskamera: preserves a zoom anchor until bounds intervene and recalculates on rotation', () => {
  const camera = new BattleCameraController();
  camera.configure({ width: 15, height: 9 }, 393, 851);
  const anchor = { x: 196, y: 425 };
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
