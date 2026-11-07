import {
  BoardingCameraController,
  type BoardingCameraBounds,
  type BoardingCameraSnapshot,
  type BoardingCameraSubject,
  type BoardingCameraTransition,
} from '../controllers/BoardingCameraController.js';
import { BoardingLighting } from './BoardingLighting.js';
import { BoardingLightPainter } from './BoardingLightPainter.js';
import p5 from 'p5';
import { BOARDING_METERS, boardingHeight } from './BoardingScale.js';
import {
  BoardingWallVisibility,
  boardingDepthOrder,
} from './BoardingWallVisibility.js';
import type { BoardingMap, BoardingCell } from '../models/BoardingMap.js';
import {
  boardingActionPointsRemaining,
  type BoardingBattleState,
  type BoardingPerson,
  type BoardingTargetIndicator,
} from '../models/BoardingBattle.js';
import type { BoardingPathMark } from '../models/BoardingPathPreview.js';
import type { BoardingMapPort } from './BoardingView.js';
import airlockUrl from '../assets/boarding/airlock.webp';
import reactorUrl from '../assets/boarding/reactor.webp';
import halfCoverUrl from '../assets/boarding/half-cover.webp';
import doorClosedQUrl from '../assets/boarding/door-closed-q.webp';
import doorOpenQUrl from '../assets/boarding/door-open-q.webp';
import doorClosedRUrl from '../assets/boarding/door-closed-r.webp';
import doorOpenRUrl from '../assets/boarding/door-open-r.webp';
import {
  boardingObjectArtwork,
  boardingObjectBounds,
  type BoardingArtwork,
} from './BoardingObjectArtwork.js';
import floorTileUrl from '../assets/boarding/floor-tile.png';
import wallTileUrl from '../assets/boarding/wall-tile.png';
import factionSpritesUrl from '../assets/boarding/characters/directional-faction-sprites.webp';
import {
  BOARDING_FOOT_PLANT,
  boardingCharacterAtPoint,
  boardingCharacterSprite,
  type BoardingCharacterPose,
} from './BoardingCharacterSprite.js';
import {
  boardingEdgeTargetIndicators,
  boardingScreenRectangleVisible,
  type BoardingEdgeTargetIndicator,
} from './BoardingTargetIndicatorLayout.js';
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

const characterPose = (person: BoardingPerson): BoardingCharacterPose =>
  person.status === 'active'
    ? person.crouched
      ? 'crouched'
      : 'standing'
    : 'incapacitated';

