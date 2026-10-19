import {
  BUILDINGS,
  TECHNOLOGIES,
  type ResearchSnapshot,
} from '../models/Game.js';
import type { IntentHandler } from './ViewContracts.js';
import { buildingImage } from './BuildingImage.js';
import { PREREQUISITES } from '../models/Research.js';
import { button, element } from './dom.js';

export function renderResearch(
  research: ResearchSnapshot,
  locked: boolean,
  emit: IntentHandler,
): HTMLElement {
  const page = element('section', 'research-page');
  const header = element('div', 'screen-header');
  header.append(
    element('h1', '', 'Research'),
    button('Back to map', () => emit({ type: 'open-map' }), 'back-button'),
  );
  const panel = element('section', 'research-panel');
  const introduction = element('div', 'research-introduction');
  const details = element('div', 'research-introduction-details');
  details.append(
    element('h2', '', 'Research station'),
    element(
      'p',
      '',
      'Build a Research station on any colony without prior research. Each operating station contributes one research point per year. Each technology costs one point.',
    ),
    element(
      'p',
      'muted-note',
      `Operating research stations: ${research.stations}`,
    ),
  );
  introduction.append(buildingImage('Research station'), details);
  panel.append(introduction);
  if (!research.stations)
    panel.append(
      element(
        'p',
        'muted-note',
        'Build a Research station to advance research.',
      ),
    );
  for (const type of TECHNOLOGIES) {
    const card = element('article', 'research-choice');
    card.dataset.technology = type;
    const complete = research.completed.includes(type);
    card.append(
      ...(type === 'Trade logistics' ? [] : [buildingImage(type)]),
      element('h3', '', type),
      element(
        'p',
        'muted-note',
        type === 'Trade logistics'
          ? 'Connect owned planets with automated transport fleets.'
          : BUILDINGS[type].description,
      ),
      element(
        'p',
        'muted-note',
        `Requires: ${PREREQUISITES[type].join(', ') || 'No prerequisites'}`,
      ),
    );
    if (complete) card.append(element('span', 'pill', 'Researched'));
    else {
      const selected = research.queue.includes(type);
      if (selected)
        card.append(element('span', 'pill', 'Researching · 0/1 points'));
      const choose = button(
        selected ? 'Queued' : `Research ${type}`,
        () => emit({ type: 'research', technology: type }),
        'button',
      );
      choose.disabled = locked || selected;
      card.append(choose);
    }
    panel.append(card);
  }
  const queue = element('section', 'research-queue');
  queue.append(element('h2', '', 'Research queue'));
  for (const [index, technology] of research.queue.entries()) {
    const row = element('article', 'empire-card');
    row.append(
      element(
        'p',
        '',
        `${index + 1}. ${technology} · ${index === 0 ? 'next' : 'queued'}`,
      ),
    );
    for (const [label, offset] of [
      ['Move up', -1],
      ['Move down', 1],
    ] as const) {
      const move = button(`${label}: ${technology}`, () =>
        emit({ type: 'move-research', technology, index: index + offset }),
      );
      move.disabled =
        locked || index + offset < 0 || index + offset >= research.queue.length;
      row.append(move);
    }
    const remove = button(`Remove ${technology}`, () =>
      emit({ type: 'remove-research', technology }),
    );
    remove.disabled = locked;
    row.append(remove);
    queue.append(row);
  }
  panel.prepend(queue);
  page.append(header, panel);
  return page;
}
