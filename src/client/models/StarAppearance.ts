import type { HexCoordinate } from './HexCoordinate.js';

export const STAR_COLORS = [
  '#ff806d',
  '#ffb25f',
  '#ffe29a',
  '#fff4e7',
  '#a9d6ff',
] as const;

/** stjarnvariation: appearance is stable across saves without stored attributes. */
export function starAppearance(position: Pick<HexCoordinate, 'q' | 'r'>): {
  readonly color: (typeof STAR_COLORS)[number];
  readonly palette: number;
  readonly size: number;
} {
  if (position.q === 0 && position.r === 0)
    return Object.freeze({ color: STAR_COLORS[2], palette: 2, size: 1 });
  let hash =
    Math.imul(position.q + 101, 374761393) ^
    Math.imul(position.r + 101, 668265263);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  hash = (hash ^ (hash >>> 16)) >>> 0;
  const palette = hash % STAR_COLORS.length;
  return Object.freeze({
    color: STAR_COLORS[palette]!,
    palette,
    size: 0.62 + (((hash >>> 8) % 1000) / 999) * 0.38,
  });
}

export function starDetail(zoom: number): 'texture' | 'glow' | 'point' {
  return zoom >= 0.65 ? 'texture' : zoom >= 0.2 ? 'glow' : 'point';
}

export function showMapHex(zoom: number, explored: boolean): boolean {
  return explored || zoom >= 0.5;
}
