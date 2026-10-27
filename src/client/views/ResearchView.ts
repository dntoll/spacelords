import { type ResearchSnapshot, type Technology } from '../models/Game.js';
import { renderResearchDetails } from './ResearchDetailsView.js';
import type { IntentHandler } from './ViewContracts.js';
import { buildingImage } from './BuildingImage.js';
import { renderResearchTree } from './ResearchTreeView.js';
import { button, element, queueButton } from './dom.js';
import { bindQueueOrder, decorateQueueRow } from './QueueView.js';

export function renderResearch(
  research: ResearchSnapshot,
  locked: boolean,
  emit: IntentHandler,
  inspected: Technology | null = null,
): HTMLElement {
  const page = element('section', 'research-page');
  const header = element('div', 'screen-header');
  const panel = element('section', 'research-panel');
  const introduction = element('details', 'research-introduction');
  const summary = element('summary');
  summary.setAttribute(
    'aria-label',
    `Research stations · ${research.stations}`,
  );
  summary.append(
    buildingImage('Research station'),
    element('span', '', `Stations · ${research.stations}`),
  );
  const details = element('div', 'research-introduction-details');
  details.append(
    element('h2', '', 'Research station'),
    element(
      'p',
      '',
      'Research station needs no technology of its own. Unbreathable planets require a researched Dome at the site first. Each operating station contributes one research point per year. Each technology costs one point.',
    ),
    element(
      'p',
      'muted-note',
      `Operating research stations: ${research.stations}`,
    ),
  );
  introduction.append(summary, details);
  const heading = element('div', 'research-heading');
  heading.append(element('h1', '', 'Research'), introduction);
  header.append(
    heading,
    button('Back to map', () => emit({ type: 'open-map' }), 'back-button'),
  );
  if (!research.stations)
    details.append(
      element(
        'p',
        'muted-note',
        'Build a Research station to advance research.',
      ),
    );
  const queue = element('details', 'research-queue hud');
  queue.addEventListener('toggle', () => {
    if (queue.open && panel.querySelector('.research-details'))
      emit({ type: 'inspect-research', technology: null });
  });
  page.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.querySelector('.research-details')) {
      event.preventDefault();
      emit({ type: 'inspect-research', technology: null });
    }
  });
  queue.append(
    element('summary', '', `Research queue · ${research.queue.length}`),
  );
  const orders = element('div', 'research-queue-content');
  if (!research.queue.length)
    orders.append(element('p', 'muted-note', 'No research queued.'));
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
    const remove = queueButton('×', `Remove ${technology}`, () =>
      emit({ type: 'remove-research', technology }),
    );
    remove.disabled = locked;
    actions.append(remove);
    row.append(actions);
    decorateQueueRow(row, technology, technology, locked);
    orders.append(row);
  }
  bindQueueOrder(
    orders,
    research.queue,
    (technology, index) =>
      emit({
        type: 'move-research',
        technology: technology as Technology,
        index,
      }),
    locked,
  );
  queue.append(orders);
  if (research.queueBlockedReason)
    panel.append(
      element(
        'p',
        'research-station-required muted-note',
        research.queueBlockedReason,
      ),
    );
  panel.append(renderResearchTree(research, emit, inspected, locked), queue);
  if (inspected !== null && research.available.includes(inspected))
    panel.append(renderResearchDetails(research, inspected, locked, emit));
  page.append(header, panel);
  return page;
}
