import { expect, test, type Locator, type Page } from '@playwright/test';
import { composeTestBoarding } from '../../../src/client/boarding/models/map/TestBoarding.js';
import {
  boardingIsoCamera,
  boardingIsoCenter,
} from '../../../src/client/boarding/views/rendering/BoardingProjection.js';

const testMap = composeTestBoarding().map;
// miljomal-och-forstorelse: the boarders start on their own ship, out of rifle
// range of every door. The attacker reactor is the environment target in range.
const reactor = testMap.features.find(
  (feature) => feature.id === 'attacker-reactor',
)!;

async function panBoarding(
  page: Page,
  canvas: Locator,
  box: { x: number; y: number; width: number; height: number },
  goldPixels: () => Promise<number>,
) {
  const startX = box.x + box.width * 0.55;
  const startY = box.y + Math.min(box.height * 0.32, 180);
  let dx = -Math.round(box.width * 0.42);
  let dy = Math.round(Math.min(box.height, 700) * 0.35);
  let previous = await goldPixels();
  for (let index = 0; index < 8 && previous > 0; index++) {
    await canvas.hover({ position: { x: startX - box.x, y: startY - box.y } });
    await page.mouse.down();
    await page.mouse.move(startX + dx, startY + dy, { steps: 8 });
    await page.mouse.up();
    const next = await goldPixels();
    if (next >= previous) {
      dx = -dx;
      dy = -dy;
    }
    previous = next;
  }
}

function cellOnCanvas(
  view: { readonly width: number; readonly height: number },
  cell: { readonly q: number; readonly r: number },
) {
  const camera = boardingIsoCamera(testMap, view, (entry) =>
    Boolean(testMap.terrainAt(entry)),
  );
  const center = boardingIsoCenter(cell);
  return {
    x: camera.offset.x + center.x * camera.scale,
    y: camera.offset.y + center.y * camera.scale,
  };
}

