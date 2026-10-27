import { startFirstSlot } from './save-helpers.js';
import { expect, test, type Page } from '@playwright/test';
import { expectMapFillsGameArea } from './map-helpers.js';

async function expectNoScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > window.innerWidth,
    vertical: document.documentElement.scrollHeight > window.innerHeight,
  }));
  expect(overflow).toEqual({ horizontal: false, vertical: false });
}

test('viewport-game-layout: the map fills the viewport without page scrolling', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  const map = page.locator('canvas[data-rendered="true"]');
  await expect(map).toHaveCount(1);
  await expectNoScroll(page);
  await expectMapFillsGameArea(page);
});

async function expectContentFits(page: Page): Promise<void> {
  await expectNoScroll(page);
  const clipped = await page.locator('main').evaluate((main) => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    return [
      ...main.querySelectorAll(
        '.planet-page, .research-panel, .selection-panel',
      ),
    ]
      .filter((node) => {
        const bounds = node.getBoundingClientRect();
        return (
          bounds.width > 0 &&
          bounds.height > 0 &&
          (bounds.top < 0 ||
            bounds.left < 0 ||
            bounds.bottom > viewport.height + 1 ||
            bounds.right > viewport.width + 1)
        );
      })
      .map((node) => node.textContent);
  });
  expect(clipped).toEqual([]);
}

test('viewport-game-layout: navigation font changes cannot crowd out the phone map', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await startFirstSlot(page);
  await page.addStyleTag({
    content: ':root { font-family: monospace; font-size: 8px; }',
  });
  const brand = (await page.locator('.brand').boundingBox())!;
  const navigation = (await page.locator('.main-nav').boundingBox())!;
  expect(navigation.y).toBeGreaterThanOrEqual(brand.y + brand.height);
  const canvas = page.locator('canvas[data-rendered="true"]');
  await expect(canvas).toHaveCount(1);
  await expectMapFillsGameArea(page);
  await page.addStyleTag({ content: ':root { font-size: 20px; }' });
  await expectMapFillsGameArea(page);
  await expectNoScroll(page);
});

for (const size of [
  { width: 320, height: 568 },
  { width: 844, height: 390 },
  { width: 667, height: 320 },
]) {
  test(`viewport-game-layout / english-game: all screens remain usable at ${size.width}x${size.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size);
    await page.goto('./');
    await startFirstSlot(page);
    await expect(page.locator('canvas[data-rendered="true"]')).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expectContentFits(page);
    await page
      .getByRole('button', { name: 'Open planet', exact: true })
      .click();
    await expect(
      page.getByText('12,000', { exact: true }).first(),
    ).toBeVisible();
    await expectContentFits(page);
    await expect(page.getByText('Iron', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Stored 100 · Extracting 0/year', { exact: true }).first(),
    ).toBeVisible();
    await expectContentFits(page);
    await page
      .getByRole('button', { name: 'Building sites', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Build building at site 1', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Show Research station', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Build Research station', exact: true }),
    ).toBeEnabled();
    await expectContentFits(page);
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: 'Research', exact: true })
      .click();
    await expectContentFits(page);
    await page.screenshot({
      path: testInfo.outputPath('research-viewport.png'),
    });
    await page
      .getByRole('button', { name: 'Back to map', exact: true })
      .click();
    await expect(page.locator('canvas[data-rendered="true"]')).toHaveCount(1);
    await expectContentFits(page);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollTo(0, 500));
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  });
}

test('viewport-game-layout: wider fallback font metrics cannot expand the planet screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('./');
  await startFirstSlot(page);
  await page.addStyleTag({
    content: ':root { font-family: system-ui, sans-serif; font-size: 18px; }',
  });
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await expectContentFits(page);
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build building at site 1', exact: true })
    .click();
  await expectContentFits(page);
  await page
    .getByRole('button', { name: 'Show Research station', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Build Research station', exact: true }),
  ).toBeEnabled();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Research', exact: true })
    .click();
  await expectContentFits(page);
});

test('visa-byggalternativ / kompakta-bygghandlingar: selection preserves Overview position and keyboard focus', async ({
  page,
}, testInfo) => {
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  const overview = page.locator('.overview');
  const open = page.getByRole('button', {
    name: 'Build building at site 6',
    exact: true,
  });
  await open.scrollIntoViewIfNeeded();
  const before = await overview.evaluate((node) => node.scrollTop);
  await open.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Build selection', exact: true }),
  ).toBeVisible();
  const search = page.getByRole('searchbox', { name: 'Search buildings' });
  await search.fill('no such building');
  await expect(page.locator('.empty-results')).toBeVisible();
  await expect(search).toBeFocused();
  await search.fill('research point');
  await expect(page.locator('.catalog-item')).toHaveCount(1);
  await expectContentFits(page);
  await page.screenshot({ path: testInfo.outputPath('build-selection.png') });
  await page
    .getByRole('button', { name: 'Back to Building sites', exact: true })
    .click();
  await expect(page.locator('[data-site-index="5"]')).toBeFocused();
  expect(await overview.evaluate((node) => node.scrollTop)).toBeCloseTo(
    before,
    0,
  );
  const bounds = (await open.boundingBox())!;
  const siteBounds = (await page
    .locator('[data-site-index="5"] .site-details')
    .boundingBox())!;
  expect(bounds.width).toBeLessThan(siteBounds.width);
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  await expectContentFits(page);
});
