import { Game } from '../../src/client/models/Game.js';
import { HexGeometry } from '../../src/client/models/HexCoordinate.js';
import { FleetMapLayout } from '../../src/client/models/FleetMapLayout.js';
import type { SavedGame } from '../../src/client/models/SaveRepository.js';
import { selectMapPoint } from './map-helpers.js';
import { expect, type Page } from '@playwright/test';

export async function chooseFleetOrder(
  page: Page,
  label: string,
): Promise<void> {
  const selected = page.locator('.selected-fleet-card');
  const card = (await selected.count())
    ? selected
    : page.locator('.fleet-card').first();
  const fleetId = await card.getAttribute('data-fleet-id');
  const record = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
  );
  const fleet = Game.restore(record.state).fleet(fleetId!)!;
  await card.getByRole('button', { name: 'Orders', exact: true }).click();
  await page
    .getByRole('button', {
      name: label === 'Salvage' ? 'Deliberate salvage' : label,
      exact: true,
    })
    .click();
  if (label === 'Patrol')
    await selectMapPoint(page, HexGeometry.toPoint(fleet.position!));
}

export async function chooseShipStartFleet(
  page: Page,
  name: string,
): Promise<void> {
  await page.getByRole('button', { name: 'Orders', exact: true }).click();
  await page.getByRole('button', { name: 'Join fleet', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Fleet target' })
    .selectOption({ label: name });
  await page.getByRole('button', { name: `Join ${name}`, exact: true }).click();
}

export async function chooseFleetDestination(
  page: Page,
  name = 'Home Fleet',
): Promise<void> {
  const card = page.locator('.map-fleet-cards .fleet-card').filter({
    has: page.getByRole('heading', { name, exact: true }),
  });

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
  const game = Game.restore(record.state);
  const fleets = game.fleetSnapshots();
  const routeView = await page
    .locator('.nav-button[data-screen="route"][aria-current="page"]')
    .count();
  const marker = FleetMapLayout.markers(
    fleets,
    routeView ? game.tradeRoutes : [],
  ).find(
    (marker) => marker.fleet.name === name || marker.fleet.ownName === name,
  );
  if (!marker) throw new Error(`No positioned fleet: ${name}`);
  await selectMapPoint(page, marker.point);
  await expect(
    page.locator('.selected-fleet-card .fleet-name-button'),
  ).toHaveText(marker.fleet.name);
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
