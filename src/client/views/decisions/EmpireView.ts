import type { AppReadModel } from '../../models/AppModel.js';
import { needsAttention } from '../../models/Decisions.js';
import type { IntentHandler } from '../ViewContracts.js';
import { button, element } from '../dom.js';
import { bindQueueOrder, decorateQueueRow } from '../QueueView.js';
import type { PlanetQueueKind } from '../../models/PlanetQueues.js';

function renderPlanetQueue(
  model: AppReadModel,
  emit: IntentHandler,
  kind: PlanetQueueKind,
): HTMLElement {
  const section = element('section', 'empire-card planet-queue-card');
  const title =
    kind === 'exploration' ? 'Exploration queue' : 'Colonization queue';
  section.append(element('h2', '', title));
  const items = model.planetQueues[kind];
  if (!items.length)
    section.append(
      element(
        'p',
        'muted-note',
        kind === 'exploration'
          ? 'Add discovered planets when you want an Exploration ship to survey them.'
          : 'Add explored planets when you want a Colony ship to settle them.',
      ),
    );
  const list = element('ol', 'planet-queue-list');
  const locked = !['planning', 'interrupted'].includes(model.phase);
  for (const item of items) {
    const row = element('li');
    row.append(
      element('strong', '', item.name),
      element(
        'span',
        'muted-note',
        item.assignedFleetName
          ? `Assigned to ${item.assignedFleetName}`
          : 'Waiting for an available ship',
      ),
    );
    if (kind === 'colonization' && !item.assignedFleetId) {
      const build = button('Build Colony ship', () =>
        emit({ type: 'request-colony-ship', planetId: item.planetId }),
      );
      build.disabled = locked || !!item.colonyShipBuildReason;
      if (item.colonyShipBuildReason) build.title = item.colonyShipBuildReason;
      row.append(build);
    }
    const remove = button(
      `Remove ${item.name} from ${title}`,
      () =>
        emit({
          type: 'remove-planet-queue',
          kind,
          planetId: item.planetId,
        }),
      'queue-icon-button',
    );
    remove.textContent = '×';
    remove.title = `Remove ${item.name} from ${title}`;
    remove.disabled = locked;
    row.append(remove);
    decorateQueueRow(row, item.planetId, item.name, locked);
    list.append(row);
  }
  bindQueueOrder(
    list,
    items.map((item) => item.planetId),
    (planetId, index) =>
      emit({ type: 'move-planet-queue', kind, planetId, index }),
    locked,
  );
  section.append(list);
  return section;
}

function renderAttackQueue(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const section = element('section', 'empire-card planet-queue-card');
  section.append(element('h2', '', 'Attack queue'));
  if (!model.attackQueue.length)
    section.append(
      element(
        'p',
        'muted-note',
        'Add visible pirates when you want a Fighter fleet to attack them.',
      ),
    );
  const list = element('ol', 'planet-queue-list');
  const locked = !['planning', 'interrupted'].includes(model.phase);
  for (const item of model.attackQueue) {
    const row = element('li');
    row.append(
      element('strong', '', item.name),
      element(
        'span',
        'muted-note',
        item.assignedFleetName
          ? `Assigned to ${item.assignedFleetName}`
          : 'Waiting for an available Fighter fleet',
      ),
    );
    const remove = button(
      `Remove ${item.name} from Attack queue`,
      () => emit({ type: 'remove-attack-queue', pirateId: item.pirateId }),
      'queue-icon-button',
    );
    remove.textContent = '×';
    remove.disabled = locked;
    row.append(remove);
    decorateQueueRow(row, item.pirateId, item.name, locked);
    list.append(row);
  }
  bindQueueOrder(
    list,
    model.attackQueue.map((item) => item.pirateId),
    (pirateId, index) => emit({ type: 'move-attack-queue', pirateId, index }),
    locked,
  );
  section.append(list);
  return section;
}

export function renderDecisions(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const page = element('section', 'empire-page decisions-page');
  page.append(element('h1', '', 'Decisions'));
  const panel = element('div', 'empire-content');

  if (!model.decisions.length)
    panel.append(element('p', '', 'No decisions need your attention.'));
  for (const item of model.decisions) {
    const card = element('article', 'empire-card');
    card.dataset.decisionId = item.id;
    card.append(element('h2', '', item.label));
    if (item.muted)
      card.append(element('p', 'muted-note', 'Muted for future turns'));
    else if (item.skipped)
      card.append(element('p', 'muted-note', 'Skipped this turn'));
    const review = button('Review', () =>
      emit({ type: 'open-decision', id: item.id }),
    );
    review.disabled = !item.current;
    card.append(review);
    const skip = button('Skip this turn', () =>
      emit({ type: 'skip-decision', id: item.id }),
    );
    skip.disabled = item.skipped || item.muted || model.phase !== 'planning';
    const mute = button(item.muted ? 'Unmute' : 'Mute', () =>
      emit({
        type: item.muted ? 'unmute-decision' : 'mute-decision',
        id: item.id,
      }),
    );
    mute.title = item.muted
      ? 'Restore reminders for this decision'
      : 'Silence this decision until you unmute it';
    mute.disabled = model.phase !== 'planning';
    card.append(skip, mute);
    panel.append(card);
  }
  panel.append(
    renderPlanetQueue(model, emit, 'exploration'),
    renderPlanetQueue(model, emit, 'colonization'),
    renderAttackQueue(model, emit),
  );
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
  const list = element('ul', 'decision-warning-list');
  for (const decision of model.decisions.filter(needsAttention)) {
    const row = element('li');
    row.dataset.decisionId = decision.id;
    const review = button('Review', () => {
      emit({ type: 'cancel-end-turn' });
      emit({ type: 'open-decision', id: decision.id });
    });
    review.setAttribute('aria-label', `Review ${decision.label}`);
    row.append(element('span', '', decision.label), review);
    list.append(row);
  }
  dialog.append(
    list,
    button('End turn anyway', () => emit({ type: 'confirm-end-turn' })),
    button('Cancel', () => emit({ type: 'cancel-end-turn' })),
  );
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    emit({ type: 'cancel-end-turn' });
  });
  return dialog;
}
