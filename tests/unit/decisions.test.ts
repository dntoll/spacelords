// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppView } from '../../src/client/views/AppView.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { BrowserSaveRepository } from '../../src/client/storage/BrowserSaveRepository.js';

describe('beslutslista / rundvarning / hoppa-over-beslut', () => {
  it('opens the selected context and skips only until the next turn, including after saving', () => {
    const model = new AppModel();
    expect(model.snapshot.decisions).toHaveLength(3);
    model.openDecision('research-empty');
    expect(model.snapshot.screen).toBe('research');
    model.openDecision('building-empty-sol-0');
    expect(model.snapshot.screen).toBe('planet');
    model.openDecision('fleet-idle-fleet-home');
    expect(model.snapshot.screen).toBe('fleets');
    for (const item of model.snapshot.decisions) model.skipDecision(item.id);
    expect(model.requestEndTurn()).toBe(true);
    for (const frame of model.startTurn()) model.applyTurnFrame(frame);
    model.finishTurn();
    expect(model.snapshot.decisions.every((d) => !d.skipped)).toBe(true);
  });
  it('shows one summary warning and advances only after confirmation', () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const model = new AppModel();
    new AppController(
      model,
      new AppView(root, () => ({ render() {}, dispose() {} })),
    ).start();
    root.querySelector<HTMLButtonElement>('.end-turn')!.click();
    expect(model.snapshot.round).toBe(1);
    expect(root.querySelector('dialog[open]')?.textContent).toContain(
      'Choose research',
    );
    [...root.querySelectorAll('button')]
      .find((b) => b.textContent === 'Cancel')!
      .click();
    expect(root.querySelector('dialog')).toBeNull();
    root.querySelector<HTMLButtonElement>('.end-turn')!.click();
    [...root.querySelectorAll('button')]
      .find((b) => b.textContent === 'End turn anyway')!
      .click();
    expect(model.snapshot.round).toBe(2);
  });
});

describe('engangsreset-ekonomi / tre-sparplatser', () => {
  it('removes only legacy slots and never deletes new games or unrelated storage', () => {
    const stored = new Map<string, string>([
      ['spacelords.save.v1.1', 'legacy'],
      ['another-app', 'keep'],
    ]);
    const storage = {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => {
        stored.set(key, value);
      },
      removeItem: (key: string) => {
        stored.delete(key);
      },
    };
    const repo = new BrowserSaveRepository(storage),
      model = new AppModel(undefined, repo);
    expect(stored.has('spacelords.save.v1.1')).toBe(false);
    model.startSlot(1);
    model.build('Iron mine');
    model.save();
    const reloaded = new AppModel(
      undefined,
      new BrowserSaveRepository(storage),
    );
    reloaded.startSlot(1);
    reloaded.openPlanet();
    expect(reloaded.snapshot.planet!.projects[0]!.type).toBe('Iron mine');
    expect(stored.get('another-app')).toBe('keep');
  });
});
