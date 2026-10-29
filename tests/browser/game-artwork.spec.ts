import { expect, test } from '@playwright/test';
import { Game, TECHNOLOGIES } from '../../src/client/models/Game.js';
import { salvageMarkers } from '../../src/client/models/SalvageMapLayout.js';
import { salvageState } from '../fixtures/salvage.js';
import { selectMapPoint } from './map-helpers.js';
import { startFirstSlot } from './save-helpers.js';

test('spelgrafik-symboler / spelgrafik-planeter / spelgrafik-kartstation: mobile maps, planet details and building choices load the generated artwork', async ({
  page,
}, testInfo) => {
  const state = { ...salvageState(), researched: TECHNOLOGIES };
  state.explored = state.world.systems.flatMap((system) =>
    system.planets.map((planet) => `${planet.position.q},${planet.position.r}`),
  );
  const restored = Game.restore(state);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => errors.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    if (!localStorage.getItem('spacelords.save.v2.1'))
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-29T09:00:00Z', state }),
      );
  }, restored.exportState());
  await page.goto('./');
  await startFirstSlot(page);
  const canvas = page.locator('canvas[data-rendered="true"]');
  await expect(canvas).toHaveAttribute('data-planet-images-ready', '6');
  await expect(canvas).toHaveAttribute('data-shipyard-image-ready', 'true');
  const portrait = page.locator('.planet-selection-summary .planet-portrait');
  await expect(portrait).toBeVisible();
  await expect(portrait).toHaveAttribute(
    'src',
    /\/spacelords\/assets\/temperate-planet-.+\.webp$/,
  );
  const yard = salvageMarkers(restored.wrecks, restored.shipyards, 1).find(
    (marker) => marker.kind === 'yard',
  )!;
  await selectMapPoint(page, yard.point);
  await expect(
    page.getByRole('heading', { name: 'Shipyard · Tellus', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('shipyard-artwork.png') });
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await expect(page.locator('.planet-overview .planet-portrait')).toBeVisible();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build building at site 3', exact: true })
    .click();
  for (const name of ['Transport ship factory', 'Salvage ship factory']) {
    const choice = page.getByRole('button', {
      name: `Show ${name}`,
      exact: true,
    });
    const image = choice.locator('img.catalog-artwork');
    await expect(image).toHaveAttribute('aria-hidden', 'true');
    await expect
      .poll(() =>
        image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
      )
      .toBe(512);
    await choice.click();
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('.catalog-details .building-image img'),
    ).toHaveAttribute('src', (await image.getAttribute('src')) as string);
  }
  await page.screenshot({
    path: testInfo.outputPath('space-factory-symbols.png'),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
