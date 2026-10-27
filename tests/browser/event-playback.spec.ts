import { expect, test, type Page } from '@playwright/test';
import { Game } from '../../src/client/models/Game.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { collectTurnFrames } from '../fixtures/turn-steps.js';
import { startFirstSlot } from './save-helpers.js';

async function seed(page: Page, twoFleets = false) {
  const game = new Game(createExampleGalaxy());
  game.scheduleBuild(game.galaxy.homePlanet, 'Research station');
  collectTurnFrames(game);
  game.finishTurn();
  game.scheduleBuild(game.galaxy.homePlanet, 'Iron mine');
  game.selectResearch('Rocket engine factory');
  let secondId: string | null = null;
  if (twoFleets) {
    game.transferShips('fleet-home', 'Fighter', 1, null);
    secondId = game.fleetSnapshots()[1]!.id;
    game.setDestination(secondId, new HexCoordinate(0, 3));
  }
  game.setDestination('fleet-home', new HexCoordinate(twoFleets ? 4 : 3, 0));
  await page.addInitScript((state) => {
    if (localStorage.getItem('event-playback-seeded')) return;
    localStorage.setItem('event-playback-seeded', 'yes');
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-27', state }),
    );
  }, game.exportState());
  await page.goto('./');
  await startFirstSlot(page);
  await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
  return { secondId, homeHex: game.galaxy.homePlanet.position.key };
}

async function requestTurn(page: Page) {
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  const warning = page.getByRole('dialog', { name: 'Decisions remaining' });
  if (await warning.isVisible())
    await warning
      .getByRole('button', { name: 'End turn anyway', exact: true })
      .click();
}

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

