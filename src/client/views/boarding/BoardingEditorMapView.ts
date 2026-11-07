import p5 from 'p5';
import type {
  BoardingEditorSnapshot,
  EditorBrushButton,
  EditorPaintCell,
  SpriteTransform,
} from '../../models/boarding/BoardingEditor.js';
import type { BoardingMapId } from '../../../shared/boarding-map-format.js';
import floorTileUrl from '../../assets/boarding/floor-tile.png';
import wallTileUrl from '../../assets/boarding/wall-tile.png';
import { SHIP_SPRITES, type ShipSpriteType } from '../ShipImages.js';
import {
  boardingFeatureGlyph,
  boardingIsoCamera,
  boardingIsoCenter,
} from '../BoardingProjection.js';
import {
  boardingEditorCellAt,
  EDITOR_ORTHO_CELL,
} from './BoardingEditorPick.js';
import {
  paintIsoBlock,
  paintIsoDiamond,
  paintIsoFloor,
  paintIsoWall,
  type IsoImageCache,
} from './editorIsoPaint.js';

const LONG_PRESS_MS = 420;

const SHIP_SPRITE_FOR_MAP: Readonly<Record<BoardingMapId, ShipSpriteType>> =
  Object.freeze({
    colony: 'Colony ship',
    exploration: 'Exploration ship',
    salvage: 'Salvage ship',
    shuttle: 'Civilian shuttle',
    pirate: 'Space pirate',
    raptor: 'Raptor',
    transport: 'Transport ship',
    'test-transport': 'Transport ship',
  });

const TERRAIN_FILL: Readonly<Record<string, string>> = {
  '.': '#3d6a7a99',
  '#': '#6b5d3acc',
  H: '#24323ccc',
};

const ROOM_FILL: Readonly<Record<string, string>> = {
  B: '#2f6f8f99',
  E: '#6f4f2f99',
  K: '#3f5f9f99',
};

function glyph(
  layer: 'objects' | 'rooms' | 'spawns',
  symbol: string,
): string | null {
  if (symbol === '-') return null;
  if (layer === 'objects') {
    if (symbol === 'D') return 'D';
    if (symbol === 'L') return 'L';
    if (symbol === 'R') return 'R';
    if (symbol === 'C') return 'C';
    if (symbol === 'B') return 'B';
    if (symbol === 'X') return 'E';
    if (symbol === 'A') return 'A';
  }
  return symbol;
}

function objectKind(symbol: string): 'door' | 'cover' | 'wall' | 'hull' | null {
  if (symbol === 'D' || symbol === 'L') return 'door';
  if (symbol === 'C') return 'cover';
  return null;
}

function wallKey(q: number, r: number): string {
  return `${q},${r}`;
}

