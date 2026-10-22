// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { AppView } from '../../src/client/views/AppView.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';

let root: HTMLElement;
let model: AppModel;
let view: AppView;
beforeEach(() => {
  root = document.createElement('div');
  document.body.replaceChildren(root);
  model = new AppModel();
  view = new AppView(root, () => ({ render() {}, dispose() {} }));
});

function expectSelection(active: boolean) {
  expect(root.querySelector<HTMLElement>('.selection-panel')!.hidden).toBe(
    !active,
  );
  expect(root.querySelector<HTMLElement>('.turn-console')!.hidden).toBe(active);
  expect(root.querySelector<HTMLButtonElement>('.end-turn')!.hidden).toBe(
    active,
  );
}

describe('fokuserat-kartval', () => {
  it('removes object navigation, the S/Q legend and the zoom control box', () => {
    view.render(model.snapshot);
    expect(
      root.querySelector('.known-objects, .map-controls, .map-order-legend'),
    ).toBeNull();
  });

  it('uses the lower area for the planet and restores turn actions for empty explored and unexplored hexes', () => {
    view.render(model.snapshot);
    expectSelection(true);
    for (const visible of [true, false]) {
      const cell = model.snapshot.cells.find(
        (cell) =>
          !cell.object &&
          cell.visible === visible &&
          !model.snapshot.fleets.some(
            (fleet) => fleet.position?.key === cell.position.key,
          ),
      )!;
      expect(cell).toBeDefined();
      model.select(cell.position);
      view.render(model.snapshot);
      expectSelection(false);
      expect(root.querySelector('.selection-panel')!.textContent).toBe('');
    }
    model.home();
    view.render(model.snapshot);
    expectSelection(true);
  });

  it('follows the latest events when the hidden console first becomes visible', () => {
    const events = Array.from({ length: 120 }, (_, index) => ({
      id: `event-${index}`,
      round: index + 1,
      text: `Event ${index}`,
    }));
    view.render({ ...model.snapshot, events });
    const log = root.querySelector<HTMLElement>('[role="log"]')!;
    Object.defineProperties(log, {
      scrollHeight: { get: () => log.querySelectorAll('li').length * 10 },
      clientHeight: { value: 60 },
    });
    model.select(new HexCoordinate(-2, 0));
    view.render({ ...model.snapshot, events });
    expect(log.querySelectorAll('li')).toHaveLength(100);
    expect(log.scrollTop).toBe(1000);
  });

  it('retains fleet orders in empty space without empty-space descriptions', () => {
    model.setDestination('fleet-home', 3, 0);
    for (const frame of model.startTurn()) model.applyTurnFrame(frame);
    model.finishTurn();
    model.select(new HexCoordinate(3, 0));
    view.render(model.snapshot);
    expectSelection(true);
    expect(root.querySelector('.selection-panel')!.textContent).toContain(
      'Home Fleet',
    );
    expect(root.querySelector('.selection-panel')!.textContent).not.toMatch(
      /Empty space|Unexplored space|No known celestial/,
    );
  });

  it('gives a selected trade route the lower area and restores Events after leaving it', () => {
    const state = tradeNetworkState();
    model = new AppModel(undefined, {
      load: () => ({ lastPlayed: '2026-10-21T10:00:00Z', state }),
      save() {},
      clear() {},
    });
    model.startSlot(1);
    model.selectMapRoute('route-test');
    view.render(model.snapshot);
    expectSelection(true);
    expect(root.querySelector('[aria-label="Selected route"]')).not.toBeNull();
    model.select(new HexCoordinate(-2, 0));
    view.render(model.snapshot);
    expectSelection(false);
  });
});

describe('rundkontroller-i-decisions', () => {
  it('keeps Decisions open while advancing the year so Events and End turn stay available', () => {
    model.openDecisions();
    const frames = model.startTurn();
    expect(model.snapshot.screen).toBe('decisions');
    for (const frame of frames) model.applyTurnFrame(frame);
    model.finishTurn();
    expect(model.snapshot.screen).toBe('decisions');
    expect(model.snapshot.phase).toBe('planning');
    expect(model.snapshot.events.length).toBeGreaterThan(0);
  });
  it('shows the event history and emits End turn from Decisions', () => {
    const intents: unknown[] = [];
    view.bind((intent) => intents.push(intent));
    model.openDecisions();
    view.render({
      ...model.snapshot,
      events: [{ id: 'arrival', round: 1, text: 'Fleet arrived.' }],
    });
    expect(root.querySelector('[role="log"]')?.textContent).toContain(
      'Year 1: Fleet arrived.',
    );
    const end = root.querySelector<HTMLButtonElement>('.end-turn')!;
    expect(end).not.toBeNull();
    end.click();
    expect(intents).toContainEqual({ type: 'end-turn' });
    view.render({ ...model.snapshot, phase: 'simulating' });
    expect(root.querySelector<HTMLButtonElement>('.end-turn')!.disabled).toBe(
      true,
    );
  });
});

describe('rullningsbar-kartpanel', () => {
  it('grows with native scrolling, stays bounded and gives the map its space back at the top', () => {
    view.render(model.snapshot);
    const panel = root.querySelector<HTMLElement>('.selection-panel')!;
    const page = root.querySelector<HTMLElement>('.map-page')!;
    Object.defineProperty(page, 'clientHeight', { value: 600 });
    Object.defineProperties(panel, {
      scrollHeight: { value: 1200 },
      clientHeight: {
        get: () =>
          260 +
          Number.parseFloat(
            panel.style.getPropertyValue('--selection-expansion') || '0',
          ),
      },
    });
    panel.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
    const scroll = (top: number) => {
      panel.scrollTop = top;
      panel.dispatchEvent(new Event('scroll'));
      return Number.parseFloat(
        panel.style.getPropertyValue('--selection-expansion'),
      );
    };
    expect(scroll(100)).toBe(100);
    expect(scroll(500)).toBe(210);
    expect(scroll(800)).toBe(210);
    expect(scroll(50)).toBe(50);
    expect(scroll(0)).toBe(0);
    expect(model.snapshot.camera).toEqual(new AppModel().snapshot.camera);
  });

  it('leaves enough overflow to avoid a resize pushing short content back to the top', () => {
    view.render(model.snapshot);
    const panel = root.querySelector<HTMLElement>('.selection-panel')!;
    Object.defineProperty(root.querySelector('.map-page'), 'clientHeight', {
      value: 600,
    });
    Object.defineProperties(panel, {
      scrollHeight: { value: 300 },
      clientHeight: { value: 260 },
    });
    panel.dispatchEvent(new Event('touchmove'));
    panel.scrollTop = 30;
    panel.dispatchEvent(new Event('scroll'));
    expect(panel.style.getPropertyValue('--selection-expansion')).toBe('20px');
  });
});

describe('rullningsbar-kartpanel / flottval-pa-kartan', () => {
  it('does not grow when automatic fleet focus scrolls the panel', () => {
    view.render(model.snapshot);
    const panel = root.querySelector<HTMLElement>('.selection-panel')!;
    Object.defineProperty(root.querySelector('.map-page'), 'clientHeight', {
      value: 600,
    });
    Object.defineProperties(panel, {
      scrollHeight: { value: 1200 },
      clientHeight: { value: 260 },
    });
    panel.scrollTop = 100;
    panel.dispatchEvent(new Event('scroll'));
    expect(panel.style.getPropertyValue('--selection-expansion')).toBe('');
  });
});
