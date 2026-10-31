import p5 from 'p5';
import {
  HexCoordinate,
  HexGeometry,
  type Point,
} from '../models/HexCoordinate.js';
import {
  battleHex,
  SHIP_PROFILES,
  WEAPONS,
  type BattleState,
  type BattleHex,
  type WeaponName,
} from '../models/TacticalBattle.js';
import type { BattleMapPort } from './BattleView.js';
import { SHIP_SPRITES, type ShipSpriteType } from './ShipImages.js';

export class BattleMapView implements BattleMapPort {
  readonly #p5: p5;
  readonly #observer: ResizeObserver;
  readonly #events = new AbortController();
  readonly #images = new Map<string, p5.Image>();
  #state: BattleState | null = null;
  #selected: string | null = null;
  #targets: readonly string[] = [];
  #weapon: WeaponName = 'Cannon';
  #scale = 1;
  #offset: Point = { x: 0, y: 0 };
  #ready = false;
  #disposed = false;
  #fitPending = true;
  readonly #pointers = new Map<number, Point>();
  #start: Point | null = null;
  #dragged = false;

  constructor(
    private readonly container: HTMLElement,
    select: (hex: BattleHex) => void,
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
          'Battle hex map. Tap a friendly ship to select it or an enemy to target it. Drag to pan, pinch or scroll to zoom. Use the ship and target controls for keyboard access.',
        );
        this.#bind(canvas, select);
        this.#ready = true;
        this.fit();
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
      if (this.#fitPending) this.fit();
      else void this.#p5.redraw();
    });
    this.#observer.observe(container);
  }
  render(
    state: BattleState,
    selected: string | null,
    targets: readonly string[],
    weapon: WeaponName,
  ): void {
    const changed = this.#state?.id !== state.id;
    this.#state = state;
    this.#selected = selected;
    this.#targets = targets;
    this.#weapon = weapon;
    if (changed || this.#fitPending) this.fit();
    if (this.#ready) void this.#p5.redraw();
  }
  fit(): void {
    if (!this.#state || !this.#ready || this.container.clientWidth < 1) {
      this.#fitPending = true;
      return;
    }
    const s = this.#state;
    const width = (s.width + 0.5) * Math.sqrt(3) * HexGeometry.size;
    const height =
      (s.height - 1) * 1.5 * HexGeometry.size + HexGeometry.size * 2;
    this.#scale = Math.min(
      (this.#p5.width - 24) / width,
      (this.#p5.height - 24) / height,
    );
    this.#offset = {
      x:
        (this.#p5.width -
          (s.width - 0.5) * Math.sqrt(3) * HexGeometry.size * this.#scale) /
        2,
      y:
        (this.#p5.height -
          (s.height - 1) * 1.5 * HexGeometry.size * this.#scale) /
        2,
    };
    this.#fitPending = false;
    void this.#p5.redraw();
  }
  zoom(factor: number): void {
    this.#zoomAt(factor, { x: this.#p5.width / 2, y: this.#p5.height / 2 });
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
          )![1];
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
      'keydown',
      (event) => {
        if (event.key === '+' || event.key === '=') this.zoom(1.25);
        else if (event.key === '-') this.zoom(0.8);
        else if (event.key === 'Home') this.fit();
        else if (event.key.startsWith('Arrow')) {
          this.#offset = {
            x:
              this.#offset.x +
              (event.key === 'ArrowLeft'
                ? 30
                : event.key === 'ArrowRight'
                  ? -30
                  : 0),
            y:
              this.#offset.y +
              (event.key === 'ArrowUp'
                ? 30
                : event.key === 'ArrowDown'
                  ? -30
                  : 0),
          };
          void this.#p5.redraw();
        } else return;
        event.preventDefault();
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
    for (let row = 0; row < state.height; row++)
      for (let col = 0; col < state.width; col++) {
        p.stroke('#263d51');
        p.strokeWeight(1 / this.#scale);
        p.fill(
          state.phase === 'deployment' && col < state.deploymentDepth
            ? '#123e56'
            : state.phase === 'deployment' &&
                col >= state.width - state.deploymentDepth
              ? '#3b2532'
              : '#0c1c2b',
        );
        polygon(battleHex(col, row), HexGeometry.size - 1);
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
    const selected = state.pieces.find((s) => s.id === this.#selected);
    if (
      selected?.position &&
      state.phase === 'fighting' &&
      (selected.type === 'Fighter' || selected.type === 'Space pirate')
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
    for (const ship of state.pieces) {
      if (ship.status !== 'active' || !ship.position) continue;
      const center = HexGeometry.toPoint(
        new HexCoordinate(ship.position.q, ship.position.r),
      );
      const profile = SHIP_PROFILES[ship.type],
        radius = 13 + profile.size * 4;
      p.push();
      p.translate(center.x, center.y);
      p.stroke(
        ship.id === this.#selected
          ? '#ffffff'
          : this.#targets.includes(ship.id)
            ? '#ffda7a'
            : ship.side === 'player'
              ? '#64d7ff'
              : '#fa867a',
      );
      p.strokeWeight(ship.id === this.#selected ? 3 : 1.8);
      p.fill(ship.side === 'player' ? '#15425b' : '#5c2c36');
      p.circle(0, 0, radius * 2.3);
      p.push();
      // skeppets-framat-foljer-spriten: every ship asset has its nose pointing right.
      p.rotate((-ship.facing * Math.PI) / 3);
      const image = this.#images.get(
        ship.type === 'Space pirate' ? 'Space pirate' : ship.type,
      );
      if (image) {
        p.imageMode(p.CENTER);
        p.image(image, 0, 0, radius * 1.7, radius * 1.7);
      } else {
        p.fill(ship.side === 'player' ? '#b0e9f9' : '#ffb2a3');
        p.noStroke();
        p.triangle(
          radius,
          0,
          -radius * 0.7,
          -radius * 0.55,
          -radius * 0.7,
          radius * 0.55,
        );
      }
      p.stroke('#f3f6fc');
      p.strokeWeight(2);
      p.line(radius + 2, 0, radius + 9, 0);
      p.pop();
      p.noStroke();
      p.fill('#112331');
      p.rect(-23, 23, 46, 5);
      p.fill(ship.side === 'player' ? '#64d7ff' : '#fa867a');
      p.rect(-23, 23, (46 * ship.hull) / profile.hull, 5);
      p.fill('#eef5fb');
      p.textAlign(p.CENTER);
      p.textSize(11);
      p.text(`${ship.hull}${ship.activated ? ' ✓' : ''}`, 0, 42);
      p.pop();
    }
    p.pop();
  }
  dispose(): void {
    this.#disposed = true;
    this.#events.abort();
    this.#observer.disconnect();
    this.#p5.remove();
  }
}
