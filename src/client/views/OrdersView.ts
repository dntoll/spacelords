import type { AppReadModel } from '../models/AppModel.js';
import type { ShipType } from '../models/Game.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

/** egen-ordervy: named choices explain their result before the player acts. */
export function renderOrders(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const section = element('section', 'orders-view');
  const view = model.orderView;
  if (!view) return section;
  const heading = element('div', 'orders-heading');
  heading.append(
    element('h2', '', view.title),
    button(view.page === 'menu' ? 'Back' : 'Back to orders', () =>
      emit({ type: 'order-back' }),
    ),
  );
  section.append(heading);
  const locked = model.phase !== 'planning' && !view.fleetId;
  if (view.page === 'menu') {
    const choices = element('div', 'order-choices');
    for (const option of view.options) {
      const choice = button(
        option.label,
        () => emit({ type: 'order-kind', kind: option.kind }),
        'button order-choice',
      );
      choice.append(element('small', '', option.description));
      choice.disabled = locked || !!option.blockedReason;
      choice.title = option.blockedReason ?? option.description;
      if (option.blockedReason)
        choice.append(element('small', 'blocked-reason', option.blockedReason));
      choices.append(choice);
    }
    section.append(choices);
    if (view.ship)
      section.append(
        button(
          'Use default order',
          () => emit({ type: 'clear-start-order' }),
          'button secondary-button',
        ),
      );
  } else if (view.page === 'routes') {
    section.append(
      element('h3', '', 'Join route'),
      element(
        'p',
        'muted-note',
        'Routes without this ship type come first, then nearest routes.',
      ),
    );
    const choices = element('div', 'order-choices');
    const transport =
      view.ship === 'Transport ship' ||
      !!model.fleets.find((fleet) => fleet.id === view.fleetId)?.ships[
        'Transport ship'
      ];
    for (const item of view.routes) {
      const ships =
        Object.entries(item.ships)
          .filter(([, count]) => count > 0)
          .map(([type, count]) => `${count} ${type}`)
          .join(', ') || 'No ships assigned';
      const choice = button(
        `${item.route.from} ↔ ${item.route.to}`,
        () =>
          emit({
            type: 'apply-ship-order',
            order: { kind: 'join-route', routeId: item.route.id },
          }),
        'button order-choice',
      );
      choice.append(
        element('small', '', `${item.distance} hex away · ${ships}`),
      );
      choice.disabled = locked || (!transport && !item.ships['Transport ship']);
      if (!transport && !item.ships['Transport ship'])
        choice.append(
          element(
            'small',
            '',
            'Requires an assigned Transport ship before adding Fighters.',
          ),
        );
      choices.append(choice);
    }
    section.append(choices);
    if (!view.routes.length)
      section.append(element('p', '', 'No open trade routes.'));
  } else if (view.page === 'fleets') {
    section.append(
      element('h3', '', 'Join fleet'),
      element('p', '', 'Choose a fleet on the map.'),
    );
    const select = element('select');
    select.setAttribute('aria-label', 'Fleet target');
    const placeholder = element(
      'option',
      '',
      'Select a fleet on the map or here',
    );
    placeholder.value = '';
    select.append(placeholder);
    for (const fleet of view.fleetTargets) {
      const option = element('option', '', fleet.name);
      option.value = fleet.id;
      select.append(option);
    }
    select.value = view.selectedFleetId ?? '';
    select.addEventListener('change', () =>
      emit({ type: 'map-select-fleet', id: select.value }),
    );
    section.append(select);
    const target = view.fleetTargets.find(
      (fleet) => fleet.id === view.selectedFleetId,
    );
    if (target) {
      section.append(
        element(
          'p',
          '',
          Object.entries(target.ships)
            .filter(([, count]) => count > 0)
            .map(([ship, count]) => `${count} ${ship as ShipType}`)
            .join(', '),
        ),
      );
      section.append(
        button(`Join ${target.name}`, () =>
          emit({
            type: 'apply-ship-order',
            order: { kind: 'join-fleet', fleetId: target.id },
          }),
        ),
      );
    }
    if (!view.fleetTargets.length)
      section.append(element('p', '', 'No eligible positioned fleets.'));
  } else if (view.page === 'salvage') {
    section.append(
      element('h3', '', 'Deliberate salvage'),
      element('p', '', 'Choose an available wreck on the map or below.'),
    );
    const picker = element('select');
    picker.setAttribute('aria-label', 'Salvage wreck');
    const placeholder = element('option', '', 'Choose a wreck');
    placeholder.value = '';
    picker.append(placeholder);
    for (const wreck of model.wrecks.filter(
      (wreck) => !wreck.reservedBy && !wreck.towedBy && !wreck.yardId,
    )) {
      const option = element('option', '', `${wreck.ship.type} · ${wreck.id}`);
      option.value = wreck.id;
      picker.append(option);
    }
    picker.addEventListener('change', () => {
      if (picker.value)
        emit({
          type: 'apply-ship-order',
          order: { kind: 'salvage', wreckId: picker.value },
        });
    });
    section.append(picker);
  } else
    section.append(
      element('h3', '', view.page === 'patrol' ? 'Patrol' : 'Colonize'),
      element(
        'p',
        '',
        view.page === 'patrol'
          ? 'Choose the Patrol center on the map. Travel there before patrolling.'
          : 'Choose a known uninhabited planet on the map.',
      ),
    );
  return section;
}
