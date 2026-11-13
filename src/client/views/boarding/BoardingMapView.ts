import { boardingSmokeParticles } from './BoardingSmokeParticles.js';
import smokeOneUrl from '../../assets/boarding/smoke-1.png';
import smokeTwoUrl from '../../assets/boarding/smoke-2.png';
import smokeThreeUrl from '../../assets/boarding/smoke-3.png';
import {
  BoardingCameraController,
  type BoardingCameraBounds,
  type BoardingCameraSnapshot,
  type BoardingCameraSubject,
  type BoardingCameraTransition,
} from './BoardingCameraController.js';
import { BoardingLighting } from './BoardingLighting.js';
import { BoardingLightPainter } from './BoardingLightPainter.js';
import p5 from 'p5';
import {
  BOARDING_GROUND_RATIO,
  BOARDING_METERS,
  BOARDING_VERTICAL_METER,
  boardingHeight,
} from './BoardingScale.js';
import {
  BoardingWallVisibility,
  boardingDepthOrder,
} from './BoardingWallVisibility.js';
import {
  boardingTerrainShowsFloor,
  boardingThinNeighbor,
  boardingThinOutsideTerrain,
  type BoardingMap,
  type BoardingCell,
  type BoardingThinAxis,
} from '../../models/boarding/BoardingMap.js';
import {
  boardingActionPointsRemaining,
  type BoardingBattleState,
  type BoardingFeature,
  type BoardingPerson,
  type BoardingTargetIndicator,
} from '../../models/boarding/BoardingBattle.js';
import type { BoardingPathMark } from '../../models/boarding/BoardingPathPreview.js';
import type { BoardingMapPort } from './BoardingView.js';
import {
  BOARDING_OBJECT_IMAGES,
  boardingObjectArtwork,
  boardingObjectBounds,
  type BoardingArtwork,
} from './BoardingObjectArtwork.js';
import {
  BOARDING_FLOOR_IMAGES,
  BOARDING_WALL_IMAGES,
  BOARDING_WALL_TOP_IMAGE,
  boardingSurfaceStyle,
  boardingWallFaceStyle,
  type BoardingSurfaceStyle,
} from './BoardingSurfaceArtwork.js';
import factionSpritesUrl from '../../assets/boarding/characters/directional-faction-sprites.webp';
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
  BOARDING_HALF_TILE_WIDTH,
  BOARDING_HALF_TILE_HEIGHT,
  boardingAnimTick,
  boardingProjectilePoint,
  boardingCellFromIsoPoint,
  boardingFeatureFootprint,
  boardingFeatureGlyph,
  boardingFeatureHeight,
  boardingIsoBlockFaces,
  boardingIsoCamera,
  boardingIsoCenter,
  boardingIsoCorners,
  boardingWallRun,
  type BoardingPoint as Point,
} from './BoardingProjection.js';
import {
  paintIsoFloor,
  paintIsoThinWall,
  paintIsoWall,
  paintThinWallFloors,
  type IsoImageCache,
} from './BoardingSurfacePainter.js';

const key = (position: BoardingCell): string => `${position.q},${position.r}`;
/** Keeps the cached floor layer within mobile canvas memory limits. */
const FLOOR_LAYER_MAX_SIDE = 3072;

const characterPose = (person: BoardingPerson): BoardingCharacterPose =>
  person.status === 'active'
    ? person.crouched
      ? 'crouched'
      : 'standing'
    : 'incapacitated';

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

