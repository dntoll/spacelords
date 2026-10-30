import {
  BUILDINGS,
  type ResearchSnapshot,
  type Technology,
  type BuildType,
} from '../models/Game.js';
import { PREREQUISITES, ORDER_RESEARCH } from '../models/Research.js';
import { isResearchIdentified } from '../models/ResearchTree.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

export function renderResearchSelection(
  research: ResearchSnapshot,
  technology: Technology | null,
  locked: boolean,
  emit: IntentHandler,
): HTMLElement {
  const panel = element('section', 'research-details');
  panel.setAttribute('aria-label', 'Selected research');
  if (technology) {
    panel.append(renderResearchDetails(research, technology, locked, emit));
  } else {
    panel.append(
      element('h2', '', 'Select a technology'),
      element(
        'p',
        'muted-note',
        'Tap a node to see its details and research it.',
      ),
    );
  }
  return panel;
}

export function renderResearchDetails(
  research: ResearchSnapshot,
  technology: Technology,
  locked: boolean,
  emit: IntentHandler,
): HTMLElement {
  const detail = element('div', 'research-node-details');
  const identified = isResearchIdentified(research, technology);
  const heading = element('div', 'research-detail-heading');
  heading.append(
    element('h2', '', identified ? technology : 'Unknown technology'),
  );
  const content = element('div', 'research-detail-content');
  content.tabIndex = 0;
  content.setAttribute('role', 'region');
  content.setAttribute('aria-label', 'Technology information');
  detail.append(heading, content);
  if (!identified) {
    content.append(
      element(
        'p',
        '',
        'Complete the preceding research to reveal this technology.',
      ),
    );
    return detail;
  }
  const completed = research.completed.includes(technology);
  const queue = research.queue.indexOf(technology);
  const recovered = research.recovered?.includes(technology);
  content.append(
    element(
      'p',
      '',
      technology === 'Trade logistics'
        ? 'Connect owned planets with automated transport fleets.'
        : technology in ORDER_RESEARCH
          ? ORDER_RESEARCH[technology as keyof typeof ORDER_RESEARCH]
          : BUILDINGS[technology as BuildType].description,
    ),
  );
  const metadata = element('div', 'research-detail-meta');
  metadata.append(
    element(
      'p',
      '',
      completed
        ? 'Researched'
        : queue === 0
          ? research.stations
            ? 'Researching · 0/1 points'
            : 'Waiting for an operating Research station'
          : queue > 0
            ? `Queued · ${queue + 1}`
            : 'Cost: 1 research point',
    ),
    element(
      'p',
      'research-requires',
      recovered
        ? 'Recovered technology · Prerequisites bypassed'
        : `Requires: ${PREREQUISITES[technology].join(', ') || 'No prerequisites'}`,
    ),
  );
  content.append(metadata);
  if (!completed) {
    const order = () => {
      if (!choose.disabled) emit({ type: 'research', technology });
    };
    const choose = button(`Research ${technology}`, order);
    choose.textContent = queue >= 0 ? 'Queued' : 'Research';
    choose.disabled = locked || !!research.queueBlockedReason || queue >= 0;
    bindResearchTouch(choose, order);
    heading.append(choose);
  }
  return detail;
}

/** research-med-ett-tryck: native touch can omit its compatibility click after a pan. */
function bindResearchTouch(choose: HTMLButtonElement, order: () => void): void {
  let start: { id: number; x: number; y: number } | null = null;
  let suppressClick = false;
  let viewport: Element | null = null;
  const cancelAdditionalPointer = (event: Event) => {
    if (start && (event as PointerEvent).pointerId !== start.id) start = null;
  };
  const finish = () => {
    start = null;
    viewport?.removeEventListener('pointerdown', cancelAdditionalPointer, true);
    viewport = null;
  };
  choose.addEventListener('pointerdown', (event) => {
    finish();
    suppressClick = event.pointerType === 'touch';
    if (!suppressClick || event.isPrimary === false || choose.disabled) return;
    start = { id: event.pointerId, x: event.clientX, y: event.clientY };
    viewport = choose.closest('.research-tree-viewport');
    viewport?.addEventListener('pointerdown', cancelAdditionalPointer, true);
  });
  choose.addEventListener('pointermove', (event) => {
    if (
      start &&
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6
    )
      start = null;
  });
  choose.addEventListener('pointercancel', finish);
  choose.addEventListener('pointerup', (event) => {
    const tapped = start?.id === event.pointerId;
    finish();
    if (tapped) {
      event.preventDefault();
      order();
    }
  });
  choose.addEventListener(
    'click',
    (event) => {
      if (suppressClick && event.detail > 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
}
