import { describe, expect, it } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';
import {
  RESEARCH_TREE,
  ResearchTreeCamera,
} from '../../src/client/models/ResearchTree.js';
import {
  PREREQUISITES,
  TECHNOLOGIES,
} from '../../src/client/models/Research.js';

describe('forsknings-tradnavigation', () => {
  it('forskningskamerans-granser: stops at the complete tree and cannot pan it into empty space', () => {
    const camera = new ResearchTreeCamera();
    camera.resize(800, 600);
    camera.fit();
    const fitted = camera.snapshot;
    camera.zoomAt(0.1, { x: 10, y: 10 });
    expect(camera.snapshot).toEqual(fitted);
    camera.panBy({ x: 10000, y: -10000 });
    expect(camera.snapshot).toEqual(fitted);
    camera.zoomAt(100, { x: 400, y: 300 });
    camera.panBy({ x: 10000, y: 10000 });
    const upper = camera.snapshot;
    expect(upper.offset.x + 32 * upper.zoom).toBeLessThanOrEqual(16.01);
    expect(upper.offset.y + 32 * upper.zoom).toBeLessThanOrEqual(16.01);
  });
  it('forskningskamerans-granser: recenters a small tree and rebinds after resize and newly available branches', () => {
    const camera = new ResearchTreeCamera();
    camera.setTechnologies(['Rocket engine factory']);
    camera.resize(800, 600);
    camera.fit();
    expect(camera.snapshot.zoom).toBe(1.8);
    const small = camera.snapshot;
    camera.panBy({ x: -1000, y: 1000 });
    expect(camera.snapshot).toEqual(small);
    camera.setTechnologies(TECHNOLOGIES);
    camera.fit();
    expect(camera.snapshot.zoom).toBeLessThan(small.zoom);
    camera.resize(390, 700);
    camera.fit();
    const phone = camera.snapshot;
    camera.zoomAt(0.01, { x: 0, y: 0 });
    camera.panBy({ x: 900, y: -900 });
    expect(camera.snapshot).toEqual(phone);
  });
  it('routes drag and pinch through the controller without moving the star map or changing research', () => {
    const model = new AppModel();
    let emit: IntentHandler = () => {};
    const controller = new AppController(model, {
      bind: (handler) => {
        emit = handler;
      },
      render: () => {},
      dispose: () => {},
    });
    controller.start();
    const map = model.snapshot.camera;
    emit({ type: 'open-research' });
    emit({ type: 'research-size', width: 800, height: 600 });
    emit({ type: 'research-zoom', factor: 1.2, anchor: { x: 400, y: 300 } });
    const initial = model.snapshot.researchCamera;
    emit({ type: 'research-pointer-start', id: 1, point: { x: 100, y: 100 } });
    emit({ type: 'research-pointer-move', id: 1, point: { x: 160, y: 130 } });
    expect(model.snapshot.researchCamera.offset).not.toEqual(initial.offset);
    emit({ type: 'research-pointer-start', id: 2, point: { x: 240, y: 130 } });
    emit({ type: 'research-pointer-move', id: 2, point: { x: 280, y: 130 } });
    expect(model.snapshot.researchCamera.zoom).toBeGreaterThan(initial.zoom);
    emit({ type: 'research-pointer-cancel' });
    const stopped = model.snapshot.researchCamera;
    emit({ type: 'research-pointer-move', id: 1, point: { x: 900, y: 600 } });
    expect(model.snapshot.researchCamera).toEqual(stopped);
    emit({ type: 'open-map' });
    emit({ type: 'open-research' });
    expect(model.snapshot.researchCamera).toEqual(stopped);
    expect(model.snapshot.camera).toEqual(map);
    expect(model.snapshot.research.queue).toEqual([]);
  });
  it('connects each real prerequisite to its dependent technology and separates cards', () => {
    expect(RESEARCH_TREE.nodes.map((n) => n.technology).toSorted()).toEqual(
      [...TECHNOLOGIES].sort(),
    );
    for (const technology of TECHNOLOGIES) {
      expect(
        RESEARCH_TREE.edges
          .filter((e) => e.to === technology)
          .map((e) => e.from)
          .toSorted(),
      ).toEqual([...PREREQUISITES[technology]].sort());
    }
    for (const edge of RESEARCH_TREE.edges) {
      const from = RESEARCH_TREE.nodes.find((n) => n.technology === edge.from)!;
      const to = RESEARCH_TREE.nodes.find((n) => n.technology === edge.to)!;
      expect(from.x + RESEARCH_TREE.cardWidth).toBeLessThan(to.x);
    }
    for (const a of RESEARCH_TREE.nodes)
      for (const b of RESEARCH_TREE.nodes) {
        if (a === b) continue;
        expect(
          Math.abs(a.x - b.x) >= RESEARCH_TREE.cardWidth ||
            Math.abs(a.y - b.y) >= RESEARCH_TREE.cardHeight,
        ).toBe(true);
      }
  });

  it('fits the entire tree, anchors zoom, bounds navigation and retains the camera on resize', () => {
    const camera = new ResearchTreeCamera();
    camera.resize(800, 600);
    camera.fit();
    const initial = camera.snapshot;
    expect(initial.offset.x + 32 * initial.zoom).toBeGreaterThanOrEqual(15.99);
    expect(initial.offset.y + 32 * initial.zoom).toBeGreaterThanOrEqual(15.99);
    expect(
      initial.offset.x + (RESEARCH_TREE.width - 32) * initial.zoom,
    ).toBeLessThanOrEqual(800);
    expect(
      initial.offset.y + (RESEARCH_TREE.height - 32) * initial.zoom,
    ).toBeLessThanOrEqual(600);
    const anchor = { x: 400, y: 300 };
    const world = {
      x: (anchor.x - initial.offset.x) / initial.zoom,
      y: (anchor.y - initial.offset.y) / initial.zoom,
    };
    camera.zoomAt(1.5, anchor);
    expect(
      (anchor.x - camera.snapshot.offset.x) / camera.snapshot.zoom,
    ).toBeCloseTo(world.x);
    expect(
      (anchor.y - camera.snapshot.offset.y) / camera.snapshot.zoom,
    ).toBeCloseTo(world.y);
    camera.panBy({ x: 80, y: -40 });
    const moved = camera.snapshot;
    camera.resize(900, 650);
    expect(camera.snapshot.zoom).toBe(moved.zoom);
    camera.zoomAt(Infinity, anchor);
    expect(camera.snapshot.zoom).toBe(moved.zoom);
    camera.zoomAt(100, anchor);
    expect(camera.snapshot.zoom).toBeLessThanOrEqual(1.8);
    camera.zoomAt(0.0001, anchor);
    expect(camera.snapshot.zoom).toBeGreaterThanOrEqual(0.15);
    expect(Object.isFrozen(camera.snapshot.offset)).toBe(true);
  });
});
