import type { AppReadModel } from '../models/AppModel.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

export function discoveryDialog(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLDialogElement {
  const dialog = element('dialog', 'decision-dialog discovery-dialog');
  const discoveries = model.interruption!.discoveries;
  const title = discoveries.some((discovery) => discovery.kind === 'pirate')
    ? 'Pirate ship in sight'
    : 'New discoveries';
  dialog.setAttribute('aria-label', title);
  dialog.append(element('h2', '', title));
  const list = element('ul');
  for (const discovery of discoveries) {
    const fleet = model.fleets.find((fleet) => fleet.id === discovery.fleetId);
    list.append(
      element(
        'li',
        '',
        `${discovery.kind === 'star' ? 'Star explored' : discovery.kind === 'planet' ? 'Planet discovered' : 'Pirate ship in sight'}: ${discovery.name} · HEX ${discovery.position.q},${discovery.position.r}${fleet ? ` · ${fleet.name}` : ''}`,
      ),
    );
  }
  dialog.append(
    list,
    element(
      'p',
      '',
      'The year is paused. Fleets already sharing a hex will fight before the next movement.',
    ),
    button('Handle', () => emit({ type: 'handle-discoveries' })),
    button('Ignore', () => emit({ type: 'ignore-discoveries' })),
  );
  dialog.addEventListener('cancel', (event) => event.preventDefault());
  return dialog;
}

export function discoveryControls(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const bar = element('section', 'discovery-controls');
  bar.setAttribute('aria-label', 'Interrupted year');
  bar.append(element('strong', '', `Year ${model.round} paused`));
  const selected = model.fleets.find((fleet) => fleet.id === model.mapFleetId);
  if (selected)
    bar.append(
      element(
        'span',
        '',
        `${selected.name} · ${selected.remainingMovement ?? 0} hex remaining`,
      ),
    );
  if (!model.interruption!.otherFleets)
    bar.append(
      button('Give orders to other fleets', () =>
        emit({ type: 'allow-other-fleet-orders' }),
      ),
    );
  else {
    const select = element('select');
    select.setAttribute('aria-label', 'Fleet to give orders');
    const placeholder = element('option', '', 'Choose fleet');
    placeholder.value = '';
    select.append(placeholder);
    for (const fleet of model.fleets.filter((fleet) => fleet.position)) {
      const option = element(
        'option',
        '',
        `${fleet.name} · ${fleet.remainingMovement ?? 0} hex remaining${fleet.routeId ? ' · Trade route orders locked' : ''}`,
      );
      option.value = fleet.id;
      option.selected = model.mapFleetId === fleet.id;
      select.append(option);
    }
    select.addEventListener('change', () => {
      if (select.value) emit({ type: 'open-fleet', id: select.value });
    });
    bar.append(select);
  }
  bar.append(button('Continue', () => emit({ type: 'continue-turn' })));
  return bar;
}
