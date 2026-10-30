import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { TurnMovementPlayback } from '../../src/client/models/TurnMovementPlayback.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';
import { discoveryState } from '../fixtures/exploration.js';

afterEach(() => vi.useRealTimers());

describe('handelseanpassad-kartkamera / stillastaende-kamera-vid-forflyttning', () => {
  it('starts from the player camera, chains movement and events and restores the exact original state', () => {
    const model = new AppModel();
    model.pan({ x: -240, y: 160 });
    model.zoom(1.5, { x: 50, y: -20 });
    model.setDestination('fleet-home', 3, 0);
    const original = model.snapshot;
    model.startTurn();
    const origin = model.snapshot;
    const playback = new TurnMovementPlayback(origin);
    let frame;
    while ((frame = model.nextTurnFrame())) {
      const before = model.snapshot;
      model.applyTurnFrame(frame);
      playback.record(frame, before, model.snapshot);
    }
    model.finishTurn();
    model.beginMovementPlayback(playback, origin);
    expect(model.snapshot.camera).toEqual(original.camera);
    const track = playback.tracks[0]!;
    model.focusTurnMovement(track[0]!);
    model.frameTurnTrack(track);
    expect(model.snapshot.camera).toEqual(original.camera);
    model.finishCameraFraming();
    const framed = model.snapshot.camera;
    for (const movement of track) {
      model.focusTurnMovement(movement);
      for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
        model.advanceTurnMovement(progress);
        expect(model.snapshot.camera).toEqual(framed);
      }
      model.completeTurnMovement();
    }
    model.endMovementPlayback(true);
    model.beginEventPlayback();
    expect(model.snapshot.camera).toEqual(framed);
    while (model.snapshot.eventPlayback) model.advanceEventPlayback();
    expect(model.snapshot.camera).toEqual(original.camera);
    expect(model.snapshot.screen).toBe(original.screen);
    expect(model.snapshot.selected?.position).toEqual(
      original.selected?.position,
    );
  });

  it('reframes after rotation and rejects callbacks from the previous camera transition', () => {
    const game = Game.restore(discoveryState());
    game.startTurn();
    while (game.phase === 'simulating') game.applyFrame(game.nextTurnFrame()!);
    const model = new AppModel(undefined, {
      load: () => ({ lastPlayed: '2026-10-30', state: game.exportState() }),
      save() {},
      clear() {},
    });
    model.startSlot(1);
    const previous = model.cameraFraming!;
    model.advanceCameraFraming(previous, 0, 0.4);
    model.resizeMap({
      width: 393,
      height: 250,
      availableWidth: 393,
      availableHeight: 250,
    });
    const resized = model.cameraFraming!;
    expect(resized).not.toBe(previous);
    const before = model.snapshot.camera;
    expect(model.advanceCameraFraming(previous, 0, 1)).toBe(false);
    expect(model.snapshot.camera).toEqual(before);
    model.finishCameraFraming();
    expect(model.snapshot.eventPlayback?.stage).toBe('awaiting-choice');
    const eventId =
      model.snapshot.eventPlayback!.events[model.snapshot.eventPlayback!.index]!
        .id;
    model.resizeMap({
      width: 851,
      height: 393,
      availableWidth: 851,
      availableHeight: 393,
    });
    expect(model.cameraFraming).toBeNull();
    expect(model.snapshot.eventPlayback?.stage).toBe('awaiting-choice');
    expect(
      model.snapshot.eventPlayback!.events[model.snapshot.eventPlayback!.index]!
        .id,
    ).toBe(eventId);
    expect(Number.isFinite(model.snapshot.camera.zoom)).toBe(true);
  });

  it('keeps global and legacy events at the current camera without introducing a framing wait', () => {
    const game = new Game(createExampleGalaxy());
    const state = {
      ...game.exportState(),
      round: 2,
      events: [
        { id: 'global', round: 1, text: 'Research completed.' },
        { id: 'legacy', round: 1, text: 'Legacy event.' },
        {
          id: 'invalid',
          round: 1,
          text: 'Invalid position.',
          position: { q: 0.5, r: 0 },
        },
      ],
    };
    const model = new AppModel(undefined, {
      load: () => ({ lastPlayed: '2026-10-30', state }),
      save() {},
      clear() {},
    });
    model.startSlot(1);
    model.pan({ x: 77, y: -91 });
    const before = model.snapshot.camera;
    model.beginEventPlayback();
    while (model.snapshot.eventPlayback) {
      expect(model.snapshot.eventPlayback.stage).not.toBe('framing');
      expect(model.cameraFraming).toBeNull();
      expect(model.snapshot.camera).toEqual(before);
      model.advanceEventPlayback();
    }
  });

  it('continues from the event camera after Ignore while the year resumes automatically', () => {
    const game = Game.restore(discoveryState());
    game.startTurn();
    while (game.phase === 'simulating') game.applyFrame(game.nextTurnFrame()!);
    const model = new AppModel(undefined, {
      load: () => ({ lastPlayed: '2026-10-30', state: game.exportState() }),
      save() {},
      clear() {},
    });
    model.startSlot(1);
    while (model.snapshot.eventPlayback) {
      model.finishCameraFraming();
      if (model.snapshot.eventPlayback?.stage === 'awaiting-choice')
        model.chooseEvent('ignore');
      model.advanceEventPlayback();
    }
    const previous = model.snapshot.camera;
    expect(model.snapshot.screen).toBe('map');
    model.continueTurn();
    const origin = model.snapshot;
    model.beginMovementPlayback(new TurnMovementPlayback(origin), origin);
    expect(model.snapshot.camera).toEqual(previous);
  });

  it('starts the full announcement reading time only after framing completes', async () => {
    vi.useFakeTimers();
    const state = {
      ...new Game(createExampleGalaxy()).exportState(),
      round: 2,
      events: [
        { id: 'arrival', round: 1, text: 'Arrival.', position: { q: 3, r: 0 } },
      ],
    };
    const model = new AppModel(undefined, {
      load: () => ({ lastPlayed: '2026-10-30', state }),
      save() {},
      clear() {},
    });
    model.startSlot(1);
    model.beginEventPlayback();
    const cameraDuration = model.cameraFraming!.transitions.reduce(
      (sum, phase) => sum + phase.duration,
      0,
    );
    const controller = new AppController(model, {
      bind() {},
      render() {},
      dispose() {},
      animatePresentation(duration, onProgress) {
        return new Promise<void>((resolve) =>
          setTimeout(() => {
            onProgress(1);
            resolve();
          }, duration),
        );
      },
    });
    controller.start();
    await vi.advanceTimersByTimeAsync(cameraDuration - 1);
    expect(model.snapshot.eventPlayback?.stage).toBe('framing');
    await vi.advanceTimersByTimeAsync(1);
    expect(model.snapshot.eventPlayback?.stage).toBe('announcing');
    await vi.advanceTimersByTimeAsync(1399);
    expect(model.snapshot.eventPlayback?.stage).toBe('announcing');
    await vi.advanceTimersByTimeAsync(1);
    expect(model.snapshot.eventPlayback?.stage).toBe('filing');
    controller.dispose();
  });

  it('withholds decisions during framing and ignores pending camera callbacks after disposal', async () => {
    vi.useFakeTimers();
    const game = Game.restore(discoveryState());
    game.startTurn();
    while (game.phase === 'simulating') game.applyFrame(game.nextTurnFrame()!);
    const model = new AppModel(undefined, {
      load: () => ({ lastPlayed: '2026-10-30', state: game.exportState() }),
      save() {},
      clear() {},
    });
    model.startSlot(1);
    let emit!: IntentHandler;
    let tick!: (progress: number) => void;
    let complete!: () => void;
    const render = vi.fn();
    const controller = new AppController(model, {
      bind(handler) {
        emit = handler;
      },
      render,
      animatePresentation(_duration, onProgress) {
        tick = onProgress;
        return new Promise<void>((resolve) => {
          complete = resolve;
        });
      },
      dispose() {
        complete();
      },
    });
    controller.start();
    expect(model.snapshot.eventPlayback?.stage).toBe('framing');
    emit({ type: 'handle-discoveries' });
    expect(model.snapshot.interruption?.handling).toBe(false);
    await vi.advanceTimersByTimeAsync(10000);
    expect(model.snapshot.eventPlayback?.stage).toBe('framing');
    tick(0.5);
    const before = model.snapshot.camera;
    controller.dispose();
    const renders = render.mock.calls.length;
    tick(1);
    await vi.advanceTimersByTimeAsync(10000);
    expect(model.snapshot.camera).toEqual(before);
    expect(render).toHaveBeenCalledTimes(renders);
  });
});
