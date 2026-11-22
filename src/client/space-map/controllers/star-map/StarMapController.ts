import type { MapViewport } from '../../models/MapScreen.js';
import type { HexCoordinate } from '../../../common/HexCoordinate.js';
import { type Point } from '../../../common/HexCoordinate.js';
import type {
  MapSelection,
  StarMapFacade,
} from '../../models/star-map/StarMapFacade.js';

export class StarMapController {
  constructor(private readonly facade: StarMapFacade) {}

  select(position: HexCoordinate): MapSelection {
    return this.facade.select(position);
  }

  fleetAtPoint(point: Point): string | null {
    return this.facade.fleetAtPoint(point);
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

  selectPoint(point: Point): MapSelection {
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
}
