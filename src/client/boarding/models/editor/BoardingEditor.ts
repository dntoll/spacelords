import {
  BOARDING_LAYER_SYMBOLS,
  formatBoardingMap,
  parseBoardingMapText,
  type BoardingEditorLayer,
  type BoardingMapId,
  type BoardingMapText,
} from '../../../../shared/boarding/map-format.js';
import {
  boardingAirlockCells,
  boardingAirlockSide,
  boardingDefaultAirlock,
  boardingMapRequirements,
  boardingRoomRegion,
  type BoardingMapRequirement,
} from '../../../../shared/boarding/map-rules.js';

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
  /** kravlista-i-bordningseditor */
  readonly requirements: readonly BoardingMapRequirement[];
  /** fyll-rum-i-editor: room brushes fill the enclosed floor. */
  readonly fillRooms: boolean;
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

const inBounds = (source: StrokeLayers, cell: EditorPaintCell): boolean =>
  cell.q >= 0 && cell.r >= 0 && cell.q < source.width && cell.r < source.height;

const layerRows = (
  source: StrokeLayers,
  layer: BoardingEditorLayer,
): readonly string[] =>
  source[layer] ??
  Array.from({ length: source.height }, () => '-'.repeat(source.width));

/** fast-airlock-i-bordningskarta: the airlock cell and the open column outside it. */
function airlockGuard(source: StrokeLayers): {
  readonly airlock: EditorPaintCell | null;
  readonly outside: ReadonlySet<string>;
} {
  const terrain = source.terrain ?? [];
  const airlock = boardingAirlockCells(source.objects ?? [])[0] ?? null;
  const outside = new Set<string>();
  const side = airlock
    ? boardingAirlockSide(terrain, airlock.q, airlock.r)
    : null;
  if (airlock && side === 'top')
    for (let r = 0; r < airlock.r; r++) outside.add(`${airlock.q},${r}`);
  if (airlock && side === 'bottom')
    for (let r = airlock.r + 1; r < source.height; r++)
      outside.add(`${airlock.q},${r}`);
  return { airlock, outside };
}

/** fast-airlock-i-bordningskarta: the Airlock brush moves the one airlock. */
function airlockMove(
  source: StrokeLayers,
  cells: readonly EditorPaintCell[],
): StrokeChange[] {
  const terrain = source.terrain ?? [];
  const target = [...cells]
    .reverse()
    .find(
      (cell) =>
        inBounds(source, cell) &&
        terrain[cell.r]?.[cell.q] !== 'O' &&
        boardingAirlockSide(terrain, cell.q, cell.r) !== null,
    );
  if (!target) return [];
  const changes: StrokeChange[] = [];
  const objects = layerRows(source, 'objects');
  for (const old of boardingAirlockCells(objects)) {
    if (old.q === target.q && old.r === target.r) continue;
    changes.push({ layer: 'objects', ...old, from: 'A', to: '-' });
    if (
      boardingAirlockSide(terrain, old.q, old.r) !== null &&
      terrain[old.r]?.[old.q] === '.'
    )
      changes.push({ layer: 'terrain', ...old, from: '.', to: 'H' });
  }
  const from = objects[target.r]![target.q]!;
  if (from !== 'A')
    changes.push({ layer: 'objects', ...target, from, to: 'A' });
  const ground = terrain[target.r]![target.q]!;
  if (ground !== '.')
    changes.push({ layer: 'terrain', ...target, from: ground, to: '.' });
  return changes;
}

