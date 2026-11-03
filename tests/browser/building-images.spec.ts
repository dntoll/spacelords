import { startFirstSlot, endTurn } from './save-helpers.js';
import { expect, test } from '@playwright/test';
import { Game, TECHNOLOGIES } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';

test('gemensamma-byggnadsbilder: supplied images load in Research, selection and building sites', async ({
  page,
}, testInfo) => {
  const state = {
    ...new Game(createExampleGalaxy()).exportState(),
    researched: TECHNOLOGIES,
  };
  state.colonies[0]![1].buildings = [];
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    if (!localStorage.getItem('spacelords.save.v2.1'))
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-29T09:00:00Z', state }),
      );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Research', exact: true })
    .click();
  const names = [
    'Colony ship factory',
    'Exploration ship factory',
    'Fighter factory',
    'Research station',
  ];
  const sources: string[] = [];
  for (const name of names) {
    const image = page.locator(
      `.research-page .building-image img[alt="${name}"]`,
    );
    await expect(image).toHaveCount(1);
    const source = (await image.getAttribute('src'))!;
    expect(source).toMatch(/^\/spacelords\/assets\/.+\.webp$/);
    await expect
      .poll(() =>
        image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
      )
      .toBe(512);
    sources.push(source);
  }
  expect(new Set(sources).size).toBe(names.length);
  const stationSource = sources[3]!;
  await page.screenshot({
    path: testInfo.outputPath('research-building-images.png'),
  });
  await page.getByRole('button', { name: 'Back to map', exact: true }).click();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build building at site 1', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show Research station', exact: true })
    .click();
  const selected = page.getByRole('img', {
    name: 'Research station',
    exact: true,
  });
  await expect(selected).toHaveAttribute('src', stationSource);
  await expect
    .poll(() =>
      selected.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(512);
  expect((await selected.boundingBox())!.height).toBeLessThanOrEqual(220);
  await page.screenshot({
    path: testInfo.outputPath('build-selection-image.png'),
  });
  await page
    .getByRole('button', { name: 'Show Research station', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build Research station', exact: true })
    .click();
  const site = page.getByRole('article', {
    name: 'Building site 1',
    exact: true,
  });
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await expect(site.getByRole('img')).toHaveAttribute('src', stationSource);
  await page.getByRole('button', { name: 'Back to map', exact: true }).click();
  await endTurn(page);
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await expect(site.getByRole('img')).toHaveAttribute('src', stationSource);
  await expect(site).toContainText('Operational');
  await site.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('completed-building-image.png'),
  });
});
