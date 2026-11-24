import { expect, test } from '@playwright/test';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { Galaxy } from '../../../src/client/space-map/models/Galaxy.js';
import {
  createExampleGalaxy,
  createExpandedGalaxy,
} from '../../../src/client/space-map/models/exampleGalaxy.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../../src/client/common/HexCoordinate.js';
import { selectMapHex } from './map-helpers.js';
import { seedGame } from './save-helpers.js';

test('stjarnkarta-alltid-animerad: moves through intermediate frames with reduced motion enabled', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-11-24T00:00:00Z') });
  const example = createExampleGalaxy();
  const galaxy = new Galaxy(
    example.player,
    [example.systems[0]!],
    example.homePlanet.id,
  );
  const game = new Game(galaxy);
  const start = game.fleetSnapshot().position!;
  const target = new HexCoordinate(start.q + 2, start.r);
  await seedGame(page, {
    ...game.exportState(),
    knownObjects: galaxy.systems.flatMap((system) => [
      system.star.id,
      ...system.planets.map((planet) => planet.id),
    ]),
  });
  await page.clock.pauseAt(new Date('2026-11-24T01:00:00Z'));
  const canvas = page.locator('canvas[data-rendered="true"]');
  await expect(canvas).toBeVisible();
  await selectMapHex(page, target);
  await selectMapHex(page, target);
  await page.clock.runFor(150);
  const progress = await canvas.getAttribute('data-moving-progress');
  expect(progress).not.toBeNull();
  expect(Number(progress)).toBeGreaterThan(0);
  expect(Number(progress)).toBeLessThan(1);
  await page.clock.runFor(2000);
  await expect(canvas).not.toHaveAttribute('data-moving-progress');
});

test('rak-och-jamn-resa: the marker follows one straight line across round boundaries', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-11-24T00:00:00Z') });
  const example = createExampleGalaxy();
  const galaxy = new Galaxy(
    example.player,
    [example.systems[0]!],
    example.homePlanet.id,
  );
  const game = new Game(galaxy);
  const state = game.exportState();
  const start = game.fleetSnapshot().position!;
  const target = new HexCoordinate(start.q + 3, start.r + 3);
  await seedGame(page, {
    ...state,
    knownObjects: galaxy.systems.flatMap((system) => [
      system.star.id,
      ...system.planets.map((planet) => planet.id),
    ]),
  });
  await page.clock.pauseAt(new Date('2026-11-24T01:00:00Z'));
  const canvas = page.locator('canvas[data-rendered="true"]');
  await expect(canvas).toBeVisible();
  await selectMapHex(page, target);
  await selectMapHex(page, target);
  const samples: { x: number; y: number }[] = [];
  let gaps = 0;
  for (let i = 0; i < 130; i++) {
    await page.clock.runFor(40);
    const point = await canvas.evaluate((node) => ({
      x: node.getAttribute('data-moving-x'),
      y: node.getAttribute('data-moving-y'),
    }));
    if (point.x !== null && point.y !== null)
      samples.push({ x: Number(point.x), y: Number(point.y) });
    else if (samples.length > 0) {
      gaps++;
      if (gaps > 3) break;
    }
  }
  expect(samples.length).toBeGreaterThan(20);
  const a = HexGeometry.toPoint(start),
    b = HexGeometry.toPoint(target);
  for (const p of samples)
    expect(
      Math.abs((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)),
    ).toBeLessThan(0.01);
  for (let i = 1; i < samples.length; i++)
    expect(samples[i]!.x + 0.01).toBeGreaterThanOrEqual(samples[i - 1]!.x);
  const middle = samples.filter(
    (point) =>
      point.x > a.x + (b.x - a.x) * 0.15 && point.x < a.x + (b.x - a.x) * 0.85,
  );
  let stationary = 0;
  for (let i = 1; i < middle.length; i++) {
    stationary =
      Math.abs(middle[i]!.x - middle[i - 1]!.x) < 0.01 ? stationary + 1 : 0;
    expect(stationary).toBeLessThan(3);
  }
  expect(Math.abs(samples.at(-1)!.x - b.x)).toBeLessThan(1);
});

test('obruten-resa: real-time animation does not stall at round boundaries on a large map', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const galaxy = createExpandedGalaxy();
  const game = new Game(galaxy);
  const state = game.exportState();
  const start = game.fleetSnapshot().position!;
  const target = new HexCoordinate(start.q + 10, start.r + 4);
  await seedGame(page, {
    ...state,
    pirates: [],
    chartedPirates: [],
    knownObjects: galaxy.systems.flatMap((system) => [
      system.star.id,
      ...system.planets.map((planet) => planet.id),
    ]),
  });
  const canvas = page.locator('canvas[data-rendered="true"]');
  await expect(canvas).toBeVisible();
  await selectMapHex(page, target);
  await selectMapHex(page, target);
  const result = await canvas.evaluate(async (node) => {
    const canvas = node as HTMLCanvasElement;
    return await new Promise<{ time: number; x: number; progress: number }[]>(
      (resolve) => {
        const points: { time: number; x: number; progress: number }[] = [];
        const started = performance.now();
        let last = started;
        const tick = (now: number) => {
          const value = canvas.dataset.movingX;
          if (value !== undefined) {
            points.push({
              time: now,
              x: Number(value),
              progress: Number(canvas.dataset.movingProgress),
            });
            last = now;
          }
          if (
            (points.length && value === undefined && now - last > 400) ||
            now - started > 20000
          )
            resolve(points);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
    );
  });
  const a = HexGeometry.toPoint(start),
    b = HexGeometry.toPoint(target);
  const middle = result.filter(
    (p) => p.x > a.x + (b.x - a.x) * 0.15 && p.x < a.x + (b.x - a.x) * 0.85,
  );
  expect(middle.length).toBeGreaterThan(10);
  let last = middle[0]!;
  const gaps: { duration: number; progress: number; x: number }[] = [];
  for (const point of middle.slice(1))
    if (point.x > last.x + 0.01) {
      gaps.push({
        duration: point.time - last.time,
        progress: last.progress,
        x: last.x,
      });
      last = point;
    }
  expect(
    Math.max(...gaps.map((gap) => gap.duration)),
    JSON.stringify(gaps.filter((gap) => gap.duration >= 100)),
  ).toBeLessThan(100);
});
