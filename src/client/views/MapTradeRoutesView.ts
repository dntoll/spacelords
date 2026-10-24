import type p5 from 'p5';
import type { AppReadModel } from '../models/AppModel.js';
import { HexGeometry } from '../models/HexCoordinate.js';
import { tradeAssignmentIssue } from '../models/TradeAssignment.js';

export function renderMapTradeRoutes(sketch: p5, model: AppReadModel): void {
  const zoom = model.camera.zoom;
  const context = sketch.drawingContext as CanvasRenderingContext2D | undefined;
  for (const route of model.tradeRoutes) {
    const target =
      model.screen === 'map' &&
      model.mapTrade.hoveredRouteIds.includes(route.id);
    const fleet = model.fleets.find(
      (f) => f.id === model.mapTrade.assignmentFleetId,
    );
    const invalid = target && fleet && tradeAssignmentIssue(fleet, route);
    const selected =
      model.screen === 'map' && model.mapTrade.routeId === route.id;
    sketch.stroke(
      model.screen === 'fleets'
        ? '#2b3d50'
        : invalid
          ? '#ef8d85'
          : selected
            ? '#ffdc88'
            : target
              ? '#b1e4d1'
              : '#547caa',
    );
    sketch.strokeWeight(
      (model.screen === 'fleets' ? 1 : selected || target ? 3 : 2) / zoom,
    );
    context?.setLineDash(
      route.closing || !route.hasActiveTransport ? [7 / zoom, 5 / zoom] : [],
    );
    const from = HexGeometry.toPoint(route.start),
      to = HexGeometry.toPoint(route.end);
    sketch.line(from.x, from.y, to.x, to.y);
  }
  context?.setLineDash([]);
  const preview = model.mapTrade.preview;
  if (!preview || model.screen === 'fleets') return;
  const color = preview.issue ? '#ef8d85' : '#b1e4d1';
  sketch.stroke(color);
  sketch.strokeWeight(2 / zoom);
  context?.setLineDash([6 / zoom, 4 / zoom]);
  sketch.line(preview.start.x, preview.start.y, preview.end.x, preview.end.y);
  context?.setLineDash([]);
  sketch.noFill();
  sketch.circle(preview.end.x, preview.end.y, 26 / zoom);
  sketch.noStroke();
  sketch.fill(color);
  sketch.textAlign(sketch.CENTER, sketch.BOTTOM);
  sketch.textSize(12 / zoom);
  sketch.text(
    preview.label,
    (preview.start.x + preview.end.x) / 2,
    (preview.start.y + preview.end.y) / 2 - 12 / zoom,
  );
}
