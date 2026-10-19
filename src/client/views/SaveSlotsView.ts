import type { AppReadModel } from '../models/AppModel.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

export function renderSaveSlots(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const page = element('section', 'save-page');
  const intro = element('div', 'save-intro');
  intro.append(
    element('p', 'coordinate-label', 'YOUR NEXT EXPEDITION'),
    element('h1', '', 'Saved games'),
    element(
      'p',
      'muted-note',
      'Choose a slot to begin or continue your empire.',
    ),
    element(
      'p',
      'save-storage-note',
      'Progress is saved automatically in this browser.',
    ),
  );
  const grid = element('div', 'save-grid');
  for (const slot of model.saveSlots) {
    const card = element('article', 'save-card');
    card.setAttribute('aria-label', `Save slot ${slot.id}`);
    card.dataset.slot = String(slot.id);
    const heading = element('div', 'save-card-heading');
    heading.append(
      element('h2', '', `Slot ${slot.id}`),
      element(
        'span',
        'pill',
        slot.error
          ? 'Unavailable'
          : slot.lastPlayed
            ? `Year ${slot.round}`
            : 'Empty slot',
      ),
    );
    const preview = element('div', 'save-map-preview');
    preview.dataset.previewSlot = String(slot.id);
    preview.setAttribute('role', 'img');
    preview.setAttribute(
      'aria-label',
      slot.lastPlayed
        ? `Explored space in slot ${slot.id}: ${slot.cells.length} hexes`
        : `Slot ${slot.id}: no explored space yet`,
    );
    if (!slot.lastPlayed)
      preview.append(
        element('span', 'save-empty-mark', '✦'),
        element('p', '', slot.error ? 'Map unavailable' : 'An empire awaits'),
      );
    const played = element('p', 'save-last-played');
    if (slot.lastPlayed) {
      const time = element(
        'time',
        '',
        new Intl.DateTimeFormat('en', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(slot.lastPlayed)),
      );
      time.dateTime = slot.lastPlayed;
      played.append('Last played ', time);
    } else played.textContent = slot.error ?? 'Last played: Never';
    const actions = element('div', 'save-actions');
    const start = button(
      slot.lastPlayed ? 'Continue game' : 'Start game',
      () => emit({ type: 'start-slot', id: slot.id }),
      'button save-start',
    );
    start.disabled = slot.error !== null;
    const clear = button(
      'Clear slot',
      () => emit({ type: 'request-clear-slot', id: slot.id }),
      'button save-clear',
    );
    clear.disabled = !slot.lastPlayed && !slot.error;
    actions.append(start, clear);
    card.append(heading, preview, played, actions);
    grid.append(card);
  }
  page.append(intro, grid);
  return page;
}

export function clearSlotDialog(
  slot: number,
  emit: IntentHandler,
): HTMLDialogElement {
  const dialog = element('dialog', 'clear-slot-dialog');
  dialog.setAttribute('aria-labelledby', 'clear-slot-title');
  dialog.setAttribute('aria-describedby', 'clear-slot-warning');
  const title = element('h2', '', `Clear slot ${slot}?`);
  title.id = 'clear-slot-title';
  const warning = element(
    'p',
    '',
    'All progress in this slot will be permanently deleted. This cannot be undone.',
  );
  warning.id = 'clear-slot-warning';
  const actions = element('div', 'save-actions');
  const cancel = button(
    'Cancel',
    () => emit({ type: 'cancel-clear-slot' }),
    'button',
  );
  cancel.autofocus = true;
  actions.append(
    cancel,
    button(
      'Delete saved game',
      () => emit({ type: 'confirm-clear-slot' }),
      'button save-clear',
    ),
  );
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    emit({ type: 'cancel-clear-slot' });
  });
  dialog.append(title, warning, actions);
  return dialog;
}
