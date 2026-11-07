// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { MasterController } from '../../src/client/controllers/app/MasterController.js';
import { AppView } from '../../src/client/views/app/AppView.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';

it('handelsrutt-val-pa-stjarnkartan / flottilldelning-pa-stjarnkartan: the map panel administers multiple fleets and retains real positions', () => {
  const original = tradeNetworkState();
  const state = {
    ...original,
    fleets: original.fleets.map((f) =>
      f.id === 'travellers'
        ? { ...f, position: original.fleets[0]!.position, destination: null }
        : f,
    ),
  };
  const model = new AppModel(undefined, {
    load: () => ({ lastPlayed: '2026-10-21T10:00:00Z', state }),
    save() {},
    clear() {},
  });
  model.startSlot(1);
  model.selectMapRoute('route-test');
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const view = new AppView(root, () => ({ render() {}, dispose() {} }));
  const controller = new MasterController(model, view);
  controller.start();
  expect(
    root.querySelector('.trade-route-details .trade-assignment-option'),
  ).toBeNull();
  expect(root.querySelector('.trade-route-details')!.textContent).not.toContain(
    'Home Fleet',
  );
  const click = (label: string) =>
    root.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click();
  for (const id of ['freighters', 'travellers'] as const) {
    model.selectMapFleet(id);
    view.render(model.snapshot);
    root
      .querySelector<HTMLButtonElement>(
        `.selected-fleet-card[data-fleet-id="${id}"] [aria-label="Orders"]`,
      )!
      .click();
    click('Join route');
    click('Tellus ↔ Vesta');
  }
  model.selectMapRoute('route-test');
  view.render(model.snapshot);
  expect(
    root.querySelector('[aria-label="Selected route"]')!.textContent,
  ).toContain('Assigned fleets · 2');
  expect(
    root.querySelector('[aria-label="Selected route"]')!.textContent,
  ).toContain('90 cargo capacity');
  expect(
    root.querySelector('[data-fleet-id="freighters"] .fleet-name-button')!
      .textContent,
  ).toBe('Route Tellus <> Vesta');
  root
    .querySelector<HTMLButtonElement>(
      '[data-fleet-id="freighters"] .fleet-name-button',
    )!
    .click();
  model.selectMapFleet('freighters');
  view.render(model.snapshot);
  expect(
    root.querySelector('[aria-label="Selected fleet"] .selected-fleet-card h3')!
      .textContent,
  ).toBe('Route Tellus <> Vesta');
  click('Select route Tellus to Vesta');
  expect(model.snapshot.mapTrade.routeId).toBe('route-test');
  expect(root.querySelector('[aria-label="Selected route"]')).not.toBeNull();
  root
    .querySelector<HTMLButtonElement>(
      '[data-fleet-id="freighters"] [aria-label="Release from trade route"]',
    )!
    .click();
  expect(model.snapshot.tradeRoutes[0]!.fleetIds).toEqual(['travellers']);
  click('Close route');
  expect(model.snapshot.tradeRoutes).toEqual([]);
  expect(root.querySelector('[aria-label="Selected route"]')).toBeNull();
  controller.dispose();
});

it('route-kartvy / handelsrutt-val-pa-stjarnkartan: opens the assigned route from a selected fleet', () => {
  const state = tradeNetworkState();
  const model = new AppModel(undefined, {
    load: () => ({
      lastPlayed: '2026-10-21T10:00:00Z',
      state: {
        ...state,
        fleets: state.fleets.map((fleet) =>
          fleet.id === 'freighters'
            ? { ...fleet, routeId: 'route-test' }
            : fleet,
        ),
      },
    }),
    save() {},
    clear() {},
  });
  model.startSlot(1);
  model.openRoute();
  model.selectMapFleet('freighters');
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const view = new AppView(root, () => ({ render() {}, dispose() {} }));
  const controller = new MasterController(model, view);
  controller.start();
  const button = root.querySelector<HTMLButtonElement>(
    '.selected-fleet-card[data-fleet-id="freighters"] [aria-label="Select route Tellus to Vesta"]',
  );
  expect(button).not.toBeNull();
  button!.click();
  expect(model.snapshot.mapTrade.routeId).toBe('route-test');
  controller.dispose();
});
