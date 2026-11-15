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

/** skalbar-skeppsbild-i-editor: the sprite's size limits, in cells across. */
export const EDITOR_SPRITE_SCALE = Object.freeze({ min: 1, max: 128 });

/**
 * skalbar-skeppsbild-i-editor: resize the ship image to a new width in cells
 * while the given anchor, in cells, stays on the same spot of the image.
 */
export function editorScaleSpriteAround(
  sprite: { readonly x: number; readonly y: number; readonly scale: number },
  scale: number,
  anchor: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number; readonly scale: number } {
  const next = Math.min(
    EDITOR_SPRITE_SCALE.max,
    Math.max(EDITOR_SPRITE_SCALE.min, scale),
  );
  const ratio = next / sprite.scale;
  return {
    x: anchor.x - (anchor.x - sprite.x) * ratio,
    y: anchor.y - (anchor.y - sprite.y) * ratio,
    scale: next,
  };
}

/**
 * kamera-utan-lage-i-editor: no mode switch decides between painting and
 * moving the view. The middle button, a held Space, a second finger or a press
 * outside the grid move the view; any other press paints.
 */
export function editorPressMovesView(press: {
  readonly button: number;
  readonly spaceHeld: boolean;
  readonly pointers: number;
  readonly onGrid: boolean;
}): boolean {
  return (
    press.button === 1 || press.spaceHeld || press.pointers > 1 || !press.onGrid
  );
}

/**
 * kamera-utan-lage-i-editor: zoom follows how far the wheel or trackpad
 * moved, so a trackpad's many small steps zoom smoothly instead of racing.
 */
export function editorWheelZoomFactor(wheel: {
  readonly deltaY: number;
  readonly deltaMode: number;
  readonly ctrlKey: boolean;
}): number {
  const pixels =
    wheel.deltaMode === 1
      ? wheel.deltaY * 16
      : wheel.deltaMode === 2
        ? wheel.deltaY * 400
        : wheel.deltaY;
  // A trackpad pinch arrives as ctrl + wheel with small deltas.
  const rate = wheel.ctrlKey ? 0.01 : 0.0015;
  return Math.min(2, Math.max(0.5, Math.exp(-pixels * rate)));
}
