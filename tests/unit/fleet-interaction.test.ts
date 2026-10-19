import { describe, expect, it } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { FleetMapLayout } from '../../src/client/models/FleetMapLayout.js';
import {
  HexCoordinate,
  HexGeometry,
  type Point,
} from '../../src/client/models/HexCoordinate.js';
import type { FleetSnapshot } from '../../src/client/models/Game.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';

function setup() {
  const model = new AppModel();
  let emit: IntentHandler = () => {};
  new AppController(model, {
    bind: (handler) => {
      emit = handler;
    },
    render() {},
    dispose() {},
  }).start();
  const point = (): Point => {
    const marker = FleetMapLayout.markers(model.snapshot.fleets)[0]!;
    const { center, zoom } = model.snapshot.camera;
    return {
      x: (marker.point.x - center.x) * zoom,
      y: (marker.point.y - center.y) * zoom,
    };
  };
  const at = (coordinate: HexCoordinate): Point => {
    const world = HexGeometry.toPoint(coordinate);
    const { center, zoom } = model.snapshot.camera;
    return { x: (world.x - center.x) * zoom, y: (world.y - center.y) * zoom };
  };
  return { model, emit, point, at };
}

describe('kartflottor', () => {
  it.each([1, 2, 6, 20, 100])(
    'keeps %i fleet markers on a circle inside their own hex',
    (count) => {
      const model = new AppModel();
      const original = model.snapshot.fleets[0]!;
      const fleets: FleetSnapshot[] = Array.from(
        { length: count },
        (_, index) => ({ ...original, id: `fleet-${index}` }),
      );
      const center = HexGeometry.toPoint(original.position!);
      const markers = FleetMapLayout.markers(fleets);
      expect(markers).toHaveLength(count);
      expect(
        new Set(markers.map((marker) => `${marker.point.x},${marker.point.y}`))
          .size,
      ).toBe(count);
      for (const marker of markers) {
        expect(
          Math.hypot(marker.point.x - center.x, marker.point.y - center.y),
        ).toBeCloseTo(HexGeometry.size / 2);
        expect(HexGeometry.fromPoint(marker.point).key).toBe(
          original.position!.key,
        );
      }
      expect(FleetMapLayout.markers([...fleets].reverse())).toEqual(markers);
    },
  );
});

describe('flottval-pa-kartan', () => {
  it('prioritizes fleet hit areas over tile selection after zoom and pan', () => {
    const { model, emit, point } = setup();
    emit({ type: 'select', position: new HexCoordinate(0, 1) });
    emit({ type: 'zoom', factor: 2, anchor: { x: 0, y: 0 } });
    emit({ type: 'pan', delta: { x: 55, y: 20 } });
    const before = model.snapshot.selected;
    const near = {
      ...point(),
      x: point().x + (HexGeometry.size / 4) * 2 - 0.1,
    };
    emit({ type: 'pointer-start', id: 1, point: near });
    emit({ type: 'pointer-end', id: 1, point: near });
    expect(model.snapshot.mapFleetId).toBe('fleet-home');
    expect(model.snapshot.selected).toEqual(before);
    emit({ type: 'pointer-move', id: 2, point: point() });
    expect(model.snapshot.hoveredFleetId).toBe('fleet-home');
    emit({ type: 'map-leave' });
    expect(model.snapshot.hoveredFleetId).toBeNull();
    expect(model.snapshot.mapFleetId).toBe('fleet-home');
  });
  it('selects a tile outside the fleet hit radius and clears fleet selection', () => {
    const { model, emit, point } = setup();
    emit({ type: 'pointer-start', id: 1, point: point() });
    emit({ type: 'pointer-end', id: 1, point: point() });
    const outside = { x: 0, y: 0 };
    emit({ type: 'pointer-start', id: 1, point: outside });
    emit({ type: 'pointer-end', id: 1, point: outside });
    expect(model.snapshot.mapFleetId).toBeNull();
    expect(model.snapshot.selected?.position.key).toBe('1,0');
  });
});

