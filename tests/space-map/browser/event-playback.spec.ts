import { scenarioTimeout } from '../../browser-timeouts.js';
import { expect, test, type Page } from '@playwright/test';
import { Game } from '../../../src/client/space-map/models/Game.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../../src/client/common/HexCoordinate.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { collectTurnFrames } from '../../fixtures/turn-steps.js';
import { startFirstSlot } from './save-helpers.js';
import { selectMapHex } from './map-helpers.js';
import type { SavedGame } from '../../../src/client/space-map/models/saves/SaveRepository.js';
import { researchStationState } from '../../fixtures/research-station.js';

async function seed(page: Page, recentEvent?: string) {
  const game = Game.restore(researchStationState());
  collectTurnFrames(game);
  game.finishTurn();
  game.selectResearch('Missiles');
  game.setDestination('fleet-home', new HexCoordinate(3, 0));
  const exported = game.exportState();
  // ap-pa-starmap: an event of the current round is announced when it ends.
  const state = recentEvent
    ? {
        ...exported,
        events: [
          ...exported.events,
          { id: 'recent-event', round: exported.round, text: recentEvent },
        ],
      }
    : exported;
  await page.addInitScript((state) => {
    if (localStorage.getItem('event-playback-seeded')) return;
    localStorage.setItem('event-playback-seeded', 'yes');
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-27', state }),
    );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
  return { homeHex: game.galaxy.homePlanet.position.key };
}

/**
 * hexval-med-vag: two taps on the saved destination start the journey. With
 * `endRound`, the fleet heads beyond its AP so the round ends.
 */
async function requestTurn(page: Page, endRound = false) {
  if (!(await page.locator('.map-page').count()))
    await page.getByRole('button', { name: 'Star map', exact: true }).click();
  const state = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
  );
  const fleet = state.state.fleets[0]!;
  const destination = (!endRound && fleet.destination) || {
    q: fleet.position!.q + 4,
    r: fleet.position!.r,
  };
  const hex = new HexCoordinate(destination.q, destination.r);
  await selectMapHex(page, hex);
  await selectMapHex(page, hex);
}

/** ap-pa-starmap: the map awaits the player again. */
function idle(page: Page) {
  return page.locator('[data-turn-idle="true"]');
}

async function advanceUntil(page: Page, ready: () => Promise<boolean>) {
  for (let step = 0; step < 320; step++) {
    if (await ready()) return;
    await page.clock.runFor(50);
  }
  throw new Error('Playback did not reach the expected stage.');
}

test('sikt-under-forflyttning: a newly observed hex brightens before the moving ship finishes its step', async ({
  page,
}, testInfo) => {
  await page.clock.install({ time: new Date('2026-10-30T00:00:00Z') });
  await seed(page);
  await page.clock.pauseAt(new Date('2026-10-30T01:00:00Z'));
  const canvas = page.locator('canvas[data-rendered="true"]');
  const target = HexGeometry.toPoint(new HexCoordinate(3, 0));
  const color = () =>
    canvas.evaluate(
      (node, points) => {
        const surface = node as HTMLCanvasElement;
        const center = {
          x: Number(surface.dataset.cameraX),
          y: Number(surface.dataset.cameraY),
        };
        const zoom = Number(surface.dataset.cameraZoom);
        const bounds = surface.getBoundingClientRect();
        const x =
          ((bounds.width / 2 + (points.target.x - center.x) * zoom) *
            surface.width) /
          bounds.width;
        const y =
          ((bounds.height / 2 + (points.target.y + 8 - center.y) * zoom) *
            surface.height) /
          bounds.height;
        return [
          ...surface
            .getContext('2d')!
            .getImageData(Math.round(x), Math.round(y), 1, 1).data,
        ].slice(0, 3);
      },
      { target },
    );
  await requestTurn(page);
  await advanceUntil(
    page,
    async () =>
      (await canvas.getAttribute('data-moving-fleet')) === 'fleet-home',
  );
  await page.clock.runFor(100);
  expect(
    Number(await canvas.getAttribute('data-moving-progress')),
  ).toBeLessThan(0.5);
  expect(await color()).not.toEqual([17, 45, 52]);
  await page.clock.runFor(200);
  const progress = Number(await canvas.getAttribute('data-moving-progress'));
  expect(progress).toBeGreaterThan(0.5);
  expect(progress).toBeLessThan(1);
  expect(await color()).toEqual([17, 45, 52]);
  await page.screenshot({
    path: testInfo.outputPath('sight-during-movement.png'),
  });
});

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => ({
      x: document.documentElement.scrollWidth > innerWidth,
      y: document.documentElement.scrollHeight > innerHeight,
    })),
  ).toEqual({ x: false, y: false });
}

async function noMenu(page: Page) {
  for (const name of ['Pause', 'Play', 'Next', 'Skip'])
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(
      0,
    );
}

test('handelseannonsering / handelser-pa-kartan / handelser-vid-ankomst: a finished move has no arrival announcement', async ({
  page,
}) => {
  scenarioTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 393, height: 851 });
  await page.clock.install({ time: new Date('2026-10-27T00:00:00Z') });
  await seed(page);
  await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
  await requestTurn(page);
  const log = page.getByRole('log', { name: 'Game events' });
  const console = page.getByRole('region', { name: 'Turn console' });
  const end = idle(page);
  await advanceUntil(page, async () => {
    const notice = page.locator('.game-notice');
    if ((await notice.isVisible()) && (await end.count()) > 0) {
      const text = (await notice.textContent()) ?? '';
      if (!text.includes('Pirate ship in sight')) await requestTurn(page);
      return false;
    }
    return (await end.count()) > 0 && !(await notice.isVisible());
  });
  await expect(page.locator('.event-announcement')).toHaveCount(0);
  await noMenu(page);
  await console.locator('summary').click();
  await expect(log).not.toContainText('arrived at');
  await noOverflow(page);
  await page.reload();
  await page.clock.resume();
  await startFirstSlot(page);
  await console.locator('summary').click();
  await expect(log).not.toContainText('arrived at');
  expect(errors).toEqual([]);
});

