import { expect, test } from '@playwright/test';

test('tydliga-handlingsbilder-pa-mobil: large text-free actions fit without internal scrolling', async ({
  page,
}) => {
  await page.goto('../../browser/');
  await page
    .getByRole('button', { name: 'Test boarding (cheat)', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Boarding combat' });
  const controls = dialog.getByRole('region', { name: 'Soldier actions' });
  const turn = controls.getByRole('button', { name: 'Turn left 45°' });
  await expect(turn).toBeVisible();
  await expect(turn).toHaveText('');
  const bounds = await controls.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    bottom: element.getBoundingClientRect().bottom,
    height: window.innerHeight,
  }));
  expect(bounds.scrollHeight).toBeLessThanOrEqual(bounds.clientHeight);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
  const button = (await turn.boundingBox())!;
  expect(button.width).toBeGreaterThanOrEqual(60);
  expect(button.height).toBeGreaterThanOrEqual(60);
});
