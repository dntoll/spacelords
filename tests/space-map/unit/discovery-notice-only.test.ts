import { describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import type { IntentHandler } from '../../../src/client/app/views/ViewContracts.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';

describe('upptackt-som-toppnotis', () => {
  it('shows each discovery once as a top notice and never announces it in the middle', async () => {
    vi.useFakeTimers();
    try {
      const model = new AppModel();
      let emit!: IntentHandler;
      let notices = 0;
      const announced: string[] = [];
      const shown: string[] = [];
      const controller = new MasterController(model, {
        bind(handler) {
          emit = handler;
        },
        render(snapshot) {
          if (snapshot.notice?.kind === 'discovery') notices++;
          // A notice shown again after another one counts as repeated.
          const name =
            snapshot.notice?.kind === 'discovery'
              ? snapshot.notice.flash.name
              : null;
          if (name && name !== shown.at(-1)) {
            if (shown.includes(name)) announced.push(name);
            shown.push(name);
          }
        },
        animateTurnStep: () => Promise.resolve(),
        dispose() {},
      });
      controller.start();
      const home = model.snapshot.fleet.position!;
      for (const [dq, dr] of [
        [-4, 0],
        [-6, 3],
        [2, 4],
        [5, -1],
        [5, -4],
        [8, -4],
        [0, 0],
      ] as const) {
        const target = new HexCoordinate(home.q + dq, home.r + dr);
        const idle = () =>
          model.snapshot.phase === 'planning' &&
          !model.snapshot.enemyTurnPending &&
          !model.snapshot.turnMovement;
        for (let wait = 0; wait < 40 && !idle(); wait++)
          await vi.advanceTimersByTimeAsync(500);
        emit({ type: 'select', position: target });
        emit({ type: 'select', position: target });
        await vi.advanceTimersByTimeAsync(20_000);
      }
      expect(notices).toBeGreaterThan(0);
      expect(announced).toEqual([]);
      controller.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a paused discovery out of the announcements when the round ends later', async () => {
    vi.useFakeTimers();
    try {
      const initial = new Game(createExampleGalaxy()).exportState();
      // The fleet heads past Nadir: the star pauses the journey mid-round.
      const state = {
        ...initial,
        pirates: [],
        fleets: [{ ...initial.fleets[0]!, position: { q: 5, r: -4 } }],
      };
      const model = new AppModel(undefined, {
        load: () => ({ lastPlayed: '2026-11-23T00:00:00Z', state }),
        save() {},
        clear() {},
      });
      model.startSlot(1);
      let emit!: IntentHandler;
      const notices: string[] = [];
      const announced: string[] = [];
      const shown: string[] = [];
      const controller = new MasterController(model, {
        bind(handler) {
          emit = handler;
        },
        render(snapshot) {
          if (snapshot.notice?.kind === 'discovery')
            notices.push(snapshot.notice.flash.name);
          // A notice shown again after another one counts as repeated.
          const name =
            snapshot.notice?.kind === 'discovery'
              ? snapshot.notice.flash.name
              : null;
          if (name && name !== shown.at(-1)) {
            if (shown.includes(name)) announced.push(name);
            shown.push(name);
          }
        },
        animateTurnStep: () => Promise.resolve(),
        dispose() {},
      });
      controller.start();
      const target = new HexCoordinate(10, -4);
      emit({ type: 'select', position: target });
      emit({ type: 'select', position: target });
      await vi.advanceTimersByTimeAsync(10_000);
      expect(notices.length).toBeGreaterThan(0);
      // Selecting the destination again resumes each paused step.
      for (
        let resume = 0;
        resume < 10 && model.snapshot.round === 1;
        resume++
      ) {
        emit({ type: 'select', position: target });
        emit({ type: 'select', position: target });
        await vi.advanceTimersByTimeAsync(10_000);
      }
      expect(model.snapshot.round).toBeGreaterThan(1);
      expect(announced).toEqual([]);
      controller.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it('remembers a flashed discovery when the enemies’ stage later ends the round', () => {
    const initial = new Game(createExampleGalaxy()).exportState();
    const state = {
      ...initial,
      pirates: [],
      events: [{ id: 'event-sol', round: 1, text: 'Star explored: Sol.' }],
      // ap-pa-starmap: the AP are spent, so the next stage is the enemies'.
      enemyTurnPending: true,
    };
    const model = new AppModel(undefined, {
      load: () => ({ lastPlayed: '2026-11-23T00:00:00Z', state }),
      save() {},
      clear() {},
    });
    model.startSlot(1);
    model.noteDiscoveries([
      { kind: 'star', name: 'Sol', eventId: 'event-sol' },
    ]);
    model.startTurn();
    for (let step = 0; step < 20; step++) {
      const frame = model.nextTurnFrame();
      if (!frame) break;
      model.applyTurnFrame(frame);
    }
    model.finishTurn();
    expect(model.snapshot.round).toBe(2);
    model.advanceDiscoveryFlash();
    model.noteEvents();
    expect(model.snapshot.notice).toBeNull();
  });

  it('shows an arrival exploration of a planet only as a top notice', async () => {
    vi.useFakeTimers();
    try {
      const model = new AppModel();
      const planet = createExampleGalaxy()
        .systems.flatMap((system) => system.planets)
        .sort(
          (a, b) =>
            a.position.distanceTo(model.snapshot.fleet.position!) -
            b.position.distanceTo(model.snapshot.fleet.position!),
        )
        .find(
          (item) => item.position.key !== model.snapshot.fleet.position!.key,
        )!;
      let emit!: IntentHandler;
      const notices: string[] = [];
      const announced: string[] = [];
      const shown: string[] = [];
      const controller = new MasterController(model, {
        bind(handler) {
          emit = handler;
        },
        render(snapshot) {
          if (snapshot.notice?.kind === 'discovery')
            notices.push(snapshot.notice.flash.name);
          // A notice shown again after another one counts as repeated.
          const name =
            snapshot.notice?.kind === 'discovery'
              ? snapshot.notice.flash.name
              : null;
          if (name && name !== shown.at(-1)) {
            if (shown.includes(name)) announced.push(name);
            shown.push(name);
          }
        },
        animateTurnStep: () => Promise.resolve(),
        dispose() {},
      });
      controller.start();
      for (let attempt = 0; attempt < 6; attempt++) {
        if (model.snapshot.fleet.position?.key === planet.position.key) break;
        emit({ type: 'select', position: planet.position });
        emit({ type: 'select', position: planet.position });
        await vi.advanceTimersByTimeAsync(20_000);
      }
      await vi.advanceTimersByTimeAsync(20_000);
      expect(model.snapshot.fleet.position?.key).toBe(planet.position.key);
      expect(
        notices.some(
          (name) => name === planet.name || name.startsWith('Planet explored'),
        ),
      ).toBe(true);
      expect(announced).toEqual([]);
      controller.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('handelser-som-toppnotis', () => {
  it('does not show the events of a loaded game again', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    const loaded = new AppModel(undefined, {
      load: () => ({
        lastPlayed: '2026-11-24T00:00:00Z',
        state: {
          ...state,
          events: [
            {
              id: 'charts',
              round: 1,
              text: 'Captured charts reveal a pirate presence.',
            },
          ],
        },
      }),
      save() {},
      clear() {},
    });
    loaded.startSlot(1);
    loaded.noteEvents();
    expect(loaded.snapshot.notice).toBeNull();
  });
});
