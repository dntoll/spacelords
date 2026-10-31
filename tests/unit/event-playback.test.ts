import { completeTacticalBattles } from '../fixtures/tactical-combat.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventPlayback } from '../../src/client/models/EventPlayback.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import type {
  AppPort,
  IntentHandler,
} from '../../src/client/views/ViewContracts.js';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../src/client/models/HexCoordinate.js';
import { collectTurnFrames, turnFrames } from '../fixtures/turn-steps.js';
import { discoveryState } from '../fixtures/exploration.js';
import type { SavedGame } from '../../src/client/models/SaveRepository.js';
import type p5 from 'p5';
import { renderMapEvent } from '../../src/client/views/MapEventView.js';

afterEach(() => vi.useRealTimers());

it.each([0, 1])(
  'handelsemarkering-utan-numrering: retains the location rings without an Event label or label background (index %s)',
  (index) => {
    const playback = new EventPlayback(1, [
      {
        id: 'first',
        round: 1,
        text: 'First discovery',
        position: { q: 1, r: 0 },
      },
      {
        id: 'second',
        round: 1,
        text: 'Second discovery',
        position: { q: 0, r: 1 },
      },
    ]);
    if (index) {
      playback.advance();
      playback.advance();
    }
    const sketch = {
      push: vi.fn(),
      pop: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      noFill: vi.fn(),
      stroke: vi.fn(),
      strokeWeight: vi.fn(),
      circle: vi.fn(),
      noStroke: vi.fn(),
      fill: vi.fn(),
      rect: vi.fn(),
      textSize: vi.fn(),
      textAlign: vi.fn(),
      text: vi.fn(),
      CENTER: 'center',
    };
    const model = new AppModel().snapshot;
    renderMapEvent(sketch as unknown as p5, {
      ...model,
      eventPlayback: playback.snapshot,
    });
    const position = index ? new HexCoordinate(0, 1) : new HexCoordinate(1, 0);
    const point = HexGeometry.toPoint(position);
    expect(sketch.translate).toHaveBeenCalledWith(point.x, point.y);
    expect(sketch.circle.mock.calls).toEqual([
      [0, 0, 70],
      [0, 0, 82],
    ]);
    expect(sketch.text).not.toHaveBeenCalled();
    expect(sketch.rect).not.toHaveBeenCalled();
  },
);

it('centrerade-handelseval-pa-dator: centers desktop choices while retaining compact placement after resizing to a phone', () => {
  const game = Game.restore(discoveryState());
  game.startTurn();
  while (game.phase === 'simulating') game.applyFrame(game.nextTurnFrame()!);
  const model = new AppModel(undefined, {
    load: () => ({ lastPlayed: '2026-10-30', state: game.exportState() }),
    save() {},
    clear() {},
  });
  model.startSlot(1);
  for (const [width, height] of [
    [1920, 1100],
    [1440, 800],
    [1280, 600],
    [393, 650],
    [667, 250],
    [1920, 1100],
  ] as const) {
    model.resizeMap({
      width,
      height,
      availableWidth: width,
      availableHeight: height,
    });
    model.finishCameraFraming();
    const snapshot = model.snapshot;
    const event =
      snapshot.eventPlayback!.events[snapshot.eventPlayback!.index]!;
    expect(event.decision).toBeDefined();
    const point = HexGeometry.toPoint(
      new HexCoordinate(event.position!.q, event.position!.r),
    );
    const markerY =
      height / 2 + (point.y - snapshot.camera.center.y) * snapshot.camera.zoom;
    expect(point.x - snapshot.camera.center.x).toBe(0);
    if (width > 900 && height > 500) {
      expect(markerY).toBeGreaterThan(height * 0.25);
      expect(markerY).toBeLessThan(height / 2);
    } else expect(markerY).toBe(height > 360 ? height / 2 - 120 : 60);
  }
});

