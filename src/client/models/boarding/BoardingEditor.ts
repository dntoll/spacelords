import {
  BOARDING_LAYER_SYMBOLS,
  formatBoardingMap,
  parseBoardingMapText,
  type BoardingEditorLayer,
  type BoardingMapId,
  type BoardingMapText,
} from '../../../shared/boarding-map-format.js';

export const BOARDING_EDITOR_MAX_SIZE = 64;
export const BOARDING_EDITOR_MIN_SIZE = 1;

export type EditorBrushButton = 'primary' | 'secondary';
export type EditorProjection = 'top-down' | 'isometric';

export interface EditorTool {
  readonly layer: BoardingEditorLayer;
  readonly symbol: string;
}

export interface SpriteTransform {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface EditorPaintCell {
  readonly q: number;
  readonly r: number;
}

export interface BoardingEditorSnapshot {
  readonly mapId: BoardingMapId;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly campaign: boolean;
  readonly layers: {
    readonly terrain: readonly string[];
    readonly objects: readonly string[];
    readonly rooms: readonly string[];
    readonly spawns: readonly string[];
  };
  readonly primary: EditorTool;
  readonly secondary: EditorTool;
  readonly sprite: SpriteTransform;
  readonly spriteOpacity: number;
  readonly adjustSprite: boolean;
  readonly projection: EditorProjection;
  readonly dirty: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly parseError: string | null;
  readonly airlockWarning: boolean;
}

interface EditorCommand {
  execute(): void;
  undo(): void;
}

const DEFAULT_PRIMARY: EditorTool = Object.freeze({
  layer: 'terrain',
  symbol: 'H',
});
const DEFAULT_SECONDARY: EditorTool = Object.freeze({
  layer: 'terrain',
  symbol: '.',
});

function cloneRows(rows: readonly string[]): string[] {
  return [...rows];
}

function symbolAt(
  rows: readonly string[],
  q: number,
  r: number,
): string | null {
  return rows[r]?.[q] ?? null;
}

function writeCell(rows: string[], q: number, r: number, symbol: string): void {
  const row = rows[r];
  if (!row) return;
  rows[r] = `${row.slice(0, q)}${symbol}${row.slice(q + 1)}`;
}

function resizeRows(
  rows: readonly string[],
  width: number,
  height: number,
  fill: string,
): string[] {
  const next: string[] = [];
  for (let r = 0; r < height; r++) {
    const row = rows[r] ?? '';
    next.push(
      row.length >= width
        ? row.slice(0, width)
        : row + fill.repeat(width - row.length),
    );
  }
  return next;
}

function freezeTool(tool: EditorTool): EditorTool {
  return Object.freeze({ layer: tool.layer, symbol: tool.symbol });
}

class CommandHistory {
  readonly #undo: EditorCommand[] = [];
  readonly #redo: EditorCommand[] = [];

  run(command: EditorCommand): void {
    command.execute();
    this.#undo.push(command);
    this.#redo.length = 0;
  }

  undo(): boolean {
    const command = this.#undo.pop();
    if (!command) return false;
    command.undo();
    this.#redo.push(command);
    return true;
  }

  redo(): boolean {
    const command = this.#redo.pop();
    if (!command) return false;
    command.execute();
    this.#undo.push(command);
    return true;
  }

  get canUndo(): boolean {
    return this.#undo.length > 0;
  }

  get canRedo(): boolean {
    return this.#redo.length > 0;
  }

  clear(): void {
    this.#undo.length = 0;
    this.#redo.length = 0;
  }
}

class PaintStrokeCommand implements EditorCommand {
  readonly #editor: BoardingEditor;
  readonly #changes: readonly {
    readonly layer: BoardingEditorLayer;
    readonly q: number;
    readonly r: number;
    readonly from: string;
    readonly to: string;
  }[];

  constructor(
    editor: BoardingEditor,
    changes: readonly {
      readonly layer: BoardingEditorLayer;
      readonly q: number;
      readonly r: number;
      readonly from: string;
      readonly to: string;
    }[],
  ) {
    this.#editor = editor;
    this.#changes = changes;
  }

