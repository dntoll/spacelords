import type { GameEvent } from '../models/Game.js';
import { element } from './dom.js';

const eventTypes: readonly (readonly [RegExp, string])[] = [
  [/^Habitability on .+ increased to /, 'Habitability changes'],
  [/ was demolished on /, 'Demolitions'],
  [/ is waiting on /, 'Production waiting'],
  [/ was completed (?:at site .+ on |on )/, 'Construction completed'],
  [/ was produced at /, 'Production completed'],
  [/ completed on /, 'Ship construction completed'],
  [/^Research completed: /, 'Research completed'],
  [/ arrived at /, 'Fleet arrivals'],
  [/ delivered .+ to /, 'Deliveries'],
  [/ joined /, 'Fleet reinforcements'],
  [/: reinforcement target unavailable; /, 'Fleet orders'],
];

function presentation(text: string): { type: string; text: string } {
  const population = /^Population on (.+) changed by ([+-]\d+)\.$/.exec(text);
  if (population)
    return {
      type: 'Population changes',
      text: `${population[1]} ${population[2]}`,
    };
  return {
    type:
      eventTypes.find(([pattern]) => pattern.test(text))?.[1] ?? 'Other events',
    text,
  };
}

// handelser-grupperade-per-ar-och-typ: saved events retain their original order.
export function renderGroupedEvents(
  events: readonly GameEvent[],
): HTMLElement[] {
  const years = new Map<number, GameEvent[]>();
  for (const event of events) {
    const year = years.get(event.round) ?? [];
    year.push(event);
    years.set(event.round, year);
  }
  return [...years]
    .sort(([a], [b]) => a - b)
    .map(([round, yearEvents]) => {
      const year = element('li', 'event-year');
      year.append(element('h3', '', `Year ${round}`));
      const groups = element('ul', 'event-types');
      const types = new Map<string, HTMLElement>();
      for (const event of yearEvents) {
        const display = presentation(event.text);
        let entries = types.get(display.type);
        if (!entries) {
          const group = element('li', 'event-type');
          group.append(element('span', 'event-type-label', `${display.type}:`));
          entries = element('ul');
          group.append(entries);
          groups.append(group);
          types.set(display.type, entries);
        }
        const row = element('li', '', display.text);
        row.dataset.eventId = event.id;
        entries.append(row);
      }
      year.append(groups);
      return year;
    });
}
