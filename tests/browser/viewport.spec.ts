import { expect, test, type Page } from '@playwright/test';

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
  const map = page.locator('canvas[data-rendered="true"]');
  await expect(map).toHaveCount(1);
  await expectNoScroll(page);
  const bounds = await map.boundingBox();
  const viewport = page.viewportSize()!;
  expect(
    (bounds!.width * bounds!.height) / (viewport.width * viewport.height),
  ).toBeGreaterThan(0.8);
});

async function expectContentFits(page: Page): Promise<void> {
  await expectNoScroll(page);
  const clipped = await page.locator('main').evaluate((main) => {
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    return [
      ...main.querySelectorAll(
        'button, [role="tabpanel"], .stat, .muted-note, .research-panel, .selection-panel',
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
            bounds.right > viewport.width + 1 ||
            node.scrollHeight > node.clientHeight + 1 ||
            node.scrollWidth > node.clientWidth + 1)
        );
      })
      .map((node) => node.textContent);
  });
  expect(clipped).toEqual([]);
}

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
    await expect(page.locator('canvas[data-rendered="true"]')).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expectContentFits(page);
    await page
      .getByRole('button', { name: 'Open planet', exact: true })
      .click();
    await expect(page.getByText('12,000', { exact: true })).toBeVisible();
    await expectContentFits(page);
    await page.getByRole('tab', { name: 'Resources', exact: true }).click();
    await expect(page.getByText('Iron', { exact: true })).toBeVisible();
    await expect(
      page.getByText('42 units/year', { exact: true }),
    ).toBeVisible();
    await expectContentFits(page);
    await page.getByRole('tab', { name: 'Buildings', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Build research station', exact: true }),
    ).toBeDisabled();
    await expectContentFits(page);
    await page.getByRole('button', { name: 'Research', exact: true }).click();
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
