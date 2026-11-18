import type { AppReadModel } from '../../../app/models/AppModel.js';
import type { IntentHandler } from '../../../app/views/ViewContracts.js';
import { button, element } from '../../../common/dom.js';
import {
  BOARDING_INTERIOR_TYPES,
  DEFAULT_TEST_BOARDING_SELECTION,
  type TestBoardingSelection,
} from '../../../boarding/models/index.js';
import type { CombatShipType } from '../../../space-battle/models/index.js';

/** valbar-roll-i-testbordning: selections survive page re-rendering. */
let testBoardingSelection: TestBoardingSelection =
  DEFAULT_TEST_BOARDING_SELECTION;

function testBoardingOptions(): HTMLElement {
  const options = element('div', 'test-boarding-options');
  const role = element('select', 'test-boarding-role');
  role.setAttribute('aria-label', 'Boarding role');
  for (const [value, label] of [
    ['attacker', 'Attack from Raptor'],
    ['defender', 'Defend against Space pirate'],
  ]) {
    const option = element('option', '', label);
    option.value = value!;
    role.append(option);
  }
  role.value = testBoardingSelection.role;
  role.addEventListener('change', () => {
    testBoardingSelection = {
      ...testBoardingSelection,
      role: role.value as TestBoardingSelection['role'],
    };
  });
  const ship = element('select', 'test-boarding-ship');
  ship.setAttribute('aria-label', 'Boarded ship');
  for (const type of BOARDING_INTERIOR_TYPES) {
    const option = element('option', '', type);
    option.value = type;
    ship.append(option);
  }
  ship.value = testBoardingSelection.ship;
  ship.addEventListener('change', () => {
    testBoardingSelection = {
      ...testBoardingSelection,
      ship: ship.value as CombatShipType,
    };
  });
  options.append(role, ship);
  return options;
}

export function renderSaveSlots(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement {
  const page = element('section', 'save-page');
  const intro = element('div', 'save-intro');
  intro.append(element('h1', '', 'Saved games'));
  const tests = element('details', 'save-tests');
  tests.append(element('summary', '', 'Test modes'));
  const testContent = element('div', 'save-test-content');
  const battle = element('div', 'save-test-mode');
  battle.append(button('Test battle', () => emit({ type: 'test-battle' })));
  const boarding = element('div', 'save-test-mode');
  boarding.append(
    button('Test boarding', () =>
      emit({ type: 'test-boarding', selection: testBoardingSelection }),
    ),
    testBoardingOptions(),
  );
  const factories = element('div', 'save-test-mode');
  factories.append(
    button('Factory screens', () => emit({ type: 'test-factory-screens' })),
  );
  testContent.append(battle, boarding, factories);
  tests.append(testContent);
  intro.append(tests);
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
            ? `Round ${slot.round}`
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
