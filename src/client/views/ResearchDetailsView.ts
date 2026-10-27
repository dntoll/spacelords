import {
  BUILDINGS,
  type ResearchSnapshot,
  type Technology,
} from '../models/Game.js';
import { PREREQUISITES } from '../models/Research.js';
import { isResearchIdentified } from '../models/ResearchTree.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

export function renderResearchDetails(
  research: ResearchSnapshot,
  technology: Technology,
  locked: boolean,
  emit: IntentHandler,
): HTMLElement {
  const detail = element('section', 'research-details hud');
  detail.setAttribute('role', 'region');
  detail.setAttribute('aria-label', 'Research details');
  detail.tabIndex = -1;
  const identified = isResearchIdentified(research, technology);
  const heading = element('div', 'research-details-heading');
  const close = button(
    'Close research details',
    () => emit({ type: 'inspect-research', technology: null }),
    'button research-details-close',
  );
  close.textContent = '×';
  heading.append(
    element('h2', '', identified ? technology : 'Unknown technology'),
    close,
  );
  detail.append(heading);
  if (!identified) {
    detail.append(
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
  detail.append(
    element(
      'p',
      '',
      technology === 'Trade logistics'
        ? 'Connect owned planets with automated transport fleets.'
        : BUILDINGS[technology].description,
    ),
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
  if (!completed) {
    const choose = button(`Research ${technology}`, () =>
      emit({ type: 'research', technology }),
    );
    choose.textContent = queue >= 0 ? 'Queued' : 'Research';
    choose.disabled = locked || !!research.queueBlockedReason || queue >= 0;
    detail.append(choose);
    if (research.queueBlockedReason)
      detail.append(element('p', 'muted-note', research.queueBlockedReason));
  }
  return detail;
}
