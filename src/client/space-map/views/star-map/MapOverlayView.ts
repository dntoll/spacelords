import { pirateAsFleet } from '../../models/PirateFleet.js';
import { HexGeometry, type Point } from '../../../common/HexCoordinate.js';
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
  const memories = model.pirateMemories ?? [];
  const remembered = memories.filter((memory) => !memory.moved);
  renderMapFleets(
    sketch,
    [
      model.fleet,
      ...(model.pirates ?? []).map(pirateAsFleet),
      ...remembered.map((memory) => pirateAsFleet(memory.pirate)),
    ].map((fleet) =>
      model.turnMovement &&
      !model.turnMovements.some((movement) => movement.fleetId === fleet.id)
        ? { ...fleet, destination: null }
        : fleet,
    ),
    model.camera.zoom,
    model,
    model.screen === 'fleets',
    [
      ...(model.pirates ?? []).map((pirate) => pirate.id),
      ...remembered.map((memory) => memory.pirate.id),
    ],
    movementPoints,
    shipImages,
    model.screen === 'fleets',
    remembered.map((memory) => memory.pirate.id),
  );
  for (const memory of memories.filter((contact) => contact.moved)) {
    const point = HexGeometry.toPoint(memory.position);
    sketch.noStroke();
    sketch.fill('#ff8e85');
    sketch.textSize(20 / model.camera.zoom);
    sketch.textAlign(sketch.CENTER, sketch.CENTER);
    sketch.text('?', point.x, point.y);
  }
}
