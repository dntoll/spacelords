import { decisionScreen, needsAttention } from '../models/Decisions.js';
import { HexGeometry } from '../models/HexCoordinate.js';
import type p5 from 'p5';
import type { AppReadModel } from '../models/AppModel.js';
import { renderMapFleets } from './FleetMapView.js';
import { renderPlanetOrders } from './PlanetOrderView.js';

export function renderMapOverlays(sketch: p5, model: AppReadModel): void {
  if (model.screen === 'map')
    renderPlanetOrders(sketch, model.planetOrders, model.camera.zoom);
  if (model.screen === 'route' || model.screen === 'production') {
    for (const planet of model.ownedPlanets) {
      const point = HexGeometry.toPoint(planet.position);
      const attention = model.mapProblems.some(
        (p) => p.planetId === planet.id && p.screen === model.screen,
      );
      const decision = model.decisions.some(
        (decision) =>
          needsAttention(decision) &&
          decision.planetId === planet.id &&
          decisionScreen(decision) === model.screen,
      );
      const chain =
        model.screen === 'production'
          ? model.supplyChain.planets.find((p) => p.id === planet.id)
          : null;
      if (!attention && !decision && !chain) continue;
      const zoom = model.camera.zoom;
      sketch.noFill();
      sketch.stroke(attention ? '#ff8e85' : '#ffdc88');
      sketch.strokeWeight(2.5 / zoom);
      sketch.circle(point.x, point.y, 42 / zoom);
      sketch.noStroke();
      sketch.fill(attention ? '#ffaaa2' : '#ffdc88');
      sketch.textSize(12 / zoom);
      sketch.textAlign(sketch.CENTER, sketch.BOTTOM);
      sketch.text(
        attention || decision ? '!' : chain!.roles.join(' / '),
        point.x,
        point.y - 24 / zoom,
      );
    }
  }
  if (model.screen === 'production') return;
  // kartflottor: colony badges must not hide selectable fleet markers.
  renderMapFleets(
    sketch,
    model.fleets,
    model.camera.zoom,
    model,
    model.screen === 'fleets',
    model.screen === 'route' ? model.tradeRoutes : null,
    model.screen === 'fleets'
      ? model.decisions
          .filter(needsAttention)
          .flatMap((decision) => (decision.fleetId ? [decision.fleetId] : []))
      : [],
  );
}
