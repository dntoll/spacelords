import { selectMapFleet } from './fleet-helpers.js';
import { selectMapObject } from './map-helpers.js';
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
  await selectMapObject(page, from);
  await page.locator('canvas[data-rendered="true"]').press('r');
  await selectMapObject(page, to);
}

export async function startFirstSlot(page: Page): Promise<void> {
  await page
    .getByRole('article', { name: 'Save slot 1', exact: true })
    .getByRole('button', { name: /Start game|Continue game/ })
    .click();
}

export async function assignFleetToRoute(
  page: Page,
  fleet: string,
  from: string,
  to: string,
): Promise<void> {
  await page.getByRole('button', { name: 'Star map', exact: true }).click();
  await selectMapFleet(page, fleet);
  const card = page.locator('.map-fleet-cards .selected-fleet-card');
  const routes = card.locator('.fleet-route-menu > summary');
  await routes.focus();
  await routes.press('Enter');
  const assign = card.getByRole('button', {
    name: `Assign ${fleet} to ${from} to ${to}`,
    exact: true,
  });
  await assign.focus();
  await assign.press('Enter');
}

export async function endTurn(page: Page): Promise<void> {
  const onMap = (await page.locator('.map-page').count()) > 0;
  if (
    !(await page
      .getByRole('button', { name: 'End turn', exact: true })
      .isVisible())
  )
    await page.getByRole('button', { name: /^Decisions/ }).click();
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  const warning = page.getByRole('dialog', { name: 'Decisions remaining' });
  if (await warning.isVisible())
    await warning
      .getByRole('button', { name: 'End turn anyway', exact: true })
      .click();
  for (let interruptions = 0; interruptions < 32; interruptions++) {
    await expect
      .poll(async () => {
        if (await page.locator('.discovery-dialog[open]').isVisible())
          return 'discovery';
        return (await page
          .getByRole('button', { name: 'End turn', exact: true })
          .isEnabled())
          ? 'planning'
          : 'running';
      })
      .not.toBe('running');
    const ignore = page
      .locator('.discovery-dialog[open]')
      .getByRole('button', { name: /^(Ignore|Continue)$/, exact: true });
    if (!(await ignore.isVisible())) break;
    await ignore.click();
  }
  await expect(
    page.getByRole('button', { name: 'End turn', exact: true }),
  ).toBeEnabled();
  if (onMap && !(await page.locator('.map-page').count()))
    await page.getByRole('button', { name: 'Star map', exact: true }).click();
}
