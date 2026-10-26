import type { GameEvent } from '../models/Game.js';
import { element } from './dom.js';

/** senaste-aret-i-events / sekventiella-arshandelser: preserve occurrence order. */
export function renderEvents(
  events: readonly GameEvent[],
  activeId?: string,
): HTMLElement[] {
  if (!events.length) return [];
  const year = element('li', 'event-year');
  year.append(element('h3', '', `Year ${events[0]!.round}`));
  const entries = element('ol', 'event-entries');
  for (const event of events) {
    const row = element('li', '', event.text);
    row.dataset.eventId = event.id;
    if (event.id === activeId) row.setAttribute('aria-current', 'step');
    entries.append(row);
  }
  year.append(entries);
  return [year];
}
