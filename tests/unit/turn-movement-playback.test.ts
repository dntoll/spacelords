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
import { Detection } from '../../src/client/models/Detection.js';

afterEach(() => vi.useRealTimers());

function scene(game: Game): MovementScene {
  return {
    fleets: game.fleetSnapshots(),
    pirates: game.pirateSnapshots(),
    cells: game.mapSnapshot(),
    ownedPlanets: game.ownedPlanetSnapshots(),
  };
}

describe('en-flotta-i-taget / osynliga-flottor-utan-animation', () => {
  it.each([false, true])(
    'sikt-under-forflyttning: uses displayed positions, hides lost contacts and respects nebula (%s)',
    (cloud) => {
      const game = new Game(createExampleGalaxy());
      const from = new HexCoordinate(3, 0),
        to = new HexCoordinate(4, 0);
      const first = {
        ...game.fleetSnapshots()[0]!,
        position: from,
        detectionRange: 1,
      };
      const second = {
        ...first,
        id: 'second',
        position: new HexCoordinate(0, 3),
      };
      const oldContact = {
        id: 'old',
        systemId: 'test',
        count: 1,
        position: new HexCoordinate(2, 0),
      };
      const newContact = {
        ...oldContact,
        id: 'new',
        position: new HexCoordinate(5, 0),
      };
      const cells = HexCoordinate.disk(8).map((position) => ({
        position,
        visible:
          (from.distanceTo(position) <= 1 &&
            (!cloud || position.key !== to.key)) ||
          second.position.distanceTo(position) <= 1,
        explored:
          from.distanceTo(position) <= 1 ||
          second.position.distanceTo(position) <= 1,
        object: null,
        terrain:
          cloud && position.key === to.key
            ? ('nebula' as const)
            : ('space' as const),
      }));
      const before: MovementScene = {
        fleets: [first, second],
        pirates: [oldContact],
        cells,
        ownedPlanets: [],
      };
      const after: MovementScene = {
        ...before,
        fleets: [
          { ...first, position: to },
          { ...second, position: new HexCoordinate(0, 5) },
        ],
        pirates: [newContact],
        cells: cells.map((cell) =>
          cell.position.key === '0,6'
            ? {
                ...cell,
                explored: true,
                visible: true,
                object: {
                  kind: 'planet',
                  type: 'solid',
                  name: 'Future planet',
                  owned: false,
                },
              }
            : cell,
        ),
      };
      const playback = new TurnMovementPlayback(before);
      playback.record(
        {
          movements: [
            { fleetId: first.id, from, to },
            {
              fleetId: second.id,
              from: second.position,
              to: new HexCoordinate(0, 5),
            },
          ],
        },
        before,
        after,
      );
      playback.begin(playback.tracks[0]![0]!);
      playback.advance(0.75);
      const at = (key: string) =>
        playback.cells.find((cell) => cell.position.key === key)!;
      expect(at('2,0')).toMatchObject({ explored: true, visible: false });
      expect(at('4,0').visible).toBe(true);
      expect(at('5,0').visible).toBe(!cloud);
      expect(at('0,3').visible).toBe(true);
      expect(at('0,6')).toMatchObject({
        explored: false,
        visible: false,
        object: null,
      });
      expect(playback.pirates.map((pirate) => pirate.id)).toEqual(
        cloud ? [] : ['new'],
      );
      expect(before.cells).toEqual(cells);
      expect(playback.advance(0.9)).toBe(false);
      expect(Object.isFrozen(playback.cells)).toBe(true);
      expect(Object.isFrozen(at('2,0'))).toBe(true);
    },
  );

  it('sikt-under-forflyttning: updates shared sight during animation and preserves map memory', async () => {
    vi.useFakeTimers();
    const model = new AppModel();
    model.setDestination('fleet-home', 3, 0);
    let emit!: IntentHandler;
    let steps = 0;
    const controller = new AppController(model, {
      bind(handler) {
        emit = handler;
      },
      render() {},
      animateTurnStep(
        frame: TurnFrame,
        onProgress?: (progress: number) => void,
      ) {
        const move = frame.movements[0]!;
        const before = model.snapshot;
        onProgress?.(0.25);
        expect(model.snapshot.cells).toEqual(before.cells);
        onProgress?.(0.75);
        const after = model.snapshot;
        const expected = Detection.coverage(
          [
            ...after.ownedPlanets.map((planet) => ({
              position: planet.position,
              range: planet.detectionRange ?? 1,
            })),
            ...after.fleets
              .filter((fleet) => fleet.position)
              .map((fleet) => ({
                position: fleet.id === move.fleetId ? move.to : fleet.position!,
                range: fleet.detectionRange ?? 0,
              })),
          ],
          (point) =>
            after.cells.find((cell) => cell.position.key === point.key)
              ?.terrain === 'nebula',
        );
        expect(
          after.cells
            .filter((cell) => cell.visible)
            .map((cell) => cell.position.key)
            .sort(),
        ).toEqual(
          after.cells
            .filter((cell) => expected.has(cell.position.key))
            .map((cell) => cell.position.key)
            .sort(),
        );
        expect(
          after.cells.some(
            (cell) =>
              cell.visible &&
              !before.cells.find(
                (old) => old.position.key === cell.position.key,
              )?.visible,
          ),
        ).toBe(true);
        for (const cell of before.cells.filter((cell) => cell.explored))
          expect(
            after.cells.find(
              (current) => current.position.key === cell.position.key,
            )?.explored,
          ).toBe(true);
        steps++;
        return Promise.resolve();
      },
      dispose() {},
    });
    controller.start();
    emit({ type: 'confirm-end-turn' });
    await vi.advanceTimersByTimeAsync(0);
    expect(steps).toBeGreaterThan(1);
    controller.dispose();
  });

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
