import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BOARDING_COVER_HEIGHT,
  BOARDING_TILE_HEIGHT,
  BOARDING_TILE_WIDTH,
  BOARDING_WALL_HEIGHT,
  BOARDING_WALL_SLICES,
  boardingCellFromIsoPoint,
  boardingFeatureFootprint,
  boardingFeatureGlyph,
  boardingFeatureHeight,
  boardingIsoCamera,
  boardingIsoCenter,
  boardingIsoCorners,
  boardingIsoCellPoint,
  boardingAnimTick,
  boardingProjectilePoint,
  boardingIsoTextureTransform,
  boardingQuadTextureTransform,
  boardingWallRun,
  boardingWallSlice,
} from '../../src/client/views/boarding/BoardingProjection.js';

const floorTile = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    '../../src/client/assets/boarding/floor-tile.png',
  ),
);

describe('isometrisk-bordningsvy', () => {
  it('uses classic 2:1 diamond tiles and maps a screen point back to its square cell', () => {
    const origin = boardingIsoCenter({ q: 0, r: 0 });
    const alongQ = boardingIsoCenter({ q: 1, r: 0 });
    const alongR = boardingIsoCenter({ q: 0, r: 1 });
    expect(alongQ.y).toBeGreaterThan(origin.y);
    expect(alongR.y).toBeGreaterThan(origin.y);
    expect(Math.sign(alongQ.x - origin.x)).not.toBe(
      Math.sign(alongR.x - origin.x),
    );
    const corners = boardingIsoCorners({ q: 0, r: 0 });
    expect(corners).toHaveLength(4);
    const width =
      Math.max(...corners.map((point) => point.x)) -
      Math.min(...corners.map((point) => point.x));
    const height =
      Math.max(...corners.map((point) => point.y)) -
      Math.min(...corners.map((point) => point.y));
    expect(width / height).toBe(2);
    expect(width).toBe(BOARDING_TILE_WIDTH);
    expect(height).toBe(BOARDING_TILE_HEIGHT);
    expect(boardingFeatureFootprint('wall')).toEqual({
      width: width / 2,
      depth: height / 2,
    });
    expect(boardingFeatureFootprint('hull')).toEqual({
      width: width / 2,
      depth: height / 2,
    });
    expect(boardingFeatureHeight('cover')).toBe(BOARDING_WALL_HEIGHT / 2);
    expect(BOARDING_COVER_HEIGHT).toBe(BOARDING_WALL_HEIGHT / 2);
    expect(boardingFeatureGlyph({ kind: 'wall' })).toBeNull();
    expect(boardingFeatureGlyph({ kind: 'hull' })).toBeNull();
    expect(boardingFeatureGlyph({ kind: 'cover' })).toBe('▰');
    expect(
      boardingFeatureGlyph({ kind: 'door', open: false, locked: false }),
    ).toBe('▮');

    const map = { width: 17, height: 11 };
    const view = { width: 390, height: 600 };
    const at = { q: 3, r: 9 };
    const camera = boardingIsoCamera(map, view);
    const screen = boardingIsoCellPoint(map, view, at);
    expect(screen.x).toBeGreaterThan(0);
    expect(screen.x).toBeLessThan(view.width);
    expect(screen.y).toBeGreaterThan(0);
    expect(screen.y).toBeLessThan(view.height);
    expect(
      boardingCellFromIsoPoint({
        x: (screen.x - camera.offset.x) / camera.scale,
        y: (screen.y - camera.offset.y) / camera.scale,
      }),
    ).toEqual(at);
  });
});

describe('isometriska-golvtiles', () => {
  it('projects a square floor texture onto the exact 2:1 diamond', () => {
    expect([...floorTile.subarray(0, 8)]).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    expect(floorTile.readUInt32BE(16)).toBe(floorTile.readUInt32BE(20));
    expect(floorTile[25]).toBe(6);

    const size = 64;
    const [a, b, c, d, e, f] = boardingIsoTextureTransform(size, size, {
      q: 2,
      r: 3,
    });
    const map = (x: number, y: number) => ({
      x: a * x + c * y + e,
      y: b * x + d * y + f,
    });
    const [north, east, south, west] = boardingIsoCorners({ q: 2, r: 3 });
    expect(map(0, 0)).toEqual(north);
    expect(map(size, 0)).toEqual(east);
    expect(map(size, size)).toEqual(south);
    expect(map(0, size)).toEqual(west);
  });
});

const wallTile = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    '../../src/client/assets/boarding/wall-tile.png',
  ),
);

describe('isometriska-vaggtexturer', () => {
  it('clips consecutive tiles from a long wall facade onto each run', () => {
    expect([...wallTile.subarray(0, 8)]).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    expect(wallTile.readUInt32BE(16)).toBeGreaterThan(
      wallTile.readUInt32BE(20),
    );
    expect(wallTile[25]).toBe(6);

    const walls = new Set(['2,3', '3,3', '4,3']);
    expect(boardingWallRun(walls, { q: 2, r: 3 }, 'q')).toEqual({
      index: 0,
      length: 3,
    });
    expect(boardingWallRun(walls, { q: 3, r: 3 }, 'q')).toEqual({
      index: 1,
      length: 3,
    });
    expect(boardingWallRun(walls, { q: 4, r: 3 }, 'q')).toEqual({
      index: 2,
      length: 3,
    });
    expect(boardingWallRun(walls, { q: 3, r: 3 }, 'r')).toEqual({
      index: 0,
      length: 1,
    });

    const first = boardingWallSlice(800, 0);
    const second = boardingWallSlice(800, 1);
    const wrapped = boardingWallSlice(800, BOARDING_WALL_SLICES);
    expect(first).toEqual({ x: 0, width: 800 / BOARDING_WALL_SLICES });
    expect(second.x).toBe(first.x + first.width);
    expect(wrapped).toEqual(first);

    const origin = { x: 10, y: 20 };
    const alongU = { x: 40, y: 30 };
    const alongV = { x: 5, y: 50 };
    const [a, b, c, d, e, f] = boardingQuadTextureTransform(
      8,
      4,
      origin,
      alongU,
      alongV,
    );
    const map = (x: number, y: number) => ({
      x: a * x + c * y + e,
      y: b * x + d * y + f,
    });
    expect(map(0, 0)).toEqual(origin);
    expect(map(8, 0)).toEqual(alongU);
    expect(map(0, 4)).toEqual(alongV);
  });
});

describe('animerat-bordningsskott', () => {
  it('ends the tracer once the shot reaches the target', () => {
    const flying = boardingAnimTick(1_000, 280, 1_140);
    expect(flying.done).toBe(false);
    expect(flying.progress).toBeGreaterThan(0);
    expect(flying.progress).toBeLessThan(1);
    const arrived = boardingAnimTick(1_000, 280, 1_280);
    expect(arrived.done).toBe(true);
    expect(arrived.progress).toBe(1);
  });
});

it('synligt-skott-hela-vagen / kastad-granat-i-bage: reaches the exact destination and grenade rises above the straight path', () => {
  const from = { x: 10, y: 20 };
  const to = { x: 110, y: 40 };
  expect(boardingProjectilePoint(from, to, 0)).toEqual(from);
  expect(boardingProjectilePoint(from, to, 1)).toEqual(to);
  expect(boardingProjectilePoint(from, to, 1, 'grenade')).toEqual(to);
  expect(boardingProjectilePoint(from, to, 0.5, 'grenade').y).toBeLessThan(
    boardingProjectilePoint(from, to, 0.5).y,
  );
});
