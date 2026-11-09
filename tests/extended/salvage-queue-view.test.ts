// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { renderSalvageSelection } from '../../src/client/views/SalvageView.js';
import { renderDecisions } from '../../src/client/views/decisions/EmpireView.js';
import { salvageState } from '../fixtures/salvage.js';

describe('bargningsko', () => {
  it('offers queueing on a discovered wreck and shows the assigned queue entry in Decisions', () => {
    const state = salvageState();
    const model = new AppModel(undefined, {
      load: () => ({ lastPlayed: '2026-10-30', state }),
      save() {},
      clear() {},
    });
    model.startSlot(1);
    model.selectSalvage('advanced-wreck');
    const emit = vi.fn();
    const selection = renderSalvageSelection(model.snapshot, emit)!;
    const queueButton = [...selection.querySelectorAll('button')].find(
      (item) => item.textContent === 'Add to Salvage queue',
    )!;
    queueButton.click();
    expect(emit).toHaveBeenCalledWith({
      type: 'add-salvage-queue',
      wreckId: 'advanced-wreck',
    });
    const game = Game.restore(state);
    game.addWreckToSalvageQueue('advanced-wreck');
    const page = renderDecisions(
      { ...model.snapshot, salvageQueue: game.salvageQueue },
      emit,
    );
    expect(page.textContent).toContain('Salvage queue');
    expect(page.textContent).toContain('Exploration ship wreck');
    expect(page.textContent).toContain('Assigned to Home Fleet');
    page
      .querySelector<HTMLButtonElement>(
        '[aria-label="Remove Exploration ship wreck from Salvage queue"]',
      )!
      .click();
    expect(emit).toHaveBeenCalledWith({
      type: 'remove-salvage-queue',
      wreckId: 'advanced-wreck',
    });
  });
});
