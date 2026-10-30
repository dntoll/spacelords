// @vitest-environment jsdom
import { collectTurnFrames, turnFrames } from '../fixtures/turn-steps.js';
import { afterEach, describe, it, expect, vi } from 'vitest';
afterEach(() => vi.useRealTimers());
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../src/client/models/HexCoordinate.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppView } from '../../src/client/views/AppView.js';

describe('handelseannonsering / handelser-pa-kartan', () => {
  it('gemensamt-handelseflode: keeps interactive event choices above End turn when marker spacing exceeds the available height', () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const model = new AppModel();
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    const snapshot = {
      ...model.snapshot,
      camera: { ...model.snapshot.camera, center: { x: 0, y: 0 }, zoom: 1 },
      eventPlayback: {
        round: 1,
        events: [
          {
            id: 'interactive',
            round: 1,
            text: 'Wreck discovered.',
            position: new HexCoordinate(0, 0),
            decision: {
              title: 'Wreck discovered',
              details: ['A wreck is in sight.'],
              fleetId: 'fleet-home',
            },
          },
        ],
        index: 0,
        stage: 'awaiting-choice' as const,
      },
    };
    view.render(snapshot);
    vi.spyOn(
      root.querySelector<HTMLElement>('.map-container')!,
      'getBoundingClientRect',
    ).mockReturnValue(new DOMRect(0, 70, 667, 140));
    vi.spyOn(
      root.querySelector<HTMLButtonElement>('.end-turn')!,
      'getBoundingClientRect',
    ).mockReturnValue(new DOMRect(580, 270, 80, 44));
    const announcement = root.querySelector<HTMLElement>(
      '.event-announcement',
    )!;
    Object.defineProperties(announcement, {
      offsetWidth: { value: 635 },
      offsetHeight: { value: 80 },
    });
    view.render(snapshot);
    const center = Number.parseFloat(
      announcement.style.getPropertyValue('--event-origin-y'),
    );
    expect(center + announcement.offsetHeight / 2).toBeLessThanOrEqual(262);
    expect(announcement.querySelectorAll('button')).toHaveLength(2);
    view.dispose();
  });
  it('planetinformation-pa-kartan: returns immutable current, basic and hidden planet knowledge', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    state.colonies[0]![1].habitability = 73;
    const game = Game.restore(state);
    const home = game.planetKnowledge(game.galaxy.homePlanet.position)!;
    expect(home.habitability).toBe(73);
    expect(Object.isFrozen(home)).toBe(true);
    const planets = game.galaxy.systems.flatMap((system) => system.planets);
    const vesta = planets.find((planet) => planet.name === 'Vesta')!;
    expect(game.planetKnowledge(vesta.position)?.habitability).toBe(
      vesta.habitability,
    );
    const unknown = planets.find(
      (planet) => !state.explored.includes(planet.position.key),
    )!;
    expect(game.planetKnowledge(unknown.position)).toBeNull();
  });
  it('planetinformation-pa-kartan: reveals discovered planet facts and only Unexplored for unknown space', () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const model = new AppModel();
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    view.render(model.snapshot);
    expect(root.querySelector('.planet-map-info')?.textContent).toMatch(
      /Type: Temperate.*Habitability: \d+%/,
    );
    view.render({
      ...model.snapshot,
      selectedPlanetInfo: {
        ...model.snapshot.selectedPlanetInfo!,
        habitability: 72,
      },
    });
    expect(root.querySelector('.planet-map-info')?.textContent).toContain(
      'Habitability: 72%',
    );
    model.select(new HexCoordinate(0, 1));
    view.render(model.snapshot);
    expect(model.snapshot.selectedPlanetInfo).not.toBeNull();
    expect(root.querySelector('.planet-map-info')).not.toBeNull();
    const unknown = model.snapshot.cells.find(
      (cell) => !cell.explored && cell.object === null,
    )!;
    model.select(unknown.position);
    view.render(model.snapshot);
    expect(model.snapshot.selectedPlanetInfo).toBeNull();
    expect(root.querySelector('.selection-panel')?.textContent).toContain(
      'Unexplored',
    );
    expect(root.querySelector('.planet-map-info')).toBeNull();
    view.dispose();
  });
  it('gemensam-events-panel: remains attached and visible through map selection and all game screens', () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const model = new AppModel();
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    view.render(model.snapshot);
    const panel = root.querySelector<HTMLDetailsElement>('.turn-console')!;
    panel.open = true;
    const log = panel.querySelector<HTMLElement>('[role="log"]')!;
    log.scrollTop = 42;
    model.select(model.snapshot.selected!.position);
    view.render(model.snapshot);
    expect(panel.hidden).toBe(false);
    for (const screen of [
      'research',
      'decisions',
      'planet',
      'build-selection',
      'map',
    ] as const) {
      view.render({ ...model.snapshot, screen });
      expect(root.querySelector('.turn-console')).toBe(panel);
      expect(panel.open).toBe(true);
      expect(log.scrollTop).toBe(42);
      expect(panel.hidden).toBe(false);
    }
    view.render({
      ...model.snapshot,
      screen: 'build-selection',
      phase: 'simulating',
    });
    expect(root.querySelector<HTMLButtonElement>('.end-turn')!.disabled).toBe(
      true,
    );
    view.dispose();
  });
  it('anchors the announcement below the event and its label using the actual map and camera', () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const model = new AppModel();
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    const position = new HexCoordinate(2, -1);
    const events = [
      { id: 'local', round: 1, text: 'Local event', position },
      { id: 'global', round: 1, text: 'Global research' },
    ];
    const snapshot = {
      ...model.snapshot,
      camera: { ...model.snapshot.camera, center: { x: 0, y: 0 }, zoom: 0.5 },
      eventPlayback: {
        round: 1,
        events,
        index: 0,
        stage: 'announcing' as const,
      },
    };
    view.render(snapshot);
    const map = root.querySelector<HTMLElement>('.map-container')!;
    vi.spyOn(map, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(20, 50, 520, 340),
    );
    const announcement = root.querySelector<HTMLElement>(
      '.event-announcement',
    )!;
    Object.defineProperties(announcement, {
      offsetWidth: { value: 488 },
      offsetHeight: { value: 72 },
    });
    view.render(snapshot);
    const point = HexGeometry.toPoint(position);
    const x = Number.parseFloat(
      announcement.style.getPropertyValue('--event-origin-x'),
    );
    const y = Number.parseFloat(
      announcement.style.getPropertyValue('--event-origin-y'),
    );
    expect(x).toBeCloseTo(280 + point.x * 0.5);
    expect(y - 36).toBeGreaterThanOrEqual(220 + point.y * 0.5 + 82);
    view.render({
      ...snapshot,
      eventPlayback: { ...snapshot.eventPlayback, index: 1 },
    });
    expect(
      root
        .querySelector<HTMLElement>('.event-announcement')!
        .style.getPropertyValue('--event-origin-y'),
    ).toBe('');
    view.dispose();
  });
});

