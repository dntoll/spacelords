import type { MapViewport } from '../../models/ProductionMap.js';
import type { HexCoordinate } from '../../../common/HexCoordinate.js';
import { type Point } from '../../../common/HexCoordinate.js';
import type { FleetCategory } from '../../models/fleets/FleetCategory.js';
import type { StarMapFacade } from '../../models/star-map/StarMapFacade.js';

export class StarMapController {
  constructor(private readonly facade: StarMapFacade) {}

  select(position: HexCoordinate): void {
    return this.facade.select(position);
  }

  fleetAtPoint(point: Point): string | null {
    return this.facade.fleetAtPoint(point);
  }

  toggleFleetCategory(category: FleetCategory): void {
    return this.facade.toggleFleetCategory(category);
  }

  selectMapFleet(id: string): void {
    return this.facade.selectMapFleet(id);
  }

  hoverMapFleet(point: Point | null): boolean {
    return this.facade.hoverMapFleet(point);
  }

  previewFleetDestination(point: Point): void {
    return this.facade.previewFleetDestination(point);
  }

  commitFleetDestination(): void {
    return this.facade.commitFleetDestination();
  }

  cancelMapPointer(): void {
    return this.facade.cancelMapPointer();
  }

  selectPoint(point: Point): void {
    return this.facade.selectPoint(point);
  }

  openMap(): void {
    return this.facade.openMap();
  }

  pan(delta: Point): void {
    return this.facade.pan(delta);
  }

  zoom(factor: number, anchor: Point): void {
    return this.facade.zoom(factor, anchor);
  }

  home(): void {
    return this.facade.home();
  }

  resizeMap(viewport: MapViewport): void {
    return this.facade.resizeMap(viewport);
  }

  salvageAtPoint(point: Point): string | null {
    return this.facade.salvageAtPoint(point);
  }

  selectSalvage(id: string): void {
    return this.facade.selectSalvage(id);
  }

  orderSalvage(fleetId: string, wreckId: string): void {
    return this.facade.orderSalvage(fleetId, wreckId);
  }

  dropSalvage(point: Point): void {
    return this.facade.dropSalvage(point);
  }

  previewSalvage(point: Point): void {
    return this.facade.previewSalvage(point);
  }

  releaseWreck(fleetId: string, id: string): void {
    return this.facade.releaseWreck(fleetId, id);
  }

  rebuildShipyard(id: string): void {
    return this.facade.rebuildShipyard(id);
  }

  moveRepair(yardId: string, wreckId: string, index: number): void {
    return this.facade.moveRepair(yardId, wreckId, index);
  }

  cancelShipyardPlacement(): void {
    return this.facade.cancelShipyardPlacement();
  }

  placeShipyard(position: HexCoordinate): void {
    return this.facade.placeShipyard(position);
  }
}
