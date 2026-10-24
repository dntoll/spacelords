// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppView } from '../../src/client/views/AppView.js';

describe('handelser / arsrundor-och-order', () => {
  it('returns directly to planning and allows another turn without acknowledgement', () => {
    const game = new Game(createExampleGalaxy());
    game.startTurn();
    game.finishTurn();
    expect(game.phase).toBe('planning');
    expect(() => game.startTurn()).not.toThrow();
  });
  it('publishes one useful arrival when the destination is reached, without movement noise', () => {
    const game = new Game(createExampleGalaxy());
    game.setDestination('fleet-home', new HexCoordinate(7, 0));
    for (const frame of game.startTurn()) game.applyFrame(frame);
    expect(game.events).toHaveLength(0);
    game.finishTurn();
    for (const frame of game.startTurn()) game.applyFrame(frame);
    const arrivals = game.events.filter((event) =>
      /arrived|reached its destination/.test(event.text),
    );
    expect(arrivals).toHaveLength(1);
    expect(arrivals[0]!.text).toContain('Home Fleet');
    expect(arrivals[0]!.text).toContain('7,0');
    game.finishTurn();
    expect(
      game.events.filter((event) =>
        /arrived|reached its destination/.test(event.text),
      ),
    ).toHaveLength(1);
    expect(
      game.events.some((event) =>
        /moved to|revealed \d+ hexes/.test(event.text),
      ),
    ).toBe(false);
  });
  it('keeps arrivals in actual movement order before production events', () => {
    const game = new Game(createExampleGalaxy());
    game.transferShips('fleet-home', 'Fighter', 1, null);
    const scout = game.fleetSnapshots()[1]!;
    game.setDestination('fleet-home', new HexCoordinate(3, 0));
    game.setDestination(scout.id, new HexCoordinate(0, 1));
    game.scheduleBuild(game.galaxy.homePlanet, 'Research station');
    const frames = game.startTurn();
    game.applyFrame(frames[0]!);
    expect(game.events.map((event) => event.text)).toEqual([
      `${scout.name} arrived at Vesta.`,
    ]);
    for (const frame of frames.slice(1)) game.applyFrame(frame);
    expect(game.events[1]!.text).toBe('Home Fleet arrived at HEX 3,0.');
    game.finishTurn();
    expect(game.events[2]!.text).toContain('Research station was completed');
  });
  it('resumes older saved summaries as planning without losing events', () => {
    const game = new Game(createExampleGalaxy());
    game.startTurn();
    game.finishTurn();
    const state = game.exportState();
    const restored = Game.restore({
      ...state,
      phase: 'summary',
      events: [
        ...state.events,
        { id: 'old-step', round: 1, text: 'Fleet Home Fleet moved to 2,0.' },
        {
          id: 'old-scan',
          round: 1,
          text: 'Exploration from Home Fleet revealed 3 hexes.',
        },
      ],
    });
    expect(restored.phase).toBe('planning');
    expect(restored.events).toEqual(state.events);
  });
  it('shows a persistent console ordered by year instead of a dialog and disables End turn during animation', async () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const model = new AppModel();
    model.setDestination('fleet-home', 0, 1);
    model.select(new HexCoordinate(-2, 0));
    let resume!: () => void;
    const animation = new Promise<void>((resolve) => {
      resume = resolve;
    });
    const view = new AppView(root, () => ({
      render() {},
      dispose() {},
      animateTurnStep: () => animation,
    }));
    for (const decision of model.snapshot.decisions)
      model.skipDecision(decision.id);
    const controller = new AppController(model, view);
    controller.start();
    const end = root.querySelector<HTMLButtonElement>('.end-turn')!;
    end.click();
    expect(root.querySelector<HTMLButtonElement>('.end-turn')!.disabled).toBe(
      true,
    );
    resume();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(root.textContent).not.toContain('Continue');
    const log = root.querySelector('[role="log"]')!;
    expect(log).not.toBeNull();
    expect(log.textContent).toContain('Vesta');
    expect(
      [...log.querySelectorAll<HTMLElement>('[data-event-id]')].map(
        (item) => item.dataset.eventId,
      ),
    ).toEqual(model.snapshot.events.map((event) => event.id));
    expect(root.querySelector<HTMLButtonElement>('.end-turn')!.disabled).toBe(
      false,
    );
    controller.dispose();
  });
  it('bounds the visible history and preserves focus and reading position when new events arrive', () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const model = new AppModel();
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    model.select(new HexCoordinate(-2, 0));
    const events = Array.from({ length: 120 }, (_, i) => ({
      id: `event-${i}`,
      round: i + 1,
      text: `Event ${i}`,
    }));
    view.render({ ...model.snapshot, events });
    const log = root.querySelector<HTMLElement>('[role="log"]')!;
    expect(log.querySelectorAll('[data-event-id]')).toHaveLength(100);
    expect(log.querySelector('[data-event-id]')!.textContent).toBe('Event 20');
    Object.defineProperties(log, {
      scrollHeight: { value: 1000 },
      clientHeight: { value: 60 },
    });
    log.scrollTop = 100;
    log.focus();
    view.render({
      ...model.snapshot,
      events: [...events, { id: 'new', round: 121, text: 'New arrival' }],
    });
    expect(document.activeElement).toBe(log);
    expect(log.scrollTop).toBe(100);
    expect(log.querySelectorAll('[data-event-id]')).toHaveLength(100);
    expect(log.querySelector('[data-event-id]')!.textContent).toBe('Event 21');
    expect(events).toHaveLength(120);
    view.dispose();
  });
});

it('utvikbara-events / senaste-aret-i-events: retains every event in the latest year even when it exceeds the history limit', () => {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const model = new AppModel();
  model.openDecisions();
  const view = new AppView(root, () => ({ render() {}, dispose() {} }));
  const events = Array.from({ length: 140 }, (_, index) => ({
    id: `latest-${index}`,
    round: 20,
    text: `Event ${index}`,
  }));
  view.render({ ...model.snapshot, events });
  expect(root.querySelectorAll('[data-event-id]')).toHaveLength(140);
  expect(root.querySelector('.turn-console')!.tagName).toBe('DETAILS');
  expect(root.querySelector('.turn-console summary')).not.toBeNull();
  view.dispose();
});

it('rundkontroller-pa-fler-vyer: exposes Events and End turn on Research and planet pages and keeps the view through a turn', () => {
  for (const screen of ['research', 'planet'] as const) {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const model = new AppModel();
    if (screen === 'research') model.openResearch();
    else model.openPlanet();
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    view.render(model.snapshot);
    expect(root.querySelector('.turn-console')).not.toBeNull();
    expect(root.querySelector('.end-turn')).not.toBeNull();
    for (const frame of model.startTurn()) model.applyTurnFrame(frame);
    model.finishTurn();
    expect(model.snapshot.screen).toBe(screen);
    view.dispose();
  }
});
