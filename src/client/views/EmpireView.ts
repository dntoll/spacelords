import type { AppReadModel } from '../models/AppModel.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

export function renderDecisions(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const page = element('section', 'empire-page');
  page.append(element('h1', '', 'Decisions'));
  const panel = element('div', 'empire-content');
  panel.append(button('Next decision', () => emit({ type: 'next-decision' })));
  if (!model.decisions.length)
    panel.append(element('p', '', 'No decisions need your attention.'));
  for (const item of model.decisions) {
    const card = element('article', 'empire-card');
    card.dataset.decisionId = item.id;
    card.append(element('h2', '', item.label));
    if (item.skipped)
      card.append(element('p', 'muted-note', 'Skipped this turn'));
    card.append(
      button('Review', () => emit({ type: 'open-decision', id: item.id })),
    );
    const skip = button('Skip this turn', () =>
      emit({ type: 'skip-decision', id: item.id }),
    );
    skip.disabled = item.skipped || model.phase !== 'planning';
    card.append(skip);
    panel.append(card);
  }
  page.append(panel);
  return page;
}

export function renderTradeRoutes(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const page = element('section', 'empire-page');
  page.append(element('h1', '', 'Trade routes'));
  const panel = element('div', 'empire-content');
  const unlocked = model.research.completed.includes('Trade logistics');
  if (!unlocked)
    panel.append(
      element('p', '', 'Research Trade logistics to connect your planets.'),
    );
  const from = element('select');
  from.setAttribute('aria-label', 'Route origin');
  const to = element('select');
  to.setAttribute('aria-label', 'Route destination');
  for (const planet of model.ownedPlanets) {
    for (const select of [from, to]) {
      const option = element('option', '', planet.name);
      option.value = planet.id;
      select.append(option);
    }
  }
  if (to.options.length > 1) to.selectedIndex = 1;
  const create = button('Create trade route', () =>
    emit({ type: 'create-trade-route', a: from.value, b: to.value }),
  );
  create.disabled =
    !unlocked || model.ownedPlanets.length < 2 || model.phase !== 'planning';
  const form = element('div', 'empire-card route-form');
  form.append(from, to, create);
  panel.append(form);
  for (const route of model.tradeRoutes) {
    const card = element('article', 'empire-card');
    card.setAttribute('aria-label', `${route.from} to ${route.to}`);
    card.append(
      element('h2', '', `${route.from} ↔ ${route.to}`),
      element(
        'p',
        '',
        `${route.status} · ${route.capacity} cargo capacity · ${route.waiting} units waiting`,
      ),
    );
    for (const id of route.fleetIds) {
      const fleet = model.fleets.find((f) => f.id === id)!;
      const cargo =
        Object.entries(fleet.cargo ?? {})
          .filter(([, amount]) => amount > 0)
          .map(([r, n]) => `${n} ${r}`)
          .join(', ') || 'Empty hold';
      card.append(
        element(
          'p',
          '',
          `${fleet.name} · ${cargo} · ${fleet.destination ? 'Travelling' : 'At endpoint'}`,
        ),
      );
      const release = button(
        fleet.releaseRequested ? 'Release pending' : `Release ${fleet.name}`,
        () => emit({ type: 'release-trade-fleet', id }),
      );
      release.disabled = !!fleet.releaseRequested || model.phase !== 'planning';
      card.append(release);
    }
    const fleets = element('select');
    fleets.setAttribute(
      'aria-label',
      `Transport fleet for ${route.from} to ${route.to}`,
    );
    for (const fleet of model.fleets.filter(
      (f) =>
        !f.routeId &&
        !f.joinFleetId &&
        !f.destination &&
        f.ships['Transport ship'] > 0 &&
        [route.start.key, route.end.key].includes(f.position?.key ?? ''),
    )) {
      const option = element('option', '', fleet.name);
      option.value = fleet.id;
      fleets.append(option);
    }
    const assign = button('Assign fleet', () =>
      emit({
        type: 'assign-trade-fleet',
        routeId: route.id,
        fleetId: fleets.value,
      }),
    );
    assign.disabled =
      !fleets.options.length || route.closing || model.phase !== 'planning';
    const close = button('Close route', () =>
      emit({ type: 'close-trade-route', id: route.id }),
    );
    close.disabled = route.closing || model.phase !== 'planning';
    card.append(fleets, assign, close);
    panel.append(card);
  }
  for (const planet of model.ownedPlanets) {
    if (planet.projects.some((p) => p.blockedReason)) {
      const card = element('article', 'empire-card');
      card.append(element('h2', '', planet.name));
      for (const project of planet.projects
        .slice(0, 1)
        .filter((p) => p.blockedReason))
        card.append(
          element('p', '', `${project.type}: ${project.blockedReason}`),
        );
      panel.append(card);
    }
  }
  page.append(panel);
  return page;
}

export function renderTurnWarning(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLDialogElement {
  const dialog = element('dialog', 'decision-dialog');
  dialog.setAttribute('aria-label', 'Decisions remaining');
  dialog.append(element('h2', '', 'Decisions remaining'));
  const list = element('ul');
  for (const decision of model.decisions.filter((d) => !d.skipped))
    list.append(element('li', '', decision.label));
  dialog.append(
    list,
    button('Review decisions', () => {
      emit({ type: 'cancel-end-turn' });
      emit({ type: 'open-decisions' });
    }),
    button('End turn anyway', () => emit({ type: 'confirm-end-turn' })),
    button('Cancel', () => emit({ type: 'cancel-end-turn' })),
  );
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    emit({ type: 'cancel-end-turn' });
  });
  return dialog;
}
