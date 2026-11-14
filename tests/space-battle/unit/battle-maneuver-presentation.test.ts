import { expect, it } from 'vitest';
import {
  maneuverFrame,
  maneuverOptionLayout,
} from '../../../src/client/space-battle/views/BattleManeuverPresentation.js';

it('animerad-skeppsforflyttning: interpolates movement and the shortest turn between hexes', () => {
  const frame = maneuverFrame(
    { position: { q: 1, r: 2 }, facing: 5 },
    { position: { q: 2, r: 2 }, facing: 0 },
    0.5,
  );
  expect(frame.offset.x).toBeGreaterThan(0);
  expect(frame.offset.y).toBe(0);
  expect(frame.facing).toBeCloseTo(5.5);
});

it('manoverval-vid-hexkant: places each facing towards its hex edge and separates duplicate choices', () => {
  const center = { x: 400, y: 300 };
  for (let facing = 0; facing < 6; facing++) {
    const [point] = maneuverOptionLayout([{ center, facing }], 1, {
      width: 1000,
      height: 800,
    });
    const angle = (-facing * Math.PI) / 3;
    expect(
      (point!.x - center.x) * Math.cos(angle) +
        (point!.y - center.y) * Math.sin(angle),
    ).toBeGreaterThan(0);
  }
  const points = maneuverOptionLayout(
    [
      { center, facing: 0 },
      { center, facing: 0 },
    ],
    1,
    { width: 1000, height: 800 },
  );
  expect(
    Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y),
  ).toBeGreaterThanOrEqual(26);
});
