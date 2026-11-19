// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { needsAttention } from '../../../src/client/space-map/models/Decisions.js';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import { domeProductionState } from '../../fixtures/production-dome.js';

// produktionsbeslut-bara-for-skeppsfabrik: empty sites no longer raise the
// Production reminder, so only the guidance waits for the Dome research.
it('beslut-vantar-pa-paborjad-atgard: Production explains the wait for Dome research without a reminder', () => {
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
  ).toBeNull();
  click('Open research');
  click('Inspect Desert dome');
  click('Research Desert dome');
  click('Production');
  expect(root.textContent).toContain('Waiting for Desert dome research.');
  const expected = model.snapshot.decisions.filter(needsAttention).length;
  expect(root.querySelector('.decision-counter')?.textContent).toBe(
    `Decisions (${expected})`,
  );
  root.querySelector<HTMLButtonElement>('.end-turn')!.click();
  expect(root.querySelector('dialog')?.textContent ?? '').not.toContain(
    'Tellus: choose production',
  );
  controller.dispose();
});
