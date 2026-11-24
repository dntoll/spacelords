import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TurnMovementPlayback,
  type MovementScene,
} from '../../../src/client/space-map/models/turn/TurnMovementPlayback.js';
import {
  Game,
  type TurnFrame,
} from '../../../src/client/space-map/models/Game.js';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import type { IntentHandler } from '../../../src/client/app/views/ViewContracts.js';
import { Detection } from '../../../src/client/space-map/models/Detection.js';

afterEach(() => vi.useRealTimers());

it('destinationer-for-aktiva-skepp: retains the current order target beyond the recorded journey and when a route changes direction', () => {
  const base = new Game(createExampleGalaxy()).fleetSnapshot();
  const from = new HexCoordinate(1, 0),
    via = new HexCoordinate(2, 0),
    to = new HexCoordinate(3, 0);
  const outbound = {
    ...base,
    routeId: 'route',
    position: from,
    destination: to,
  };
  const origin = {
    fleet: outbound,
    pirates: [],
    cells: [],
  };
  const playback = new TurnMovementPlayback(origin);
  playback.record(
    { movements: [{ fleetId: base.id, from, to: via }] },
    origin,
    origin,
  );
  const returning = {
    ...origin,
    fleet: { ...outbound, position: via, destination: from },
  };
  playback.record(
    { movements: [{ fleetId: base.id, from: via, to: from }] },
    returning,
    returning,
  );
  playback.begin(playback.tracks[0]![0]!);
  expect(playback.fleet.destination).toEqual(to);
  playback.complete();
  playback.begin(playback.tracks[0]![1]!);
  expect(playback.fleet.destination).toEqual(from);
});

it('geografisk-arsuppspelning: plays tracks west to east, then south to north', () => {
  const game = new Game(createExampleGalaxy());
  const fleet = {
    ...game.fleetSnapshot(),
    id: 'route-a',
    position: new HexCoordinate(-8, 0),
  };
  // enda-spelarflottan: the other tracks belong to pirates in sight.
  const pirate = game.exportState().pirates![0]!;
  const pirates = (
    [
      ['east', 4, 0],
      ['north', 0, -2],
      ['south', -2, 2],
      ['route-b', 8, 0],
    ] as const
  ).map(([id, q, r]) => ({
    ...pirate,
    id,
    position: new HexCoordinate(q, r),
  }));
  const origin = { fleet, pirates, cells: [] };
  const playback = new TurnMovementPlayback(origin);
  const moves = [fleet, ...pirates].map((track) => ({
    fleetId: track.id,
    from: track.position,
    to: track.position.neighbors()[0]!,
  }));
  playback.record({ movements: moves }, origin, origin);
  const extra = {
    fleetId: 'route-a',
    from: moves[0]!.to,
    to: new HexCoordinate(-6, 0),
  };
  playback.record({ movements: [extra] }, origin, origin);
  expect(
    playback.batches.map((batch) => batch.map((track) => track[0]!.fleetId)),
  ).toEqual([['route-a'], ['south'], ['north'], ['east'], ['route-b']]);
  playback.begin(moves[0]!);
  expect(playback.currents).toEqual([moves[0]]);
  playback.advance(0.25);
  expect(playback.fleet.position).toEqual(moves[0]!.from);
  playback.advance(0.75);
  expect(playback.fleet.position).toEqual(moves[0]!.to);
  playback.complete();
  playback.begin([extra]);
  expect(playback.fleet.destination).toEqual(extra.to);
  expect(Object.isFrozen(playback.currents)).toBe(true);
});

