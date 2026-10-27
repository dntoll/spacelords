import { describe, expect, it } from 'vitest';
import {
  starAppearance,
  starDetail,
  showMapHex,
} from '../../src/client/models/StarAppearance.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { SpiralGalaxyLayout } from '../../src/client/models/SpiralGalaxyLayout.js';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';

describe('stjarnvariation / utokad-utzoomning', () => {
  it('retains five colors and varied sizes across reload without new saved fields', () => {
    const positions = HexCoordinate.disk(8);
    const appearances = positions.map(starAppearance);
    expect(new Set(appearances.map((a) => a.color)).size).toBe(5);
    expect(new Set(appearances.map((a) => a.size)).size).toBeGreaterThan(20);
    expect(starAppearance(new HexCoordinate(0, 0)).color).toBe('#ffe29a');
    expect(positions.map((p) => starAppearance({ q: p.q, r: p.r }))).toEqual(
      appearances,
    );
    expect(appearances.every((a) => a.size >= 0.62 && a.size <= 1)).toBe(true);
  });
  it('switches details and removes only the unknown grid at the chosen zoom boundaries', () => {
    expect([0.03, 0.199, 0.2, 0.649, 0.65, 2.5].map(starDetail)).toEqual([
      'point',
      'point',
      'glow',
      'glow',
      'texture',
      'texture',
    ]);
    expect(showMapHex(0.49, false)).toBe(false);
    expect(showMapHex(0.5, false)).toBe(true);
    expect(showMapHex(0.03, true)).toBe(true);
  });
});

describe('galaxarmar', () => {
  it('creates reproducible sparse placements with variable distances and retained named systems', () => {
    const anchors = [
      new HexCoordinate(0, 0),
      new HexCoordinate(7, -3),
      new HexCoordinate(-6, 6),
    ];
    const points = SpiralGalaxyLayout.positions(anchors);
    expect(points).toHaveLength(150);
    expect(SpiralGalaxyLayout.positions(anchors)).toEqual(points);
    expect(points.slice(0, 3)).toEqual(anchors);
    const nearest = points.map((point, index) =>
      Math.min(
        ...points
          .filter((_, i) => i !== index)
          .map((other) => point.distanceTo(other)),
      ),
    );
    expect(Math.min(...nearest)).toBeGreaterThanOrEqual(5);
    expect(Math.max(...nearest)).toBeGreaterThanOrEqual(12);
    expect(new Set(nearest).size).toBeGreaterThanOrEqual(7);
  });
  it('avstamning-sparkompatibilitet: preserves a saved 300-system world without regenerating it', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    const world = structuredClone(state.world);
    const positions = HexCoordinate.disk(98).filter(
      (p) => p.distanceTo(new HexCoordinate(0, 0)) > 15,
    );
    const template = world.systems[1]!;
    const extra = positions.slice(0, 297).map((point, index) => ({
      ...structuredClone(template),
      star: {
        ...template.star,
        id: `old-${index}`,
        name: `Old ${index}`,
        position: { q: point.q, r: point.r },
      },
      planets: [],
    }));
    const old = {
      ...state,
      world: { ...world, radius: 100, systems: [...world.systems, ...extra] },
    };
    const loaded = Game.restore(old).exportState();
    expect(loaded.world.systems).toHaveLength(300);
    expect(loaded.world).toEqual(old.world);
  });
});
