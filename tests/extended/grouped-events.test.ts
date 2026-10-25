// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppView } from '../../src/client/views/AppView.js';
import type { GameEvent } from '../../src/client/models/Game.js';

function setup() {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const model = new AppModel();
  model.openDecisions();
  const view = new AppView(root, () => ({ render() {}, dispose() {} }));
  return { root, model, view };
}

const events: readonly GameEvent[] = Object.freeze([
  { id: 'p1', round: 16, text: 'Population on Terra changed by +0.' },
  { id: 'b1', round: 16, text: 'Mine was completed on Vesta.' },
  { id: 'p2', round: 16, text: 'Population on Vesta changed by +20.' },
  { id: 'b2', round: 16, text: 'Factory was completed on Terra.' },
  { id: 'p3', round: 17, text: 'Population on Terra changed by +10.' },
]);

describe('handelser-grupperade-per-ar-och-typ', () => {
  it('groups interleaved events by type within each year without changing saved order', () => {
    const { root, model, view } = setup();
    view.render({ ...model.snapshot, events });
    const years = root.querySelectorAll('.event-year');
    expect(
      [...years].map((year) => year.querySelector('h3')?.textContent),
    ).toEqual(['Year 16', 'Year 17']);
    expect(
      [...years[0]!.querySelectorAll('.event-type-label')].map(
        (label) => label.textContent,
      ),
    ).toEqual(['Population changes:', 'Construction completed:']);
    expect(
      [...root.querySelectorAll<HTMLElement>('[data-event-id]')].map(
        (row) => row.textContent,
      ),
    ).toEqual([
      'Terra +0',
      'Vesta +20',
      events[1]!.text,
      events[3]!.text,
      'Terra +10',
    ]);
    expect(events.map((event) => event.id)).toEqual([
      'p1',
      'b1',
      'p2',
      'b2',
      'p3',
    ]);
    view.dispose();
  });

  it.each([
    ['Habitability on Terra increased to 80%.', 'Habitability changes'],
    ['Mine was demolished on Terra.', 'Demolitions'],
    ['Mine is waiting on Terra: missing workers', 'Production waiting'],
    [
      'Domed construction was completed at site 2 on Terra.',
      'Construction completed',
    ],
    ['Ion pulse engine was produced at Terra.', 'Production completed'],
    ['Fighter completed on Terra.', 'Ship construction completed'],
    ['Research completed: Mining.', 'Research completed'],
    ['Home Fleet arrived at Vesta.', 'Fleet arrivals'],
    ['fleet-1 delivered 20 Steel to Terra.', 'Deliveries'],
    ['Reinforcements joined Home Fleet.', 'Fleet reinforcements'],
    [
      'Home Fleet: reinforcement target unavailable; choose new orders.',
      'Fleet orders',
    ],
  ])('shows %s under %s', (text, type) => {
    const { root, model, view } = setup();
    view.render({
      ...model.snapshot,
      events: [{ id: 'typed', round: 16, text }],
    });
    expect(root.querySelector('.event-type-label')?.textContent).toBe(
      `${type}:`,
    );
    expect(root.querySelector('[data-event-id]')?.textContent).toBe(text);
    view.dispose();
  });

  it('adds late events to their existing group and retains unknown event text', () => {
    const { root, model, view } = setup();
    view.render({ ...model.snapshot, events: events.slice(0, 2) });
    view.render({
      ...model.snapshot,
      events: [
        ...events.slice(0, 3),
        { id: 'unknown', round: 16, text: '<New event>' },
      ],
    });
    expect(root.querySelectorAll('.event-year')).toHaveLength(1);
    expect(root.querySelectorAll('.event-type-label')).toHaveLength(3);
    expect(
      [...root.querySelectorAll<HTMLElement>('[data-event-id]')].map(
        (row) => row.dataset.eventId,
      ),
    ).toEqual(['p1', 'p2', 'b1', 'unknown']);
    expect(root.querySelector('[data-event-id="unknown"]')?.textContent).toBe(
      '<New event>',
    );
    expect(
      root.querySelector('[data-event-id="unknown"]')?.children,
    ).toHaveLength(0);
    view.dispose();
  });
});
