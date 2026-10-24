import { selectMapObject } from './map-helpers.js';
import { expect, test, type Page } from '@playwright/test';
import {
  tradeNetworkState,
  distantTradeNetworkState,
} from '../fixtures/trade-network.js';
import { startFirstSlot, assignFleetToRoute } from './save-helpers.js';
import { Game, type GameState } from '../../src/client/models/Game.js';
import {
  HexGeometry,
  type Point,
} from '../../src/client/models/HexCoordinate.js';
import { FleetMapLayout } from '../../src/client/models/FleetMapLayout.js';

const initial = tradeNetworkState(false);
const game = Game.restore(initial);
const [home, target] = game.ownedPlanetSnapshots();
const start = HexGeometry.toPoint(home!.position),
  end = HexGeometry.toPoint(target!.position);
const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

test.beforeEach(async ({ page }) => {
  await page.addInitScript((state) => {
    if (localStorage.getItem('star-map-trade-seeded')) return;
    localStorage.setItem('spacelords.economy-v2-reset', 'done');
    localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-21T10:00:00Z', state }),
    );
    localStorage.setItem('star-map-trade-seeded', 'yes');
  }, initial);
  await page.goto('./');
  await startFirstSlot(page);
});

async function screenPoint(page: Page, world: Point) {
  const bounds = (await page.locator('canvas').boundingBox())!;
  return {
    x: bounds.x + bounds.width / 2 + world.x - start.x,
    y: bounds.y + bounds.height / 2 + world.y - start.y,
  };
}
async function drag(page: Page, a: Point, b: Point) {
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}
const routePanel = (page: Page) =>
  page.getByRole('complementary', { name: 'Selected route', exact: true });

test('ruttflotta-till-narmaste-andplanet: remote assignment saves an approach without teleporting', async ({
  page,
}) => {
  const original = tradeNetworkState(true);
  const state = {
    ...original,
    fleets: original.fleets.map((f) =>
      f.id === 'freighters' ? { ...f, position: { q: 4, r: 0 } } : f,
    ),
  };
  await page.evaluate(
    (state) =>
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-21T10:00:00Z', state }),
      ),
    state,
  );
  await page.reload();
  await startFirstSlot(page);
  await selectMapObject(page, 'Tellus');
  await page
    .getByRole('button', { name: 'Tellus ↔ Vesta', exact: true })
    .click();
  const panel = page.getByRole('complementary', {
    name: 'Selected route',
    exact: true,
  });
  await expect(panel.locator('.trade-assignment-option')).toHaveCount(0);
  await expect(
    panel.getByRole('heading', { name: 'Assign fleet', exact: true }),
  ).toHaveCount(0);
  await expect(panel).not.toContainText('Freighters');
  await assignFleetToRoute(page, 'Freighters', 'Tellus', 'Vesta');
  await expect(panel).toContainText('Assigned fleets · 1');
  await expect(
    panel.locator('[data-fleet-id="freighters"] .trade-fleet-position'),
  ).toContainText('HEX 4, 0');
  await expect(
    panel.locator('[data-fleet-id="freighters"] .trade-fleet-position'),
  ).toContainText('HEX 1, 0');
  await page.reload();
  await startFirstSlot(page);
  const fleet = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
      state: GameState;
    };
    return saved.state.fleets.find((f) => f.id === 'freighters')!;
  });
  expect(fleet.position).toEqual({ q: 4, r: 0 });
  expect(fleet.destination).toEqual({ q: 1, r: 0 });
  expect(fleet.routeId).toBe('route-test');
});

for (const mode of ['Star map', 'Route'] as const)
  test(`${mode === 'Route' ? 'route-kartvy' : 'handelsrutt-skapande-pa-stjarnkartan'} / flottilldelning-pa-stjarnkartan: planet and fleet drags create and administer a route in ${mode} without moving fleets`, async ({
    page,
  }, testInfo) => {
    if (mode === 'Route')
      await page.getByRole('button', { name: 'Route', exact: true }).click();
    const camera = await page.getByTestId('camera-position').textContent();
    await drag(
      page,
      await screenPoint(page, start),
      await screenPoint(page, end),
    );
    await expect(routePanel(page)).toContainText('Tellus ↔ Vesta');
    await expect(routePanel(page)).toContainText('No fleet assigned');
    const marker = FleetMapLayout.markers(game.fleetSnapshots()).find(
      (m) => m.fleet.id === 'freighters',
    )!;
    await drag(
      page,
      await screenPoint(page, marker.point),
      await screenPoint(page, midpoint),
    );
    await expect(routePanel(page)).toContainText('Assigned fleets · 1');
    await expect(
      routePanel(page).locator('[data-fleet-id="freighters"]'),
    ).toContainText('Tellus · HEX 1, 0');
    await expect(page.getByTestId('camera-position')).toHaveText(camera!);
    await page.screenshot({
      path: testInfo.outputPath('star-map-trade-route.png'),
    });
    await routePanel(page)
      .getByRole('button', {
        name: 'Select trade fleet Freighters',
        exact: true,
      })
      .click();
    const fleetPanel = page.getByRole('complementary', {
      name: 'Selected fleet',
      exact: true,
    });
    await expect(fleetPanel).toContainText('HEX 1,0');
    await fleetPanel
      .locator(
        '.fleet-card[data-fleet-id="freighters"] .map-fleet-route-options > summary',
      )
      .click();
    await fleetPanel
      .getByRole('button', {
        name: 'Select route Tellus to Vesta',
        exact: true,
      })
      .click();
    await routePanel(page)
      .getByRole('button', { name: 'Release Freighters', exact: true })
      .click();
    await expect(routePanel(page)).toContainText('Assigned fleets · 0');
    await routePanel(page)
      .getByRole('button', { name: 'Close route', exact: true })
      .click();
    await expect(routePanel(page)).toHaveCount(0);
  });

