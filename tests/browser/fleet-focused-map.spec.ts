import type { SavedGame } from '../../src/client/models/SaveRepository.js';
import { expect, test } from '@playwright/test';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { startFirstSlot } from './save-helpers.js';
import {
  chooseFleetDestination,
  receiveShip,
  selectMapFleet,
} from './fleet-helpers.js';
import { selectMapObject } from './map-helpers.js';

test('flottfokuserad-kartvy: background is inert, route crossings set destinations, and remote transfers survive reload', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    if (!localStorage.getItem('spacelords.save.v2.1'))
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
      );
  }, tradeNetworkState());
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  const map = page.locator('canvas[data-rendered="true"]');
  await expect(map).toHaveAttribute('aria-label', /^Fleets map\./);
  const panel = page.locator('.selection-panel');
  await expect(panel).toBeHidden();
  await selectMapObject(page, 'Vesta');
  await expect(panel).toBeHidden();
  await map.press('r');
  await expect(panel).toBeHidden();
  // The midpoint lies on the route, away from fleet markers and planet centers.
  const bounds = (await map.boundingBox())!;
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  await page.mouse.click(center.x - Math.sqrt(3) * 9, center.y + 27);
  await expect(panel).toBeHidden();
  await selectMapFleet(page, 'Freighters');
  await map.press('ArrowDown');
  await map.press('ArrowDown');
  const camera = await page.getByTestId('camera-position').textContent();
  await page.mouse.move(center.x, center.y + 18 - 100);
  await page.mouse.down();
  await page.mouse.move(center.x - Math.sqrt(3) * 18, center.y + 54 - 100, {
    steps: 8,
  });
  await expect(panel.locator('.selected-fleet-card')).toHaveAttribute(
    'aria-description',
    /Destination preview: HEX 0,1/,
  );
  await page.mouse.up();
  await expect(panel.locator('.selected-fleet-card')).toHaveAttribute(
    'data-fleet-id',
    'freighters',
  );
  await expect(panel.locator('.selected-fleet-card')).toHaveAttribute(
    'aria-description',
    /Destination: HEX 0,1/,
  );
  await expect(panel.locator('.selected-fleet-card')).not.toContainText(
    'Trade route:',
  );
  await expect(page.getByTestId('camera-position')).toHaveText(camera!);
  await chooseFleetDestination(page, 'Freighters');
  await page
    .getByRole('combobox', { name: 'Destination hex', exact: true })
    .press('Escape');
  await expect(page.locator('.map-page')).toHaveAttribute(
    'data-map-screen',
    'fleets',
  );
  await chooseFleetDestination(page, 'Freighters');
  await map.press('Escape');
  await expect(
    page.getByRole('combobox', { name: 'Destination hex', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.map-page')).toHaveAttribute(
    'data-map-screen',
    'fleets',
  );
  await selectMapFleet(page);
  await page
    .getByRole('button', { name: 'Fighter 1 in Home Fleet', exact: true })
    .click();
  await receiveShip(page, 'Travellers');
  await expect(
    panel.locator('.fleet-card').filter({
      has: page.getByRole('button', {
        name: 'Cancel reinforcement',
        exact: true,
      }),
    }),
  ).toHaveAttribute('aria-description', /En route to Travellers/);
  await page.screenshot({
    path: testInfo.outputPath('fleet-map-route-background.png'),
  });
  const saved = await page.evaluate(() =>
    localStorage.getItem('spacelords.save.v2.1'),
  );
  const record = JSON.parse(saved!) as SavedGame;
  expect(
    record.state.fleets.find((fleet) => fleet.id === 'empty')!.position,
  ).toBeNull();
  expect(
    record.state.fleets.some(
      (fleet: { joinFleetId?: string }) => fleet.joinFleetId === 'travellers',
    ),
  ).toBe(true);
  const reinforcement = record.state.fleets.find(
    (fleet: { joinFleetId?: string }) => fleet.joinFleetId === 'travellers',
  );
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await selectMapFleet(page, reinforcement!.name);
  await expect(
    panel.locator('.fleet-card').filter({
      has: page.getByRole('button', {
        name: 'Cancel reinforcement',
        exact: true,
      }),
    }),
  ).toHaveAttribute('aria-description', /En route to Travellers/);
  expect(errors).toEqual([]);
});
