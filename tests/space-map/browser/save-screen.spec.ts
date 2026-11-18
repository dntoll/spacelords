import { expect, test } from '@playwright/test';

test('startskarm-utan-scroll / separata-testlagen: all slots fit and test modes remain available', async ({
  page,
}) => {
  await page.goto('./');
  const cards = page.locator('.save-card');
  await expect(cards).toHaveCount(3);
  const bounds = await page.locator('.save-page').evaluate((pageElement) => ({
    height: pageElement.clientHeight,
    scrollHeight: pageElement.scrollHeight,
    bottom: pageElement.getBoundingClientRect().bottom,
  }));
  expect(bounds.scrollHeight).toBeLessThanOrEqual(bounds.height);
  for (const card of await cards.all()) {
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(bounds.bottom + 1);
  }
  await page.locator('.save-tests summary').click();
  await expect(page.getByRole('button', { name: 'Test battle' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Test boarding' }),
  ).toBeVisible();
});
