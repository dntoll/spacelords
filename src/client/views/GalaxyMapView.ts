import { renderMapTradeRoutes } from './MapTradeRoutesView.js';
import { renderDetectionBoundary } from './DetectionMapView.js';
import { salvageMarkers } from '../models/SalvageMapLayout.js';
import { renderMapOverlays } from './MapOverlayView.js';
import p5 from 'p5';
import type { AppReadModel } from '../models/AppModel.js';
import { HexGeometry, type Point } from '../models/HexCoordinate.js';
import type { MapCell } from '../models/Galaxy.js';
import type { IntentHandler, MapPort } from './ViewContracts.js';
import type { TurnFrame } from '../models/Game.js';

const STAR_MAP_LABEL =
  'Star map. Click a fleet or trade route to select it. Drag a selected owned planet to another owned planet to create a route. Press R to start a route from the selected owned planet, then choose its target. Drag a fleet onto a route to assign it, or elsewhere to set its destination. Escape cancels. Drag empty space to pan; pinch or use the mouse wheel to zoom. Plus and minus keys zoom. Arrow keys pan; Home returns to your homeworld; Enter selects the central hex.';

export class GalaxyMapView implements MapPort {
  readonly #container: HTMLElement;
  readonly #emit: IntentHandler;
  readonly #instance: p5;
  readonly #observer: ResizeObserver;
  readonly #events = new AbortController();
  #model: AppReadModel | null = null;
  #canvas: HTMLCanvasElement | null = null;
  #disposed = false;
  #ready = false;
  #descriptionScreen: AppReadModel['screen'] | null = null;

