import { expect, test } from '@playwright/test';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { startFirstSlot, endTurn } from './save-helpers.js';

test('senaste-aret-i-events: Events follows the latest round after End turn and can expand and collapse', async ({
  page,
}) => {
  const initial = new Game(createExampleGalaxy()).exportState();
  const state = {
    ...initial,
    round: 21,
    // An arrival gives round 21 an event.
    fleets: initial.fleets.map((fleet) => ({
      ...fleet,
      destination: { q: fleet.position!.q + 1, r: fleet.position!.r },
    })),
    events: Array.from({ length: 60 }, (_, index) => ({
      id: `history-${index}`,
      round: Math.floor(index / 3) + 1,
      text: `Historical event ${index}.`,
    })),
  };
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  const console = page.getByRole('region', { name: 'Turn console' });
  const log = page.getByRole('log', { name: 'Game events' });
  if (await console.locator('summary').count())
    await console.locator('summary').click();
  await log.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  await endTurn(page);
  await expect(log).toContainText('Round 21');
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

test('utvikbara-events: Research retains its view and fits expanded events above End turn', async ({
  page,
}) => {
  const initial = new Game(createExampleGalaxy()).exportState();
  const fleet = initial.fleets[0]!;
  const state = {
    ...initial,
    fleets: [
      {
        ...fleet,
        destination: { q: fleet.position!.q + 1, r: fleet.position!.r },
      },
    ],
  };
  await page.addInitScript((state) => {
    if (!localStorage.getItem('spacelords.save.v2.1'))
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-11-22T00:00:00Z', state }),
      );
  }, state);
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
  if (!(await log.isVisible())) await console.locator('summary').click();
  await expect(log).toBeVisible();
  await expect(log).toContainText('Home Fleet arrived');
  const latest = log.locator('.event-year').last();
  await expect(latest).toBeInViewport({ ratio: 0.99 });
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