describe('sekventiella-arshandelser', () => {
  it('announces and files only the completed year in occurrence order', () => {
    const events = [
      { id: 'old', round: 1, text: 'Old event' },
      { id: 'build', round: 2, text: 'Build event' },
      {
        id: 'population',
        round: 2,
        text: 'Population on Tellus changed by +0.',
      },
      { id: 'arrival', round: 2, text: 'Arrival event' },
    ];
    const playback = new EventPlayback(2, events);
    expect(playback.snapshot.events.map((event) => event.id)).toEqual([
      'build',
      'population',
      'arrival',
    ]);
    expect(playback.current?.id).toBe('build');
    expect(playback.snapshot.stage).toBe('announcing');
    playback.advance();
    expect(playback.current?.id).toBe('build');
    expect(playback.snapshot.stage).toBe('filing');
    playback.advance();
    expect(playback.current?.id).toBe('population');
    expect(playback.snapshot.stage).toBe('announcing');
    playback.advance();
    playback.advance();
    expect(playback.current?.id).toBe('arrival');
    expect(playback.advance()).toBe(true);
    expect(playback.advance()).toBe(false);
    expect(events).toHaveLength(4);
    expect(new EventPlayback(3, events).current).toBeUndefined();
  });

  function controlledTurn() {
    vi.useFakeTimers();
    const model = new AppModel();
    model.build('Research station');
    model.openResearch();
    for (const decision of model.snapshot.decisions)
      model.skipDecision(decision.id);
    let emit!: IntentHandler;
    const render = vi.fn();
    const port: AppPort = {
      bind(handler) {
        emit = handler;
      },
      render,
      dispose() {},
    };
    const controller = new AppController(model, port);
    controller.start();
    emit({ type: 'end-turn' });
    return { model, controller, emit, render };
  }

  it('handelseannonsering: holds announcements before filing, blocks orders, restores the screen and stops on disposal', async () => {
    const { model, controller, emit, render } = controlledTurn();
    await vi.advanceTimersByTimeAsync(0);
    expect(model.snapshot.eventPlayback?.index).toBe(0);
    expect(model.snapshot.screen).toBe('map');
    const round = model.snapshot.round;
    const history = model.snapshot.events;
    emit({ type: 'end-turn' });
    emit({ type: 'open-fleets' });
    expect(model.snapshot.round).toBe(round);
    expect(model.snapshot.screen).toBe('map');
    await vi.advanceTimersByTimeAsync(1399);
    expect(model.snapshot.eventPlayback?.stage).toBe('announcing');
    await vi.advanceTimersByTimeAsync(1);
    expect(model.snapshot.eventPlayback?.stage).toBe('filing');
    expect(model.snapshot.eventPlayback?.index).toBe(0);
    await vi.advanceTimersByTimeAsync(449);
    expect(model.snapshot.eventPlayback?.index).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(model.snapshot.eventPlayback?.index).toBe(1);
    await vi.advanceTimersByTimeAsync(1850);
    expect(model.snapshot.eventPlayback).toBeNull();
    expect(model.snapshot.screen).toBe('research');
    expect(model.snapshot.events).toEqual(history);
    emit({ type: 'end-turn' });
    await vi.advanceTimersByTimeAsync(0);
    controller.dispose();
    const renders = render.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10000);
    expect(render).toHaveBeenCalledTimes(renders);
  });

  it('natural completion restores the original camera and selection', () => {
    const model = new AppModel();
    model.pan({ x: 50, y: -30 });
    model.zoom(0.5, { x: 70, y: -20 });
    const before = model.snapshot;
    for (const frame of turnFrames(model)) model.applyTurnFrame(frame);
    model.finishTurn();
    model.beginEventPlayback();
    expect(model.snapshot.eventPlayback).not.toBeNull();
    expect(model.requestEndTurn()).toBe(false);
    while (model.snapshot.eventPlayback) model.advanceEventPlayback();
    expect(model.snapshot.camera).toEqual(before.camera);
    expect(model.snapshot.selected?.position).toEqual(
      before.selected?.position,
    );
    expect(model.snapshot.round).toBe(before.round + 1);
  });

  it('saves interrupted years before review and saves final results before playback, including earlier discoveries', async () => {
    vi.useFakeTimers();
    let saved: SavedGame = {
      lastPlayed: '2026-10-26',
      state: discoveryState(),
    };
    const model = new AppModel(undefined, {
      load: () => saved,
      save(_id, next) {
        saved = structuredClone(next);
      },
      clear() {},
    });
    model.startSlot(1);
    let emit!: IntentHandler;
    const controller = new AppController(model, {
      bind(handler) {
        emit = handler;
      },
      render() {},
      dispose() {},
    });
    controller.start();
    emit({ type: 'confirm-end-turn' });
    await vi.advanceTimersByTimeAsync(0);
    expect(model.snapshot.phase).toBe('interrupted');
    expect(model.snapshot.eventPlayback?.stage).toBe('awaiting-choice');
    expect(saved.state.phase).toBe('interrupted');
    const discovery = saved.state.events.find((event) =>
      event.text.startsWith('Pirate ship in sight'),
    )!;
    expect(discovery.position).toBeDefined();
    for (
      let attempt = 0;
      attempt < 100 && model.snapshot.phase === 'interrupted';
      attempt++
    ) {
      if (model.snapshot.eventPlayback?.stage === 'awaiting-choice')
        emit({ type: 'ignore-discoveries' });
      await vi.advanceTimersByTimeAsync(1850);
      if (model.snapshot.tacticalBattle) {
        completeTacticalBattles(model);
        model.finishCameraFraming();
        emit({ type: 'ignore-discoveries' });
      }
    }
    expect(
      model.snapshot.eventPlayback?.events.some(
        (event) => event.id === discovery.id,
      ),
    ).toBe(false);
    expect(saved.state.phase).toBe('planning');
    expect(saved.state.round).toBe(model.snapshot.round);
    expect(saved.state.events).toEqual(model.snapshot.events);
    const restored = new AppModel(undefined, {
      load: () => saved,
      save() {},
      clear() {},
    });
    restored.startSlot(1);
    expect(restored.snapshot.eventPlayback).toBeNull();
    expect(restored.snapshot.events).toEqual(saved.state.events);
    controller.dispose();
  });
});

