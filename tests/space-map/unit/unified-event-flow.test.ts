import { completeTacticalBattles } from '../../fixtures/tactical-combat.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import {
  Game,
  type GameState,
} from '../../../src/client/space-map/models/Game.js';
import type { SavedGame } from '../../../src/client/space-map/models/saves/SaveRepository.js';
import type { IntentHandler } from '../../../src/client/app/views/ViewContracts.js';
import { discoveryState } from '../../fixtures/exploration.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';

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
    const controller = new MasterController(model, {
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
  it('order-vid-kartupptackt-utan-observator: changes course after the saved discovery notices have cleared', async () => {
    const game = Game.restore(discoveryState());
    game.startTurn();
    while (game.phase === 'simulating') game.applyFrame(game.nextTurnFrame()!);
    const state = game.exportState();
    const slot = session({
      ...state,
      simulation: {
        ...state.simulation!,
        discoveries: state.simulation!.discoveries.map((discovery) => ({
          ...discovery,
          kind: 'star' as const,
          fleetId: null,
        })),
      },
    });
    const current = slot.open();
    await vi.advanceTimersByTimeAsync(10000);
    expect(current.model.snapshot.phase).toBe('interrupted');
    const position = current.model.snapshot.fleet.position!;
    const target = new HexCoordinate(position.q - 1, position.r);
    current.emit({ type: 'select', position: target });
    current.emit({ type: 'select', position: target });
    await vi.advanceTimersByTimeAsync(0);
    expect(current.model.snapshot.notice?.kind).not.toBe('error');
    expect(
      current.model.snapshot.fleet.destination?.key === target.key ||
        current.model.snapshot.fleet.position?.key === target.key,
    ).toBe(true);
    current.controller.dispose();
  });
  it.each([0, 1])(
    'stridsresultat-utan-upprepning: shows losses and survivors once while retaining wrecks and saved history (%s Fighters)',
    (fighters) => {
      const game = Game.restore(discoveryState(fighters));
      game.startTurn();
      while (!game.interruption?.battles?.length) {
        if (game.phase === 'interrupted') {
          completeTacticalBattles(game);
          if (game.interruption?.battles?.length) break;
          game.continueTurn();
        }
        game.applyFrame(game.nextTurnFrame()!);
      }
      const saved = game.exportState();
      const model = new AppModel(undefined, {
        load: () => ({ lastPlayed: '2026-10-30', state: saved }),
        save() {},
        clear() {},
      });
      model.startSlot(1);
      const event = model.snapshot.events.find(
        (item) => item.id === saved.simulation!.battles![0]!.eventId,
      )!;
      const text = event.text;
      expect(text.match(/Lost /g)).toHaveLength(1);
      expect(text.match(/Survivors:/g)).toHaveLength(1);
      expect(event.text).toContain('civilian ships.');
      expect(model.snapshot.events).toEqual(saved.events);
    },
  );

  it('upptackt-stannar-resan: a loaded discovery is a top flash without Handle or Ignore', () => {
    const game = Game.restore(discoveryState());
    game.startTurn();
    while (game.phase === 'simulating') game.applyFrame(game.nextTurnFrame()!);
    const model = new AppModel(undefined, {
      load: () => ({ lastPlayed: '2026-10-30', state: game.exportState() }),
      save() {},
      clear() {},
    });
    model.startSlot(1);
    expect(model.snapshot.phase).toBe('interrupted');
    expect(model.snapshot.notice?.kind).toBe('discovery');
    expect(model.snapshot.travelling).toBe(false);
    expect(model.snapshot.events.some((event) => event.position)).toBe(true);
  });

  it('upptackt-stannar-resan / spara-avbrutet-ar: a discovery flash pauses the round and reload does not replay movement', async () => {
    const slot = session();
    let current = slot.open();
    // hexval-med-vag: two taps on the saved destination start the journey.
    const destination = current.model.snapshot.fleet.destination!;
    current.emit({ type: 'select', position: destination });
    current.emit({ type: 'select', position: destination });
    await vi.advanceTimersByTimeAsync(0);
    expect(current.model.snapshot.phase).toBe('interrupted');
    expect(current.model.snapshot.notice?.kind).toBe('discovery');
    expect(current.model.snapshot.travelling).toBe(false);
    const pausedPosition = slot.saved().state.fleets[0]!.position;
    const pausedMovement = slot.saved().state.simulation!.remaining;
    current.controller.dispose();
    current = slot.open();
    expect(current.model.snapshot.notice?.kind).toBe('discovery');
    expect(slot.saved().state.fleets[0]!.position).toEqual(pausedPosition);
    expect(slot.saved().state.simulation!.remaining).toEqual(pausedMovement);
    // fiendeupptackt-utan-end-turn: the pirate flash continues the round.
    for (let attempt = 0; attempt < 100; attempt++) {
      if (current.model.snapshot.tacticalBattle) {
        completeTacticalBattles(current.model);
        current.controller.dispose();
        current = slot.open();
      }
      await vi.advanceTimersByTimeAsync(1850);
      if (
        current.model.snapshot.phase === 'planning' &&
        !current.model.snapshot.enemyTurnPending
      )
        break;
    }
    expect(current.model.snapshot.phase).toBe('planning');
    expect(current.model.snapshot.round).toBe(2);
    // ap-pa-starmap: the fleet moves before the pirate, so a fight is not
    // certain here; a reload must never repeat one.
    expect(
      slot
        .saved()
        .state.events.filter((event) => event.text.startsWith('Combat:'))
        .length,
    ).toBeLessThanOrEqual(1);
    current.controller.dispose();
    current = slot.open();
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

  it('stridsrapport-i-dialog: continues without a report decision when the participating fleet was destroyed', async () => {
    const game = Game.restore(discoveryState(0));
    game.startTurn();
    while (!game.interruption?.battles?.length) {
      if (game.phase === 'interrupted') {
        completeTacticalBattles(game);
        if (game.interruption?.battles?.length) break;
        game.continueTurn();
      }
      game.applyFrame(game.nextTurnFrame()!);
    }
    expect(game.fleet('fleet-home')?.position).toBeNull();
    const slot = session(game.exportState());
    const { model, controller } = slot.open();
    await vi.advanceTimersByTimeAsync(20000);
    expect(model.snapshot.phase).toBe('planning');
    expect(model.snapshot.mapFleetId).toBeNull();
    expect(model.snapshot.fleet.canIssueOrders).toBe(false);
    controller.dispose();
  });
});
