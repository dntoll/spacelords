import p5 from 'p5';
import type { BoardingMap, BoardingCell } from '../models/BoardingMap.js';
import {
  BoardingBattle,
  boardingActionPointsRemaining,
  type BoardingBattleState,
} from '../models/BoardingBattle.js';
import type { BoardingPathMark } from '../models/BoardingPathPreview.js';
import type { BoardingMapPort } from './BoardingView.js';
import floorTileUrl from '../assets/boarding/floor-tile.png';
import wallTileUrl from '../assets/boarding/wall-tile.png';
import factionSpritesUrl from '../assets/boarding/faction-sprites.png';
import {
  BOARDING_FOOT_PLANT,
  boardingCharacterAtPoint,
  boardingCharacterSprite,
} from './BoardingCharacterSprite.js';
import {
  boardingAnimTick,
  boardingCellFromIsoPoint,
  boardingFeatureFootprint,
  boardingFeatureGlyph,
  boardingFeatureHeight,
  boardingIsoBlockFaces,
  boardingIsoCamera,
  boardingIsoCenter,
  boardingIsoCorners,
  boardingIsoTextureTransform,
  boardingQuadTextureTransform,
  boardingWallRun,
  boardingWallSlice,
  type BoardingPoint as Point,
} from './BoardingProjection.js';

const key = (position: BoardingCell): string => `${position.q},${position.r}`;

function stackOffset(
  people: readonly {
    readonly id: string;
    readonly position: BoardingCell;
    readonly status: string;
  }[],
  personId: string,
  selectedId: string | null,
  actorId: string | null,
): { readonly x: number; readonly y: number } {
  const person = people.find((entry) => entry.id === personId);
  if (!person) return { x: 0, y: 0 };
  const stack = people.filter(
    (entry) =>
      entry.status !== 'evacuated' &&
      key(entry.position) === key(person.position),
  );
  const rank = (id: string, status: string) =>
    id === selectedId ? 3 : id === actorId ? 2 : status === 'active' ? 1 : 0;
  stack.sort(
    (a, b) =>
      rank(a.id, a.status) - rank(b.id, b.status) || a.id.localeCompare(b.id),
  );
  const index = Math.max(
    0,
    stack.findIndex((entry) => entry.id === personId),
  );
  return { x: index * 10, y: index * 5 };
}

