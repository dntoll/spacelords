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
  function panelWithContent(contentHeight = 1200) {
    view.render(model.snapshot);
    const panel = root.querySelector<HTMLElement>('.selection-panel')!;
    Object.defineProperty(root.querySelector('.map-page'), 'clientHeight', {
      value: 600,
    });
    Object.defineProperties(panel, {
      scrollHeight: { value: contentHeight },
      clientHeight: {
        get: () =>
          260 +
          Number.parseFloat(
            panel.style.getPropertyValue('--selection-expansion') || '0',
          ),
      },
    });
    return panel;
  }
  function wheel(panel: HTMLElement, deltaY: number) {
    const event = new WheelEvent('wheel', { deltaY, cancelable: true });
    panel.dispatchEvent(event);
    return event;
  }
  function expansion(panel: HTMLElement) {
    return Number.parseFloat(
      panel.style.getPropertyValue('--selection-expansion') || '0',
    );
  }

  it('consumes input by expanding first and scrolls only the remainder after maximum height', () => {
    const panel = panelWithContent();
    expect(wheel(panel, 120).defaultPrevented).toBe(true);
    expect(expansion(panel)).toBe(120);
    expect(panel.scrollTop).toBe(0);
    wheel(panel, 200);
    expect(expansion(panel)).toBe(210);
    expect(panel.scrollTop).toBe(110);
    wheel(panel, -80);
    expect(expansion(panel)).toBe(210);
    expect(panel.scrollTop).toBe(30);
    wheel(panel, -60);
    expect(panel.scrollTop).toBe(0);
    expect(expansion(panel)).toBe(180);
    wheel(panel, -180);
    expect(expansion(panel)).toBe(0);
  });

  it('shows short content completely without scrolling it past the top', () => {
    const panel = panelWithContent(300);
    wheel(panel, 40);
    expect(expansion(panel)).toBe(40);
    expect(panel.scrollTop).toBe(0);
  });

  it('expands a touch drag without scrolling and stops on cancellation or a second finger', () => {
    const panel = panelWithContent();
    const send = (type: string, y: number, count = 1) => {
      const event = new Event(type, { cancelable: true });
      Object.defineProperty(event, 'touches', {
        value: Array.from({ length: count }, (_, identifier) => ({
          identifier,
          clientX: 10,
          clientY: y,
        })),
      });
      panel.dispatchEvent(event);
      return event;
    };
    send('touchstart', 400);
    expect(send('touchmove', 300).defaultPrevented).toBe(true);
    expect(expansion(panel)).toBe(100);
    expect(panel.scrollTop).toBe(0);
    send('touchmove', 200, 2);
    expect(send('touchmove', 100).defaultPrevented).toBe(false);
    expect(expansion(panel)).toBe(100);
    send('touchstart', 400);
    send('touchcancel', 400);
    send('touchmove', 100);
    expect(expansion(panel)).toBe(100);
  });

  it('leaves ship dragging and editable controls to their own handlers', () => {
    const panel = panelWithContent();
    const token = document.createElement('button');
    token.className = 'ship-token';
    panel.append(token);
    const touch = (type: string, y: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'touches', {
        value: [{ identifier: 0, clientX: 10, clientY: y }],
      });
      token.dispatchEvent(event);
      return event;
    };
    touch('touchstart', 400);
    expect(touch('touchmove', 100).defaultPrevented).toBe(false);
    const input = document.createElement('input');
    panel.append(input);
    const key = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(false);
    expect(expansion(panel)).toBe(0);
  });

  it('uses keyboard scrolling to expand first as well', () => {
    const panel = panelWithContent();
    panel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }),
    );
    expect(expansion(panel)).toBe(40);
    expect(panel.scrollTop).toBe(0);
    panel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', cancelable: true }),
    );
    expect(expansion(panel)).toBe(210);
    expect(panel.scrollTop).toBe(730);
    panel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', cancelable: true }),
    );
    expect(expansion(panel)).toBe(0);
    expect(panel.scrollTop).toBe(0);
  });

  it('does not expand for automatic focus scrolling', () => {
    const panel = panelWithContent();
    panel.scrollTop = 100;
    panel.dispatchEvent(new Event('scroll'));
    expect(expansion(panel)).toBe(0);
  });
});
