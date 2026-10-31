import type { CameraSnapshot } from './Camera.js';
import type { MapCell } from './Galaxy.js';
import { HexGeometry } from './HexCoordinate.js';

interface Entry {
  readonly cell: MapCell;
  readonly x: number;
}
interface Row {
  readonly y: number;
  readonly entries: Entry[];
}

function lowerBound<T>(
  items: readonly T[],
  value: number,
  coordinate: (item: T) => number,
): number {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (coordinate(items[middle]!) < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** rumsligt-kartindex: sorted hex rows bound work to the viewport, not world size. */
export class MapViewport {
  readonly #rows: readonly Row[];
  readonly #overview: readonly Row[];

  constructor(readonly cells: readonly MapCell[]) {
    const rows = new Map<number, Row>();
    for (const cell of cells) {
      const point = HexGeometry.toPoint(cell.position);
      const row = rows.get(cell.position.r) ?? { y: point.y, entries: [] };
      row.entries.push({ cell, x: point.x });
      rows.set(cell.position.r, row);
    }
    this.#rows = [...rows.values()].sort((a, b) => a.y - b.y);
    for (const row of this.#rows) row.entries.sort((a, b) => a.x - b.x);
    this.#overview = this.#rows
      .map((row) => ({
        y: row.y,
        entries: row.entries.filter(
          ({ cell }) =>
            cell.explored ||
            cell.visible ||
            cell.object ||
            (cell.terrain && cell.terrain !== 'space'),
        ),
      }))
      .filter((row) => row.entries.length > 0);
  }

  query(
    camera: CameraSnapshot,
    width: number,
    height: number,
  ): readonly MapCell[] {
    const margin = HexGeometry.size * 3;
    const halfWidth = width / (2 * camera.zoom) + margin;
    const halfHeight = height / (2 * camera.zoom) + margin;
    const left = camera.center.x - halfWidth;
    const right = camera.center.x + halfWidth;
    const top = camera.center.y - halfHeight;
    const bottom = camera.center.y + halfHeight;
    const rows = camera.zoom < 0.5 ? this.#overview : this.#rows;
    const result: MapCell[] = [];
    for (
      let r = lowerBound(rows, top, (row) => row.y);
      r < rows.length && rows[r]!.y <= bottom;
      r++
    ) {
      const entries = rows[r]!.entries;
      for (
        let x = lowerBound(entries, left, (entry) => entry.x);
        x < entries.length && entries[x]!.x <= right;
        x++
      ) {
        result.push(entries[x]!.cell);
      }
    }
    return result;
  }
}
