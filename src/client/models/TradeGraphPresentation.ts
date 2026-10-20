import type { FleetSnapshot } from './Game.js';
import type { Point } from './HexCoordinate.js';
import {
  TradeGraphLayout,
  type GraphBounds,
  type GraphCameraSnapshot,
} from './TradeGraph.js';

export interface TradeObjectPlacement extends GraphBounds {
  readonly key: string;
  readonly anchor: Point | null;
}

// handelsgraf-lasbarhet: planets scale with the map; text and controls stay readable.
export class TradeGraphPresentation {
  static readonly planetWidth = 172;
  static readonly planetHeight = 172;
  static readonly fleetWidth = 240;
  static readonly fleetHeight = 170;
  static readonly routeWidth = 270;
  static readonly routeHeight = 290;
  readonly objects: readonly TradeObjectPlacement[];

  constructor(
    layout: TradeGraphLayout,
    fleets: readonly FleetSnapshot[],
    camera: GraphCameraSnapshot,
  ) {
    const project = (point: Point): Point => ({
      x: point.x * camera.zoom + camera.offset.x,
      y: point.y * camera.zoom + camera.offset.y,
    });
    const objects: TradeObjectPlacement[] = layout.planets.map((planet) => {
      const center = project(planet);
      return {
        key: `planet:${planet.id}`,
        anchor: null,
        x: center.x - (TradeGraphPresentation.planetWidth * camera.zoom) / 2,
        y: center.y - (TradeGraphPresentation.planetHeight * camera.zoom) / 2,
        width: TradeGraphPresentation.planetWidth * camera.zoom,
        height: TradeGraphPresentation.planetHeight * camera.zoom,
      };
    });
    const place = (
      key: string,
      anchor: Point | null,
      center: Point,
      width: number,
      height: number,
      preferred: Point,
    ) => {
      const candidates: Point[] = [preferred];
      for (
        let radius = 0;
        radius <= (objects.length + 4) * Math.max(width, height);
        radius += 24
      )
        for (let direction = 0; direction < 16; direction++) {
          const angle = (direction * Math.PI) / 8;
          candidates.push({
            x: Math.cos(angle) * radius - width / 2,
            y: Math.sin(angle) * radius - height / 2,
          });
        }
      candidates.sort(
        (a, b) =>
          Math.hypot(a.x + width / 2, a.y + height / 2) -
          Math.hypot(b.x + width / 2, b.y + height / 2),
      );
      const offset = candidates.find(
        (p) =>
          !objects.some(
            (rect) =>
              center.x + p.x < rect.x + rect.width + 16 &&
              center.x + p.x + width + 16 > rect.x &&
              center.y + p.y < rect.y + rect.height + 16 &&
              center.y + p.y + height + 16 > rect.y,
          ),
      )!;
      objects.push({
        key,
        anchor,
        x: center.x + offset.x,
        y: center.y + offset.y,
        width,
        height,
      });
    };
    for (const planet of layout.planets) {
      const center = project(planet);
      objects.push({
        key: `name:${planet.id}`,
        anchor: null,
        x: center.x - 100,
        y:
          center.y -
          (TradeGraphPresentation.planetHeight * camera.zoom) / 2 -
          40,
        width: 200,
        height: 32,
      });
    }
    for (const fleet of fleets) {
      if (
        !fleet.position ||
        !Object.values(fleet.ships).some((count) => count > 0)
      )
        continue;
      const anchor = TradeGraphLayout.point(fleet.position);
      const types = Object.values(fleet.ships).filter(
        (count) => count > 0,
      ).length;
      const width = Math.max(128, types * 44 + 12);
      place(`ships:${fleet.id}`, anchor, project(anchor), width, 78, {
        x: -width / 2,
        y: 128,
      });
    }
    for (const route of layout.routes)
      place(
        `route:${route.id}`,
        route.anchor,
        project(route.anchor),
        TradeGraphPresentation.routeWidth,
        TradeGraphPresentation.routeHeight,
        {
          x: -TradeGraphPresentation.routeWidth / 2,
          y: -TradeGraphPresentation.routeHeight / 2,
        },
      );
    for (const fleet of layout.fleets) {
      const anchor = fleet.anchor;
      place(
        `fleet:${fleet.id}`,
        anchor,
        project(anchor ?? fleet),
        TradeGraphPresentation.fleetWidth,
        TradeGraphPresentation.fleetHeight,
        { x: 160, y: -85 },
      );
    }
    this.objects = Object.freeze(
      objects.map((object) => Object.freeze(object)),
    );
  }
}
