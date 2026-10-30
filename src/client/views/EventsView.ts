import type { GameEvent } from '../models/Game.js';
import { element } from './dom.js';
import { gameText } from './GameText.js';

/** senaste-aret-i-events / sekventiella-arshandelser: preserve occurrence order. */
export function renderEvents(
  events: readonly GameEvent[],
  pending?: GameEvent,
): HTMLElement[] {
  if (!events.length && !pending) return [];
  const year = element('li', 'event-year');
  year.append(element('h3', '', `Year ${(events[0] ?? pending)!.round}`));
  const entries = element('ol', 'event-entries');
  for (const event of events) {
    const row = element('li', '', gameText(event.text));
    row.dataset.eventId = event.id;
    entries.append(row);
  }
  if (pending) {
    const destination = element(
      'li',
      'event-destination',
      gameText(pending.text),
    );
    destination.setAttribute('aria-hidden', 'true');
    entries.append(destination);
  }
  year.append(entries);
  return [year];
}