const BOARDING_OBJECT_IMAGES: Readonly<Record<BoardingArtwork, string>> = {
  airlock: airlockUrl,
  reactor: reactorUrl,
  'half-cover': halfCoverUrl,
  'door-closed-q': doorClosedQUrl,
  'door-open-q': doorOpenQUrl,
  'door-closed-r': doorClosedRUrl,
  'door-open-r': doorOpenRUrl,
};

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
  #targets: readonly BoardingTargetIndicator[] = [];
  #edgeTargetHits: readonly BoardingEdgeTargetIndicator[] = [];
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
  readonly #camera = new BoardingCameraController();
  #viewportProvider: (() => BoardingCameraBounds | null) | undefined;
  #cameraAnimation: { cancel: () => void } | null = null;
  #cameraVersion = 0;
  #presenting = false;
  #cameraSuppressed = false;
  #scale = 1;
  #offset: Point = { x: 0, y: 0 };
  #floorTile: p5.Image | null = null;
  #floorSource: CanvasImageSource | null = null;
  #wallTile: p5.Image | null = null;
  #wallSource: CanvasImageSource | null = null;
  #factionSprites: p5.Image | null = null;
  #lighting: BoardingLighting;
  #lightSignature = '';
  readonly #lightPainter = new BoardingLightPainter();
  #wallVisibility = new BoardingWallVisibility([]);
  #wallPositions: readonly BoardingCell[] = [];
  readonly #objects = new Map<BoardingArtwork, p5.Image>();
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
    select: (
      cell: BoardingCell,
      personId?: string,
      mode?: 'center-target',
    ) => void,
  ) {
    this.#lighting = new BoardingLighting(map, {
      features: [],
      smokeCells: [],
    });
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
          'Isometric boarding map. Tap a destination or enemy, then tap it again to move or fire. Drag to pan, pinch or scroll to zoom.',
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
        for (const [name, url] of Object.entries(BOARDING_OBJECT_IMAGES) as [
          BoardingArtwork,
          string,
        ][]) {
          void sketch
            .loadImage(url)
            .then((image) => {
              if (this.#disposed || !image) return;
              this.#objects.set(name, image);
              if (this.#ready) void this.#p5.redraw();
            })
            .catch(() => undefined);
        }
        this.#bind(canvas, select);
        this.#ready = true;
        this.fit();
      };
      sketch.draw = () => this.#draw(sketch);
    }, container);
    this.#observer = new ResizeObserver(() => {
      if (!this.#ready || this.#disposed) return;
      this.#cancelCamera(true);
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
    targets: readonly BoardingTargetIndicator[] = [],
  ): void {
    const changed = this.#state?.id !== state.id;
    this.#state = state;
    this.#updateLighting(state);
    this.#updateWalls(state);
    this.#selectedId = selectedId;
    this.#destination = destination;
    this.#path = path;
    this.#targets = targets;
    if (changed || this.#fitPending) this.fit();
    if (this.#ready) void this.#p5.redraw();
  }

  fit(): void {
    this.#cancelCamera(true);
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
    this.#cancelCamera(true);
    const next = Math.max(0.08, Math.min(3, this.#scale * factor));
    const ratio = next / this.#scale;
    this.#offset = {
      x: anchor.x - (anchor.x - this.#offset.x) * ratio,
      y: anchor.y - (anchor.y - this.#offset.y) * ratio,
    };
    this.#scale = next;
    if (this.#ready) void this.#p5.redraw();
  }

  get cameraSnapshot(): BoardingCameraSnapshot {
    return Object.freeze({
      scale: this.#scale,
      offset: Object.freeze({ ...this.#offset }),
    });
  }

  setViewportProvider(provider: () => BoardingCameraBounds | null): void {
    this.#viewportProvider = provider;
  }

  beginPresentation(): void {
    this.#presenting = true;
    this.#cameraSuppressed = false;
  }

  endPresentation(): void {
    this.#presenting = false;
    this.#cameraSuppressed = false;
  }

  #cameraBounds(): BoardingCameraBounds {
    return (
      this.#viewportProvider?.() ?? {
        left: 0,
        top: 0,
        right: this.#p5.width,
        bottom: this.#p5.height,
      }
    );
  }

  #cameraSubject(person: BoardingPerson): BoardingCameraSubject {
    const center = boardingIsoCenter(person.position);
    const sprite = boardingCharacterSprite(
      person.side,
      center,
      characterPose(person),
      person.facing,
    ).destination;
    const left = Math.min(sprite.x, center.x - 18);
    const right = Math.max(sprite.x + sprite.width, center.x + 18);
    return {
      x: left,
      y: sprite.y - 14,
      width: right - left,
      height: sprite.height + 14,
    };
  }

  focusActor(id: string): Promise<void> {
    this.#cancelCamera();
    const person = this.#state?.people.find(
      (entry) =>
        entry.id === id && entry.side === 'player' && entry.status === 'active',
    );
    return this.#playCamera(
      person
        ? this.#camera.focus(
            this.cameraSnapshot,
            this.#cameraSubject(person),
            this.#cameraBounds(),
          )
        : [],
    );
  }

  #centerTarget(id: string): Promise<void> {
    const person = this.#state?.people.find((entry) => entry.id === id);
    return this.#playCamera(
      person
        ? this.#camera.center(
            this.cameraSnapshot,
            this.#cameraSubject(person),
            this.#cameraBounds(),
          )
        : [],
    );
  }

  frameVisibleMovement(
    from: BoardingBattleState,
    to: BoardingBattleState,
  ): Promise<void> {
    if (this.#cameraSuppressed) return Promise.resolve();
    const subjects = this.#camera
      .movementSubjects(this.map, from, to)
      .map((person) => this.#cameraSubject(person));
    return this.#playCamera(
      this.#camera.overview(
        this.cameraSnapshot,
        subjects,
        this.#cameraBounds(),
      ),
    );
  }

  frameShot(from: BoardingCell, to: BoardingCell): Promise<void> {
    if (this.#cameraSuppressed) return Promise.resolve();
    const state = this.#state;
    if (!state) return Promise.resolve();
    const combatants = [from, to]
      .map((cell) =>
        state.people.find(
          (person) =>
            person.status === 'active' && key(person.position) === key(cell),
        ),
      )
      .filter((person): person is BoardingPerson => !!person);
    // kameraoverblick-fore-bordningsskott: the visible snapshot prevents camera framing from revealing hidden enemies.
    if (combatants.length !== 2) return Promise.resolve();
    return this.#playCamera(
      this.#camera.frame(
        this.cameraSnapshot,
        combatants.map((person) => this.#cameraSubject(person)),
        this.#cameraBounds(),
      ),
    );
  }

  #applyCamera(snapshot: BoardingCameraSnapshot): void {
    this.#scale = snapshot.scale;
    this.#offset = snapshot.offset;
    if (this.#ready && !this.#disposed) void this.#p5.redraw();
  }

  #cancelCamera(manual = false): void {
    this.#cameraVersion++;
    if (manual && this.#presenting) this.#cameraSuppressed = true;
    this.#cameraAnimation?.cancel();
    this.#cameraAnimation = null;
  }

  async #playCamera(
    phases: readonly BoardingCameraTransition[],
  ): Promise<void> {
    if (
      !this.#ready ||
      this.#disposed ||
      this.#cameraSuppressed ||
      !phases.length
    )
      return;
    this.#cancelCamera();
    const version = this.#cameraVersion;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.#applyCamera(phases.at(-1)!.to);
      return;
    }
    for (const phase of phases) {
      if (version !== this.#cameraVersion) return;
      const completed = await this.#playCameraPhase(phase);
      if (!completed) return;
    }
  }

  #playCameraPhase(phase: BoardingCameraTransition): Promise<boolean> {
    return new Promise((resolve) => {
      const started = performance.now();
      let frame = 0;
      let settled = false;
      const finish = (completed: boolean) => {
        if (settled) return;
        settled = true;
        cancelAnimationFrame(frame);
        clearTimeout(timer);
        this.#cameraAnimation = null;
        resolve(completed);
      };
      const tick = (now: number) => {
        if (settled) return;
        const progress = Math.min(1, (now - started) / phase.duration);
        this.#applyCamera(this.#camera.sample(phase, progress));
        if (progress >= 1) finish(true);
        else frame = requestAnimationFrame(tick);
      };
      this.#cameraAnimation = { cancel: () => finish(false) };
      // Finish even when background tabs throttle requestAnimationFrame.
      const timer = setTimeout(() => {
        this.#applyCamera(phase.to);
        finish(true);
      }, phase.duration + 80);
      frame = requestAnimationFrame(tick);
    });
  }

  playMotion(
    from: BoardingBattleState,
    to: BoardingBattleState,
  ): Promise<void> {
    this.#finishMotion();
    this.#state = to;
    this.#updateLighting(to);
    this.#updateWalls(to);
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
      const weaponPoint = (cell: BoardingCell): Point => {
        const person = this.#state?.people.find(
          (entry) =>
            key(entry.position) === key(cell) && entry.status === 'active',
        );
        const point = boardingIsoCenter(cell);
        return {
          x: point.x,
          y:
            point.y +
            BOARDING_FOOT_PLANT -
            boardingHeight(
              person?.crouched
                ? BOARDING_METERS.crouchedRifle
                : BOARDING_METERS.rifle,
            ),
        };
      };
      this.#shot = {
        from: weaponPoint(from),
        to: weaponPoint(to),
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
    select: (
      cell: BoardingCell,
      personId?: string,
      mode?: 'center-target',
    ) => void,
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
            this.#cancelCamera(true);
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
          const edgeTarget = this.#edgeTargetHits.find(
            (entry) =>
              position.x >= entry.hitBounds.left &&
              position.x <= entry.hitBounds.right &&
              position.y >= entry.hitBounds.top &&
              position.y <= entry.hitBounds.bottom,
          );
          const edgePerson = edgeTarget
            ? this.#state?.people.find((entry) => entry.id === edgeTarget.id)
            : undefined;
          if (edgeTarget && edgePerson) {
            select(edgePerson.position, edgePerson.id, 'center-target');
            void this.#centerTarget(edgePerson.id);
            this.#pointers.delete(event.pointerId);
            this.#start = null;
            return;
          }
          const iso = {
            x: (position.x - this.#offset.x) / this.#scale,
            y: (position.y - this.#offset.y) / this.#scale,
          };
          const people = this.#state?.people ?? [];
          const sprite = boardingCharacterAtPoint(
            people
              .filter(
                (person) =>
                  person.status !== 'dead' &&
                  person.status !== 'evacuated' &&
                  (person.side === 'player' ||
                    this.#state!.visibleCells.some(
                      (cell) => key(cell) === key(person.position),
                    )),
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
                  pose: characterPose(person),
                  facing: person.facing,
                };
              }),
            iso,
          );
          const picked =
            sprite &&
            !this.#wallVisibility.blocks(
              iso,
              this.#state!.people.find((person) => person.id === sprite.id)!
                .position,
              this.#wallPositions,
            )
              ? sprite
              : null;
          const cell = picked
            ? this.#state!.people.find((person) => person.id === picked.id)!
                .position
            : boardingCellFromIsoPoint(iso);
          if (this.map.terrainAt(cell)) select(cell, picked?.id);
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

  #updateWalls(state: BoardingBattleState): void {
    const known = new Map(
      [...state.exploredCells, ...state.visibleCells].map((cell) => [
        key(cell),
        cell,
      ]),
    );
    this.#wallVisibility = new BoardingWallVisibility(
      [...known.values()].filter(
        (cell) => this.map.terrainAt(cell) === 'floor',
      ),
    );
    this.#wallPositions = state.features
      .filter(
        (feature) =>
          !feature.destroyed &&
          (feature.kind === 'hull' ||
            (feature.kind === 'wall' && known.has(key(feature.position)))),
      )
      .map((feature) => feature.position);
  }

  #updateLighting(state: BoardingBattleState): void {
    const signature = BoardingLighting.signature(state);
    if (signature === this.#lightSignature) return;
    this.#lightSignature = signature;
    this.#lighting = new BoardingLighting(this.map, state);
    this.#lightPainter.clear();
  }

  #paintFloor(sketch: p5, position: BoardingCell): boolean {
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
    visibleFraction = 1,
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
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(
      source,
      slice.x,
      textureHeight * (1 - visibleFraction),
      slice.width,
      textureHeight * visibleFraction,
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
    selected: boolean,
    walls: ReadonlySet<string>,
  ): void {
    const tile = this.#wallTile;
    const source =
      tile && tile.width >= 8 && tile.height >= 2
        ? this.#imageSource(tile, 'wall')
        : null;
    const height = this.#wallVisibility.height(position);
    const cutaway = height < boardingFeatureHeight('wall');
    const faces = boardingIsoBlockFaces(
      boardingIsoCenter(position),
      32,
      16,
      height,
    );
    if (source && tile) {
      const alongQ = boardingWallRun(walls, position, 'q');
      const alongR = boardingWallRun(walls, position, 'r');
      const qSlice = boardingWallSlice(tile.width, alongQ.index);
      const rSlice = boardingWallSlice(tile.width, alongR.index);
      this.#paintTexturedQuad(
        sketch,
        source,
        rSlice,
        tile.height,
        faces.southEast[0],
        faces.southEast[1],
        faces.southEast[3],
        faces.southEast,
        height / boardingFeatureHeight('wall'),
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
        height / boardingFeatureHeight('wall'),
      );
      if (!cutaway)
        this.#paintTexturedQuad(
          sketch,
          source,
          alongQ.length >= alongR.length ? qSlice : rSlice,
          tile.height,
          faces.top[0],
          alongQ.length >= alongR.length ? faces.top[1] : faces.top[3],
          alongQ.length >= alongR.length ? faces.top[3] : faces.top[1],
          faces.top,
        );
    } else {
      this.#block(
        sketch,
        boardingIsoCenter(position),
        32,
        16,
        height,
        '#52657f',
      );
    }
    if (cutaway) this.#paintWallSection(sketch, faces.top, walls, position);
    const context = sketch.drawingContext as CanvasRenderingContext2D;
    for (const face of ['southEast', 'southWest', 'top'] as const)
      this.#lightPainter.paint(
        context,
        faces[face],
        this.#lighting.surface(position, face, height / boardingHeight(1)),
      );
    if (selected) {
      sketch.noStroke();
      sketch.fill(244, 207, 90, 72);
      sketch.quad(
        ...(faces.top.flatMap((point) => [point.x, point.y]) as [
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
        ]),
      );
    }
  }

  /** genomskinliga-skymmande-vaggar: exposed core distinguishes a cut from Half cover. */
  #paintWallSection(
    sketch: p5,
    top: readonly Point[],
    walls: ReadonlySet<string>,
    position: BoardingCell,
  ): void {
    const center = {
      x: (top[0]!.x + top[2]!.x) / 2,
      y: (top[0]!.y + top[2]!.y) / 2,
    };
    const quad = (points: readonly Point[]) =>
      sketch.quad(
        ...(points.flatMap((point) => [point.x, point.y]) as [
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
        ]),
      );
    sketch.noStroke();
    sketch.fill('#b1becb');
    quad(top);
    const inner = top.map((point) => ({
      x: center.x + (point.x - center.x) * 0.76,
      y: center.y + (point.y - center.y) * 0.76,
    }));
    sketch.fill('#303c48');
    quad(inner);
    const alongQ = boardingWallRun(walls, position, 'q');
    const alongR = boardingWallRun(walls, position, 'r');
    const along = alongQ.length >= alongR.length;
    const a = inner[along ? 0 : 1]!,
      b = inner[along ? 1 : 2]!,
      d = inner[along ? 3 : 0]!;
    sketch.stroke('#7c8b9b');
    sketch.strokeWeight(1.5);
    for (const fraction of [0.25, 0.75]) {
      const x = a.x + (b.x - a.x) * fraction,
        y = a.y + (b.y - a.y) * fraction;
      sketch.line(x, y, x + d.x - a.x, y + d.y - a.y);
    }
    sketch.noStroke();
  }

  #paintObject(
    sketch: p5,
    name: BoardingArtwork,
    center: Point,
    light: number,
  ): boolean {
    const image = this.#objects.get(name);
    if (!image) return false;
    const box = boardingObjectBounds(name, center);
    sketch.push();
    sketch.imageMode(sketch.CORNER);
    sketch.tint(255 * light);
    sketch.image(image, box.x, box.y, box.width, box.height);
    sketch.pop();
    return true;
  }

  #paintTargetIndicator(
    sketch: p5,
    position: Point,
    indicator: BoardingTargetIndicator,
    selected: boolean,
    uiScale: number,
    labelSide: 'left' | 'right' = 'right',
  ): void {
    const color =
      indicator.reason || !indicator.affordable
        ? '#a9adb6'
        : selected
          ? '#ffdc70'
          : '#ff9494';
    sketch.noFill();
    sketch.stroke(color);
    sketch.strokeWeight((selected ? 2.5 : 1.2) * uiScale);
    const radius = (selected ? 12 : 8) * uiScale;
    sketch.circle(position.x, position.y, radius * 2);
    for (const sign of [-1, 1]) {
      sketch.line(
        position.x + sign * (radius - 3 * uiScale),
        position.y,
        position.x + sign * (radius + 5 * uiScale),
        position.y,
      );
      sketch.line(
        position.x,
        position.y + sign * (radius - 3 * uiScale),
        position.x,
        position.y + sign * (radius + 5 * uiScale),
      );
    }
    const label = `${indicator.chance}%${indicator.reason ? ' · Blocked' : ''}`;
    sketch.textSize(11 * uiScale);
    sketch.textAlign(sketch.LEFT, sketch.CENTER);
    const width = sketch.textWidth(label) + 10 * uiScale;
    const labelX =
      labelSide === 'right'
        ? position.x + radius + 8 * uiScale
        : position.x - radius - 8 * uiScale - width;
    sketch.noStroke();
    sketch.fill('#101827');
    sketch.rect(
      labelX,
      position.y - 9 * uiScale,
      width,
      18 * uiScale,
      3 * uiScale,
    );
    sketch.fill(color);
    sketch.text(label, labelX + 5 * uiScale, position.y);
  }

  #draw(sketch: p5): void {
    sketch.background('#060914');
    const state = this.#state;
    if (!state) return;
    const viewport = this.#cameraBounds();
    const edgeTargets = boardingEdgeTargetIndicators(
      this.#targets.flatMap((indicator) => {
        const person = state.people.find((entry) => entry.id === indicator.id);
        if (!person) return [];
        const shift = stackOffset(
          state.people,
          person.id,
          this.#selectedId,
          state.currentActorId,
        );
        const floor = boardingIsoCenter(person.position);
        const center = { x: floor.x + shift.x, y: floor.y + shift.y };
        const sprite = boardingCharacterSprite(
          person.side,
          center,
          characterPose(person),
          person.facing,
        ).destination;
        const screenRectangle = {
          left: sprite.x * this.#scale + this.#offset.x,
          right: (sprite.x + sprite.width) * this.#scale + this.#offset.x,
          top: sprite.y * this.#scale + this.#offset.y,
          bottom: (sprite.y + sprite.height) * this.#scale + this.#offset.y,
        };
        if (boardingScreenRectangleVisible(screenRectangle, viewport))
          return [];
        const bodyY =
          center.y +
          BOARDING_FOOT_PLANT -
          boardingHeight(
            person.crouched
              ? BOARDING_METERS.crouchedRifle
              : BOARDING_METERS.rifle,
          );
        return [
          {
            id: person.id,
            x: center.x * this.#scale + this.#offset.x,
            y: bodyY * this.#scale + this.#offset.y,
          },
        ];
      }),
      viewport,
    );
    this.#edgeTargetHits = edgeTargets;
    const edgeTargetIds = new Set(edgeTargets.map((entry) => entry.id));
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
          this.#paintFloor(sketch, position);
        if (!paintedFloor) {
          sketch.stroke('#3c4b65');
          sketch.strokeWeight(1.2);
          if (current || remembered) sketch.fill('#24334a');
          else if (knownHull) sketch.fill('#343d4c');
          else sketch.fill('#080c15');
          this.#tile(sketch, position);
        }
        if (terrain === 'floor' && (current || remembered))
          this.#lightPainter.paint(
            sketch.drawingContext as CanvasRenderingContext2D,
            boardingIsoCorners(position),
            this.#lighting.surface(position, 'floor'),
          );
        if (fire.has(key(position))) {
          sketch.fill(98, 212, 138, 115);
          this.#tile(sketch, position);
        } else if (reach.has(key(position))) {
          sketch.fill(240, 179, 90, 115);
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
    const scene: { depth: number; order: number; paint: () => void }[] = [];
    const overlays: (() => void)[] = [];
    const known = (position: BoardingCell) =>
      visible.has(key(position)) || explored.has(key(position));
    for (const position of this.map.airlocks) {
      if (!known(position)) continue;
      scene.push({
        depth: boardingIsoCenter(position).y,
        order: -1,
        paint: () => {
          this.#paintObject(
            sketch,
            'airlock',
            boardingIsoCenter(position),
            this.#lighting.tile(position),
          );
        },
      });
    }
    const walls = new Set(
      state.features
        .filter(
          (feature) =>
            (feature.kind === 'wall' || feature.kind === 'hull') &&
            !feature.destroyed,
        )
        .map((feature) => key(feature.position)),
    );
    for (const feature of state.features) {
      if (feature.kind !== 'hull' && !known(feature.position)) continue;
      const floor = boardingIsoCenter(feature.position);
      scene.push({
        depth: floor.y,
        order: 0,
        paint: () => {
          const context = sketch.drawingContext as CanvasRenderingContext2D;
          context.save();
          try {
            const raised =
              !feature.destroyed &&
              (feature.kind === 'hull' ||
                feature.kind === 'wall' ||
                (feature.kind === 'door' && !feature.open) ||
                feature.kind === 'cover' ||
                feature.kind === 'reactor');
            if (
              raised &&
              (feature.kind === 'wall' || feature.kind === 'hull')
            ) {
              this.#paintWall(
                sketch,
                feature.position,
                feature.id === this.#selectedId,
                walls,
              );
              return;
            }
            const artwork = boardingObjectArtwork(feature, (q, r) => {
              const terrain = this.map.terrainAt({ q, r });
              return terrain === 'wall' || terrain === 'hull';
            });
            if (
              artwork &&
              this.#paintObject(
                sketch,
                artwork,
                floor,
                this.#lighting.tile(feature.position),
              )
            ) {
              if (feature.kind === 'door' && feature.locked && !feature.open) {
                sketch.textAlign(sketch.CENTER, sketch.CENTER);
                sketch.textSize(12);
                sketch.noStroke();
                sketch.fill('#f4cf5a');
                sketch.text('▣', floor.x, floor.y - boardingHeight(1.5));
              }
              return;
            }
            context.filter = `brightness(${this.#lighting.tile(feature.position)})`;
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
            if (!glyph) return;
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
          } finally {
            context.restore();
          }
        },
      });
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
      if (
        person.status === 'evacuated' ||
        (person.side !== 'player' && !visible.has(key(person.position)))
      )
        continue;
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
      scene.push({
        depth: center.y,
        order: 1,
        paint: () => {
          const bodyY =
            center.y +
            BOARDING_FOOT_PLANT -
            boardingHeight(
              person.crouched
                ? BOARDING_METERS.crouchedRifle
                : BOARDING_METERS.rifle,
            );
          sketch.noStroke();
          sketch.fill(0, 0, 0, 95);
          sketch.ellipse(center.x, center.y + BOARDING_FOOT_PLANT, 25, 9);
          if (
            person.id === state.currentActorId &&
            person.status === 'active'
          ) {
            sketch.noFill();
            sketch.stroke('#f4cf5a');
            sketch.strokeWeight(2.5);
            sketch.ellipse(
              center.x,
              center.y + BOARDING_FOOT_PLANT - 1,
              32,
              13,
            );
          } else if (person.id === this.#selectedId) {
            sketch.noFill();
            sketch.stroke('#f4cf5a');
            sketch.strokeWeight(3);
            sketch.ellipse(
              center.x,
              center.y + BOARDING_FOOT_PLANT - 1,
              36,
              16,
            );
          }
          if (this.#factionSprites) {
            const sprite = boardingCharacterSprite(
              person.side,
              center,
              characterPose(person),
              progress < 0.5 ? origin.facing : target.facing,
            );
            sketch.push();
            const light =
              this.#lighting.tile(origin.position) +
              (this.#lighting.tile(target.position) -
                this.#lighting.tile(origin.position)) *
                progress;
            if (person.status === 'dead') sketch.tint(100 * light, 115);
            else if (person.status === 'incapacitated')
              sketch.tint(190 * light, 175);
            else sketch.tint(255 * light);
            if (sprite.mirrored) {
              sketch.translate(center.x * 2, 0);
              sketch.scale(-1, 1);
            }
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
            const context = sketch.drawingContext as CanvasRenderingContext2D;
            context.save();
            const light =
              this.#lighting.tile(origin.position) +
              (this.#lighting.tile(target.position) -
                this.#lighting.tile(origin.position)) *
                progress;
            context.filter = `brightness(${light})`;
            if (person.status === 'active')
              sketch.circle(center.x, bodyY, person.crouched ? 17 : 21);
            else sketch.ellipse(center.x, center.y, 35, 14);
            context.restore();
          }
          overlays.push(() => {
            const indicator = this.#targets.find(
              (entry) => entry.id === person.id,
            );
            if (indicator && !edgeTargetIds.has(person.id)) {
              // traffchans-vid-synliga-fiender: keep targeting UI readable at mobile fit zoom.
              this.#paintTargetIndicator(
                sketch,
                { x: center.x, y: bodyY },
                indicator,
                person.id === this.#selectedId,
                1 / this.#scale,
              );
            }
            sketch.noStroke();
            const healthY = this.#factionSprites
              ? boardingCharacterSprite(
                  person.side,
                  center,
                  characterPose(person),
                  person.facing,
                ).destination.y - 6
              : bodyY - 18;
            const showAp =
              person.side === 'player' && person.status === 'active';
            if (showAp) {
              const maxAp = Math.max(
                1,
                person.agility + person.equipmentApModifier,
              );
              const remaining = boardingActionPointsRemaining(state, person.id);
              sketch.fill('#111827');
              sketch.rect(center.x - 15, healthY - 7, 30, 5, 2);
              sketch.fill('#f4cf5a');
              sketch.rect(
                center.x - 14,
                healthY - 6,
                (28 * remaining) / maxAp,
                3,
                1,
              );
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
          });
        },
      });
    }
    scene.sort(boardingDepthOrder).forEach((item) => item.paint());
    for (const marker of state.lastKnownEnemies) {
      if (visible.has(key(marker.position))) continue;
      const remembered = state.people.find((person) => person.id === marker.id);
      if (
        !remembered ||
        remembered.status === 'dead' ||
        remembered.status === 'evacuated'
      )
        continue;
      const center = boardingIsoCenter(marker.position);
      const uiScale = 1 / this.#scale;
      sketch.textAlign(sketch.CENTER, sketch.CENTER);
      sketch.textSize(22 * uiScale);
      sketch.stroke('#101827');
      sketch.strokeWeight(4 * uiScale);
      sketch.fill('#e58b5a');
      sketch.text('?', center.x, center.y - 2 * uiScale);
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
    overlays.forEach((paint) => paint());
    if (shot && shotTick && !shotTick.done) {
      const head = {
        x: shot.from.x + (shot.to.x - shot.from.x) * shotProgress,
        y: shot.from.y + (shot.to.y - shot.from.y) * shotProgress,
      };
      const tail = {
        x:
          shot.from.x +
          (shot.to.x - shot.from.x) * Math.max(0, shotProgress - 0.22),
        y:
          shot.from.y +
          (shot.to.y - shot.from.y) * Math.max(0, shotProgress - 0.22),
      };
      sketch.stroke('#fff4c4');
      sketch.strokeWeight(3.5);
      sketch.line(tail.x, tail.y, head.x, head.y);
      sketch.noStroke();
      sketch.fill('#ffe27a');
      sketch.circle(head.x, head.y, 7);
    }
    sketch.pop();
    for (const edge of edgeTargets) {
      const indicator = this.#targets.find((entry) => entry.id === edge.id);
      if (indicator)
        this.#paintTargetIndicator(
          sketch,
          edge,
          indicator,
          edge.id === this.#selectedId,
          1,
          edge.labelSide,
        );
    }
  }

  dispose(): void {
    this.#disposed = true;
    this.#cancelCamera();
    this.#finishMotion();
    this.#events.abort();
    this.#observer.disconnect();
    this.#p5.remove();
  }
}
