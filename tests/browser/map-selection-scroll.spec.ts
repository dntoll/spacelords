import { selectMapFleet } from './fleet-helpers.js';
import { expect, test, type Page } from '@playwright/test';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { startFirstSlot } from './save-helpers.js';

async function startScrollablePanel(page: Page): Promise<void> {
  const initialState = tradeNetworkState(false);
  const state = {
    ...initialState,
    fleets: [
      ...initialState.fleets,
      ...Array.from({ length: 8 }, (_, index) => ({
        ...initialState.fleets[0]!,
        id: `patrol-${index}`,
        name: `Patrol ${index}`,
      })),
    ],
  };
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.economy-v2-reset', 'done');
    localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
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
}

for (const selection of ['hex', 'fleet'] as const) {
  test(`rullningsbar-kartpanel: ${selection} details grow upward and return map space at the top`, async ({
    page,
    browserName,
    isMobile,
  }) => {
    await startScrollablePanel(page);
    if (selection === 'fleet') {
      await page.getByRole('button', { name: 'Fleets', exact: true }).click();
      await selectMapFleet(page);
    }
    const panel = page.locator('.selection-panel');
    await panel.evaluate((node) => {
      node.scrollTop = 0;
    });
    const initial = (await panel.boundingBox())!;
    const camera = await page.getByTestId('camera-position').textContent();
    const scroll = async (deltaY: number) => {
      if (browserName === 'webkit' && isMobile) {
        // Mobile WebKit exposes no native wheel input through Playwright.
        await panel.dispatchEvent('wheel', { deltaY, cancelable: true });
      } else {
        await panel.hover({ position: { x: 12, y: 20 } });
        await page.mouse.wheel(0, deltaY);
      }
    };
    await scroll(120);
    const responsive = await page.evaluate(
      () => matchMedia('(max-width: 900px), (max-height: 500px)').matches,
    );
    if (responsive) {
      await expect
        .poll(async () => (await panel.boundingBox())!.y)
        .toBeLessThan(initial.y - 1);
      expect(await panel.evaluate((node) => node.scrollTop)).toBe(0);
      const expanded = (await panel.boundingBox())!;
      expect(expanded.height).toBeGreaterThan(initial.height + 1);
      expect(expanded.y + expanded.height).toBeCloseTo(
        initial.y + initial.height,
        0,
      );
      const map = (await page.locator('.map-page').boundingBox())!;
      expect(expanded.y).toBeGreaterThan(map.y + map.height * 0.14);
    }
    await scroll(10000);
    await expect
      .poll(() => panel.evaluate((node) => node.scrollTop))
      .toBeGreaterThan(0);
    await expect
      .poll(() =>
        panel.evaluate((node) =>
          Math.abs(node.scrollHeight - node.clientHeight - node.scrollTop),
        ),
      )
      .toBeLessThan(2);
    await scroll(-10000);
    await expect.poll(() => panel.evaluate((node) => node.scrollTop)).toBe(0);
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

test('rullningsbar-kartpanel: a native swipe expands before scrolling content', async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName !== 'chromium' || !isMobile,
    'Native swipe input requires Chromium CDP.',
  );
  await startScrollablePanel(page);
  const panel = page.locator('.selection-panel');
  const initial = (await panel.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  const x = initial.x + 6;
  const y = initial.y + initial.height - 70;
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1 }],
  });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x, y: y - 60, id: 1 }],
  });
  await expect
    .poll(async () => (await panel.boundingBox())!.height)
    .toBeGreaterThan(initial.height + 1);
  expect(await panel.evaluate((node) => node.scrollTop)).toBe(0);
  for (let distance = 100; distance <= 400; distance += 40) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - distance, id: 1 }],
    });
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect
    .poll(() => panel.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(0);
});