/** isometri-3-2-i-bordning: floor ellipses were sized for a 2:1 ground diamond. */
function groundEllipse(depthAt2to1: number): number {
  return depthAt2to1 * 2 * BOARDING_GROUND_RATIO;
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
  #floorLayer: {
    graphics: p5.Graphics;
    signature: string;
    resolution: number;
  } | null = null;
  #floorBoundsCache: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null;
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
    kind?: 'grenade';
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
  readonly #floorTiles = new Map<BoardingSurfaceStyle, p5.Image>();
  readonly #wallTiles = new Map<BoardingSurfaceStyle, p5.Image>();
  #wallTop: p5.Image | null = null;
  readonly #isoCaches = new WeakMap<p5.Image, IsoImageCache>();
  #factionSprites: p5.Image | null = null;
  readonly #smokeTextures: (p5.Image | null)[] = [null, null, null];
  #lighting: BoardingLighting;
  #lightSignature = '';
  readonly #lightPainter = new BoardingLightPainter();
  #wallVisibility = new BoardingWallVisibility([]);
  #wallPositions: readonly (BoardingCell & {
    axis?: BoardingThinAxis;
    low?: boolean;
  })[] = [];
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
        for (const [style, url] of Object.entries(BOARDING_FLOOR_IMAGES) as [
          BoardingSurfaceStyle,
          string,
        ][]) {
          void sketch.loadImage(url).then((image) => {
            this.#floorTiles.set(style, image);
            if (!this.#disposed && this.#ready) void this.#p5.redraw();
          });
        }
        for (const [style, url] of Object.entries(BOARDING_WALL_IMAGES) as [
          BoardingSurfaceStyle,
          string,
        ][]) {
          void sketch.loadImage(url).then((image) => {
            this.#wallTiles.set(style, image);
            if (!this.#disposed && this.#ready) void this.#p5.redraw();
          });
        }
        void sketch.loadImage(BOARDING_WALL_TOP_IMAGE).then((image) => {
          this.#wallTop = image;
          if (!this.#disposed && this.#ready) void this.#p5.redraw();
        });
        [smokeOneUrl, smokeTwoUrl, smokeThreeUrl].forEach((url, index) => {
          void sketch.loadImage(url).then((image) => {
            this.#smokeTextures[index] = image;
            if (!this.#disposed && this.#ready) void this.#p5.redraw();
          });
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
    if (this.#ready) {
      if (state.smokeCells.length) this.#p5.loop();
      else void this.#p5.redraw();
    }
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
    const subjects = [from, to].map((cell) => {
      const person = state.people.find(
        (entry) =>
          entry.status === 'active' && key(entry.position) === key(cell),
      );
      if (person) return this.#cameraSubject(person);
      if (!state.visibleCells.some((visible) => key(visible) === key(cell)))
        return null;
      const center = boardingIsoCenter(cell);
      return { x: center.x - 18, y: center.y - 65, width: 36, height: 70 };
    });
    if (subjects.some((subject) => !subject)) return Promise.resolve();
    return this.#playCamera(
      this.#camera.frame(
        this.cameraSnapshot,
        subjects as BoardingCameraSubject[],
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

  playShot(
    from: BoardingCell,
    to: BoardingCell,
    kind?: 'grenade',
  ): Promise<void> {
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
      const duration = kind === 'grenade' ? 850 : 600;
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
        to: kind === 'grenade' ? boardingIsoCenter(to) : weaponPoint(to),
        ...(kind ? { kind } : {}),
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
    if (this.#ready && !this.#disposed && !this.#state?.smokeCells.length)
      this.#p5.noLoop();
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
      [...known.values()].filter((cell) =>
        boardingTerrainShowsFloor(this.map.terrainAt(cell)),
      ),
    );
    this.#wallPositions = state.features
      .filter(
        (feature) =>
          !feature.destroyed &&
          (feature.kind === 'hull' ||
            ((feature.kind === 'wall' || feature.kind === 'thin-wall') &&
              known.has(key(feature.position)))),
      )
      .map((feature) => ({
        ...feature.position,
        ...(feature.kind === 'thin-wall' && feature.axis
          ? { axis: feature.axis, low: feature.low === true }
          : {}),
      }));
  }

  #updateLighting(state: BoardingBattleState): void {
    const signature = BoardingLighting.signature(state);
    if (signature === this.#lightSignature) return;
    this.#lightSignature = signature;
    this.#lighting = new BoardingLighting(this.map, state);
    this.#lightPainter.clear();
  }

  /**
   * bordning-jamn-bildfrekvens: floors, light masks and fog only change with
   * sight, lighting, loaded artwork or a large zoom step, so they are painted
   * once into an offscreen layer and blitted on every frame.
   */
  #paintFloorLayer(
    sketch: p5,
    visible: ReadonlySet<string>,
    explored: ReadonlySet<string>,
    thinAt: ReadonlyMap<string, BoardingFeature>,
    seen: (cell: BoardingCell) => boolean,
  ): void {
    const bounds = this.#floorBounds();
    const density = sketch.pixelDensity();
    const wanted = this.#scale * density;
    const largest = Math.max(bounds.width, bounds.height);
    const resolution = Math.min(
      // Half-octave steps rebuild the layer only on noticeable zoom changes.
      2 ** (Math.ceil(Math.log2(Math.max(wanted, 0.125)) * 2) / 2),
      FLOOR_LAYER_MAX_SIDE / largest,
    );
    const signature = [
      this.#lightSignature,
      [...visible].join(';'),
      [...explored].join(';'),
      this.#floorTiles.size,
      resolution,
    ].join('|');
    if (this.#floorLayer?.signature !== signature) {
      const width = Math.ceil(bounds.width * resolution);
      const height = Math.ceil(bounds.height * resolution);
      let layer = this.#floorLayer?.graphics;
      if (!layer || layer.width !== width || layer.height !== height) {
        layer?.remove();
        layer = sketch.createGraphics(width, height);
        layer.pixelDensity(1);
      }
      layer.clear();
      layer.push();
      layer.scale(resolution);
      layer.translate(-bounds.x, -bounds.y);
      this.#paintFloors(layer, visible, explored, thinAt, seen);
      layer.pop();
      this.#floorLayer = { graphics: layer, signature, resolution };
    }
    const canvas = (
      this.#floorLayer.graphics as unknown as { elt: HTMLCanvasElement }
    ).elt;
    (sketch.drawingContext as CanvasRenderingContext2D).drawImage(
      canvas,
      bounds.x,
      bounds.y,
      canvas.width / this.#floorLayer.resolution,
      canvas.height / this.#floorLayer.resolution,
    );
  }

  #floorBounds(): { x: number; y: number; width: number; height: number } {
    if (this.#floorBoundsCache) return this.#floorBoundsCache;
    let left = Infinity,
      right = -Infinity,
      top = Infinity,
      bottom = -Infinity;
    for (let r = 0; r < this.map.height; r++)
      for (let q = 0; q < this.map.width; q++)
        for (const corner of boardingIsoCorners({ q, r })) {
          left = Math.min(left, corner.x);
          right = Math.max(right, corner.x);
          top = Math.min(top, corner.y);
          bottom = Math.max(bottom, corner.y);
        }
    const margin = 4;
    this.#floorBoundsCache = {
      x: left - margin,
      y: top - margin,
      width: right - left + margin * 2,
      height: bottom - top + margin * 2,
    };
    return this.#floorBoundsCache;
  }

  #paintFloors(
    sketch: p5,
    visible: ReadonlySet<string>,
    explored: ReadonlySet<string>,
    thinAt: ReadonlyMap<string, BoardingFeature>,
    seen: (cell: BoardingCell) => boolean,
  ): void {
    for (let r = 0; r < this.map.height; r++) {
      for (let q = 0; q < this.map.width; q++) {
        const position = { q, r };
        const terrain = this.map.terrainAt(position);
        if (!terrain) continue;
        const current = visible.has(key(position));
        const remembered = explored.has(key(position));
        const knownHull = terrain === 'hull';
        const thin = thinAt.get(key(position));
        if (thin?.axis && (current || remembered)) {
          this.#paintThinFloors(sketch, position, thin.axis, seen);
          continue;
        }
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
      }
    }
  }

  #paintFloor(sketch: p5, position: BoardingCell): boolean {
    const tile =
      this.#floorTiles.get(
        boardingSurfaceStyle((cell) => this.map.roomAt(cell), position),
      ) ?? this.#floorTiles.get('default');
    return !!tile && paintIsoFloor(sketch, tile, this.#cache(tile), position);
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

  /**
   * bordning-jamn-bildfrekvens: p5's tint() recolours the whole source image
   * into a scratch canvas on every call, which for the character atlas costs
   * far more than the sprite itself. A canvas filter darkens just the slice.
   */
  #paintLit(
    sketch: p5,
    image: p5.Image,
    light: number,
    alpha: number,
    destination: { x: number; y: number; width: number; height: number },
    source: { x: number; y: number; width: number; height: number } = {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    },
  ): void {
    const element = image as p5.Image & {
      canvas?: HTMLCanvasElement;
      elt?: HTMLImageElement;
    };
    const canvas = element.canvas ?? element.elt;
    if (!canvas) return;
    const density = image.width > 0 ? canvas.width / image.width : 1;
    const context = sketch.drawingContext as CanvasRenderingContext2D;
    context.save();
    const brightness = Math.max(0, Math.min(1, light));
    if (brightness < 1) context.filter = `brightness(${brightness})`;
    if (alpha < 1) context.globalAlpha *= Math.max(0, alpha);
    context.drawImage(
      canvas,
      source.x * density,
      source.y * density,
      source.width * density,
      source.height * density,
      destination.x,
      destination.y,
      destination.width,
      destination.height,
    );
    context.restore();
  }

  #cache(image: p5.Image): IsoImageCache {
    let cache = this.#isoCaches.get(image);
    if (!cache) {
      cache = { floor: null, wall: null };
      this.#isoCaches.set(image, cache);
    }
    return cache;
  }

  #paintWall(
    sketch: p5,
    position: BoardingCell,
    selected: boolean,
    walls: ReadonlySet<string>,
    known: (position: BoardingCell) => boolean,
  ): void {
    const roomAt = (cell: BoardingCell) =>
      known(cell) && boardingTerrainShowsFloor(this.map.terrainAt(cell))
        ? this.map.roomAt(cell)
        : null;
    const tile = this.#wallTiles.get('default');
    const height = this.#wallVisibility.height(position);
    const cutaway = height < boardingFeatureHeight('wall');
    const faces = boardingIsoBlockFaces(
      boardingIsoCenter(position),
      BOARDING_HALF_TILE_WIDTH,
      BOARDING_HALF_TILE_HEIGHT,
      height,
    );
    const option = (image: p5.Image | undefined | null) =>
      image ? { tile: image, cache: this.#cache(image) } : undefined;
    const painted =
      tile &&
      paintIsoWall(sketch, tile, this.#cache(tile), position, walls, height, {
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
      });
    if (!painted) {
      this.#block(
        sketch,
        boardingIsoCenter(position),
        BOARDING_HALF_TILE_WIDTH,
        BOARDING_HALF_TILE_HEIGHT,
        height,
        '#52657f',
      );
    }
    if (cutaway && !this.#wallTop)
      this.#paintWallSection(sketch, faces.top, walls, position);
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

  #floorTile(position: BoardingCell): p5.Image | null {
    return (
      this.#floorTiles.get(
        boardingSurfaceStyle((cell) => this.map.roomAt(cell), position),
      ) ??
      this.#floorTiles.get('default') ??
      null
    );
  }

  /** tunna-innervaggar: split the cell into this floor, the slab and the faced floor. */
  #paintThinFloors(
    sketch: p5,
    position: BoardingCell,
    axis: BoardingThinAxis,
    known: (cell: BoardingCell) => boolean,
  ): void {
    const neighbor = boardingThinNeighbor(position, axis);
    const floors = paintThinWallFloors(sketch, position, axis, {
      cache: (image) => this.#cache(image),
      floorAt: (cell) => this.#floorTile(cell),
      showsOutside:
        boardingThinOutsideTerrain(
          (cell) => this.map.terrainAt(cell),
          position,
          axis,
        ) !== null,
      outsideKnown: known(neighbor),
    });
    const context = sketch.drawingContext as CanvasRenderingContext2D;
    const light = this.#lighting.tile(position);
    const values = [light, light, light, light];
    this.#lightPainter.paint(context, floors.inside, values);
    if (floors.outside)
      this.#lightPainter.paint(context, floors.outside, values);
  }

  /** tunna-innervaggar / halvhog-tunn-vagg: full thin walls cut away; low walls stay at 1.2 m. */
  #paintThinWall(
    sketch: p5,
    position: BoardingCell,
    axis: BoardingThinAxis,
    low: boolean,
    selected: boolean,
    peers: ReadonlySet<string>,
    known: (cell: BoardingCell) => boolean,
  ): void {
    const height = this.#wallVisibility.height(position, { axis, low });
    const roomAt = (cell: BoardingCell) =>
      known(cell) && boardingTerrainShowsFloor(this.map.terrainAt(cell))
        ? this.map.roomAt(cell)
        : null;
    const faced =
      boardingThinOutsideTerrain(
        (cell) => this.map.terrainAt(cell),
        position,
        axis,
      ) !== null
        ? boardingThinNeighbor(position, axis)
        : position;
    const tile = this.#wallTiles.get('default');
    const option = (image: p5.Image | undefined | null) =>
      image ? { tile: image, cache: this.#cache(image) } : undefined;
    const mesh = paintIsoThinWall(
      sketch,
      tile ?? null,
      tile ? this.#cache(tile) : { floor: null, wall: null },
      position,
      axis,
      peers,
      height,
      {
        face: option(this.#wallTiles.get(boardingSurfaceStyle(roomAt, faced))),
        top: option(this.#wallTop),
        section:
          !low && height < boardingFeatureHeight('wall') && !this.#wallTop,
      },
    );
    const context = sketch.drawingContext as CanvasRenderingContext2D;
    const meters = height / BOARDING_VERTICAL_METER;
    const longFace = axis === 'q' ? 'southEast' : 'southWest';
    const endFace = axis === 'q' ? 'southWest' : 'southEast';
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
    if (selected) {
      sketch.noStroke();
      sketch.fill(244, 207, 90, 72);
      sketch.beginShape();
      for (const point of mesh.top) sketch.vertex(point.x, point.y);
      sketch.endShape(sketch.CLOSE);
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
    this.#paintLit(sketch, image, light, 1, boardingObjectBounds(name, center));
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
    if (
      !this.#motion &&
      !this.#shot &&
      !state.smokeCells.length &&
      this.#ready &&
      !this.#disposed
    )
      this.#p5.noLoop();
    const visible = new Set(state.visibleCells.map(key));
    const explored = new Set(state.exploredCells.map(key));
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
    const thinAt = new Map(
      state.features
        .filter((feature) => feature.kind === 'thin-wall' && feature.axis)
        .map((feature) => [key(feature.position), feature] as const),
    );
    const seen = (cell: BoardingCell) =>
      visible.has(key(cell)) || explored.has(key(cell));
    this.#paintFloorLayer(sketch, visible, explored, thinAt, seen);
    for (let r = 0; r < this.map.height; r++) {
      for (let q = 0; q < this.map.width; q++) {
        const position = { q, r };
        if (!this.map.terrainAt(position)) continue;
        if (fire.has(key(position))) {
          sketch.noStroke();
          sketch.fill(98, 212, 138, 115);
          this.#tile(sketch, position);
        } else if (reach.has(key(position))) {
          sketch.noStroke();
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
      }
    }
    const scene: { depth: number; order: number; paint: () => void }[] = [];
    const overlays: (() => void)[] = [];
    for (const position of state.smokeCells) {
      if (!visible.has(key(position)) && !explored.has(key(position))) continue;
      const center = boardingIsoCenter(position);
      scene.push({
        depth: center.y + 1,
        order: 5,
        paint: () => {
          for (const particle of boardingSmokeParticles(position, now)) {
            const texture = this.#smokeTextures[particle.texture];
            if (!texture) continue;
            this.#paintLit(sketch, texture, 1, particle.opacity / 255, {
              x: center.x + particle.x - particle.size / 2,
              y: center.y + particle.y - particle.height / 2,
              width: particle.size,
              height: particle.height,
            });
          }
        },
      });
    }

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
    const thinPeers = {
      q: new Set<string>(),
      r: new Set<string>(),
      lowQ: new Set<string>(),
      lowR: new Set<string>(),
    };
    for (const feature of state.features) {
      if (feature.kind !== 'thin-wall' || feature.destroyed || !feature.axis)
        continue;
      const peers = feature.low
        ? feature.axis === 'q'
          ? thinPeers.lowQ
          : thinPeers.lowR
        : feature.axis === 'q'
          ? thinPeers.q
          : thinPeers.r;
      peers.add(key(feature.position));
    }
    // bordning-jamn-bildfrekvens: skip walls and objects wholly off the canvas.
    const margin = BOARDING_HALF_TILE_WIDTH * 3;
    const onCanvas = (point: Point) =>
      point.x * this.#scale + this.#offset.x >= -margin * this.#scale &&
      point.x * this.#scale + this.#offset.x <=
        sketch.width + margin * this.#scale &&
      point.y * this.#scale + this.#offset.y >= -margin * this.#scale &&
      point.y * this.#scale + this.#offset.y <=
        sketch.height + margin * this.#scale * 2;
    for (const feature of state.features) {
      if (feature.kind !== 'hull' && !known(feature.position)) continue;
      const floor = boardingIsoCenter(feature.position);
      if (!onCanvas(floor)) continue;
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
                feature.kind === 'thin-wall' ||
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
                known,
              );
              return;
            }
            if (raised && feature.kind === 'thin-wall' && feature.axis) {
              const peers = feature.low
                ? feature.axis === 'q'
                  ? thinPeers.lowQ
                  : thinPeers.lowR
                : feature.axis === 'q'
                  ? thinPeers.q
                  : thinPeers.r;
              this.#paintThinWall(
                sketch,
                feature.position,
                feature.axis,
                feature.low === true,
                feature.id === this.#selectedId,
                peers,
                known,
              );
              return;
            }
            const artwork = boardingObjectArtwork(feature, (q, r) => {
              const terrain = this.map.terrainAt({ q, r });
              return (
                terrain === 'wall' ||
                terrain === 'hull' ||
                terrain === 'thin-wall' ||
                terrain === 'low-thin-wall'
              );
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
          sketch.ellipse(
            center.x,
            center.y + BOARDING_FOOT_PLANT,
            25,
            groundEllipse(9),
          );
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
              groundEllipse(13),
            );
          } else if (person.id === this.#selectedId) {
            sketch.noFill();
            sketch.stroke('#f4cf5a');
            sketch.strokeWeight(3);
            sketch.ellipse(
              center.x,
              center.y + BOARDING_FOOT_PLANT - 1,
              36,
              groundEllipse(16),
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
            const [shade, alpha] =
              person.status === 'dead'
                ? [100 / 255, 115 / 255]
                : person.status === 'incapacitated'
                  ? [190 / 255, 175 / 255]
                  : [1, 1];
            if (sprite.mirrored) {
              sketch.translate(center.x * 2, 0);
              sketch.scale(-1, 1);
            }
            this.#paintLit(
              sketch,
              this.#factionSprites,
              shade * light,
              alpha,
              sprite.destination,
              sprite.source,
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
            else sketch.ellipse(center.x, center.y, 35, groundEllipse(14));
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
    if (shot && shotTick) {
      const head = boardingProjectilePoint(
        shot.from,
        shot.to,
        shotProgress,
        shot.kind,
      );
      if (shot.kind === 'grenade') {
        sketch.noStroke();
        sketch.fill('#141f24');
        sketch.circle(head.x, head.y, 11);
        sketch.fill('#e5c35a');
        sketch.circle(head.x, head.y, 5);
      } else {
        const tail = boardingProjectilePoint(
          shot.from,
          shot.to,
          Math.max(0, shotProgress - 0.22),
        );
        sketch.stroke('#fff4c4');
        sketch.strokeWeight(3.5);
        sketch.line(tail.x, tail.y, head.x, head.y);
        sketch.noStroke();
        sketch.fill('#ffe27a');
        sketch.circle(head.x, head.y, 7);
      }
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
    this.#floorLayer?.graphics.remove();
    this.#floorLayer = null;
    this.#p5.remove();
  }
}
