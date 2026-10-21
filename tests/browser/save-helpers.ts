import { expect, type Page } from '@playwright/test';

export async function chooseResearch(
  page: Page,
  technology: string,
): Promise<void> {
  const choose = page.getByRole('button', {
    name: `Research ${technology}`,
    exact: true,
  });
  await choose.focus();
  await choose.click();
}

export async function connectTradePlanets(
  page: Page,
  from: string,
  to: string,
): Promise<void> {
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Known objects' })
    .selectOption({ label: from });
  await page.getByRole('button', { name: 'Create route', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Known objects' })
    .selectOption({ label: to });
}

export async function startFirstSlot(page: Page): Promise<void> {
  await page
    .getByRole('article', { name: 'Save slot 1', exact: true })
    .getByRole('button', { name: /Start game|Continue game/ })
    .click();
}

export async function endTurn(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  const warning = page.getByRole('dialog', { name: 'Decisions remaining' });
  if (await warning.isVisible())
    await warning
      .getByRole('button', { name: 'End turn anyway', exact: true })
      .click();
  await expect(
    page.getByRole('button', { name: 'End turn', exact: true }),
  ).toBeEnabled();
}