describe('dra-flottdestination', () => {
  it('previews a snapped destination without changing the order or camera until release', () => {
    const { model, emit, point, at } = setup();
    const target = new HexCoordinate(2, 0);
    const camera = model.snapshot.camera;
    emit({ type: 'pointer-start', id: 1, point: point() });
    emit({ type: 'pointer-move', id: 1, point: at(target) });
    expect(model.snapshot.fleetDestinationPreview?.key).toBe(target.key);
    expect(model.snapshot.fleets[0]!.destination).toBeNull();
    expect(model.snapshot.camera).toEqual(camera);
    emit({ type: 'pointer-end', id: 1, point: at(target) });
    expect(model.snapshot.fleets[0]!.destination?.key).toBe(target.key);
    expect(model.snapshot.fleetDestinationPreview).toBeNull();
  });
  it.each(['pointer-cancel', 'open-research'] as const)(
    'preserves an existing order on %s',
    (action) => {
      const { model, emit, point, at } = setup();
      model.setDestination('fleet-home', 3, 0);
      emit({ type: 'pointer-start', id: 1, point: point() });
      emit({ type: 'pointer-move', id: 1, point: at(new HexCoordinate(2, 0)) });
      emit({ type: action });
      expect(model.snapshot.fleets[0]!.destination?.key).toBe('3,0');
      expect(model.snapshot.fleetDestinationPreview).toBeNull();
    },
  );
  it('discards release outside the map and clicks below the drag threshold', () => {
    const { model, emit, point } = setup();
    emit({ type: 'pointer-start', id: 1, point: point() });
    emit({
      type: 'pointer-end',
      id: 1,
      point: { x: point().x + 3, y: point().y },
    });
    expect(model.snapshot.fleets[0]!.destination).toBeNull();
    emit({ type: 'pointer-start', id: 1, point: point() });
    emit({ type: 'pointer-move', id: 1, point: { x: 10000, y: 10000 } });
    emit({ type: 'pointer-end', id: 1, point: { x: 10000, y: 10000 } });
    expect(model.snapshot.fleets[0]!.destination).toBeNull();
  });
  it('cancels fleet dragging when a second pointer starts a pinch', () => {
    const { model, emit, point, at } = setup();
    emit({ type: 'pointer-start', id: 1, point: point() });
    emit({ type: 'pointer-move', id: 1, point: at(new HexCoordinate(2, 0)) });
    emit({ type: 'pointer-start', id: 2, point: { x: 80, y: 0 } });
    emit({ type: 'pointer-move', id: 2, point: { x: 110, y: 0 } });
    emit({ type: 'pointer-end', id: 1, point: point() });
    emit({ type: 'pointer-end', id: 2, point: { x: 110, y: 0 } });
    expect(model.snapshot.fleetDestinationPreview).toBeNull();
    expect(model.snapshot.fleets[0]!.destination).toBeNull();
  });
});

describe('flottval-pa-kartan', () => {
  it('chooses the closest fleet when hit circles overlap and excludes empty fleets', () => {
    const { model } = setup();
    for (let index = 0; index < 12; index += 1) model.createFleet('fleet-home');
    const first = model.snapshot.fleets[0]!;
    const fleets = Array.from({ length: 30 }, (_, index) => ({
      ...first,
      id: `test-${index}`,
    }));
    for (const marker of FleetMapLayout.markers(fleets))
      expect(FleetMapLayout.hit(fleets, marker.point)).toBe(marker.fleet.id);
    const empty = {
      ...first,
      ships: {
        Fighter: 0,
        'Colony ship': 0,
        'Exploration ship': 0,
        'Transport ship': 0,
      },
    };
    expect(FleetMapLayout.markers([empty])).toHaveLength(0);
    expect(
      FleetMapLayout.hit([empty], HexGeometry.toPoint(first.position!)),
    ).toBeNull();
  });
});
