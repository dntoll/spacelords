import {
  BOARDING_LAYER_SYMBOLS,
  formatBoardingMap,
  parseBoardingMapText,
  type BoardingEditorLayer,
  type BoardingMapId,
  type BoardingMapText,
} from '../../../../shared/boarding/map-format.js';

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

/** skeppsbild-last-till-skeppsaxeln: where the picture lies along the axis. */
export interface SpriteAxisPlacement {
  readonly x: number;
  readonly scale: number;
}

export const BOARDING_SPRITE_MIN_SCALE = 1;
export const BOARDING_SPRITE_MAX_SCALE = 128;

/** skeppsbild-last-till-skeppsaxeln: the ship's long axis is the map's middle row line. */
export function boardingShipAxisY(height: number): number {
  return height / 2;
}

/** Top edge that puts the picture's middle line on the ship axis. */
export function centeredSpriteY(
  height: number,
  scale: number,
  aspect: number,
): number {
  return boardingShipAxisY(height) - (scale * aspect) / 2;
}

/**
 * skeppsbild-last-till-skeppsaxeln: zooms the picture around `anchorX` (cells),
 * so the point under the pointer stays put, also when the size limit is hit.
 */
export function spriteZoomAlongAxis(
  placement: SpriteAxisPlacement,
  anchorX: number,
  factor: number,
): SpriteAxisPlacement {
  const scale = Math.min(
    BOARDING_SPRITE_MAX_SCALE,
    Math.max(BOARDING_SPRITE_MIN_SCALE, placement.scale * factor),
  );
  const applied = scale / placement.scale;
  return { x: anchorX - (anchorX - placement.x) * applied, scale };
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
    readonly lights: readonly string[];
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
  readonly #before: BoardingMapText;
  readonly #changes: readonly StrokeChange[];

  constructor(
    editor: BoardingEditor,
    before: BoardingMapText,
    changes: readonly StrokeChange[],
  ) {
    this.#editor = editor;
    this.#before = before;
    this.#changes = changes;
  }

  execute(): void {
    for (const change of this.#changes)
      this.#editor.write(change.layer, change.q, change.r, change.to);
  }

  undo(): void {
    this.#editor.replaceLayers(this.#before);
  }
}

class ResizeGridCommand implements EditorCommand {
  readonly #editor: BoardingEditor;
  readonly #from: BoardingMapText;
  readonly #to: BoardingMapText;
  readonly #sprite: {
    readonly from: SpriteTransform;
    readonly to: SpriteTransform;
  };

  constructor(
    editor: BoardingEditor,
    from: BoardingMapText,
    to: BoardingMapText,
    sprite: { readonly from: SpriteTransform; readonly to: SpriteTransform },
  ) {
    this.#editor = editor;
    this.#from = from;
    this.#to = to;
    this.#sprite = sprite;
  }

  execute(): void {
    this.#editor.replaceLayers(this.#to);
    this.#editor.replaceSprite(this.#sprite.to);
  }

  undo(): void {
    this.#editor.replaceLayers(this.#from);
    this.#editor.replaceSprite(this.#sprite.from);
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

interface StrokeChange {
  readonly layer: BoardingEditorLayer;
  readonly q: number;
  readonly r: number;
  readonly from: string;
  readonly to: string;
}

type StrokeLayers = {
  readonly width: number;
  readonly height: number;
} & {
  readonly [layer in BoardingEditorLayer]: readonly string[] | null;
};

/** The cell changes one brush stroke makes, shared by commit and preview. */
function strokeChanges(
  source: StrokeLayers,
  tool: EditorTool,
  cells: readonly EditorPaintCell[],
): StrokeChange[] {
  const changes: StrokeChange[] = [];
  const seen = new Set<string>();
  for (const cell of cells) {
    if (
      cell.q < 0 ||
      cell.r < 0 ||
      cell.q >= source.width ||
      cell.r >= source.height
    )
      continue;
    const key = `${cell.q},${cell.r}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const terrain = source.terrain?.[cell.r]?.[cell.q];
    if (tool.layer !== 'terrain' && terrain === 'O') continue;
    if (tool.layer === 'lights' && tool.symbol === 'L' && terrain !== '.')
      continue;
    const rows =
      source[tool.layer] ??
      Array.from({ length: source.height }, () => '-'.repeat(source.width));
    const from = symbolAt(rows, cell.q, cell.r);
    if (from === null || from === tool.symbol) continue;
    changes.push({
      layer: tool.layer,
      q: cell.q,
      r: cell.r,
      from,
      to: tool.symbol,
    });
    const clearLayers: readonly BoardingEditorLayer[] =
      tool.layer === 'terrain' && tool.symbol === 'O'
        ? ['objects', 'rooms', 'spawns', 'lights']
        : tool.layer === 'terrain' && tool.symbol !== '.'
          ? ['lights']
          : [];
    for (const layer of clearLayers) {
      const old = source[layer]?.[cell.r]?.[cell.q] ?? '-';
      if (old !== '-')
        changes.push({ layer, q: cell.q, r: cell.r, from: old, to: '-' });
    }
  }
  return changes;
}

/**
 * direkt-penselstreck-i-editor: the snapshot as it will look once the stroke
 * in progress is committed, so the view can show tiles while dragging.
 */
export function boardingEditorStrokePreview(
  snapshot: BoardingEditorSnapshot,
  button: EditorBrushButton,
  cells: readonly EditorPaintCell[],
): BoardingEditorSnapshot {
  const tool = button === 'primary' ? snapshot.primary : snapshot.secondary;
  const changes = strokeChanges(
    { width: snapshot.width, height: snapshot.height, ...snapshot.layers },
    tool,
    cells,
  );
  if (changes.length === 0) return snapshot;
  const layers = {
    terrain: cloneRows(snapshot.layers.terrain),
    objects: cloneRows(snapshot.layers.objects),
    rooms: cloneRows(snapshot.layers.rooms),
    spawns: cloneRows(snapshot.layers.spawns),
    lights: cloneRows(snapshot.layers.lights),
  };
  for (const change of changes)
    writeCell(layers[change.layer], change.q, change.r, change.to);
  return Object.freeze({ ...snapshot, layers: Object.freeze(layers) });
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
  /** Height / width of the ship picture, reported once the view has it. */
  #pictureAspect: number | null = null;
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
    this.#pictureAspect = null;
    this.#dirty = false;
    this.#history.clear();
  }

  /** skeppsbild-last-till-skeppsaxeln: proportions of the picture of this ship. */
  setPictureAspect(aspect: number): void {
    if (!Number.isFinite(aspect) || aspect <= 0) return;
    this.#pictureAspect = aspect;
  }

  /** The sprite with its middle line on the ship axis of a map `height` tall. */
  #onAxis(placement: SpriteAxisPlacement, height: number): SpriteTransform {
    return Object.freeze({
      x: placement.x,
      y:
        this.#pictureAspect === null
          ? this.#sprite.y
          : centeredSpriteY(height, placement.scale, this.#pictureAspect),
      scale: placement.scale,
    });
  }

  #runSpriteChange(to: SpriteTransform): boolean {
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

  bindTool(button: EditorBrushButton, tool: EditorTool): void {
    const allowed = BOARDING_LAYER_SYMBOLS[tool.layer];
    if (!allowed?.includes(tool.symbol)) return;
    const bound = freezeTool(tool);
    if (button === 'primary') this.#primary = bound;
    else this.#secondary = bound;
  }

  setAdjustSprite(value: boolean): void {
    this.#adjustSprite = value;
    if (!value) return;
    this.#projection = 'top-down';
    // skeppsbild-last-till-skeppsaxeln: alignment starts on the axis.
    if (this.#pictureAspect !== null)
      this.#runSpriteChange(this.#onAxis(this.#sprite, this.#text.height));
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
    const changes = strokeChanges(this.#text, tool, cells);
    if (changes.length === 0) return false;
    this.#history.run(new PaintStrokeCommand(this, this.#text, changes));
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
    // skeppsbild-last-till-skeppsaxeln: a new height moves the axis.
    const sprite =
      this.#pictureAspect === null
        ? this.#sprite
        : this.#onAxis(this.#sprite, height);
    this.#history.run(
      new ResizeGridCommand(this, this.#text, next, {
        from: this.#sprite,
        to: sprite,
      }),
    );
    this.#dirty = true;
    return true;
  }

  /**
   * skeppsbild-last-till-skeppsaxeln: the picture only slides along and zooms
   * on the ship axis; its top edge follows from the axis.
   */
  setSpriteTransform(placement: SpriteAxisPlacement): boolean {
    if (
      !Number.isFinite(placement.x) ||
      !Number.isFinite(placement.scale) ||
      placement.scale <= 0
    )
      return false;
    return this.#runSpriteChange(this.#onAxis(placement, this.#text.height));
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
    const rows = cloneRows(
      this.#text[layer] ??
        Array.from({ length: this.#text.height }, () =>
          '-'.repeat(this.#text.width),
        ),
    );
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
        lights:
          this.#text.lights ??
          Object.freeze(
            Array.from({ length: this.#text.height }, () =>
              '-'.repeat(this.#text.width),
            ),
          ),
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
