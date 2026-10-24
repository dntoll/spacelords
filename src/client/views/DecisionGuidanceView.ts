import type { AppReadModel } from '../models/AppModel.js';
import {
  decisionScreen,
  needsAttention,
  type Decision,
} from '../models/Decisions.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

function nextStep(decision: Decision): string {
  if (decision.kind === 'research')
    return 'Choose a technology in the highlighted tree to queue research.';
  if (decision.kind === 'fleet')
    return 'Choose a destination in Orders, transfer ships, or assign a transport to a route.';
  if (decision.kind === 'route')
    return 'Select a purple transport fleet, open Trade routes and assign it to this route.';
  if (decision.id.startsWith('supply-'))
    return 'Inspect the marked planet and its project. Connect suppliers with a route and assign transport for missing deliveries.';
  if (decision.id.startsWith('staff-'))
    return 'Inspect workers and crew. Free workers or wait for population growth.';
  if (decision.id.startsWith('production-'))
    return 'Inspect the blocked project and build its required factory.';
  return 'Choose an option around the marked planet and queue a build.';
}

export function renderDecisionGuidance(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement | null {
  const decisions = model.decisions.filter(
    (decision) =>
      needsAttention(decision) && decisionScreen(decision) === model.screen,
  );
  if (!decisions.length) return null;
  const panel = element('aside', 'decision-guidance hud');
  panel.id = 'decision-guidance';
  panel.setAttribute('aria-label', 'Decisions in this view');
  for (const decision of decisions) {
    const row = element('div', 'decision-guidance-row');
    row.append(element('p', '', `${decision.label}. ${nextStep(decision)}`));
    if (decision.kind !== 'research') {
      const show = button(
        `Show decision: ${decision.label}`,
        () => emit({ type: 'open-decision', id: decision.id }),
        'button secondary-button',
      );
      show.textContent = 'Show';
      row.append(show);
    }
    panel.append(row);
  }
  return panel;
}

export function updateDecisionGuidance(
  root: HTMLElement,
  model: AppReadModel,
  emit: IntentHandler,
): void {
  const previous = root.querySelector<HTMLElement>('.decision-guidance');
  const scroll = previous?.scrollTop ?? 0;
  previous?.remove();
  for (const target of root.querySelectorAll<HTMLElement>('.decision-target')) {
    target.classList.remove('decision-target');
    if (target.getAttribute('aria-describedby') === 'decision-guidance')
      target.removeAttribute('aria-describedby');
  }
  root
    .querySelector('.research-page')
    ?.classList.remove('has-decision-guidance');
  const guidance = renderDecisionGuidance(model, emit);
  const pageRoot = root.querySelector<HTMLElement>('main.page');
  if (!guidance) {
    pageRoot?.classList.remove('has-map-guidance');
    pageRoot?.style.removeProperty('--decision-guide-height');
    return;
  }
  const map = root.querySelector('.map-page');
  if (map && pageRoot) {
    pageRoot.classList.add('has-map-guidance');
    pageRoot.append(guidance);
    pageRoot.style.setProperty(
      '--decision-guide-height',
      `${guidance.getBoundingClientRect().height + 12}px`,
    );
  } else {
    const page = root.querySelector('.research-page');
    page?.classList.add('has-decision-guidance');
    page?.insertBefore(guidance, page.querySelector('.research-panel'));
  }
  guidance.scrollTop = scroll;
  const highlight = (target: Element | null) => {
    target?.classList.add('decision-target');
    target?.setAttribute('aria-describedby', 'decision-guidance');
  };
  for (const decision of model.decisions.filter(
    (decision) =>
      needsAttention(decision) && decisionScreen(decision) === model.screen,
  )) {
    if (decision.kind === 'research') {
      highlight(root.querySelector('.research-tree-viewport'));
      for (const choice of root.querySelectorAll(
        '.research-node.available button:not(:disabled)',
      ))
        highlight(choice);
    } else if (decision.fleetId) {
      for (const card of root.querySelectorAll<HTMLElement>('.fleet-card'))
        if (card.dataset.fleetId === decision.fleetId) {
          highlight(card);
          highlight(card.querySelector('.fleet-orders > summary'));
        }
    } else if (
      model.screen === 'production' &&
      decision.planetId === model.planet?.id
    ) {
      highlight(root.querySelector('.production-ring'));
      highlight(root.querySelector('.map-build-queue'));
      if (decision.id.startsWith('building-empty-'))
        for (const choice of root.querySelectorAll('.radial-build-option'))
          highlight(choice);
    } else if (model.screen === 'route') {
      if (decision.routeId === model.mapTrade.routeId)
        highlight(root.querySelector('.trade-route-details'));
      if (decision.planetId === model.planet?.id)
        highlight(root.querySelector('.route-supply-summary'));
      for (const summary of root.querySelectorAll(
        '.map-fleet-route-options > summary',
      ))
        highlight(summary);
    }
  }
}
