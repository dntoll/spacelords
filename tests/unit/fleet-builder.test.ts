// @vitest-environment jsdom
import {
  renderFleetShips,
  SHIP_IMAGES,
} from '../../src/client/views/ShipView.js';
import { SHIP_SPRITES } from '../../src/client/views/ShipImages.js';
import { renderMapFleetPanel } from '../../src/client/views/FleetMapPanel.js';
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
  new AppController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  ).start();
  const click = (label: string) => {
    const target = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.getAttribute('aria-label') === label,
    );
    expect(target, label).toBeDefined();
    target!.click();
  };
  model.selectMapFleet('fleet-home');
  click('Fleets');
  return { root, model, click };
}

describe('flottadministration / skeppsbilder', () => {
  it('shows ship pictures and forms a fleet from the first transferred ship', () => {
    const { root, model, click } = setup();
    expect(root.querySelector('[role="table"]')).toBeNull();
    expect(root.querySelectorAll('.ship-token img')).toHaveLength(2);
    click('Fighter 1 in Home Fleet');
    click('Move ship to new fleet');
    expect(model.snapshot.fleets[0]?.ships.Fighter).toBe(0);
    expect(model.snapshot.fleets[1]?.ships.Fighter).toBe(1);
    expect(model.snapshot.shipTransfer).toBeNull();
    expect(model.snapshot.screen).toBe('fleets');
  });
  it('moves one ship through a pointer drag and cancels a drop outside fleet boxes', () => {
    const { root, model, click } = setup();
    click('Fighter 1 in Home Fleet');
    click('Move ship to new fleet');
    root
      .querySelector<HTMLInputElement>('[aria-label="Fleet name"]')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    const token = root.querySelector<HTMLElement>(
      '[aria-label="Exploration ship 1 in Home Fleet"]',
    )!;
    token.setPointerCapture = vi.fn();
    token.hasPointerCapture = () => false;
    const page = root.querySelector<HTMLElement>('.map-fleet-management')!;
    const zone = root.querySelectorAll<HTMLElement>('.fleet-hangar')[1]!;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => zone,
    });
    token.dispatchEvent(pointer('pointerdown', 10, 10));
    page.dispatchEvent(pointer('pointermove', 100, 100));
    expect(root.querySelector('.ship-drag-ghost')).not.toBeNull();
    page.dispatchEvent(pointer('pointerup', 100, 100));
    expect(model.snapshot.fleets[1]?.ships['Exploration ship']).toBe(1);
    expect(root.querySelector('.ship-drag-ghost')).toBeNull();
    const explorer = root.querySelector<HTMLElement>(
      '[aria-label="Fighter 1 in Fleet 1"]',
    )!;
    explorer.setPointerCapture = vi.fn();
    explorer.hasPointerCapture = () => false;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => null,
    });
    explorer.dispatchEvent(pointer('pointerdown', 10, 10));
    root
      .querySelector('.map-fleet-management')!
      .dispatchEvent(pointer('pointermove', 100, 100));
    root
      .querySelector('.map-fleet-management')!
      .dispatchEvent(pointer('pointerup', 100, 100));
    expect(model.snapshot.fleets[1]?.ships.Fighter).toBe(1);
  });
  it('cancels a chosen ship without changing fleet composition', () => {
    const { root, model, click } = setup();
    click('Fighter 1 in Home Fleet');
    root
      .querySelector('.map-fleet-management')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    expect(model.snapshot.shipTransfer).toBeNull();
    expect(model.snapshot.fleets[0]?.ships.Fighter).toBe(1);
  });
});

describe('skeppsbilder', () => {
  it('keeps large fleet previews bounded and preserves all ship types', () => {
    const model = new AppModel();
    const fleet = {
      ...model.snapshot.fleets[0]!,
      ships: {
        Fighter: 1000000,
        'Colony ship': 1,
        'Exploration ship': 1,
        'Transport ship': 1,
        'Salvage ship': 1,
      },
    };
    const view = renderFleetShips(fleet);
    expect(view.querySelectorAll('img').length).toBeLessThan(20);
    expect(view.textContent).toContain('+999988 Fighter');
    expect(new Set(Object.values(SHIP_IMAGES)).size).toBe(5);
    for (const ship of Object.keys(SHIP_IMAGES))
      expect(view.querySelector(`img[alt="${ship}"]`)).not.toBeNull();
  });
});

describe('flottadministration / skepp-till-rorlig-flotta', () => {
  it('accepts distant receivers but locks transfers during simulation', () => {
    const model = new AppModel();
    model.createFleet();
    model.chooseShipTransfer('fleet-home', 'Fighter');
    const snapshot = model.snapshot;
    const fleets = snapshot.fleets.map((fleet, index) =>
      index === 1 ? { ...fleet, position: new HexCoordinate(2, 0) } : fleet,
    );
    const intents: unknown[] = [];
    const view = renderMapFleetPanel(
      { ...snapshot, fleets },
      (intent) => intents.push(intent),
      snapshot.fleets[0]!.position!,
    );
    const select = view.querySelector<HTMLSelectElement>(
      '[aria-label="Receiving fleet"]',
    )!;
    expect(select.textContent).toContain('Fleet 1 · HEX 2,0 · En route');
    select.value = fleets[1]!.id;
    select.dispatchEvent(new Event('change'));
    expect(intents).toContainEqual({
      type: 'transfer-chosen-ship',
      target: fleets[1]!.id,
    });
    const locked = renderMapFleetPanel(
      { ...snapshot, phase: 'simulating' },
      () => {},
      snapshot.fleets[0]!.position!,
    );
    expect(
      [...locked.querySelectorAll<HTMLButtonElement>('.ship-token')].every(
        (token) => token.disabled && !token.draggable,
      ),
    ).toBe(true);
  });
});

