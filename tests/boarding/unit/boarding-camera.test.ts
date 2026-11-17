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
const observer = { x: -600, y: -300, width: 35, height: 90 };
const screen = (at: BoardingCameraSnapshot, rect = soldier) => ({
  left: rect.x * at.scale + at.offset.x,
  right: (rect.x + rect.width) * at.scale + at.offset.x,
  top: rect.y * at.scale + at.offset.y,
  bottom: (rect.y + rect.height) * at.scale + at.offset.y,
});

describe('kamerafokus-vid-bordningssoldatbyte', () => {
  it('centers the soldier at the player zoom in one step', () => {
    const playerZoom = 1.5;
    const phases = camera.focus(initial, soldier, bounds, playerZoom);
    expect(phases).toHaveLength(1);
    expect(phases[0]!.to.scale).toBe(playerZoom);
    const final = screen(phases[0]!.to);
    expect((final.left + final.right) / 2).toBe(200);
    expect((final.top + final.bottom) / 2).toBe(340);
    expect(camera.sample(phases[0]!, 0)).toEqual(phases[0]!.from);
    expect(camera.sample(phases[0]!, 1)).toEqual(phases[0]!.to);
  });
  it('recenters a visible soldier and stays put when already focused', () => {
    const visible = { x: 40, y: 80, width: 30, height: 70 };
    const phases = camera.focus(initial, visible, bounds, initial.scale);
    expect(phases.length).toBeGreaterThan(0);
    expect(phases.at(-1)!.to.scale).toBe(initial.scale);
    expect(
      camera.focus(phases.at(-1)!.to, visible, bounds, initial.scale),
    ).toEqual([]);
  });
  it('returns to the saved pan at the player zoom after a temporary overview', () => {
    const home = { x: 200, y: 340 };
    const wide = camera.frame(initial, [soldier, observer], bounds)[0]!.to;
    expect(wide.scale).toBeLessThan(initial.scale);
    const phases = camera.restore(wide, home, initial.scale, bounds);
    expect(phases).toHaveLength(1);
    expect(phases[0]!.to).toEqual({ scale: initial.scale, offset: home });
    expect(camera.restore(phases[0]!.to, home, initial.scale, bounds)).toEqual(
      [],
    );
  });
});

describe('kameraoverblick-vid-synlig-bordningsrorelse', () => {
  it('pans a lone off-screen mover to the center without zooming out', () => {
    const phases = camera.frame(initial, [soldier], bounds);
    expect(phases).toHaveLength(1);
    expect(phases[0]!.to.scale).toBe(initial.scale);
    const rect = screen(phases[0]!.to);
    expect((rect.left + rect.right) / 2).toBeCloseTo(200);
    expect((rect.top + rect.bottom) / 2).toBeCloseTo(340);
  });
  it('fits the mover and all observers in one pan and zoom-out and never zooms back in', () => {
    const subjects = [
      soldier,
      { x: -600, y: -300, width: 35, height: 90 },
      { x: 300, y: 600, width: 40, height: 90 },
    ];
    const phases = camera.frame(initial, subjects, bounds);
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
    expect(camera.frame(final, subjects, bounds)).toEqual([]);
  });
  it('handles tiny viewports and permits automatic zoom below the manual minimum', () => {
    const phases = camera.frame(initial, [soldier, observer], {
      left: 0,
      top: 0,
      right: 20,
      bottom: 20,
    });
    expect(phases[0]!.to.scale).toBeLessThan(0.08);
    expect(Number.isFinite(phases[0]!.to.offset.x)).toBe(true);
    expect(camera.frame(initial, [], bounds)).toEqual([]);
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
