import { describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import type { IntentHandler } from '../../../src/client/app/views/ViewContracts.js';
import {
  HexCoordinate,
  HexGeometry,
  type Point,
} from '../../../src/client/common/HexCoordinate.js';
import type { TurnFrame } from '../../../src/client/space-map/models/Game.js';

const viewport = {
  width: 400,
  height: 600,
  availableWidth: 400,
  availableHeight: 600,
};

function setup(onStep?: (model: AppModel, ship: Point) => void) {
  vi.useFakeTimers();
  const model = new AppModel();
  let emit!: IntentHandler;
  const controller = new MasterController(model, {
    bind(handler) {
      emit = handler;
    },
    render() {},
    animateTurnStep(frame: TurnFrame, onProgress?: (p: number) => void) {
      const move = frame.movements.find(
        (movement) => movement.fleetId === model.snapshot.fleet.id,
      );
      for (const progress of [0.25, 0.5, 0.75, 1]) {
        onProgress?.(progress);
        if (!move) continue;
        const from = HexGeometry.toPoint(move.from);
        const to = HexGeometry.toPoint(move.to);
        const eased = progress * progress * (3 - 2 * progress);
        onStep?.(model, {
          x: from.x + (to.x - from.x) * eased,
          y: from.y + (to.y - from.y) * eased,
        });
      }
      return Promise.resolve();
    },
    dispose() {},
  });
  controller.start();
  emit({ type: 'map-size', viewport });
  return {
    model,
    emit: (intent: Parameters<IntentHandler>[0]) => emit(intent),
    controller,
  };
}

/** A point's position on screen, relative to the map's center. */
function onScreen(model: AppModel, point: Point) {
  const { center, zoom } = model.snapshot.camera;
  return { x: (point.x - center.x) * zoom, y: (point.y - center.y) * zoom };
}

describe('kamera-med-dod-zon', () => {
  it('lets the player pan and zoom after a journey', async () => {
    const { model, emit, controller } = setup();
    try {
      const home = model.snapshot.fleet.position!;
      const target = new HexCoordinate(home.q + 2, home.r);
      emit({ type: 'select', position: target });
      emit({ type: 'select', position: target });
      await vi.advanceTimersByTimeAsync(20_000);
      const before = model.snapshot.camera;
      emit({ type: 'pan', delta: { x: 120, y: -80 } });
      expect(model.snapshot.camera.center).not.toEqual(before.center);
      const panned = model.snapshot.camera;
      emit({ type: 'zoom', factor: 1.5, anchor: { x: 0, y: 0 } });
      expect(model.snapshot.camera.zoom).toBeCloseTo(panned.zoom * 1.5);
    } finally {
      controller.dispose();
      vi.useRealTimers();
    }
  });

  it('keeps the camera still while the ship stays in the middle rectangle', async () => {
    const { model, emit, controller } = setup();
    try {
      const start = model.snapshot.camera;
      const home = model.snapshot.fleet.position!;
      const target = new HexCoordinate(home.q + 1, home.r);
      emit({ type: 'select', position: target });
      emit({ type: 'select', position: target });
      await vi.advanceTimersByTimeAsync(20_000);
      expect(model.snapshot.fleet.position?.key).toBe(target.key);
      expect(model.snapshot.camera).toEqual(start);
    } finally {
      controller.dispose();
      vi.useRealTimers();
    }
  });

  it('follows the ship so that it stays inside the middle rectangle', async () => {
    const outside: { x: number; y: number }[] = [];
    const { model, emit, controller } = setup((current, point) => {
      const ship = onScreen(current, point);
      if (
        Math.abs(ship.x) > viewport.width / 4 + 1 ||
        Math.abs(ship.y) > viewport.height / 4 + 1
      )
        outside.push(ship);
    });
    try {
      const start = model.snapshot.camera;
      const home = model.snapshot.fleet.position!;
      const target = new HexCoordinate(home.q + 8, home.r);
      emit({ type: 'select', position: target });
      emit({ type: 'select', position: target });
      await vi.advanceTimersByTimeAsync(60_000);
      expect(model.snapshot.camera.center).not.toEqual(start.center);
      expect(model.snapshot.camera.zoom).toBe(start.zoom);
      expect(outside).toEqual([]);
    } finally {
      controller.dispose();
      vi.useRealTimers();
    }
  });
});
