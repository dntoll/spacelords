// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppView } from '../../src/client/views/AppView.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import type {
  SaveRepository,
  SavedGame,
} from '../../src/client/models/SaveRepository.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';
import { discoveryState } from '../fixtures/exploration.js';

it('upptacktsavbrott / order-under-upptacktsavbrott / spara-avbrutet-ar: controller saves before showing discovery and restores edited orders without repeating movement', async () => {
  let saved: SavedGame = {
    lastPlayed: '2026-10-25T00:00:00Z',
    state: discoveryState(),
  };
  const repository: SaveRepository = {
    load: () => saved,
    save: (_id, next) => {
      saved = JSON.parse(JSON.stringify(next)) as SavedGame;
    },
    clear() {},
  };
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  function setup() {
    const model = new AppModel(undefined, repository);
    model.startSlot(1);
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    let emit: IntentHandler = () => {};
    const controller = new AppController(model, {
      bind: (handler) => {
        emit = handler;
        view.bind(handler);
      },
      render: (snapshot) => view.render(snapshot),
      dispose: () => view.dispose(),
    });
    controller.start();
    return { model, controller, emit };
  }
  const first = setup();
  first.emit({ type: 'confirm-end-turn' });
  await vi.waitFor(() =>
    expect(root.querySelector('.discovery-dialog[open]')).not.toBeNull(),
  );
  expect(saved.state.phase).toBe('interrupted');
  expect(
    saved.state.events.some((event) => event.text.startsWith('Combat at')),
  ).toBe(false);
  first.emit({ type: 'handle-discoveries' });
  expect(first.model.snapshot.mapFleetId).toBe('fleet-home');
  expect(
    first.model.snapshot.fleets.find((fleet) => fleet.id === 'other')!
      .canIssueOrders,
  ).toBe(false);
  first.emit({ type: 'allow-other-fleet-orders' });
  first.emit({ type: 'open-fleet', id: 'other' });
  first.emit({ type: 'begin-destination', id: 'other' });
  first.emit({ type: 'select', position: new HexCoordinate(2, 0) });
  expect(
    saved.state.fleets.find((fleet) => fleet.id === 'other')!.destination,
  ).toEqual({ q: 2, r: 0 });
  first.controller.dispose();
  const restored = setup();
  expect(root.querySelector('.discovery-controls')).not.toBeNull();
  expect(root.querySelector('.discovery-dialog')).toBeNull();
  expect(restored.model.snapshot.interruption!.handling).toBe(true);
  expect(
    restored.model.snapshot.fleets.find((fleet) => fleet.id === 'fleet-home')!
      .remainingMovement,
  ).toBe(2);
  restored.emit({ type: 'continue-turn' });
  await vi.waitFor(() =>
    expect(restored.model.snapshot.interruption?.battles?.length).toBe(1),
  );
  expect(root.querySelector('.discovery-dialog')?.textContent).toContain(
    'Battle report',
  );
  restored.emit({ type: 'continue-turn' });
  await vi.waitFor(() =>
    expect(restored.model.snapshot.phase).toBe('planning'),
  );
  expect(saved.state.round).toBe(2);
  expect(
    saved.state.fleets.find((fleet) => fleet.id === 'other')!.position,
  ).toEqual({ q: 2, r: 0 });
  expect(
    saved.state.events.filter((event) => event.text.startsWith('Combat at')),
  ).toHaveLength(1);
  restored.controller.dispose();
});

it('flottorder-som-symboler / kompakta-flottkort: exposes explorer controls and actual fleet speed without position or engine rows', () => {
  const model = new AppModel();
  model.selectMapFleet('fleet-home');
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const view = new AppView(root, () => ({ render() {}, dispose() {} }));
  const controller = new AppController(model, view);
  controller.start();
  const card = () => root.querySelector('.fleet-card')!;
  expect(
    card().querySelector(
      '.fleet-current-position, .ship-engine-details, .fleet-orders',
    ),
  ).toBeNull();
  expect(card().querySelector('.fleet-speed')!.textContent).toBe('S: 3 hex');
  card()
    .querySelector<HTMLButtonElement>('[aria-label="Explore stars"]')!
    .click();
  expect(model.snapshot.fleets[0]!.exploration).toBe('explore-stars');
  expect(
    card()
      .querySelector('[aria-label="Explore stars"]')!
      .getAttribute('aria-pressed'),
  ).toBe('true');
  controller.dispose();
});
