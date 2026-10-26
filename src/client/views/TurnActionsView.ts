import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

export function renderTurnActions(emit: IntentHandler): HTMLElement {
  const actions = element('div', 'turn-actions');
  const console = element('details', 'turn-console hud');
  console.setAttribute('role', 'region');
  console.setAttribute('aria-label', 'Turn console');
  const log = element('div', 'console-log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-label', 'Game events');
  log.setAttribute('aria-live', 'polite');
  log.setAttribute('aria-relevant', 'additions');
  log.tabIndex = 0;
  log.append(element('p', 'console-empty', 'No events yet.'), element('ol'));
  const summary = element('summary');
  summary.append(element('h2', '', 'Events'));
  const playback = element('div', 'event-playback-controls');
  playback.hidden = true;
  playback.setAttribute('role', 'group');
  playback.setAttribute('aria-label', 'Event playback');
  const progress = element('span', 'event-progress');
  progress.setAttribute('role', 'status');
  playback.append(
    progress,
    button(
      'Pause',
      () => emit({ type: 'playback-toggle' }),
      'button playback-toggle',
    ),
    button('Next', () => emit({ type: 'playback-next' })),
    button('Skip', () => emit({ type: 'playback-skip' })),
  );
  summary.addEventListener('click', (event) => {
    if (!playback.hidden) event.preventDefault();
  });
  const focus = element('p', 'event-focus');
  focus.hidden = true;
  console.append(summary, playback, focus, log);
  actions.append(
    console,
    button('End turn', () => emit({ type: 'end-turn' }), 'end-turn'),
  );
  return actions;
}
