import { renderMapEvent } from './MapEventView.js';
import { renderMapTradeRoutes } from './MapTradeRoutesView.js';
import { renderDetectionBoundary } from './DetectionMapView.js';
import { renderTerrain } from './TerrainMapView.js';
import { createStarTextures, renderStarGlyph } from './StarGlyph.js';
import { showMapHex } from '../models/StarAppearance.js';
import starSprite from '../assets/stars/plasma-star.webp';
import { salvageMarkers } from '../models/SalvageMapLayout.js';
import { renderMapOverlays } from './MapOverlayView.js';
import p5 from 'p5';
import type { AppReadModel } from '../models/AppModel.js';
import { HexGeometry, type Point } from '../models/HexCoordinate.js';
import type { MapCell } from '../models/Galaxy.js';
import type { IntentHandler, MapPort } from './ViewContracts.js';
import type { TurnFrame } from '../models/Game.js';
import { SHIP_SPRITES, type ShipSpriteType } from './ShipImages.js';
import { FleetMapLayout } from '../models/FleetMapLayout.js';
import { pirateAsFleet } from '../models/PirateFleet.js';
import { MapArtwork } from './MapArtwork.js';
import { renderPlanetGlyph, renderShipyardGlyph } from './PlanetGlyph.js';

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
  #starTextures: readonly p5.Image[] | null = null;
  readonly #shipImages = new Map<ShipSpriteType, p5.Image>();
  readonly #artwork = new MapArtwork();
  #descriptionScreen: AppReadModel['screen'] | null = null;
  #movement: {
    movement: TurnFrame['movements'][number];
    progress: number;
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
          this.#canvas?.setAttribute(
            'data-shipyard-image-ready',
            String(!!this.#artwork.station),
          );
          void sketch.redraw();
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
              void sketch.redraw();
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
            void sketch.redraw();
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
        void this.#instance.redraw();
      }
    });
    this.#observer.observe(container);
  }

  render(model: AppReadModel): void {
    if (
      this.#movement?.movement.fleetId !== model.turnMovement?.fleetId ||
      this.#movement?.movement.to.key !== model.turnMovement?.to.key
    )
      this.#movement = null;
    this.#model = model;
    if (this.#ready && !this.#disposed) void this.#instance.redraw();
  }

  dispose(): void {
    this.#disposed = true;
    this.#artwork.dispose();
    window.cancelAnimationFrame(this.#movementFrame);
    this.#finishMovement?.();
    this.#finishMovement = null;
    this.#observer.disconnect();
    this.#events.abort();
    this.#instance.remove();
    this.#container.replaceChildren();
  }

  animateTurnStep(frame: TurnFrame): Promise<void> {
    const movement = frame.movements[0];
    if (
      this.#disposed ||
      !movement ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return Promise.resolve();
    return new Promise((resolve) => {
      this.#finishMovement = resolve;
      let started: number | null = null;
      const draw = (now: number) => {
        if (this.#disposed) {
          resolve();
          return;
        }
        if (this.#ready) {
          started ??= now;
          const progress = Math.min(1, (now - started) / 400);
          this.#movement = { movement, progress };
          void this.#instance.redraw();
          if (progress === 1) {
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

  #draw(sketch: p5): void {
    const original = this.#model;
    if (!original || this.#disposed) return;
    const movementPoints = new Map<string, Point>();
    let model = original;
    if (this.#movement) {
      const { movement, progress } = this.#movement;
      const from = HexGeometry.toPoint(movement.from),
        to = HexGeometry.toPoint(movement.to);
      const center = {
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
      };
      const marker = FleetMapLayout.markers(
        [...original.fleets, ...original.pirates.map(pirateAsFleet)],
        [],
        original.camera.zoom,
      ).find((candidate) => candidate.fleet.id === movement.fleetId);
      if (marker)
        movementPoints.set(movement.fleetId, {
          x: center.x + marker.point.x - from.x,
          y: center.y + marker.point.y - from.y,
        });
      model = { ...original, camera: { ...original.camera, center } };
    }
    if (this.#canvas) {
      if (this.#movement) {
        this.#canvas.dataset.movingFleet = this.#movement.movement.fleetId;
        this.#canvas.dataset.movingProgress = String(this.#movement.progress);
      } else {
        delete this.#canvas.dataset.movingFleet;
        delete this.#canvas.dataset.movingProgress;
      }
    }
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
    const margin = HexGeometry.size * 3;
    const cells = model.cells.filter((cell) => {
      const point = HexGeometry.toPoint(cell.position);
      return (
        Math.abs(point.x - model.camera.center.x) <=
          sketch.width / (2 * model.camera.zoom) + margin &&
        Math.abs(point.y - model.camera.center.y) <=
          sketch.height / (2 * model.camera.zoom) + margin
      );
    });
    for (const cell of cells)
      if (showMapHex(model.camera.zoom, cell.explored))
        this.#hex(sketch, cell, false, model.camera.zoom);
    const selected =
      model.screen === 'fleets' || model.eventPlayback ? null : model.selected;
    if (selected) this.#hex(sketch, selected, true, model.camera.zoom);
    renderTerrain(sketch, cells);
    renderDetectionBoundary(sketch, cells, model.camera.zoom);
    // synliga-handelsrutter: selection fills stay below routes; objects stay above.
    renderMapTradeRoutes(sketch, model);
    for (const cell of cells)
      if (cell.object)
        this.#object(
          sketch,
          cell,
          model.camera.zoom,
          model.screen === 'fleets',
        );
    renderMapOverlays(sketch, model, movementPoints, this.#shipImages);
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
      if (marker.kind === 'yard')
        renderShipyardGlyph(
          sketch,
          marker.id === model.salvageSelection,
          this.#artwork.station,
        );
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
    renderMapEvent(sketch, model);
    if (this.#canvas) {
      const playback = model.eventPlayback;
      const event = playback?.events[playback.index];
      if (event?.position)
        this.#canvas.dataset.eventHex = `${event.position.q},${event.position.r}`;
      else delete this.#canvas.dataset.eventHex;
    }
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
      : object.owned
        ? '#b1e4d1'
        : object.type === 'gas'
          ? '#b8a7d6'
          : '#b88870';
    sketch.noStroke();
    if (star) {
      renderStarGlyph(sketch, point, zoom, cell.position, this.#starTextures);
    } else if (object.owned) {
      sketch.noFill();
      sketch.stroke('#476f68');
      sketch.strokeWeight(1 / zoom);
      sketch.ellipse(point.x, point.y, 34, 26);
    }
    sketch.noStroke();
    sketch.fill(color);
    if (!star) {
      renderPlanetGlyph(
        sketch,
        point,
        26,
        color,
        this.#artwork.planet(
          object.type === 'gas' ? 'Gas' : (object.environment ?? 'Temperate'),
        ),
      );
    }
    sketch.pop();
    if (zoom < 0.2 && cell.position.key !== this.#model?.selected?.position.key)
      return;
    sketch.noStroke();
    sketch.fill(star ? '#d7c49e' : object.owned ? '#d5f5e5' : '#b9c4c5');
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
