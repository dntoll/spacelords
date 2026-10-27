import type { AppReadModel } from '../models/AppModel.js';
import { needsAttention } from '../models/Decisions.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

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
  for (const decision of model.decisions.filter(needsAttention))
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
