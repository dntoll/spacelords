import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

export function renderMapLocationHeading(
  name: string,
  planetId: string | undefined,
  emit: IntentHandler,
): HTMLElement {
  const heading = element('div', 'selection-heading map-location-heading');
  heading.append(element('h2', '', name));
  if (planetId)
    heading.append(
      button(
        'Open planet',
        () => emit({ type: 'open-planet', id: planetId }),
        'open-planet',
      ),
    );
  return heading;
}
