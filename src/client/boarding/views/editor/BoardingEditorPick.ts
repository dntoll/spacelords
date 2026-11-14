import type {
  EditorPaintCell,
  EditorProjection,
} from '../../models/editor/BoardingEditor.js';
import {
  boardingCellFromIsoPoint,
  type BoardingPoint,
} from '../rendering/BoardingProjection.js';

export const EDITOR_ORTHO_CELL = 36;

/** isometrisk-bordningskarteditor: hit-test for both editor projections. */
export function boardingEditorCellAt(
  projection: EditorProjection,
  point: { readonly x: number; readonly y: number },
  camera: {
    readonly offset: BoardingPoint;
    readonly scale: number;
  },
  map: { readonly width: number; readonly height: number },
): EditorPaintCell | null {
  if (projection === 'isometric') {
    const cell = boardingCellFromIsoPoint({
      x: (point.x - camera.offset.x) / camera.scale,
      y: (point.y - camera.offset.y) / camera.scale,
    });
    if (cell.q < 0 || cell.r < 0 || cell.q >= map.width || cell.r >= map.height)
      return null;
    return { q: cell.q, r: cell.r };
  }
  const size = EDITOR_ORTHO_CELL * camera.scale;
  const q = Math.floor((point.x - camera.offset.x) / size);
  const r = Math.floor((point.y - camera.offset.y) / size);
  if (q < 0 || r < 0 || q >= map.width || r >= map.height) return null;
  return { q, r };
}
