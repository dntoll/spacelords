import { describe, expect, it } from 'vitest';
import {
  BoardingCameraController,
  type BoardingCameraSnapshot,
} from '../../../src/client/boarding/views/battle/BoardingCameraController.js';

const camera = new BoardingCameraController();
const bounds = { left: 0, top: 80, right: 400, bottom: 600 };
const initial: BoardingCameraSnapshot = {
  scale: 2,
  offset: { x: 200, y: 340 },
};
const soldier = { x: 800, y: 50, width: 40, height: 90 };
const screen = (at: BoardingCameraSnapshot, rect = soldier) => ({
  left: rect.x * at.scale + at.offset.x,
  right: (rect.x + rect.width) * at.scale + at.offset.x,
  top: rect.y * at.scale + at.offset.y,
  bottom: (rect.y + rect.height) * at.scale + at.offset.y,
});

describe('kamerafokus-vid-bordningssoldatbyte', () => {
  it('zooms out to reveal, pans at fixed zoom and restores exactly the original zoom', () => {
    const phases = camera.focus(initial, soldier, bounds);
    expect(phases).toHaveLength(3);
    expect(phases[0]!.to.scale).toBeLessThan(initial.scale);
    const overview = screen(phases[0]!.to);
    expect(overview.left).toBeGreaterThanOrEqual(bounds.left + 23.99);
    expect(overview.right).toBeLessThanOrEqual(bounds.right - 23.99);
    expect(phases[1]!.to.scale).toBe(phases[0]!.to.scale);
    expect(phases[2]!.to.scale).toBe(initial.scale);
    const final = screen(phases[2]!.to);
    expect((final.left + final.right) / 2).toBe(200);
    expect((final.top + final.bottom) / 2).toBe(340);
  });
  it('leaves a fully visible soldier alone and counts headroom hidden by the HUD as outside', () => {
    expect(
      camera.focus(initial, { x: 0, y: 0, width: 30, height: 70 }, bounds),
    ).toEqual([]);
    expect(
      camera.focus(initial, { x: 0, y: -140, width: 30, height: 70 }, bounds)
        .length,
    ).toBeGreaterThan(0);
  });
  it('samples exact endpoints and keeps the subject visible during pan and zoom-in', () => {
    const phases = camera.focus(initial, soldier, bounds);
    for (const phase of phases) {
      expect(camera.sample(phase, 0)).toEqual(phase.from);
      expect(camera.sample(phase, 1)).toEqual(phase.to);
    }
    for (const phase of phases.slice(1))
      for (const progress of [0.1, 0.5, 0.9]) {
        const rect = screen(camera.sample(phase, progress));
        expect(rect.left).toBeGreaterThanOrEqual(bounds.left);
        expect(rect.right).toBeLessThanOrEqual(bounds.right);
        expect(rect.top).toBeGreaterThanOrEqual(bounds.top);
        expect(rect.bottom).toBeLessThanOrEqual(bounds.bottom);
      }
  });
});

describe('kameraoverblick-vid-synlig-bordningsrorelse', () => {
  it('fits the mover and all observers in one zoom-out and never zooms back in', () => {
    const subjects = [
      soldier,
      { x: -600, y: -300, width: 35, height: 90 },
      { x: 300, y: 600, width: 40, height: 90 },
    ];
    const phases = camera.overview(initial, subjects, bounds);
    expect(phases).toHaveLength(1);
    const final = phases[0]!.to;
    expect(final.scale).toBeLessThan(initial.scale);
    for (const subject of subjects) {
      const rect = screen(final, subject);
      expect(rect.left).toBeGreaterThanOrEqual(bounds.left + 23.99);
      expect(rect.right).toBeLessThanOrEqual(bounds.right - 23.99);
      expect(rect.top).toBeGreaterThanOrEqual(bounds.top + 23.99);
      expect(rect.bottom).toBeLessThanOrEqual(bounds.bottom - 23.99);
    }
    expect(camera.overview(final, subjects, bounds)).toEqual([]);
  });
  it('handles tiny viewports and permits automatic zoom below the manual minimum', () => {
    const phases = camera.overview(initial, [soldier], {
      left: 0,
      top: 0,
      right: 20,
      bottom: 20,
    });
    expect(phases[0]!.to.scale).toBeLessThan(0.08);
    expect(Number.isFinite(phases[0]!.to.offset.x)).toBe(true);
    expect(camera.overview(initial, [], bounds)).toEqual([]);
  });
});

describe('kameraoverblick-fore-bordningsskott', () => {
  it('pans and zooms out once so the shooter and target are both inside the free viewport', () => {
    const shooter = { x: 700, y: -260, width: 40, height: 90 };
    const target = { x: 940, y: 420, width: 40, height: 90 };
    const phases = camera.frame(initial, [shooter, target], bounds);
    expect(phases).toHaveLength(1);
    const final = phases[0]!.to;
    expect(final.scale).toBeLessThan(initial.scale);
    for (const subject of [shooter, target]) {
      const rect = screen(final, subject);
      expect(rect.left).toBeGreaterThanOrEqual(bounds.left + 23.99);
      expect(rect.right).toBeLessThanOrEqual(bounds.right - 23.99);
      expect(rect.top).toBeGreaterThanOrEqual(bounds.top + 23.99);
      expect(rect.bottom).toBeLessThanOrEqual(bounds.bottom - 23.99);
    }
    const combined = {
      left: Math.min(screen(final, shooter).left, screen(final, target).left),
      right: Math.max(
        screen(final, shooter).right,
        screen(final, target).right,
      ),
      top: Math.min(screen(final, shooter).top, screen(final, target).top),
      bottom: Math.max(
        screen(final, shooter).bottom,
        screen(final, target).bottom,
      ),
    };
    expect((combined.left + combined.right) / 2).toBeCloseTo(200);
    expect((combined.top + combined.bottom) / 2).toBeCloseTo(340);
  });

  it('does not move the camera when both combatants are already visible', () => {
    expect(
      camera.frame(
        initial,
        [
          { x: -40, y: -40, width: 30, height: 60 },
          { x: 30, y: 20, width: 30, height: 60 },
        ],
        bounds,
      ),
    ).toEqual([]);
  });
});

describe('kantindikator-for-synlig-fiende', () => {
  it('centers an offscreen target without changing zoom', () => {
    const phases = camera.center(initial, soldier, bounds);
    expect(phases).toHaveLength(1);
    expect(phases[0]!.to.scale).toBe(initial.scale);
    const final = screen(phases[0]!.to);
    expect((final.left + final.right) / 2).toBe(200);
    expect((final.top + final.bottom) / 2).toBe(340);
  });
});
