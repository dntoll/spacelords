import type { AppReadModel } from '../../../app/models/AppModel.js';
import type { IntentHandler } from '../../../app/views/ViewContracts.js';
import { button, element } from '../../../common/dom.js';

export function discoveryControls(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const bar = element('section', 'discovery-controls');
  bar.setAttribute('aria-label', 'Interrupted round');
  // somlos-forflyttning: the journey pauses; rounds stay in the background.
  bar.append(element('strong', '', 'Journey paused'));
  const selected = model.fleet.id === model.mapFleetId ? model.fleet : null;
  if (selected)
    bar.append(
      element(
        'span',
        '',
        `${selected.name} · ${selected.remainingMovement ?? 0} hex remaining`,
      ),
    );
  bar.append(button('Continue', () => emit({ type: 'continue-turn' })));
  return bar;
}
