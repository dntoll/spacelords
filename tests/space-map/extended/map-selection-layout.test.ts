// @vitest-environment jsdom
import { turnFrames } from '../../fixtures/turn-steps.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { AppView } from '../../../src/client/app/views/AppView.js';

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
  expect(root.querySelector<HTMLElement>('.turn-console')!.hidden).toBe(false);
  expect(root.querySelector<HTMLButtonElement>('.end-turn')!.hidden).toBe(
    false,
  );
}

describe('fokuserat-kartval', () => {
  it('removes object navigation, the S/Q legend and the zoom control box', () => {
    view.render(model.snapshot);
    expect(
      root.querySelector('.known-objects, .map-controls, .map-order-legend'),
    ).toBeNull();
  });

  it('gemensam-events-panel: keeps turn controls available while selecting planets and empty hexes', () => {
    view.render(model.snapshot);
    expectSelection(true);
    for (const explored of [true, false]) {
      const cell = model.snapshot.cells.find(
        (cell) =>
          !cell.object &&
          cell.explored === explored &&
          !model.snapshot.fleets.some(
            (fleet) => fleet.position?.key === cell.position.key,
          ),
      )!;
      expect(cell).toBeDefined();
      model.select(cell.position);
      view.render(model.snapshot);
      expectSelection(!explored);
      expect(root.querySelector('.selection-panel')!.textContent).toBe(
        explored ? '' : 'Unexplored',
      );
    }
    model.home();
    view.render(model.snapshot);
    expectSelection(true);
  });

  it('gemensam-events-panel: preserves the open Events log and its reading position when the map selection changes', () => {
    const events = Array.from({ length: 120 }, (_, index) => ({
      id: `event-${index}`,
      round: 1,
      text: `Event ${index}`,
    }));
    view.render({ ...model.snapshot, events });
    const console = root.querySelector<HTMLDetailsElement>('.turn-console')!;
    console.open = true;
    const log = root.querySelector<HTMLElement>('[role="log"]')!;
    Object.defineProperties(log, {
      scrollHeight: {
        get: () => log.querySelectorAll('[data-event-id]').length * 10,
      },
      clientHeight: { value: 60 },
    });
    log.scrollTop = 40;
    model.select(new HexCoordinate(-2, 0));
    view.render({ ...model.snapshot, events });
    expect(root.querySelector('[role="log"]')).toBe(log);
    expect(log.querySelectorAll('[data-event-id]')).toHaveLength(120);
    expect(console.hidden).toBe(false);
    expect(console.open).toBe(true);
    expect(log.scrollTop).toBe(40);
  });

  it('retains fleet orders in empty space without empty-space descriptions', () => {
    model.setDestination('fleet-home', 3, 0);
    for (const frame of turnFrames(model)) model.applyTurnFrame(frame);
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
