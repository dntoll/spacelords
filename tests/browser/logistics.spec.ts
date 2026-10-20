import { expect, test, type Page } from '@playwright/test';
import {
  endTurn,
  startFirstSlot,
  chooseResearch,
  connectTradePlanets,
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
  await page.getByRole('button', { name: 'Homeworld', exact: true }).click();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
}

async function build(page: Page, site: number, type: string) {
  await page
    .getByRole('button', {
      name: `Build building at site ${site}`,
      exact: true,
    })
    .click();
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
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Decisions remaining' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Decisions', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Next decision', exact: true }),
  ).toBeVisible();
  await page
    .locator('[data-decision-id="research-empty"]')
    .getByRole('button', { name: 'Skip this turn' })
    .click();
  await expect(
    page.locator('[data-decision-id="research-empty"]'),
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
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  for (const technology of [
    'Trade logistics',
    'Colony ship factory',
    'Fighter factory',
  ])
    await chooseResearch(page, technology);
  await expect(page.locator('.research-queue article')).toHaveCount(7);
  for (let year = 0; year < 7; year++) await nextYear(page);
  await home(page);
  for (const [index, type] of [
    'Transport ship factory',
    'Exploration ship factory',
    'Colony ship factory',
    'Fighter factory',
  ].entries())
    await build(page, index + 5, type);
  for (let year = 0; year < 4; year++) await nextYear(page);
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  for (const name of ['Freighters', 'Settlers']) {
    await page.getByRole('button', { name: 'New fleet', exact: true }).click();
    await page.getByRole('textbox', { name: 'Fleet name' }).fill(name);
    await page.getByRole('button', { name: 'Rename', exact: true }).click();
  }
  await home(page);
  await page
    .getByRole('combobox', {
      name: 'Destination fleet for Transport ship',
      exact: true,
    })
    .selectOption({ label: 'Freighters' });
  await page
    .getByRole('button', { name: 'Queue Transport ship', exact: true })
    .click();
  await page
    .getByRole('combobox', {
      name: 'Destination fleet for Colony ship',
      exact: true,
    })
    .selectOption({ label: 'Settlers' });
  await page
    .getByRole('button', { name: 'Queue Colony ship', exact: true })
    .click();
  await nextYear(page);
  await nextYear(page);
  const settlers = page.locator('.fleet-summary').filter({
    has: page.getByRole('heading', { name: 'Settlers', exact: true }),
  });
  await settlers
    .getByRole('button', { name: 'Set destination', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'Known objects' })
    .selectOption({ label: 'Vesta' });
  await nextYear(page);
  await page
    .getByRole('combobox', { name: 'Known objects' })
    .selectOption({ label: 'Vesta' });
  await page.getByRole('button', { name: 'Colonize', exact: true }).click();
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await build(page, 1, 'Iron mine');
  await expect(page.locator('.planet-building-queue')).toContainText(
    'no active transport path',
  );
  await page.getByRole('button', { name: 'Trade routes', exact: true }).click();
  await connectTradePlanets(page, 'Tellus', 'Vesta');
  await page
    .getByRole('button', {
      name: 'Assign Freighters to Tellus to Vesta',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('complementary', { name: 'Selected object' }),
  ).toContainText('30 cargo capacity');
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page.getByRole('button', { name: 'Homeworld', exact: true }).click();
  for (const [planet, fraction] of [
    ['Tellus', 0.35],
    ['Vesta', 0.65],
  ] as const) {
    await page
      .getByRole('combobox', { name: 'Known objects' })
      .selectOption({ label: planet });
    await expectVisibleRoute(page, fraction);
  }
  await page.screenshot({
    path: testInfo.outputPath('selected-trade-route.png'),
  });
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
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
  ).toBeDisabled();
  await freighters.locator('.fleet-assignment').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('fleet-trade-route.png') });
  await page.getByRole('button', { name: 'Trade routes', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('trade-routes.png') });
  await nextYear(page);
  await page
    .getByRole('combobox', { name: 'Known objects' })
    .selectOption({ label: 'Vesta' });
  await page.getByRole('button', { name: 'Open planet', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Building site 1', exact: true }),
  ).toContainText('Operational');
  await page.screenshot({ path: testInfo.outputPath('supplied-colony.png') });
  await page.reload();
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Trade routes', exact: true }).click();
  const route = page.getByRole('button', {
    name: 'Select route Tellus to Vesta',
    exact: true,
  });
  await route.focus();
  await route.press('Enter');
  await expect(
    page.getByRole('complementary', { name: 'Selected object' }),
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
