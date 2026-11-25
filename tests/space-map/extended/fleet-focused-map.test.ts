// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import { renderFleetEquipment } from '../../../src/client/space-map/views/fleets/FleetShipsView.js';
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
      '[aria-label="Raptor Cargo 1: Empty"]',
    )!;
    expect(source).not.toBeNull();
    expect(target).not.toBeNull();
    source.click();
    target.click();
    const raptor = model.snapshot.fleet.shipUnits!.find(
      (ship) => ship.type === 'Raptor',
    )!;
    expect(raptor.cargoSlots![0]).toBe('Ion pulse engine');
  });
});

describe('fleet-platsinformation', () => {
  it('labels slots and shows the selected engine image and its actual bonuses', () => {
    const { model, root, emit } = setup();
    model.startSlot(2);
    emit({ type: 'open-fleets' });
    const source = root.querySelector<HTMLButtonElement>(
      '[aria-label="Transport ship Cargo 1: Ion pulse engine"]',
    )!;
    expect(
      source.closest('.fleet-storage')?.querySelector('.fleet-storage-title')
        ?.textContent,
    ).toBe('Storage');
    source.click();
    const panel = root.querySelector<HTMLElement>('.fleet-item-details')!;
    expect(panel.hidden).toBe(false);
    expect(panel.textContent).toContain('Ion pulse engine');
    expect(panel.textContent).toContain('Star map speed bonus: +1');
    expect(panel.textContent).toContain('Battle speed bonus: +1');
    expect(panel.querySelector('img')?.getAttribute('src')).toContain(
      'ion-pulse-engine',
    );
    source.click();
    const engine = root.querySelector<HTMLButtonElement>(
      '[aria-label="Raptor Engine: Rocket engine"]',
    )!;
    expect(
      engine.closest('.fleet-slot')?.querySelector('.fleet-slot-label')
        ?.textContent,
    ).toBe('Engine');
    engine.click();
    expect(panel.textContent).toContain('Rocket engine');
    expect(panel.textContent).toContain('Star map speed bonus: +0');
    expect(panel.querySelector('img')?.getAttribute('src')).toContain(
      'rocket-engine',
    );
    engine.click();
    const empty = root.querySelector<HTMLButtonElement>(
      '[aria-label="Raptor Cargo 1: Empty"]',
    )!;
    empty.click();
    expect(panel.textContent).toContain('Empty storage slot');
    expect(panel.querySelector('img')).toBeNull();
    empty.click();
    source.click();
    root
      .querySelector<HTMLButtonElement>('[aria-label="Raptor Cargo 1: Empty"]')!
      .click();
    expect(
      model.snapshot.fleet.shipUnits!.find((ship) => ship.type === 'Raptor')!
        .cargoSlots![0],
    ).toBe('Ion pulse engine');
  });
});

describe('fleet-vapenplatser', () => {
  it('shows weapons and moves them between ships and storage', () => {
    const { model, root, emit } = setup();
    model.startSlot(2);
    emit({ type: 'open-fleets' });
    const fighter = root.querySelector<HTMLButtonElement>(
      '[aria-label="Fighter Weapon 1: Cannon"]',
    )!;
    fighter.click();
    expect(root.querySelector('.fleet-item-details')?.textContent).toContain(
      'Range: 1–3',
    );
    root
      .querySelector<HTMLButtonElement>(
        '[aria-label="Transport ship Cargo 3: Empty"]',
      )!
      .click();
    expect(
      model.snapshot.fleet.shipUnits!.find((ship) => ship.type === 'Fighter')!
        .weaponSlots![0],
    ).toBeNull();
    expect(
      model.snapshot.fleet.shipUnits!.find(
        (ship) => ship.type === 'Transport ship',
      )!.cargoSlots![2],
    ).toEqual({ type: 'Cannon' });
    root
      .querySelector<HTMLButtonElement>(
        '[aria-label="Transport ship Cargo 3: Cannon"]',
      )!
      .click();
    root
      .querySelector<HTMLButtonElement>(
        '[aria-label="Fighter Weapon 2: Empty"]',
      )!
      .click();
    expect(
      model.snapshot.fleet.shipUnits!.find((ship) => ship.type === 'Fighter')!
        .weaponSlots![1],
    ).toEqual({ type: 'Cannon' });
  });
});

describe('fleet-direktmarkering', () => {
  it('selects another occupied slot without moving either item and clears on background click', () => {
    const { model, root, emit } = setup();
    model.startSlot(2);
    emit({ type: 'open-fleets' });
    const source = root.querySelector<HTMLButtonElement>(
      '[aria-label="Transport ship Cargo 1: Ion pulse engine"]',
    )!;
    const target = root.querySelector<HTMLButtonElement>(
      '[aria-label="Raptor Engine: Rocket engine"]',
    )!;
    source.click();
    target.click();
    expect(source.getAttribute('aria-pressed')).toBe('false');
    expect(target.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('.fleet-item-details')?.textContent).toContain(
      'Rocket engine',
    );
    expect(
      model.snapshot.fleet.shipUnits!.find((ship) => ship.type === 'Raptor')!
        .engines['Rocket engine'],
    ).toBe(1);
    root.querySelector<HTMLElement>('.fleet-ship-image')!.click();
    expect(target.getAttribute('aria-pressed')).toBe('false');
    expect(root.querySelector<HTMLElement>('.fleet-item-details')!.hidden).toBe(
      true,
    );
    target.click();
    root.querySelector<HTMLElement>('main')!.click();
    expect(target.getAttribute('aria-pressed')).toBe('false');
    expect(root.querySelector<HTMLElement>('.fleet-item-details')!.hidden).toBe(
      true,
    );
  });
});

describe('fleet-vapenbilder', () => {
  it('uses each weapon illustration in the slot and its details', () => {
    const model = new AppModel();
    const fleet = model.snapshot.fleet;
    const fighter = fleet.shipUnits!.find((ship) => ship.type === 'Fighter')!;
    const raptor = fleet.shipUnits!.find((ship) => ship.type === 'Raptor')!;
    const view = renderFleetEquipment(
      {
        ...fleet,
        shipUnits: [
          {
            ...fighter,
            weaponSlots: [{ type: 'Cannon' }, { type: 'Missiles', salvos: 2 }],
          },
          raptor,
          {
            ...raptor,
            id: 'captured-pirate',
            type: 'Space pirate',
            weaponSlots: [{ type: 'Raider cannon' }],
            cargoSlots: [],
          },
        ],
      },
      () => undefined,
    );
    for (const [label, asset] of [
      ['Fighter Weapon 1: Cannon', 'cannon-illustration'],
      ['Fighter Weapon 2: Missiles', 'missiles-illustration'],
      ['Raptor Weapon 1: Light cannon', 'light-cannon-illustration'],
      ['Space pirate Weapon 1: Raider cannon', 'raider-cannon-illustration'],
    ]) {
      const slot = view.querySelector<HTMLButtonElement>(
        `[aria-label="${label}"]`,
      )!;
      expect(slot.querySelector('img')?.getAttribute('src')).toContain(asset);
      slot.click();
      expect(
        view.querySelector('.fleet-item-details img')?.getAttribute('src'),
      ).toContain(asset);
    }
  });
});
