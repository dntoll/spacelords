import { expect, test } from '@playwright/test';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { startFirstSlot } from './save-helpers.js';

for (const selection of ['hex', 'fleet'] as const) {
  test(`rullningsbar-kartpanel: ${selection} details grow upward and return map space at the top`, async ({
    page,
    browserName,
    isMobile,
  }) => {
    const state = tradeNetworkState(false);
    await page.addInitScript((state) => {
      localStorage.setItem('spacelords.economy-v2-reset', 'done');
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({
          lastPlayed: '2026-10-22T10:00:00Z',
          state,
        }),
      );
    }, state);
    await page.goto('./');
    await startFirstSlot(page);
    if (selection === 'fleet') {
      await page.getByRole('button', { name: 'Fleets', exact: true }).click();
      await page
        .getByRole('button', { name: 'Show on map: Home Fleet', exact: true })
        .click();
    }
    const panel = page.locator('.selection-panel');
    await panel.evaluate((node) => {
      node.scrollTop = 0;
    });
    const initial = (await panel.boundingBox())!;
    const camera = await page.getByTestId('camera-position').textContent();
    if (browserName === 'webkit' && isMobile) {
      // Playwright cannot send native wheel or swipe input to mobile WebKit.
      await panel.dispatchEvent('touchmove');
      await panel.evaluate((node) => {
        node.scrollTop = 120;
      });
    } else {
      await panel.hover({ position: { x: 12, y: 20 } });
      await page.mouse.wheel(0, 120);
    }
    const responsive = await page.evaluate(
      () => matchMedia('(max-width: 900px), (max-height: 500px)').matches,
    );
    if (responsive) {
      await expect
        .poll(async () => (await panel.boundingBox())!.y)
        .toBeLessThan(initial.y - 1);
      const expanded = (await panel.boundingBox())!;
      expect(expanded.height).toBeGreaterThan(initial.height + 1);
      expect(expanded.y + expanded.height).toBeCloseTo(
        initial.y + initial.height,
        0,
      );
      const map = (await page.locator('.map-page').boundingBox())!;
      expect(expanded.y).toBeGreaterThan(map.y + map.height * 0.14);
    }
    // Bottom content stays reachable after the panel grows.
    await panel.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });
    await expect
      .poll(() =>
        panel.evaluate((node) =>
          Math.abs(node.scrollHeight - node.clientHeight - node.scrollTop),
        ),
      )
      .toBeLessThan(2);
    await panel.evaluate((node) => {
      node.scrollTop = 0;
    });
    await expect
      .poll(async () => (await panel.boundingBox())!.y)
      .toBeCloseTo(initial.y, 0);
    expect(await page.getByTestId('camera-position').textContent()).toBe(
      camera,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight > innerHeight,
      ),
    ).toBe(false);
  });
}
