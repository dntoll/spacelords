import { selectMapObject } from './map-helpers.js';
import {
  chooseFleetDestination,
  formFleet,
  selectMapFleet,
  receiveShip,
} from './fleet-helpers.js';
import { expect, test, type Page } from '@playwright/test';
import {
  endTurn,
  startFirstSlot,
  chooseResearch,
  connectTradePlanets,
  assignFleetToRoute,
} from './save-helpers.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../src/client/models/HexCoordinate.js';

async function nextYear(page: Page) {
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await endTurn(page);
}

async function home(page: Page) {
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.locator('canvas[data-rendered="true"]').press('Home');
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
}

async function build(page: Page, site: number, type: string) {
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await page
    .getByRole('button', {
      name: `Build building at site ${site}`,
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: `Show ${type}`, exact: true }).click();
  await page
    .getByRole('button', { name: `Build ${type}`, exact: true })
    .click();
}

test('utvinningsbyggnader / forskningsko / automatisk-resursforsorjning / fysisk-frakt / forstarka-ruttflotta / flottans-handelsrutt: a new game supplies its colony through an assigned fleet', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Decisions', exact: true }).click();
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Decisions remaining' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Decisions', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Next decision', exact: true }),
  ).toHaveCount(0);
  await page
    .locator('[data-decision-id="building-empty-sol-0"]')
    .getByRole('button', { name: 'Skip this turn' })
    .click();
  await expect(
    page.locator('[data-decision-id="building-empty-sol-0"]'),
  ).toContainText('Skipped this turn');
  await home(page);
  for (const [index, type] of [
    'Iron mine',
    'Water extractor',
    'Oil extractor',
    'Research station',
  ].entries())
    await build(page, index + 1, type);
  for (let year = 0; year < 4; year++) await nextYear(page);
  await home(page);
  await expect(page.locator('[data-resource="Iron"]')).toContainText(
    'Extracting 10/year',
  );
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Research', exact: true })
    .click();
  for (const technology of [
    'Trade logistics',
    'Colony ship factory',
    'Fighter factory',
    'Desert dome',
  ])
    await chooseResearch(page, technology);
  await expect(page.locator('.research-queue article')).toHaveCount(8);
  for (let year = 0; year < 8; year++) await nextYear(page);
  await home(page);
  for (const [index, type] of [
    'Transport ship factory',
    'Exploration ship factory',
    'Colony ship factory',
    'Fighter factory',
    'Rocket engine factory',
  ].entries())
    await build(page, index + 5, type);
  for (let year = 0; year < 5; year++) await nextYear(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await formFleet(page, 'Fighter', 'Home Fleet', 'Freighters');
  await formFleet(page, 'Exploration ship', 'Home Fleet', 'Settlers');
  await home(page);
  await page
    .getByRole('navigation', { name: 'Planet pages' })
    .getByRole('button', { name: 'Production', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show Transport ship', exact: true })
    .click();
  await page
    .getByRole('combobox', {
      name: 'Destination fleet for Transport ship',
      exact: true,
    })
    .selectOption({ label: 'Freighters' });
  await page
    .getByRole('navigation', { name: 'Planet pages' })
    .getByRole('button', { name: 'Production', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show Transport ship', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Queue Transport ship', exact: true })
    .click();
  await page
    .getByRole('navigation', { name: 'Planet pages' })
    .getByRole('button', { name: 'Production', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show Colony ship', exact: true })
    .click();
  await page
    .getByRole('combobox', {
      name: 'Destination fleet for Colony ship',
      exact: true,
    })
    .selectOption({ label: 'Settlers' });
  await page
    .getByRole('navigation', { name: 'Planet pages' })
    .getByRole('button', { name: 'Production', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Show Colony ship', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Queue Colony ship', exact: true })
    .click();
  for (let year = 0; year < 6; year++) await nextYear(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await selectMapFleet(page, 'Freighters');
  await page
    .getByRole('button', { name: 'Fighter 1 in Freighters', exact: true })
    .click();
  await receiveShip(page, 'Home Fleet');
  await selectMapFleet(page, 'Settlers');
  await chooseFleetDestination(page, 'Settlers');
  await selectMapObject(page, 'Vesta');
  await nextYear(page);
  await selectMapObject(page, 'Vesta');
  await page.getByRole('button', { name: 'Colonize', exact: true }).click();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Build dome at site 1', exact: true })
    .click();
  await page.getByRole('button', { name: 'Build queue', exact: true }).click();
  await expect(page.locator('.planet-building-queue')).toContainText(
    'no active transport path',
  );
  await page.getByRole('button', { name: 'Route', exact: true }).click();
  await connectTradePlanets(page, 'Tellus', 'Vesta');
  await assignFleetToRoute(page, 'Freighters', 'Tellus', 'Vesta');
  await expect(
    page.getByRole('complementary', { name: 'Selected route' }),
  ).toContainText('30 cargo capacity');
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.locator('canvas[data-rendered="true"]').press('Home');
  for (const [planet, fraction] of [
    ['Tellus', 0.35],
    ['Vesta', 0.65],
  ] as const) {
    await selectMapObject(page, planet);
    await expectVisibleRoute(page, fraction);
  }
  await page.screenshot({
    path: testInfo.outputPath('selected-trade-route.png'),
  });
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await selectMapFleet(page, 'Freighters');
  const freighters = page.getByRole('article', {
    name: 'Fleet Freighters',
    exact: true,
  });
  await expect(freighters).toContainText('Trade route: Tellus ↔ Vesta');
  await page
    .getByRole('button', { name: 'Fighter 1 in Home Fleet', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Move ship to Freighters', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Fighter 1 in Freighters', exact: true }),
  ).toBeEnabled();
  await freighters.locator('.fleet-assignment').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('fleet-trade-route.png') });
  await page.getByRole('button', { name: 'Route', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('trade-routes.png') });
  await nextYear(page);
  await selectMapObject(page, 'Vesta');
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await expect(
    page.getByRole('article', { name: 'Building site 1', exact: true }),
  ).toContainText('Dome ready');
  await build(page, 1, 'Iron mine');
  for (let year = 0; year < 3; year++) await nextYear(page);
  await selectMapObject(page, 'Vesta');
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Building sites', exact: true })
    .click();
  await expect(
    page.getByRole('article', { name: 'Building site 1', exact: true }),
  ).toContainText('Operational');
  await page.screenshot({ path: testInfo.outputPath('supplied-colony.png') });
  await page.reload();
  await startFirstSlot(page);
  await selectMapObject(page, 'Tellus');
  const route = page.getByRole('button', {
    name: 'Tellus ↔ Vesta',
    exact: true,
  });
  await route.focus();
  await route.press('Enter');
  await expect(
    page.getByRole('complementary', { name: 'Selected route', exact: true }),
  ).toContainText('Freighters');
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

async function expectVisibleRoute(page: Page, fraction: number): Promise<void> {
  // Clear pointer hover so this check samples the ordinary blue route.
  const map = page.locator('canvas[data-rendered="true"]');
  await map.press('ArrowRight');
  await map.press('ArrowLeft');
  const start = HexGeometry.toPoint(new HexCoordinate(1, 0));
  const end = HexGeometry.toPoint(new HexCoordinate(0, 1));
  // synliga-handelsrutter: sample inside the selected tile, outside planet badges.
  await expect
    .poll(() =>
      page.locator('canvas[data-rendered="true"]').evaluate(
        (node, offset) => {
          const canvas = node as HTMLCanvasElement;
          const density = canvas.width / canvas.getBoundingClientRect().width;
          const radius = Math.ceil(3 * density);
          const pixels = canvas
            .getContext('2d')!
            .getImageData(
              Math.round(canvas.width / 2 + offset.x * density) - radius,
              Math.round(canvas.height / 2 + offset.y * density) - radius,
              radius * 2 + 1,
              radius * 2 + 1,
            ).data;
          let routePixels = 0;
          for (let i = 0; i < pixels.length; i += 4)
            if (
              pixels[i + 2]! > pixels[i]! + 50 &&
              pixels[i + 2]! > pixels[i + 1]! + 20
            )
              routePixels++;
          return routePixels;
        },
        { x: (end.x - start.x) * fraction, y: (end.y - start.y) * fraction },
      ),
    )
    .toBeGreaterThan(2);
}
