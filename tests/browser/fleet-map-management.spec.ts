import type { SavedGame } from '../../src/client/models/SaveRepository.js';
import { expect, test } from '@playwright/test';
import { startFirstSlot } from './save-helpers.js';
import { chooseFleetDestination, selectMapFleet } from './fleet-helpers.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';

test('flottadministration / flottnamn-direktredigering / flottknappar-pa-kartan: organize fleets on the map and restore them', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  const panel = page.locator('.selection-panel');
  const camera = await page.getByTestId('camera-position').textContent();
  await expect(
    panel.getByRole('button', { name: 'Set destination', exact: true }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole('button', { name: 'Edit fleet', exact: true }),
  ).toHaveCount(0);
  await expect(
    panel.locator('.fleet-panel-sizing, .fleet-panel-help'),
  ).toHaveCount(0);
  const fighter = panel.getByRole('button', {
    name: 'Fighter 1 in Home Fleet',
    exact: true,
  });
  await expect(
    panel.getByRole('button', { name: 'Create route', exact: true }),
  ).toHaveCount(0);
  const heading = panel.locator('.map-location-heading').first();
  const open = heading.getByRole('button', {
    name: 'Open planet',
    exact: true,
  });
  await expect(open).toBeVisible();
  const openBounds = (await open.boundingBox())!;
  const panelBounds = (await panel.boundingBox())!;
  expect(openBounds.width).toBeLessThan(panelBounds.width / 2);
  expect(openBounds.height).toBeGreaterThanOrEqual(44);
  await fighter.focus();
  await page.keyboard.press('Enter');
  await expect(fighter).toBeFocused();
  const create = panel.getByRole('button', {
    name: 'Move ship to new fleet',
    exact: true,
  });
  await create.focus();
  await page.keyboard.press('Enter');
  const name = page.getByRole('textbox', { name: 'Fleet name', exact: true });
  await expect(name).toBeFocused();
  await name.fill('Vanguard');
  await name.press('Enter');
  await expect(
    panel.getByRole('heading', { name: 'Vanguard', exact: true }),
  ).toBeVisible();
  await panel.getByRole('button', { name: 'Vanguard', exact: true }).dblclick();
  await name.fill('Discard this');
  await name.press('Escape');
  await expect(
    panel.getByRole('heading', { name: 'Vanguard', exact: true }),
  ).toBeVisible();
  await panel
    .getByRole('button', { name: 'Rename Vanguard', exact: true })
    .click();
  await name.fill('Also discarded');
  // Blur must not swallow the subsequent click on a ship.
  await panel
    .getByRole('button', {
      name: 'Exploration ship 1 in Home Fleet',
      exact: true,
    })
    .click();
  await expect(
    panel.getByRole('button', { name: 'Move ship to Vanguard', exact: true }),
  ).toBeVisible();
  await panel
    .getByRole('button', { name: 'Move ship to Vanguard', exact: true })
    .click();
  await expect(panel.locator('.fleet-card')).toHaveCount(1);
  await expect(page.getByTestId('camera-position')).toHaveText(camera!);
  await chooseFleetDestination(page, 'Vanguard');
  await page
    .getByRole('combobox', { name: 'Destination hex', exact: true })
    .selectOption('0,1');
  await expect(panel.locator('.fleet-card')).toHaveAttribute(
    'aria-description',
    /Destination: HEX 0,1/,
  );
  const dimensions = await page.evaluate(() => ({
    overflow:
      document.documentElement.scrollWidth > innerWidth ||
      document.documentElement.scrollHeight > innerHeight,
    clipped: [
      ...document.querySelectorAll('.map-fleet-management button'),
    ].some(
      (node) =>
        node.getClientRects().length > 0 &&
        node.getBoundingClientRect().height < 44,
    ),
  }));
  expect(dimensions.overflow).toBe(false);
  expect(dimensions.clipped).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath('map-fleet-management.png'),
  });
  await page.reload();
  await startFirstSlot(page);
  await expect(
    panel.getByRole('heading', { name: 'Vanguard', exact: true }),
  ).toBeVisible();
  await expect(panel.locator('.fleet-card')).toHaveAttribute(
    'aria-description',
    /Destination: HEX 0,1/,
  );
  await selectMapFleet(page, 'Vanguard');
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await expect(
    panel.getByRole('article', { name: 'Fleet Home Fleet', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.fleet-location-map')).toHaveCount(0);
  await expect(panel.locator('.selected-fleet-card')).toContainText('Vanguard');
  expect(errors).toEqual([]);
});

test('flottadministration: a pointer drop forms a new fleet without a view change', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  await startFirstSlot(page);
  await page
    .getByRole('button', { name: 'Fighter 1 in Home Fleet', exact: true })
    .dragTo(page.getByRole('group', { name: 'New fleet', exact: true }));
  await expect(
    page.getByRole('textbox', { name: 'Fleet name', exact: true }),
  ).toBeFocused();
  await page
    .getByRole('textbox', { name: 'Fleet name', exact: true })
    .press('Escape');
  await expect(page.locator('.map-fleet-cards .fleet-card')).toHaveCount(2);
  await expect(
    page.getByRole('button', { name: 'Fighter 1 in Fleet 1', exact: true }),
  ).toBeVisible();
});