export class BoardingMapView implements BoardingMapPort {
  readonly #p5: p5;
  readonly #observer: ResizeObserver;
  readonly #events = new AbortController();
  #state: BoardingBattleState | null = null;
  #selectedId: string | null = null;
  #destination: BoardingCell | null = null;
  #path: readonly BoardingPathMark[] = [];
  #sight: readonly BoardingCell[] = [];
  #fire: readonly BoardingCell[] = [];
  #motion: {
    from: BoardingBattleState;
    to: BoardingBattleState;
    started: number;
    duration: number;
    resolve: () => void;
  } | null = null;
  #shot: {
    from: Point;
    to: Point;
    started: number;
    duration: number;
    resolve: () => void;
  } | null = null;
  #scale = 1;
  #offset: Point = { x: 0, y: 0 };
  #floorTile: p5.Image | null = null;
  #floorSource: CanvasImageSource | null = null;
  #wallTile: p5.Image | null = null;
  #wallSource: CanvasImageSource | null = null;
  #factionSprites: p5.Image | null = null;
  #ready = false;
  #disposed = false;
  #motionTimer: ReturnType<typeof setTimeout> | undefined;
  #fitPending = true;
  readonly #pointers = new Map<number, Point>();
  #start: Point | null = null;
  #dragged = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly map: BoardingMap,
    select: (cell: BoardingCell, personId?: string) => void,
  ) {
    this.#p5 = new p5((sketch) => {
      sketch.setup = () => {
        if (this.#disposed) return;
        const canvas = sketch.createCanvas(
          Math.max(1, container.clientWidth),
          Math.max(1, container.clientHeight),
        ).elt;
        sketch.pixelDensity(Math.min(devicePixelRatio || 1, 2));
        sketch.noLoop();
        sketch.textFont('system-ui');
        canvas.tabIndex = 0;
        canvas.setAttribute(
          'aria-label',
          'Isometric boarding map. Tap a tile to choose a destination or target. Drag to pan, pinch or scroll to zoom.',
        );
        void sketch.loadImage(floorTileUrl).then((image) => {
          this.#floorTile = image;
          this.#floorSource = null;
          if (!this.#disposed && this.#ready) void this.#p5.redraw();
        });
        void sketch.loadImage(wallTileUrl).then((image) => {
          this.#wallTile = image;
          this.#wallSource = null;
          if (!this.#disposed && this.#ready) void this.#p5.redraw();
        });
        void sketch.loadImage(factionSpritesUrl).then((image) => {
          this.#factionSprites = image;
          if (!this.#disposed && this.#ready) void this.#p5.redraw();
        });
        this.#bind(canvas, select);
        this.#ready = true;
        this.fit();
      };
      sketch.draw = () => this.#draw(sketch);
    }, container);
    this.#observer = new ResizeObserver(() => {
      if (!this.#ready || this.#disposed) return;
      this.#p5.resizeCanvas(
        Math.max(1, container.clientWidth),
        Math.max(1, container.clientHeight),
      );
      if (this.#fitPending) this.fit();
      else void this.#p5.redraw();
    });
    this.#observer.observe(container);
  }

  render(
    state: BoardingBattleState,
    selectedId: string | null,
    destination: BoardingCell | null,
    path: readonly BoardingPathMark[],
    sight: readonly BoardingCell[] = [],
    fire: readonly BoardingCell[] = [],
  ): void {
    const changed = this.#state?.id !== state.id;
    this.#state = state;
    this.#selectedId = selectedId;
    this.#destination = destination;
    this.#path = path;
    this.#sight = sight;
    this.#fire = fire;
    if (changed || this.#fitPending) this.fit();
    if (this.#ready) void this.#p5.redraw();
  }

  fit(): void {
    if (!this.#ready || this.container.clientWidth < 1) {
      this.#fitPending = true;
      return;
    }
    const camera = boardingIsoCamera(
      this.map,
      {
        width: this.#p5.width,
        height: this.#p5.height,
      },
      (cell) => this.map.terrainAt(cell) !== null,
    );
    this.#scale = camera.scale;
    this.#offset = camera.offset;
    this.#fitPending = false;
    void this.#p5.redraw();
  }

  zoom(factor: number): void {
    this.#zoomAt(factor, {
      x: this.#p5.width / 2,
      y: this.#p5.height / 2,
    });
  }

  #zoomAt(factor: number, anchor: Point): void {
    const next = Math.max(0.08, Math.min(3, this.#scale * factor));
    const ratio = next / this.#scale;
    this.#offset = {
      x: anchor.x - (anchor.x - this.#offset.x) * ratio,
      y: anchor.y - (anchor.y - this.#offset.y) * ratio,
    };
    this.#scale = next;
    if (this.#ready) void this.#p5.redraw();
  }

  playMotion(
    from: BoardingBattleState,
    to: BoardingBattleState,
  ): Promise<void> {
    this.#finishMotion();
    this.#state = to;
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      if (!this.#ready) {
        finish();
        return;
      }
      const duration = 260;
      this.#motion = {
        from,
        to,
        started: performance.now(),
        duration,
        resolve: finish,
      };
      this.#armMotionTimer(duration, finish);
      this.#p5.loop();
      void this.#p5.redraw();
    });
  }

  playShot(from: BoardingCell, to: BoardingCell): Promise<void> {
    this.#finishMotion();
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      if (!this.#ready) {
        finish();
        return;
      }
      const duration = 280;
      this.#shot = {
        from: boardingIsoCenter(from),
        to: boardingIsoCenter(to),
        started: performance.now(),
        duration,
        resolve: finish,
      };
      this.#armMotionTimer(duration, finish);
      this.#p5.loop();
      void this.#p5.redraw();
    });
  }

  #armMotionTimer(duration: number, finish: () => void): void {
    clearTimeout(this.#motionTimer);
    this.#motionTimer = setTimeout(() => {
      if (this.#motion?.resolve === finish || this.#shot?.resolve === finish)
        this.#finishMotion();
    }, duration + 80);
  }

  #finishMotion(): void {
    clearTimeout(this.#motionTimer);
    this.#motionTimer = undefined;
    const motion = this.#motion;
    const shot = this.#shot;
    this.#motion = null;
    this.#shot = null;
    if (this.#ready && !this.#disposed) this.#p5.noLoop();
    motion?.resolve();
    shot?.resolve();
  }

  #bind(
    canvas: HTMLCanvasElement,
    select: (cell: BoardingCell, personId?: string) => void,
  ): void {
    const options = { signal: this.#events.signal };
    const point = (event: PointerEvent | WheelEvent): Point => {
      const bounds = canvas.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };
    canvas.addEventListener(
      'pointerdown',
      (event) => {
        if (event.button !== 0 && event.pointerType === 'mouse') return;
        canvas.setPointerCapture(event.pointerId);
        this.#pointers.set(event.pointerId, point(event));
        this.#start = point(event);
        this.#dragged = this.#pointers.size > 1;
      },
      options,
    );
    canvas.addEventListener(
      'pointermove',
      (event) => {
        const previous = this.#pointers.get(event.pointerId);
        if (!previous) return;
        const next = point(event);
        if (this.#pointers.size === 1) {
          if (
            this.#start &&
            Math.hypot(next.x - this.#start.x, next.y - this.#start.y) > 6
          )
            this.#dragged = true;
          if (this.#dragged) {
            this.#offset = {
              x: this.#offset.x + next.x - previous.x,
              y: this.#offset.y + next.y - previous.y,
            };
            void this.#p5.redraw();
          }
        } else {
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
              this.#zoomAt(newDistance / oldDistance, {
                x: (other.x + next.x) / 2,
                y: (other.y + next.y) / 2,
              });
          }
          this.#dragged = true;
        }
        this.#pointers.set(event.pointerId, next);
      },
      options,
    );
    canvas.addEventListener(
      'pointerup',
      (event) => {
        if (!this.#pointers.has(event.pointerId)) return;
        if (!this.#dragged && !this.#motion) {
          const position = point(event);
          const iso = {
            x: (position.x - this.#offset.x) / this.#scale,
            y: (position.y - this.#offset.y) / this.#scale,
          };
          const people = this.#state?.people ?? [];
          const sprite = boardingCharacterAtPoint(
            people
              .filter(
                (person) =>
                  person.status !== 'dead' && person.status !== 'evacuated',
              )
              .map((person) => {
                const shift = stackOffset(
                  people,
                  person.id,
                  this.#selectedId,
                  this.#state?.currentActorId ?? null,
                );
                const center = boardingIsoCenter(person.position);
                return {
                  id: person.id,
                  side: person.side,
                  floorCenter: {
                    x: center.x + shift.x,
                    y: center.y + shift.y,
                  },
                  crouched: person.crouched,
                };
              }),
            iso,
          );
          const cell = sprite
            ? this.#state!.people.find((person) => person.id === sprite.id)!
                .position
            : boardingCellFromIsoPoint(iso);
          if (this.map.terrainAt(cell)) select(cell, sprite?.id);
        }
        this.#pointers.delete(event.pointerId);
        this.#start = null;
      },
      options,
    );
    canvas.addEventListener(
      'pointercancel',
      (event) => {
        this.#pointers.delete(event.pointerId);
        this.#dragged = true;
      },
      options,
    );
    canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        this.#zoomAt(Math.exp(-event.deltaY * 0.001), point(event));
      },
      { ...options, passive: false },
    );
    canvas.addEventListener(
      'keydown',
      (event) => {
        if (event.key === '+' || event.key === '=') this.zoom(1.25);
        else if (event.key === '-') this.zoom(0.8);
        else if (event.key === 'Home') this.fit();
        else return;
        event.preventDefault();
      },
      options,
    );
  }

  #paintFloor(sketch: p5, position: BoardingCell, current: boolean): boolean {
    const tile = this.#floorTile;
    if (!tile || tile.width < 2 || tile.height < 2) return false;
    const source = this.#imageSource(tile, 'floor');
    if (!source) return false;
    const corners = boardingIsoCorners(position);
    const [a, b, c, d, e, f] = boardingIsoTextureTransform(
      tile.width,
      tile.height,
      position,
    );
    const ctx = sketch.drawingContext as CanvasRenderingContext2D;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(corners[0]!.x, corners[0]!.y);
    for (const corner of corners.slice(1)) ctx.lineTo(corner.x, corner.y);
    ctx.closePath();
    ctx.clip();
    if (!current) {
      ctx.filter = 'brightness(0.42) saturate(0.7)';
      ctx.globalAlpha = 0.92;
    }
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(source, 0, 0, tile.width, tile.height);
    ctx.restore();
    return true;
  }

  #tile(sketch: p5, position: BoardingCell, yOffset = 0): void {
    sketch.beginShape();
    for (const corner of boardingIsoCorners(position))
      sketch.vertex(corner.x, corner.y - yOffset);
    sketch.endShape(sketch.CLOSE);
  }

  #block(
    sketch: p5,
    center: Point,
    width: number,
    depth: number,
    height: number,
    top: string,
  ): Point {
    const faces = boardingIsoBlockFaces(center, width, depth, height);
    sketch.noStroke();
    sketch.fill('#263247');
    sketch.quad(
      faces.southEast[0].x,
      faces.southEast[0].y,
      faces.southEast[1].x,
      faces.southEast[1].y,
      faces.southEast[2].x,
      faces.southEast[2].y,
      faces.southEast[3].x,
      faces.southEast[3].y,
    );
    sketch.fill('#1a2436');
    sketch.quad(
      faces.southWest[0].x,
      faces.southWest[0].y,
      faces.southWest[1].x,
      faces.southWest[1].y,
      faces.southWest[2].x,
      faces.southWest[2].y,
      faces.southWest[3].x,
      faces.southWest[3].y,
    );
    sketch.fill(top);
    sketch.quad(
      faces.top[0].x,
      faces.top[0].y,
      faces.top[1].x,
      faces.top[1].y,
      faces.top[2].x,
      faces.top[2].y,
      faces.top[3].x,
      faces.top[3].y,
    );
    return faces.apex;
  }

  #imageSource(
    tile: p5.Image,
    cache: 'floor' | 'wall',
  ): CanvasImageSource | null {
    const current = cache === 'floor' ? this.#floorSource : this.#wallSource;
    if (current) return current;
    const image = tile as p5.Image & {
      canvas?: CanvasImageSource;
      elt?: CanvasImageSource;
    };
    const found = image.canvas ?? image.elt ?? null;
    if (found) {
      if (cache === 'floor') this.#floorSource = found;
      else this.#wallSource = found;
      return found;
    }
    tile.loadPixels();
    if (tile.pixels.length < 4) return null;
    const canvas = document.createElement('canvas');
    canvas.width = tile.width;
    canvas.height = tile.height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.putImageData(
      new ImageData(
        new Uint8ClampedArray(tile.pixels),
        tile.width,
        tile.height,
      ),
      0,
      0,
    );
    if (cache === 'floor') this.#floorSource = canvas;
    else this.#wallSource = canvas;
    return canvas;
  }

  #paintTexturedQuad(
    sketch: p5,
    source: CanvasImageSource,
    slice: { readonly x: number; readonly width: number },
    textureHeight: number,
    origin: Point,
    alongU: Point,
    alongV: Point,
    clip: readonly Point[],
    filter?: string,
  ): void {
    const first = clip[0];
    if (!first) return;
    const [a, b, c, d, e, f] = boardingQuadTextureTransform(
      slice.width,
      textureHeight,
      origin,
      alongU,
      alongV,
    );
    const ctx = sketch.drawingContext as CanvasRenderingContext2D;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const corner of clip.slice(1)) ctx.lineTo(corner.x, corner.y);
    ctx.closePath();
    ctx.clip();
    if (filter) ctx.filter = filter;
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(
      source,
      slice.x,
      0,
      slice.width,
      textureHeight,
      0,
      0,
      slice.width,
      textureHeight,
    );
    ctx.restore();
  }

  #paintWall(
    sketch: p5,
    position: BoardingCell,
    current: boolean,
    selected: boolean,
    walls: ReadonlySet<string>,
  ): boolean {
    const tile = this.#wallTile;
    if (!tile || tile.width < 8 || tile.height < 2) return false;
    const source = this.#imageSource(tile, 'wall');
    if (!source) return false;
    const footprint = boardingFeatureFootprint('wall');
    const faces = boardingIsoBlockFaces(
      boardingIsoCenter(position),
      footprint.width,
      footprint.depth,
      boardingFeatureHeight('wall'),
    );
    const alongQ = boardingWallRun(walls, position, 'q');
    const alongR = boardingWallRun(walls, position, 'r');
    const qSlice = boardingWallSlice(tile.width, alongQ.index);
    const rSlice = boardingWallSlice(tile.width, alongR.index);
    const topSlice = alongQ.length >= alongR.length ? qSlice : rSlice;
    const remembered = current ? undefined : 'brightness(0.42) saturate(0.7)';
    this.#paintTexturedQuad(
      sketch,
      source,
      rSlice,
      tile.height,
      faces.southEast[0],
      faces.southEast[1],
      faces.southEast[3],
      faces.southEast,
      remembered ?? 'brightness(1.08)',
    );
    this.#paintTexturedQuad(
      sketch,
      source,
      qSlice,
      tile.height,
      faces.southWest[1],
      faces.southWest[0],
      faces.southWest[2],
      faces.southWest,
      remembered ?? 'brightness(0.72)',
    );
    this.#paintTexturedQuad(
      sketch,
      source,
      topSlice,
      tile.height,
      faces.top[0],
      alongQ.length >= alongR.length ? faces.top[1] : faces.top[3],
      alongQ.length >= alongR.length ? faces.top[3] : faces.top[1],
      faces.top,
      remembered ?? 'brightness(1.18) saturate(0.85)',
    );
    if (selected) {
      sketch.noStroke();
      sketch.fill(244, 207, 90, 72);
      sketch.quad(
        faces.top[0].x,
        faces.top[0].y,
        faces.top[1].x,
        faces.top[1].y,
        faces.top[2].x,
        faces.top[2].y,
        faces.top[3].x,
        faces.top[3].y,
      );
    }
    return true;
  }

  #draw(sketch: p5): void {
    sketch.background('#060914');
    const state = this.#state;
    if (!state) return;
    sketch.push();
    sketch.translate(this.#offset.x, this.#offset.y);
    sketch.scale(this.#scale);
    const motion = this.#motion;
    const shot = this.#shot;
    const now = performance.now();
    const motionTick = motion
      ? boardingAnimTick(motion.started, motion.duration, now)
      : null;
    const shotTick = shot
      ? boardingAnimTick(shot.started, shot.duration, now)
      : null;
    const progress = motionTick?.progress ?? 1;
    const shotProgress = shotTick?.progress ?? 1;
    if (motion && motionTick?.done) {
      this.#motion = null;
      queueMicrotask(motion.resolve);
    }
    if (shot && shotTick?.done) {
      this.#shot = null;
      queueMicrotask(shot.resolve);
    }
    if (!this.#motion && !this.#shot && this.#ready && !this.#disposed)
      this.#p5.noLoop();
    const visible = new Set(state.visibleCells.map(key));
    const explored = new Set(state.exploredCells.map(key));
    const smoke = new Set(state.smokeCells.map(key));
    const fire = new Set(
      this.#path
        .filter((mark) => mark.kind === 'fire')
        .map((mark) => key(mark.position)),
    );
    const reach = new Set(
      this.#path
        .filter((mark) => mark.kind === 'reach')
        .map((mark) => key(mark.position)),
    );
    const sightEdges = new Set(this.#sight.map(key));
    const fireEdges = new Set(this.#fire.map(key));
    const selectedCell = [
      ...state.people.filter((person) => person.id === this.#selectedId),
      ...state.features.filter((feature) => feature.id === this.#selectedId),
    ][0]?.position;
    const selectedTile = selectedCell ? key(selectedCell) : null;
    for (let r = 0; r < this.map.height; r++) {
      for (let q = 0; q < this.map.width; q++) {
        const position = { q, r };
        const terrain = this.map.terrainAt(position);
        if (!terrain) continue;
        const center = boardingIsoCenter(position);
        const current = visible.has(key(position));
        const remembered = explored.has(key(position));
        const knownHull = terrain === 'hull';
        const paintedFloor =
          terrain === 'floor' &&
          (current || remembered) &&
          this.#paintFloor(sketch, position, current);
        if (!paintedFloor) {
          sketch.stroke('#3c4b65');
          sketch.strokeWeight(1.2);
          if (current) sketch.fill('#24334a');
          else if (remembered) sketch.fill('#141d2c');
          else if (knownHull) sketch.fill('#343d4c');
          else sketch.fill('#080c15');
          this.#tile(sketch, position);
        }
        if (fire.has(key(position))) {
          sketch.fill(98, 212, 138, 115);
          this.#tile(sketch, position);
        } else if (reach.has(key(position))) {
          sketch.fill(240, 179, 90, 115);
          this.#tile(sketch, position);
        }
        if (fireEdges.has(key(position))) {
          sketch.noFill();
          sketch.stroke('#ef6461');
          sketch.strokeWeight(2.5);
          this.#tile(sketch, position);
        } else if (sightEdges.has(key(position))) {
          sketch.noFill();
          sketch.stroke('#5ac8fa');
          sketch.strokeWeight(2);
          this.#tile(sketch, position);
        }
        if (
          (this.#destination && key(this.#destination) === key(position)) ||
          selectedTile === key(position)
        ) {
          sketch.noFill();
          sketch.stroke('#f4cf5a');
          sketch.strokeWeight(4);
          this.#tile(sketch, position);
        }
        if (smoke.has(key(position)) && (current || remembered)) {
          sketch.noStroke();
          sketch.fill(170, 180, 190, 125);
          sketch.ellipse(center.x, center.y, 42, 20);
        }
      }
    }
    const known = (position: BoardingCell) =>
      visible.has(key(position)) || explored.has(key(position));
    const walls = new Set(
      state.features
        .filter(
          (feature) =>
            (feature.kind === 'wall' || feature.kind === 'hull') &&
            !feature.destroyed,
        )
        .map((feature) => key(feature.position)),
    );
    for (const feature of [...state.features].sort(
      (a, b) =>
        boardingIsoCenter(a.position).y - boardingIsoCenter(b.position).y,
    )) {
      if (
        feature.kind !== 'hull' &&
        feature.kind !== 'wall' &&
        !known(feature.position)
      )
        continue;
      const floor = boardingIsoCenter(feature.position);
      const raised =
        !feature.destroyed &&
        (feature.kind === 'hull' ||
          feature.kind === 'wall' ||
          (feature.kind === 'door' && !feature.open) ||
          feature.kind === 'cover');
      if (
        raised &&
        (feature.kind === 'wall' || feature.kind === 'hull') &&
        this.#paintWall(
          sketch,
          feature.position,
          visible.has(key(feature.position)),
          feature.id === this.#selectedId,
          walls,
        )
      )
        continue;
      const footprint = boardingFeatureFootprint(feature.kind);
      const center = raised
        ? this.#block(
            sketch,
            floor,
            footprint.width,
            footprint.depth,
            boardingFeatureHeight(feature.kind),
            feature.kind === 'cover'
              ? '#9c7448'
              : feature.kind === 'door'
                ? '#6e829f'
                : '#52657f',
          )
        : floor;
      const glyph = boardingFeatureGlyph(feature);
      if (!glyph) continue;
      sketch.textAlign(sketch.CENTER, sketch.CENTER);
      sketch.textSize(16);
      sketch.noStroke();
      sketch.fill(
        feature.destroyed
          ? '#606979'
          : feature.id === this.#selectedId
            ? '#f4cf5a'
            : feature.kind === 'cover'
              ? '#d5a86e'
              : '#dce7f7',
      );
      sketch.text(glyph, center.x, center.y);
    }
    for (const marker of state.lastKnownEnemies) {
      if (visible.has(key(marker.position))) continue;
      const center = boardingIsoCenter(marker.position);
      sketch.noFill();
      sketch.stroke('#e58b5a');
      sketch.circle(center.x, center.y, 22);
    }
    for (const marker of state.noiseMarkers.filter(
      (entry) => entry.audience === 'player',
    )) {
      const center = boardingIsoCenter(marker.position);
      sketch.noFill();
      sketch.stroke('#f4cf5a');
      sketch.circle(center.x, center.y, 30);
      sketch.circle(center.x, center.y, 20);
    }
    const mover = motion
      ? motion.from.people.find((person) => {
          const next = motion.to.people.find((entry) => entry.id === person.id);
          return (
            !!next &&
            (next.position.q !== person.position.q ||
              next.position.r !== person.position.r ||
              next.facing !== person.facing)
          );
        })
      : null;
    for (const person of [...state.people].sort((a, b) => {
      const dy =
        boardingIsoCenter(a.position).y - boardingIsoCenter(b.position).y;
      if (dy) return dy;
      const rank = (entry: typeof a) =>
        entry.id === this.#selectedId
          ? 3
          : entry.id === state.currentActorId
            ? 2
            : entry.status === 'active'
              ? 1
              : 0;
      return rank(a) - rank(b);
    })) {
      if (person.status === 'evacuated') continue;
      const origin = mover && person.id === mover.id ? mover : person;
      const target =
        mover && person.id === mover.id
          ? (motion!.to.people.find((entry) => entry.id === person.id) ??
            person)
          : person;
      const shift = stackOffset(
        state.people,
        person.id,
        this.#selectedId,
        state.currentActorId,
      );
      const fromCenter = boardingIsoCenter(origin.position);
      const toCenter = boardingIsoCenter(target.position);
      const center = {
        x: fromCenter.x + (toCenter.x - fromCenter.x) * progress + shift.x,
        y: fromCenter.y + (toCenter.y - fromCenter.y) * progress + shift.y,
      };
      const bodyY = center.y + BOARDING_FOOT_PLANT - (person.crouched ? 9 : 13);
      sketch.noStroke();
      sketch.fill(0, 0, 0, 95);
      sketch.ellipse(center.x, center.y + BOARDING_FOOT_PLANT, 25, 9);
      if (person.id === state.currentActorId && person.status === 'active') {
        sketch.noFill();
        sketch.stroke('#f4cf5a');
        sketch.strokeWeight(2.5);
        sketch.ellipse(center.x, center.y + BOARDING_FOOT_PLANT - 1, 32, 13);
      } else if (person.id === this.#selectedId) {
        sketch.noFill();
        sketch.stroke('#f4cf5a');
        sketch.strokeWeight(3);
        sketch.ellipse(center.x, center.y + BOARDING_FOOT_PLANT - 1, 36, 16);
      }
      if (this.#factionSprites) {
        const sprite = boardingCharacterSprite(
          person.side,
          center,
          person.crouched,
        );
        sketch.push();
        if (person.status === 'dead') sketch.tint(100, 115);
        else if (person.status === 'incapacitated') sketch.tint(190, 175);
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
      } else {
        sketch.noStroke();
        sketch.fill(
          person.side === 'player'
            ? '#5ac8fa'
            : person.side === 'defender'
              ? '#ef6461'
              : '#8bd17c',
        );
        sketch.circle(center.x, bodyY, person.crouched ? 17 : 21);
      }
      sketch.noStroke();
      const healthY = this.#factionSprites
        ? boardingCharacterSprite(person.side, center, person.crouched)
            .destination.y - 6
        : bodyY - 18;
      const showAp = person.side === 'player' && person.status === 'active';
      if (showAp) {
        const maxAp = Math.max(1, person.agility + person.equipmentApModifier);
        const remaining = boardingActionPointsRemaining(state, person.id);
        sketch.fill('#111827');
        sketch.rect(center.x - 15, healthY - 7, 30, 5, 2);
        sketch.fill('#f4cf5a');
        sketch.rect(center.x - 14, healthY - 6, (28 * remaining) / maxAp, 3, 1);
      }
      sketch.fill('#111827');
      sketch.rect(center.x - 15, healthY, 30, 5, 2);
      sketch.fill(
        person.side === 'player'
          ? '#5ac8fa'
          : person.side === 'defender'
            ? '#ef6461'
            : '#8bd17c',
      );
      sketch.rect(
        center.x - 14,
        healthY + 1,
        (28 * person.hitPoints) / person.maxHitPoints,
        3,
        1,
      );
      const fromFacing = boardingIsoCenter(
        BoardingBattle.forward({ q: 0, r: 0 }, origin.facing),
      );
      const toFacing = boardingIsoCenter(
        BoardingBattle.forward({ q: 0, r: 0 }, target.facing),
      );
      const originIso = boardingIsoCenter({ q: 0, r: 0 });
      const dx =
        fromFacing.x + (toFacing.x - fromFacing.x) * progress - originIso.x;
      const dy =
        fromFacing.y + (toFacing.y - fromFacing.y) * progress - originIso.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      sketch.stroke('#111827');
      sketch.strokeWeight(5);
      sketch.line(
        center.x,
        bodyY,
        center.x + (dx / length) * 17,
        bodyY + (dy / length) * 17,
      );
      sketch.stroke('#ffffff');
      sketch.strokeWeight(2.5);
      sketch.line(
        center.x,
        bodyY,
        center.x + (dx / length) * 17,
        bodyY + (dy / length) * 17,
      );
    }
    if (shot && shotTick && !shotTick.done) {
      const head = {
        x: shot.from.x + (shot.to.x - shot.from.x) * shotProgress,
        y: shot.from.y + (shot.to.y - shot.from.y) * shotProgress - 12,
      };
      const tail = {
        x:
          shot.from.x +
          (shot.to.x - shot.from.x) * Math.max(0, shotProgress - 0.22),
        y:
          shot.from.y +
          (shot.to.y - shot.from.y) * Math.max(0, shotProgress - 0.22) -
          12,
      };
      sketch.stroke('#fff4c4');
      sketch.strokeWeight(3.5);
      sketch.line(tail.x, tail.y, head.x, head.y);
      sketch.noStroke();
      sketch.fill('#ffe27a');
      sketch.circle(head.x, head.y, 7);
    }
    sketch.pop();
  }

  dispose(): void {
    this.#disposed = true;
    this.#finishMotion();
    this.#events.abort();
    this.#observer.disconnect();
    this.#p5.remove();
  }
}
