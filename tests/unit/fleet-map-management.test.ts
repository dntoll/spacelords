// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppView } from '../../src/client/views/AppView.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { BrowserSaveRepository } from '../../src/client/storage/BrowserSaveRepository.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../src/client/models/HexCoordinate.js';

beforeEach(() => document.body.replaceChildren());

function setup(model = new AppModel()) {
  const root = document.createElement('div');
  document.body.append(root);
  const view = new AppView(root, () => ({ render() {}, dispose() {} }));
  const controller = new AppController(model, view);
  controller.start();
  const click = (label: string) => {
    const target = root.querySelector<HTMLButtonElement>(
      `[aria-label="${label}"]`,
    );
    expect(target, label).not.toBeNull();
    target!.click();
  };
  return { model, root, view, click };
}

describe('flottadministration / flottval-pa-kartan', () => {
  it('planetoppning-i-kartrubrik: places Open planet beside the displayed planet name and coordinates without Create route', () => {
    const { model, root, view, click } = setup();
    model.select(new HexCoordinate(0, 1));
    model.selectMapFleet('fleet-home');
    view.render(model.snapshot);
    const heading = root.querySelector(
      '.map-fleet-management .map-location-heading',
    )!;
    expect(heading).not.toBeNull();
    expect(heading.textContent).toContain('Tellus');
    expect(heading.querySelector('.coordinate-label')?.textContent).toContain(
      '1,0',
    );
    expect(heading.querySelector('[aria-label="Open planet"]')).not.toBeNull();
    expect(root.querySelector('[aria-label="Create route"]')).toBeNull();
    click('Open planet');
    expect(model.snapshot.screen).toBe('planet');
    expect(model.snapshot.planet?.name).toBe('Tellus');
  });
  it('shows ships directly without an expansion control or help disclosure', () => {
    const { root } = setup();
    const panel = root.querySelector('.map-fleet-management')!;
    expect(panel.querySelectorAll('.ship-token')).toHaveLength(2);
    expect(panel.querySelector('.fleet-panel-sizing')).toBeNull();
    expect(panel.querySelector('.fleet-panel-help')).toBeNull();
    expect(panel.textContent).not.toContain('Expand fleet panel');
    expect(panel.textContent).not.toContain('Help');
  });
  it('shows only fleets at the panel location and preserves hex selection on fleet selection', () => {
    const { model, root, view } = setup();
    model.transferShips('fleet-home', 'Fighter', 1, null);
    const other = model.snapshot.fleets[1]!;
    model.select(new HexCoordinate(0, 1));
    view.render(model.snapshot);
    expect(root.querySelectorAll('.map-fleet-cards .fleet-card')).toHaveLength(
      0,
    );
    model.selectMapFleet(other.id);
    view.render(model.snapshot);
    expect(model.snapshot.selected?.position.key).toBe('0,1');
    expect(root.querySelectorAll('.map-fleet-cards .fleet-card')).toHaveLength(
      2,
    );
    expect(root.querySelector('.fleet-place')?.textContent).toContain('Tellus');
    expect(root.querySelector('.fleet-place')?.textContent).toContain('1,0');
    expect(
      root.querySelector('.selected-fleet-card')?.getAttribute('data-fleet-id'),
    ).toBe(other.id);
  });

  it('creates a fleet atomically from a chosen ship and can move it back on the map', () => {
    const { model, root, click } = setup();
    click('Fighter 1 in Home Fleet');
    click('Move ship to new fleet');
    expect(model.snapshot.screen).toBe('map');
    const created = model.snapshot.fleets[1]!;
    expect(created.ships.Fighter).toBe(1);
    expect(created.position?.key).toBe('1,0');
    expect(model.snapshot.shipTransfer).toBeNull();
    expect(
      root.querySelector<HTMLInputElement>('[aria-label="Fleet name"]')?.value,
    ).toBe(created.name);
    const input = root.querySelector<HTMLInputElement>(
      '[aria-label="Fleet name"]',
    )!;
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    click(`Fighter 1 in ${created.name}`);
    click('Move ship to Home Fleet');
    expect(model.snapshot.fleets[0]!.ships.Fighter).toBe(1);
    expect(model.snapshot.fleets[1]!.position).toBeNull();
    expect(root.querySelectorAll('.map-fleet-cards .fleet-card')).toHaveLength(
      1,
    );
  });

  it('keeps invalid and cancelled drops from creating empty fleets', () => {
    const { model, root, click } = setup();
    const token = root.querySelector<HTMLElement>(
      '[aria-label="Fighter 1 in Home Fleet"]',
    )!;
    expect(token).not.toBeNull();
    token.setPointerCapture = vi.fn();
    token.hasPointerCapture = () => false;
    const panel = root.querySelector<HTMLElement>('.map-fleet-management')!;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => root.querySelector('[data-new-fleet]'),
    });
    const pointer = (type: string, x: number) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        clientX: x,
        clientY: 10,
      });
      Object.defineProperties(event, {
        pointerId: { value: 1 },
        pointerType: { value: 'mouse' },
      });
      return event;
    };
    token.dispatchEvent(pointer('pointerdown', 10));
    panel.dispatchEvent(pointer('pointermove', 70));
    panel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    panel.dispatchEvent(pointer('pointerup', 70));
    expect(model.snapshot.fleets).toHaveLength(1);
    click('Fighter 1 in Home Fleet');
    click('Cancel ship transfer');
    expect(model.snapshot.shipTransfer).toBeNull();
    expect(model.snapshot.fleets).toHaveLength(1);
  });
});

