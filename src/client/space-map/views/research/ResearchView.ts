import { type ResearchSnapshot, type Technology } from '../../models/Game.js';
import type { IntentHandler } from '../../../app/views/ViewContracts.js';
import { buildingImage } from '../BuildingImage.js';
import { renderResearchTree } from './ResearchTreeView.js';
import { renderResearchSelection, roundsText } from './ResearchDetailsView.js';
import { element, queueButton } from '../../../common/dom.js';
import { bindQueueOrder, decorateQueueRow } from '../QueueView.js';

export function renderResearch(
  research: ResearchSnapshot,
  locked: boolean,
  emit: IntentHandler,
  inspected: Technology | null = null,
): HTMLElement {
  const page = element('section', 'research-page');
  // forskning-utan-rubrikrad: the main navigation names the screen, so the
  // heading is only for assistive technology and the tree gets the height.
  const header = element('h1', 'visually-hidden', 'Research');
  const panel = element('section', 'research-panel');
  const stations = `${research.stations} ${research.stations === 1 ? 'station' : 'stations'}`;
  const details = element('div', 'research-introduction-details');
  details.append(
    element(
      'p',
      'muted-note',
      `Research stations operating: ${research.stations}. A station needs no technology of its own; unbreathable planets need a researched Dome at the site first. Each technology takes 1 to 3 rounds while at least one station operates.`,
    ),
  );
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
  const summary = element('summary', 'research-queue-summary');
  summary.append(
    element('span', '', `Research queue · ${research.queue.length}`),
    buildingImage('Research station'),
    element('span', '', stations),
  );
  summary.setAttribute(
    'aria-label',
    `Research queue · ${research.queue.length} · Research stations · ${research.stations}`,
  );
  queue.append(summary);
  const orders = element('div', 'research-queue-content');
  if (!research.queue.length)
    orders.append(element('p', 'muted-note', 'No research queued.'));
  for (const [index, technology] of research.queue.entries()) {
    const row = element('article', 'empire-card research-queue-order');
    row.append(
      element(
        'p',
        '',
        `${index + 1}. ${technology} · ${
          index === 0
            ? `${research.progress?.[technology] ?? 0}/${roundsText(technology)}`
            : roundsText(technology)
        }`,
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
  queue.append(orders, details);
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
