import { type ResearchSnapshot, type Technology } from '../../models/Game.js';
import type { IntentHandler } from '../../../app/views/ViewContracts.js';
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
  const details = element('div', 'research-introduction-details');
  // flottforskning-av-tekniker: the fleet has no research capacity yet.
  details.append(element('p', 'muted-note', 'Research does not advance yet.'));
  // forskningsflikar: the queue is a tab beside the selected research.
  const queue = element('section', 'research-queue');
  queue.setAttribute('aria-label', 'Research queue');
  queue.id = 'research-queue-panel';
  page.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      emit({ type: 'inspect-research', technology: null });
    }
  });
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
  panel.append(
    tree,
    researchTabs(
      renderResearchSelection(research, inspected, locked, emit),
      queue,
      research.queue.length,
    ),
  );
  page.append(header, panel);
  return page;
}

export type ResearchTab = 'selected' | 'queue';

/** forskningsflikar: Selected and Queue share the area below the tree. */
function researchTabs(
  selected: HTMLElement,
  queue: HTMLElement,
  queued: number,
): HTMLElement {
  const area = element('section', 'research-bottom');
  area.dataset.tab = 'selected';
  const tabs = element('div', 'research-tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Research panels');
  const tab = (name: ResearchTab, label: string, panel: HTMLElement) => {
    const control = element('button', 'research-tab', label);
    control.type = 'button';
    control.dataset.tab = name;
    control.setAttribute('role', 'tab');
    control.setAttribute('aria-controls', panel.id);
    control.addEventListener('click', () => showResearchTab(area, name));
    return control;
  };
  tabs.append(
    tab('selected', 'Selected', selected),
    tab('queue', `Queue · ${queued}`, queue),
  );
  area.append(tabs, selected, queue);
  showResearchTab(area, 'selected');
  return area;
}

/** forskningsflikar: show one tab; the view keeps it across re-renders. */
export function showResearchTab(root: ParentNode, name: ResearchTab): void {
  const area =
    root instanceof HTMLElement && root.classList.contains('research-bottom')
      ? root
      : root.querySelector<HTMLElement>('.research-bottom');
  if (!area) return;
  area.dataset.tab = name;
  for (const control of area.querySelectorAll<HTMLElement>('.research-tab'))
    control.setAttribute('aria-selected', String(control.dataset.tab === name));
  area
    .querySelector('.research-details')
    ?.toggleAttribute('hidden', name !== 'selected');
  area
    .querySelector('.research-queue')
    ?.toggleAttribute('hidden', name !== 'queue');
}
