// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import type { IntentHandler } from '../../../src/client/app/views/ViewContracts.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';

beforeEach(() => document.body.replaceChildren());
function setup() {
  const state = tradeNetworkState();
  const model = new AppModel(undefined, {
    load: () => ({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    save() {},
    clear() {},
  });
  model.startSlot(1);
  const root = document.createElement('div');
  document.body.append(root);
  const view = new AppView(root, () => ({ render() {}, dispose() {} }));
  let emit: IntentHandler = () => {};
  new MasterController(model, {
    bind(handler) {
      emit = handler;
      view.bind(handler);
    },
    render(snapshot) {
      view.render(snapshot);
    },
    dispose() {
      view.dispose();
    },
  }).start();
  return { model, root, emit };
}

describe('fleet-som-skeppsoversikt', () => {
  it('shows ships without a map and retains the star map camera', () => {
    const { model, root, emit } = setup();
    emit({ type: 'pan', delta: { x: 83, y: -42 } });
    emit({ type: 'zoom', factor: 1.6, anchor: { x: 23, y: -9 } });
    const camera = model.snapshot.camera;
    emit({ type: 'open-fleets' });
    expect(root.querySelector('.map-container')).toBeNull();
    expect(root.querySelector('h1')?.textContent).toBe('Fleet');
    expect(root.querySelectorAll('.fleet-ship')).toHaveLength(
      model.snapshot.fleet.shipUnits!.length,
    );
    emit({ type: 'open-map' });
    expect(model.snapshot.camera).toEqual(camera);
  });
  it('fleet-motorer-och-last: moves an engine using accessible slot controls', () => {
    const { model, root, emit } = setup();
    // Start a fresh game with its two test engines.
    model.startSlot(2);
    emit({ type: 'open-fleets' });
    const source = root.querySelector<HTMLButtonElement>(
      '[aria-label="Transport ship Cargo 1: Ion pulse engine"]',
    )!;
    const target = root.querySelector<HTMLButtonElement>(
      '[aria-label="Raptor Engine: Rocket engine"]',
    )!;
    expect(source).not.toBeNull();
    expect(target).not.toBeNull();
    source.click();
    target.click();
    const raptor = model.snapshot.fleet.shipUnits!.find(
      (ship) => ship.type === 'Raptor',
    )!;
    expect(raptor.engines['Ion pulse engine']).toBe(1);
  });
});
