import { expect, test } from '@playwright/test';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { Galaxy } from '../../../src/client/space-map/models/Galaxy.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../../src/client/common/HexCoordinate.js';
import { selectMapHex } from './map-helpers.js';
import { seedGame } from './save-helpers.js';

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
