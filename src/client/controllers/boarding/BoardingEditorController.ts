import type { BoardingEditorFacade } from '../../models/boarding/BoardingEditorFacade.js';
import type {
  EditorBrushButton,
  EditorPaintCell,
  EditorProjection,
  EditorTool,
  SpriteTransform,
} from '../../models/boarding/BoardingEditor.js';
import {
  BOARDING_MAP_IDS,
  type BoardingMapId,
} from '../../../shared/boarding-map-format.js';

function isMapId(value: unknown): value is BoardingMapId {
  return (
    typeof value === 'string' &&
    (BOARDING_MAP_IDS as readonly string[]).includes(value)
  );
}

/** lokal-bordningskarteditor: HTTP stays here; the facade owns the draft. */
export class BoardingEditorController {
  readonly #editor: BoardingEditorFacade;
  #request = 0;

  constructor(editor: BoardingEditorFacade) {
    this.#editor = editor;
  }

  async refresh(): Promise<void> {
    try {
      const response = await fetch('/api/boarding-maps');
      if (!response.ok) {
        this.#editor.setCatalog([]);
        return;
      }
      const body = (await response.json()) as { maps?: unknown };
      const listed: readonly unknown[] = Array.isArray(body.maps)
        ? body.maps
        : [];
      const maps = listed.flatMap((item: unknown) => {
        if (typeof item !== 'object' || item === null) return [];
        const record = item as {
          readonly id?: unknown;
          readonly name?: unknown;
        };
        if (
          !isMapId(record.id) ||
          typeof record.name !== 'string' ||
          record.name.length === 0
        )
          return [];
        return [Object.freeze({ id: record.id, name: record.name })];
      });
      this.#editor.setCatalog(maps);
    } catch {
      this.#editor.setCatalog([]);
    }
  }

  async open(id?: BoardingMapId): Promise<void> {
    const token = ++this.#request;
    const chosen =
      id ?? this.#editor.editor?.mapId ?? this.#editor.catalog[0]?.id;
    if (!chosen) return;
    const source = await this.#read(chosen);
    if (token !== this.#request) return;
    this.#editor.open(chosen, source);
  }

  close(): void {
    this.#request += 1;
    this.#editor.close();
  }

  async select(id: BoardingMapId): Promise<void> {
    const outcome = this.#editor.requestMap(id);
    if (outcome === 'load') await this.open(id);
  }

  async confirmSwitch(): Promise<void> {
    const id = this.#editor.confirmDiscard();
    if (id) await this.open(id);
  }

  cancelSwitch(): void {
    this.#editor.cancelDiscard();
  }

  bindTool(button: EditorBrushButton, tool: EditorTool): void {
    this.#editor.bindTool(button, tool);
  }

  paint(button: EditorBrushButton, cells: readonly EditorPaintCell[]): void {
    this.#editor.paint(button, cells);
  }

  resize(width: number, height: number): void {
    this.#editor.resize(width, height);
  }

  spriteTransform(sprite: SpriteTransform): void {
    this.#editor.spriteTransform(sprite);
  }

  adjustSprite(value: boolean): void {
    this.#editor.adjustSprite(value);
  }

  projection(value: EditorProjection): void {
    this.#editor.projection(value);
  }

  opacity(value: number): void {
    this.#editor.opacity(value);
  }

  undo(): void {
    this.#editor.undo();
  }

  redo(): void {
    this.#editor.redo();
  }

  async save(): Promise<void> {
    const editor = this.#editor.editor;
    const source = this.#editor.source();
    if (!editor || source === null || editor.parseError) return;
    const token = this.#request;
    const response = await fetch(`/api/boarding-maps/${editor.mapId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source }),
    });
    if (!response.ok) throw new Error('The boarding map could not be saved.');
    if (token !== this.#request) return;
    this.#editor.markSaved();
  }

  async #read(id: BoardingMapId): Promise<string> {
    const response = await fetch(`/api/boarding-maps/${id}`);
    if (!response.ok) throw new Error('The boarding map could not be loaded.');
    const body = (await response.json()) as { source?: unknown };
    if (typeof body.source !== 'string')
      throw new Error('The boarding map could not be loaded.');
    return body.source;
  }
}
