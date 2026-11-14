import p5 from 'p5';
import {
  boardingEditorStrokePreview,
  type BoardingEditorSnapshot,
  type EditorBrushButton,
  type EditorPaintCell,
  type SpriteTransform,
} from '../../models/editor/BoardingEditor.js';
import type { BoardingMapId } from '../../../../shared/boarding/map-format.js';
import {
  BOARDING_FLOOR_IMAGES,
  BOARDING_WALL_IMAGES,
  BOARDING_CRATE_IMAGES,
  BOARDING_DOOR_FACE_IMAGES,
  BOARDING_DOOR_TOP_IMAGE,
  BOARDING_WALL_TOP_IMAGE,
  boardingSurfaceStyle,
  boardingWallFaceStyle,
  type BoardingSurfaceStyle,
} from '../rendering/BoardingSurfaceArtwork.js';
import factionSpritesUrl from '../../assets/characters/directional-faction-sprites.webp';
import {
  boardingCharacterSprite,
  type BoardingCharacterSide,
} from '../rendering/BoardingCharacterSprite.js';
import {
  BOARDING_OBJECT_IMAGES,
  boardingObjectArtwork,
  boardingObjectBounds,
  type BoardingArtwork,
} from '../rendering/BoardingObjectArtwork.js';
import { BoardingWallVisibility } from '../rendering/BoardingWallVisibility.js';
import {
  boardingDoorAxis,
  boardingStraightThinPieces,
  boardingThinAxisFromSymbol,
  boardingThinNeighbor,
  boardingThinOutsideTerrain,
  boardingThinPieceBounds,
  boardingThinPiecesStraight,
  boardingThinWallIsLow,
  parseBoardingMap,
  type BoardingMap,
  type BoardingThinPiece,
} from '../../models/map/BoardingMap.js';
import { formatBoardingMap } from '../../../../shared/boarding/map-format.js';
import { BoardingLighting } from '../rendering/BoardingLighting.js';
import { BoardingLightMap } from '../rendering/BoardingLightMap.js';
import { BoardingLightPainter } from '../rendering/BoardingLightPainter.js';
import { BOARDING_METERS, boardingHeight } from '../rendering/BoardingScale.js';
import {
  SHIP_SPRITES,
  type ShipSpriteType,
} from '../../../space-map/views/index.js';
import {
  BOARDING_HALF_TILE_WIDTH,
  BOARDING_HALF_TILE_HEIGHT,
  boardingFeatureGlyph,
  boardingFeatureHeight,
  boardingIsoCamera,
  boardingIsoCenter,
  boardingIsoCorners,
  boardingIsoBlockFaces,
  boardingSpritePlaneTransform,
} from '../rendering/BoardingProjection.js';
import {
  boardingEditorCellAt,
  EDITOR_ORTHO_CELL,
} from './BoardingEditorPick.js';
import {
  paintIsoBlock,
  paintIsoDiamond,
  paintIsoFloor,
  paintIsoCrate,
  paintIsoGlass,
  paintIsoThinWall,
  paintIsoWall,
  paintThinWallFloors,
  type IsoImageCache,
} from '../rendering/BoardingSurfacePainter.js';

const LONG_PRESS_MS = 420;
const MIN_ZOOM = 0.08;
const MAX_ZOOM = 4;
const ORTHO_MARGIN = 24;