describe('flottnamn-direktredigering', () => {
  it('supports double click, preserves draft and caret on rerender, and saves with Enter', () => {
    const { model, root, view } = setup();
    root
      .querySelector('.fleet-name-button')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    let input = root.querySelector<HTMLInputElement>(
      '[aria-label="Fleet name"]',
    )!;
    expect(input).not.toBeNull();
    input.value = 'Northern Fleet';
    input.setSelectionRange(5, 5);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    view.render(model.snapshot);
    input = root.querySelector<HTMLInputElement>('[aria-label="Fleet name"]')!;
    expect(input.value).toBe('Northern Fleet');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(5);
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(model.snapshot.fleets[0]!.name).toBe('Northern Fleet');
    expect(root.querySelector('[aria-label="Fleet name"]')).toBeNull();
  });

  it('cancels with Escape or blur and leaves invalid names editable', () => {
    const { model, root, click } = setup();
    click('Rename Home Fleet');
    let input = root.querySelector<HTMLInputElement>(
      '[aria-label="Fleet name"]',
    )!;
    input.value = '   ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input = root.querySelector<HTMLInputElement>('[aria-label="Fleet name"]')!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(model.snapshot.notice).toContain('1–40');
    expect(root.querySelector('[aria-label="Fleet name"]')).not.toBeNull();
    root
      .querySelector('input')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    expect(model.snapshot.fleets[0]!.name).toBe('Home Fleet');
    click('Rename Home Fleet');
    root.querySelector<HTMLInputElement>('[aria-label="Fleet name"]')!.blur();
    expect(root.querySelector('[aria-label="Fleet name"]')).toBeNull();
    warn.mockRestore();
  });
});

describe('flottknappar-pa-kartan / flottadministration', () => {
  it('provides destination selection without drag and removes the old map buttons', () => {
    const { model, root, click } = setup();
    expect(root.querySelector('[aria-label="Set destination"]')).toBeNull();
    expect(root.querySelector('[aria-label="Edit fleet"]')).toBeNull();
    click('Choose destination for Home Fleet');
    const select = root.querySelector<HTMLSelectElement>(
      '[aria-label="Destination hex"]',
    )!;
    select.value = '0,1';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(model.snapshot.fleets[0]!.destination?.key).toBe('0,1');
    click('Clear destination');
    expect(model.snapshot.fleets[0]!.destination).toBeNull();
  });

  it('locates a fleet from the overview, preserving zoom and exposing no fake empty position', () => {
    const { model, root, view, click } = setup();
    model.zoom(1.5, { x: 0, y: 0 });
    model.setDestination('fleet-home', 0, 1);
    model.pan({ x: 80, y: 25 });
    model.openFleets();
    model.createFleet();
    view.render(model.snapshot);
    expect(root.textContent).toContain('Destination: HEX 0,1');
    const empty = root.querySelectorAll('.fleet-card')[1]!;
    expect(empty.textContent).toContain('No position');
    expect(empty.querySelector('[aria-label^="Show on map"]')).toBeNull();
    click('Show on map: Home Fleet');
    expect(model.snapshot.screen).toBe('map');
    expect(model.snapshot.mapFleetId).toBe('fleet-home');
    expect(model.snapshot.camera.center).toEqual(
      HexGeometry.toPoint(model.snapshot.fleets[0]!.position!),
    );
    expect(model.snapshot.camera.zoom).toBe(1.5);
  });
});

