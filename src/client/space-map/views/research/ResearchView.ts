import { type ResearchSnapshot, type Technology } from '../../models/Game.js';
import type { IntentHandler } from '../../../app/views/ViewContracts.js';
import { buildingImage } from '../BuildingImage.js';
import { renderResearchTree } from './ResearchTreeView.js';
import { renderResearchSelection } from './ResearchDetailsView.js';
import { element, queueButton } from '../../../common/dom.js';
import { bindQueueOrder, decorateQueueRow } from '../QueueView.js';

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
      'Research station needs no technology of its own. Unbreathable planets require a researched Dome at the site first. Each operating station contributes one research point per round. Each technology costs one point.',
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
  // inga-overflodiga-navigeringsknappar: the main navigation leads back.
  header.append(heading);
  // forskningsvy-utan-station: no tree until a station exists to research with.
  if (!research.builtStations) {
    const missing = element('section', 'research-needs-station');
    missing.append(element('p', '', stationMessage(research)));
    page.append(header, missing);
    return page;
  }
  if (!research.stations)
    details.append(
      element(
        'p',
        'muted-note',
        'Build a Research station to advance research.',
      ),
    );
  const queue = element('details', 'research-queue hud');
  page.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
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
  const tree = renderResearchTree(research, emit, inspected, locked);
  if (research.queueBlockedReason)
    tree.append(
      element(
        'p',
        'research-station-required muted-note',
        research.queueBlockedReason,
      ),
    );
  tree.append(queue);
  panel.append(
    tree,
    renderResearchSelection(research, inspected, locked, emit),
  );
  page.append(header, panel);
  return page;
}

/**
 * forskningsvy-utan-station / forsta-station-pa-vag: before the first station
 * is built, say whether one is on its way and when research can begin.
 */
function stationMessage(research: ResearchSnapshot): string {
  const station = research.stationConstruction;
  if (!station)
    return 'Research needs a Research station. Build one on a free site in Factories.';
  const rounds = `${station.roundsLeft} ${station.roundsLeft === 1 ? 'round' : 'rounds'}`;
  return station.started
    ? `A Research station is being built on ${station.planet}. Research can begin in ${rounds}.`
    : `A Research station is queued on ${station.planet} and waits for goods. Research can begin in about ${rounds}.`;
}