function clampZoom(scale: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

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
  Q: '#8aa0b8cc',
  R: '#8aa0b8cc',
  q: '#c4a574cc',
  r: '#c4a574cc',
  W: '#3d6a7a99',
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

function editorTerrain(symbol: string | undefined) {
  if (!symbol || symbol === 'O') return null;
  if (symbol === '.') return 'floor' as const;
  if (symbol === '#') return 'wall' as const;
  if (symbol === 'H') return 'hull' as const;
  if (symbol === 'W') return 'window' as const;
  if (!boardingThinAxisFromSymbol(symbol)) return null;
  return boardingThinWallIsLow(symbol)
    ? ('low-thin-wall' as const)
    : ('thin-wall' as const);
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
  /** The committed editor state. */
  #snapshot: BoardingEditorSnapshot | null = null;
  /** What is drawn: the committed state plus any stroke in progress. */
  #display: BoardingEditorSnapshot | null = null;
  /** The parsed map behind #display, for joined thin wall shapes. */
  #map: BoardingMap | null = null;
  #panMode = false;
  /** True once the player has zoomed or panned away from the fitted view. */
  #userCamera = false;
  #sprite: p5.Image | null = null;
  #spriteMap: BoardingMapId | null = null;
  readonly #floorTiles = new Map<BoardingSurfaceStyle, p5.Image>();
  readonly #wallTiles = new Map<BoardingSurfaceStyle, p5.Image>();
  #wallTop: p5.Image | null = null;
  readonly #doorFaces = new Map<'open' | 'locked', p5.Image>();
  #doorTop: p5.Image | null = null;
  readonly #crate = new Map<'side' | 'top', p5.Image>();
  #factionSprites: p5.Image | null = null;
  readonly #objects = new Map<BoardingArtwork, p5.Image>();
  #lighting: BoardingLighting | null = null;
  readonly #lightPainter = new BoardingLightPainter();
  #lightMap: BoardingLightMap | null = null;
  readonly #isoCaches = new WeakMap<p5.Image, IsoImageCache>();
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
        for (const [style, url] of Object.entries(BOARDING_FLOOR_IMAGES) as [
          BoardingSurfaceStyle,
          string,
        ][]) {
          void sketch.loadImage(url).then((image) => {
            this.#floorTiles.set(style, image);
            if (this.#ready && !this.#disposed) void this.#p5.redraw();
          });
        }
        for (const [style, url] of Object.entries(BOARDING_WALL_IMAGES) as [
          BoardingSurfaceStyle,
          string,
        ][]) {
          void sketch.loadImage(url).then((image) => {
            this.#wallTiles.set(style, image);
            if (this.#ready && !this.#disposed) void this.#p5.redraw();
          });
        }
        for (const [kind, url] of Object.entries(BOARDING_DOOR_FACE_IMAGES) as [
          'open' | 'locked',
          string,
        ][]) {
          void sketch.loadImage(url).then((image) => {
            this.#doorFaces.set(kind, image);
            if (this.#ready && !this.#disposed) void this.#p5.redraw();
          });
        }
        for (const [kind, url] of Object.entries(BOARDING_CRATE_IMAGES) as [
          'side' | 'top',
          string,
        ][]) {
          void sketch.loadImage(url).then((image) => {
            this.#crate.set(kind, image);
            if (this.#ready && !this.#disposed) void this.#p5.redraw();
          });
        }
        void sketch.loadImage(BOARDING_DOOR_TOP_IMAGE).then((image) => {
          this.#doorTop = image;
          if (this.#ready && !this.#disposed) void this.#p5.redraw();
        });
        void sketch.loadImage(BOARDING_WALL_TOP_IMAGE).then((image) => {
          this.#wallTop = image;
          if (this.#ready && !this.#disposed) void this.#p5.redraw();
        });
        void sketch.loadImage(factionSpritesUrl).then((image) => {
          this.#factionSprites = image;
          if (this.#ready && !this.#disposed) void this.#p5.redraw();
        });
        for (const [name, url] of Object.entries(BOARDING_OBJECT_IMAGES) as [
          BoardingArtwork,
          string,
        ][]) {
          void sketch.loadImage(url).then((image) => {
            if (this.#disposed) return;
            this.#objects.set(name, image);
            if (this.#ready) void this.#p5.redraw();
          });
        }
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
      if (this.#snapshot && !this.#userCamera) this.#fitNow(this.#snapshot);
      void this.#p5.redraw();
    });
    this.#observer.observe(container);
  }

  render(snapshot: BoardingEditorSnapshot): void {
    this.#snapshot = snapshot;
    this.#show(this.#strokePreview(snapshot));
    if (this.#ready) this.#fit(snapshot);
    if (this.#ready) void this.#p5.redraw();
  }

  /** zooma-panorera-bordningseditor: left drag pans instead of painting. */
  setPanMode(value: boolean): void {
    this.#panMode = value;
    this.#paint = null;
  }

  /** zooma-panorera-bordningseditor: return to the view that fits the ship. */
  fitView(): void {
    if (!this.#snapshot || !this.#ready) return;
    this.#fitNow(this.#snapshot);
    void this.#p5.redraw();
  }

  #strokePreview(snapshot: BoardingEditorSnapshot): BoardingEditorSnapshot {
    if (!this.#paint?.cells.length) return snapshot;
    return boardingEditorStrokePreview(
      snapshot,
      this.#paint.button,
      this.#paint.cells,
    );
  }

  /** direkt-penselstreck-i-editor: redraw with the stroke in progress. */
  #showStroke(): void {
    if (!this.#snapshot) return;
    this.#show(this.#strokePreview(this.#snapshot));
    if (this.#ready) void this.#p5.redraw();
  }

  #show(snapshot: BoardingEditorSnapshot): void {
    this.#display = snapshot;
    const map = parseBoardingMap(
      formatBoardingMap({
        name: snapshot.name,
        width: snapshot.width,
        height: snapshot.height,
        campaign: true,
        spriteX: null,
        spriteY: null,
        spriteScale: null,
        ...snapshot.layers,
      }),
    );
    const physical = {
      features: map.features.map((feature) => ({
        ...feature,
        hitPoints: 1,
        maxHitPoints: 1,
        open: false,
        locked: feature.locked ?? false,
        destroyed: false,
        exit: feature.exit ?? null,
      })),
      smokeCells: [],
    };
    this.#map = map;
    this.#lighting = new BoardingLighting(map, physical);
    this.#lightMap = new BoardingLightMap(map, physical);
    this.#lightPainter.clear();
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
  }

  dispose(): void {
    this.#disposed = true;
    clearTimeout(this.#longPress);
    this.#events.abort();
    this.#observer.disconnect();
    this.#p5.remove();
  }

  /** Refit only when the ship, view or grid size changes, not on painting. */
  #fit(snapshot: BoardingEditorSnapshot): void {
    const key = [
      snapshot.projection,
      snapshot.mapId,
      snapshot.width,
      snapshot.height,
    ].join(':');
    if (this.#layoutKey === key) return;
    this.#layoutKey = key;
    this.#fitNow(snapshot);
  }

  #fitNow(snapshot: BoardingEditorSnapshot): void {
    this.#userCamera = false;
    if (snapshot.projection === 'isometric') {
      const camera = boardingIsoCamera(
        snapshot,
        {
          width: this.#p5.width,
          height: this.#p5.height,
        },
        (cell) => snapshot.layers.terrain[cell.r]?.[cell.q] !== 'O',
      );
      this.#scale = camera.scale;
      this.#offset = camera.offset;
      return;
    }
    const gridWidth = snapshot.width * EDITOR_ORTHO_CELL;
    const gridHeight = snapshot.height * EDITOR_ORTHO_CELL;
    this.#scale = clampZoom(
      Math.min(
        (this.#p5.width - ORTHO_MARGIN * 2) / gridWidth,
        (this.#p5.height - ORTHO_MARGIN * 2) / gridHeight,
      ),
    );
    this.#offset = {
      x: (this.#p5.width - gridWidth * this.#scale) / 2,
      y: (this.#p5.height - gridHeight * this.#scale) / 2,
    };
  }

  #zoomAround(anchor: { x: number; y: number }, factor: number): void {
    const next = clampZoom(this.#scale * factor);
    const ratio = next / this.#scale;
    this.#offset = {
      x: anchor.x - (anchor.x - this.#offset.x) * ratio,
      y: anchor.y - (anchor.y - this.#offset.y) * ratio,
    };
    this.#scale = next;
    this.#userCamera = true;
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
        if (
          event.button === 1 ||
          this.#pointers.size > 1 ||
          (this.#panMode && event.button === 0)
        ) {
          this.#cameraDrag = next;
          if (this.#paint) {
            this.#paint = null;
            this.#showStroke();
          }
          return;
        }
        const button: EditorBrushButton =
          event.button === 2 ? 'secondary' : 'primary';
        const cell = this.#cellAt(next);
        this.#paint = { button, cells: cell ? [cell] : [] };
        this.#showStroke();
        if (event.pointerType === 'touch' && event.button === 0) {
          clearTimeout(this.#longPress);
          this.#longPress = setTimeout(() => {
            if (!this.#paint || this.#paint.cells.length !== 1) return;
            this.#paint.button = 'secondary';
            this.#showStroke();
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
            // zooma-panorera-bordningseditor: pinch zooms around the fingers
            // and moving both fingers pans.
            const oldMid = {
              x: (previous.x + other.x) / 2,
              y: (previous.y + other.y) / 2,
            };
            const newMid = {
              x: (next.x + other.x) / 2,
              y: (next.y + other.y) / 2,
            };
            const oldDistance = Math.hypot(
              previous.x - other.x,
              previous.y - other.y,
            );
            const newDistance = Math.hypot(next.x - other.x, next.y - other.y);
            this.#offset = {
              x: this.#offset.x + newMid.x - oldMid.x,
              y: this.#offset.y + newMid.y - oldMid.y,
            };
            this.#userCamera = true;
            if (oldDistance > 0)
              this.#zoomAround(newMid, newDistance / oldDistance);
          }
          if (this.#paint) {
            this.#paint = null;
            this.#showStroke();
          }
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
          this.#userCamera = true;
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
          ) {
            this.#paint.cells.push(cell);
            this.#showStroke();
          }
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
        this.#zoomAround(point(event), factor);
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
    const snapshot = this.#display;
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
        if (terrain !== 'O') {
          sketch.fill(TERRAIN_FILL[terrain] ?? '#24323c');
          sketch.rect(q * size, r * size, size, size);
        }
        const room = snapshot.layers.rooms[r]?.[q] ?? '-';
        if (room !== '-') {
          sketch.fill(ROOM_FILL[room] ?? '#3f5f9f99');
          sketch.rect(q * size, r * size, size, size);
        }
        const pieces = this.#thinPieces(snapshot, { q, r });
        if (pieces) {
          sketch.fill(
            terrain === 'W'
              ? '#8fc8ff'
              : boardingThinWallIsLow(terrain)
                ? '#d7b07a'
                : '#e7eef5',
          );
          for (const piece of pieces) {
            const box = boardingThinPieceBounds({ q, r }, piece);
            sketch.rect(
              (box.minQ + 0.5) * size,
              (box.minR + 0.5) * size,
              (box.maxQ - box.minQ) * size,
              (box.maxR - box.minR) * size,
            );
          }
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

  /**
   * sammanfogade-tunna-vaggar: the joined slabs of the thin wall painted at
   * `position`, or null where none stands.
   */
  #thinPieces(
    snapshot: BoardingEditorSnapshot,
    position: { q: number; r: number },
  ): readonly BoardingThinPiece[] | null {
    const symbol = snapshot.layers.terrain[position.r]?.[position.q] ?? '';
    // helhogt-fonster: a High window pane is shaped like a thin wall.
    const axis = symbol === 'W' ? 'q' : boardingThinAxisFromSymbol(symbol);
    if (!axis) return null;
    return (
      this.#map?.thinWallPieces(position) ?? boardingStraightThinPieces(axis)
    );
  }

  #drawIso(sketch: p5, snapshot: BoardingEditorSnapshot): void {
    sketch.push();
    sketch.translate(this.#offset.x, this.#offset.y);
    sketch.scale(this.#scale);
    const sprite = this.#previewSprite ?? snapshot.sprite;
    if (this.#sprite) {
      sketch.push();
      sketch.tint(255, Math.round(snapshot.spriteOpacity * 255));
      sketch.applyMatrix(...boardingSpritePlaneTransform());
      sketch.image(
        this.#sprite,
        sprite.x,
        sprite.y,
        sprite.scale,
        (sprite.scale * this.#sprite.height) / Math.max(1, this.#sprite.width),
      );
      sketch.pop();
    }
    const walls = new Set<string>();
    const structure = new Set<string>();
    const thinPeers: Record<string, Set<string>> = {
      Q: new Set(),
      R: new Set(),
      q: new Set(),
      r: new Set(),
    };
    const roomAt = ({ q, r }: { q: number; r: number }) => {
      const terrain = snapshot.layers.terrain[r]?.[q];
      if (
        terrain !== '.' &&
        terrain !== 'W' &&
        !boardingThinAxisFromSymbol(terrain ?? '')
      )
        return null;
      const symbol = snapshot.layers.rooms[r]?.[q];
      return symbol === 'B'
        ? ('bridge' as const)
        : symbol === 'E'
          ? ('engineering' as const)
          : symbol === 'K'
            ? ('cockpit' as const)
            : null;
    };
    const floors: { q: number; r: number }[] = [];
    for (let r = 0; r < snapshot.height; r++) {
      for (let q = 0; q < snapshot.width; q++) {
        const terrain = snapshot.layers.terrain[r]?.[q] ?? 'H';
        if (terrain === 'O') continue;
        if (
          terrain === '.' ||
          terrain === 'W' ||
          boardingThinAxisFromSymbol(terrain)
        )
          floors.push({ q, r });
        if (terrain === '#' || terrain === 'H') walls.add(wallKey(q, r));
        if (
          terrain === '#' ||
          terrain === 'H' ||
          terrain === 'W' ||
          boardingThinAxisFromSymbol(terrain)
        )
          structure.add(wallKey(q, r));
        const low = boardingThinWallIsLow(terrain);
        for (const piece of this.#thinPieces(snapshot, { q, r }) ?? [])
          thinPeers[low ? piece.axis : piece.axis.toUpperCase()]?.add(
            wallKey(q, r),
          );
      }
    }
    const visibility = new BoardingWallVisibility(floors);
    for (let r = 0; r < snapshot.height; r++) {
      for (let q = 0; q < snapshot.width; q++) {
        const position = { q, r };
        const terrain = snapshot.layers.terrain[r]?.[q] ?? 'H';
        if (terrain === 'O') continue;
        const floor =
          this.#floorTiles.get(boardingSurfaceStyle(roomAt, position)) ??
          this.#floorTiles.get('default') ??
          null;
        // tunna-fonster: a thin pane leaves its whole floor in view.
        const pieces =
          terrain === 'W' ? null : this.#thinPieces(snapshot, position);
        const thinAxis = pieces && boardingThinPiecesStraight(pieces);
        if (thinAxis) {
          const floorsPainted = paintThinWallFloors(
            sketch,
            position,
            thinAxis,
            {
              cache: (image) => this.#cache(image),
              floorAt: (cell) =>
                this.#floorTiles.get(boardingSurfaceStyle(roomAt, cell)) ??
                this.#floorTiles.get('default') ??
                null,
              showsOutside:
                boardingThinOutsideTerrain(
                  (cell) =>
                    editorTerrain(snapshot.layers.terrain[cell.r]?.[cell.q]),
                  position,
                  thinAxis,
                ) !== null,
              outsideKnown: true,
            },
          );
          const context = sketch.drawingContext as CanvasRenderingContext2D;
          this.#lightMap?.paint(context, floorsPainted.inside, position);
          if (floorsPainted.outside)
            this.#lightMap?.paint(context, floorsPainted.outside, position);
        }
        // sammanfogade-tunna-vaggar: a joint or an end keeps its own floor.
        const ownFloor =
          terrain === '.' || terrain === 'W' || (pieces !== null && !thinAxis);
        const paintedFloor =
          !thinAxis &&
          ownFloor &&
          floor !== null &&
          paintIsoFloor(sketch, floor, this.#cache(floor), position);
        if (!thinAxis && !paintedFloor) {
          sketch.noStroke();
          sketch.fill(
            ownFloor ? '#24334a' : terrain === '#' ? '#3a4658' : '#343d4c',
          );
          paintIsoDiamond(sketch, position);
        }
        if (ownFloor)
          this.#lightMap?.paint(
            sketch.drawingContext as CanvasRenderingContext2D,
            boardingIsoCorners(position),
            position,
          );
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
      if (terrain === 'O') continue;
      const object = snapshot.layers.objects[cell.r]?.[cell.q] ?? '-';
      const position = { q: cell.q, r: cell.r };
      const center = boardingIsoCenter(position);
      if (terrain === '#' || terrain === 'H') {
        const height = visibility.height(position);
        const wall = this.#wallTiles.get('default') ?? null;
        const option = (image: p5.Image | undefined | null) =>
          image ? { tile: image, cache: this.#cache(image) } : undefined;
        if (
          !wall ||
          !paintIsoWall(
            sketch,
            wall,
            this.#cache(wall),
            position,
            walls,
            height,
            {
              east: option(
                this.#wallTiles.get(
                  boardingWallFaceStyle(roomAt, position, 'southEast'),
                ),
              ),
              west: option(
                this.#wallTiles.get(
                  boardingWallFaceStyle(roomAt, position, 'southWest'),
                ),
              ),
              top: option(this.#wallTop),
            },
          )
        )
          paintIsoBlock(
            sketch,
            center,
            terrain === '#' ? 'wall' : 'hull',
            height,
          );
        if (this.#lighting) {
          const faces = boardingIsoBlockFaces(
            center,
            BOARDING_HALF_TILE_WIDTH,
            BOARDING_HALF_TILE_HEIGHT,
            height,
          );
          for (const face of ['southEast', 'southWest', 'top'] as const)
            this.#lightPainter.paint(
              sketch.drawingContext as CanvasRenderingContext2D,
              faces[face],
              this.#lighting.surface(
                position,
                face,
                height / boardingHeight(1),
              ),
            );
        }
      }
      // dorrar-som-tunna-vaggar: a door is a thin wall with a door face.
      const door = objectKind(object) === 'door';
      const shape = door
        ? boardingStraightThinPieces(
            boardingDoorAxis(position, (q, r) => structure.has(wallKey(q, r))),
          )
        : this.#thinPieces(snapshot, position);
      const low = !door && boardingThinWallIsLow(terrain);
      const height = shape
        ? visibility.height(position, { pieces: shape, low, door })
        : 0;
      const pane = !door && terrain === 'W';
      // sammanfogade-tunna-vaggar: each slab, back to front.
      for (const piece of pane ? [] : (shape ?? [])) {
        const thinAxis = piece.axis;
        const faced =
          boardingThinOutsideTerrain(
            (cell) => editorTerrain(snapshot.layers.terrain[cell.r]?.[cell.q]),
            position,
            thinAxis,
          ) !== null
            ? boardingThinNeighbor(position, thinAxis)
            : position;
        const wall = this.#wallTiles.get('default') ?? null;
        const option = (image: p5.Image | undefined | null) =>
          image ? { tile: image, cache: this.#cache(image) } : undefined;
        const mesh = paintIsoThinWall(
          sketch,
          wall,
          wall ? this.#cache(wall) : { floor: null, wall: null },
          position,
          thinAxis,
          thinPeers[low ? thinAxis : thinAxis.toUpperCase()] ?? new Set(),
          height,
          {
            face: door
              ? option(this.#doorFaces.get(object === 'L' ? 'locked' : 'open'))
              : option(
                  this.#wallTiles.get(boardingSurfaceStyle(roomAt, faced)),
                ),
            ...(door ? { faceTexture: [0, 1] as const } : { span: piece.span }),
            top: option(
              door ? (this.#doorTop ?? this.#wallTop) : this.#wallTop,
            ),
            section:
              !low &&
              height < boardingHeight(BOARDING_METERS.wall) &&
              !this.#wallTop,
          },
        );
        if (this.#lighting) {
          const meters = height / boardingHeight(1);
          const longFace = thinAxis === 'q' ? 'southEast' : 'southWest';
          const endFace = thinAxis === 'q' ? 'southWest' : 'southEast';
          const context = sketch.drawingContext as CanvasRenderingContext2D;
          this.#lightPainter.paint(
            context,
            mesh.longFace,
            this.#lighting.surface(position, longFace, meters),
          );
          this.#lightPainter.paint(
            context,
            mesh.endFace,
            this.#lighting.surface(position, endFace, meters),
          );
          this.#lightPainter.paint(
            context,
            mesh.top,
            this.#lighting.surface(position, 'top', meters),
          );
        }
      }
      // fonster-pa-halvhog-vagg / helhogt-fonster: glass up to the ceiling.
      if (!door && (pane || low))
        for (const piece of shape ?? [])
          paintIsoGlass(
            sketch,
            position,
            piece,
            pane ? 0 : BOARDING_METERS.cover,
            BOARDING_METERS.wall,
          );
      const kind = objectKind(object);
      const featureKind =
        object === 'R'
          ? 'reactor'
          : kind === 'door' || kind === 'cover'
            ? null
            : kind;
      // halvskydd-som-geometri: Half cover is a textured box, as in combat.
      const crate =
        kind === 'cover'
          ? paintIsoCrate(
              sketch,
              center,
              this.#crateOption('side'),
              this.#crateOption('top'),
            )
          : null;
      if (crate && this.#lighting) {
        const meters = boardingFeatureHeight('cover') / boardingHeight(1);
        for (const face of ['southEast', 'southWest', 'top'] as const)
          this.#lightPainter.paint(
            sketch.drawingContext as CanvasRenderingContext2D,
            crate[face],
            this.#lighting.surface(position, face, meters),
          );
      }
      const artwork =
        object === 'A'
          ? 'airlock'
          : featureKind
            ? boardingObjectArtwork({ kind: featureKind, position })
            : null;
      const image = artwork ? this.#objects.get(artwork) : undefined;
      if (artwork && image) {
        const box = boardingObjectBounds(artwork, center);
        sketch.push();
        sketch.tint(255 * (this.#lighting?.tile(position) ?? 1));
        sketch.image(image, box.x, box.y, box.width, box.height);
        sketch.pop();
      }
      if (kind && kind !== 'door' && !crate && !image) {
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
      } else if (!image && !door && !crate) {
        const mark = glyph('objects', object);
        const marks = mark ? [mark] : [];
        if (marks.length) {
          sketch.noStroke();
          sketch.fill('#e5e8e6');
          sketch.textAlign(sketch.CENTER, sketch.CENTER);
          sketch.textSize(16);
          sketch.text(marks.join(''), center.x, center.y - 10);
        }
      }
      const spawn = snapshot.layers.spawns[cell.r]?.[cell.q];
      const side: BoardingCharacterSide | null =
        spawn === 'P'
          ? 'player'
          : spawn === 'D'
            ? 'defender'
            : spawn === 'C'
              ? 'civilian'
              : null;
      if (side && this.#factionSprites) {
        const sprite = boardingCharacterSprite(side, center, 'standing');
        sketch.push();
        sketch.tint(255 * (this.#lighting?.tile(position) ?? 1));
        sketch.image(
          this.#factionSprites,
          sprite.destination.x,
          sprite.destination.y,
          sprite.destination.width,
          sprite.destination.height,
          sprite.source.x,
          sprite.source.y,
          sprite.source.width,
          sprite.source.height,
        );
        sketch.pop();
      } else if (side) {
        sketch.noStroke();
        sketch.fill(
          side === 'player'
            ? '#5ac8fa'
            : side === 'defender'
              ? '#ef6461'
              : '#8bd17c',
        );
        sketch.circle(center.x, center.y - boardingHeight(1.3), 21);
      }
      if (snapshot.layers.lights[cell.r]?.[cell.q] === 'L') {
        sketch.noStroke();
        sketch.fill('#ffdb70');
        sketch.textAlign(sketch.CENTER, sketch.CENTER);
        sketch.textSize(18);
        sketch.text('☼', center.x, center.y - boardingHeight(2.2));
      }
    }
    sketch.pop();
  }

  #crateOption(
    face: 'side' | 'top',
  ): { tile: p5.Image; cache: IsoImageCache } | undefined {
    const image = this.#crate.get(face);
    return image ? { tile: image, cache: this.#cache(image) } : undefined;
  }

  #cache(image: p5.Image): IsoImageCache {
    let cache = this.#isoCaches.get(image);
    if (!cache) {
      cache = { floor: null, wall: null };
      this.#isoCaches.set(image, cache);
    }
    return cache;
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
    snapshot.layers.lights[r]?.[q] === 'L' ? '☼' : null,
  ].filter((mark): mark is string => mark !== null);
}
