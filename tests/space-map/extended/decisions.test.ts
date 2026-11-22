// @vitest-environment jsdom
import { completeConstruction } from '../../fixtures/construction.js';
import { turnFrames } from '../../fixtures/turn-steps.js';
import { describe, expect, it, vi } from 'vitest';
import {
  decisionScreen,
} from '../../../src/client/space-map/models/Decisions.js';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { BrowserSaveRepository } from '../../../src/client/space-map/storage/BrowserSaveRepository.js';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { researchStationState } from '../../fixtures/research-station.js';
import { researchStationModel } from '../../fixtures/research-station-model.js';

describe('beslutslista / rundvarning / hoppa-over-beslut', () => {
  it.each([
    ['research-empty', 'research'],
    ['building-empty-sol-0', 'production'],
    ['fleet-idle-fleet-home', 'fleets'],
  ] as const)(
    'direkt-atgard-fran-rundvarning: %s opens %s without advancing the year',
    (id, screen) => {
      const state = researchStationState({ shipFactory: true });
      const model = new AppModel(undefined, {
        load: () => ({ lastPlayed: '2026-10-30', state }),
        save() {},
        clear() {},
      });
      model.startSlot(1);
      const root = document.createElement('div');
      document.body.replaceChildren(root);
      const controller = new MasterController(
        model,
        new AppView(root, () => ({ render() {}, dispose() {} })),
      );
      controller.start();
      root.querySelector<HTMLButtonElement>('.end-turn')!.click();
      const warning = root.querySelector<HTMLDialogElement>(
        'dialog[aria-label="Decisions remaining"]',
      )!;
      const row = [...warning.querySelectorAll('li')].find((item) =>
        item.textContent?.includes(
          model.snapshot.decisions.find((item) => item.id === id)!.label,
        ),
      )!;
      expect(row.querySelector('button')).not.toBeNull();
      row.querySelector<HTMLButtonElement>('button')!.click();
      expect(model.snapshot.pendingEndTurn).toBe(false);
      expect(model.snapshot.screen).toBe(screen);
      expect(model.snapshot.round).toBe(state.round);
      expect(root.querySelector('dialog')).toBeNull();
      if (screen === 'research')
        expect(root.querySelector('.research-tree-viewport')).not.toBeNull();
      if (screen === 'fleets')
        expect(model.snapshot.mapFleetId).toBe('fleet-home');
      if (screen === 'production')
        expect(model.snapshot.planet?.id).toBe('sol-0');
      expect(model.snapshot.decisions.some((item) => item.id === id)).toBe(
        true,
      );
      controller.dispose();
    },
  );

  it('shows one summary warning and advances only after confirmation', async () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const model = researchStationModel({ shipFactory: true });
    model.openDecisions();
    new MasterController(
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
    await vi.waitFor(() => expect(model.snapshot.round).toBe(2));
  });
});


