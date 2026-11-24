import { MapViewport } from '../../models/star-map/MapViewport.js';
import { renderDetectionBoundary } from './DetectionMapView.js';
import { renderTerrain } from '../TerrainMapView.js';
import { createStarTextures, renderStarGlyph } from '../StarGlyph.js';
import { showMapHex } from '../../models/star-map/StarAppearance.js';
import starSprite from '../../assets/stars/plasma-star.webp';
import { renderMapOverlays } from './MapOverlayView.js';
import { renderTravelRoute } from './TravelRouteView.js';
import p5 from 'p5';
import type { AppReadModel } from '../../../app/models/AppModel.js';
import {
  HexGeometry,
  type HexCoordinate,
  type Point,
} from '../../../common/HexCoordinate.js';
import type { MapCell } from '../../models/Galaxy.js';
import type {
  IntentHandler,
  MapPort,
} from '../../../app/views/ViewContracts.js';
import type { TurnFrame } from '../../models/Game.js';
import { SHIP_SPRITES, type ShipSpriteType } from '../ShipImages.js';
import { FleetMapLayout } from '../../models/star-map/FleetMapLayout.js';
import { pirateAsFleet } from '../../models/PirateFleet.js';
import { MapArtwork } from '../MapArtwork.js';
import { renderPlanetGlyph } from '../PlanetGlyph.js';
import {
  fleetGlideDuration,
  fleetGlideCrossed,
  fleetGlidePoint,
  fleetGlideProgress,
  fleetGlideSegmentSafe,
  fleetGlideWaypoint,
} from './FleetGlide.js';

const STAR_MAP_LABEL =
  'Star map. Select a hex to see it and the route there; select it again to travel. Click a fleet to select it. Drag a fleet to set its destination. Escape cancels. Drag empty space to pan; pinch or use the mouse wheel to zoom. Plus and minus keys zoom. Arrow keys pan; Home returns to the start planet; Enter selects the central hex.';