  constructor(container: HTMLElement, emit: IntentHandler) {
    this.#container = container;
    this.#emit = emit;
    this.#instance = new p5((sketch) => {
      sketch.setup = () => {
        if (this.#disposed) return;
        sketch.createCanvas(
          Math.max(1, container.clientWidth),
          Math.max(1, container.clientHeight),
        );
        sketch.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
        sketch.noLoop();
        sketch.textFont('system-ui');
        this.#canvas = container.querySelector('canvas');
        if (this.#canvas) this.#bindInput(this.#canvas);
        this.#ready = true;
      };
      sketch.draw = () => this.#draw(sketch);
    }, container);
    this.#observer = new ResizeObserver(() => {
      if (this.#ready && !this.#disposed) {
        this.#instance.resizeCanvas(
          Math.max(1, container.clientWidth),
          Math.max(1, container.clientHeight),
          true,
        );
        void this.#instance.redraw();
      }
    });
    this.#observer.observe(container);
  }

  render(model: AppReadModel): void {
    this.#model = model;
    if (this.#ready && !this.#disposed) void this.#instance.redraw();
  }

  dispose(): void {
    this.#disposed = true;
    this.#observer.disconnect();
    this.#events.abort();
    this.#instance.remove();
    this.#container.replaceChildren();
  }

  animateTurnStep(frame: TurnFrame): Promise<void> {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return Promise.resolve();
    void frame;
    return new Promise((resolve) => window.setTimeout(resolve, 300));
  }

  #draw(sketch: p5): void {
    const model = this.#model;
    if (!model || this.#disposed) return;
    if (this.#descriptionScreen !== model.screen) {
      sketch.describe(
        model.screen === 'fleets'
          ? 'Fleets map. Fleet positions and destinations are highlighted; planets and trade routes are background landmarks.'
          : model.screen === 'route'
            ? 'Route map. Select planets, create routes and assign transport fleets.'
            : model.screen === 'production'
              ? 'Production map. Select an owned planet to build and inspect its project supply chain.'
              : 'Star map. Your homeworld and its surroundings are visible. Stars are visible in unexplored space.',
      );
      this.#descriptionScreen = model.screen;
    }
    if (this.#canvas) {
      this.#canvas.setAttribute(
        'aria-description',
        'Bright hexes are currently visible. Dim hexes were explored earlier. Dark hexes are unknown. The outline marks current detection range. Pirates are shown only within current sight.',
      );
      this.#canvas.setAttribute(
        'aria-label',
        model.screen === 'fleets'
          ? 'Fleets map. Click a fleet to select it; drag a fleet to set its destination. Planets and trade routes are background landmarks. Escape cancels. Drag empty space to pan; pinch or use the mouse wheel to zoom. Plus and minus keys zoom. Arrow keys pan; Home returns to your homeworld; Enter selects the central hex.'
          : model.screen === 'production'
            ? 'Production map. Select an owned planet to show build options and its queue. Drag empty space to pan; pinch or use the mouse wheel to zoom. Arrow keys pan; Enter selects the central hex.'
            : model.screen === 'route'
              ? STAR_MAP_LABEL.replace('Star map.', 'Route map.')
              : STAR_MAP_LABEL,
      );
    }
    sketch.background('#0a1520');
    sketch.noStroke();
    for (let index = 0; index < 100; index += 1) {
      sketch.fill(133, 163, 182, index % 3 === 0 ? 65 : 25);
      sketch.circle(
        (index * 137.5 + 31) % sketch.width,
        (index * 71.3 + 19) % sketch.height,
        index % 4 === 0 ? 2 : 1,
      );
    }
    sketch.push();
    sketch.translate(sketch.width / 2, sketch.height / 2);
    sketch.scale(model.camera.zoom);
    sketch.translate(-model.camera.center.x, -model.camera.center.y);
    for (const cell of model.cells)
      this.#hex(sketch, cell, false, model.camera.zoom);
    renderDetectionBoundary(sketch, model.cells, model.camera.zoom);
    const selected = model.screen === 'fleets' ? null : model.selected;
    if (selected) this.#hex(sketch, selected, true, model.camera.zoom);
    // synliga-handelsrutter: selection fills stay below routes; objects stay above.
    renderMapTradeRoutes(sketch, model);
    for (const cell of model.cells)
      if (cell.object)
        this.#object(
          sketch,
          cell,
          model.camera.zoom,
          model.screen === 'fleets',
        );
    renderMapOverlays(sketch, model);
    for (const marker of salvageMarkers(
      model.wrecks ?? [],
      model.shipyards ?? [],
      model.camera.zoom,
    )) {
      sketch.push();
      sketch.translate(marker.point.x, marker.point.y);
      sketch.scale(1 / model.camera.zoom);
      sketch.stroke(
        marker.id === model.salvageSelection ? '#ffffff' : '#e8bd76',
      );
      sketch.strokeWeight(2);
      sketch.fill('#152936');
      if (marker.kind === 'yard') sketch.rect(-10, -8, 20, 16);
      else {
        sketch.line(-8, -7, 8, 7);
        sketch.line(-8, 7, 8, -7);
        sketch.circle(0, 0, 6);
      }
      sketch.pop();
    }
    for (const choice of model.shipyardPlacement?.choices ?? []) {
      const point = HexGeometry.toPoint(choice);
      sketch.noFill();
      sketch.stroke('#e8bd76');
      sketch.strokeWeight(2 / model.camera.zoom);
      sketch.circle(point.x, point.y, 32);
    }
    if (this.#canvas)
      this.#canvas.style.cursor = model.fleetDragging
        ? 'grabbing'
        : model.hoveredFleetId || model.mapTrade.hoveredRouteIds.length
          ? 'pointer'
          : 'grab';
    sketch.pop();
    if (this.#canvas) this.#canvas.dataset.rendered = 'true';
  }

  #hex(sketch: p5, cell: MapCell, selected: boolean, zoom: number): void {
    const point = HexGeometry.toPoint(cell.position);
    sketch.stroke(
      selected
        ? '#ade8cf'
        : cell.visible
          ? '#345555'
          : cell.explored
            ? '#293e49'
            : '#1e303c',
    );
    sketch.strokeWeight((selected ? 1.8 : 0.7) / zoom);
    sketch.fill(
      selected
        ? '#1b3e41'
        : cell.visible
          ? '#112d34'
          : cell.explored
            ? '#10242e'
            : '#0d1c28',
    );
    sketch.beginShape();
    for (let corner = 0; corner < 6; corner += 1) {
      const angle = (Math.PI / 3) * corner - Math.PI / 6;
      sketch.vertex(
        point.x + Math.cos(angle) * HexGeometry.size,
        point.y + Math.sin(angle) * HexGeometry.size,
      );
    }
    sketch.endShape(sketch.CLOSE);
  }

  #object(sketch: p5, cell: MapCell, zoom: number, dimmed: boolean): void {
    const object = cell.object;
    if (!object) return;
    const point = HexGeometry.toPoint(cell.position);
    const star = object.kind === 'star';
    sketch.push();
    const context = sketch.drawingContext as
      CanvasRenderingContext2D | undefined;
    if (context && dimmed) context.globalAlpha *= 0.35;
    if (context && cell.explored && !cell.visible) context.globalAlpha *= 0.65;
    const color = star
      ? '#e9c78b'
      : object.owned
        ? '#b1e4d1'
        : object.type === 'gas'
          ? '#b8a7d6'
          : '#b88870';
    sketch.noStroke();
    if (star) {
      for (let layer = 4; layer > 0; layer -= 1) {
        sketch.fill(232, 187, 108, 13);
        sketch.circle(point.x, point.y, 12 + layer * 8);
      }
    } else if (object.owned) {
      sketch.noFill();
      sketch.stroke('#476f68');
      sketch.strokeWeight(1 / zoom);
      sketch.ellipse(point.x, point.y, 34, 26);
    }
    sketch.noStroke();
    sketch.fill(color);
    sketch.circle(point.x, point.y, star ? 14 : 17);
    if (!star) {
      sketch.fill(20, 52, 54, 100);
      sketch.ellipse(point.x + 3, point.y + 1, 8, 15);
      sketch.fill(230, 245, 230, 80);
      sketch.circle(point.x - 4, point.y - 4, 4);
    }
    sketch.pop();
    sketch.noStroke();
    sketch.fill(star ? '#d7c49e' : object.owned ? '#d5f5e5' : '#b9c4c5');
    sketch.textAlign(sketch.CENTER, sketch.TOP);
    sketch.textSize(11 / zoom);
    sketch.text(object.name, point.x, point.y + 18 / zoom);
  }

  #point(event: { clientX: number; clientY: number }): Point {
    const rect = this.#container.getBoundingClientRect();
    return {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    };
  }

  #bindInput(canvas: HTMLCanvasElement): void {
    const options = { signal: this.#events.signal };
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', STAR_MAP_LABEL);
    const activePointers = new Set<number>();
    canvas.addEventListener(
      'pointerdown',
      (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        activePointers.add(event.pointerId);
        canvas.setPointerCapture(event.pointerId);
        canvas.focus({ preventScroll: true });
        this.#emit({
          type: 'pointer-start',
          id: event.pointerId,
          point: this.#point(event),
        });
      },
      options,
    );
    canvas.addEventListener(
      'pointermove',
      (event) => {
        this.#emit({
          type: 'pointer-move',
          id: event.pointerId,
          point: this.#point(event),
        });
      },
      options,
    );
    canvas.addEventListener(
      'pointerup',
      (event) => {
        activePointers.delete(event.pointerId);
        this.#emit({
          type: 'pointer-end',
          id: event.pointerId,
          point: this.#point(event),
        });
        if (canvas.hasPointerCapture(event.pointerId))
          canvas.releasePointerCapture(event.pointerId);
      },
      options,
    );
    canvas.addEventListener(
      'pointercancel',
      () => {
        activePointers.clear();
        this.#emit({ type: 'pointer-cancel' });
      },
      options,
    );
    canvas.addEventListener(
      'pointerleave',
      () => this.#emit({ type: 'map-leave' }),
      options,
    );
    canvas.addEventListener(
      'lostpointercapture',
      (event) => {
        // A completed drop may leave a route chooser; only unexpected loss cancels.
        if (activePointers.delete(event.pointerId))
          this.#emit({ type: 'pointer-cancel' });
      },
      options,
    );
    canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        this.#emit({
          type: 'zoom',
          factor: Math.exp(
            -Math.max(-200, Math.min(200, event.deltaY)) * 0.003,
          ),
          anchor: this.#point(event),
        });
      },
      { ...options, passive: false },
    );
    canvas.addEventListener(
      'keydown',
      (event) => {
        const pans: Record<string, Point> = {
          ArrowLeft: { x: 50, y: 0 },
          ArrowRight: { x: -50, y: 0 },
          ArrowUp: { x: 0, y: 50 },
          ArrowDown: { x: 0, y: -50 },
        };
        const delta = pans[event.key];
        if (event.key === 'Escape') this.#emit({ type: 'pointer-cancel' });
        else if (delta) this.#emit({ type: 'pan', delta });
        else if (['+', '=', '-'].includes(event.key))
          this.#emit({
            type: 'zoom',
            factor: event.key === '-' ? 1 / 1.2 : 1.2,
            anchor: { x: 0, y: 0 },
          });
        else if (event.key === 'Home') this.#emit({ type: 'home' });
        else if (
          event.key.toLowerCase() === 'r' &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.metaKey
        ) {
          const source = this.#model?.ownedPlanets.find(
            (planet) =>
              planet.position.key === this.#model?.selected?.position.key,
          );
          if (
            (this.#model?.screen === 'map' ||
              this.#model?.screen === 'route') &&
            source &&
            this.#model?.phase === 'planning' &&
            this.#model.research.completed.includes('Trade logistics')
          )
            this.#emit({ type: 'begin-map-route', id: source.id });
        } else if (event.key === 'Enter') {
          this.#emit({ type: 'pointer-start', id: -1, point: { x: 0, y: 0 } });
          this.#emit({ type: 'pointer-end', id: -1, point: { x: 0, y: 0 } });
        } else return;
        event.preventDefault();
      },
      options,
    );
  }
}
