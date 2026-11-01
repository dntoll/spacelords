import p5 from 'p5';
import type { BoardingMap, BoardingCell } from '../models/BoardingMap.js';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../models/BoardingBattle.js';
import type { BoardingPathMark } from '../models/BoardingPathPreview.js';
import type { BoardingMapPort } from './BoardingView.js';
import {
  boardingCellFromIsoPoint,
  boardingFeatureFootprint,
  boardingIsoCamera,
  boardingIsoCenter,
  boardingIsoCorners,
  type BoardingPoint as Point,
} from './BoardingProjection.js';

const key = (position: BoardingCell): string => `${position.q},${position.r}`;

export class BoardingMapView implements BoardingMapPort {
  readonly #p5: p5;
  readonly #observer: ResizeObserver;
  readonly #events = new AbortController();
  #state: BoardingBattleState | null = null;
  #selectedId: string | null = null;
  #destination: BoardingCell | null = null;
  #path: readonly BoardingPathMark[] = [];
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
  #ready = false;
  #disposed = false;
  #fitPending = true;
  readonly #pointers = new Map<number, Point>();
  #start: Point | null = null;
  #dragged = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly map: BoardingMap,
    select: (cell: BoardingCell) => void,
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
    const camera = boardingIsoCamera(this.map, {
      width: this.#p5.width,
      height: this.#p5.height,
    });
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
      if (!this.#ready) {
        resolve();
        return;
      }
      this.#motion = {
        from,
        to,
        started: performance.now(),
        duration: 260,
        resolve,
      };
      this.#p5.loop();
    });
  }

  playShot(from: BoardingCell, to: BoardingCell): Promise<void> {
    this.#finishMotion();
    return new Promise((resolve) => {
      if (!this.#ready) {
        resolve();
        return;
      }
      this.#shot = {
        from: boardingIsoCenter(from),
        to: boardingIsoCenter(to),
        started: performance.now(),
        duration: 280,
        resolve,
      };
      this.#p5.loop();
    });
  }

  #finishMotion(): void {
    const motion = this.#motion;
    const shot = this.#shot;
    this.#motion = null;
    this.#shot = null;
    if (this.#ready && !this.#disposed) this.#p5.noLoop();
    motion?.resolve();
    shot?.resolve();
  }

  #bind(canvas: HTMLCanvasElement, select: (cell: BoardingCell) => void): void {
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
          const cell = boardingCellFromIsoPoint({
            x: (position.x - this.#offset.x) / this.#scale,
            y: (position.y - this.#offset.y) / this.#scale,
          });
          if (this.map.contains(cell)) select(cell);
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
    const topNorth = { x: center.x, y: center.y - height - depth };
    const topEast = { x: center.x + width, y: center.y - height };
    const topSouth = { x: center.x, y: center.y - height + depth };
    const topWest = { x: center.x - width, y: center.y - height };
    const baseEast = { x: center.x + width, y: center.y };
    const baseSouth = { x: center.x, y: center.y + depth };
    const baseWest = { x: center.x - width, y: center.y };
    sketch.noStroke();
    sketch.fill('#263247');
    sketch.quad(
      topEast.x,
      topEast.y,
      topSouth.x,
      topSouth.y,
      baseSouth.x,
      baseSouth.y,
      baseEast.x,
      baseEast.y,
    );
    sketch.fill('#1a2436');
    sketch.quad(
      topSouth.x,
      topSouth.y,
      topWest.x,
      topWest.y,
      baseWest.x,
      baseWest.y,
      baseSouth.x,
      baseSouth.y,
    );
    sketch.fill(top);
    sketch.quad(
      topNorth.x,
      topNorth.y,
      topEast.x,
      topEast.y,
      topSouth.x,
      topSouth.y,
      topWest.x,
      topWest.y,
    );
    return { x: center.x, y: center.y - height };
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
    const raw = motion
      ? Math.min(1, (performance.now() - motion.started) / motion.duration)
      : 1;
    const progress = raw * raw * (3 - 2 * raw);
    const shotRaw = shot
      ? Math.min(1, (performance.now() - shot.started) / shot.duration)
      : 1;
    const shotProgress = shotRaw * shotRaw * (3 - 2 * shotRaw);
    if (motion && raw >= 1) {
      this.#motion = null;
      motion.resolve();
    }
    if (shot && shotRaw >= 1) {
      this.#shot = null;
      shot.resolve();
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
    for (let r = 0; r < this.map.height; r++) {
      for (let q = 0; q < this.map.width; q++) {
        const position = { q, r };
        const center = boardingIsoCenter(position);
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
        this.#tile(sketch, position);
        if (fire.has(key(position))) {
          sketch.fill(98, 212, 138, 115);
          this.#tile(sketch, position);
        } else if (reach.has(key(position))) {
          sketch.fill(240, 179, 90, 115);
          this.#tile(sketch, position);
        }
        if (this.#destination && key(this.#destination) === key(position)) {
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
      const footprint = boardingFeatureFootprint(feature.kind);
      const center = raised
        ? this.#block(
            sketch,
            floor,
            footprint.width,
            footprint.depth,
            feature.kind === 'door' ? 13 : feature.kind === 'cover' ? 5 : 18,
            feature.kind === 'cover'
              ? '#9c7448'
              : feature.kind === 'door'
                ? '#6e829f'
                : '#52657f',
          )
        : floor;
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
    for (const person of [...state.people].sort(
      (a, b) =>
        boardingIsoCenter(a.position).y - boardingIsoCenter(b.position).y,
    )) {
      if (person.status === 'evacuated') continue;
      const origin = mover && person.id === mover.id ? mover : person;
      const target =
        mover && person.id === mover.id
          ? (motion!.to.people.find((entry) => entry.id === person.id) ??
            person)
          : person;
      const fromCenter = boardingIsoCenter(origin.position);
      const toCenter = boardingIsoCenter(target.position);
      const center = {
        x: fromCenter.x + (toCenter.x - fromCenter.x) * progress,
        y: fromCenter.y + (toCenter.y - fromCenter.y) * progress,
      };
      const bodyY = center.y - (person.crouched ? 7 : 11);
      sketch.noStroke();
      sketch.fill(0, 0, 0, 95);
      sketch.ellipse(center.x, center.y + 2, 25, 9);
      if (person.id === state.currentActorId && person.status === 'active') {
        sketch.noFill();
        sketch.stroke('#f4cf5a');
        sketch.strokeWeight(2.5);
        sketch.ellipse(center.x, center.y + 1, 32, 13);
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
      sketch.circle(center.x, bodyY, person.crouched ? 17 : 21);
      sketch.fill('#111827');
      sketch.rect(center.x - 15, bodyY - 18, 30, 5, 2);
      sketch.fill(
        person.side === 'player'
          ? '#5ac8fa'
          : person.side === 'defender'
            ? '#ef6461'
            : '#8bd17c',
      );
      sketch.rect(
        center.x - 14,
        bodyY - 17,
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
      sketch.stroke('#ffffff');
      sketch.strokeWeight(2.5);
      sketch.line(
        center.x,
        bodyY,
        center.x + (dx / length) * 17,
        bodyY + (dy / length) * 17,
      );
    }
    if (shot) {
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
