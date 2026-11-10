import p5 from 'p5';
import dockingCorridor from '../../assets/map/docking-corridor.webp';
import {
  HexCoordinate,
  HexGeometry,
  type Point,
} from '../../models/HexCoordinate.js';
import {
  battleEscapeHexes,
  battleHex,
  maxHull,
  missileArea,
  SHIP_PROFILES,
  WEAPONS,
  type BattleState,
  type BattleHex,
  type WeaponName,
  type BattleShot,
  type BattleManeuver,
} from '../../models/TacticalBattle.js';
import type { BattleMapPort } from './BattleView.js';
import { SHIP_SPRITES, type ShipSpriteType } from '../ShipImages.js';
import { BattleEffects, type BattleEffectFrame } from './BattleEffects.js';
import { ShipFootprint } from '../../models/battle/ShipFootprint.js';
import {
  BattleCameraController,
  type BattleViewportSnapshot,
} from './BattleCameraController.js';

export class BattleMapView implements BattleMapPort {
  readonly #p5: p5;
  readonly #observer: ResizeObserver;
  readonly #events = new AbortController();
  readonly #images = new Map<string, p5.Image>();
  #corridor: p5.Image | undefined;
  #state: BattleState | null = null;
  #selected: string | null = null;
  #aim: BattleHex | null = null;
  #weapon: WeaponName = 'Cannon';
  #scale = 1;
  #offset: Point = { x: 0, y: 0 };
  #ready = false;
  #disposed = false;
  readonly #camera = new BattleCameraController();
  #focusKey = '';
  #onViewport: (snapshot: BattleViewportSnapshot) => void;
  readonly #pointers = new Map<number, Point>();
  #start: Point | null = null;
  #dragged = false;
  #effect: BattleEffects | null = null;
  #effectFrame: BattleEffectFrame | null = null;
  #animationFrame: number | undefined;
  #animationTimeout: ReturnType<typeof setTimeout> | undefined;
  #finishAnimation: (() => void) | undefined;
  #preview: BattleHex[] = [];
  #targets: readonly BattleHex[] = [];
  #previewPose: { shipId: string; position: BattleHex; facing: number } | null =
    null;
  #pose: {
    shipId: string;
    position: BattleHex;
    facing: number;
  } | null = null;

  setManeuverPreview(hexes: readonly BattleHex[] | null): void {
    this.#preview = hexes ? hexes.map((hex) => ({ ...hex })) : [];
    if (this.#ready && !this.#disposed) void this.#p5.redraw();
  }

  setManeuverTargets(hexes: readonly BattleHex[]): void {
    this.#targets = hexes;
  }

  setPreviewPose(
    pose: { shipId: string; position: BattleHex; facing: number } | null,
  ): void {
    this.#previewPose = pose;
    if (this.#ready && !this.#disposed) void this.#p5.redraw();
  }

  animateManeuver(maneuver: BattleManeuver): Promise<void> {
    this.#cancelAnimation();
    if (
      this.#disposed ||
      !this.#ready ||
      !maneuver.steps.length ||
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
    )
      return Promise.resolve();
    const frames = [maneuver.from, ...maneuver.steps];
    const start = performance.now();
    const stepMs = 170;
    return new Promise((resolve) => {
      this.#finishAnimation = resolve;
      this.#animationTimeout = setTimeout(
        () => this.#cancelAnimation(),
        stepMs * frames.length + 250,
      );
      const tick = (now: number) => {
        if (this.#disposed) {
          this.#cancelAnimation();
          return;
        }
        const index = Math.min(
          frames.length - 1,
          Math.max(0, Math.floor((now - start) / stepMs)),
        );
        const frame = frames[index]!;
        this.#pose = {
          shipId: maneuver.shipId,
          position: frame.position,
          facing: frame.facing,
        };
        void this.#p5.redraw();
        if (now - start >= stepMs * frames.length) {
          this.#pose = null;
          this.#cancelAnimation();
          return;
        }
        this.#animationFrame = requestAnimationFrame(tick);
      };
      tick(start);
    });
  }

  animateShot(shot: BattleShot): Promise<void> {
    this.#cancelAnimation();
    if (this.#disposed || !this.#ready) return Promise.resolve();
    this.#effect = new BattleEffects(shot);
    const reduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduced) {
      const frame = this.#effect.sample(300);
      this.#effect = null;
      this.#effectFrame = { ...frame, particles: [], trail: [] };
      this.container.dataset.shotStage = 'static';
      void this.#p5.redraw();
      return Promise.resolve();
    }
    const start = performance.now();
    return new Promise((resolve) => {
      this.#finishAnimation = resolve;
      const tick = (now: number) => {
        if (this.#disposed || !this.#effect) {
          this.#cancelAnimation();
          return;
        }
        this.#effectFrame = this.#effect.sample(now - start);
        this.container.dataset.shotStage = this.#effectFrame.impacted
          ? 'impact'
          : 'flight';
        void this.#p5.redraw();
        if (this.#effectFrame.complete) {
          this.#cancelAnimation();
          return;
        }
        this.#animationFrame = requestAnimationFrame(tick);
      };
      tick(start);
    });
  }
  #cancelAnimation(): void {
    if (this.#animationFrame !== undefined)
      cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = undefined;
    if (this.#animationTimeout !== undefined)
      clearTimeout(this.#animationTimeout);
    this.#animationTimeout = undefined;
    this.#effect = null;
    this.#effectFrame = null;
    this.#pose = null;
    delete this.container.dataset.shotStage;
    const finish = this.#finishAnimation;
    this.#finishAnimation = undefined;
    finish?.();
  }

  constructor(
    private readonly container: HTMLElement,
    select: (hex: BattleHex) => void,
    onViewport: (snapshot: BattleViewportSnapshot) => void = () => {},
  ) {
    this.#onViewport = onViewport;
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
          'Battle hex map. Green hexes marked Escape are the retreat exits. Tap a new target to select it, then tap the selected target to fire. Enter or Space fires at the selected impact hex. Drag to pan; pinch or use the mouse wheel to zoom.',
        );
        this.#bind(canvas, select);
        this.#ready = true;
        this.#configureCamera();
        void sketch
          .loadImage(dockingCorridor)
          .then((image) => {
            if (!this.#disposed && image) {
              this.#corridor = image;
              void sketch.redraw();
            }
          })
          .catch(() => undefined);
        for (const type of Object.keys(SHIP_SPRITES) as ShipSpriteType[])
          void sketch
            .loadImage(SHIP_SPRITES[type])
            .then((image) => {
              if (!this.#disposed) {
                this.#images.set(type, image);
                void sketch.redraw();
              }
            })
            .catch(() => undefined);
      };
      sketch.draw = () => this.#draw(sketch);
    }, container);
    this.#observer = new ResizeObserver(() => {
      if (!this.#ready || this.#disposed) return;
      this.#p5.resizeCanvas(
        Math.max(1, container.clientWidth),
        Math.max(1, container.clientHeight),
      );
      this.#configureCamera(true);
    });
    this.#observer.observe(container);
  }
  render(
    state: BattleState,
    selected: string | null,
    aim: BattleHex | null,
    weapon: WeaponName,
  ): void {
    const changed = this.#state?.id !== state.id;
    if (
      this.container.dataset.shotStage === 'static' &&
      this.#state?.log.length !== state.log.length
    )
      this.#cancelAnimation();
    if (changed) this.#cancelAnimation();
    this.#state = state;
    this.#selected = selected;
    this.#aim = aim;
    this.#weapon = weapon;
    this.#configureCamera();
    if (this.#ready) void this.#p5.redraw();
  }
  #configureCamera(resized = false): void {
    const state = this.#state;
    if (!state || !this.#ready) return;
    this.#camera.configure(state, this.#p5.width, this.#p5.height);
    const focus = state.pieces.find(
      (piece) => piece.id === (state.activation?.id ?? this.#selected),
    );
    const key = `${state.id}:${focus?.id}:${focus?.position?.q},${focus?.position?.r}`;
    if (key !== this.#focusKey || resized) {
      const first = !this.#focusKey.startsWith(`${state.id}:`);
      const at =
        focus?.position ??
        battleHex(
          Math.floor(state.deploymentDepth / 2),
          Math.floor(state.height / 2),
        );
      if (focus?.position || first || (state.phase === 'deployment' && focus))
        this.#camera.reveal(at, first || !focus?.position);
      this.#focusKey = key;
    }
    this.#publishCamera();
  }
  #publishCamera(): void {
    const snapshot = this.#camera.snapshot;
    this.#scale = snapshot.scale;
    this.#offset = snapshot.offset;
    Object.assign(this.container.dataset, {
      cameraScale: String(snapshot.scale),
      cameraOffsetX: String(snapshot.offset.x),
      cameraOffsetY: String(snapshot.offset.y),
      cameraMinScale: String(snapshot.minScale),
      cameraMaxScale: String(snapshot.maxScale),
    });
    this.#onViewport(snapshot);
    if (this.#ready) void this.#p5.redraw();
  }
  #zoomAt(factor: number, anchor: Point): void {
    this.#camera.zoom(factor, anchor);
    this.#publishCamera();
  }
  #bind(canvas: HTMLCanvasElement, select: (hex: BattleHex) => void): void {
    const options = { signal: this.#events.signal };
    const point = (event: PointerEvent | WheelEvent) => {
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
        if (this.#pointers.size === 1) this.#dragged = false;
        else this.#dragged = true;
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
            this.#camera.pan({
              x: next.x - previous.x,
              y: next.y - previous.y,
            });
            this.#publishCamera();
          }
        } else {
          const other = [...this.#pointers.entries()].find(
            ([id]) => id !== event.pointerId,
          )![1];
          const oldDistance = Math.hypot(
            previous.x - other.x,
            previous.y - other.y,
          );
          const newDistance = Math.hypot(next.x - other.x, next.y - other.y);
          if (oldDistance > 0) {
            this.#camera.zoom(newDistance / oldDistance, {
              x: (other.x + previous.x) / 2,
              y: (other.y + previous.y) / 2,
            });
            this.#camera.pan({
              x: (next.x - previous.x) / 2,
              y: (next.y - previous.y) / 2,
            });
            this.#publishCamera();
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
        if (!this.#dragged) {
          const p = point(event);
          select(
            HexGeometry.fromPoint({
              x: (p.x - this.#offset.x) / this.#scale,
              y: (p.y - this.#offset.y) / this.#scale,
            }),
          );
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
      'lostpointercapture',
      (event) => {
        this.#pointers.delete(event.pointerId);
        this.#dragged = true;
      },
      options,
    );
    canvas.addEventListener(
      'keydown',
      (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && this.#aim) {
          event.preventDefault();
          if (!event.repeat) select(this.#aim);
        }
      },
      options,
    );
  }
  #draw(p: p5): void {
    p.background('#081321');
    const state = this.#state;
    if (!state) return;
    p.push();
    p.translate(this.#offset.x, this.#offset.y);
    p.scale(this.#scale);
    const polygon = (position: BattleHex, radius: number) => {
      const center = HexGeometry.toPoint(
        new HexCoordinate(position.q, position.r),
      );
      p.beginShape();
      for (let i = 0; i < 6; i++) {
        const a = ((i * 60 - 30) * Math.PI) / 180;
        p.vertex(
          center.x + Math.cos(a) * radius,
          center.y + Math.sin(a) * radius,
        );
      }
      p.endShape(p.CLOSE);
    };
    const escapeZones = new Set(
      battleEscapeHexes(state).map((zone) => `${zone.q},${zone.r}`),
    );
    for (let row = 0; row < state.height; row++)
      for (let col = 0; col < state.width; col++) {
        const cell = battleHex(col, row);
        const escape = escapeZones.has(`${cell.q},${cell.r}`);
        p.stroke('#263d51');
        p.strokeWeight(1 / this.#scale);
        p.fill(
          escape
            ? '#176342'
            : state.phase === 'deployment' && col < state.deploymentDepth
              ? '#123e56'
              : state.phase === 'deployment' &&
                  col >= state.width - state.deploymentDepth
                ? '#3b2532'
                : '#0c1c2b',
        );
        polygon(cell, HexGeometry.size - 1);
        if (escape) {
          const center = HexGeometry.toPoint(new HexCoordinate(cell.q, cell.r));
          p.noStroke();
          p.fill('#d8ffe9');
          p.textAlign(p.CENTER);
          p.textSize(8);
          p.text('Escape', center.x, center.y + 3);
        }
      }
    for (const asteroid of state.asteroids) {
      p.fill('#56606b');
      p.stroke('#99a0a8');
      polygon(asteroid, HexGeometry.size - 5);
      const center = HexGeometry.toPoint(
        new HexCoordinate(asteroid.q, asteroid.r),
      );
      p.noStroke();
      p.fill('#37434e');
      p.circle(center.x - 8, center.y + 5, 14);
      p.circle(center.x + 9, center.y - 10, 10);
    }
    for (const cell of this.#targets) {
      p.stroke('#60caff');
      p.strokeWeight(2 / this.#scale);
      p.fill(50, 145, 200, 50);
      polygon(cell, HexGeometry.size - 3);
    }
    for (const [index, cell] of this.#preview.entries()) {
      p.stroke('#9ad7ff');
      p.strokeWeight(2 / this.#scale);
      p.fill(90, 190, 255, 80);
      polygon(cell, HexGeometry.size - 4);
      const center = HexGeometry.toPoint(new HexCoordinate(cell.q, cell.r));
      p.noStroke();
      p.fill('#f4fbff');
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(12);
      p.text(String(index + 1), center.x, center.y);
    }
    const aim = this.#aim;
    if (aim && state.phase === 'fighting') {
      const area = WEAPONS[this.#weapon].area > 0 ? missileArea(aim) : [aim];
      for (const hex of area) {
        if (
          hex.r < 0 ||
          hex.r >= state.height ||
          hex.q + Math.floor(hex.r / 2) < 0 ||
          hex.q + Math.floor(hex.r / 2) >= state.width
        )
          continue;
        p.stroke(hex.q === aim.q && hex.r === aim.r ? '#ffda7a' : '#8d7344');
        p.strokeWeight(2 / this.#scale);
        p.fill(
          hex.q === aim.q && hex.r === aim.r
            ? 'rgba(255, 218, 122, 0.35)'
            : 'rgba(255, 218, 122, 0.16)',
        );
        polygon(hex, HexGeometry.size - 2);
      }
    }
    const original = state.pieces.find((s) => s.id === this.#selected);
    const selected =
      original && this.#previewPose?.shipId === original.id
        ? { ...original, ...this.#previewPose }
        : original;
    if (
      selected?.position &&
      state.phase === 'fighting' &&
      (selected.type === 'Fighter' ||
        selected.type === 'Space pirate' ||
        selected.type === 'Raptor')
    ) {
      const center = HexGeometry.toPoint(
        new HexCoordinate(selected.position.q, selected.position.r),
      );
      const weapon = WEAPONS[this.#weapon],
        angle = (-selected.facing * Math.PI) / 3,
        arc = (weapon.arc * Math.PI) / 360;
      p.noStroke();
      p.fill(80, 175, 220, 25);
      p.arc(
        center.x,
        center.y,
        weapon.max * HexGeometry.size * 3.4,
        weapon.max * HexGeometry.size * 3.4,
        angle - arc,
        angle + arc,
        p.PIE,
      );
    }
    p.stroke('#c9b37a');
    p.strokeWeight(4);
    const drawn = new Set<string>();
    for (const ship of state.pieces) {
      if (!ship.dockedWith || !ship.position || ship.status !== 'active')
        continue;
      const partner = state.pieces.find(
        (piece) => piece.id === ship.dockedWith,
      );
      if (!partner?.position || drawn.has(ship.id)) continue;
      drawn.add(ship.id);
      drawn.add(partner.id);
      const a = HexGeometry.toPoint(
        new HexCoordinate(ship.position.q, ship.position.r),
      );
      const b = HexGeometry.toPoint(
        new HexCoordinate(partner.position.q, partner.position.r),
      );
      if (this.#corridor) {
        const length = Math.hypot(b.x - a.x, b.y - a.y) * 1.16;
        p.push();
        p.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
        p.rotate(Math.atan2(b.y - a.y, b.x - a.x));
        p.imageMode(p.CENTER);
        p.image(
          this.#corridor,
          0,
          0,
          length,
          (length * this.#corridor.height) / this.#corridor.width,
        );
        p.pop();
      } else p.line(a.x, a.y, b.x, b.y);
    }
    for (const currentShip of state.pieces) {
      const motion =
        this.#pose?.shipId === currentShip.id
          ? this.#pose
          : this.#previewPose?.shipId === currentShip.id
            ? this.#previewPose
            : null;
      if (!motion && currentShip.status === 'destroyed') {
        if (currentShip.position)
          this.#drawDebris(p, currentShip.position, currentShip.id);
        continue;
      }
      if (
        !motion &&
        currentShip.status !== 'active' &&
        currentShip.status !== 'wreck'
      )
        continue;
      const impact =
        !this.#effectFrame?.impacted &&
        this.#effect?.shot.impacts.find((item) => item.id === currentShip.id);
      const ship = {
        ...(impact
          ? {
              ...currentShip,
              hull: impact.previousHull,
              status: 'active' as const,
            }
          : currentShip),
        ...(motion
          ? {
              position: motion.position,
              facing: motion.facing,
              status:
                currentShip.status === 'wreck'
                  ? ('wreck' as const)
                  : ('active' as const),
            }
          : {}),
      };
      if (!ship.position) continue;
      const center = HexGeometry.toPoint(
        new HexCoordinate(ship.position.q, ship.position.r),
      );
      const profile = SHIP_PROFILES[ship.type],
        radius = 13 + profile.size * 4;
      const footprint = ShipFootprint.cells(
        ship,
        state.largeShipFootprints === true,
      );
      const large = footprint.length > 1;
      const aimed =
        !!this.#aim &&
        !!ship.position &&
        (WEAPONS[this.#weapon].area > 0
          ? missileArea(this.#aim).some((hex) =>
              footprint.some((cell) => cell.q === hex.q && cell.r === hex.r),
            )
          : footprint.some(
              (cell) => cell.q === this.#aim!.q && cell.r === this.#aim!.r,
            ));
      if (large) {
        p.stroke(
          ship.id === this.#selected
            ? '#ffffff'
            : aimed
              ? '#ffda7a'
              : ship.side === 'player'
                ? '#64d7ff'
                : '#fa867a',
        );
        p.strokeWeight(2);
        p.fill(ship.side === 'player' ? '#15425b' : '#5c2c36');
        for (const cell of footprint) polygon(cell, HexGeometry.size - 3);
      }
      p.push();
      p.translate(center.x, center.y);
      p.stroke(
        ship.id === this.#selected
          ? '#ffffff'
          : aimed
            ? '#ffda7a'
            : ship.side === 'player'
              ? '#64d7ff'
              : '#fa867a',
      );
      p.strokeWeight(ship.id === this.#selected ? 3 : 1.8);
      p.fill(ship.side === 'player' ? '#15425b' : '#5c2c36');
      if (!large) p.circle(0, 0, radius * 2.3);
      p.push();
      // skeppets-framat-foljer-spriten: every ship asset has its nose pointing right.
      p.rotate((-ship.facing * Math.PI) / 3);
      const image = this.#images.get(ship.type);
      if (image) {
        p.imageMode(p.CENTER);
        if (ship.status === 'wreck') p.tint(90);
        else if (ship.side === 'enemy' && ship.type === 'Transport ship')
          p.tint(210, 92, 78);
        p.image(
          image,
          0,
          0,
          large ? Math.sqrt(3) * HexGeometry.size * 2.7 : radius * 1.7,
          large ? HexGeometry.size * 1.2 : radius * 1.7,
        );
        if (
          ship.status === 'wreck' ||
          (ship.side === 'enemy' && ship.type === 'Transport ship')
        )
          p.noTint();
      } else {
        p.fill(ship.side === 'player' ? '#b0e9f9' : '#ffb2a3');
        p.noStroke();
        p.triangle(
          large ? HexGeometry.size * 2.2 : radius,
          0,
          large ? -HexGeometry.size * 2.2 : -radius * 0.7,
          -radius * 0.55,
          large ? -HexGeometry.size * 2.2 : -radius * 0.7,
          radius * 0.55,
        );
      }
      p.stroke('#f3f6fc');
      p.strokeWeight(2);
      const nose = large ? Math.sqrt(3) * HexGeometry.size * 1.4 : radius;
      p.line(nose + 2, 0, nose + 9, 0);
      p.pop();
      p.noStroke();
      p.fill('#112331');
      p.rect(-23, 23, 46, 5);
      p.fill(ship.side === 'player' ? '#64d7ff' : '#fa867a');
      p.rect(-23, 23, (46 * ship.hull) / maxHull(ship), 5);
      p.fill('#eef5fb');
      p.textAlign(p.CENTER);
      p.textSize(11);
      p.text(`${ship.hull}${ship.activated ? ' ✓' : ''}`, 0, 42);
      if (ship.overwatch && ship.status === 'active') {
        p.fill('#ffe28b');
        p.text('OW', 0, -radius - 9);
      }
      p.pop();
    }
    this.#drawEffects(p);
    p.pop();
  }
  #drawEffects(p: p5): void {
    const frame = this.#effectFrame;
    if (!frame) return;
    p.push();
    p.noStroke();
    for (const [index, position] of frame.trail.entries()) {
      p.fill(255, 162, 70, 180 * (1 - index / frame.trail.length));
      p.circle(
        position.x,
        position.y,
        this.#effect?.shot.weapon === 'Missiles' ? 7 : 3,
      );
    }
    if (frame.projectile) {
      p.fill('#fff7cf');
      p.circle(
        frame.projectile.x,
        frame.projectile.y,
        this.#effect?.shot.weapon === 'Missiles' ? 10 : 6,
      );
    }
    const context = p.drawingContext as CanvasRenderingContext2D;
    for (const particle of frame.particles) {
      context.globalAlpha = particle.alpha;
      p.fill(particle.color);
      p.circle(particle.position.x, particle.position.y, particle.radius * 2);
    }
    context.globalAlpha = 1;
    p.noFill();
    for (const ring of frame.rings) {
      p.stroke(255, 186, 90, ring.alpha * 220);
      p.strokeWeight(2);
      p.circle(ring.position.x, ring.position.y, ring.radius * 2);
    }
    p.pop();
  }
  #drawDebris(p: p5, position: BattleHex, id: string): void {
    const center = HexGeometry.toPoint(
      new HexCoordinate(position.q, position.r),
    );
    let seed = 2166136261;
    for (const glyph of id)
      seed = Math.imul(seed ^ glyph.charCodeAt(0), 16777619);
    p.noStroke();
    for (let index = 0; index < 7; index++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const angle = ((seed % 360) * Math.PI) / 180;
      const distance = 4 + (seed % 16);
      p.fill(index % 2 === 0 ? '#9aa3ad' : '#5e6973');
      p.circle(
        center.x + Math.cos(angle) * distance,
        center.y + Math.sin(angle) * distance,
        3 + (seed % 5),
      );
    }
  }
  dispose(): void {
    this.#disposed = true;
    this.#cancelAnimation();
    this.#events.abort();
    this.#observer.disconnect();
    this.#p5.remove();
  }
}
