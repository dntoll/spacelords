import { expect, it, vi } from 'vitest';
import { BattleCameraController } from '../../src/client/views/battle/BattleCameraController.js';
import {
  battleControlsLayout,
  maneuverControlsLayout,
} from '../../src/client/views/battle/BattleControlsLayout.js';
import { createTestBattle } from '../../src/client/models/battle/TestBattle.js';
import { battleHex } from '../../src/client/models/TacticalBattle.js';

it.each([
  [320, 568],
  [393, 851],
  [844, 390],
  [1440, 1000],
])(
  'skeppsnara-stridskontroller: keeps large-hull controls distinct and reachable at the edges of %s × %s',
  (width, height) => {
    const camera = new BattleCameraController();
    camera.configure({ width: 15, height: 9 }, width, height);
    for (const facing of [0, 1, 2, 3, 4, 5]) {
      for (const [x, y] of [
        [25, 90],
        [width / 2, height / 2],
        [width - 25, height - 70],
      ]) {
        const angle = (-facing * Math.PI) / 3;
        const hull = [-60, 0, 60].map((distance) => ({
          x: x! + Math.cos(angle) * distance,
          y: y! + Math.sin(angle) * distance,
        }));
        for (const count of [2, 4]) {
          const controls = battleControlsLayout(
            camera.snapshot,
            hull,
            facing,
            count,
          );
          expect(controls).toHaveLength(count);
          controls.forEach((point, index) => {
            expect(point.x).toBeGreaterThanOrEqual(24);
            expect(point.x).toBeLessThanOrEqual(width - 24);
            expect(point.y).toBeGreaterThanOrEqual(90);
            expect(point.y).toBeLessThanOrEqual(height - 80);
            for (const other of controls.slice(0, index))
              expect(
                Math.hypot(other.x - point.x, other.y - point.y),
              ).toBeGreaterThanOrEqual(48);
          });
        }
      }
    }
  },
);

it('skeppsnara-stridskontroller: forward follows the nose and end follows the stern away from screen edges', () => {
  const camera = new BattleCameraController();
  camera.configure({ width: 15, height: 9 }, 1440, 1000);
  const center = { x: 720, y: 500 };
  for (let facing = 0; facing < 6; facing++) {
    const [forward, , , end] = battleControlsLayout(
      camera.snapshot,
      [center],
      facing,
      4,
    );
    const nose = {
      x: Math.cos((-facing * Math.PI) / 3),
      y: Math.sin((-facing * Math.PI) / 3),
    };
    expect(
      (forward!.x - center.x) * nose.x + (forward!.y - center.y) * nose.y,
    ).toBeGreaterThan(60);
    expect(
      (end!.x - center.x) * nose.x + (end!.y - center.y) * nose.y,
    ).toBeLessThan(-60);
  }
});

it('skeppsnara-stridskontroller / begransad-stridskamera: keeps target hit areas clear when zoomed out on portrait mobile', () => {
  const camera = new BattleCameraController();
  camera.configure({ width: 15, height: 9 }, 393, 851);
  const ship = camera.project(battleHex(1, 4));
  const target = camera.project(battleHex(4, 4));
  const controls = battleControlsLayout(camera.snapshot, [ship], 0, 4, [
    ship,
    target,
  ]);
  for (const point of controls)
    expect(
      Math.hypot(point.x - target.x, point.y - target.y),
    ).toBeGreaterThanOrEqual(24 + 36 * camera.snapshot.scale);
});

it('fuskknapp-for-teststrid: uses normal asteroids with clear deployment zones and both large ships', () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1);
  const battle = createTestBattle();
  clock.mockRestore();
  const initial = battle.snapshot;
  expect(initial.phase).toBe('deployment');
  expect(initial.asteroids.length).toBeGreaterThan(0);
  for (const hex of initial.asteroids) {
    expect(battle.isDeployment(hex, 'player')).toBe(false);
    expect(battle.isDeployment(hex, 'enemy')).toBe(false);
  }
  expect(
    initial.pieces.filter((piece) =>
      ['Transport ship', 'Colony ship'].includes(piece.type),
    ),
  ).toHaveLength(2);
  battle.command({ type: 'auto-deploy' });
  expect(
    battle.snapshot.pieces
      .filter((piece) => piece.side === 'player')
      .every((piece) => piece.position),
  ).toBe(true);
  expect(battle.snapshot.asteroids).toEqual(initial.asteroids);
});

it('styrning-pa-skrovet: headings sit on the bow edges and speed at the stern', () => {
  const nose = { x: 200, y: 100 };
  const center = { x: 137, y: 136 };
  const stern = { x: 74, y: 172 };
  const places = maneuverControlsLayout(nose, center, stern, 1, 1, false);
  expect(places.straight.y).toBeLessThan(nose.y);
  expect(places.left.x).toBeLessThan(places.straight.x);
  expect(places.right.x).toBeGreaterThan(places.straight.x);
  expect(places.done).toEqual(center);
  expect(places.speed.y).toBeGreaterThan(nose.y);
  expect(places.faster.x).not.toBeCloseTo(places.slower.x);
  expect(places.speed.x).toBeGreaterThan(
    Math.min(places.faster.x, places.slower.x),
  );
  expect(places.speed.x).toBeLessThan(Math.max(places.faster.x, places.slower.x));
});
