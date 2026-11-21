import { startFirstSlot } from './save-helpers.js';
import { expect, test } from '@playwright/test';
import {
  Game,
  TECHNOLOGIES,
} from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';

test('gemensamma-byggnadsbilder: supplied images load in Research and building sites', async ({
  page,
}, testInfo) => {
  const state = {
    ...new Game(createExampleGalaxy()).exportState(),
    researched: TECHNOLOGIES,
  };
  // forskningsvy-utan-station: Research shows its tree once a station is built.
  state.colonies[0]![1].buildings = [
    {
      id: 'station',
      type: 'Research station',
      slotIndex: 2,
      demolition: false,
    },
  ];
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
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Star map', exact: true })
    .click();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  const site = page.getByRole('article', {
    name: 'Building site 3',
    exact: true,
  });
  const image = site.getByRole('img', {
    name: 'Research station',
    exact: true,
  });
  await expect(image).toHaveAttribute('src', stationSource);
  await expect
    .poll(() =>
      image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
    )
    .toBe(512);
  await expect(site).toContainText('Research station');
  await site.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('completed-building-image.png'),
  });
});
