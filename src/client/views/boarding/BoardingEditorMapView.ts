import p5 from 'p5';
import type {
  BoardingEditorSnapshot,
  EditorBrushButton,
  EditorPaintCell,
  SpriteTransform,
} from '../../models/boarding/BoardingEditor.js';
import type { BoardingMapId } from '../../../shared/boarding-map-format.js';
import {
  BOARDING_FLOOR_IMAGES,
  BOARDING_WALL_IMAGES,
  BOARDING_DOOR_FACE_IMAGES,
  BOARDING_WALL_TOP_IMAGE,
  boardingSurfaceStyle,
  boardingWallFaceStyle,
  type BoardingSurfaceStyle,
} from './BoardingSurfaceArtwork.js';
import factionSpritesUrl from '../../assets/boarding/characters/directional-faction-sprites.webp';
import {
  boardingCharacterSprite,
  type BoardingCharacterSide,
} from './BoardingCharacterSprite.js';
import {
  BOARDING_OBJECT_IMAGES,
  boardingObjectArtwork,
  boardingObjectBounds,
  type BoardingArtwork,
} from './BoardingObjectArtwork.js';
import { BoardingWallVisibility } from './BoardingWallVisibility.js';
import {
  boardingDoorAxis,
  boardingThinAxisFromSymbol,
  boardingThinNeighbor,
  boardingThinOutsideTerrain,
  boardingThinWallIsLow,
  parseBoardingMap,
} from '../../models/boarding/BoardingMap.js';
import { formatBoardingMap } from '../../../shared/boarding-map-format.js';
import { BoardingLighting } from './BoardingLighting.js';
import { BoardingLightPainter } from './BoardingLightPainter.js';
import { BOARDING_METERS, boardingHeight } from './BoardingScale.js';
import { SHIP_SPRITES, type ShipSpriteType } from '../ShipImages.js';
import {
  BOARDING_HALF_TILE_WIDTH,
  BOARDING_HALF_TILE_HEIGHT,
  boardingFeatureGlyph,
  boardingIsoCamera,
  boardingIsoCenter,
  boardingIsoCorners,
  boardingIsoBlockFaces,
  boardingSpritePlaneTransform,
} from './BoardingProjection.js';
import {
  boardingEditorCellAt,
  EDITOR_ORTHO_CELL,
} from './BoardingEditorPick.js';
import {
  paintIsoBlock,
  paintIsoDiamond,
  paintIsoFloor,
  paintIsoThinWall,
  paintIsoWall,
  paintThinWallFloors,
  type IsoImageCache,
} from './BoardingSurfacePainter.js';

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
  Q: '#8aa0b8cc',
  R: '#8aa0b8cc',
  q: '#c4a574cc',
  r: '#c4a574cc',
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
  #snapshot: BoardingEditorSnapshot | null = null;
  #sprite: p5.Image | null = null;
  #spriteMap: BoardingMapId | null = null;
  readonly #floorTiles = new Map<BoardingSurfaceStyle, p5.Image>();
  readonly #wallTiles = new Map<BoardingSurfaceStyle, p5.Image>();
  #wallTop: p5.Image | null = null;
  readonly #doorFaces = new Map<'open' | 'locked', p5.Image>();
  #factionSprites: p5.Image | null = null;
  readonly #objects = new Map<BoardingArtwork, p5.Image>();
  #lighting: BoardingLighting | null = null;
  readonly #lightPainter = new BoardingLightPainter();
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
      this.#layoutKey = '';
      if (this.#snapshot) this.#fit(this.#snapshot);
      void this.#p5.redraw();
    });
    this.#observer.observe(container);
  }

  render(snapshot: BoardingEditorSnapshot): void {
    this.#snapshot = snapshot;
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
    this.#lighting = new BoardingLighting(map, {
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
    });
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
    const key = `${snapshot.projection}:${snapshot.mapId}:${snapshot.width}x${snapshot.height}:${this.#p5.width}x${this.#p5.height}:${snapshot.projection === 'isometric' ? snapshot.layers.terrain.map((row) => row.replaceAll(/[^O]/g, '.')).join('') : ''}`;
    if (this.#layoutKey === key) return;
    this.#layoutKey = key;
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
        if (terrain !== 'O') {
          sketch.fill(TERRAIN_FILL[terrain] ?? '#24323c');
          sketch.rect(q * size, r * size, size, size);
        }
        const room = snapshot.layers.rooms[r]?.[q] ?? '-';
        if (room !== '-') {
          sketch.fill(ROOM_FILL[room] ?? '#3f5f9f99');
          sketch.rect(q * size, r * size, size, size);
        }
        const thinAxis = boardingThinAxisFromSymbol(terrain);
        if (thinAxis) {
          sketch.fill(boardingThinWallIsLow(terrain) ? '#d7b07a' : '#e7eef5');
          const inset = (1 - BOARDING_METERS.thinWall) / 2;
          if (thinAxis === 'q')
            sketch.rect(
              (q + inset) * size,
              r * size,
              size * BOARDING_METERS.thinWall,
              size,
            );
          else
            sketch.rect(
              q * size,
              (r + inset) * size,
              size,
              size * BOARDING_METERS.thinWall,
            );
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
      if (terrain !== '.' && !boardingThinAxisFromSymbol(terrain ?? ''))
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
        if (terrain === '.' || boardingThinAxisFromSymbol(terrain))
          floors.push({ q, r });
        if (terrain === '#' || terrain === 'H') walls.add(wallKey(q, r));
        if (
          terrain === '#' ||
          terrain === 'H' ||
          boardingThinAxisFromSymbol(terrain)
        )
          structure.add(wallKey(q, r));
        thinPeers[terrain]?.add(wallKey(q, r));
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
        const thinAxis = boardingThinAxisFromSymbol(terrain);
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
          if (this.#lighting) {
            const light = this.#lighting.tile(position);
            const values = [light, light, light, light];
            this.#lightPainter.paint(
              sketch.drawingContext as CanvasRenderingContext2D,
              floorsPainted.inside,
              values,
            );
            if (floorsPainted.outside)
              this.#lightPainter.paint(
                sketch.drawingContext as CanvasRenderingContext2D,
                floorsPainted.outside,
                values,
              );
          }
        }
        const paintedFloor =
          !thinAxis &&
          terrain === '.' &&
          floor !== null &&
          paintIsoFloor(sketch, floor, this.#cache(floor), position);
        if (!thinAxis && !paintedFloor) {
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
        if (terrain === '.' && this.#lighting)
          this.#lightPainter.paint(
            sketch.drawingContext as CanvasRenderingContext2D,
            boardingIsoCorners(position),
            this.#lighting.surface(position, 'floor'),
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
      const thinAxis = door
        ? boardingDoorAxis(position, (q, r) => structure.has(wallKey(q, r)))
        : boardingThinAxisFromSymbol(terrain);
      if (thinAxis) {
        const low = !door && boardingThinWallIsLow(terrain);
        const height = visibility.height(position, { axis: thinAxis, low });
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
          (door ? thinPeers[thinAxis.toUpperCase()] : thinPeers[terrain]) ??
            new Set(),
          height,
          {
            face: door
              ? option(this.#doorFaces.get(object === 'L' ? 'locked' : 'open'))
              : option(
                  this.#wallTiles.get(boardingSurfaceStyle(roomAt, faced)),
                ),
            wholeFace: door,
            top: option(this.#wallTop),
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
      const kind = objectKind(object);
      const featureKind =
        object === 'R' ? 'reactor' : kind === 'door' ? null : kind;
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
      if (kind && kind !== 'door' && !image) {
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
      } else if (!image && !door) {
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
