import { completeTacticalBattles } from '../../fixtures/tactical-combat.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventPlayback } from '../../../src/client/space-map/models/turn/EventPlayback.js';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import type {
  AppPort,
  IntentHandler,
} from '../../../src/client/app/views/ViewContracts.js';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../../src/client/common/HexCoordinate.js';
import { collectTurnFrames, turnFrames } from '../../fixtures/turn-steps.js';
import { discoveryState } from '../../fixtures/exploration.js';
import type { SavedGame } from '../../../src/client/space-map/models/saves/SaveRepository.js';
import type p5 from 'p5';
import { renderMapEvent } from '../../../src/client/space-map/views/star-map/MapEventView.js';

afterEach(() => vi.useRealTimers());

it('geografisk-arsuppspelning: sorts located events west to east and south to north, retaining ties and global event order', () => {
  const events = [
    { id: 'global-a', round: 2, text: 'Research' },
    { id: 'east', round: 2, text: 'East', position: { q: 4, r: 0 } },
    { id: 'north', round: 2, text: 'North', position: { q: 0, r: -2 } },
    { id: 'south-a', round: 2, text: 'South A', position: { q: -2, r: 2 } },
    { id: 'south-b', round: 2, text: 'South B', position: { q: -2, r: 2 } },
    { id: 'global-b', round: 2, text: 'Legacy' },
  ];
  const original = [...events];
  const playback = new EventPlayback(2, events);
  expect(playback.snapshot.events.map((event) => event.id)).toEqual([
    'south-a',
    'south-b',
    'north',
    'east',
    'global-a',
    'global-b',
  ]);
  expect(events).toEqual(original);
});

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
    const position = index ? new HexCoordinate(1, 0) : new HexCoordinate(0, 1);
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

it('upptackt-stannar-resan: a discovery pause has a flash and no Handle or Ignore choice', () => {
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
    expect(snapshot.phase).toBe('interrupted');
    expect(snapshot.notice?.kind).toBe('discovery');
    expect(
      snapshot.eventPlayback?.events.some((event) => event.decision),
    ).not.toBe(true);
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
    // ingen-ankomstbesked: arriving one hex away no longer creates an announcement.
    model.setDestination('fleet-home', 1, 0);
    model.openResearch();
    let emit!: IntentHandler;
    const render = vi.fn();
    const port: AppPort = {
      bind(handler) {
        emit = handler;
      },
      render,
      dispose() {},
    };
    const controller = new MasterController(model, port);
    controller.start();
    emit({ type: 'end-turn' });
    return { model, controller, emit, render };
  }

  it('handelseannonsering: holds announcements before filing, blocks orders, restores the screen and stops on disposal', async () => {
    const { model, controller, render } = controlledTurn();
    await vi.advanceTimersByTimeAsync(0);
    expect(model.snapshot.eventPlayback).toBeNull();
    expect(model.snapshot.phase).toBe('planning');
    expect(
      model.snapshot.events.some((event) => event.text.includes('arrived')),
    ).toBe(false);
    expect(model.snapshot.screen).toBe('research');
    controller.dispose();
    const renders = render.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10000);
    expect(render).toHaveBeenCalledTimes(renders);
  });

  it('natural completion restores the original camera and selection', () => {
    const model = new AppModel();
    model.setDestination('fleet-home', 1, 0);
    model.pan({ x: 50, y: -30 });
    model.zoom(0.5, { x: 70, y: -20 });
    const before = model.snapshot;
    for (const frame of turnFrames(model)) model.applyTurnFrame(frame);
    model.finishTurn();
    model.beginEventPlayback();
    expect(model.snapshot.eventPlayback).toBeNull();
    expect(model.requestEndTurn()).toBe(true);
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
    const controller = new MasterController(model, {
      bind(handler) {
        emit = handler;
      },
      render() {},
      dispose() {},
    });
    controller.start();
    emit({ type: 'end-turn' });
    await vi.advanceTimersByTimeAsync(0);
    // handelser-vid-ankomst: the discovery shows during movement playback.
    expect(model.snapshot.phase).toBe('interrupted');
    expect(model.snapshot.notice?.kind).toBe('discovery');
    expect(model.snapshot.travelling).toBe(false);
    expect(saved.state.phase).toBe('interrupted');
    const discovery = saved.state.events.find((event) =>
      event.text.startsWith('Pirate ship in sight'),
    )!;
    expect(discovery.position).toBeDefined();
    for (
      let attempt = 0;
      attempt < 100 && model.snapshot.phase !== 'planning';
      attempt++
    ) {
      if (
        model.snapshot.phase === 'interrupted' &&
        !model.snapshot.tacticalBattle
      )
        emit({ type: 'end-turn' });
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
    ).not.toBe(true);
    expect(saved.state.phase).toBe('planning');
    await vi.advanceTimersByTimeAsync(1850);
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
  it('ingen-ankomstbesked: arriving does not record an arrival sentence', () => {
    const game = new Game(createExampleGalaxy());
    game.setDestination('fleet-home', new HexCoordinate(3, 0));
    collectTurnFrames(game);
    game.finishTurn();
    expect(game.fleet('fleet-home')!.position).toEqual({ q: 3, r: 0 });
    expect(game.fleet('fleet-home')!.destination).toBeNull();
    expect(game.events.some((event) => event.text.includes('arrived'))).toBe(
      false,
    );
    const restored = Game.restore(game.exportState());
    expect(restored.events).toEqual(game.events);
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
    const prepared = new Game(createExampleGalaxy());
    const state = prepared.exportState();
    const travelled = Game.restore({
      ...state,
      pirates: [],
      knownObjects: [
        ...state.knownObjects!,
        'nadir-0',
        'nadir-1',
        'nadir-2',
        'wreck-nadir-explorer',
      ],
      fleets: [
        {
          ...state.fleets[0]!,
          position: { q: 5, r: -4 },
          destination: { q: 7, r: -4 },
        },
      ],
    });
    collectTurnFrames(travelled);
    travelled.finishTurn();
    const model = new AppModel(undefined, {
      load: () => ({
        lastPlayed: '2026-10-26',
        state: travelled.exportState(),
      }),
      save() {},
      clear() {},
    });
    model.startSlot(1);
    const before = model.snapshot.camera;
    model.beginEventPlayback();
    expect(model.snapshot.camera).toEqual(before);
    expect(model.snapshot.eventPlayback?.stage).toBe('framing');
    model.finishCameraFraming();
    const event = model.snapshot.eventPlayback!.events[0]!;
    const point = HexGeometry.toPoint(
      new HexCoordinate(event.position!.q, event.position!.r),
    );
    expect(model.snapshot.camera.center.x).toBeCloseTo(point.x);
    expect(model.snapshot.camera.zoom).toBe(1);
    model.finishEventPlayback();
    expect(model.snapshot.camera).toEqual(before);
  });
});
