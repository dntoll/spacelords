import { scenarioTimeout } from '../../browser-timeouts.js';
import { expect, test } from '@playwright/test';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
import { startFirstSlot, endTurn, chooseResearch } from './save-helpers.js';

test('forskningsvy-utan-station / forsta-station-pa-vag / forskningstid: research becomes available after a station is completed', async ({
  page,
}) => {
  scenarioTimeout(90_000);
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await expect(
    page.getByText('Research needs a Research station.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Research tree' })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Factories', exact: true }).click();
  await page
    .getByRole('button', { name: 'Empty site 1 on Tellus', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build Research station', exact: true })
    .click();
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Research tree' })).toHaveCount(
    0,
  );
  for (let round = 0; round < 3; round++) await endTurn(page);
  await chooseResearch(page, 'Colony ship factory');
  await expect(
    page.getByRole('region', { name: 'Research tree' }),
  ).toBeVisible();
});

test('dubbelklick-bygger-pa-kartan / byggknapp-vid-titel: select and order a ship from the production ring', async ({
  page,
  isMobile,
}, testInfo) => {
  const state = tradeNetworkState();
  state.colonies[0]![1].buildings.push({
    id: 'yard',
    type: 'Transport ship factory',
    slotIndex: 2,
    demolition: false,
  });
  await page.addInitScript((initial) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-30', state: initial }),
    );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  const ship = page.getByRole('button', {
    name: 'Show Transport ship',
    exact: true,
  });
  if (isMobile) await ship.tap();
  else await ship.click();
  const header = page.locator('.map-build-heading');
  const build = header.getByRole('button', { name: 'Build', exact: true });
  const buttonBounds = (await build.boundingBox())!;
  const titleBounds = (await header.getByRole('heading').boundingBox())!;
  expect(buttonBounds.x).toBeGreaterThanOrEqual(
    titleBounds.x + titleBounds.width,
  );
  expect(buttonBounds.y).toBeLessThan(titleBounds.y + titleBounds.height);
  expect(buttonBounds.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({
    path: testInfo.outputPath('build-next-to-title.png'),
  });
  if (isMobile) {
    await ship.evaluate((button) => {
      if (!(button instanceof HTMLButtonElement))
        throw new Error('Ship control is not a button.');
      for (let count = 0; count < 2; count++) {
        button.dispatchEvent(
          new PointerEvent('pointerup', {
            bubbles: true,
            pointerType: 'touch',
          }),
        );
        button.click();
      }
    });
  } else await ship.dblclick();
  await page.getByRole('tab', { name: 'Queue · 1' }).click();
  await expect(page.locator('.map-queue-row')).toContainText('Transport ship');
});
