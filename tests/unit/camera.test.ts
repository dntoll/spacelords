import { describe, expect, it } from 'vitest';
import { Camera } from '../../src/client/models/Camera.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../src/client/models/HexCoordinate.js';
import { MapGesture } from '../../src/client/controllers/MapGesture.js';

describe('kartnavigation', () => {
  it('keeps the point under the pointer fixed while zooming', () => {
    const camera = new Camera(new HexCoordinate(1, 0), 10);
    const anchor = { x: 170, y: -90 };
    const before = camera.screenToWorld(anchor);
    camera.zoomAt(1.5, anchor);
    expect(camera.screenToWorld(anchor).x).toBeCloseTo(before.x);
    expect(camera.screenToWorld(anchor).y).toBeCloseTo(before.y);
  });

  it('clamps zoom and panning and restores the home position', () => {
    const home = new HexCoordinate(1, 0);
    const camera = new Camera(home, 10);
    camera.zoomAt(1e6, { x: 0, y: 0 });
    expect(camera.snapshot.zoom).toBe(2.5);
    camera.zoomAt(1e-6, { x: 0, y: 0 });
    expect(camera.snapshot.zoom).toBe(0.35);
    camera.panBy({ x: 1e6, y: -1e6 });
    const position = HexGeometry.fromPoint(camera.snapshot.center);
    expect(position.distanceTo(new HexCoordinate(0, 0))).toBeLessThanOrEqual(
      10,
    );
    camera.reset();
    expect(camera.snapshot.center).toEqual(HexGeometry.toPoint(home));
    expect(camera.snapshot.zoom).toBe(1);
  });

  it('treats a drag as a gesture even after the pointer returns to its start', () => {
    const gesture = new MapGesture();
    gesture.start(1, { x: 0, y: 0 });
    expect(gesture.move(1, { x: 30, y: 0 }).type).toBe('pan');
    gesture.move(1, { x: 0, y: 0 });
    expect(gesture.end(1)).toBeNull();
  });

  it('distinguishes a tap from a pinch and never selects after a pinch', () => {
    const gesture = new MapGesture();
    gesture.start(1, { x: 0, y: 0 });
    expect(gesture.end(1)).toEqual({ x: 0, y: 0 });
    gesture.start(1, { x: 0, y: 0 });
    gesture.start(2, { x: 100, y: 0 });
    const action = gesture.move(2, { x: 150, y: 0 });
    expect(action.type).toBe('pinch');
    if (action.type === 'pinch') expect(action.factor).toBe(1.5);
    expect(gesture.end(2)).toBeNull();
    expect(gesture.end(1)).toBeNull();
  });
});
