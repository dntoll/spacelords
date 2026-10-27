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
  { id: 'old', round: 15, text: 'Old event' },
  { id: 'p1', round: 16, text: 'Population on Terra changed by +0.' },
  { id: 'b1', round: 16, text: 'Mine was completed on Vesta.' },
  { id: 'p2', round: 16, text: 'Population on Vesta changed by +20.' },
  { id: 'b2', round: 16, text: 'Factory was completed on Terra.' },
]);

describe('senaste-aret-i-events / sekventiella-arshandelser', () => {
  it('handelseannonsering: presents events automatically without playback buttons', () => {
    const { root, model, view } = setup();
    view.render({
      ...model.snapshot,
      screen: 'map',
      events,
      eventPlayback: {
        round: 16,
        events: events.slice(1),
        index: 0,
        stage: 'announcing' as const,
      },
    });
    expect(root.querySelector('.event-playback-controls')).toBeNull();
    expect(
      [...root.querySelectorAll('button')].some((button) =>
        ['Pause', 'Play', 'Next', 'Skip'].includes(button.textContent),
      ),
    ).toBe(false);
    view.dispose();
  });
  it('waits until the year is finished before presenting its generated events', () => {
    const { root, model, view } = setup();
    view.render({
      ...model.snapshot,
      round: 17,
      phase: 'simulating',
      events: [...events, { id: 'pending', round: 17, text: 'New arrival' }],
    });
    expect(root.querySelector('[data-event-id="pending"]')).toBeNull();
    expect(root.querySelector('[data-event-id="p1"]')).not.toBeNull();
    view.dispose();
  });
  it('shows only the latest year in occurrence order, including +0, without changing saved history', () => {
    const { root, model, view } = setup();
    view.render({ ...model.snapshot, events });
    expect(
      [...root.querySelectorAll('.event-year h3')].map(
        (node) => node.textContent,
      ),
    ).toEqual(['Year 16']);
    expect(root.querySelector('.event-type-label')).toBeNull();
    expect(
      [...root.querySelectorAll<HTMLElement>('[data-event-id]')].map(
        (node) => node.dataset.eventId,
      ),
    ).toEqual(['p1', 'b1', 'p2', 'b2']);
    expect(root.querySelector('[data-event-id="p1"]')?.textContent).toContain(
      '+0',
    );
    expect(events).toHaveLength(5);
    view.render({ ...model.snapshot, round: 18, events });
    expect(root.querySelectorAll('[data-event-id]')).toHaveLength(0);
    expect(root.querySelector('.console-empty')).not.toBeNull();
    view.dispose();
  });

  it('handelseannonsering: files a row only after its announcement and preserves the log during the flight', () => {
    const { root, model, view } = setup();
    const playback = {
      round: 16,
      events: events.slice(1),
      index: 0,
      stage: 'announcing' as const,
    };
    view.render({
      ...model.snapshot,
      screen: 'map',
      events,
      eventPlayback: playback,
    });
    expect(root.querySelectorAll('[data-event-id]')).toHaveLength(0);
    const announcement = root.querySelector<HTMLElement>(
      '.event-announcement',
    )!;
    expect(announcement.textContent).toBe(events[1]!.text);
    expect(root.querySelector<HTMLDetailsElement>('.turn-console')!.open).toBe(
      true,
    );
    expect(root.querySelector<HTMLButtonElement>('.end-turn')!.disabled).toBe(
      true,
    );
    expect(root.querySelector<HTMLElement>('.selection-panel')!.hidden).toBe(
      true,
    );
    view.render({
      ...model.snapshot,
      screen: 'map',
      events,
      eventPlayback: { ...playback, stage: 'filing' },
    });
    expect(root.querySelector('.event-announcement')).toBe(announcement);
    expect(announcement.dataset.stage).toBe('filing');
    expect(root.querySelectorAll('[data-event-id]')).toHaveLength(0);
    view.render({
      ...model.snapshot,
      screen: 'map',
      events,
      eventPlayback: { ...playback, index: 1 },
    });
    expect(root.querySelectorAll('[data-event-id]')).toHaveLength(1);
    expect(root.querySelector('[data-event-id="p1"]')?.textContent).toBe(
      events[1]!.text,
    );
    expect(root.querySelector('.event-announcement')?.textContent).toBe(
      events[2]!.text,
    );
    expect(
      root.querySelector(
        '[aria-label="Pause"], [aria-label="Next"], [aria-label="Skip"]',
      ),
    ).toBeNull();
    view.render({
      ...model.snapshot,
      screen: 'map',
      events,
      eventPlayback: null,
    });
    expect(root.querySelector('.event-announcement')).toBeNull();
    expect(root.querySelector<HTMLElement>('.selection-panel')!.hidden).toBe(
      false,
    );
    expect(root.querySelector<HTMLButtonElement>('.end-turn')!.disabled).toBe(
      false,
    );
    view.dispose();
  });

  it('keeps unknown event text as literal text and appends it in order', () => {
    const { root, model, view } = setup();
    view.render({ ...model.snapshot, events });
    view.render({
      ...model.snapshot,
      events: [...events, { id: 'unknown', round: 16, text: '<New event>' }],
    });
    const row = root.querySelector('[data-event-id="unknown"]')!;
    expect(row.textContent).toBe('<New event>');
    expect(row.children).toHaveLength(0);
    expect(root.querySelector('.event-entries')!.lastElementChild).toBe(row);
    view.dispose();
  });
});
