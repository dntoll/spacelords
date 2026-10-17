import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

export function renderResearch(emit: IntentHandler): HTMLElement {
  const page = element('section', 'research-page');
  const header = element('div', 'screen-header');
  header.append(
    element('h1', '', 'Research'),
    button('Back to map', () => emit({ type: 'open-map' }), 'back-button'),
  );
  const panel = element('div', 'research-panel');
  panel.append(
    element('span', 'pill pill-warm', 'Research is not available yet'),
    element('h2', '', 'Research station'),
    element(
      'p',
      '',
      'Available from the start once construction is introduced.',
    ),
    element(
      'p',
      'muted-note',
      'Future research will unlock better factories, cleaner production and more efficient use of workers.',
    ),
  );
  page.append(header, panel);
  return page;
}
