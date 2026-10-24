import { researchStationState } from '../fixtures/research-station.js';
import { expect, test, type Locator } from '@playwright/test';
import { startFirstSlot, chooseResearch } from './save-helpers.js';

for (const width of [320, 900]) {
  test(`kompakta-koknappar: research and build queues use compact controls at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript((state) => {
      localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
      );
    }, researchStationState());
    await page.goto('./');
    await startFirstSlot(page);
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: 'Research', exact: true })
      .click();
    await chooseResearch(page, 'Colony ship factory');
    const research = page.locator('.research-queue');
    await research.locator('summary').click();
    await checkControls(research.locator('article').first());
    await research.screenshot({
      path: testInfo.outputPath('research-queue.png'),
    });
    await page.getByRole('button', { name: 'Star map', exact: true }).click();
    await page
      .getByRole('button', { name: 'Open planet', exact: true })
      .click();
    for (const [index, type] of ['Research station', 'Iron mine'].entries()) {
      await page
        .getByRole('button', { name: 'Building sites', exact: true })
        .click();
      await page
        .getByRole('button', {
          name: `Build building at site ${index + 2}`,
          exact: true,
        })
        .click();
      await page
        .getByRole('button', { name: `Show ${type}`, exact: true })
        .click();
      await page
        .getByRole('button', { name: `Build ${type}`, exact: true })
        .click();
    }
    await page
      .getByRole('button', { name: 'Build queue', exact: true })
      .click();
    const production = page.locator('.planet-building-queue');
    await checkControls(production.locator('.queue-order').first());
    await production.screenshot({
      path: testInfo.outputPath('build-queue.png'),
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

async function checkControls(row: Locator): Promise<void> {
  const controls = row.locator('.queue-actions button');
  await expect(controls).toHaveText(['↑', '↓', '×']);
  for (const control of await controls.all()) {
    await expect(control).toHaveAttribute(
      'title',
      (await control.getAttribute('aria-label'))!,
    );
    const bounds = (await control.boundingBox())!;
    expect(bounds.width).toBe(44);
    expect(bounds.height).toBe(44);
  }
}
