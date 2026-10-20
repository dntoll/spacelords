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

// handelsgraf-lasbarhet: zoom changes distances, never the size of text or controls.
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
    viewport?: Readonly<{ width: number; height: number }>,
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
        x: center.x - TradeGraphPresentation.planetWidth / 2,
        y: center.y - TradeGraphPresentation.planetHeight / 2,
        width: TradeGraphPresentation.planetWidth,
        height: TradeGraphPresentation.planetHeight,
      };
    });
    const place = (
      key: string,
      anchor: Point | null,
      center: Point,
      width: number,
      height: number,
      preferred: Point,
      alternatives: readonly Point[] = [],
    ) => {
      const candidates: Point[] = [preferred, ...alternatives];
      for (let ring = 1; ring <= objects.length + 4; ring++) {
        const horizontal = (width + 24) * ring;
        const vertical = (height + 24) * ring;
        candidates.push(
          { x: -width / 2, y: vertical },
          { x: horizontal, y: -height / 2 },
          { x: -horizontal - width, y: -height / 2 },
          { x: -width / 2, y: -vertical - height },
          { x: horizontal, y: vertical },
          { x: -horizontal - width, y: vertical },
          { x: horizontal, y: -vertical - height },
          { x: -horizontal - width, y: -vertical - height },
        );
      }
      if (viewport) {
        const grid: Point[] = [];
        for (let y = 8; y + height <= viewport.height - 8; y += 24)
          for (let x = 8; x + width <= viewport.width - 8; x += 24)
            grid.push({ x: x - center.x, y: y - center.y });
        grid.sort(
          (a, b) =>
            Math.hypot(a.x + width / 2, a.y + height / 2) -
            Math.hypot(b.x + width / 2, b.y + height / 2),
        );
        candidates.push(...grid);
      }
      const available = candidates.filter(
        (p) =>
          !objects.some(
            (rect) =>
              center.x + p.x < rect.x + rect.width + 16 &&
              center.x + p.x + width + 16 > rect.x &&
              center.y + p.y < rect.y + rect.height + 16 &&
              center.y + p.y + height + 16 > rect.y,
          ),
      );
      const offset =
        (viewport &&
          available.find(
            (p) =>
              center.x + p.x >= 8 &&
              center.x + p.x + width <= viewport.width - 8 &&
              center.y + p.y >= 8 &&
              center.y + p.y + height <= viewport.height - 8,
          )) ||
        available[0]!;
      objects.push({
        key,
        anchor,
        x: center.x + offset.x,
        y: center.y + offset.y,
        width,
        height,
      });
    };
    for (const planet of layout.planets)
      place(
        `name:${planet.id}`,
        planet,
        project(planet),
        200,
        32,
        { x: -100, y: 104 },
        [
          { x: -100, y: -136 },
          { x: 110, y: -16 },
          { x: -310, y: -16 },
        ],
      );
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
