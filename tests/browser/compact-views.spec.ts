import { expect, test, type Page } from '@playwright/test';
import { researchStationState } from '../fixtures/research-station.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import type { GameState } from '../../src/client/models/Game.js';
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

test('dragbara-flottorder: mouse swipe reveals orders without issuing one and keeps its scroll after an order', async ({
  page,
  isMobile,
}, testInfo) => {
  test.skip(isMobile, 'Mouse swipe is a desktop interaction.');
  await seed(page, {
    ...researchStationState(),
    researched: ['Automated exploration'],
  });
  const card = page.locator('.fleet-card').first();
  const toolbar = card.locator('.fleet-order-toolbar');
  const before = await page.evaluate(() =>
    localStorage.getItem('spacelords.save.v2.1'),
  );
  const bounds = (await toolbar.boundingBox())!;
  const left = await toolbar.evaluate((node) => node.scrollLeft);
  await page.mouse.move(bounds.x + bounds.width - 10, bounds.y + 22);
  await page.mouse.down();
  await page.mouse.move(bounds.x - 150, bounds.y + 22, { steps: 12 });
  await page.mouse.up();
  expect(await toolbar.evaluate((node) => node.scrollLeft)).toBeGreaterThan(
    left,
  );
  expect(
    await page.evaluate(() => localStorage.getItem('spacelords.save.v2.1')),
  ).toBe(before);
  const explore = card.getByRole('button', {
    name: 'Explore stars',
    exact: true,
  });
  await explore.focus();
  const scrolled = await toolbar.evaluate((node) => node.scrollLeft);
  await explore.click();
  await expect(
    card.getByRole('button', { name: 'Explore stars', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(await toolbar.evaluate((node) => node.scrollLeft)).toBeCloseTo(
    scrolled,
    0,
  );
  await page.screenshot({ path: testInfo.outputPath('dragged-orders.png') });
});

test('kompakt-forskningstrad / forskningsdetaljer-vid-val: compact tree tiles contain all information and actions without an overlay', async ({
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
  expect(size).toEqual({ width: 224, height: 200 });
  await expect(card).toContainText('Produces Rocket engines');
  await expect(card).toContainText('1 research point');
  await expect(card).toContainText('Requires: No prerequisites');
  await expect(
    page.getByRole('button', { name: 'Inspect Fighter factory', exact: true }),
  ).toHaveCount(0);
  await rocket.click();
  await expect(page.locator('.research-details')).toHaveCount(0);
  const details = card.locator('.research-node-details');
  expect(
    await details.evaluate(
      (node) => node.scrollHeight <= node.clientHeight + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('research-information-in-tree.png'),
  });
  await card
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

test('research-med-ett-tryck: one native tap queues without inspection, including after touch panning', async ({
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
  await tile.focus();
  const stage = page.locator('.research-tree-stage');
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
  await expect(page.locator('.research-details')).toHaveCount(0);
  await expect(page.locator('.research-queue article')).toHaveCount(0);
});

test('produktionsvalens-statusfarger: all four statuses stay distinct, readable and explained when selected', async ({
  page,
}, testInfo) => {
  const state = tradeNetworkState();
  state.colonies[0]![1].projects = [
    {
      id: 'queued-station',
      type: 'Research station',
      slotIndex: 2,
      factoryId: null,
      destinationFleetId: null,
    },
  ];
  state.colonies[1]![1].projects = [];
  state.colonies[1]![1].buildings = [
    { id: 'water', type: 'Water extractor', slotIndex: 0, demolition: false },
  ];
  await seed(page, {
    ...state,
    researched: [],
    fleets: state.fleets.map((fleet) =>
      fleet.id === 'freighters' ? { ...fleet, routeId: 'route-test' } : fleet,
    ),
  });
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  const backgrounds: string[] = [];
  for (const [type, presence] of [
    ['Iron mine', 'local'],
    ['Water extractor', 'network'],
    ['Research station', 'queued'],
    ['Oil extractor', 'missing'],
  ]) {
    const choice = page.getByRole('button', {
      name: `Show ${type}`,
      exact: true,
    });
    await expect(choice).toHaveAttribute('data-presence', presence!);
    const color = await choice.evaluate((node) => {
      const style = getComputedStyle(node);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d')!;
      const luminance = (value: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const values = [...context.getImageData(0, 0, 1, 1).data]
          .slice(0, 3)
          .map((n) => n / 255)
          .map((n) =>
            n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4,
          );
        return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
      };
      const text = luminance(style.color),
        background = luminance(style.backgroundColor);
      return {
        background: style.backgroundColor,
        contrast:
          (Math.max(text, background) + 0.05) /
          (Math.min(text, background) + 0.05),
      };
    });
    expect(color.contrast).toBeGreaterThanOrEqual(4.5);
    backgrounds.push(color.background);
  }
  expect(new Set(backgrounds).size).toBe(4);
  await page
    .getByRole('button', { name: 'Show Water extractor', exact: true })
    .click();
  await expect(page.locator('.production-presence-detail')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Show Water extractor', exact: true }),
  ).toHaveAttribute('aria-description', /In active network: 1/);
  await page.screenshot({
    path: testInfo.outputPath('production-status-colors.png'),
  });
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
