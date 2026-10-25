// @vitest-environment jsdom
import { turnFrames } from '../fixtures/turn-steps.js';
import { describe, expect, it, vi } from 'vitest';
import { decisionScreen } from '../../src/client/models/Decisions.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppView } from '../../src/client/views/AppView.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { BrowserSaveRepository } from '../../src/client/storage/BrowserSaveRepository.js';
import { Game } from '../../src/client/models/Game.js';
import {
  researchStationState,
  researchStationModel,
} from '../fixtures/research-station.js';

describe('beslutslista / rundvarning / hoppa-over-beslut', () => {
  it('opens the selected context and skips only until the next turn, including after saving', () => {
    const model = researchStationModel();
    expect(model.snapshot.decisions).toHaveLength(3);
    model.openDecision('research-empty');
    expect(model.snapshot.screen).toBe('research');
    model.openDecision('building-empty-sol-0');
    expect(model.snapshot.screen).toBe('production');
    model.openDecision('fleet-idle-fleet-home');
    expect(model.snapshot.screen).toBe('fleets');
    for (const item of model.snapshot.decisions) model.skipDecision(item.id);
    expect(model.requestEndTurn()).toBe(true);
    for (const frame of turnFrames(model)) model.applyTurnFrame(frame);
    model.finishTurn();
    expect(model.snapshot.decisions.every((d) => !d.skipped)).toBe(true);
  });
  it('shows one summary warning and advances only after confirmation', async () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const model = researchStationModel();
    model.openDecisions();
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
    await vi.waitFor(() => expect(model.snapshot.round).toBe(2));
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

describe('tysta-beslut', () => {
  it('keeps a recurring decision muted after it disappears and becomes relevant again', () => {
    const game = Game.restore(researchStationState());
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
  it('loads older saves without muted preferences and keeps warnings active', () => {
    const state = Game.restore(researchStationState()).exportState();
    delete (state as { mutedDecisions?: unknown }).mutedDecisions;
    const restored = Game.restore(
      JSON.parse(JSON.stringify(state)) as ReturnType<Game['exportState']>,
    );
    expect(restored.decisions).toHaveLength(3);
    expect(restored.decisions.every((d) => !d.muted)).toBe(true);
  });
  it('keeps muted decisions quiet across turns and restores their warnings on unmute', () => {
    const model = researchStationModel();
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
    for (const frame of turnFrames(model)) model.applyTurnFrame(frame);
    model.finishTurn();
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

  it('routes Mute and Unmute through Decisions and excludes muted items from the counter', () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const model = researchStationModel();
    model.openDecisions();
    new AppController(
      model,
      new AppView(root, () => ({ render() {}, dispose() {} })),
    ).start();
    const card = () =>
      root.querySelector('[data-decision-id="fleet-idle-fleet-home"]')!;
    const control = (label: string) =>
      [...card().querySelectorAll('button')].find(
        (b) => b.textContent === label,
      )!;
    control('Mute').click();
    expect(card().textContent).toContain('Muted for future turns');
    expect(root.querySelector('.decision-counter')?.textContent).toBe(
      'Decisions (2)',
    );
    control('Unmute').click();
    expect(root.querySelector('.decision-counter')?.textContent).toBe(
      'Decisions (3)',
    );
  });
});

it('beslutsmarkering-pa-flikar: marks every resolving tab and updates markers after mute, skip and review', () => {
  const model = researchStationModel();
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const controller = new AppController(
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

it('tystade-beslut-sist: keeps active and skipped decisions before muted decisions, including resolved reminders', () => {
  const game = Game.restore(researchStationState());
  game.muteDecision('research-empty');
  expect(game.decisions.map((decision) => decision.id)).toEqual([
    'building-empty-sol-0',
    'fleet-idle-fleet-home',
    'research-empty',
  ]);
  game.skipDecision('building-empty-sol-0');
  game.selectResearch('Colony ship factory');
  expect(game.decisions.at(-1)).toMatchObject({
    id: 'research-empty',
    muted: true,
    current: false,
  });
  game.unmuteDecision('research-empty');
  expect(game.decisions.map((decision) => decision.id)).toEqual([
    'building-empty-sol-0',
    'fleet-idle-fleet-home',
  ]);
});

it('beslutslista: removes Next decision and retains Review on each decision', () => {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const model = researchStationModel();
  model.openDecisions();
  const controller = new AppController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  expect(root.querySelector('[aria-label="Next decision"]')).toBeNull();
  expect(
    root.querySelectorAll('[data-decision-id] [aria-label="Review"]'),
  ).toHaveLength(3);
  controller.dispose();
});

it.each([
  ['research-empty', 'research', 'research'],
  ['fleet-idle-home', 'fleet', 'fleets'],
  ['route-idle-one', 'route', 'route'],
  ['supply-sol-0', 'planet', 'route'],
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
  const model = researchStationModel();
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
  ).toContain('Choose a technology');
  expect(
    root.querySelector('.research-tree-viewport.decision-target'),
  ).not.toBeNull();
  model.openProduction();
  view.render(model.snapshot);
  expect(
    root.querySelector('[aria-label="Decisions in this view"]')?.textContent,
  ).toContain('queue a build');
  model.muteDecision('building-empty-sol-0');
  view.render(model.snapshot);
  expect(
    root.querySelector('[aria-label="Decisions in this view"]'),
  ).toBeNull();
  view.dispose();
});
