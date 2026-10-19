import { expect, test, type Page } from '@playwright/test';

async function mapCenter(page: Page) {
  const canvas = page.locator('canvas[data-rendered="true"]');
  await expect(canvas).toHaveCount(1);
  const bounds = (await canvas.boundingBox())!;
  return {
    canvas,
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

test('flottval-pa-kartan / dra-flottdestination: selects a fleet, previews a snapped arrow and commits on release', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  const { canvas, x, y } = await mapCenter(page);
  await page
    .getByRole('combobox', { name: 'Known objects' })
    .selectOption({ label: 'Vesta' });
  const camera = await page.getByTestId('camera-position').textContent();
  await page.mouse.move(x, y - 18);
  await expect(canvas).toHaveCSS('cursor', 'pointer');
  await page.mouse.click(x, y - 18);
  const panel = page.getByRole('complementary', { name: 'Selected fleet' });
  await expect(
    panel.getByRole('heading', { name: 'Home Fleet', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('combobox', { name: 'Known objects' }),
  ).toHaveValue('0,1');
  await page.mouse.move(x, y - 18);
  await page.mouse.down();
  await page.mouse.move(x + Math.sqrt(3) * 36, y, { steps: 8 });
  await expect(panel).toContainText('Destination preview: HEX 2,0');
  await expect(canvas).toHaveCSS('cursor', 'grabbing');
  await expect(page.getByTestId('camera-position')).toHaveText(camera!);
  await page.screenshot({
    path: testInfo.outputPath('fleet-destination-preview.png'),
  });
  await page.mouse.up();
  await expect(panel).toContainText('Destination: HEX 2,0');
  await page.mouse.move(x, y - 18);
  await page.mouse.down();
  await page.mouse.move(x - Math.sqrt(3) * 36, y, { steps: 8 });
  await expect(panel).toContainText('Destination preview: HEX 0,0');
  await canvas.press('Escape');
  await page.mouse.up();
  await expect(panel).toContainText('Destination: HEX 2,0');
  expect(errors).toEqual([]);
});

test('kartflottor / flottval-pa-kartan: colocated fleets occupy separate positions within the hex', async ({
  page,
}, testInfo) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Fleets', exact: true }).click();
  await page.getByRole('button', { name: 'Home Fleet', exact: true }).click();
  await page.getByRole('button', { name: 'New fleet', exact: true }).click();
  await page
    .getByRole('button', { name: 'Home Fleet, Fighter: 1', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Fleet 1, Fighter: 0', exact: true })
    .click();
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  const { x, y } = await mapCenter(page);
  const hud = (await page
    .getByRole('complementary', { name: 'Selected hex' })
    .boundingBox())!;
  // flottval-pa-kartan: the information panel must not cover either fleet marker.
  expect(
    x < hud.x ||
      x > hud.x + hud.width ||
      y - 18 < hud.y ||
      y - 18 > hud.y + hud.height,
  ).toBe(true);
  expect(
    x < hud.x ||
      x > hud.x + hud.width ||
      y + 18 < hud.y ||
      y + 18 > hud.y + hud.height,
  ).toBe(true);
  await page.mouse.click(x, y - 18);
  const panel = page.getByRole('complementary', { name: 'Selected fleet' });
  await expect(
    panel.getByRole('heading', { name: 'Fleet 1', exact: true }),
  ).toBeVisible();
  await page.mouse.click(x, y + 18);
  await expect(
    panel.getByRole('heading', { name: 'Home Fleet', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('colocated-fleets.png') });
  await page.mouse.click(x, y);
  await expect(
    page.getByRole('complementary', { name: 'Selected hex' }),
  ).toContainText('Tellus');
});
