import { describe, expect, it } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';

function model(inSight: boolean) {
  const state = new Game(createExampleGalaxy()).exportState();
  const pirate = state.pirates![0]!;
  const near = new HexCoordinate(pirate.position.q - 1, pirate.position.r);
  const app = new AppModel(undefined, {
    load: () => ({
      lastPlayed: '2026-11-24T00:00:00Z',
      state: {
        ...state,
        pirates: [pirate],
        fleets: inSight
          ? [{ ...state.fleets[0]!, position: { q: near.q, r: near.r } }]
          : state.fleets,
      },
    }),
    save() {},
    clear() {},
  });
  app.startSlot(1);
  const home = app.snapshot.fleet.position!;
  app.select(new HexCoordinate(home.q + 5, home.r));
  return app;
}

describe('somlos-forflyttning', () => {
  it('shows a route without rounds or AP when no enemy is in sight', () => {
    expect(model(false).snapshot.travelRoute?.contested).toBe(false);
  });

  it('shows rounds and AP again while a pirate is in sight', () => {
    expect(model(true).snapshot.travelRoute?.contested).toBe(true);
  });
});
