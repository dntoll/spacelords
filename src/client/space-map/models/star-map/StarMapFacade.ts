import { pirateAsFleet } from '../PirateFleet.js';
import type { MapViewport } from '../MapScreen.js';
import { FleetMapLayout } from './FleetMapLayout.js';
import { travelFleet } from './Travel.js';
import {
  HexGeometry,
  type HexCoordinate,
  type Point,
} from '../../../common/HexCoordinate.js';
import type { AppHost } from '../../../app/models/AppModel.js';

/** What a tap on the map did; the master starts a journey on `travel`. */
export type MapSelection =
  'ignored' | 'selected' | 'destination' | 'travel' | 'resume';

export class StarMapFacade {
  constructor(private readonly host: AppHost) {}

  /**
   * hexval-med-vag: the first tap selects a hex and shows the route there; a
   * second tap on the selected hex sends the fleet on its way.
   */
  select(position: HexCoordinate): MapSelection {
    if (!this.host.isMapScreen()) return 'ignored';
    if (!this.host.game.galaxy.cellAt(position)) {
      if (this.host.screen === 'fleets' && !this.host.destinationFleetId) {
        this.host.cancelFleetRename();
        this.host.mapFleetId = null;
      }
      return 'ignored';
    }
    if (this.host.destinationFleetId) {
      this.host.game.setDestination(this.host.destinationFleetId, position);
      this.host.destinationFleetId = null;
      return 'destination';
    }
    const fleet = travelFleet(this.host.game);
    const paused = this.host.game.discoveryPause();
    if (
      position.key === this.host.selected.key &&
      fleet &&
      (this.host.game.phase === 'planning' || paused) &&
      this.host.game.routePreview(fleet.id, position).length
    ) {
      this.host.game.setDestination(fleet.id, position);
      // upptackt-stannar-resan: a new hex continues this round only.
      this.host.voyage = !paused;
      return paused ? 'resume' : 'travel';
    }
    this.host.cancelFleetRename();
    this.host.voyage = false;
    this.host.selected = position;
    this.host.mapFleetId = null;
    return 'selected';
  }

  fleetAtPoint(point: Point): string | null {
    if (!this.host.isMapScreen() || this.host.destinationFleetId) return null;
    return FleetMapLayout.hit(
      [
        this.host.game.fleetSnapshot(),
        ...this.host.game.pirateSnapshots().map(pirateAsFleet),
      ],
      this.#shownCamera().screenToWorld(point),
      this.#shownCamera().snapshot.zoom,
    );
  }

  /**
   * hexval-med-vag / strid-i-samma-hex: a pirate is selected like its hex, so
   * a second tap on it sends the fleet there to fight.
   */
  selectMapFleet(id: string): MapSelection {
    if (!this.host.isMapScreen()) return 'ignored';
    const pirate = this.host.game
      .pirateSnapshots()
      .find((pirate) => pirate.id === id);
    if (pirate) {
      if (this.host.mapFleetId === id) return this.select(pirate.position);
      this.host.voyage = false;
      this.host.selected = pirate.position;
      this.host.mapFleetId = id;
      return 'selected';
    }
    const fleet = this.host.game.fleet(id);
    if (fleet && Object.values(fleet.ships).some((count) => count > 0)) {
      this.host.mapFleetId = id;
      return 'selected';
    }
    return 'ignored';
  }

  hoverMapFleet(point: Point | null): boolean {
    const next = point ? this.host.fleetAtPoint(point) : null;
    if (next === this.host.hoveredFleetId) return false;
    this.host.hoveredFleetId = next;
    return true;
  }

  previewFleetDestination(point: Point): void {
    if (
      !this.host.isMapScreen() ||
      !this.host.mapFleetId ||
      !this.host.game.fleet(this.host.mapFleetId) ||
      !this.host.game.canIssueFleetOrders(this.host.mapFleetId)
    )
      return;
    this.host.fleetDragging = true;
    const target = HexGeometry.fromPoint(
      this.#shownCamera().screenToWorld(point),
    );
    this.host.fleetDestinationPreview = this.host.game.galaxy.cellAt(target)
      ? target
      : null;
  }

  commitFleetDestination(): void {
    try {
      if (
        this.host.mapFleetId &&
        this.host.fleetDragging &&
        this.host.fleetDestinationPreview
      )
        this.host.game.setDestination(
          this.host.mapFleetId,
          this.host.fleetDestinationPreview,
        );
    } finally {
      this.host.cancelMapPointer();
    }
  }

  cancelMapPointer(): void {
    this.host.hoveredFleetId = null;
    this.host.fleetDestinationPreview = null;
    this.host.fleetDragging = false;
  }

  selectPoint(point: Point): MapSelection {
    const world = this.#shownCamera().screenToWorld(point);
    return this.select(HexGeometry.fromPoint(world));
  }

  /** klick-pa-synlig-hex: hits use the camera the map is drawing. */
  #shownCamera() {
    return this.host.eventCamera ?? this.host.camera;
  }

  openMap(): void {
    this.host.openMapScreen('map');
  }

  pan(delta: Point): void {
    this.host.pendingMapFocus = null;
    this.#shownCamera().panBy(delta);
  }

  zoom(factor: number, anchor: Point): void {
    this.host.pendingMapFocus = null;
    this.#shownCamera().zoomAt(factor, anchor);
  }

  home(): void {
    this.host.camera.reset();
    this.host.selected = this.host.game.galaxy.homePlanet.position;
    this.host.requestMapFocus(this.host.selected);
    this.host.mapFleetId = null;
  }

  resizeMap(viewport: MapViewport): void {
    if (!Object.values(viewport).every((v) => Number.isFinite(v) && v > 0))
      return;
    const previous = this.host.mapViewport;
    this.host.mapViewport = Object.freeze({ ...viewport });
    if (
      this.host.eventCamera &&
      this.host.playbackPositions.length &&
      (!previous ||
        previous.width !== viewport.width ||
        previous.height !== viewport.height ||
        previous.availableWidth !== viewport.availableWidth ||
        previous.availableHeight !== viewport.availableHeight)
    ) {
      const animating = !!this.host.cameraFraming;
      this.host.prepareCameraFraming();
      if (!animating) this.host.finishCameraFraming();
    }
    if (this.host.pendingMapFocus) {
      // centrerat-kartfokus: use the space left by the newly rendered panels.
      const x = (viewport.availableWidth - viewport.width) / 2;
      const y = (viewport.availableHeight - viewport.height) / 2;
      this.host.camera.reveal(this.host.pendingMapFocus, {
        left: x,
        right: x,
        top: y,
        bottom: y,
      });
      this.host.pendingMapFocus = null;
    }
  }
}
