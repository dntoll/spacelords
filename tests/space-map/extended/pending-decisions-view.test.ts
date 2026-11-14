// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { needsAttention } from '../../../src/client/space-map/models/Decisions.js';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import { domeProductionState } from '../../fixtures/production-dome.js';

it('beslut-vantar-pa-paborjad-atgard: updates guidance, counter, map problems and turn warning after queuing and cancelling research', () => {
  const state = domeProductionState(false);
  state.colonies[1]![1].buildings.push({
    id: 'research',
    type: 'Research station',
    slotIndex: 1,
    demolition: false,
  });
  const model = new AppModel(undefined, {
    load: () => ({ lastPlayed: '2026-10-25T00:00:00Z', state }),
    save() {},
    clear() {},
  });
  model.startSlot(1);
  model.openProduction('sol-0');
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const controller = new MasterController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  const click = (label: string) =>
    root
      .querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!
      .click();
  expect(
    root.querySelector('[data-screen="production"] .nav-attention'),
  ).not.toBeNull();
  click('Open research');
  click('Inspect Desert dome');
  click('Research Desert dome');
  click('Production');
  expect(root.textContent).toContain('Waiting for Desert dome research.');
  expect(root.querySelector('.decision-guidance')).toBeNull();
  expect(
    root.querySelector('[data-screen="production"] .nav-attention'),
  ).toBeNull();
  expect(
    model.snapshot.mapProblems.some(
      (problem) => problem.decisionId === 'building-empty-sol-0',
    ),
  ).toBe(false);
  const expected = model.snapshot.decisions.filter(needsAttention).length;
  expect(root.querySelector('.decision-counter')?.textContent).toBe(
    `Decisions (${expected})`,
  );
  model.openDecisions();
  controller.start();
  expect(
    root.querySelector('[data-decision-id="building-empty-sol-0"]'),
  ).toBeNull();
  root.querySelector<HTMLButtonElement>('.end-turn')!.click();
  expect(root.querySelector('dialog')?.textContent).not.toContain(
    'Tellus: choose production',
  );
  [...root.querySelectorAll('button')]
    .find((button) => button.textContent === 'Cancel')!
    .click();
  click('Research');
  click('Remove Desert dome');
  click('Remove research');
  expect(model.snapshot.research.queue).not.toContain('Desert dome');
  expect(model.snapshot.attentionScreens).toContain('production');
  expect(
    root.querySelector('[data-screen="production"] .nav-attention'),
  ).not.toBeNull();
  controller.dispose();
});

it('transportbygge-i-forsorjningssteg: shows the queued ship and its planet in the production queue', () => {
  const state = tradeNetworkState();
  state.colonies[0]![1].buildings.push({
    id: 'transport-factory',
    type: 'Transport ship factory',
    slotIndex: 2,
    demolition: false,
  });
  const game = Game.restore({
    ...state,
    fleets: state.fleets.filter((fleet) => fleet.id === 'fleet-home'),
  });
  game.scheduleShip(game.galaxy.homePlanet, 'Transport ship');
  const saved = game.exportState();
  const model = new AppModel(undefined, {
    load: () => ({ lastPlayed: '2026-10-25T00:00:00Z', state: saved }),
    save() {},
    clear() {},
  });
  model.startSlot(1);
  model.openProduction('sol-1');
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const controller = new MasterController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  expect(root.textContent).toContain('Waiting for Iron transport');
  expect(root.textContent).toContain('Transport ship queued at Tellus');
  controller.dispose();
});