/** lokal-bordningskarteditor / isometrisk-bordningskarteditor */
export class BoardingEditorMapView {
  readonly #p5: p5;
  readonly #observer: ResizeObserver;
  readonly #events = new AbortController();
  #snapshot: BoardingEditorSnapshot | null = null;
  #sprite: p5.Image | null = null;
  #spriteMap: BoardingMapId | null = null;
  #floorTile: p5.Image | null = null;
  #wallTile: p5.Image | null = null;
  readonly #isoCache: IsoImageCache = { floor: null, wall: null };
  #ready = false;
  #disposed = false;
  #offset = { x: 24, y: 24 };
  #scale = 1;
  #layoutKey = '';
  #pointers = new Map<number, { x: number; y: number }>();
  #paint: {
    button: EditorBrushButton;
    cells: EditorPaintCell[];
  } | null = null;
  #spriteDrag: {
    start: { x: number; y: number };
    origin: SpriteTransform;
  } | null = null;
  #cameraDrag: { x: number; y: number } | null = null;
  #previewSprite: SpriteTransform | null = null;
  #longPress: ReturnType<typeof setTimeout> | undefined;

  constructor(
    container: HTMLElement,
    private readonly emitPaint: (
      button: EditorBrushButton,
      cells: readonly EditorPaintCell[],
    ) => void,
    private readonly emitSprite: (sprite: SpriteTransform) => void,
  ) {
    this.#p5 = new p5((sketch) => {
      sketch.setup = () => {
        if (this.#disposed) return;
        const canvas = sketch.createCanvas(
          Math.max(container.clientWidth, 1),
          Math.max(container.clientHeight, 1),
        ).elt;
        sketch.pixelDensity(1);
        sketch.noLoop();
        sketch.describe('Ship layout grid.');
        void sketch.loadImage(floorTileUrl).then((image) => {
          this.#floorTile = image;
          this.#isoCache.floor = null;
          if (this.#ready) void this.#p5.redraw();
        });
        void sketch.loadImage(wallTileUrl).then((image) => {
          this.#wallTile = image;
          this.#isoCache.wall = null;
          if (this.#ready) void this.#p5.redraw();
        });
        this.#ready = true;
        this.#bind(canvas);
        void sketch.redraw();
      };
      sketch.draw = () => this.#draw(sketch);
    }, container);
    this.#observer = new ResizeObserver(() => {
      if (!this.#ready || this.#disposed) return;
      this.#p5.resizeCanvas(
        Math.max(container.clientWidth, 1),
        Math.max(container.clientHeight, 1),
      );
      this.#layoutKey = '';
      if (this.#snapshot) this.#fit(this.#snapshot);
      void this.#p5.redraw();
    });
    this.#observer.observe(container);
  }

  render(snapshot: BoardingEditorSnapshot): void {
    this.#snapshot = snapshot;
    if (this.#spriteMap !== snapshot.mapId) {
      this.#spriteMap = snapshot.mapId;
      this.#sprite = null;
      const url = SHIP_SPRITES[SHIP_SPRITE_FOR_MAP[snapshot.mapId]];
      void this.#p5
        .loadImage(url)
        .then((image) => {
          if (this.#disposed || this.#spriteMap !== snapshot.mapId) return;
          this.#sprite = image;
          void this.#p5.redraw();
        })
        .catch(() => undefined);
    }
    if (this.#ready) this.#fit(snapshot);
    if (this.#ready) void this.#p5.redraw();
  }

  dispose(): void {
    this.#disposed = true;
    clearTimeout(this.#longPress);
    this.#events.abort();
    this.#observer.disconnect();
    this.#p5.remove();
  }

  #fit(snapshot: BoardingEditorSnapshot): void {
    const key = `${snapshot.projection}:${snapshot.mapId}:${snapshot.width}x${snapshot.height}:${this.#p5.width}x${this.#p5.height}`;
    if (this.#layoutKey === key) return;
    this.#layoutKey = key;
    if (snapshot.projection === 'isometric') {
      const camera = boardingIsoCamera(snapshot, {
        width: this.#p5.width,
        height: this.#p5.height,
      });
      this.#scale = camera.scale;
      this.#offset = camera.offset;
      return;
    }
    this.#scale = 1;
    this.#offset = { x: 24, y: 24 };
  }

  #bind(canvas: HTMLCanvasElement): void {
    const options = { signal: this.#events.signal };
    const point = (event: PointerEvent | WheelEvent) => {
      const bounds = canvas.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };
    canvas.addEventListener(
      'contextmenu',
      (event) => event.preventDefault(),
      options,
    );
    canvas.addEventListener(
      'pointerdown',
      (event) => {
        if (!this.#snapshot) return;
        canvas.setPointerCapture(event.pointerId);
        const next = point(event);
        this.#pointers.set(event.pointerId, next);
        const adjustSprite =
          this.#snapshot.adjustSprite &&
          this.#snapshot.projection === 'top-down';
        if (adjustSprite && event.button === 0) {
          this.#spriteDrag = {
            start: next,
            origin: this.#previewSprite ?? this.#snapshot.sprite,
          };
          return;
        }
        if (event.button === 1 || this.#pointers.size > 1) {
          this.#cameraDrag = next;
          this.#paint = null;
          return;
        }
        const button: EditorBrushButton =
          event.button === 2 ? 'secondary' : 'primary';
        const cell = this.#cellAt(next);
        this.#paint = { button, cells: cell ? [cell] : [] };
        if (event.pointerType === 'touch' && event.button === 0) {
          clearTimeout(this.#longPress);
          this.#longPress = setTimeout(() => {
            if (!this.#paint || this.#paint.cells.length !== 1) return;
            this.#paint.button = 'secondary';
          }, LONG_PRESS_MS);
        }
      },
      options,
    );
    canvas.addEventListener(
      'pointermove',
      (event) => {
        const previous = this.#pointers.get(event.pointerId);
        if (!previous || !this.#snapshot) return;
        const next = point(event);
        this.#pointers.set(event.pointerId, next);
        if (this.#pointers.size > 1) {
          const other = [...this.#pointers.entries()].find(
            ([id]) => id !== event.pointerId,
          )?.[1];
          if (other) {
            const oldDistance = Math.hypot(
              previous.x - other.x,
              previous.y - other.y,
            );
            const newDistance = Math.hypot(next.x - other.x, next.y - other.y);
            if (oldDistance > 0)
              this.#scale = Math.min(
                4,
                Math.max(0.25, this.#scale * (newDistance / oldDistance)),
              );
          }
          this.#paint = null;
          void this.#p5.redraw();
          return;
        }
        if (this.#spriteDrag) {
          const size = EDITOR_ORTHO_CELL * this.#scale;
          this.#previewSprite = {
            x:
              this.#spriteDrag.origin.x +
              (next.x - this.#spriteDrag.start.x) / size,
            y:
              this.#spriteDrag.origin.y +
              (next.y - this.#spriteDrag.start.y) / size,
            scale: this.#spriteDrag.origin.scale,
          };
          void this.#p5.redraw();
          return;
        }
        if (this.#cameraDrag) {
          this.#offset = {
            x: this.#offset.x + next.x - previous.x,
            y: this.#offset.y + next.y - previous.y,
          };
          this.#cameraDrag = next;
          void this.#p5.redraw();
          return;
        }
        if (this.#paint) {
          if (Math.hypot(next.x - previous.x, next.y - previous.y) > 6)
            clearTimeout(this.#longPress);
          const cell = this.#cellAt(next);
          if (
            cell &&
            !this.#paint.cells.some(
              (entry) => entry.q === cell.q && entry.r === cell.r,
            )
          )
            this.#paint.cells.push(cell);
        }
      },
      options,
    );
    const finish = (event: PointerEvent) => {
      this.#pointers.delete(event.pointerId);
      clearTimeout(this.#longPress);
      if (this.#spriteDrag) {
        const sprite = this.#previewSprite ?? this.#spriteDrag.origin;
        this.#spriteDrag = null;
        this.#previewSprite = null;
        this.emitSprite(sprite);
        return;
      }
      if (this.#cameraDrag && this.#pointers.size === 0)
        this.#cameraDrag = null;
      if (this.#paint && this.#pointers.size === 0) {
        const stroke = this.#paint;
        this.#paint = null;
        if (stroke.cells.length) this.emitPaint(stroke.button, stroke.cells);
      }
    };
    canvas.addEventListener('pointerup', finish, options);
    canvas.addEventListener('pointercancel', finish, options);
    canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
        if (
          this.#snapshot?.adjustSprite &&
          this.#snapshot.projection === 'top-down'
        ) {
          const sprite = this.#previewSprite ?? this.#snapshot.sprite;
          this.emitSprite({
            ...sprite,
            scale: Math.min(128, Math.max(1, sprite.scale * factor)),
          });
          return;
        }
        const anchor = point(event);
        const next = Math.min(4, Math.max(0.08, this.#scale * factor));
        const ratio = next / this.#scale;
        this.#offset = {
          x: anchor.x - (anchor.x - this.#offset.x) * ratio,
          y: anchor.y - (anchor.y - this.#offset.y) * ratio,
        };
        this.#scale = next;
        void this.#p5.redraw();
      },
      { ...options, passive: false },
    );
  }

  #cellAt(point: { x: number; y: number }): EditorPaintCell | null {
    if (!this.#snapshot) return null;
    return boardingEditorCellAt(
      this.#snapshot.projection,
      point,
      { offset: this.#offset, scale: this.#scale },
      this.#snapshot,
    );
  }

  #draw(sketch: p5): void {
    const snapshot = this.#snapshot;
    sketch.background('#09121b');
    if (!snapshot) return;
    if (snapshot.projection === 'isometric') {
      this.#drawIso(sketch, snapshot);
      return;
    }
    this.#drawOrtho(sketch, snapshot);
  }

  #drawOrtho(sketch: p5, snapshot: BoardingEditorSnapshot): void {
    const size = EDITOR_ORTHO_CELL * this.#scale;
    const sprite = this.#previewSprite ?? snapshot.sprite;
    if (this.#sprite) {
      sketch.push();
      sketch.tint(255, Math.round(snapshot.spriteOpacity * 255));
      const height =
        sprite.scale *
        size *
        (this.#sprite.height / Math.max(1, this.#sprite.width));
      sketch.image(
        this.#sprite,
        this.#offset.x + sprite.x * size,
        this.#offset.y + sprite.y * size,
        sprite.scale * size,
        height,
      );
      sketch.pop();
    }
    sketch.push();
    sketch.translate(this.#offset.x, this.#offset.y);
    for (let r = 0; r < snapshot.height; r++) {
      for (let q = 0; q < snapshot.width; q++) {
        const terrain = snapshot.layers.terrain[r]?.[q] ?? 'H';
        sketch.noStroke();
        sketch.fill(TERRAIN_FILL[terrain] ?? '#24323c');
        sketch.rect(q * size, r * size, size, size);
        const room = snapshot.layers.rooms[r]?.[q] ?? '-';
        if (room !== '-') {
          sketch.fill(ROOM_FILL[room] ?? '#3f5f9f99');
          sketch.rect(q * size, r * size, size, size);
        }
        sketch.noFill();
        sketch.stroke('#8eb0c255');
        sketch.rect(q * size, r * size, size, size);
        const marks = cellMarks(snapshot, q, r);
        if (marks.length) {
          sketch.noStroke();
          sketch.fill('#e5e8e6');
          sketch.textAlign(sketch.CENTER, sketch.CENTER);
          sketch.textSize(Math.max(10, size * 0.35));
          sketch.text(marks.join(''), q * size + size / 2, r * size + size / 2);
        }
      }
    }
    sketch.pop();
  }

  #drawIso(sketch: p5, snapshot: BoardingEditorSnapshot): void {
    sketch.push();
    sketch.translate(this.#offset.x, this.#offset.y);
    sketch.scale(this.#scale);
    const walls = new Set<string>();
    for (let r = 0; r < snapshot.height; r++) {
      for (let q = 0; q < snapshot.width; q++) {
        const terrain = snapshot.layers.terrain[r]?.[q] ?? 'H';
        if (terrain === '#' || terrain === 'H') walls.add(wallKey(q, r));
      }
    }
    for (let r = 0; r < snapshot.height; r++) {
      for (let q = 0; q < snapshot.width; q++) {
        const position = { q, r };
        const terrain = snapshot.layers.terrain[r]?.[q] ?? 'H';
        const paintedFloor =
          terrain === '.' &&
          paintIsoFloor(sketch, this.#floorTile, this.#isoCache, position);
        if (!paintedFloor) {
          sketch.noStroke();
          sketch.fill(
            terrain === '.'
              ? '#24334a'
              : terrain === '#'
                ? '#3a4658'
                : '#343d4c',
          );
          paintIsoDiamond(sketch, position);
        }
        const room = snapshot.layers.rooms[r]?.[q] ?? '-';
        if (room !== '-') {
          sketch.noStroke();
          sketch.fill(ROOM_FILL[room] ?? '#3f5f9f99');
          paintIsoDiamond(sketch, position);
        }
        sketch.noFill();
        sketch.stroke('#8eb0c255');
        sketch.strokeWeight(1);
        paintIsoDiamond(sketch, position);
      }
    }
    const raised: { q: number; r: number; y: number }[] = [];
    for (let r = 0; r < snapshot.height; r++) {
      for (let q = 0; q < snapshot.width; q++) {
        raised.push({ q, r, y: boardingIsoCenter({ q, r }).y });
      }
    }
    raised.sort((a, b) => a.y - b.y);
    for (const cell of raised) {
      const terrain = snapshot.layers.terrain[cell.r]?.[cell.q] ?? 'H';
      const object = snapshot.layers.objects[cell.r]?.[cell.q] ?? '-';
      const position = { q: cell.q, r: cell.r };
      const center = boardingIsoCenter(position);
      if (terrain === '#' || terrain === 'H') {
        if (
          !paintIsoWall(sketch, this.#wallTile, this.#isoCache, position, walls)
        )
          paintIsoBlock(sketch, center, terrain === '#' ? 'wall' : 'hull');
      }
      const kind = objectKind(object);
      if (kind) {
        const apex = paintIsoBlock(sketch, center, kind);
        const mark = boardingFeatureGlyph({
          kind,
          locked: object === 'L',
          open: false,
        });
        if (mark) {
          sketch.noStroke();
          sketch.fill('#dce7f7');
          sketch.textAlign(sketch.CENTER, sketch.CENTER);
          sketch.textSize(16);
          sketch.text(mark, apex.x, apex.y);
        }
      } else {
        const marks = cellMarks(snapshot, cell.q, cell.r);
        if (marks.length) {
          sketch.noStroke();
          sketch.fill('#e5e8e6');
          sketch.textAlign(sketch.CENTER, sketch.CENTER);
          sketch.textSize(16);
          sketch.text(marks.join(''), center.x, center.y - 10);
        }
      }
    }
    sketch.pop();
  }
}

function cellMarks(
  snapshot: BoardingEditorSnapshot,
  q: number,
  r: number,
): string[] {
  return [
    glyph('objects', snapshot.layers.objects[r]?.[q] ?? '-'),
    glyph('rooms', snapshot.layers.rooms[r]?.[q] ?? '-'),
    glyph('spawns', snapshot.layers.spawns[r]?.[q] ?? '-'),
  ].filter((mark): mark is string => mark !== null);
}
