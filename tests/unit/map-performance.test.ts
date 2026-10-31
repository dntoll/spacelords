import { describe, expect, it, vi } from 'vitest';
import { AppController } from '../../src/client/controllers/AppController.js';
import {
  AppModel,
  type AppReadModel,
} from '../../src/client/models/AppModel.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';

describe('responsiv-stjarnkarta', () => {
  it('refreshes reused presentation data after selection and screen changes', () => {
    const model = new AppModel();
    let emit: IntentHandler = () => {};
    const renderCamera = vi.fn<(model: AppReadModel) => void>();
    const controller = new AppController(model, {
      bind: (handler) => {
        emit = handler;
      },
      render() {},
      renderCamera,
      dispose() {},
    });
    controller.start();
    emit({ type: 'select', position: new HexCoordinate(0, 0) });
    emit({ type: 'pan', delta: { x: 12, y: 0 } });
    expect(renderCamera.mock.lastCall![0].selected?.object?.name).toBe('Sol');
    emit({ type: 'open-production', planetId: 'sol-0' });
    emit({ type: 'zoom', factor: 1.2, anchor: { x: 0, y: 0 } });
    expect(renderCamera.mock.lastCall![0].screen).toBe('production');
    expect(renderCamera.mock.lastCall![0].planet?.name).toBe('Tellus');
    controller.dispose();
  });

  it('pans and pinches without rebuilding empire data or unrelated interface controls', () => {
    const model = new AppModel(createExampleGalaxy(true));
    let emit: IntentHandler = () => {};
    const render = vi.fn<(model: AppReadModel) => void>();
    const renderCamera = vi.fn<(model: AppReadModel) => void>();
    const controller = new AppController(model, {
      bind: (handler) => {
        emit = handler;
      },
      render,
      renderCamera,
      dispose() {},
    });
    controller.start();
    const before = model.snapshot;
    const snapshots = vi.spyOn(model, 'snapshot', 'get');
    render.mockClear();
    emit({ type: 'pan', delta: { x: 12, y: 0 } });
    emit({ type: 'zoom', factor: 1.2, anchor: { x: 0, y: 0 } });
    expect(render).not.toHaveBeenCalled();
    expect(snapshots).not.toHaveBeenCalled();
    expect(renderCamera).toHaveBeenCalledTimes(2);
    // Start away from the selected planet so the gesture pans empty space.
    emit({ type: 'pointer-start', id: 1, point: { x: 180, y: 150 } });
    snapshots.mockClear();
    render.mockClear();
    renderCamera.mockClear();
    emit({ type: 'pointer-move', id: 1, point: { x: 200, y: 150 } });
    expect(render).not.toHaveBeenCalled();
    expect(snapshots).not.toHaveBeenCalled();
    expect(renderCamera).toHaveBeenCalledOnce();
    const moved = renderCamera.mock.calls[0]![0];
    expect(moved.cells).toBe(before.cells);
    expect(moved.camera.center).not.toEqual(before.camera.center);
    expect(moved.camera.zoom).toBeCloseTo(1.2);
    emit({ type: 'pointer-start', id: 2, point: { x: -100, y: 150 } });
    snapshots.mockClear();
    render.mockClear();
    renderCamera.mockClear();
    emit({ type: 'pointer-move', id: 2, point: { x: -160, y: 150 } });
    expect(render).not.toHaveBeenCalled();
    expect(snapshots).not.toHaveBeenCalled();
    expect(renderCamera.mock.calls[0]![0].camera.zoom).toBeGreaterThan(1.2);
    emit({ type: 'pointer-end', id: 1, point: { x: 200, y: 150 } });
    emit({ type: 'pointer-end', id: 2, point: { x: -160, y: 150 } });
    snapshots.mockClear();
    render.mockClear();
    emit({ type: 'pointer-move', id: 3, point: { x: 180, y: 170 } });
    expect(snapshots).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
    controller.dispose();
  });
});