describe('flottadministration / skepp-till-rorlig-flotta / forstarka-ruttflotta', () => {
  function network() {
    const state = tradeNetworkState();
    const model = new AppModel(undefined, {
      load: () => ({ lastPlayed: '2026-10-21T10:00:00Z', state }),
      save() {},
      clear() {},
    });
    model.startSlot(1);
    return setup(model);
  }

  it('sends a chosen map ship to a distant fleet as a real reinforcement', () => {
    const { model, root, click } = network();
    click('Fighter 1 in Home Fleet');
    const receiving = root.querySelector<HTMLSelectElement>(
      '[aria-label="Receiving fleet"]',
    )!;
    expect(receiving.textContent).toContain('Travellers · HEX 0,0 · En route');
    receiving.value = 'travellers';
    receiving.dispatchEvent(new Event('change', { bubbles: true }));
    const reinforcement = model.snapshot.fleets.find(
      (fleet) => fleet.joinFleetId === 'travellers',
    )!;
    expect(reinforcement.position?.key).toBe('1,0');
    expect(reinforcement.ships.Fighter).toBe(1);
    expect(
      model.snapshot.fleets.find((fleet) => fleet.id === 'travellers')!.ships
        .Fighter,
    ).toBe(0);
    expect(root.textContent).toContain('En route to Travellers');
  });

  it('reinforces a route fleet without unlocking its ships or changing its assignment', () => {
    const { model, root, view, click } = network();
    model.assignTradeFleet('route-test', 'freighters');
    model.selectMapFleet('fleet-home');
    view.render(model.snapshot);
    expect(
      root.querySelector<HTMLButtonElement>(
        '[aria-label="Transport ship 1 in Freighters"]',
      )!.disabled,
    ).toBe(true);
    click('Fighter 1 in Home Fleet');
    click('Move ship to Freighters');
    const fleet = model.snapshot.fleets.find(
      (fleet) => fleet.id === 'freighters',
    )!;
    expect(fleet.ships.Fighter).toBe(2);
    expect(fleet.routeId).toBe('route-test');
    click('Exploration ship 1 in Home Fleet');
    model.selectMapRoute('route-test');
    view.render(model.snapshot);
    expect(model.snapshot.shipTransfer).toBeNull();
    expect(root.querySelector('.map-fleet-management')).toBeNull();
  });
});

describe('flottadministration / flottnamn-direktredigering / sparat-spel', () => {
  it('restores the new fleet and its name without persisting an unfinished edit', () => {
    const storage = new Map<string, string>();
    const repository = new BrowserSaveRepository({
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value);
      },
      removeItem: (key) => {
        storage.delete(key);
      },
    });
    const model = new AppModel(undefined, repository);
    model.startSlot(1);
    const { root, click } = setup(model);
    click('Fighter 1 in Home Fleet');
    click('Move ship to new fleet');
    let input = root.querySelector<HTMLInputElement>(
      '[aria-label="Fleet name"]',
    )!;
    input.value = 'Vanguard';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input = root.querySelector<HTMLInputElement>('[aria-label="Fleet name"]')!;
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    click('Rename Vanguard');
    input = root.querySelector<HTMLInputElement>('[aria-label="Fleet name"]')!;
    input.value = 'Unsaved name';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const restored = new AppModel(undefined, repository);
    restored.startSlot(1);
    expect(restored.snapshot.fleets[1]!.name).toBe('Vanguard');
    expect(restored.snapshot.fleets[1]!.ships.Fighter).toBe(1);
    expect(restored.snapshot.fleetNameEdit).toBeNull();
  });
});
