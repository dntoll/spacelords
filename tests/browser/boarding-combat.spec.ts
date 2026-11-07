import { expect, test } from '@playwright/test';
import { boardingIsoCellPoint } from '../../src/client/views/BoardingProjection.js';

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
  for (const artwork of [
    'airlock-',
    'reactor-',
    'half-cover-',
    'door-closed-q-',
    'door-closed-r-',
  ]) {
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
  await expect(dialog.getByLabel('Map legend')).toContainText(
    /Half cover.*Fire after move.*Move only/,
  );
  await expect(dialog.getByLabel('Map legend')).not.toContainText(
    /Facing|Sight|◇ Fire/,
  );
  await expect(dialog.getByLabel('Map legend')).toContainText('1 tile = 1 m');
  const turnLeft = dialog.getByRole('button', {
    name: 'Turn left 45°',
    exact: true,
  });
  await expect(turnLeft).toBeVisible();
  const dialogBox = (await dialog.boundingBox())!;
  const boardBox = (await dialog.locator('.boarding-board').boundingBox())!;
  const actionBox = (await turnLeft.boundingBox())!;
  expect(boardBox.height / dialogBox.height).toBeGreaterThan(0.85);
  expect(actionBox.width).toBeLessThanOrEqual(44);
  expect(actionBox.height).toBeLessThanOrEqual(44);

  const canvas = dialog.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({
    position: boardingIsoCellPoint(
      { width: 17, height: 11 },
      { width: box!.width, height: box!.height },
      { q: 3, r: 9 },
    ),
  });
  const shoot = dialog.getByRole('button', { name: /^Shoot · \d+%$/ });
  await expect(shoot).toBeEnabled();
  await shoot.click();
  await shoot.click();
  await expect(dialog.locator('.boarding-log')).toContainText(/Rifle.*door/i);
  await expect(
    dialog.getByRole('button', { name: 'Shoot', exact: true }),
  ).toBeDisabled();
  // tydlig-bordningsstatus: inspect the transient turn before advancing AI timers.
  await page.clock.install({ time: new Date('2026-11-04T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-04T01:00:00Z'));
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
  for (let index = 0; index < 8; index++)
    await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const box = (await canvas.boundingBox())!;
  for (let index = 0; index < 4; index++) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 120,
      box.y + box.height / 2 + 150,
      { steps: 2 },
    );
    await page.mouse.up();
  }
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