for (const size of [
  { width: 393, height: 851 },
  { width: 851, height: 393 },
]) {
  test(`kamera-foljer-skepp: the camera stays with the ship at the player's zoom (${size.width}x${size.height})`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.clock.install({ time: new Date('2026-10-30T00:00:00Z') });
    await seed(page);
    const canvas = page.locator('canvas[data-rendered="true"]');
    await canvas.focus();
    for (let step = 0; step < 12; step++)
      await page.keyboard.press('ArrowRight');
    await page.clock.pauseAt(new Date('2026-10-30T01:00:00Z'));
    const camera = () =>
      canvas.evaluate((node) => {
        const data = (node as HTMLCanvasElement).dataset;
        return {
          x: Number(data.cameraX),
          y: Number(data.cameraY),
          zoom: Number(data.cameraZoom),
        };
      });
    const initial = await camera();
    await requestTurn(page);
    await advanceUntil(
      page,
      async () =>
        (await canvas.getAttribute('data-moving-fleet')) === 'fleet-home',
    );
    const followed = await camera();
    expect(followed.zoom).toBeCloseTo(initial.zoom);
    expect(
      Math.hypot(followed.x - initial.x, followed.y - initial.y),
    ).toBeGreaterThan(20);
    await page.clock.runFor(200);
    expect((await camera()).zoom).toBeCloseTo(initial.zoom);
    await advanceUntil(page, async () => (await idle(page).count()) > 0);
    await page.clock.runFor(32);
    const settled = await camera();
    expect(settled.zoom).toBeCloseTo(initial.zoom);
    expect(
      Math.hypot(settled.x - initial.x, settled.y - initial.y),
    ).toBeGreaterThan(20);
    await noOverflow(page);
  });
}

test('senaste-aret-i-events / handelseannonsering: long yearly lists scroll internally and shrink after automatic announcements', async ({
  page,
}) => {
  const initial = new Game(createExampleGalaxy()).exportState();
  const events = Array.from({ length: 140 }, (_, index) => ({
    id: `history-${index}`,
    round: index < 20 ? 8 : 9,
    text: `Historical event ${index} with a long description of an event at Tellus.`,
  }));
  await page.addInitScript(
    (state) => {
      localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
      if (!localStorage.getItem('spacelords.save.v2.1'))
        localStorage.setItem(
          'spacelords.save.v2.1',
          JSON.stringify({ lastPlayed: '2026-10-27', state }),
        );
    },
    {
      ...initial,
      round: 10,
      events,
    },
  );
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('./');
  await startFirstSlot(page);
  const console = page.getByRole('region', { name: 'Turn console' });
  await console.locator('summary').click();
  const log = page.getByRole('log', { name: 'Game events' });
  await expect(log.locator('[data-event-id]')).toHaveCount(120);
  for (const size of [
    { width: 320, height: 568 },
    { width: 667, height: 320 },
  ]) {
    await page.setViewportSize(size);
    await expect
      .poll(() => log.evaluate((node) => node.scrollHeight > node.clientHeight))
      .toBe(true);
    await expect(
      page.getByRole('region', { name: 'Turn console' }),
    ).toBeInViewport();
    await noOverflow(page);
  }
  // ap-pa-starmap: give the current round one event, announced when it ends.
  await page.evaluate(() => {
    const slot = JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
      state: { events: { id: string; round: number; text: string }[] };
    };
    slot.state.events.push({
      id: 'recent-event',
      round: 10,
      text: 'A recent event at Tellus.',
    });
    localStorage.setItem('spacelords.save.v2.1', JSON.stringify(slot));
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.reload();
  await startFirstSlot(page);
  await requestTurn(page, true);
  await expect(page.locator('.event-announcement')).toBeVisible();
  await expect(log.locator('[data-event-id]')).toHaveCount(0);
  await noMenu(page);
  await expect(idle(page)).toHaveCount(1, { timeout: 5000 });
  if (!(await log.isVisible())) await console.locator('summary').click();
  await expect(log.locator('[data-event-id]')).toHaveCount(1);
  await expect(log).toContainText('Round 10');
  await expect
    .poll(() => console.evaluate((node) => node.clientHeight))
    .toBeLessThan(160);
  await noOverflow(page);
});

test('handelseannonsering / en-flotta-i-taget: reduced motion retains announcements and results without movement interpolation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seed(page, 'A recent event at Tellus.');
  await requestTurn(page, true);
  await expect(page.locator('.event-announcement')).toBeVisible();
  await expect(page.locator('.event-announcement')).toHaveCSS(
    'transition-duration',
    '0s',
  );
  await expect(
    page.locator('canvas[data-rendered="true"]'),
  ).not.toHaveAttribute('data-moving-fleet');
  await noMenu(page);
  await expect(idle(page)).toHaveCount(1, { timeout: 12000 });
  await expect(page.locator('.event-announcement')).toHaveCount(0);
});
