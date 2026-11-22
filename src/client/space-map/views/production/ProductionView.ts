import { element } from '../../../common/dom.js';

/**
 * gemensam-produktionsko-i-flottan: Production keeps its place in the
 * navigation while the fleet's shared queue is decided.
 */
export function renderProduction(): HTMLElement {
  const page = element('section', 'production-page');
  page.append(
    element('h1', '', 'Production'),
    element('p', 'muted-note', 'Production is not available yet.'),
  );
  return page;
}
