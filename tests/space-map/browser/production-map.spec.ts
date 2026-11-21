import { scenarioTimeout } from '../../browser-timeouts.js';
import { expect, test } from '@playwright/test';
import {
  Game,
  TECHNOLOGIES,
} from '../../../src/client/space-map/models/Game.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
import { startFirstSlot } from './save-helpers.js';
import { selectMapObject } from './map-helpers.js';

test('produktions-kartvy / radiella-byggval / produktionsflikar / byggorsak-i-kon: ship orders and queue work with touch, keyboard and larger text', async ({
  page,
}, testInfo) => {
  scenarioTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    // WebKit reports the browser's benign ResizeObserver loop notice as an error.
    if (!error.message.startsWith('ResizeObserver loop completed'))
      errors.push(error.message);
  });
  const state = {
    ...tradeNetworkState(),
    researched: TECHNOLOGIES.filter(
      (technology) => technology !== 'Ion pulse engine factory',
    ),
  };
  const home = state.colonies[0]![1];
  home.stock.Iron = 1000;
  home.stock.Water = 1000;
  home.stock.Oil = 1000;
  home.buildings.push({
    id: 'yard',
    type: 'Transport ship factory',
    slotIndex: 2,
    demolition: false,
  });
  const saved = Game.restore(state).exportState();
  await page.addInitScript((state) => {
    if (localStorage.getItem('production-map-seeded')) return;
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    );
    localStorage.setItem('production-map-seeded', 'yes');
  }, saved);
  await page.goto('./');
  await startFirstSlot(page);
  const canvas = page.locator('canvas[data-rendered="true"]');
  await canvas.evaluate((node) => {
    node.dataset.instanceMarker = 'original';
  });
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Production', exact: true })
    .click();
  await selectMapObject(page, 'Tellus');
  await expect(canvas).toHaveAttribute('data-instance-marker', 'original');
  const ring = page.getByRole('group', { name: 'Build options' });
  expect(await ring.getByRole('button').count()).toBeLessThanOrEqual(8);
  const assertRingFits = async () => {
    await expect(async () => {
      const map = (await canvas.boundingBox())!;
      const controls = await ring.getByRole('button').evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          };
        }),
      );
      for (let i = 0; i < controls.length; i++) {
        for (const other of controls.slice(i + 1)) {
          const rect = controls[i]!;
          expect(
            rect.right <= other.x ||
              other.right <= rect.x ||
              rect.bottom <= other.y ||
              other.bottom <= rect.y,
          ).toBe(true);
        }
      }
      for (const rect of controls) {
        expect(rect.x).toBeGreaterThanOrEqual(map.x);
        expect(rect.y).toBeGreaterThanOrEqual(map.y);
        expect(rect.right).toBeLessThanOrEqual(map.x + map.width);
        expect(rect.bottom).toBeLessThanOrEqual(map.y + map.height);
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
      }
    }).toPass({ timeout: 3000 });
  };
  await assertRingFits();
  const ship = ring.getByRole('button', { name: 'Show Transport ship' });
  if (testInfo.project.use.isMobile) await ship.tap();
  else await ship.click();
  const panel = page.getByRole('complementary', {
    name: 'Production controls',
  });
  await expect(
    panel.getByRole('region', { name: 'Build details' }),
  ).toContainText('Transport ship');
  await panel.getByRole('button', { name: 'Build', exact: true }).click();
  await panel
    .getByRole('button', { name: 'Build', exact: true })
    .press('Enter');
  await panel.getByRole('tab', { name: 'Queue · 2' }).click();
  await expect(page.locator('.map-queue-row')).toHaveCount(2);
  await expect(panel.locator('.queue-drag-handle')).toHaveCount(0);
  await panel
    .getByRole('button', { name: 'Select project 2: Transport ship' })
    .click();
  await expect(
    panel.getByRole('button', { name: 'Select project 2: Transport ship' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await panel.getByRole('button', { name: 'Cancel project 1' }).click();
  await expect(page.locator('.map-queue-row')).toHaveCount(1);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '125%';
  });
  await ship.focus();
  await ship.press('Enter');
  await expect(ship).toBeFocused();
  await assertRingFits();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await expect(page.locator('.app-header')).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: testInfo.outputPath('production-map.png') });
  await page.setViewportSize({ width: 320, height: 568 });
  await assertRingFits();
  expect(errors).toEqual([]);
});
