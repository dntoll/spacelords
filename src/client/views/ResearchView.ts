import { type ResearchSnapshot } from '../models/Game.js';
import type { IntentHandler } from './ViewContracts.js';
import { buildingImage } from './BuildingImage.js';
import { renderResearchTree } from './ResearchTreeView.js';
import { button, element, queueButton } from './dom.js';

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
  const introduction = element('details', 'research-introduction');
  const summary = element('summary');
  summary.append(
    buildingImage('Research station'),
    element('span', '', `Research stations · ${research.stations}`),
  );
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
  introduction.append(summary, details);
  const sidebar = element('aside', 'research-sidebar');
  sidebar.append(introduction);
  if (!research.stations)
    sidebar.append(
      element(
        'p',
        'muted-note',
        'Build a Research station to advance research.',
      ),
    );
  const queue = element('section', 'research-queue');
  queue.append(element('h2', '', 'Research queue'));
  for (const [index, technology] of research.queue.entries()) {
    const row = element('article', 'empire-card research-queue-order');
    row.append(
      element(
        'p',
        '',
        `${index + 1}. ${technology} · ${index === 0 ? 'next' : 'queued'}`,
      ),
    );
    const actions = element('div', 'queue-actions');
    for (const [symbol, label, offset] of [
      ['↑', 'Move up', -1],
      ['↓', 'Move down', 1],
    ] as const) {
      const move = queueButton(symbol, `${label}: ${technology}`, () =>
        emit({ type: 'move-research', technology, index: index + offset }),
      );
      move.disabled =
        locked || index + offset < 0 || index + offset >= research.queue.length;
      actions.append(move);
    }
    const remove = queueButton('×', `Remove ${technology}`, () =>
      emit({ type: 'remove-research', technology }),
    );
    remove.disabled = locked;
    actions.append(remove);
    row.append(actions);
    queue.append(row);
  }
  sidebar.append(queue);
  panel.append(renderResearchTree(research, locked, emit), sidebar);
  page.append(header, panel);
  return page;
}
