import { pirateAsFleet } from '../../models/PirateFleet.js';
import { type Point } from '../../../common/HexCoordinate.js';
import type p5 from 'p5';
import type { AppReadModel } from '../../../app/models/AppModel.js';
import type { ShipSpriteType } from '../ShipImages.js';
import { renderMapFleets } from './FleetMapView.js';

export function renderMapOverlays(
  sketch: p5,
  model: AppReadModel,
  movementPoints: ReadonlyMap<string, Point> = new Map(),
  shipImages: ReadonlyMap<ShipSpriteType, p5.Image> = new Map(),
): void {
  if (model.screen === 'production') return;
  renderMapFleets(
    sketch,
    [model.fleet, ...(model.pirates ?? []).map(pirateAsFleet)].map((fleet) =>
      (model.turnMovement || model.eventPlayback) &&
      !model.turnMovements.some((movement) => movement.fleetId === fleet.id)
        ? { ...fleet, destination: null }
        : fleet,
    ),
    model.camera.zoom,
    model,
    model.screen === 'fleets',
    (model.pirates ?? []).map((pirate) => pirate.id),
    movementPoints,
    shipImages,
    model.screen === 'fleets',
  );
}
