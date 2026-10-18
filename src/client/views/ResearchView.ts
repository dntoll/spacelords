import {
  BUILDINGS,
  TECHNOLOGIES,
  type ResearchSnapshot,
} from '../models/Game.js';
import type { IntentHandler } from './ViewContracts.js';
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
  panel.append(
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
      element('h3', '', type),
      element('p', 'muted-note', BUILDINGS[type].description),
    );
    if (complete) card.append(element('span', 'pill', 'Researched'));
    else {
      const selected = research.selected === type;
      if (selected)
        card.append(element('span', 'pill', 'Researching · 0/1 points'));
      const choose = button(
        selected ? 'Cancel research' : `Research ${type}`,
        () => emit({ type: 'research', technology: selected ? null : type }),
        'button',
      );
      choose.disabled = locked;
      card.append(choose);
    }
    panel.append(card);
  }
  page.append(header, panel);
  return page;
}
