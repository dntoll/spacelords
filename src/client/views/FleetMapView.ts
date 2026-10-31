import type p5 from 'p5';
import type { TradeRouteSnapshot } from '../models/Logistics.js';
import type { AppReadModel } from '../models/AppModel.js';
import { FleetMapLayout } from '../models/FleetMapLayout.js';
import type { FleetSnapshot } from '../models/Game.js';
import type { ShipSpriteType } from './ShipImages.js';
import { HexGeometry, type Point } from '../models/HexCoordinate.js';

export function renderMapFleets(
  sketch: p5,
  fleets: readonly FleetSnapshot[],
  zoom: number,
  interaction: Pick<
    AppReadModel,
    | 'mapFleetId'
    | 'hoveredFleetId'
    | 'fleetDragging'
    | 'fleetDestinationPreview'
  > = {
    mapFleetId: null,
    hoveredFleetId: null,
    fleetDragging: false,
    fleetDestinationPreview: null,
  },
  showUnselectedRings = false,
  routeView: readonly TradeRouteSnapshot[] | null = null,
  attentionFleetIds: readonly string[] = [],
  pirateIds: readonly string[] = [],
  movementPoints: ReadonlyMap<string, Point> = new Map(),
  shipImages: ReadonlyMap<ShipSpriteType, p5.Image> = new Map(),
  showDestinationArrows = true,
): void {
  const markers = FleetMapLayout.markers(fleets, routeView ?? [], zoom).map(
    (marker) => ({
      ...marker,
      point: movementPoints.get(marker.fleet.id) ?? marker.point,
    }),
  );
  const destinationFor = (fleet: FleetSnapshot) =>
    interaction.fleetDragging && interaction.mapFleetId === fleet.id
      ? interaction.fleetDestinationPreview
      : fleet.destination;

  // kartflottor: draw routes underneath the separate fleet swarms.
  for (const { fleet, point } of markers) {
    const route = routeView?.find((route) => route.id === fleet.routeId);
    if (route) {
      const start = HexGeometry.toPoint(route.start),
        end = HexGeometry.toPoint(route.end);
      const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      if (Math.hypot(point.x - center.x, point.y - center.y) > 1) {
        sketch.stroke('#72d8ca');
        sketch.strokeWeight(1 / zoom);
        sketch.line(point.x, point.y, center.x, center.y);
      }
      continue;
    }
    // ruttflottor-utan-destinationspilar / destinationspilar-endast-i-flottvyn
    // vald-flotta-visar-destinationspil: the selected fleet keeps its arrow.
    if (
      fleet.routeId ||
      (!showDestinationArrows && interaction.mapFleetId !== fleet.id)
    )
      continue;
    const target = destinationFor(fleet);
    if (!target) continue;
    const destination = HexGeometry.toPoint(target);
    const angle = Math.atan2(destination.y - point.y, destination.x - point.x);
    const color =
      interaction.fleetDragging && interaction.mapFleetId === fleet.id
        ? '#ffdc88'
        : '#72d8ca';
    sketch.stroke(color);
    sketch.strokeWeight(1 / zoom);
    sketch.line(point.x, point.y, destination.x, destination.y);
    sketch.noStroke();
    sketch.fill(color);
    const length = 8 / zoom;
    const width = 3 / zoom;
    sketch.triangle(
      destination.x,
      destination.y,
      destination.x - Math.cos(angle) * length - Math.sin(angle) * width,
      destination.y - Math.sin(angle) * length + Math.cos(angle) * width,
      destination.x - Math.cos(angle) * length + Math.sin(angle) * width,
      destination.y - Math.sin(angle) * length - Math.cos(angle) * width,
    );
  }
  for (const { fleet, point, scale } of markers) {
    const hostile = pirateIds.includes(fleet.id);
    const selected = interaction.mapFleetId === fleet.id;
    const hovered = interaction.hoveredFleetId === fleet.id;
    const needsOrder = attentionFleetIds.includes(fleet.id);
    const availableTransport =
      routeView !== null &&
      !fleet.routeId &&
      !fleet.upgrade &&
      !fleet.destination &&
      !fleet.joinFleetId &&
      fleet.ships['Transport ship'] > 0;
    const color = hostile
      ? '#ff8e85'
      : selected
        ? '#ffdc88'
        : hovered
          ? '#d5fff6'
          : needsOrder
            ? '#ffdc88'
            : availableTransport
              ? '#d8a7ff'
              : '#72d8ca';
    if (
      hostile ||
      selected ||
      hovered ||
      showUnselectedRings ||
      availableTransport ||
      needsOrder ||
      (routeView && fleet.routeId)
    ) {
      const context = sketch.drawingContext as
        CanvasRenderingContext2D | undefined;
      context?.setLineDash(
        showUnselectedRings && !selected && !needsOrder
          ? [3 / zoom, 3 / zoom]
          : [],
      );
      sketch.stroke(color);
      sketch.strokeWeight((selected || needsOrder ? 2.5 : 1.5) / zoom);
      if (selected || hovered)
        sketch.fill(selected ? '#ffdc8833' : '#72d8ca33');
      else sketch.noFill();
      sketch.circle(
        point.x,
        point.y,
        FleetMapLayout.radius({ fleet, point, scale }, zoom) * 2,
      );
      context?.setLineDash([]);
    }
    if (
      hostile ||
      movementPoints.has(fleet.id) ||
      (routeView && (fleet.routeId || availableTransport))
    ) {
      sketch.noStroke();
      const width = (fleet.name.length * 6.5 + 10) / zoom;
      sketch.fill('#0a1520ed');
      sketch.rect(
        point.x - width / 2,
        point.y + 11 / zoom,
        width,
        16 / zoom,
        3 / zoom,
      );
      sketch.fill(color);
      sketch.textSize(11 / zoom);
      sketch.textAlign(sketch.CENTER, sketch.TOP);
      sketch.text(fleet.name, point.x, point.y + 13 / zoom);
    }
    const destination = destinationFor(fleet);
    const target = destination ? HexGeometry.toPoint(destination) : null;
    sketch.noStroke();
    sketch.fill(color);
    if (zoom < 0.2) {
      sketch.circle(point.x, point.y, 4 / zoom);
      continue;
    }
    for (const glyph of FleetMapLayout.glyphs({ fleet, point, scale }, zoom)) {
      const center = glyph.point;
      const angle = target
        ? Math.atan2(target.y - center.y, target.x - center.x)
        : -Math.PI / 2;
      const image = shipImages.get(hostile ? 'Space pirate' : glyph.type);
      if (image) {
        const longest = Math.max(image.width, image.height);
        const width = (glyph.size * image.width) / longest;
        const height = (glyph.size * image.height) / longest;
        sketch.push();
        sketch.translate(center.x, center.y);
        sketch.rotate(angle);
        sketch.image(image, -width / 2, -height / 2, width, height);
        sketch.pop();
      } else shipTriangle(sketch, center, glyph.size, angle);
    }
    if (zoom < 0.65) {
      sketch.textSize(10 / zoom);
      sketch.textAlign(sketch.CENTER, sketch.TOP);
      sketch.text(
        String(
          Object.values(fleet.ships).reduce((sum, count) => sum + count, 0),
        ),
        point.x + 10 / zoom,
        point.y - 5 / zoom,
      );
    }
  }
}

function shipTriangle(
  sketch: p5,
  center: Point,
  size: number,
  angle: number,
): void {
  const vertex = (forward: number, sideways: number): Point => ({
    x: center.x + Math.cos(angle) * forward - Math.sin(angle) * sideways,
    y: center.y + Math.sin(angle) * forward + Math.cos(angle) * sideways,
  });
  const tip = vertex((size * 2) / 3, 0);
  const left = vertex(-size / 3, size * 0.35);
  const right = vertex(-size / 3, -size * 0.35);
  sketch.triangle(tip.x, tip.y, left.x, left.y, right.x, right.y);
}
