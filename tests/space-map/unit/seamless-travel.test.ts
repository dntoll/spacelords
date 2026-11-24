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

describe('somlos-forflyttning / fardvag-under-resan', () => {
  it('keeps the route and the selected hex through a journey of several rounds', async () => {
    const { vi } = await import('vitest');
    const { MasterController } =
      await import('../../../src/client/app/controllers/MasterController.js');
    vi.useFakeTimers();
    try {
      const app = new AppModel();
      const home = app.snapshot.fleet.position!;
      const target = new HexCoordinate(home.q + 7, home.r);
      const gaps: string[] = [];
      let emit!: (intent: { type: 'select'; position: HexCoordinate }) => void;
      const controller = new MasterController(app, {
        bind(handler) {
          emit = handler;
        },
        render(snapshot) {
          if (snapshot.fleet.position?.key === target.key) return;
          if (!snapshot.travelRoute) gaps.push('route');
          if (snapshot.selected?.position.key !== target.key)
            gaps.push('selection');
        },
        animateTurnStep: () => Promise.resolve(),
        dispose() {},
      });
      controller.start();
      emit({ type: 'select', position: target });
      gaps.length = 0;
      emit({ type: 'select', position: target });
      await vi.advanceTimersByTimeAsync(30_000);
      expect(app.snapshot.fleet.position?.key).toBe(target.key);
      expect(app.snapshot.round).toBeGreaterThan(2);
      expect([...new Set(gaps)]).toEqual([]);
      controller.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('flytande-forflyttning', () => {
  it('keeps the same glide across steps and round boundaries', async () => {
    const { vi } = await import('vitest');
    const { MasterController } =
      await import('../../../src/client/app/controllers/MasterController.js');
    vi.useFakeTimers();
    try {
      const app = new AppModel();
      const home = app.snapshot.fleet.position!;
      const target = new HexCoordinate(home.q + 5, home.r);
      const ends: { start: boolean; end: boolean }[] = [];
      let emit!: (intent: { type: 'select'; position: HexCoordinate }) => void;
      const controller = new MasterController(app, {
        bind(handler) {
          emit = handler;
        },
        render() {},
        dispose() {},
        animateTurnStep(_frame, _progress, _duration, timing) {
          if (timing) ends.push(timing);
          return Promise.resolve();
        },
      });
      controller.start();
      emit({ type: 'select', position: target });
      emit({ type: 'select', position: target });
      await vi.advanceTimersByTimeAsync(30000);
      expect(app.snapshot.fleet.position?.key).toBe(target.key);
      expect(ends).toHaveLength(5);
      expect(ends).toEqual([
        { start: true, end: false },
        { start: false, end: false },
        { start: false, end: false },
        { start: false, end: false },
        { start: false, end: true },
      ]);
      controller.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});
