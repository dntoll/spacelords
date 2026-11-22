import { element } from '../../common/dom.js';

export function renderMapLocationHeading(name: string): HTMLElement {
  const heading = element('div', 'selection-heading map-location-heading');
  heading.append(element('h2', '', name));
  return heading;
}
