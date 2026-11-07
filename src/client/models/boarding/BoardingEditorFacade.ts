import {
  BoardingEditor,
  type EditorBrushButton,
  type EditorPaintCell,
  type EditorProjection,
  type EditorTool,
  type SpriteTransform,
} from './BoardingEditor.js';
import type { BoardingMapId } from '../../../shared/boarding-map-format.js';

export interface BoardingEditorCatalogItem {
  readonly id: BoardingMapId;
  readonly name: string;
}

export type EditorMapRequest = 'same' | 'load' | 'confirm';

/** lokal-bordningskarteditor: the editor case, without display text or HTTP. */
export class BoardingEditorFacade {
  #catalog: readonly BoardingEditorCatalogItem[] = [];
  #editor: BoardingEditor | null = null;
  #pending: BoardingMapId | null = null;

  get available(): boolean {
    return this.#catalog.length > 0;
  }

  get catalog(): readonly BoardingEditorCatalogItem[] {
    return this.#catalog;
  }

  get editor(): BoardingEditor['snapshot'] | null {
    return this.#editor?.snapshot ?? null;
  }

  get pendingDiscard(): BoardingMapId | null {
    return this.#pending;
  }

  setCatalog(maps: readonly BoardingEditorCatalogItem[]): void {
    this.#catalog = Object.freeze(maps.map((map) => Object.freeze({ ...map })));
  }

  open(id: BoardingMapId, source: string): void {
    this.#editor = new BoardingEditor(id, source);
    this.#pending = null;
  }

  close(): void {
    this.#editor = null;
    this.#pending = null;
  }

  requestMap(id: BoardingMapId): EditorMapRequest {
    const current = this.#editor?.snapshot.mapId;
    if (current === id) return 'same';
    if (this.#editor?.snapshot.dirty) {
      this.#pending = id;
      return 'confirm';
    }
    return 'load';
  }

  confirmDiscard(): BoardingMapId | null {
    const id = this.#pending;
    this.#pending = null;
    return id;
  }

  cancelDiscard(): void {
    this.#pending = null;
  }

  bindTool(button: EditorBrushButton, tool: EditorTool): void {
    this.#editor?.bindTool(button, tool);
  }

  paint(button: EditorBrushButton, cells: readonly EditorPaintCell[]): void {
    this.#editor?.paintStroke(button, cells);
  }

  resize(width: number, height: number): void {
    this.#editor?.resize(width, height);
  }

  spriteTransform(sprite: SpriteTransform): void {
    this.#editor?.setSpriteTransform(sprite);
  }

  adjustSprite(value: boolean): void {
    this.#editor?.setAdjustSprite(value);
  }

  projection(value: EditorProjection): void {
    this.#editor?.setProjection(value);
  }

  opacity(value: number): void {
    this.#editor?.setSpriteOpacity(value);
  }

  undo(): void {
    this.#editor?.undo();
  }

  redo(): void {
    this.#editor?.redo();
  }

  source(): string | null {
    return this.#editor?.source() ?? null;
  }

  markSaved(): void {
    this.#editor?.markSaved();
  }
}
