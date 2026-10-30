import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventPlayback } from '../../src/client/models/EventPlayback.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { Game, type GameState } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import type { SavedGame } from '../../src/client/models/SaveRepository.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';
import { discoveryState } from '../fixtures/exploration.js';

afterEach(() => vi.useRealTimers());

function session(initial: GameState = discoveryState()) {
  vi.useFakeTimers();
  let saved: SavedGame = { lastPlayed: '2026-10-27', state: initial };
  function open() {
    const model = new AppModel(undefined, {
      load: () => saved,
      save(_id, value) {
        saved = structuredClone(value);
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
    return { model, controller, emit };
  }
  return { open, saved: () => saved };
}

describe('gemensamt-handelseflode', () => {
  it('upptacktsbesked-utan-pausmening: discoveries retain location and fleet details without the generic pause sentence', () => {
    const game = Game.restore(discoveryState());
    game.startTurn();
    while (game.phase === 'simulating') game.applyFrame(game.nextTurnFrame()!);
    const model = new AppModel(undefined, {
      load: () => ({ lastPlayed: '2026-10-30', state: game.exportState() }),
      save() {},
      clear() {},
    });
    model.startSlot(1);
    const event = model.snapshot.eventPlayback!.events[0]!;
    expect(event.decision!.details).toHaveLength(1);
    expect(event.decision!.details[0]).toMatch(
      /^HEX .+ · Home Fleet · \d+ hex remaining$/,
    );
  });

  it('waits for an explicit choice and files each interactive event once', () => {
    const playback = new EventPlayback(1, [
      {
        id: 'contact',
        round: 1,
        text: 'Pirate ship in sight.',
        decision: {
          title: 'Pirate ship in sight',
          details: ['HEX 2,0'],
          fleetId: 'fleet-home',
        },
      },
      { id: 'arrival', round: 1, text: 'Fleet arrived.' },
    ]);
    expect(playback.snapshot.stage).toBe('awaiting-choice');
    expect(playback.advance()).toBe(true);
    expect(playback.current?.id).toBe('contact');
    playback.choose('ignore');
    expect(playback.snapshot.stage).toBe('filing');
    playback.choose('handle');
    expect(playback.snapshot.choice).toBe('ignore');
    playback.advance();
    expect(playback.current?.id).toBe('arrival');
    expect(playback.snapshot.stage).toBe('announcing');
  });

  it('spara-avbrutet-ar: restores each choice and handling without replaying movement, combat or announcements', async () => {
    const slot = session();
    let current = slot.open();
    current.emit({ type: 'confirm-end-turn' });
    await vi.advanceTimersByTimeAsync(0);
    const first = current.model.snapshot.eventPlayback!;
    expect(first.stage).toBe('awaiting-choice');
    const pausedPosition = slot.saved().state.fleets[0]!.position;
    const pausedMovement = slot.saved().state.simulation!.remaining;
    await vi.advanceTimersByTimeAsync(20000);
    expect(current.model.snapshot.eventPlayback?.index).toBe(0);
    expect(slot.saved().state.simulation!.remaining).toEqual(pausedMovement);
    current.emit({ type: 'ignore-discoveries' });
    current.emit({ type: 'handle-discoveries' });
    expect(current.model.snapshot.eventPlayback?.choice).toBe('ignore');
    current.controller.dispose();
    current = slot.open();
    expect(current.model.snapshot.eventPlayback?.events[0]?.id).not.toBe(
      first.events[0]!.id,
    );
    expect(
      current.model.snapshot.eventPlayback?.history?.map((event) => event.id),
    ).toContain(first.events[0]!.id);
    expect(slot.saved().state.fleets[0]!.position).toEqual(pausedPosition);
    const handled = current.model.snapshot.eventPlayback!.events[0]!;
    current.emit({ type: 'handle-discoveries' });
    // Reload during the filing animation must restore order handling, not ask again.
    current.controller.dispose();
    current = slot.open();
    expect(current.model.snapshot.eventPlayback).toBeNull();
    expect(current.model.snapshot.interruption?.activeEventId).toBe(handled.id);
    expect(current.model.snapshot.interruption?.handling).toBe(true);
    expect(current.model.snapshot.mapFleetId).toBe(handled.decision!.fleetId);
    expect(slot.saved().state.simulation!.remaining).toEqual(pausedMovement);
    current.emit({ type: 'continue-turn' });
    expect(current.model.snapshot.phase).toBe('interrupted');
    expect(
      slot
        .saved()
        .state.events.some((event) => event.text.startsWith('Combat at')),
    ).toBe(false);
    const seen = [first.events[0]!.id, handled.id];
    for (let attempt = 0; attempt < 100; attempt++) {
      const playback = current.model.snapshot.eventPlayback;
      if (playback?.stage === 'awaiting-choice') {
        seen.push(playback.events[playback.index]!.id);
        current.emit({ type: 'ignore-discoveries' });
      }
      await vi.advanceTimersByTimeAsync(1850);
      if (
        current.model.snapshot.phase === 'planning' &&
        !current.model.snapshot.eventPlayback
      )
        break;
    }
    expect(current.model.snapshot.phase).toBe('planning');
    expect(current.model.snapshot.eventPlayback).toBeNull();
    expect(current.model.snapshot.round).toBe(2);
    expect(new Set(seen).size).toBe(seen.length);
    expect(
      slot
        .saved()
        .state.events.filter((event) => event.text.startsWith('Combat at')),
    ).toHaveLength(1);
    expect(current.model.snapshot.events.map((event) => event.id)).toEqual(
      current.model.snapshot.presentedEventIds,
    );
    current.controller.dispose();
    current = slot.open();
    expect(current.model.snapshot.eventPlayback).toBeNull();
    expect(current.model.snapshot.round).toBe(2);
    current.controller.dispose();
  });

  it('spara-avbrutet-ar: links legacy pending discoveries without adding or removing log entries', () => {
    const game = Game.restore(discoveryState());
    game.startTurn();
    while (game.phase === 'simulating') game.applyFrame(game.nextTurnFrame()!);
    const saved = game.exportState();
    const simulation = saved.simulation!;
    const legacy = {
      ...saved,
      simulation: {
        ...simulation,
        discoveries: simulation.discoveries.map((discovery) => {
          const legacyDiscovery = { ...discovery };
          delete legacyDiscovery.eventId;
          return legacyDiscovery;
        }),
      },
    };
    const restored = Game.restore(legacy);
    expect(restored.events).toEqual(game.events);
    expect(
      restored.interruption!.discoveries.every((discovery) =>
        restored.events.some((event) => event.id === discovery.eventId),
      ),
    ).toBe(true);
    expect(restored.interruption!.remaining).toEqual(simulation.remaining);
    for (const discovery of restored.interruption!.discoveries)
      expect(discovery.eventId).toBe(
        simulation.discoveries.find((item) => item.id === discovery.id)!
          .eventId,
      );
  });

  it('spara-avbrutet-ar: restores map focus for legacy interruption events without saved coordinates', () => {
    const game = Game.restore(discoveryState());
    game.startTurn();
    while (game.phase === 'simulating') game.applyFrame(game.nextTurnFrame()!);
    const checkpoint = game.exportState();
    const restored = Game.restore({
      ...checkpoint,
      events: checkpoint.events.map(({ id, round, text }) => ({
        id,
        round,
        text,
      })),
      simulation: {
        ...checkpoint.simulation!,
        discoveries: checkpoint.simulation!.discoveries.map((discovery) => {
          const legacy = { ...discovery };
          delete legacy.eventId;
          return legacy;
        }),
      },
    });
    for (const discovery of restored.interruption!.discoveries) {
      const event = restored.events.find(
        (event) => event.id === discovery.eventId,
      )!;
      expect(event.position).toEqual(discovery.position);
      expect(event.id).toBe(
        checkpoint.simulation!.discoveries.find(
          (item) => item.id === discovery.id,
        )!.eventId,
      );
    }
    expect(restored.events).toHaveLength(checkpoint.events.length);
  });

  it('order-under-upptacktsavbrott: focuses the battle location when the participating fleet was destroyed', async () => {
    const game = Game.restore(discoveryState(0));
    game.startTurn();
    while (!game.interruption?.battles?.length) {
      if (game.phase === 'interrupted') game.continueTurn();
      game.applyFrame(game.nextTurnFrame()!);
    }
    expect(game.fleet('fleet-home')?.position).toBeNull();
    const slot = session(game.exportState());
    const { model, controller, emit } = slot.open();
    await vi.advanceTimersByTimeAsync(20000);
    expect(model.snapshot.eventPlayback?.stage).toBe('awaiting-choice');
    expect(
      model.snapshot.eventPlayback?.events[model.snapshot.eventPlayback.index]
        ?.decision?.title,
    ).toBe('Battle report');
    emit({ type: 'handle-discoveries' });
    await vi.advanceTimersByTimeAsync(450);
    expect(model.snapshot.mapFleetId).toBeNull();
    expect(model.snapshot.selected?.position).toEqual(
      game.interruption.battles[0]!.position,
    );
    expect(
      model.snapshot.fleets.find((fleet) => fleet.id === 'fleet-home')!
        .canIssueOrders,
    ).toBe(false);
    controller.dispose();
  });

  it('spara-avbrutet-ar: year-end review resumes after production without settling the year again', async () => {
    const state = new Game(createExampleGalaxy()).exportState();
    state.colonies[0]![1].projects.push({
      id: 'detection-factory',
      type: 'Telescope II factory',
      slotIndex: 0,
      factoryId: null,
      destinationFleetId: null,
    });
    const game = Game.restore(state);
    game.startTurn();
    while (game.phase === 'simulating') game.applyFrame(game.nextTurnFrame()!);
    expect(game.interruption?.economyApplied).toBe(true);
    const checkpoint = game.exportState();
    const slot = session(checkpoint);
    const { model, controller, emit } = slot.open();
    for (let attempt = 0; attempt < 100; attempt++) {
      if (model.snapshot.eventPlayback?.stage === 'awaiting-choice')
        emit({ type: 'ignore-discoveries' });
      await vi.advanceTimersByTimeAsync(1850);
      if (model.snapshot.phase === 'planning' && !model.snapshot.eventPlayback)
        break;
    }
    expect(slot.saved().state.round).toBe(checkpoint.round + 1);
    expect(slot.saved().state.colonies).toEqual(checkpoint.colonies);
    controller.dispose();
  });
});
