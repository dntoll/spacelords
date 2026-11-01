import p5 from 'p5';
import {
  HexCoordinate,
  HexGeometry,
  type Point,
} from '../models/HexCoordinate.js';
import type { BoardingMap, BoardingHex } from '../models/BoardingMap.js';
import {
  BoardingBattle,
  type BoardingBattleState,
  type BoardingPath,
} from '../models/BoardingBattle.js';
import type { BoardingMapPort } from './BoardingView.js';

const key = (position: BoardingHex): string => `${position.q},${position.r}`;

export class BoardingMapView implements BoardingMapPort {
  readonly #p5: p5;
  readonly #observer: ResizeObserver;
  readonly #events = new AbortController();
  #state: BoardingBattleState | null = null;
  #selectedId: string | null = null;
  #destination: BoardingHex | null = null;
  #path: BoardingPath | null = null;
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
    private readonly map: BoardingMap,
    select: (hex: BoardingHex) => void,
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
          'Boarding hex map. Tap a hex to choose a destination or target. Drag to pan, pinch or scroll to zoom.',
        );
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
    destination: BoardingHex | null,
    path: BoardingPath | null,
  ): void {
    const changed = this.#state?.id !== state.id;
    this.#state = state;
    this.#selectedId = selectedId;
    this.#destination = destination;
    this.#path = path;
    if (changed || this.#fitPending) this.fit();
    if (this.#ready) void this.#p5.redraw();
  }

  fit(): void {
    if (!this.#ready || this.container.clientWidth < 1) {
      this.#fitPending = true;
      return;
    }
    const points: Point[] = [];
    for (let r = 0; r < this.map.height; r++)
      for (let q = 0; q < this.map.width; q++)
        points.push(HexGeometry.toPoint(new HexCoordinate(q, r)));
    const minX = Math.min(...points.map((point) => point.x)) - HexGeometry.size;
    const maxX = Math.max(...points.map((point) => point.x)) + HexGeometry.size;
    const minY = Math.min(...points.map((point) => point.y)) - HexGeometry.size;
    const maxY = Math.max(...points.map((point) => point.y)) + HexGeometry.size;
    const padding = 18;
    this.#scale = Math.max(
      0.08,
      Math.min(
        2,
        (this.#p5.width - padding * 2) / Math.max(1, maxX - minX),
        (this.#p5.height - padding * 2) / Math.max(1, maxY - minY),
      ),
    );
    this.#offset = {
      x: this.#p5.width / 2 - ((minX + maxX) / 2) * this.#scale,
      y: this.#p5.height / 2 - ((minY + maxY) / 2) * this.#scale,
    };
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

  #bind(canvas: HTMLCanvasElement, select: (hex: BoardingHex) => void): void {
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
        if (!this.#dragged) {
          const position = point(event);
          const hex = HexGeometry.fromPoint({
            x: (position.x - this.#offset.x) / this.#scale,
            y: (position.y - this.#offset.y) / this.#scale,
          });
          if (this.map.contains(hex)) select({ q: hex.q, r: hex.r });
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

  #hex(sketch: p5, center: Point): void {
    sketch.beginShape();
    for (let index = 0; index < 6; index++) {
      const angle = (Math.PI / 180) * (60 * index - 30);
      sketch.vertex(
        center.x + HexGeometry.size * Math.cos(angle),
        center.y + HexGeometry.size * Math.sin(angle),
      );
    }
    sketch.endShape(sketch.CLOSE);
  }

  #draw(sketch: p5): void {
    sketch.background('#060914');
    const state = this.#state;
    if (!state) return;
    sketch.push();
    sketch.translate(this.#offset.x, this.#offset.y);
    sketch.scale(this.#scale);
    const visible = new Set(state.visibleHexes.map(key));
    const explored = new Set(state.exploredHexes.map(key));
    const smoke = new Set(state.smokeHexes.map(key));
    const path = new Set(this.#path?.positions.map(key) ?? []);
    for (let r = 0; r < this.map.height; r++) {
      for (let q = 0; q < this.map.width; q++) {
        const position = { q, r };
        const center = HexGeometry.toPoint(new HexCoordinate(q, r));
        const terrain = this.map.terrainAt(position);
        const current = visible.has(key(position));
        const remembered = explored.has(key(position));
        const knownHull = terrain === 'hull';
        sketch.stroke('#3c4b65');
        sketch.strokeWeight(1.2);
        if (current) sketch.fill('#24334a');
        else if (remembered) sketch.fill('#141d2c');
        else if (knownHull) sketch.fill('#343d4c');
        else sketch.fill('#080c15');
        this.#hex(sketch, center);
        if (path.has(key(position))) {
          sketch.fill(80, 196, 255, 90);
          this.#hex(sketch, center);
        }
        if (this.#destination && key(this.#destination) === key(position)) {
          sketch.noFill();
          sketch.stroke('#f4cf5a');
          sketch.strokeWeight(4);
          this.#hex(sketch, center);
        }
        if (smoke.has(key(position)) && (current || remembered)) {
          sketch.noStroke();
          sketch.fill(170, 180, 190, 125);
          sketch.circle(center.x, center.y, HexGeometry.size * 1.3);
        }
      }
    }
    const known = (position: BoardingHex) =>
      visible.has(key(position)) || explored.has(key(position));
    for (const feature of state.features) {
      if (
        feature.kind !== 'hull' &&
        feature.kind !== 'wall' &&
        !known(feature.position)
      )
        continue;
      const center = HexGeometry.toPoint(
        new HexCoordinate(feature.position.q, feature.position.r),
      );
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
      const glyph =
        feature.kind === 'door'
          ? feature.destroyed
            ? '×'
            : feature.open
              ? '╱'
              : feature.locked
                ? '▣'
                : '▮'
          : feature.kind === 'reactor'
            ? 'R'
            : feature.kind === 'cover'
              ? '▰'
              : feature.kind === 'exit'
                ? feature.exit === 'breach'
                  ? 'B'
                  : 'E'
                : feature.kind === 'wall'
                  ? '■'
                  : '⬢';
      sketch.text(glyph, center.x, center.y);
    }
    for (const marker of state.lastKnownEnemies) {
      if (visible.has(key(marker.position))) continue;
      const center = HexGeometry.toPoint(
        new HexCoordinate(marker.position.q, marker.position.r),
      );
      sketch.noFill();
      sketch.stroke('#e58b5a');
      sketch.circle(center.x, center.y, 22);
    }
    for (const marker of state.noiseMarkers.filter(
      (entry) => entry.audience === 'player',
    )) {
      const center = HexGeometry.toPoint(
        new HexCoordinate(marker.position.q, marker.position.r),
      );
      sketch.noFill();
      sketch.stroke('#f4cf5a');
      sketch.circle(center.x, center.y, 30);
      sketch.circle(center.x, center.y, 20);
    }
    for (const person of state.people) {
      if (person.status === 'evacuated') continue;
      const center = HexGeometry.toPoint(
        new HexCoordinate(person.position.q, person.position.r),
      );
      if (person.id === state.currentActorId && person.status === 'active') {
        sketch.noFill();
        sketch.stroke('#f4cf5a');
        sketch.strokeWeight(3);
        sketch.circle(center.x, center.y, person.crouched ? 27 : 33);
      }
      sketch.noStroke();
      sketch.fill(
        person.status === 'dead'
          ? '#333943'
          : person.status === 'incapacitated'
            ? '#805d67'
            : person.id === this.#selectedId
              ? '#f4cf5a'
              : person.side === 'player'
                ? '#5ac8fa'
                : person.side === 'defender'
                  ? '#ef6461'
                  : '#8bd17c',
      );
      sketch.circle(center.x, center.y, person.crouched ? 20 : 26);
      const forward = BoardingBattle.forward(person.position, person.facing);
      const direction = HexGeometry.toPoint(
        new HexCoordinate(forward.q, forward.r),
      );
      sketch.stroke('#ffffff');
      sketch.strokeWeight(3);
      sketch.line(
        center.x,
        center.y,
        center.x + (direction.x - center.x) * 0.45,
        center.y + (direction.y - center.y) * 0.45,
      );
    }
    sketch.pop();
  }

  dispose(): void {
    this.#disposed = true;
    this.#events.abort();
    this.#observer.disconnect();
    this.#p5.remove();
  }
}
