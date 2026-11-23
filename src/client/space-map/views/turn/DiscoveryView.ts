import type { AppReadModel } from '../../../app/models/AppModel.js';
import type { IntentHandler } from '../../../app/views/ViewContracts.js';
import { button, element } from '../../../common/dom.js';

export function discoveryControls(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const bar = element('section', 'discovery-controls');
  bar.setAttribute('aria-label', 'Interrupted round');
  bar.append(element('strong', '', `Round ${model.round} paused`));
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