describe('skepp-till-rorlig-flotta', () => {
  it('shows the target name and lets a reinforcement cancel its order', () => {
    const model = new AppModel();
    const snapshot = model.snapshot;
    const fleet = {
      ...snapshot.fleets[0]!,
      id: 'reinforcement',
      joinFleetId: 'fleet-home',
    };
    const intents: unknown[] = [];
    const view = renderMapFleetPanel(
      { ...snapshot, fleets: [...snapshot.fleets, fleet] },
      (intent) => intents.push(intent),
      snapshot.fleets[0]!.position!,
    );
    expect(
      view
        .querySelector('[data-fleet-id="reinforcement"]')!
        .getAttribute('aria-description'),
    ).toContain('En route to Home Fleet');
    view
      .querySelector<HTMLButtonElement>('[aria-label="Cancel reinforcement"]')!
      .click();
    expect(intents).toContainEqual({
      type: 'clear-destination',
      id: 'reinforcement',
    });
  });
});

describe('forstarka-ruttflotta / flottans-handelsrutt', () => {
  function routeView() {
    const model = new AppModel();
    model.createFleet('fleet-home');
    model.chooseShipTransfer('fleet-home', 'Fighter');
    const snapshot = model.snapshot;
    const fleets = snapshot.fleets.map((fleet, index) =>
      index === 1
        ? {
            ...fleet,
            routeId: 'route-test',
            name: 'Route Tellus <> Vesta',
            cargo: { ...fleet.cargo!, Iron: 5 },
            position: snapshot.fleets[0]!.position,
            ships: { ...fleet.ships, 'Transport ship': 1 },
          }
        : fleet,
    );
    const intents: unknown[] = [];
    const view = renderMapFleetPanel(
      {
        ...snapshot,
        fleets,
        tradeRoutes: [
          {
            id: 'route-test',
            a: 'sol-0',
            b: 'sol-1',
            from: 'Tellus',
            to: 'Vesta',
            start: new HexCoordinate(1, 0),
            end: new HexCoordinate(2, 0),
            closing: false,
            fleetIds: [fleets[1]!.id],
            hasActiveTransport: true,
            capacity: 30,
            waiting: 0,
            status: 'Idle',
          },
        ],
      },
      (intent) => intents.push(intent),
      snapshot.fleets[0]!.position!,
    );
    return { view, intents, target: fleets[1]!.id };
  }

  it('names the assigned route and allows a chosen ship to join a loaded fleet on the same hex', () => {
    const { view, intents, target } = routeView();
    const card = view.querySelectorAll('.fleet-card')[1]!;
    expect(card.querySelector('h3')!.textContent).toBe('Route Tellus <> Vesta');
    const move = card.querySelector<HTMLButtonElement>(
      '[aria-label="Move ship to Route Tellus <> Vesta"]',
    )!;
    expect(move.disabled).toBe(false);
    expect(card.querySelector<HTMLButtonElement>('.ship-token')!.disabled).toBe(
      true,
    );
    move.click();
    expect(intents).toContainEqual({ type: 'transfer-chosen-ship', target });
  });

  it('accepts a pointer drop into a route fleet on the same hex', () => {
    const { view, intents, target } = routeView();
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
    expect(intents).toContainEqual({
      shipId: 'fleet-home-legacy-Fighter-0',
      type: 'transfer-ships',
      source: 'fleet-home',
      ship: 'Fighter',
      target,
      amount: 1,
    });
  });
});

it('genererade-skeppssprites: renders dedicated cargo, salvage and pirate portraits without adding a player ship type', () => {
  const model = new AppModel();
  const position = model.snapshot.fleets[0]!.position!;
  const panel = renderMapFleetPanel(
    {
      ...model.snapshot,
      pirates: [{ id: 'pirate-test', systemId: 'test', count: 1, position }],
    },
    () => {},
    position,
  );
  expect(
    panel
      .querySelector<HTMLImageElement>('img[alt="Space pirate"]')
      ?.getAttribute('src'),
  ).toBe(SHIP_SPRITES['Space pirate']);
  expect(SHIP_SPRITES['Space pirate']).not.toBe(SHIP_IMAGES.Fighter);
  expect(Object.keys(SHIP_IMAGES)).toHaveLength(5);
  const view = renderFleetShips({
    ...model.snapshot.fleets[0]!,
    ships: {
      Fighter: 0,
      'Colony ship': 0,
      'Exploration ship': 0,
      'Transport ship': 1,
      'Salvage ship': 1,
    },
  });
  for (const type of ['Transport ship', 'Salvage ship'] as const) {
    expect(
      view
        .querySelector<HTMLImageElement>(`img[alt="${type}"]`)
        ?.getAttribute('src'),
    ).toMatch(
      new RegExp(
        type === 'Transport ship'
          ? 'transport-ship.*\\.webp'
          : 'salvage-ship.*\\.webp',
      ),
    );
  }
});