test('handelseannonsering / handelser-pa-kartan: announcements stay below the event and fly into the list across orientation changes', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 393, height: 851 });
  await page.clock.install({ time: new Date('2026-10-27T00:00:00Z') });
  await seed(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await page.clock.pauseAt(new Date('2026-10-27T01:00:00Z'));
  await requestTurn(page);
  await page.clock.runFor(1000);
  const announcement = page.locator('.event-announcement');
  const log = page.getByRole('log', { name: 'Game events' });
  const console = page.getByRole('region', { name: 'Turn console' });
  await expect(announcement).toContainText('Home Fleet arrived at HEX 3,0.');
  await expect(announcement).toHaveAttribute('data-stage', 'announcing');
  await expect(log.locator('[data-event-id]')).toHaveCount(0);
  await noMenu(page);
  const placed = (await announcement.boundingBox())!;
  const portraitMap = (await page.getByTestId('map-container').boundingBox())!;
  expect(
    Math.abs(
      placed.x + placed.width / 2 - portraitMap.x - portraitMap.width / 2,
    ),
  ).toBeLessThan(2);
  expect(placed.y).toBeGreaterThanOrEqual(
    portraitMap.y + portraitMap.height / 2 + 80,
  );
  expect(placed.y + placed.height).toBeLessThanOrEqual(851 - 8);
  expect(
    await announcement.evaluate((node) =>
      Number(getComputedStyle(node).zIndex),
    ),
  ).toBeGreaterThan(100);
  await page.screenshot({
    path: testInfo.outputPath('announcement-portrait.png'),
  });
  await page.setViewportSize({ width: 667, height: 320 });
  await page.clock.runFor(32);
  const shortMap = (await page.getByTestId('map-container').boundingBox())!;
  const shortAnnouncement = (await announcement.boundingBox())!;
  expect(shortAnnouncement.y).toBeGreaterThanOrEqual(
    shortMap.y + shortMap.height / 2 + 70,
  );
  expect(
    shortAnnouncement.y + shortAnnouncement.height,
    JSON.stringify({ shortMap, shortAnnouncement }),
  ).toBeLessThanOrEqual(320);
  await page.setViewportSize({ width: 851, height: 393 });
  await page.clock.runFor(32);
  const mapBox = (await page.getByTestId('map-container').boundingBox())!,
    listBox = (await console.boundingBox())!;
  expect(mapBox.x + mapBox.width).toBeLessThanOrEqual(listBox.x);
  const landscape = (await announcement.boundingBox())!;
  expect(
    Math.abs(landscape.x + landscape.width / 2 - mapBox.x - mapBox.width / 2),
  ).toBeLessThan(2);
  expect(landscape.y).toBeGreaterThanOrEqual(mapBox.y + mapBox.height / 2 + 80);
  expect(landscape.y + landscape.height).toBeLessThanOrEqual(393 - 8);
  await page.clock.runFor(1400);
  await expect(announcement).toHaveAttribute('data-stage', 'filing');
  await expect(log.locator('[data-event-id]')).toHaveCount(0);
  await page.waitForTimeout(220);
  const flying = (await announcement.boundingBox())!;
  expect(flying.x + flying.width / 2).toBeGreaterThan(
    mapBox.x + mapBox.width / 2,
  );
  await page.screenshot({
    path: testInfo.outputPath('announcement-filing-landscape.png'),
  });
  await page.clock.runFor(500);
  await expect(log.locator('[data-event-id]')).toHaveCount(1);
  await expect(announcement).toContainText(
    'Iron mine was completed on Tellus.',
  );
  await page.clock.runFor(6000);
  await expect(announcement).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Research', exact: true }),
  ).toBeVisible();
  await console.locator('summary').click();
  await expect(log.locator('[data-event-id]')).toHaveCount(4);
  await expect(log).not.toContainText('Year 1');
  await expect(log).toContainText('Year 2');
  await noOverflow(page);
  await page.reload();
  await startFirstSlot(page);
  await page.clock.runFor(100);
  await expect(announcement).toHaveCount(0);
  await page.getByRole('button', { name: 'Decisions', exact: true }).click();
  await console.locator('summary').click();
  await expect(log.locator('[data-event-id]')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('en-flotta-i-taget / osynliga-flottor-utan-animation: focus follows full fleet routes, unseen pirates are omitted and the original camera returns', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 393, height: 851 });
  const { secondId } = await seed(page, true);
  const camera = await page.getByTestId('camera-position').textContent();
  const canvas = page.locator('canvas[data-rendered="true"]');
  await canvas.evaluate((node) => {
    const seen: string[] = [];
    new MutationObserver(() => {
      const id = (node as HTMLElement).dataset.movingFleet;
      if (id && seen.at(-1) !== id) seen.push(id);
      (node as HTMLElement).dataset.observedMovement = JSON.stringify(seen);
    }).observe(node, {
      attributes: true,
      attributeFilter: ['data-moving-fleet'],
    });
  });
  await requestTurn(page);
  await expect(canvas).toHaveAttribute('data-moving-fleet', 'fleet-home');
  await expect
    .poll(() => canvas.getAttribute('data-moving-progress'))
    .not.toBe('0');
  const progress = Number(await canvas.getAttribute('data-moving-progress'));
  expect(progress).toBeGreaterThan(0);
  expect(progress).toBeLessThan(1);
  await noMenu(page);
  await expect(
    page.getByRole('button', { name: 'End turn', exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () =>
        (
          JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
            state: { round: number };
          }
        ).state.round,
    ),
  ).toBe(3);
  await page.screenshot({
    path: testInfo.outputPath('single-fleet-movement.png'),
  });
  await expect(canvas).toHaveAttribute('data-moving-fleet', secondId!);
  await expect(
    page.getByRole('button', { name: 'End turn', exact: true }),
  ).toBeEnabled({ timeout: 15000 });
  await expect(canvas).toHaveAttribute(
    'data-observed-movement',
    JSON.stringify(['fleet-home', secondId]),
  );
  await expect(page.locator('.selection-panel')).toBeVisible();
  await expect(page.getByTestId('camera-position')).toHaveText(camera!);
  await noOverflow(page);
});

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
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-27', state }),
      );
    },
    { ...initial, round: 10, events },
  );
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Decisions', exact: true }).click();
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
      page.getByRole('button', { name: 'End turn', exact: true }),
    ).toBeInViewport();
    await noOverflow(page);
  }
  await requestTurn(page);
  await expect(page.locator('.event-announcement')).toBeVisible();
  await expect(log.locator('[data-event-id]')).toHaveCount(0);
  await noMenu(page);
  await expect(
    page.getByRole('button', { name: 'End turn', exact: true }),
  ).toBeEnabled({ timeout: 5000 });
  await expect(log.locator('[data-event-id]')).toHaveCount(1);
  await expect(log).toContainText('Year 10');
  await expect
    .poll(() => console.evaluate((node) => node.clientHeight))
    .toBeLessThan(160);
  await noOverflow(page);
});

test('handelseannonsering / en-flotta-i-taget: reduced motion retains announcements and results without movement interpolation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seed(page);
  await requestTurn(page);
  await expect(page.locator('.event-announcement')).toBeVisible();
  await expect(page.locator('.event-announcement')).toHaveCSS(
    'transition-duration',
    '0s',
  );
  await expect(
    page.locator('canvas[data-rendered="true"]'),
  ).not.toHaveAttribute('data-moving-fleet');
  await noMenu(page);
  await expect(
    page.getByRole('button', { name: 'End turn', exact: true }),
  ).toBeEnabled({ timeout: 12000 });
  await expect(page.locator('.event-announcement')).toHaveCount(0);
});
