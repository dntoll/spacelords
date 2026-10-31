import { expect, test } from '@playwright/test';
import { endTurn, startFirstSlot } from './save-helpers.js';
import { expectMapFillsGameArea } from './map-helpers.js';

test('snabb-mobilpublicering / viewport-game-layout / sparat-spel: touch navigation and saved progress survive reload', async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith('phone-'),
    'The smoke suite targets phones.',
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => errors.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
    const path = new URL(response.url()).pathname;
    if (path.startsWith('/assets/') || path.startsWith('/api/'))
      errors.push(path);
  });
  await page.goto('./');
  await startFirstSlot(page);
  const map = page.locator('canvas[data-rendered="true"]');
  await expect(map).toBeVisible();
  await expectMapFillsGameArea(page);
  await page.getByRole('button', { name: 'Open planet', exact: true }).tap();
  await expect(
    page.getByRole('heading', { name: 'Tellus', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Research', exact: true }).tap();
  await expect(
    page.getByRole('heading', { name: 'Research', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Fleets', exact: true }).tap();
  await expect(map).toHaveAttribute('aria-label', /^Fleets map\./);
  await page.getByRole('button', { name: 'Star map', exact: true }).tap();
  await expect(map).toHaveAttribute('aria-label', /^Star map\./);
  expect(
    await page.evaluate(() => ({
      horizontal: document.documentElement.scrollWidth > innerWidth,
      vertical: document.documentElement.scrollHeight > innerHeight,
    })),
  ).toEqual({ horizontal: false, vertical: false });
  // Live smoke stops after navigation; save/reload is covered before publishing.
  if (process.env.SPACELORDS_SMOKE_URL) {
    expect(errors).toEqual([]);
    return;
  }
  await endTurn(page);
  await page.getByRole('button', { name: 'Saved games', exact: true }).tap();
  const slot = page.getByRole('article', { name: 'Save slot 1', exact: true });
  await expect(slot).toContainText('Year 2');
  await page.waitForLoadState('networkidle');
  await page.reload();
  await expect(slot).toContainText('Year 2');
  await startFirstSlot(page);
  await expect(map).toBeVisible();
  expect(errors).toEqual([]);
});

test('responsiv-stjarnkarta / rumsligt-kartindex: camera updates preserve the turn console and reach the canvas', async ({
  page,
}) => {
  await page.goto('./');
  await startFirstSlot(page);
  const canvas = page.locator('canvas[data-rendered="true"]');
  await expect(canvas).toBeVisible();
  const result = await canvas.evaluate((canvas) => {
    const footer = document.querySelector('.game-turn-actions')!;
    const observer = new MutationObserver(() => {});
    observer.observe(footer, { subtree: true, childList: true });
    const started = performance.now();
    for (let i = 0; i < 12; i++) {
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      canvas.dispatchEvent(
        new WheelEvent('wheel', { deltaY: -10, cancelable: true }),
      );
    }
    const elapsed = performance.now() - started;
    const mutations = observer.takeRecords().length;
    observer.disconnect();
    return { mutations, elapsed };
  });
  expect(result.mutations).toBe(0);
  await expect(async () => {
    const camera = await canvas.evaluate((canvas) => ({
      x: Number((canvas as HTMLCanvasElement).dataset.cameraX),
      zoom: Number((canvas as HTMLCanvasElement).dataset.cameraZoom),
    }));
    expect(camera.zoom).toBeCloseTo(Math.exp(0.36), 5);
    expect(camera.x).toBeLessThan(-300);
    await expect(page.getByLabel('Map zoom')).toHaveText('143%');
  }).toPass();

  // responsiv-stjarnkarta: audit the real pointer gesture from initial press through release.
  const box = (await canvas.boundingBox())!;
  const start = { x: box.x + 25, y: box.y + 25 };
  await page.mouse.move(start.x, start.y);
  const audit = await page.evaluateHandle(() => {
    const footer = document.querySelector('.game-turn-actions')!;
    const records: MutationRecord[] = [];
    const observer = new MutationObserver((mutations) =>
      records.push(...mutations),
    );
    observer.observe(footer, { subtree: true, childList: true });
    return { footer, observer, records };
  });
  const previousX = await canvas.getAttribute('data-camera-x');
  await page.mouse.down();
  await page.mouse.move(start.x + 35, start.y + 20, { steps: 3 });
  await page.mouse.up();
  const gesture = await audit.evaluate(({ footer, observer, records }) => {
    const mutations = records.length + observer.takeRecords().length;
    observer.disconnect();
    return { mutations, connected: footer.isConnected };
  });
  await audit.dispose();
  expect(gesture).toEqual({ mutations: 0, connected: true });
  await expect(canvas).not.toHaveAttribute('data-camera-x', previousX!);
});
