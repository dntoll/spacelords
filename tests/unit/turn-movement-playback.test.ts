import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TurnMovementPlayback,
  type MovementScene,
} from '../../src/client/models/TurnMovementPlayback.js';
import { Game, type TurnFrame } from '../../src/client/models/Game.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../src/client/models/HexCoordinate.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';

afterEach(() => vi.useRealTimers());

function scene(game: Game): MovementScene {
  return {
    fleets: game.fleetSnapshots(),
    pirates: game.pirateSnapshots(),
    cells: game.mapSnapshot(),
  };
}

describe('en-flotta-i-taget / osynliga-flottor-utan-animation', () => {
  it('groups interleaved simulation steps into complete fleet tracks and keeps other markers still', () => {
    const game = new Game(createExampleGalaxy());
    game.transferShips('fleet-home', 'Fighter', 1, null);
    const second = game.fleetSnapshots()[1]!;
    game.setDestination('fleet-home', new HexCoordinate(3, 0));
    game.setDestination(second.id, new HexCoordinate(0, 3));
    game.startTurn();
    const origin = scene(game),
      playback = new TurnMovementPlayback(origin);
    const hiddenIds = new Set<string>();
    for (let index = 0; index < 50; index++) {
      if (game.phase === 'interrupted') game.continueTurn();
      const frame = game.nextTurnFrame();
      if (!frame) break;
      const before = scene(game);
      game.applyFrame(frame);
      playback.record(frame, before, scene(game));
      for (const move of frame.movements)
        if (
          !before.fleets.some((fleet) => fleet.id === move.fleetId) &&
          !before.pirates.some((fleet) => fleet.id === move.fleetId)
        )
          hiddenIds.add(move.fleetId);
    }
    game.finishTurn();
    const final = game.exportState();
    expect(hiddenIds.size).toBeGreaterThan(0);
    expect(playback.tracks).toHaveLength(2);
    expect(
      playback.tracks.every(
        (track) =>
          track.length > 1 &&
          track.every((move) => move.fleetId === track[0]!.fleetId),
      ),
    ).toBe(true);
    const first = playback.tracks[0]![0]!;
    playback.begin(first);
    expect(playback.current).toBe(first);
    playback.complete();
    expect(
      playback.fleets.find((fleet) => fleet.id === first.fleetId)?.position,
    ).toEqual(first.to);
    const idle = origin.fleets.find((fleet) => fleet.id !== first.fleetId)!;
    expect(
      playback.fleets.find((fleet) => fleet.id === idle.id)?.position,
    ).toEqual(idle.position);
    expect(
      playback.tracks.flat().some((move) => hiddenIds.has(move.fleetId)),
    ).toBe(false);
    expect(game.exportState()).toEqual(final);
  });

  it('does not reveal either endpoint of a hostile step with a hidden endpoint', () => {
    const game = new Game(createExampleGalaxy());
    const saved = game.exportState().pirates![0]!;
    const from = new HexCoordinate(saved.position.q, saved.position.r),
      to = from.neighbors()[0]!;
    const pirate = { ...saved, position: from };
    const visible = { fleets: [], pirates: [pirate], cells: [] };
    const hidden = { ...visible, pirates: [] };
    const frame = { movements: [{ fleetId: pirate.id, from, to }] };
    for (const [before, after] of [
      [hidden, hidden],
      [hidden, visible],
      [visible, hidden],
    ]) {
      const playback = new TurnMovementPlayback(before!);
      playback.record(frame, before!, after!);
      expect(playback.tracks).toHaveLength(0);
    }
    const playback = new TurnMovementPlayback(visible);
    playback.record(frame, visible, {
      ...visible,
      pirates: [{ ...pirate, position: to }],
    });
    expect(playback.tracks).toHaveLength(1);
  });

  it('focuses each fleet for its full route and never animates hidden pirates', async () => {
    vi.useFakeTimers();
    const model = new AppModel();
    model.transferShips('fleet-home', 'Fighter', 1, null);
    const other = model.snapshot.fleets[1]!;
    model.setDestination('fleet-home', 3, 0);
    model.setDestination(other.id, 0, 3);
    let emit!: IntentHandler;
    const order: string[] = [];
    const controller = new AppController(model, {
      bind(handler) {
        emit = handler;
      },
      render(snapshot) {
        if (snapshot.turnMovement) {
          expect(snapshot.phase).toBe('simulating');
          expect(snapshot.camera.center).toEqual(
            HexGeometry.toPoint(snapshot.turnMovement.from),
          );
        }
      },
      animateTurnStep(frame: TurnFrame) {
        expect(frame.movements).toHaveLength(1);
        order.push(frame.movements[0]!.fleetId);
        return Promise.resolve();
      },
      dispose() {},
    });
    controller.start();
    emit({ type: 'confirm-end-turn' });
    await vi.advanceTimersByTimeAsync(0);
    expect(order.length).toBeGreaterThan(3);
    expect([...new Set(order)]).toHaveLength(2);
    let switches = 0;
    for (let index = 1; index < order.length; index++)
      if (order[index] !== order[index - 1]) switches++;
    expect(switches).toBe(1);
    expect(order.every((id) => !id.startsWith('pirate-'))).toBe(true);
    expect(model.snapshot.eventPlayback).not.toBeNull();
    controller.dispose();
  });

  it('introduces no animation or presentation wait for a year with only hidden movement', () => {
    vi.useFakeTimers();
    const model = new AppModel();
    let emit!: IntentHandler;
    const animate = vi.fn(() => Promise.resolve());
    const controller = new AppController(model, {
      bind(handler) {
        emit = handler;
      },
      render() {},
      animateTurnStep: animate,
      dispose() {},
    });
    controller.start();
    emit({ type: 'confirm-end-turn' });
    expect(animate).not.toHaveBeenCalled();
    expect(model.snapshot.turnMovement).toBeNull();
    expect(model.snapshot.eventPlayback?.stage).toBe('announcing');
    controller.dispose();
  });
});