  execute(): void {
    for (const change of this.#changes)
      this.#editor.write(change.layer, change.q, change.r, change.to);
  }

  undo(): void {
    for (const change of this.#changes)
      this.#editor.write(change.layer, change.q, change.r, change.from);
  }
}

class ResizeGridCommand implements EditorCommand {
  readonly #editor: BoardingEditor;
  readonly #from: BoardingMapText;
  readonly #to: BoardingMapText;

  constructor(
    editor: BoardingEditor,
    from: BoardingMapText,
    to: BoardingMapText,
  ) {
    this.#editor = editor;
    this.#from = from;
    this.#to = to;
  }

  execute(): void {
    this.#editor.replaceLayers(this.#to);
  }

  undo(): void {
    this.#editor.replaceLayers(this.#from);
  }
}

class SpriteTransformCommand implements EditorCommand {
  readonly #editor: BoardingEditor;
  readonly #from: SpriteTransform;
  readonly #to: SpriteTransform;

  constructor(
    editor: BoardingEditor,
    from: SpriteTransform,
    to: SpriteTransform,
  ) {
    this.#editor = editor;
    this.#from = from;
    this.#to = to;
  }

  execute(): void {
    this.#editor.replaceSprite(this.#to);
  }

  undo(): void {
    this.#editor.replaceSprite(this.#from);
  }
}

function parseErrorOf(text: BoardingMapText): string | null {
  try {
    parseBoardingMapText(formatBoardingMap(text));
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid map.';
  }
}

function airlockWarning(text: BoardingMapText): boolean {
  let hasAirlock = false;
  for (let r = 0; r < text.height; r++) {
    const row = text.objects[r] ?? '';
    for (let q = 0; q < text.width; q++) {
      if (row[q] !== 'A') continue;
      hasAirlock = true;
      if (q < text.width - 2) return true;
    }
  }
  return !hasAirlock;
}

/** lokal-bordningskarteditor: mutable draft with command history. */
export class BoardingEditor {
  #mapId: BoardingMapId;
  #text: BoardingMapText;
  #sprite: SpriteTransform;
  #primary: EditorTool = DEFAULT_PRIMARY;
  #secondary: EditorTool = DEFAULT_SECONDARY;
  #spriteOpacity = 0.45;
  #adjustSprite = false;
  #projection: EditorProjection = 'isometric';
  #dirty = false;
  readonly #history = new CommandHistory();

  constructor(mapId: BoardingMapId, source: string) {
    const text = parseBoardingMapText(source);
    this.#mapId = mapId;
    this.#text = text;
    this.#sprite = Object.freeze({
      x: text.spriteX ?? 0,
      y: text.spriteY ?? 0,
      scale: text.spriteScale ?? text.width,
    });
  }

