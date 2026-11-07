import type { BoardingCameraBounds } from './boarding/BoardingCameraController.js';

export interface BoardingTargetPoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface BoardingEdgeTargetIndicator extends BoardingTargetPoint {
  readonly labelSide: 'left' | 'right';
  readonly hitBounds: BoardingCameraBounds;
}

type Edge = 'left' | 'right' | 'top' | 'bottom';

interface Positioned {
  readonly id: string;
  x: number;
  y: number;
  edge: Edge;
}

const center = (bounds: BoardingCameraBounds) => ({
  x: (bounds.left + bounds.right) / 2,
  y: (bounds.top + bounds.bottom) / 2,
});

const spread = (
  entries: Positioned[],
  axis: 'x' | 'y',
  min: number,
  max: number,
  gap: number,
): void => {
  entries.sort((a, b) => a[axis] - b[axis] || a.id.localeCompare(b.id));
  if (!entries.length) return;
  const effectiveGap =
    entries.length === 1
      ? 0
      : Math.min(gap, (max - min) / (entries.length - 1));
  entries[0]![axis] = Math.max(min, Math.min(max, entries[0]![axis]));
  for (let index = 1; index < entries.length; index++)
    entries[index]![axis] = Math.max(
      Math.min(max, entries[index]![axis]),
      entries[index - 1]![axis] + effectiveGap,
    );
  const overflow = Math.max(0, entries.at(-1)![axis] - max);
  for (const entry of entries) entry[axis] -= overflow;
  const underflow = Math.max(0, min - entries[0]![axis]);
  for (const entry of entries) entry[axis] += underflow;
};

/** kantindikator-for-synlig-fiende: place targets at the free viewport edge. */
export function boardingEdgeTargetIndicators(
  targets: readonly BoardingTargetPoint[],
  viewport: BoardingCameraBounds,
): readonly BoardingEdgeTargetIndicator[] {
  const inset = 22;
  const bounds = {
    left: viewport.left + inset,
    right: viewport.right - inset,
    top: viewport.top + inset,
    bottom: viewport.bottom - inset,
  };
  if (bounds.right <= bounds.left || bounds.bottom <= bounds.top) return [];
  const origin = center(bounds);
  const positioned: Positioned[] = targets.map((target) => {
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const candidates = [
      dx < 0 ? (bounds.left - origin.x) / dx : Number.POSITIVE_INFINITY,
      dx > 0 ? (bounds.right - origin.x) / dx : Number.POSITIVE_INFINITY,
      dy < 0 ? (bounds.top - origin.y) / dy : Number.POSITIVE_INFINITY,
      dy > 0 ? (bounds.bottom - origin.y) / dy : Number.POSITIVE_INFINITY,
    ];
    const distance = Math.min(...candidates);
    const x = origin.x + dx * distance;
    const y = origin.y + dy * distance;
    const edge: Edge =
      Math.abs(x - bounds.left) < 0.01
        ? 'left'
        : Math.abs(x - bounds.right) < 0.01
          ? 'right'
          : Math.abs(y - bounds.top) < 0.01
            ? 'top'
            : 'bottom';
    return { id: target.id, x, y, edge };
  });
  for (const edge of ['left', 'right', 'top', 'bottom'] as const) {
    const group = positioned.filter((entry) => entry.edge === edge);
    spread(
      group,
      edge === 'left' || edge === 'right' ? 'y' : 'x',
      edge === 'left' || edge === 'right' ? bounds.top : bounds.left,
      edge === 'left' || edge === 'right' ? bounds.bottom : bounds.right,
      edge === 'left' || edge === 'right' ? 44 : 96,
    );
  }
  return Object.freeze(
    positioned.map((entry) => {
      const labelSide =
        entry.edge === 'right' ||
        ((entry.edge === 'top' || entry.edge === 'bottom') &&
          entry.x > origin.x)
          ? 'left'
          : 'right';
      return Object.freeze({
        id: entry.id,
        x: entry.x,
        y: entry.y,
        labelSide,
        hitBounds: Object.freeze({
          left: entry.x - (labelSide === 'left' ? 92 : 20),
          right: entry.x + (labelSide === 'right' ? 92 : 20),
          top: entry.y - 22,
          bottom: entry.y + 22,
        }),
      });
    }),
  );
}

export function boardingScreenRectangleVisible(
  rectangle: BoardingCameraBounds,
  viewport: BoardingCameraBounds,
): boolean {
  return (
    rectangle.right >= viewport.left &&
    rectangle.left <= viewport.right &&
    rectangle.bottom >= viewport.top &&
    rectangle.top <= viewport.bottom
  );
}
