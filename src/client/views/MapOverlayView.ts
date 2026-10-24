import type p5 from 'p5';
import type { AppReadModel } from '../models/AppModel.js';
import { renderMapFleets } from './FleetMapView.js';
import { renderPlanetOrders } from './PlanetOrderView.js';

export function renderMapOverlays(sketch: p5, model: AppReadModel): void {
  if (model.screen === 'map')
    renderPlanetOrders(sketch, model.planetOrders, model.camera.zoom);
  // kartflottor: colony badges must not hide selectable fleet markers.
  renderMapFleets(
    sketch,
    model.fleets,
    model.camera.zoom,
    model,
    model.screen === 'fleets',
  );
}
