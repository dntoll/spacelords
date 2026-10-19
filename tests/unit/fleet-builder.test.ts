// @vitest-environment jsdom
import {
  renderFleetShips,
  SHIP_IMAGES,
} from '../../src/client/views/ShipView.js';
import { renderFleets } from '../../src/client/views/FleetView.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppView } from '../../src/client/views/AppView.js';

beforeEach(() => document.body.replaceChildren());
function pointer(type: string, x: number, y: number): Event {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    pointerType: { value: 'mouse' },
  });
  return event;
}
function setup() {
  const root = document.createElement('div');
  document.body.append(root);
  const model = new AppModel();
  const previews: string[] = [];
  const disposed: string[] = [];
  new AppController(
    model,
    new AppView(
      root,
      () => ({ render() {}, dispose() {} }),
      undefined,
      (_container, _cells, fleet) => {
        previews.push(fleet.position?.key ?? 'none');
        return {
          dispose() {
            disposed.push(fleet.position?.key ?? 'none');
          },
        };
      },
    ),
  ).start();
  const click = (label: string) => {
    const target = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.getAttribute('aria-label') === label,
    );
    expect(target, label).toBeDefined();
    target!.click();
  };
  click('Fleets');
  return { root, model, click, previews, disposed };
}

describe('flottadministration / skeppsbilder', () => {
  it('shows ship pictures in one fleet box and transfers a chosen ship into an empty fleet', () => {
    const { root, model, click } = setup();
    expect(root.querySelector('[role="table"]')).toBeNull();
    expect(root.querySelectorAll('.fleet-hangar')).toHaveLength(1);
    expect(root.querySelectorAll('.ship-token img')).toHaveLength(2);
    click('New fleet');
    expect(root.querySelectorAll('.fleet-hangar')).toHaveLength(2);
    click('Fighter 1 in Home Fleet');
    expect(model.snapshot.shipTransfer?.ship).toBe('Fighter');
    click('Move ship to Fleet 1');
    expect(model.snapshot.fleets[0]?.ships.Fighter).toBe(0);
    expect(model.snapshot.fleets[1]?.ships.Fighter).toBe(1);
    expect(model.snapshot.shipTransfer).toBeNull();
  });
  it('moves one ship through a pointer drag and cancels a drop outside fleet boxes', () => {
    const { root, model, click } = setup();
    click('New fleet');
    const token = root.querySelector<HTMLElement>(
      '[aria-label="Fighter 1 in Home Fleet"]',
    )!;
    token.setPointerCapture = vi.fn();
    token.hasPointerCapture = () => false;
    const page = root.querySelector<HTMLElement>('.fleet-page')!;
    const zone = root.querySelectorAll<HTMLElement>('.fleet-hangar')[1]!;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => zone,
    });
    token.dispatchEvent(pointer('pointerdown', 10, 10));
    page.dispatchEvent(pointer('pointermove', 100, 100));
    expect(root.querySelector('.ship-drag-ghost')).not.toBeNull();
    page.dispatchEvent(pointer('pointerup', 100, 100));
    expect(model.snapshot.fleets[1]?.ships.Fighter).toBe(1);
    expect(root.querySelector('.ship-drag-ghost')).toBeNull();
    const explorer = root.querySelector<HTMLElement>(
      '[aria-label="Exploration ship 1 in Home Fleet"]',
    )!;
    explorer.setPointerCapture = vi.fn();
    explorer.hasPointerCapture = () => false;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => null,
    });
    explorer.dispatchEvent(pointer('pointerdown', 10, 10));
    root
      .querySelector('.fleet-page')!
      .dispatchEvent(pointer('pointermove', 100, 100));
    root
      .querySelector('.fleet-page')!
      .dispatchEvent(pointer('pointerup', 100, 100));
    expect(model.snapshot.fleets[0]?.ships['Exploration ship']).toBe(1);
  });
  it('cancels a chosen ship without changing fleet composition', () => {
    const { root, model, click } = setup();
    click('Fighter 1 in Home Fleet');
    root
      .querySelector('.fleet-page')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    expect(model.snapshot.shipTransfer).toBeNull();
    expect(model.snapshot.fleets[0]?.ships.Fighter).toBe(1);
  });
});

describe('flottbyggar-minikarta', () => {
  it('mounts a map preview for the selected fleet and leaves the main camera intact', () => {
    const { root, model, click, previews, disposed } = setup();
    const camera = model.snapshot.camera;
    expect(
      root.querySelector('[aria-label="Fleet location: Home Fleet"]'),
    ).not.toBeNull();
    expect(previews.at(-1)).toBe('1,0');
    click('New fleet');
    expect(
      root.querySelector('[aria-label="Fleet location: Fleet 1"]'),
    ).not.toBeNull();
    expect(previews.at(-1)).toBe('none');
    expect(root.textContent).toContain('No position.');
    expect(model.snapshot.camera).toEqual(camera);
    expect(disposed).toHaveLength(1);
    click('Back to map');
    expect(disposed).toHaveLength(2);
  });
});

describe('skeppsbilder', () => {
  it('keeps large fleet previews bounded and preserves all three ship types', () => {
    const model = new AppModel();
    const fleet = {
      ...model.snapshot.fleets[0]!,
      ships: { Fighter: 1000000, 'Colony ship': 1, 'Exploration ship': 1 },
    };
    const view = renderFleetShips(fleet);
    expect(view.querySelectorAll('img').length).toBeLessThan(20);
    expect(view.textContent).toContain('+999988 Fighter');
    expect(new Set(Object.values(SHIP_IMAGES)).size).toBe(3);
    for (const ship of Object.keys(SHIP_IMAGES))
      expect(view.querySelector(`img[alt="${ship}"]`)).not.toBeNull();
  });
});

describe('flottadministration', () => {
  it('does not accept transfers to fleets at another hex or while orders are locked', () => {
    const model = new AppModel();
    model.createFleet('fleet-home');
    model.openFleets();
    model.chooseShipTransfer('fleet-home', 'Fighter');
    const snapshot = model.snapshot;
    const fleets = snapshot.fleets.map((fleet, index) =>
      index === 1 ? { ...fleet, position: new HexCoordinate(2, 0) } : fleet,
    );
    const intents: unknown[] = [];
    const view = renderFleets({ ...snapshot, fleets }, (intent) =>
      intents.push(intent),
    );
    const target = view.querySelector<HTMLButtonElement>(
      '[aria-label="Move ship to Fleet 1"]',
    )!;
    expect(target.disabled).toBe(true);
    const token = view.querySelector<HTMLElement>(
      '[aria-label="Fighter 1 in Home Fleet"]',
    )!;
    token.setPointerCapture = vi.fn();
    token.hasPointerCapture = () => false;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => view.querySelectorAll('.fleet-hangar')[1]!,
    });
    token.dispatchEvent(pointer('pointerdown', 10, 10));
    view.dispatchEvent(pointer('pointermove', 100, 100));
    view.dispatchEvent(pointer('pointerup', 100, 100));
    expect(intents).toHaveLength(0);
    const locked = renderFleets({ ...snapshot, phase: 'simulating' }, () => {});
    expect(
      [...locked.querySelectorAll<HTMLButtonElement>('.ship-token')].every(
        (token) => token.disabled && !token.draggable,
      ),
    ).toBe(true);
  });
});
