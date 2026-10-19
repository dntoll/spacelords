import { expect, test } from '@playwright/test';
import { startFirstSlot, endTurn } from './save-helpers.js';

for (const size of [
  { width: 320, height: 568 },
  { width: 844, height: 390 },
  { width: 667, height: 320 },
]) {
  test(`handelser / arsrundor-och-order: compact console and automatic planning at ${size.width}x${size.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size);
    await page.goto('./');
    await startFirstSlot(page);
    const end = page.getByRole('button', { name: 'End turn', exact: true });
    const console = page.getByRole('region', { name: 'Turn console' });
    const log = page.getByRole('log', { name: 'Game events' });
    await page
      .getByRole('button', { name: 'Set destination', exact: true })
      .click();
    await page
      .getByRole('combobox', { name: 'Known objects' })
      .selectOption({ label: 'Vesta' });
    await endTurn(page);
    await expect(log).toContainText('Home Fleet arrived at Vesta.');
    await expect(end).toBeEnabled();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Continue', exact: true }),
    ).toHaveCount(0);
    await expect(log).not.toContainText('moved to');
    await expect(log).not.toContainText('hexes');
    const before = await log.locator('li').count();
    await endTurn(page);
    await expect(end).toBeEnabled();
    await expect(log.locator('li')).toHaveCount(before + 1);
    const logBounds = (await console.boundingBox())!;
    const endBounds = (await end.boundingBox())!;
    const selection = (await page.locator('.selection-panel').boundingBox())!;
    expect(logBounds.height).toBeLessThanOrEqual(90);
    expect(logBounds.y + logBounds.height).toBeLessThanOrEqual(endBounds.y);
    expect(selection.y + selection.height).toBeLessThanOrEqual(logBounds.y);
    expect(logBounds.x).toBeGreaterThanOrEqual(0);
    expect(logBounds.x + logBounds.width).toBeLessThanOrEqual(size.width);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight > innerHeight ||
          document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await log.focus();
    await page.keyboard.press('Home');
    await page.screenshot({ path: testInfo.outputPath('turn-console.png') });
    await page.reload();
    await startFirstSlot(page);
    await expect(log).toContainText('Home Fleet arrived at Vesta.');
    await expect(end).toBeEnabled();
  });
}
