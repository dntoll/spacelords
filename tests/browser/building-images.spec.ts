import { startFirstSlot } from './save-helpers.js';
import { expect, test } from '@playwright/test';

test('gemensamma-byggnadsbilder: supplied images load in Research, selection and building sites', async ({
  page,
}, testInfo) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const images = page.locator('.research-panel img');
  await expect(images).toHaveCount(4);
  const sources: string[] = [];
  for (const image of await images.all()) {
    const source = (await image.getAttribute('src'))!;
    expect(source).toMatch(/^\/spacelords\/assets\/.+\.webp$/);
    await expect
      .poll(() =>
        image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
      )
      .toBe(512);
    sources.push(source);
  }
  expect(new Set(sources).size).toBe(4);
  const stationSource = await page
    .getByRole('img', { name: 'Research station', exact: true })
    .getAttribute('src');
  await page.screenshot({
    path: testInfo.outputPath('research-building-images.png'),
  });
  await page.getByRole('button', { name: 'Back to map', exact: true }).click();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Build building at site 1', exact: true })
    .click();
  const selected = page.getByRole('img', {
    name: 'Research station',
    exact: true,
  });
  await expect(selected).toHaveAttribute('src', stationSource!);
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
    .getByRole('button', { name: 'Build Research station', exact: true })
    .click();
  const site = page.getByRole('article', {
    name: 'Building site 1',
    exact: true,
  });
  await expect(site.getByRole('img')).toHaveAttribute('src', stationSource!);
  await page.getByRole('button', { name: 'Back to map', exact: true }).click();
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'End turn', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await expect(site.getByRole('img')).toHaveAttribute('src', stationSource!);
  await expect(site).toContainText('Operational');
  await site.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath('completed-building-image.png'),
  });
});
