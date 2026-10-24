import { Game } from '../../src/client/models/Game.js';
import { FleetMapLayout } from '../../src/client/models/FleetMapLayout.js';
import type { SavedGame } from '../../src/client/models/SaveRepository.js';
import { selectMapPoint } from './map-helpers.js';
import { expect, type Page } from '@playwright/test';

export async function chooseFleetDestination(
  page: Page,
  name = 'Home Fleet',
): Promise<void> {
  const card = page.locator('.map-fleet-cards .fleet-card').filter({
    has: page.getByRole('heading', { name, exact: true }),
  });
  await card.locator('.fleet-orders > summary').click();
  await card
    .getByRole('button', {
      name: `Choose destination for ${name}`,
      exact: true,
    })
    .click();
}

export async function selectMapFleet(
  page: Page,
  name = 'Home Fleet',
): Promise<void> {
  const record = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
  );
  const fleets = Game.restore(record.state).fleetSnapshots();
  const marker = FleetMapLayout.markers(fleets).find(
    (marker) => marker.fleet.name === name,
  );
  if (!marker) throw new Error(`No positioned fleet: ${name}`);
  await selectMapPoint(page, marker.point);
  await expect(
    page.locator('.selected-fleet-card .fleet-name-button'),
  ).toHaveText(name);
}

export async function formFleet(
  page: Page,
  ship = 'Fighter',
  source = 'Home Fleet',
  name?: string,
): Promise<void> {
  await selectMapFleet(page, source);
  await page
    .getByRole('button', { name: `${ship} 1 in ${source}`, exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Move ship to new fleet', exact: true })
    .click();
  const input = page.getByRole('textbox', { name: 'Fleet name', exact: true });
  await expect(input).toBeFocused();
  if (name) {
    await input.fill(name);
    await input.press('Enter');
  } else await input.press('Escape');
}

export async function receiveShip(page: Page, name: string): Promise<void> {
  const select = page.getByRole('combobox', {
    name: 'Receiving fleet',
    exact: true,
  });
  const value = await select
    .locator('option')
    .filter({ hasText: `${name} ·` })
    .getAttribute('value');
  if (!value) throw new Error(`No receiving fleet: ${name}`);
  await select.selectOption(value);
}