test('meterskala-i-bordning / genomskinliga-skymmande-vaggar / isometriska-bordningsobjekt / fristaende-bordningsprototyp / miljomal-och-forstorelse / tydlig-bordningsstatus / isometrisk-bordningsvy / spelmassigt-bordningsgranssnitt / bordningsfigurer-fran-spritesheet / bordning-utan-riktningspilar / bordning-utan-sikt-och-eldrutor: uses character sprites in the tactical HUD, targets a door and advances a hidden defender without changing saves', async ({
  page,
}) => {
  await page.goto('./');
  const before = await page.evaluate(() => ({ ...localStorage }));
  await page
    .getByRole('button', { name: 'Test boarding (cheat)', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Boarding combat' });
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .some((entry) => entry.name.includes('faction-sprites')),
      ),
    )
    .toBe(true);
  // isometriska-bordningsobjekt: crate and door faces are small enough for
  // Vite to inline as data URLs, so only file-backed artwork is a resource.
  for (const artwork of ['airlock-', 'reactor-']) {
    await expect
      .poll(() =>
        page.evaluate(
          (name) =>
            performance
              .getEntriesByType('resource')
              .some((entry) => entry.name.includes(name)),
          artwork,
        ),
      )
      .toBe(true);
  }
  const team = dialog.getByRole('region', { name: 'Boarding team' });
  await expect(team.getByRole('progressbar')).toHaveCount(4);
  await expect(team.locator('.boarding-unit-active')).toContainText(
    /^Boarder \d/,
  );
  await expect(dialog.getByLabel('Map legend')).toHaveCount(0);
  const turnLeft = dialog.getByRole('button', {
    name: 'Turn left 45°',
    exact: true,
  });
  await expect(turnLeft).toBeVisible();
  const dialogBox = (await dialog.boundingBox())!;
  const boardBox = (await dialog.locator('.boarding-board').boundingBox())!;
  const actionBox = (await turnLeft.boundingBox())!;
  expect(boardBox.height / dialogBox.height).toBeGreaterThan(0.85);
  expect(actionBox.width).toBeGreaterThanOrEqual(60);
  expect(actionBox.height).toBeGreaterThanOrEqual(60);
  const controls = dialog.getByRole('region', { name: 'Soldier actions' });
  const controlBounds = await controls.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    bottom: element.getBoundingClientRect().bottom,
    screenHeight: window.innerHeight,
  }));
  expect(controlBounds.scrollHeight).toBeLessThanOrEqual(
    controlBounds.clientHeight,
  );
  expect(controlBounds.bottom).toBeLessThanOrEqual(controlBounds.screenHeight);
  await expect(turnLeft).toHaveText('');

  const canvas = dialog.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({
    position: cellOnCanvas(
      { width: box!.width, height: box!.height },
      reactor.position,
    ),
  });
  const shoot = dialog.getByRole('button', { name: /^Shoot · \d+%$/ });
  await expect(shoot).toBeEnabled();
  for (let shot = 0; shot < 3; shot++) {
    await shoot.click();
    await expect(dialog.getByText('Resolving action…')).toHaveCount(0);
    await expect(dialog.getByText('Focusing…')).toHaveCount(0);
  }
  await expect(dialog.locator('.boarding-log')).toContainText(
    /Rifle.*reactor/i,
  );
  await expect(
    dialog.getByRole('button', { name: 'Shoot', exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole('button', { name: 'End soldier turn', exact: true }),
  ).toBeVisible();
  // tydlig-bordningsstatus: inspect the transient turn before advancing AI timers.
  // Keep the current time. Jumping backwards freezes a presentation
  // whose start was measured with the real clock.
  await page.clock.install();
  await page.clock.runFor(1500);
  const defendersActing = dialog.getByText('Defenders are acting…', {
    exact: true,
  });
  for (let index = 0; index < 4; index++) {
    if (await defendersActing.isVisible()) break;
    await dialog
      .getByRole('button', { name: 'End soldier turn', exact: true })
      .click();
  }
  await expect(defendersActing).toBeVisible();
  await dialog.getByText('Combat details', { exact: true }).click();
  await expect(dialog.locator('.boarding-activity')).toContainText(
    'A defender is acting',
  );
  await page.clock.runFor(500);
  await expect(dialog.locator('.boarding-log')).toContainText(/A defender /);

  await dialog
    .getByRole('button', { name: 'Close boarding', exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Test boarding (cheat)', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
});

test('kamerafokus-vid-bordningssoldatbyte: selecting an offscreen soldier reveals the figure above the mobile HUD', async ({
  page,
}, testInfo) => {
  await page.goto('./');
  await page
    .getByRole('button', { name: 'Test boarding (cheat)', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Boarding combat' });
  const canvas = dialog.locator('canvas');
  await expect(canvas).toBeVisible();
  const goldPixels = () =>
    canvas.evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      let count = 0;
      for (let index = 0; index < pixels.length; index += 4)
        if (
          pixels[index] === 244 &&
          pixels[index + 1] === 207 &&
          pixels[index + 2] === 90
        )
          count++;
      return count;
    });
  // The zoom buttons were removed; the map keeps keyboard zoom on the canvas.
  await canvas.focus();
  for (let index = 0; index < 8; index++) await canvas.press('+');
  const box = (await canvas.boundingBox())!;
  // kamerafokus-vid-bordningssoldatbyte: drag far enough that the active
  // soldier's marker leaves the enlarged two-ship map.
  await panBoarding(page, canvas, box, goldPixels);
  await expect.poll(goldPixels).toBe(0);
  const soldier = dialog
    .locator('.boarding-unit:not(.boarding-unit-active)')
    .first();
  const label = (await soldier.locator('strong').textContent())!;
  await soldier.click();
  await expect(dialog.locator('.boarding-status')).toContainText(label);
  await expect.poll(goldPixels).toBeGreaterThan(20);
  await dialog.screenshot({
    path: testInfo.outputPath('boarding-camera-focus.png'),
  });
  await dialog
    .getByRole('button', { name: 'Close boarding', exact: true })
    .click();
});