test('flottadministration: native touch forms a fleet on Star map', async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName !== 'chromium' || !isMobile,
    'Native touch dragging uses Chromium CDP.',
  );
  await page.setViewportSize({ width: 600, height: 1100 });
  await page.goto('./');
  await startFirstSlot(page);
  const source = page.getByRole('button', {
    name: 'Fighter 1 in Home Fleet',
    exact: true,
  });
  const target = page.getByRole('group', { name: 'New fleet', exact: true });
  await target.scrollIntoViewIfNeeded();
  const fromBox = (await source.boundingBox())!;
  const toBox = (await target.boundingBox())!;
  const from = {
    x: fromBox.x + fromBox.width / 2,
    y: fromBox.y + fromBox.height / 2,
  };
  const to = { x: toBox.x + toBox.width / 2, y: toBox.y + toBox.height / 2 };
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...from, id: 1 }],
  });
  for (let step = 1; step <= 8; step++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * step) / 8,
          y: from.y + ((to.y - from.y) * step) / 8,
          id: 1,
        },
      ],
    });
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(
    page.getByRole('textbox', { name: 'Fleet name', exact: true }),
  ).toBeFocused();
  await page
    .getByRole('textbox', { name: 'Fleet name', exact: true })
    .press('Escape');
  await expect(
    page.getByRole('button', { name: 'Fighter 1 in Fleet 1', exact: true }),
  ).toBeVisible();
});

for (const cargo of [false, true]) {
  test(`skepp-ur-olastad-ruttflotta: ${cargo ? 'loaded ships stay locked' : 'unloaded ships can be dragged out and saved'}`, async ({
    page,
  }) => {
    const original = tradeNetworkState();
    const state = {
      ...original,
      fleets: original.fleets.map((fleet) =>
        fleet.id === 'freighters' ? { ...fleet, routeId: 'route-test' } : fleet,
      ),
      shipments: cargo
        ? [
            {
              id: 'cargo-test',
              resource: 'Iron' as const,
              amount: 5,
              path: ['sol-0', 'sol-1'],
              stage: 0,
              projectId: 'vesta-mine',
              recipient: 'sol-1',
              fleetId: 'freighters',
              committed: true,
            },
          ]
        : [],
    };
    await page.addInitScript((state) => {
      if (localStorage.getItem('fleet-transfer-seeded')) return;
      localStorage.setItem('spacelords.economy-v2-reset', 'done');
      localStorage.setItem('spacelords.terraforming-v5-reset', 'done');
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-21T10:00:00Z', state }),
      );
      localStorage.setItem('fleet-transfer-seeded', 'yes');
    }, state);
    await page.goto('./');
    await startFirstSlot(page);
    const freighters = page.locator(
      '.map-fleet-cards [data-fleet-id="freighters"].fleet-card',
    );
    const fighter = freighters.getByRole('button', {
      name: 'Fighter 1 in Route Tellus <> Vesta',
      exact: true,
    });
    const transport = () =>
      freighters.getByRole('button', {
        name: 'Transport ship 1 in Route Tellus <> Vesta',
        exact: true,
      });
    if (cargo) {
      await expect(fighter).toBeDisabled();
      await expect(transport()).toBeDisabled();
      await expect(freighters).toHaveAttribute(
        'aria-description',
        /Ships cannot be moved out while this fleet carries cargo/,
      );
      await page.getByRole('button', { name: 'Fleets', exact: true }).click();
      await selectMapFleet(page, 'Freighters');
      const overview = page.getByRole('article', {
        name: 'Fleet Route Tellus <> Vesta',
        exact: true,
      });
      await expect(overview.locator('.ship-token').first()).toBeDisabled();
      await expect(overview).toHaveAttribute(
        'aria-description',
        /carries cargo/,
      );
      return;
    }
    await expect(fighter).toBeEnabled();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await fighter.dragTo(
      page.getByRole('group', { name: 'Ships in Home Fleet', exact: true }),
    );
    await expect(freighters).toContainText('Route Tellus <> Vesta');
    await expect(
      page.getByRole('button', {
        name: 'Fighter 2 in Home Fleet',
        exact: true,
      }),
    ).toBeVisible();
    await transport().focus();
    await page.keyboard.press('Enter');
    await page
      .getByRole('button', { name: 'Move ship to new fleet', exact: true })
      .press('Enter');
    await page
      .getByRole('textbox', { name: 'Fleet name', exact: true })
      .press('Escape');
    await expect(freighters).toContainText('Route Tellus <> Vesta');
    await transport().focus();
    await page.keyboard.press('Enter');
    await page
      .getByRole('button', { name: 'Move ship to Home Fleet', exact: true })
      .press('Enter');
    await page.reload();
    await startFirstSlot(page);
    await page.getByRole('button', { name: 'Fleets', exact: true }).click();
    const empty = page.getByRole('article', {
      name: 'Fleet Freighters',
      exact: true,
    });
    await expect(empty).toHaveCount(0);
    const restored = await page.evaluate(() => {
      const saved = JSON.parse(
        localStorage.getItem('spacelords.save.v2.1')!,
      ) as SavedGame;
      return saved.state.fleets.find((fleet) => fleet.id === 'freighters')!;
    });
    expect(restored.position).toBeNull();
    expect(restored.routeId).toBeFalsy();
    await selectMapFleet(page);
    await expect(
      page.getByRole('button', {
        name: 'Transport ship 1 in Home Fleet',
        exact: true,
      }),
    ).toBeEnabled();
  });
}