describe('handelser / arsrundor-och-order', () => {
  it('returns directly to planning and allows another turn without acknowledgement', () => {
    const game = new Game(createExampleGalaxy());
    collectTurnFrames(game);
    game.finishTurn();
    expect(game.phase).toBe('planning');
    expect(() => game.startTurn()).not.toThrow();
  });
  it('publishes one useful arrival when the destination is reached, without movement noise', () => {
    const game = new Game(createExampleGalaxy());
    game.setDestination('fleet-home', new HexCoordinate(7, 0));
    for (const frame of turnFrames(game)) game.applyFrame(frame);
    expect(
      game.events.filter((event) =>
        /arrived|moved to|revealed/.test(event.text),
      ),
    ).toHaveLength(0);
    game.finishTurn();
    for (const frame of turnFrames(game)) game.applyFrame(frame);
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
    game.startTurn();
    game.applyFrame(game.nextTurnFrame()!);
    expect(game.events.map((event) => event.text)).toEqual([
      `${scout.name} arrived at Vesta.`,
    ]);
    collectTurnFrames(game, false);
    expect(game.events[1]!.text).toBe('Home Fleet arrived at HEX 3,0.');
    game.finishTurn();
    expect(game.events[2]!.text).toContain('Research station was completed');
  });
  it('resumes older saved summaries as planning without losing events', () => {
    const game = new Game(createExampleGalaxy());
    collectTurnFrames(game);
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
    vi.useFakeTimers();
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
    await vi.advanceTimersByTimeAsync(0);
    // handelseanpassad-kartkamera: announcements follow the camera framing.
    for (
      let step = 0;
      step < 40 && !root.querySelector('.event-announcement');
      step++
    )
      await vi.advanceTimersByTimeAsync(50);
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(root.textContent).not.toContain('Continue');
    const log = root.querySelector('[role="log"]')!;
    expect(log).not.toBeNull();
    expect(root.querySelector('.event-announcement')?.textContent).toContain(
      'Vesta',
    );
    expect(root.querySelector<HTMLButtonElement>('.end-turn')!.disabled).toBe(
      true,
    );
    await vi.advanceTimersByTimeAsync(model.snapshot.events.length * 2600);
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
  it('senaste-aret-i-events: shows only the latest year and preserves focus and reading position within it', () => {
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const model = new AppModel();
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    model.select(new HexCoordinate(-2, 0));
    const events = Array.from({ length: 120 }, (_, i) => ({
      id: `event-${i}`,
      round: i < 20 ? 1 : 2,
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
      events: [...events, { id: 'new', round: 2, text: 'New arrival' }],
    });
    expect(document.activeElement).toBe(log);
    expect(log.scrollTop).toBe(100);
    expect(log.querySelectorAll('[data-event-id]')).toHaveLength(101);
    expect(log.querySelector('[data-event-id]')!.textContent).toBe('Event 20');
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
    for (const frame of turnFrames(model)) model.applyTurnFrame(frame);
    model.finishTurn();
    expect(model.snapshot.screen).toBe(screen);
    view.dispose();
  }
});
