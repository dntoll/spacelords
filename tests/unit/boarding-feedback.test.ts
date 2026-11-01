// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import type { SaveRepository } from '../../src/client/models/SaveRepository.js';
import { renderSaveSlots } from '../../src/client/views/SaveSlotsView.js';
import type { AppIntent } from '../../src/client/views/ViewContracts.js';

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

it('fristaende-bordningsprototyp: starts and closes from the menu without writing a save slot', () => {
  vi.useFakeTimers();
  const save = vi.fn();
  const repo: SaveRepository = {
    load: () => null,
    save,
    clear: vi.fn(),
  };
  const model = new AppModel(undefined, repo);
  model.startSlot(1);
  model.openSaves();
  save.mockClear();
  let emit: (intent: AppIntent) => void = () => {};
  const render = vi.fn();
  const controller = new AppController(model, {
    bind: (handler) => {
      emit = handler;
    },
    render,
    dispose() {},
  });
  controller.start();
  const menu = renderSaveSlots(model.snapshot, emit);
  document.body.append(menu);
  const control = [...menu.querySelectorAll('button')].find(
    (node) => node.textContent === 'Test boarding (cheat)',
  );
  expect(control).toBeDefined();
  control!.click();
  expect(model.snapshot.screen).toBe('saves');
  expect(model.snapshot.boardingBattle?.phase).toBe('fighting');
  model.save();
  emit({ type: 'close-boarding' });
  expect(model.snapshot.boardingBattle).toBeNull();
  expect(save).not.toHaveBeenCalled();
  expect(render).toHaveBeenCalled();
  controller.dispose();
});