  load(mapId: BoardingMapId, source: string): void {
    const text = parseBoardingMapText(source);
    this.#mapId = mapId;
    this.#text = text;
    this.#sprite = Object.freeze({
      x: text.spriteX ?? 0,
      y: text.spriteY ?? 0,
      scale: text.spriteScale ?? text.width,
    });
    this.#dirty = false;
    this.#history.clear();
  }

  bindTool(button: EditorBrushButton, tool: EditorTool): void {
    const allowed = BOARDING_LAYER_SYMBOLS[tool.layer];
    if (!allowed?.includes(tool.symbol)) return;
    const bound = freezeTool(tool);
    if (button === 'primary') this.#primary = bound;
    else this.#secondary = bound;
  }

  setAdjustSprite(value: boolean): void {
    this.#adjustSprite = value;
    if (value) this.#projection = 'top-down';
  }

  setProjection(value: EditorProjection): void {
    if (value !== 'top-down' && value !== 'isometric') return;
    this.#projection = value;
    if (value === 'isometric') this.#adjustSprite = false;
  }

  setSpriteOpacity(value: number): void {
    if (!Number.isFinite(value)) return;
    this.#spriteOpacity = Math.min(1, Math.max(0, value));
  }

  paintStroke(
    button: EditorBrushButton,
    cells: readonly EditorPaintCell[],
  ): boolean {
    const tool = button === 'primary' ? this.#primary : this.#secondary;
    const changes: {
      layer: BoardingEditorLayer;
      q: number;
      r: number;
      from: string;
      to: string;
    }[] = [];
    const seen = new Set<string>();
    for (const cell of cells) {
      if (
        cell.q < 0 ||
        cell.r < 0 ||
        cell.q >= this.#text.width ||
        cell.r >= this.#text.height
      )
        continue;
      const key = `${cell.q},${cell.r}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const from = symbolAt(this.#text[tool.layer], cell.q, cell.r);
      if (from === null || from === tool.symbol) continue;
      changes.push({
        layer: tool.layer,
        q: cell.q,
        r: cell.r,
        from,
        to: tool.symbol,
      });
    }
    if (changes.length === 0) return false;
    this.#history.run(new PaintStrokeCommand(this, changes));
    this.#dirty = true;
    return true;
  }

  resize(width: number, height: number): boolean {
    if (
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      width < BOARDING_EDITOR_MIN_SIZE ||
      height < BOARDING_EDITOR_MIN_SIZE ||
      width > BOARDING_EDITOR_MAX_SIZE ||
      height > BOARDING_EDITOR_MAX_SIZE
    )
      return false;
    if (width === this.#text.width && height === this.#text.height)
      return false;
    const next: BoardingMapText = Object.freeze({
      ...this.#text,
      width,
      height,
      terrain: Object.freeze(
        resizeRows(this.#text.terrain, width, height, 'H'),
      ),
      objects: Object.freeze(
        resizeRows(this.#text.objects, width, height, '-'),
      ),
      rooms: Object.freeze(resizeRows(this.#text.rooms, width, height, '-')),
      spawns: Object.freeze(resizeRows(this.#text.spawns, width, height, '-')),
      lights:
        this.#text.lights === null
          ? null
          : Object.freeze(resizeRows(this.#text.lights, width, height, '-')),
    });
    this.#history.run(new ResizeGridCommand(this, this.#text, next));
    this.#dirty = true;
    return true;
  }

  setSpriteTransform(transform: SpriteTransform): boolean {
    if (
      !Number.isFinite(transform.x) ||
      !Number.isFinite(transform.y) ||
      !Number.isFinite(transform.scale) ||
      transform.scale <= 0
    )
      return false;
    const to = Object.freeze({
      x: transform.x,
      y: transform.y,
      scale: transform.scale,
    });
    if (
      to.x === this.#sprite.x &&
      to.y === this.#sprite.y &&
      to.scale === this.#sprite.scale
    )
      return false;
    this.#history.run(new SpriteTransformCommand(this, this.#sprite, to));
    this.#dirty = true;
    return true;
  }

  undo(): boolean {
    if (!this.#history.undo()) return false;
    this.#dirty = true;
    return true;
  }

  redo(): boolean {
    if (!this.#history.redo()) return false;
    this.#dirty = true;
    return true;
  }

  markSaved(): void {
    this.#dirty = false;
  }

  source(): string {
    return formatBoardingMap(this.#persistedText());
  }

  write(
    layer: BoardingEditorLayer,
    q: number,
    r: number,
    symbol: string,
  ): void {
    const rows = cloneRows(this.#text[layer]);
    writeCell(rows, q, r, symbol);
    this.#text = Object.freeze({
      ...this.#text,
      [layer]: Object.freeze(rows),
    });
  }

  replaceLayers(text: BoardingMapText): void {
    this.#text = text;
  }

  replaceSprite(transform: SpriteTransform): void {
    this.#sprite = transform;
  }

  get snapshot(): BoardingEditorSnapshot {
    const persisted = this.#persistedText();
    return Object.freeze({
      mapId: this.#mapId,
      name: this.#text.name,
      width: this.#text.width,
      height: this.#text.height,
      campaign: this.#text.campaign,
      layers: Object.freeze({
        terrain: this.#text.terrain,
        objects: this.#text.objects,
        rooms: this.#text.rooms,
        spawns: this.#text.spawns,
      }),
      primary: this.#primary,
      secondary: this.#secondary,
      sprite: this.#sprite,
      spriteOpacity: this.#spriteOpacity,
      adjustSprite: this.#adjustSprite,
      projection: this.#projection,
      dirty: this.#dirty,
      canUndo: this.#history.canUndo,
      canRedo: this.#history.canRedo,
      parseError: parseErrorOf(persisted),
      airlockWarning: airlockWarning(this.#text),
    });
  }

  #persistedText(): BoardingMapText {
    const spriteIsDefault =
      this.#sprite.x === 0 &&
      this.#sprite.y === 0 &&
      this.#sprite.scale === this.#text.width &&
      this.#text.spriteX === null &&
      this.#text.spriteY === null &&
      this.#text.spriteScale === null;
    return Object.freeze({
      ...this.#text,
      spriteX: spriteIsDefault ? null : this.#sprite.x,
      spriteY: spriteIsDefault ? null : this.#sprite.y,
      spriteScale: spriteIsDefault ? null : this.#sprite.scale,
    });
  }
}
