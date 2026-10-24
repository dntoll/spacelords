import type p5 from 'p5';
import type { TradeRouteSnapshot } from '../models/Logistics.js';
import type { AppReadModel } from '../models/AppModel.js';
import { FleetMapLayout } from '../models/FleetMapLayout.js';
import type { FleetSnapshot, ShipType } from '../models/Game.js';
import { HexGeometry, type Point } from '../models/HexCoordinate.js';

const shipSizes: Readonly<Record<ShipType, number>> = {
  Fighter: 5,
  'Exploration ship': 7,
  'Colony ship': 9,
  'Transport ship': 8,
};

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
): void {
  const markers = FleetMapLayout.markers(fleets, routeView ?? [], zoom);
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
    const selected = interaction.mapFleetId === fleet.id;
    const hovered = interaction.hoveredFleetId === fleet.id;
    const availableTransport =
      routeView !== null &&
      !fleet.routeId &&
      !fleet.destination &&
      !fleet.joinFleetId &&
      fleet.ships['Transport ship'] > 0;
    const color = selected
      ? '#ffdc88'
      : hovered
        ? '#d5fff6'
        : availableTransport
          ? '#d8a7ff'
          : '#72d8ca';
    if (
      selected ||
      hovered ||
      showUnselectedRings ||
      availableTransport ||
      (routeView && fleet.routeId)
    ) {
      const context = sketch.drawingContext as
        CanvasRenderingContext2D | undefined;
      context?.setLineDash(
        showUnselectedRings && !selected ? [3 / zoom, 3 / zoom] : [],
      );
      sketch.stroke(color);
      sketch.strokeWeight((selected ? 2 : 1.5) / zoom);
      if (selected || hovered)
        sketch.fill(selected ? '#ffdc8833' : '#72d8ca33');
      else sketch.noFill();
      sketch.circle(point.x, point.y, FleetMapLayout.hitRadius * 2);
      context?.setLineDash([]);
    }
    if (routeView && (fleet.routeId || availableTransport)) {
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
    const shipScale = Math.min(1 / zoom, scale);
    const sizes: number[] = [];
    // A bounded, round-robin sample preserves each ship type in large fleets.
    for (let layer = 0; layer < 9 && sizes.length < 9; layer += 1) {
      for (const type of Object.keys(shipSizes) as ShipType[]) {
        if (fleet.ships[type] > layer && sizes.length < 9)
          sizes.push(shipSizes[type]);
      }
    }
    const destination = destinationFor(fleet);
    const target = destination ? HexGeometry.toPoint(destination) : null;
    sketch.noStroke();
    sketch.fill(color);
    const columns = Math.min(3, sizes.length);
    const rows = Math.ceil(sizes.length / columns);
    sizes.forEach((size, index) => {
      const row = Math.floor(index / columns);
      const rowCount = Math.min(columns, sizes.length - row * columns);
      const center = {
        x: point.x + ((index % columns) - (rowCount - 1) / 2) * 8 * shipScale,
        y: point.y + (row - (rows - 1) / 2) * 8 * shipScale,
      };
      const angle = target
        ? Math.atan2(target.y - center.y, target.x - center.x)
        : -Math.PI / 2;
      shipTriangle(sketch, center, size * shipScale, angle);
    });
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