describe('handelser-pa-kartan', () => {
  it('records event-time arrival and production positions and keeps research global', () => {
    const game = new Game(createExampleGalaxy());
    game.setDestination('fleet-home', new HexCoordinate(3, 0));
    game.scheduleBuild(game.galaxy.homePlanet, 'Research station');
    collectTurnFrames(game);
    game.finishTurn();
    const arrival = game.events.find((event) =>
      event.text.includes('arrived'),
    )!;
    expect(arrival.position).toEqual({ q: 3, r: 0 });
    for (const event of game.events.filter((event) =>
      /completed|Population/.test(event.text),
    ))
      expect(event.position).toEqual(game.galaxy.homePlanet.position);
    game.setDestination('fleet-home', new HexCoordinate(4, 0));
    game.selectResearch('Rocket engine factory');
    collectTurnFrames(game);
    game.finishTurn();
    expect(
      game.events.find((event) => event.text.startsWith('Research completed:'))
        ?.position,
    ).toBeUndefined();
    expect(
      game.events.some((event) => event.text.startsWith('Research completed:')),
    ).toBe(true);
    expect(arrival.position).toEqual({ q: 3, r: 0 });
    expect(Object.isFrozen(arrival.position)).toBe(true);
    const restored = Game.restore(game.exportState());
    expect(restored.events).toEqual(game.events);
    expect(Object.isFrozen(restored.events[0]?.position)).toBe(true);
  });

  it('loads legacy events without positions and does not replay an already saved year', () => {
    const game = new Game(createExampleGalaxy());
    collectTurnFrames(game);
    game.finishTurn();
    const state = {
      ...game.exportState(),
      events: game.events.map(({ id, round, text }) => ({ id, round, text })),
    };
    const model = new AppModel(undefined, {
      load: () => ({ lastPlayed: '2026-10-26', state }),
      save() {},
      clear() {},
    });
    model.startSlot(1);
    expect(model.snapshot.round).toBe(2);
    expect(model.snapshot.eventPlayback).toBeNull();
    expect(model.snapshot.events).toEqual(state.events);
  });

  it('focuses the event coordinates independently of the planning camera', () => {
    const model = new AppModel();
    model.setDestination('fleet-home', 3, 0);
    const before = model.snapshot.camera;
    for (const frame of turnFrames(model)) model.applyTurnFrame(frame);
    model.finishTurn();
    model.beginEventPlayback();
    expect(model.snapshot.camera).toEqual(before);
    expect(model.snapshot.eventPlayback?.stage).toBe('framing');
    model.finishCameraFraming();
    expect(model.snapshot.camera.center.x).toBe(
      HexGeometry.toPoint(new HexCoordinate(3, 0)).x,
    );
    expect(model.snapshot.camera.zoom).toBe(1);
    model.finishEventPlayback();
    expect(model.snapshot.camera).toEqual(before);
  });
});