test('handelsrutt-val-pa-stjarnkartan: keyboard alternatives retain orders after visiting Route and reloading', async ({
  page,
}) => {
  await expect(
    page.getByRole('button', { name: 'Create route', exact: true }),
  ).toHaveCount(0);
  await page.locator('canvas[data-rendered="true"]').press('r');
  await selectMapObject(page, 'Vesta');
  await assignFleetToRoute(page, 'Freighters', 'Tellus', 'Vesta');
  await page.getByRole('button', { name: 'Route', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Route', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await startFirstSlot(page);
  await selectMapObject(page, 'Tellus');
  await page
    .getByRole('button', { name: 'Tellus ↔ Vesta', exact: true })
    .click();
  await expect(routePanel(page)).toContainText('Assigned fleets · 1');
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
});

test('handelsrutt-val-pa-stjarnkartan / flottilldelning-pa-stjarnkartan: clicking a line selects it and an invalid drop cannot set a destination', async ({
  page,
}) => {
  await page.locator('canvas[data-rendered="true"]').press('r');
  await selectMapObject(page, 'Vesta');
  await selectMapObject(page, 'Tellus');
  const p = await screenPoint(page, {
    x: start.x + (end.x - start.x) / 3,
    y: start.y + (end.y - start.y) / 3,
  });
  await page.mouse.click(p.x, p.y);
  await expect(routePanel(page)).toContainText('No fleet assigned');
  const marker = FleetMapLayout.markers(game.fleetSnapshots()).find(
    (m) => m.fleet.id === game.fleetSnapshots()[0]!.id,
  )!;
  await page.mouse.move(
    ...(Object.values(await screenPoint(page, marker.point)) as [
      number,
      number,
    ]),
  );
  await page.mouse.down();
  await page.mouse.move(p.x, p.y, { steps: 8 });
  await expect(
    page.getByRole('complementary', { name: 'Selected fleet' }),
  ).toContainText('Needs a Transport ship');
  await page.mouse.up();
  const state = await page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as {
          state: GameState;
        }
      ).state,
  );
  expect(state.fleets[0]!.destination).toBeNull();
  expect(state.fleets[0]!.routeId).toBeUndefined();
});

test('handelsrutt-skapande-pa-stjarnkartan / flottilldelning-pa-stjarnkartan: native touch creates a route and assigns a fleet', async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName !== 'chromium' || !isMobile,
    'Native touch dispatch requires Chromium mobile',
  );
  const session = await page.context().newCDPSession(page);
  const touchDrag = async (a: Point, b: Point) => {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: a.x, y: a.y, id: 1 }],
    });
    for (let i = 1; i <= 8; i++)
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          {
            x: a.x + ((b.x - a.x) * i) / 8,
            y: a.y + ((b.y - a.y) * i) / 8,
            id: 1,
          },
        ],
      });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
  };
  await touchDrag(await screenPoint(page, start), await screenPoint(page, end));
  await expect(routePanel(page)).toContainText('No fleet assigned');
  const marker = FleetMapLayout.markers(game.fleetSnapshots()).find(
    (m) => m.fleet.id === 'freighters',
  )!;
  await touchDrag(
    await screenPoint(page, marker.point),
    await screenPoint(page, midpoint),
  );
  await expect(routePanel(page)).toContainText('Assigned fleets · 1');
  await session.detach();
});

test('flottilldelning-pa-stjarnkartan: an overlapping-route chooser survives pointer release until a route is chosen', async ({
  page,
}) => {
  const original = distantTradeNetworkState();
  const state = {
    ...original,
    fleets: original.fleets.map((f) => {
      const copy = { ...f };
      if (f.id === 'freighters') delete copy.routeId;
      return copy;
    }),
  };
  await page.evaluate(
    (state) =>
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-21T10:00:00Z', state }),
      ),
    state,
  );
  await page.reload();
  await startFirstSlot(page);
  const restored = Game.restore(state);
  const marker = FleetMapLayout.markers(restored.fleetSnapshots()).find(
    (m) => m.fleet.id === 'freighters',
  )!;
  await drag(
    page,
    await screenPoint(page, marker.point),
    await screenPoint(page, start),
  );
  const chooser = page.getByRole('complementary', {
    name: 'Trade route selection',
    exact: true,
  });
  await expect(chooser).toContainText('Choose a route for this fleet');
  await chooser
    .getByRole('button', {
      name: 'Assign Freighters to Tellus to Vesta',
      exact: true,
    })
    .click();
  await expect(routePanel(page)).toContainText('Assigned fleets · 1');
});