describe('en-flotta-i-taget / osynliga-flottor-utan-animation', () => {
  it.each([false, true])(
    'sikt-under-forflyttning: uses displayed positions, hides lost contacts and respects nebula (%s)',
    (cloud) => {
      const game = new Game(createExampleGalaxy());
      const from = new HexCoordinate(3, 0),
        to = new HexCoordinate(4, 0);
      const first = {
        ...game.fleetSnapshot(),
        position: from,
        detectionRange: 1,
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
          from.distanceTo(position) <= 1 && (!cloud || position.key !== to.key),
        explored: from.distanceTo(position) <= 1,
        object: null,
        terrain:
          cloud && position.key === to.key
            ? ('nebula' as const)
            : ('space' as const),
      }));
      const before: MovementScene = {
        fleet: first,
        pirates: [oldContact],
        cells,
      };
      const after: MovementScene = {
        ...before,
        fleet: { ...first, position: to },
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
          movements: [{ fleetId: first.id, from, to }],
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
    const controller = new MasterController(model, {
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
            {
              position:
                after.fleet.id === move.fleetId
                  ? move.to
                  : after.fleet.position!,
              range: after.fleet.detectionRange ?? 0,
            },
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
    const target = new HexCoordinate(3, 0);
    emit({ type: 'select', position: target });
    emit({ type: 'select', position: target });
    await vi.advanceTimersByTimeAsync(0);
    expect(steps).toBeGreaterThan(1);
    controller.dispose();
  });

  it('does not reveal either endpoint of a hostile step with a hidden endpoint', () => {
    const game = new Game(createExampleGalaxy());
    const saved = game.exportState().pirates![0]!;
    const from = new HexCoordinate(saved.position.q, saved.position.r),
      to = from.neighbors()[0]!;
    const pirate = { ...saved, position: from };
    const visible = {
      fleet: game.fleetSnapshot(),
      pirates: [pirate],
      cells: [],
    };
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

  it('ap-pa-starmap: the enemies’ hidden moves add no animation or wait to a round', async () => {
    vi.useFakeTimers();
    const model = new AppModel();
    let emit!: IntentHandler;
    const animate = vi.fn<(frame: TurnFrame) => Promise<void>>(() =>
      Promise.resolve(),
    );
    const controller = new MasterController(model, {
      bind(handler) {
        emit = handler;
      },
      render() {},
      animateTurnStep: animate,
      dispose() {},
    });
    controller.start();
    const home = model.snapshot.fleet.position!;
    const target = new HexCoordinate(home.q + 8, home.r);
    emit({ type: 'select', position: target });
    emit({ type: 'select', position: target });
    for (let step = 0; step < 40 && model.snapshot.round === 1; step++)
      await vi.advanceTimersByTimeAsync(500);
    expect(model.snapshot.round).toBeGreaterThanOrEqual(2);
    expect(animate).toHaveBeenCalled();
    for (const [frame] of animate.mock.calls)
      for (const movement of frame.movements)
        expect(movement.fleetId).toBe('fleet-home');
    controller.dispose();
  });
});

it('animerade-piratsteg: replays an enemy turn when both ends of a pirate step are visible', async () => {
  vi.useFakeTimers();
  const state = new Game(createExampleGalaxy()).exportState();
  const pirate = state.pirates![0]!;
  const from = new HexCoordinate(pirate.position.q, pirate.position.r);
  const position = from.neighbors()[1]!;
  const model = new AppModel(undefined, {
    load: () => ({
      lastPlayed: '2026-11-24T00:00:00Z',
      state: {
        ...state,
        pirates: [{ ...pirate, active: true }],
        fleets: [{ ...state.fleets[0]!, position }],
        enemyTurnPending: true,
        actionTime: { 'fleet-home': 0 },
      },
    }),
    save() {},
    clear() {},
  });
  model.startSlot(1);
  const movements: TurnFrame['movements'][number][] = [];
  const controller = new MasterController(model, {
    bind() {},
    render() {},
    dispose() {},
    animateTurnStep(frame, onProgress) {
      movements.push(...frame.movements);
      const step = frame.movements.find((move) => move.fleetId === pirate.id);
      if (step) {
        onProgress?.(0.25);
        expect(
          model.snapshot.pirates.find((item) => item.id === pirate.id)?.position
            .key,
        ).toBe(step.from.key);
        onProgress?.(0.75);
        expect(
          model.snapshot.pirates.find((item) => item.id === pirate.id)?.position
            .key,
        ).toBe(step.to.key);
      }
      return Promise.resolve();
    },
  });
  controller.start();
  await vi.advanceTimersByTimeAsync(10000);
  expect(movements.some((step) => step.fleetId === pirate.id)).toBe(true);
  controller.dispose();
});
