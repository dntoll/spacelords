import { pirateAsFleet } from '../PirateFleet.js';
import type { MapViewport } from '../MapScreen.js';
import { FleetMapLayout } from './FleetMapLayout.js';
import { fleetCategory, type FleetCategory } from '../fleets/FleetCategory.js';
import {
  HexGeometry,
  type HexCoordinate,
  type Point,
} from '../../../common/HexCoordinate.js';
import type { AppHost } from '../../../app/models/AppModel.js';

export class StarMapFacade {
  constructor(private readonly host: AppHost) {}

  select(position: HexCoordinate): void {
    if (!this.host.isMapScreen()) return;
    if (this.host.screen === 'orders' && this.host.orderSelection) {
      if (this.host.orderSelection.page === 'patrol')
        this.host.completeOrder({
          kind: 'patrol',
          position: { q: position.q, r: position.r },
        });
      else if (this.host.orderSelection.page === 'explore-planet') {
        const intel = this.host.game.planetIntel(position);
        const planet =
          intel && !intel.surveyed
            ? this.host.game.galaxy.systems
                .flatMap((system) => system.planets)
                .find((planet) => planet.position.key === position.key)
            : null;
        if (planet)
          this.host.completeOrder({
            kind: this.host.orderSelection.page,
            planetId: planet.id,
          });
      }
      return;
    }
    if (!this.host.game.galaxy.cellAt(position)) {
      if (this.host.screen === 'fleets' && !this.host.destinationFleetId) {
        this.host.cancelShipTransfer();
        this.host.cancelFleetRename();
        this.host.mapFleetId = null;
      }
      return;
    }
    if (this.host.destinationFleetId) {
      this.host.game.setDestination(this.host.destinationFleetId, position);
      this.host.destinationFleetId = null;
    } else {
      this.host.cancelShipTransfer();
      this.host.cancelFleetRename();
      this.host.selected = position;
      this.host.mapFleetId = null;
    }
  }

  fleetAtPoint(point: Point): string | null {
    if (
      this.host.screen === 'orders' &&
      this.host.orderSelection?.page !== 'fleets'
    )
      return null;
    if (!this.host.isMapScreen() || this.host.destinationFleetId) return null;
    return FleetMapLayout.hit(
      [
        ...this.host.game
          .fleetSnapshots()
          .filter(
            (fleet) =>
              this.host.screen !== 'fleets' ||
              !this.host.hiddenFleetCategories.has(fleetCategory(fleet)),
          ),
        ...(this.host.screen === 'orders'
          ? []
          : this.host.game.pirateSnapshots().map(pirateAsFleet)),
      ],
      this.host.camera.screenToWorld(point),
      this.host.camera.snapshot.zoom,
    );
  }

  /** flottkategorier: show or hide one category on the Fleets map. */
  toggleFleetCategory(category: FleetCategory): void {
    const hidden = this.host.hiddenFleetCategories;
    if (hidden.has(category)) hidden.delete(category);
    else hidden.add(category);
    const selected = this.host.mapFleetId
      ? this.host.game.fleet(this.host.mapFleetId)
      : null;
    if (selected && hidden.has(fleetCategory(selected)))
      this.host.mapFleetId = null;
  }

  selectMapFleet(id: string): void {
    if (this.host.screen === 'orders') {
      if (
        this.host.orderSelection?.page === 'fleets' &&
        this.host.orderSnapshot()?.fleetTargets.some((fleet) => fleet.id === id)
      ) {
        this.host.orderSelection = {
          ...this.host.orderSelection,
          selectedFleetId: id,
        };
        this.host.mapFleetId = id;
      }
      return;
    }
    if (!this.host.isMapScreen() || this.host.screen === 'production') return;
    const pirate = this.host.game
      .pirateSnapshots()
      .find((pirate) => pirate.id === id);
    const fleet =
      this.host.game.fleet(id) ?? (pirate ? pirateAsFleet(pirate) : null);
    if (fleet && Object.values(fleet.ships).some((count) => count > 0)) {
      this.host.mapFleetId = id;
    }
  }

  hoverMapFleet(point: Point | null): boolean {
    const next = point ? this.host.fleetAtPoint(point) : null;
    if (next === this.host.hoveredFleetId) return false;
    this.host.hoveredFleetId = next;
    return true;
  }

  previewFleetDestination(point: Point): void {
    if (this.host.screen === 'orders') return;
    if (
      !this.host.isMapScreen() ||
      this.host.screen === 'production' ||
      !this.host.mapFleetId ||
      !this.host.game.fleet(this.host.mapFleetId) ||
      !this.host.game.canIssueFleetOrders(this.host.mapFleetId)
    )
      return;
    this.host.fleetDragging = true;
    const target = HexGeometry.fromPoint(this.host.camera.screenToWorld(point));
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

  selectPoint(point: Point): void {
    const world = this.host.camera.screenToWorld(point);
    const hex = HexGeometry.fromPoint(world);
    this.host.select(hex);
  }

  openMap(): void {
    this.host.openMapScreen('map');
  }

  pan(delta: Point): void {
    this.host.pendingMapFocus = null;
    this.host.camera.panBy(delta);
  }

  zoom(factor: number, anchor: Point): void {
    this.host.pendingMapFocus = null;
    this.host.camera.zoomAt(factor, anchor);
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