/** The cell changes one brush stroke makes, shared by commit and preview. */
function strokeChanges(
  source: StrokeLayers,
  tool: EditorTool,
  painted: readonly EditorPaintCell[],
  fillRooms = false,
): StrokeChange[] {
  if (tool.layer === 'objects' && tool.symbol === 'A')
    return airlockMove(source, painted);
  // fyll-rum-i-editor: each touched cell grows to its enclosed floor.
  const cells =
    fillRooms && tool.layer === 'rooms'
      ? painted.flatMap((cell) =>
          inBounds(source, cell)
            ? boardingRoomRegion(
                {
                  width: source.width,
                  height: source.height,
                  terrain: source.terrain ?? [],
                  objects: layerRows(source, 'objects'),
                  rooms: layerRows(source, 'rooms'),
                },
                cell,
              )
            : [],
        )
      : painted;
  const guard = airlockGuard(source);
  const changes: StrokeChange[] = [];
  const seen = new Set<string>();
  for (const cell of cells) {
    if (!inBounds(source, cell)) continue;
    const key = `${cell.q},${cell.r}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const terrain = source.terrain?.[cell.r]?.[cell.q];
    const isAirlock = guard.airlock?.q === cell.q && guard.airlock.r === cell.r;
    if (isAirlock && (tool.layer === 'terrain' || tool.layer === 'objects'))
      continue;
    if (
      guard.outside.has(key) &&
      tool.layer === 'terrain' &&
      tool.symbol !== 'O'
    )
      continue;
    if (tool.layer !== 'terrain' && terrain === 'O') continue;
    if (tool.layer === 'lights' && tool.symbol === 'L' && terrain !== '.')
      continue;
    const rows = layerRows(source, tool.layer);
    const from = symbolAt(rows, cell.q, cell.r);
    if (from === null) continue;
    // foremal-lagger-golv: an object always stands on floor.
    const needsFloor =
      tool.layer === 'objects' &&
      tool.symbol !== '-' &&
      terrain !== undefined &&
      terrain !== '.';
    if (from === tool.symbol && !needsFloor) continue;
    if (from !== tool.symbol)
      changes.push({
        layer: tool.layer,
        q: cell.q,
        r: cell.r,
        from,
        to: tool.symbol,
      });
    if (needsFloor)
      changes.push({
        layer: 'terrain',
        q: cell.q,
        r: cell.r,
        from: terrain,
        to: '.',
      });
    const clearLayers: readonly BoardingEditorLayer[] =
      tool.layer === 'terrain' && tool.symbol === 'O'
        ? ['objects', 'rooms', 'spawns', 'lights']
        : tool.layer === 'terrain' && tool.symbol !== '.'
          ? ['objects', 'lights']
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
 * fast-airlock-i-bordningskarta: keep the first airlock on a hull edge, drop
 * the others and place one when none is there, so every layout starts valid.
 */
function withFixedAirlock(text: BoardingMapText): BoardingMapText {
  const objects = cloneRows(text.objects);
  const terrain = cloneRows(text.terrain);
  const lights = text.lights ? cloneRows(text.lights) : null;
  const airlocks = boardingAirlockCells(objects);
  const kept =
    airlocks.find(
      (cell) => boardingAirlockSide(terrain, cell.q, cell.r) !== null,
    ) ?? null;
  for (const cell of airlocks)
    if (cell !== kept) writeCell(objects, cell.q, cell.r, '-');
  let placed = kept;
  if (!placed) {
    placed = boardingDefaultAirlock({ ...text, terrain, objects });
    if (placed) writeCell(objects, placed.q, placed.r, 'A');
  }
  if (placed && terrain[placed.r]![placed.q] !== '.') {
    writeCell(terrain, placed.q, placed.r, '.');
    if (lights) writeCell(lights, placed.q, placed.r, '-');
  }
  const changed =
    objects.some((row, r) => row !== text.objects[r]) ||
    terrain.some((row, r) => row !== text.terrain[r]);
  if (!changed) return text;
  return Object.freeze({
    ...text,
    terrain: Object.freeze(terrain),
    objects: Object.freeze(objects),
    lights: lights ? Object.freeze(lights) : null,
  });
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
    snapshot.fillRooms,
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
  #projection: EditorProjection = 'isometric';
  #fillRooms = false;
  #dirty = false;
  readonly #history = new CommandHistory();

  constructor(mapId: BoardingMapId, source: string) {
    this.#mapId = mapId;
    this.#text = parseBoardingMapText(source);
    this.#sprite = Object.freeze({ x: 0, y: 0, scale: 1 });
    this.load(mapId, source);
  }

  load(mapId: BoardingMapId, source: string): void {
    const parsed = parseBoardingMapText(source);
    const text = withFixedAirlock(parsed);
    this.#mapId = mapId;
    this.#text = text;
    this.#sprite = Object.freeze({
      x: text.spriteX ?? 0,
      y: text.spriteY ?? 0,
      scale: text.spriteScale ?? text.width,
    });
    // fast-airlock-i-bordningskarta: a corrected airlock is an unsaved change.
    this.#dirty = text !== parsed;
    this.#history.clear();
  }

  setFillRooms(value: boolean): void {
    this.#fillRooms = value;
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
    const changes = strokeChanges(this.#text, tool, cells, this.#fillRooms);
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
    this.#history.run(
      new ResizeGridCommand(
        this,
        this.#text,
        withFixedAirlock(this.#keepAirlockOutside(next)),
      ),
    );
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
      requirements: boardingMapRequirements(this.#text),
      fillRooms: this.#fillRooms,
    });
  }

  /** Rows added outside a bottom airlock stay open space, not hull. */
  #keepAirlockOutside(next: BoardingMapText): BoardingMapText {
    const airlock = boardingAirlockCells(this.#text.objects)[0];
    if (
      !airlock ||
      airlock.q >= next.width ||
      airlock.r >= next.height ||
      boardingAirlockSide(this.#text.terrain, airlock.q, airlock.r) !== 'bottom'
    )
      return next;
    const terrain = cloneRows(next.terrain);
    for (let r = this.#text.height; r < next.height; r++)
      writeCell(terrain, airlock.q, r, 'O');
    return Object.freeze({ ...next, terrain: Object.freeze(terrain) });
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
