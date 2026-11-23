import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Game,
  type GameState,
} from '../../../src/client/space-map/models/Game.js';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import type { IntentHandler } from '../../../src/client/app/views/ViewContracts.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';

describe('hexval-med-vag', () => {
  it('previews the route the fleet would take without changing its orders', () => {
    const game = new Game(createExampleGalaxy());
    const before = game.exportState();
    const fleet = game.fleetSnapshot();
    const target = new HexCoordinate(4, 0);
    const route = game.routePreview(fleet.id, target);
    expect(route.at(-1)?.key).toBe(target.key);
    expect(route).toHaveLength(fleet.position!.distanceTo(target));
    for (const [index, step] of route.entries())
      expect(
        step.distanceTo(index === 0 ? fleet.position! : route[index - 1]!),
      ).toBe(1);
    expect(game.exportState()).toEqual(before);
    expect(Object.isFrozen(route)).toBe(true);
  });

  it('gives no route to the fleet’s own hex, a star or outside the map', () => {
    const galaxy = createExampleGalaxy();
    const game = new Game(galaxy);
    const fleet = game.fleetSnapshot();
    expect(game.routePreview(fleet.id, fleet.position!)).toEqual([]);
    expect(
      game.routePreview(fleet.id, galaxy.systems[0]!.star.position),
    ).toEqual([]);
    expect(
      game.routePreview(fleet.id, new HexCoordinate(galaxy.radius + 5, 0)),
    ).toEqual([]);
  });
});

function model(state: GameState) {
  const app = new AppModel(undefined, {
    load: () => ({ lastPlayed: '2026-11-22T00:00:00Z', state }),
    save() {},
    clear() {},
  });
  app.startSlot(1);
  return app;
}

function controller(app: AppModel) {
  let emit!: IntentHandler;
  const master = new MasterController(app, {
    bind(handler) {
      emit = handler;
    },
    render() {},
    animateTurnStep: () => Promise.resolve(),
    dispose() {},
  });
  master.start();
  return { emit, master };
}

describe('hexval-med-vag / resa-utan-synliga-pirater', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the route on the first tap and travels round after round on the second until arrival', async () => {
    vi.useFakeTimers();
    const initial = new Game(createExampleGalaxy()).exportState();
    const app = model({ ...initial, pirates: [] });
    const { emit, master } = controller(app);
    const fleet = app.snapshot.fleet;
    const target = new HexCoordinate(fleet.position!.q + 7, fleet.position!.r);
    emit({ type: 'select', position: target });
    const route = app.snapshot.travelRoute!;
    expect(route.steps.at(-1)?.key).toBe(target.key);
    expect(route.perRound).toBe(fleet.speed);
    expect(app.snapshot.fleet.destination).toBeNull();
    expect(app.snapshot.round).toBe(1);
    emit({ type: 'select', position: target });
    expect(app.snapshot.travelling).toBe(true);
    // Discoveries on the way pause the round; ignoring them resumes the trip.
    // The route crosses asteroids, which take a whole round without ending it.
    for (let step = 0; step < 200; step++) {
      await vi.advanceTimersByTimeAsync(500);
      if (app.snapshot.eventPlayback?.stage === 'awaiting-choice') {
        emit({ type: 'ignore-discoveries' });
      }
    }
    expect(app.snapshot.fleet.position?.key).toBe(target.key);
    // ap-pa-starmap: a round ends only when the AP are spent, so the round
    // the fleet arrives in stays open when AP are left over.
    expect(app.snapshot.round).toBe(
      1 + Math.floor(route.steps.length / route.perRound),
    );
    expect(app.snapshot.travelling).toBe(false);
    expect(app.snapshot.phase).toBe('planning');
    master.dispose();
  });

  it('selecting another hex instead only moves the selection', () => {
    const app = model(new Game(createExampleGalaxy()).exportState());
    const { emit, master } = controller(app);
    const fleet = app.snapshot.fleet;
    const first = new HexCoordinate(fleet.position!.q + 2, fleet.position!.r);
    const second = new HexCoordinate(fleet.position!.q, fleet.position!.r + 2);
    emit({ type: 'select', position: first });
    emit({ type: 'select', position: second });
    expect(app.snapshot.selected?.position.key).toBe(second.key);
    expect(app.snapshot.fleet.destination).toBeNull();
    expect(app.snapshot.travelling).toBe(false);
    expect(app.snapshot.round).toBe(1);
    master.dispose();
  });

  it('stops the journey between rounds while a pirate is in sight', () => {
    const initial = new Game(createExampleGalaxy()).exportState();
    const pirate = initial.pirates![0]!;
    const near = new HexCoordinate(pirate.position.q - 1, pirate.position.r);
    const app = model({
      ...initial,
      pirates: [pirate],
      fleets: [{ ...initial.fleets[0]!, position: near }],
    });
    expect(app.snapshot.pirates).toHaveLength(1);
    const target = new HexCoordinate(near.q - 4, near.r);
    expect(app.select(target)).toBe('selected');
    expect(app.select(target)).toBe('travel');
    expect(app.snapshot.travelling).toBe(true);
    expect(app.turn.continueVoyage()).toBe(false);
    expect(app.snapshot.travelling).toBe(false);
    // The order stays, so End turn moves the fleet on while pirates act.
    expect(app.snapshot.fleet.destination?.key).toBe(target.key);
  });
});

describe('hexval-med-vag / strid-i-samma-hex', () => {
  it('a first tap on a pirate shows the route to it and a second tap sends the fleet', () => {
    const initial = new Game(createExampleGalaxy()).exportState();
    const pirate = initial.pirates![0]!;
    const app = model({
      ...initial,
      pirates: [pirate],
      fleets: [
        {
          ...initial.fleets[0]!,
          position: { q: pirate.position.q - 1, r: pirate.position.r },
        },
      ],
    });
    expect(app.snapshot.pirates).toHaveLength(1);
    expect(app.starMap.selectMapFleet(pirate.id)).toBe('selected');
    expect(app.snapshot.mapFleetId).toBe(pirate.id);
    expect(app.snapshot.travelRoute?.steps.at(-1)?.key).toBe(
      `${pirate.position.q},${pirate.position.r}`,
    );
    expect(app.starMap.selectMapFleet(pirate.id)).toBe('travel');
    expect(app.snapshot.fleet.destination?.key).toBe(
      `${pirate.position.q},${pirate.position.r}`,
    );
  });
});
