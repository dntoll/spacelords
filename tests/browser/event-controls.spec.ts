import { expect, test } from '@playwright/test';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { startFirstSlot, endTurn } from './save-helpers.js';

test('senaste-aret-i-events: Decisions follows the latest year after End turn and Events can expand and collapse', async ({
  page,
}) => {
  const initial = new Game(createExampleGalaxy()).exportState();
  const state = {
    ...initial,
    round: 21,
    events: Array.from({ length: 60 }, (_, index) => ({
      id: `history-${index}`,
      round: Math.floor(index / 3) + 1,
      text: `Historical event ${index}.`,
    })),
  };
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Decisions', exact: true }).click();
  const console = page.getByRole('region', { name: 'Turn console' });
  const log = page.getByRole('log', { name: 'Game events' });
  if (await console.locator('summary').count())
    await console.locator('summary').click();
  await log.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  await endTurn(page);
  await expect(log).toContainText('Year 21');
  await expect
    .poll(() =>
      log.evaluate(
        (node) => node.scrollHeight - node.clientHeight - node.scrollTop,
      ),
    )
    .toBeLessThan(8);
  await expect(console.locator('summary')).toBeVisible();
  await console.locator('summary').click();
  await expect(log).toBeHidden();
  await console.locator('summary').click();
  await expect(log).toBeVisible();
  await expect
    .poll(() =>
      log.evaluate(
        (node) => node.scrollHeight - node.clientHeight - node.scrollTop,
      ),
    )
    .toBeLessThan(8);
});

test('rundkontroller-pa-fler-vyer / utvikbara-events: Research and planet pages retain their view and fit expanded events above End turn', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const console = page.getByRole('region', { name: 'Turn console' });
  const log = page.getByRole('log', { name: 'Game events' });
  await expect(console).toBeVisible();
  await endTurn(page);
  await expect(
    page.getByRole('heading', { name: 'Research', exact: true }),
  ).toBeVisible();
  await console.locator('summary').click();
  await expect(log).toBeVisible();
  await expect(log).toContainText('Tellus');
  const latest = log.locator('.event-year').last();
  await expect(latest).toBeInViewport({ ratio: 0.99 });
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await expect(console).toBeVisible();
  await endTurn(page);
  await expect(
    page.getByRole('heading', { name: 'Tellus', exact: true }),
  ).toBeVisible();
  await expect(log).toContainText('Year 2');
  const end = page.getByRole('button', { name: 'End turn', exact: true });
  await expect(end).toBeInViewport();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight &&
        document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
