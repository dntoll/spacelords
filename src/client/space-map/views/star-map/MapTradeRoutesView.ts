import type p5 from 'p5';
import type { AppReadModel } from '../../../app/models/AppModel.js';
import { HexGeometry } from '../../../common/HexCoordinate.js';
import { tradeAssignmentIssue } from '../../models/star-map/TradeAssignment.js';

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
    const invalid =
      target && fleet && tradeAssignmentIssue(fleet, route, model.fleets);
    const selected =
      model.screen === 'map' && model.mapTrade.routeId === route.id;
    sketch.stroke(
      model.screen === 'fleets' || model.screen === 'production'
        ? '#2b3d50'
        : invalid
          ? '#ef8d85'
          : selected
            ? '#ffdc88'
            : target
              ? '#b1e4d1'
              : '#83b8ed',
    );
    sketch.strokeWeight(
      (model.screen === 'fleets' ? 1 : selected || target ? 3.5 : 2.5) / zoom,
    );
    context?.setLineDash(
      route.closing || !route.hasActiveTransport ? [7 / zoom, 5 / zoom] : [],
    );
    const from = HexGeometry.toPoint(route.start),
      to = HexGeometry.toPoint(route.end);
    sketch.line(from.x, from.y, to.x, to.y);
  }
  context?.setLineDash([]);
}
