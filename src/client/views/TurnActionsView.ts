import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

export function renderTurnActions(emit: IntentHandler): HTMLElement {
  const actions = element('div', 'turn-actions');
  const console = element('section', 'turn-console hud');
  console.setAttribute('aria-label', 'Turn console');
  const log = element('div', 'console-log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-label', 'Game events');
  log.setAttribute('aria-live', 'polite');
  log.setAttribute('aria-relevant', 'additions');
  log.tabIndex = 0;
  log.append(element('p', 'console-empty', 'No events yet.'), element('ol'));
  console.append(element('h2', '', 'Events'), log);
  actions.append(
    console,
    button('End turn', () => emit({ type: 'end-turn' }), 'end-turn'),
  );
  return actions;
}