export class GalaxyMapView implements MapPort {
  readonly #container: HTMLElement;
  readonly #emit: IntentHandler;
  readonly #instance: p5;
  readonly #observer: ResizeObserver;
  readonly #events = new AbortController();
  #model: AppReadModel | null = null;
  #viewport: MapViewport | null = null;
  #drawFrame = 0;
  #canvas: HTMLCanvasElement | null = null;
  #disposed = false;
  #ready = false;
  #starTextures: readonly p5.Image[] | null = null;
  readonly #shipImages = new Map<ShipSpriteType, p5.Image>();
  readonly #artwork = new MapArtwork();
  #descriptionScreen: AppReadModel['screen'] | null = null;
  #movement: {
    movements: TurnFrame['movements'];
    progress: number;
    points: ReadonlyMap<string, { from: Point; to: Point }>;
  } | null = null;
  #journey: {
    start: HexCoordinate;
    target: HexCoordinate;
    position: string;
    point: Point;
    nextStart?: number;
  } | null = null;
  #movementFrame = 0;
  #finishMovement: (() => void) | null = null;

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
        this.#artwork.load(sketch, () => {
          this.#canvas?.setAttribute(
            'data-planet-images-ready',
            String(this.#artwork.planetCount),
          );
          this.#requestDraw();
        });
        for (const type of Object.keys(SHIP_SPRITES) as ShipSpriteType[]) {
          void sketch
            .loadImage(SHIP_SPRITES[type])
            .then((image) => {
              if (this.#disposed) return;
              this.#shipImages.set(type, image);
              this.#canvas?.setAttribute(
                'data-ship-images-ready',
                String(this.#shipImages.size),
              );
              this.#requestDraw();
            })
            .catch(() => {
              /* Retain the loading glyph if a sprite is unavailable. */
            });
        }
        void sketch
          .loadImage(starSprite)
          .then((sprite) => {
            if (this.#disposed) return;
            this.#starTextures = createStarTextures(sketch, sprite);
            this.#canvas?.setAttribute('data-star-texture-ready', 'true');
            this.#requestDraw();
          })
          .catch(() => {
            /* Keep the bounded loading glyph if the asset is unavailable. */
          });
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
        this.#requestDraw();
      }
    });
    this.#observer.observe(container);
  }

  render(model: AppReadModel): void {
    if (
      this.#movement &&
      (this.#movement.movements.length !== model.turnMovements.length ||
        this.#movement.movements.some(
          (movement, index) =>
            movement.fleetId !== model.turnMovements[index]?.fleetId ||
            movement.to.key !== model.turnMovements[index]?.to.key,
        )) &&
      !(
        this.#journey &&
        model.fleet.destination &&
        model.fleet.destination.key === this.#journey.target.key &&
        model.fleet.position?.key === this.#journey.position
      )
    )
      this.#movement = null;
    if (this.#viewport?.cells !== model.cells)
      this.#viewport = new MapViewport(model.cells);
    this.#model = model;
    if (this.#ready && !this.#disposed) this.#requestDraw();
  }

  dispose(): void {
    this.#disposed = true;
    this.#artwork.dispose();
    window.cancelAnimationFrame(this.#movementFrame);
    window.cancelAnimationFrame(this.#drawFrame);
    this.#finishMovement?.();
    this.#finishMovement = null;
    this.#observer.disconnect();
    this.#events.abort();
    this.#instance.remove();
    this.#container.replaceChildren();
  }

  animateTurnStep(
    frame: TurnFrame,
    onProgress?: (progress: number, point?: Point, crossed?: boolean) => void,
    duration = 400,
    ends?: { readonly start: boolean; readonly end: boolean },
  ): Promise<void> {
    if (
      this.#disposed ||
      !frame.movements.length ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      this.#journey = null;
      onProgress?.(1);
      return Promise.resolve();
    }
    const own = frame.movements.find(
      (movement) => movement.fleetId === this.#model?.fleet.id,
    );
    const destination = this.#model?.travelRoute?.steps.at(-1);
    if (own && ends?.start) {
      this.#journey =
        destination && !ends.end
          ? {
              start: own.from,
              target: destination,
              position: own.from.key,
              point: HexGeometry.toPoint(own.from),
            }
          : null;
    }
    const points = new Map<string, { from: Point; to: Point }>();
    for (const movement of frame.movements) {
      const centerFrom = HexGeometry.toPoint(movement.from);
      const centerTo = HexGeometry.toPoint(movement.to);
      const journey =
        movement === own && this.#journey?.position === movement.from.key
          ? this.#journey
          : null;
      const from = journey?.point ?? centerFrom;
      let to =
        journey && !ends?.end
          ? fleetGlideWaypoint(journey.start, journey.target, movement.to)
          : centerTo;
      if (!fleetGlideSegmentSafe(movement.from, movement.to, from, to))
        to = centerTo;
      points.set(movement.fleetId, { from, to });
    }
    let glide = fleetGlideDuration(
      duration,
      frame.movements,
      this.#model?.cells ?? [],
    );
    if (own && frame.movements.length === 1) {
      const path = points.get(own.fleetId)!;
      const a = HexGeometry.toPoint(own.from),
        b = HexGeometry.toPoint(own.to);
      glide *=
        Math.hypot(path.to.x - path.from.x, path.to.y - path.from.y) /
        Math.hypot(b.x - a.x, b.y - a.y);
    }
    return new Promise((resolve) => {
      this.#finishMovement = resolve;
      const now = performance.now();
      let started: number | null = this.#ready
        ? !ends?.start && this.#journey?.nextStart !== undefined
          ? Math.max(this.#journey.nextStart, now - 32)
          : now
        : null;
      const draw = (now: number) => {
        if (this.#disposed) {
          resolve();
          return;
        }
        if (this.#ready) {
          started ??= now;
          const progress = fleetGlideProgress((now - started) / glide, ends);
          this.#movement = { movements: frame.movements, progress, points };
          const path = own ? points.get(own.fleetId) : undefined;
          const point = path
            ? fleetGlidePoint(path.from, path.to, progress)
            : undefined;
          let crossed: boolean | undefined;
          if (own && point) {
            crossed = fleetGlideCrossed(own.from, own.to, point);
          }
          onProgress?.(progress, point, crossed);
          this.#requestDraw();
          if (progress === 1) {
            if (own && this.#journey) {
              if (ends?.end) this.#journey = null;
              else
                this.#journey = {
                  ...this.#journey,
                  position: own.to.key,
                  point: points.get(own.fleetId)!.to,
                  nextStart: started + glide,
                };
            }
            this.#finishMovement = null;
            resolve();
            return;
          }
        }
        this.#movementFrame = window.requestAnimationFrame(draw);
      };
      this.#movementFrame = window.requestAnimationFrame(draw);
    });
  }

  // responsiv-stjarnkarta: coalesce pointer and asset updates into one paint per frame.
  #requestDraw(): void {
    if (!this.#ready || this.#disposed || this.#drawFrame) return;
    this.#drawFrame = window.requestAnimationFrame(() => {
      this.#drawFrame = 0;
      if (!this.#disposed) void this.#instance.redraw();
    });
  }

  #draw(sketch: p5): void {
    const original = this.#model;
    if (!original || this.#disposed) return;
    const movementPoints = new Map<string, Point>();
    const model = original;
    if (this.#movement) {
      const { movements, progress } = this.#movement;
      const markers = FleetMapLayout.markers([
        original.fleet,
        ...original.pirates.map(pirateAsFleet),
      ]);
      for (const movement of movements) {
        const from =
            this.#movement.points.get(movement.fleetId)?.from ??
            HexGeometry.toPoint(movement.from),
          to =
            this.#movement.points.get(movement.fleetId)?.to ??
            HexGeometry.toPoint(movement.to);
        const center = fleetGlidePoint(from, to, progress);
        const marker = markers.find(
          (candidate) => candidate.fleet.id === movement.fleetId,
        );
        if (marker) {
          const anchor = HexGeometry.toPoint(marker.fleet.position!);
          movementPoints.set(movement.fleetId, {
            x: center.x + marker.point.x - anchor.x,
            y: center.y + marker.point.y - anchor.y,
          });
        }
      }
      // kamera-foljer-skepp: the marker glides; the camera snapshot follows it.
    }
    if (this.#canvas) {
      this.#canvas.dataset.cameraX = String(model.camera.center.x);
      this.#canvas.dataset.cameraY = String(model.camera.center.y);
      this.#canvas.dataset.cameraZoom = String(model.camera.zoom);
      if (this.#movement) {
        this.#canvas.dataset.movingFleet = this.#movement.movements[0]!.fleetId;
        this.#canvas.dataset.movingFleets = JSON.stringify(
          this.#movement.movements.map((movement) => movement.fleetId),
        );
        this.#canvas.dataset.movingProgress = String(this.#movement.progress);
        const path = this.#movement.points.get(
          this.#movement.movements[0]!.fleetId,
        );
        if (path) {
          const position = fleetGlidePoint(
            path.from,
            path.to,
            this.#movement.progress,
          );
          this.#canvas.dataset.movingX = String(position.x);
          this.#canvas.dataset.movingY = String(position.y);
        }
      } else {
        delete this.#canvas.dataset.movingFleet;
        delete this.#canvas.dataset.movingFleets;
        delete this.#canvas.dataset.movingProgress;
        delete this.#canvas.dataset.movingX;
        delete this.#canvas.dataset.movingY;
      }
    }
    if (this.#descriptionScreen !== model.screen) {
      sketch.describe(
        model.screen === 'fleets'
          ? 'Fleets map. Fleet positions and destinations are highlighted; planets are background landmarks.'
          : 'Star map. The start planet and its surroundings are visible. Stars are visible in unexplored space.',
      );
      this.#descriptionScreen = model.screen;
    }
    if (this.#canvas) {
      this.#canvas.setAttribute(
        'aria-description',
        'Bright hexes are currently visible. Dim hexes were explored earlier. Dark hexes are unknown. The outline marks current detection range. A dim pirate marks its last known position; a question mark means it has moved.',
      );
      this.#canvas.setAttribute(
        'aria-label',
        model.screen === 'fleets'
          ? 'Fleets map. Click a fleet to select it; drag a fleet to set its destination. Planets are background landmarks. Escape cancels. Drag empty space to pan; pinch or use the mouse wheel to zoom. Plus and minus keys zoom. Arrow keys pan; Home returns to the start planet; Enter selects the central hex.'
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
    const cells =
      this.#viewport?.query(model.camera, sketch.width, sketch.height) ?? [];
    for (const cell of cells)
      if (showMapHex(model.camera.zoom, cell.explored))
        this.#hex(sketch, cell, false, model.camera.zoom);
    const selected = model.screen === 'fleets' ? null : model.selected;
    if (selected) this.#hex(sketch, selected, true, model.camera.zoom);
    renderTerrain(sketch, cells);
    renderDetectionBoundary(sketch, cells, model.camera.zoom);
    for (const cell of cells)
      if (cell.object)
        this.#object(
          sketch,
          cell,
          model.camera.zoom,
          model.screen === 'fleets',
        );
    // fardvag-fran-flottan: the route starts at the fleet's drawn position.
    const fleetPoint =
      movementPoints.get(model.fleet.id) ??
      FleetMapLayout.markers([model.fleet]).find(
        (marker) => marker.fleet.id === model.fleet.id,
      )?.point;
    renderTravelRoute(sketch, model.travelRoute, model.camera.zoom, fleetPoint);
    renderMapOverlays(sketch, model, movementPoints, this.#shipImages);
    if (this.#canvas)
      this.#canvas.style.cursor = model.fleetDragging
        ? 'grabbing'
        : model.hoveredFleetId
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
    if (zoom < 0.18 && !selected) sketch.noStroke();
    else sketch.strokeWeight((selected ? 1.8 : 0.7) / zoom);
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
      : object.type === 'gas'
        ? '#b8a7d6'
        : '#b88870';
    sketch.noStroke();
    if (star)
      renderStarGlyph(sketch, point, zoom, cell.position, this.#starTextures);
    sketch.noStroke();
    sketch.fill(color);
    if (!star) {
      renderPlanetGlyph(
        sketch,
        point,
        26,
        color,
        object.surveyed
          ? this.#artwork.planet(
              object.type === 'gas'
                ? 'Gas'
                : (object.environment ?? 'Temperate'),
            )
          : undefined,
      );
    }
    sketch.pop();
    if (zoom < 0.2 && cell.position.key !== this.#model?.selected?.position.key)
      return;
    sketch.noStroke();
    sketch.fill(star ? '#d7c49e' : '#b9c4c5');
    sketch.textAlign(sketch.CENTER, sketch.TOP);
    sketch.textSize(11 / zoom);
    sketch.text(
      object.name,
      point.x,
      point.y + (star ? HexGeometry.size + 4 / zoom : 18 / zoom),
    );
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
        else if (event.key === 'Enter') {
          this.#emit({ type: 'pointer-start', id: -1, point: { x: 0, y: 0 } });
          this.#emit({ type: 'pointer-end', id: -1, point: { x: 0, y: 0 } });
        } else return;
        event.preventDefault();
      },
      options,
    );
  }
}