describe('tysta-beslut', () => {
  it('keeps a recurring decision muted after it disappears and becomes relevant again', () => {
    const game = Game.restore(researchStationState({ shipFactory: true }));
    game.muteDecision('research-empty');
    game.selectResearch('Colony ship factory');
    expect(game.decisions.find((d) => d.id === 'research-empty')!.current).toBe(
      false,
    );
    game.removeResearch('Rocket engine factory');
    game.removeResearch('Telescope I factory');
    expect(game.decisions.find((d) => d.id === 'research-empty')).toMatchObject(
      { current: true, muted: true },
    );
    game.unmuteDecision('research-empty');
    expect(game.decisions.find((d) => d.id === 'research-empty')).toMatchObject(
      { current: true, muted: false, skipped: false },
    );
  });
  it('keeps muted decisions quiet across turns and restores their warnings on unmute', () => {
    const model = researchStationModel({ shipFactory: true });
    for (const decision of model.snapshot.decisions)
      model.muteDecision(decision.id);
    expect(model.snapshot.decisions.every((d) => d.muted)).toBe(true);
    expect(model.requestEndTurn()).toBe(true);
    for (const frame of turnFrames(model)) model.applyTurnFrame(frame);
    model.finishTurn();
    expect(model.snapshot.decisions.every((d) => d.muted && !d.skipped)).toBe(
      true,
    );
    expect(model.requestEndTurn()).toBe(true);
    model.unmuteDecision('fleet-idle-fleet-home');
    expect(model.requestEndTurn()).toBe(false);
    model.openDecision();
    expect(model.snapshot.screen).toBe('fleets');
    expect(
      model.snapshot.decisions.find((d) => d.id === 'fleet-idle-fleet-home')!
        .muted,
    ).toBe(false);
  });

  it('persists per save slot and keeps temporarily resolved decisions available to unmute', () => {
    const stored = new Map<string, string>();
    const repo = new BrowserSaveRepository({
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => {
        stored.set(key, value);
      },
      removeItem: (key) => {
        stored.delete(key);
      },
    });
    const model = new AppModel(undefined, repo);
    model.startSlot(1);
    model.build('Research station');
    completeConstruction(model, 'Research station');
    model.muteDecision('research-empty');
    model.research('Colony ship factory');
    expect(
      model.snapshot.decisions.find((d) => d.id === 'research-empty'),
    ).toMatchObject({ muted: true, current: false });
    model.save();
    const reloaded = new AppModel(undefined, repo);
    reloaded.startSlot(1);
    expect(
      reloaded.snapshot.decisions.find((d) => d.id === 'research-empty'),
    ).toMatchObject({ muted: true, current: false });
    reloaded.unmuteDecision('research-empty');
    expect(
      reloaded.snapshot.decisions.some((d) => d.id === 'research-empty'),
    ).toBe(false);
    reloaded.openSaves();
    reloaded.startSlot(2);
    expect(reloaded.snapshot.decisions.every((d) => !d.muted)).toBe(true);
  });

});

it('beslutsmarkering-pa-flikar: marks every resolving tab and updates markers after mute, skip and review', () => {
  const model = researchStationModel({ shipFactory: true });
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const controller = new MasterController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  const marker = (screen: string) =>
    root.querySelector(`[data-screen="${screen}"] .nav-attention`);
  expect(marker('fleets')).not.toBeNull();
  expect(marker('research')).not.toBeNull();
  expect(marker('production')).not.toBeNull();
  expect(marker('route')).toBeNull();
  expect(marker('map')).toBeNull();
  model.muteDecision('fleet-idle-fleet-home');
  controller.start();
  expect(marker('fleets')).toBeNull();
  model.unmuteDecision('fleet-idle-fleet-home');
  model.openDecision('fleet-idle-fleet-home');
  controller.start();
  expect(model.snapshot.screen).toBe('fleets');
  expect(marker('fleets')).not.toBeNull();
  model.skipDecision('fleet-idle-fleet-home');
  controller.start();
  expect(marker('fleets')).toBeNull();
  controller.dispose();
});



it.each([
  ['research-empty', 'research', 'research'],
  ['fleet-idle-home', 'fleet', 'fleets'],
  ['staff-sol-0', 'planet', 'production'],
  ['production-sol-0', 'planet', 'production'],
  ['building-empty-sol-0', 'planet', 'production'],
] as const)(
  'beslutsmarkering-pa-flikar: %s belongs to %s decisions and highlights %s',
  (id, kind, expected) => {
    expect(decisionScreen({ id, kind, label: id })).toBe(expected);
  },
);

it('beslutsvagledning-i-vyn: explains the missing order and highlights its interactive target on each view with an attention marker', () => {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const model = researchStationModel({ shipFactory: true });
  const view = new AppView(root, () => ({ render() {}, dispose() {} }));
  model.openDecision('fleet-idle-fleet-home');
  view.render(model.snapshot);
  expect(
    root.querySelector('[aria-label="Decisions in this view"]')?.textContent,
  ).toContain('Home Fleet');
  expect(root.querySelector('.fleet-card.decision-target')).not.toBeNull();
  model.openResearch();
  view.render(model.snapshot);
  expect(
    root.querySelector('[aria-label="Decisions in this view"]')?.textContent,
  ).toContain('Choose research.');
  expect(
    root.querySelector('.research-tree-viewport.decision-target'),
  ).not.toBeNull();
  model.openProduction();
  view.render(model.snapshot);
  expect(
    root.querySelector('[aria-label="Decisions in this view"]')?.textContent,
  ).toContain('Tellus: choose production.');
  model.muteDecision('building-empty-sol-0');
  view.render(model.snapshot);
  expect(
    root.querySelector('[aria-label="Decisions in this view"]'),
  ).toBeNull();
  view.dispose();
});
