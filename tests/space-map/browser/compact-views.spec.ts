import { expect, test, type Page } from '@playwright/test';
import { researchStationState } from '../../fixtures/research-station.js';
import type { GameState } from '../../../src/client/space-map/models/Game.js';
import { startFirstSlot } from './save-helpers.js';

async function seed(page: Page, state: GameState) {
  await page.addInitScript((saved) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    if (!localStorage.getItem('spacelords.save.v2.1'))
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-27T00:00:00Z', state: saved }),
      );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
}

test('egen-ordervy: compact fleet controls remain readable and named special orders open separately', async ({
  page,
}, testInfo) => {
  await seed(page, researchStationState());
  const card = page.locator('.fleet-card').first();
  await expect(card.locator('.fleet-primary-orders button')).toHaveText([
    'Move',
    'Stop',
    'Orders',
  ]);
  await card.getByRole('button', { name: 'Orders', exact: true }).click();
  await page
    .getByRole('button', { name: 'Explore stars', exact: true })
    .click();
  await expect(
    card.getByRole('button', { name: 'Orders', exact: true }),
  ).toBeVisible();
  await expect(
    card.getByRole('button', { name: 'Explore stars', exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('readable-orders.png') });
});

test('kompakt-forskningstrad / forskningsdetaljer-vid-val: compact tree tiles share the screen with readable selection details', async ({
  page,
}, testInfo) => {
  await seed(page, researchStationState());
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const rocket = page.getByRole('button', {
    name: 'Inspect Rocket engine factory',
    exact: true,
  });
  await rocket.focus();
  const card = page.locator('[data-technology="Rocket engine factory"]');
  const size = await card.evaluate((node) => ({
    width: (node as HTMLElement).offsetWidth,
    height: (node as HTMLElement).offsetHeight,
  }));
  expect(size.width).toBeLessThanOrEqual(108);
  expect(size.height).toBe(48);
  await expect(card.locator('.research-node-name')).toHaveText('Rocket engine');
  await expect(card).not.toContainText('Available');
  await expect(rocket).toHaveAttribute('aria-description', 'Available');
  await expect(card.locator('.research-node-details')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Inspect Fighter factory', exact: true }),
  ).toHaveCount(0);
  await rocket.click();
  const details = page.getByRole('region', {
    name: 'Selected research',
    exact: true,
  });
  await expect(details).toContainText('Produces Rocket engines');
  await expect(details).toContainText('Research time: 1 round');
  await expect(details).toContainText('Requires: No prerequisites');
  await page.screenshot({
    path: testInfo.outputPath('research-selection-details.png'),
  });
  await details
    .getByRole('button', {
      name: 'Research Rocket engine factory',
      exact: true,
    })
    .click();
  await expect(page.locator('.research-queue article')).toHaveCount(1);
  // Touch ordering does not give keyboard focus to its disabled queued button.
  await rocket.focus();
  await page.keyboard.press('Escape');
  await expect(rocket).toBeFocused();
});

test('research-med-ett-tryck: one native tap on Research queues the selection after touch panning', async ({
  page,
  context,
  browserName,
  isMobile,
}) => {
  test.skip(!isMobile, 'This regression targets native mobile taps.');
  await seed(page, researchStationState());
  await page.getByRole('button', { name: 'Research', exact: true }).tap();
  const header = page.getByRole('button', {
    name: 'Inspect Rocket engine factory',
    exact: true,
  });
  await header.focus();
  await header.tap();
  if (browserName === 'chromium') {
    const bounds = (await header.boundingBox())!;
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + 25, y: y + 12, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await cdp.detach();
  }
  await expect(page.locator('.research-queue article')).toHaveCount(0);
  await page
    .getByRole('button', {
      name: 'Research Rocket engine factory',
      exact: true,
    })
    .tap();
  await expect(page.locator('.research-queue article')).toHaveCount(1);
  await expect(page.locator('.research-queue article')).toContainText(
    'Rocket engine factory',
  );
});

test('forskningsdetaljer-vid-val: dragging from a research tile pans without inspecting or queueing', async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    'Native touch pan and pinch are covered by research-tree.spec.',
  );
  await seed(page, researchStationState());
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const tile = page.getByRole('button', {
    name: 'Inspect Rocket engine factory',
    exact: true,
  });
  const stage = page.locator('.research-tree-stage');
  // A tree that fits the screen stays centred, so zoom in before panning.
  const tree = page.getByRole('region', { name: 'Research tree', exact: true });
  await tree.focus();
  const fitted = await stage.getAttribute('style');
  await tree.press('+');
  await expect(stage).not.toHaveAttribute('style', fitted!);
  await tile.focus();
  const initial = await stage.getAttribute('style');
  const box = (await tile.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 70,
    box.y + box.height / 2 + 30,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(stage).not.toHaveAttribute('style', initial!);
  await expect(page.locator('.research-details')).toContainText(
    'Select a technology',
  );
  await expect(page.locator('.research-queue article')).toHaveCount(0);
});

test('uppmarksamhet-vid-titel / kompakt-ny-flotta / flyttmal-pa-kartan / inga-hexkoordinater: header and fleet controls save mobile space', async ({
  page,
}, testInfo) => {
  await seed(page, researchStationState());
  const header = page.locator('.app-header');
  const warning = header.locator('.map-attention-legend');
  await expect(warning).toHaveText('! Needs attention');
  const brand = (await header.locator('.brand').boundingBox())!;
  const badge = (await warning.boundingBox())!;
  const nav = (await header.locator('.main-nav').boundingBox())!;
  expect(
    Math.abs(brand.y + brand.height / 2 - badge.y - badge.height / 2),
  ).toBeLessThan(3);
  expect(badge.x).toBeGreaterThanOrEqual(brand.x + brand.width);
  expect(nav.y).toBeGreaterThanOrEqual(badge.y + badge.height);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Show decision: Home Fleet: choose an assignment',
      exact: true,
    })
    .click();
  const create = page.getByRole('group', { name: 'New fleet', exact: true });
  await expect(create).toBeVisible();
  expect((await create.boundingBox())!.height).toBeLessThanOrEqual(76);
  await expect(page.locator('.coordinate-label')).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('compact-fleet-header.png'),
  });
  await page
    .getByRole('button', {
      name: 'Choose destination for Home Fleet',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('combobox', { name: 'Destination hex', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.destination-mode')).toContainText(
    'Choose a destination',
  );
  await expect(page.locator('body')).not.toContainText(
    'Choose destination hex',
  );
});
