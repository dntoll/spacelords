import { describe, expect, it } from 'vitest';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import type {
  AppPort,
  IntentHandler,
} from '../../src/client/views/ViewContracts.js';

class TestView implements AppPort {
  handler: IntentHandler = () => undefined;
  renderCount = 0;
  bind(handler: IntentHandler): void {
    this.handler = handler;
  }
  render(): void {
    this.renderCount += 1;
  }
  dispose(): void {
    /* No platform resources in this unit-test adapter. */
  }
}

describe('vynavigation', () => {
  it('preserves camera and selection through planet and research navigation', () => {
    const model = new AppModel();
    const view = new TestView();
    new AppController(model, view).start();
    view.handler({ type: 'pan', delta: { x: 45, y: -20 } });
    view.handler({ type: 'zoom', factor: 1.5, anchor: { x: 0, y: 0 } });
    const before = model.snapshot;
    view.handler({ type: 'open-planet' });
    expect(model.snapshot.screen).toBe('planet');
    expect(model.snapshot.planet?.name).toBe('Tellus');
    view.handler({ type: 'open-research' });
    expect(model.snapshot.screen).toBe('research');
    view.handler({ type: 'open-map' });
    expect(model.snapshot.camera).toEqual(before.camera);
    expect(model.snapshot.selected).toEqual(before.selected);
    expect(view.renderCount).toBe(6);
  });

  it('does not allow opening unowned or hidden planets', () => {
    const model = new AppModel();
    model.select(new HexCoordinate(0, 1));
    model.openPlanet();
    expect(model.snapshot.screen).toBe('map');
    model.select(new HexCoordinate(-1, 0));
    model.openPlanet();
    expect(model.snapshot.screen).toBe('map');
    expect(model.snapshot.selected?.object).toBeNull();
    expect(model.snapshot.planet).toBeNull();
  });
});

describe('statisk-planetplacering', () => {
  it('never moves world objects when changing the camera or selection', () => {
    const model = new AppModel();
    const cells = model.snapshot.cells;
    model.pan({ x: 100, y: 40 });
    model.zoom(2, { x: 30, y: 20 });
    model.select(new HexCoordinate(0, 0));
    expect(model.snapshot.cells).toBe(cells);
  });
});

describe('fast-exempelvarld', () => {
  it('creates a fresh interface state instead of persisting a previous session', () => {
    const model = new AppModel();
    model.zoom(2, { x: 0, y: 0 });
    model.openResearch();
    const restarted = new AppModel();
    expect(restarted.snapshot.screen).toBe('map');
    expect(restarted.snapshot.camera.zoom).toBe(1);
    expect(restarted.snapshot.selected?.position.key).toBe('1,0');
  });
});

describe('viewport-game-layout', () => {
  it('routes planet tabs through the controller and preserves their state across navigation', () => {
    const model = new AppModel();
    const view = new TestView();
    new AppController(model, view).start();
    view.handler({ type: 'planet-tab', tab: 'buildings' });
    expect(model.snapshot.planetTab).toBe('overview');
    view.handler({ type: 'open-planet' });
    view.handler({ type: 'planet-tab', tab: 'resources' });
    expect(model.snapshot.planetTab).toBe('resources');
    view.handler({ type: 'open-map' });
    view.handler({ type: 'open-planet' });
    expect(model.snapshot.planetTab).toBe('resources');
    expect(new AppModel().snapshot.planetTab).toBe('overview');
  });
});
