import { expect, test, type Page } from '@playwright/test';
import { Game } from '../../src/client/models/Game.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { collectTurnFrames } from '../fixtures/turn-steps.js';
import { startFirstSlot } from './save-helpers.js';

async function seed(page: Page) {
  const game = new Game(createExampleGalaxy());
  game.scheduleBuild(game.galaxy.homePlanet, 'Research station');
  collectTurnFrames(game);
  game.finishTurn();
  game.scheduleBuild(game.galaxy.homePlanet, 'Iron mine');
  game.selectResearch('Rocket engine factory');
  game.setDestination('fleet-home', new HexCoordinate(3, 0));
  await page.addInitScript((state) => {
    if (localStorage.getItem('event-playback-seeded')) return;
    localStorage.setItem('event-playback-seeded', 'yes');
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-26', state }),
    );
  }, game.exportState());
  await page.goto('./');
  await startFirstSlot(page);
  return game.galaxy.homePlanet.position.key;
}

async function beginTurn(page: Page) {
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  const warning = page.getByRole('dialog', { name: 'Decisions remaining' });
  if (await warning.isVisible())
    await warning
      .getByRole('button', { name: 'End turn anyway', exact: true })
      .click();
  await expect(
    page.getByRole('group', { name: 'Event playback' }),
  ).toBeVisible();
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => ({
      x: document.documentElement.scrollWidth > innerWidth,
      y: document.documentElement.scrollHeight > innerHeight,
    })),
  ).toEqual({ x: false, y: false });
}

test('sekventiella-arshandelser / handelser-pa-kartan: orientation, pause, chronological rows, map focus and return to Research', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 393, height: 851 });
  const homeHex = await seed(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await beginTurn(page);
  const controls = page.getByRole('group', { name: 'Event playback' });
  await controls.getByRole('button', { name: 'Pause', exact: true }).click();
  const log = page.getByRole('log', { name: 'Game events' });
  await expect(log.locator('[data-event-id]')).toHaveCount(1);
  await expect(log.locator('[aria-current="step"]')).toContainText(
    'arrived at HEX 3,0',
  );
  await expect(page.locator('canvas[data-rendered="true"]')).toHaveAttribute(
    'data-event-hex',
    '3,0',
  );
  await expect(
    page.getByRole('button', { name: 'End turn', exact: true }),
  ).toBeDisabled();
  const map = page.getByTestId('map-container');
  const console = page.getByRole('region', { name: 'Turn console' });
  let mapBox = (await map.boundingBox())!,
    logBox = (await console.boundingBox())!;
  expect(mapBox.y + mapBox.height).toBeLessThanOrEqual(logBox.y);
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath('event-playback-portrait.png'),
  });
  await page.waitForTimeout(1600);
  await expect(log.locator('[data-event-id]')).toHaveCount(1);
  await page.setViewportSize({ width: 851, height: 393 });
  await expect
    .poll(async () => {
      mapBox = (await map.boundingBox())!;
      logBox = (await console.boundingBox())!;
      return mapBox.x + mapBox.width <= logBox.x;
    })
    .toBe(true);
  await noOverflow(page);
  await controls.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(log.locator('[data-event-id]')).toHaveCount(2);
  await expect(
    controls.getByRole('button', { name: 'Play', exact: true }),
  ).toBeVisible();
  await expect(page.locator('canvas[data-rendered="true"]')).toHaveAttribute(
    'data-event-hex',
    homeHex,
  );
  await page.screenshot({
    path: testInfo.outputPath('event-playback-landscape.png'),
  });
  await controls.getByRole('button', { name: 'Next', exact: true }).click();
  await controls.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.event-focus')).toHaveText('Global event');
  await expect(
    page.locator('canvas[data-rendered="true"]'),
  ).not.toHaveAttribute('data-event-hex');
  await controls.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(controls).toHaveCount(1);
  await expect(controls).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Research', exact: true }),
  ).toBeVisible();
  await console.locator('summary').click();
  await expect(log.locator('[data-event-id]')).toHaveCount(4);
  await expect(log).not.toContainText('Year 1');
  await expect(log).toContainText('Year 2');
  await page.reload();
  await startFirstSlot(page);
  await expect(controls).toBeHidden();
  await page.getByRole('button', { name: 'Decisions', exact: true }).click();
  await console.locator('summary').click();
  await expect(log.locator('[data-event-id]')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('end-turn-vid-kartval / sekventiella-arshandelser: Skip restores selection and the exact camera without advancing another year', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await seed(page);
  const end = page.getByRole('button', { name: 'End turn', exact: true });
  const panel = page.locator('.selection-panel');
  await expect(end).toBeInViewport();
  const panelBox = (await panel.boundingBox())!,
    endBox = (await end.boundingBox())!;
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(endBox.y);
  const camera = await page.getByTestId('camera-position').textContent();
  await beginTurn(page);
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(panel).toBeVisible();
  await expect(end).toBeEnabled();
  await expect(page.getByTestId('camera-position')).toHaveText(camera!);
  await noOverflow(page);
  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Save slot 1', exact: true }),
  ).toContainText('Year 3');
});

test('senaste-aret-i-events / handelser-pa-kartan: long yearly lists scroll internally and shrink for the following year', async ({
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
        JSON.stringify({ lastPlayed: '2026-10-26', state }),
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
  await expect(log).not.toContainText('Year 8');
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
  await beginTurn(page);
  await expect(log.locator('[data-event-id]')).toHaveCount(1);
  await expect(log).toContainText('Year 10');
  await expect
    .poll(() => log.evaluate((node) => node.clientHeight))
    .toBeGreaterThan(0);
  await expect(
    page.getByRole('button', { name: 'Skip', exact: true }),
  ).toBeInViewport();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(log.locator('[data-event-id]')).toHaveCount(1);
  await expect
    .poll(() => console.evaluate((node) => node.clientHeight))
    .toBeLessThan(160);
  await noOverflow(page);
});
