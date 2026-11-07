import { pirateAsFleet } from '../PirateFleet.js';
import type { MapViewport } from '../ProductionMap.js';
import { hitSalvageMarker } from '../SalvageMapLayout.js';
import { FleetMapLayout } from '../FleetMapLayout.js';
import {
  HexGeometry,
  type HexCoordinate,
  type Point,
} from '../HexCoordinate.js';
import type { AppHost } from '../AppModel.js';

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
      else if (this.host.orderSelection.page === 'colonize') {
        const planet = this.host.game.planetKnowledge(position)
          ? this.host.game.galaxy.systems
              .flatMap((system) => system.planets)
              .find((planet) => planet.position.key === position.key)
          : null;
        if (planet)
          this.host.completeOrder({ kind: 'colonize', planetId: planet.id });
      }
      return;
    }
    if (this.host.shipyardPlacement) {
      this.host.placeShipyard(position);
      return;
    }
    this.host.salvageSelection = null;
    if (!this.host.game.galaxy.cellAt(position)) {
      if (this.host.screen === 'production') {
        this.host.selected = position;
        this.host.mapProjectId = null;
        this.host.mapProductionOption = null;
        this.host.mapProductionPage = 0;
      }
      if (this.host.screen === 'fleets' && !this.host.destinationFleetId) {
        this.host.cancelShipTransfer();
        this.host.cancelFleetRename();
        this.host.mapFleetId = null;
      }
      return;
    }
    if (this.host.destinationFleetId) {
      if (this.host.destinationOrder === 'salvage') {
        const wrecks = this.host.game.wrecks.filter(
          (wreck) =>
            wreck.position.key === position.key &&
            !wreck.reservedBy &&
            !wreck.towedBy &&
            !wreck.yardId,
        );
        if (wrecks.length !== 1)
          throw new Error(
            'Choose a specific available wreck marker or select a wreck from the list.',
          );
        this.host.selectSalvage(wrecks[0]!.id);
      } else if (this.host.destinationOrder === 'colonize')
        this.host.game.setColonization(this.host.destinationFleetId, position);
      else
        this.host.game.setDestination(this.host.destinationFleetId, position);
      this.host.destinationFleetId = null;
      this.host.destinationOrder = 'move';
    } else if (this.host.mapTrade.snapshot.sourcePlanetId) {
      const world = HexGeometry.toPoint(position);
      const camera = this.host.camera.snapshot;
      this.host.previewMapRoute({
        x: (world.x - camera.center.x) * camera.zoom,
        y: (world.y - camera.center.y) * camera.zoom,
      });
      this.host.commitMapRoute();
    } else {
      this.host.cancelShipTransfer();
      this.host.cancelFleetRename();
      this.host.mapTrade.clearSelection();
      if (this.host.selected.key !== position.key) {
        this.host.mapProductionOption = null;
        this.host.mapProductionPage = 0;
        this.host.mapProjectId = null;
      }
      this.host.selected = position;
      this.host.mapFleetId = null;
      this.host.fitProduction();
    }
  }

  fleetAtPoint(point: Point): string | null {
    if (
      this.host.screen === 'orders' &&
      this.host.orderSelection?.page !== 'fleets'
    )
      return null;
    if (
      !this.host.isMapScreen() ||
      this.host.screen === 'production' ||
      this.host.destinationFleetId ||
      this.host.mapTrade.snapshot.sourcePlanetId
    )
      return null;
    return FleetMapLayout.hit(
      [
        ...this.host.game
          .fleetSnapshots()
          .filter(
            (fleet) =>
              this.host.screen !== 'orders' ||
              this.host.orderSelection?.page !== 'fleets' ||
              !fleet.routeId,
          ),
        ...(this.host.screen === 'orders'
          ? []
          : this.host.game.pirateSnapshots().map(pirateAsFleet)),
      ],
      this.host.camera.screenToWorld(point),
      this.host.screen === 'route' ? this.host.game.tradeRoutes : [],
      this.host.camera.snapshot.zoom,
    );
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
    this.host.salvageSelection = null;
    if (!this.host.isMapScreen() || this.host.screen === 'production') return;
    const pirate = this.host.game
      .pirateSnapshots()
      .find((pirate) => pirate.id === id);
    const fleet =
      this.host.game.fleet(id) ?? (pirate ? pirateAsFleet(pirate) : null);
    if (fleet && Object.values(fleet.ships).some((count) => count > 0)) {
      this.host.mapTrade.clearSelection();
      this.host.mapFleetId = id;
    }
  }

  hoverMapFleet(point: Point | null): boolean {
    const next = point ? this.host.fleetAtPoint(point) : null;
    const changed = this.host.mapTrade.hover(
      this.host.screen === 'fleets' || this.host.screen === 'production' || next
        ? null
        : point,
    );
    if (next === this.host.hoveredFleetId) return changed;
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
    if (
      this.host.game.phase === 'planning' &&
      (this.host.screen === 'map' || this.host.screen === 'route') &&
      this.host.mapTrade.hoverAssignment(this.host.mapFleetId, point)
    ) {
      this.host.fleetDestinationPreview = null;
      return;
    }
    const target = HexGeometry.fromPoint(this.host.camera.screenToWorld(point));
    this.host.fleetDestinationPreview =
      !this.host.game.fleet(this.host.mapFleetId)?.routeId &&
      this.host.game.galaxy.cellAt(target)
        ? target
        : null;
  }

  commitFleetDestination(): void {
    const trade = this.host.mapTrade.snapshot;
    if (
      (this.host.screen === 'map' || this.host.screen === 'route') &&
      this.host.mapFleetId &&
      trade.hoveredRouteIds.length
    ) {
      const id = this.host.mapFleetId;
      const candidates = trade.hoveredRouteIds;
      this.host.cancelMapPointer();
      if (candidates.length > 1) this.host.mapTrade.choose(candidates, id);
      else this.host.assignMapTradeFleet(candidates[0]!, id);
      return;
    }
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

  cancelMapPointer(keepRouteSource = false): void {
    this.host.mapTrade.cancel(keepRouteSource);
    this.host.hoveredFleetId = null;
    this.host.fleetDestinationPreview = null;
    this.host.fleetDragging = false;
  }

  selectPoint(point: Point): void {
    const world = this.host.camera.screenToWorld(point);
    const hex = HexGeometry.fromPoint(world);
    if (
      (this.host.screen === 'map' || this.host.screen === 'route') &&
      !this.host.destinationFleetId &&
      !this.host.mapTrade.snapshot.sourcePlanetId
    ) {
      const cell = this.host.game
        .mapSnapshot()
        .find((c) => c.position.key === hex.key);
      const center = HexGeometry.toPoint(hex);
      const onPlanet =
        cell?.object?.kind === 'planet' &&
        Math.hypot(world.x - center.x, world.y - center.y) <=
          Math.max(8.5, 12 / this.host.camera.snapshot.zoom);
      const routes = onPlanet ? [] : this.host.mapTrade.hits(point);
      if (routes.length === 1) {
        this.host.selectMapRoute(routes[0]!);
        return;
      }
      if (routes.length > 1) {
        this.host.mapFleetId = null;
        this.host.mapTrade.clearSelection();
        this.host.mapTrade.choose(routes);
        return;
      }
    }
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
    this.host.mapTrade.clearSelection();
    this.host.camera.reset();
    this.host.selected = this.host.game.galaxy.homePlanet.position;
    this.host.requestMapFocus(this.host.selected);
    this.host.mapFleetId = null;
    this.host.mapProjectId = null;
    this.host.mapProductionOption = null;
    this.host.mapProductionPage = 0;
    this.host.fitProduction();
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
    this.host.fitProduction();
  }

  salvageAtPoint(point: Point): string | null {
    if (
      this.host.screen === 'orders' &&
      this.host.orderSelection?.page !== 'salvage'
    )
      return null;
    if (
      !this.host.isMapScreen() ||
      (this.host.destinationFleetId &&
        this.host.destinationOrder !== 'salvage') ||
      this.host.shipyardPlacement
    )
      return null;
    return (
      hitSalvageMarker(
        this.host.game.wrecks,
        this.host.game.shipyards,
        this.host.camera.snapshot.zoom,
        this.host.camera.screenToWorld(point),
      )?.id ?? null
    );
  }

  selectSalvage(id: string): void {
    if (this.host.screen === 'orders') {
      if (this.host.orderSelection?.page === 'salvage')
        this.host.completeOrder({ kind: 'salvage', wreckId: id });
      return;
    }
    if (
      this.host.destinationFleetId &&
      this.host.destinationOrder === 'salvage'
    ) {
      this.host.orderSalvage(this.host.destinationFleetId, id);
      this.host.destinationFleetId = null;
      this.host.destinationOrder = 'move';
      return;
    }
    this.host.shipyardPlacement = null;
    this.host.screen = 'map';
    this.host.salvageSelection = id;
    this.host.mapFleetId = null;
  }

  orderSalvage(fleetId: string, wreckId: string): void {
    this.host.game.orderSalvage(fleetId, wreckId);
    this.host.salvageSelection = null;
    this.host.mapFleetId = fleetId;
  }

  dropSalvage(point: Point): void {
    const fleetId = this.host.salvageDropTarget(point);
    if (!fleetId || !this.host.salvageSelection)
      throw new Error('Drop the wreck onto a fleet with a Salvage ship.');
    this.host.orderSalvage(fleetId, this.host.salvageSelection);
    this.host.hoveredFleetId = null;
  }

  previewSalvage(point: Point): void {
    this.host.hoveredFleetId = this.host.salvageDropTarget(point);
  }

  returnToShipyard(id: string): void {
    this.host.game.returnToShipyard(id);
  }

  releaseWreck(fleetId: string, id: string): void {
    this.host.game.releaseWreck(fleetId, id);
  }

  beginShipyardPlacement(
    planetId: string,
    site?: number,
    yardId: string | null = null,
  ): void {
    const choices = this.host.game.freeShipyardHexes(planetId);
    if (!choices.length)
      throw new Error('No free neighboring hex is available.');
    this.host.shipyardPlacement = Object.freeze({
      planetId,
      site,
      yardId,
      choices,
    });
    this.host.screen = 'map';
    this.host.salvageSelection = null;
    this.host.mapFleetId = null;
  }

  rebuildShipyard(id: string): void {
    const yard = this.host.game.shipyards.find((item) => item.id === id);
    if (yard) this.host.beginShipyardPlacement(yard.planetId, undefined, id);
  }

  moveRepair(yardId: string, wreckId: string, index: number): void {
    this.host.game.moveRepair(yardId, wreckId, index);
  }

  cancelShipyardPlacement(): void {
    this.host.shipyardPlacement = null;
  }

  placeShipyard(position: HexCoordinate): void {
    const placement = this.host.shipyardPlacement;
    if (!placement) return;
    if (placement.yardId)
      this.host.game.scheduleRebuildShipyard(placement.yardId, position);
    else
      this.host.game.scheduleBuild(
        this.host.game.galaxy.systems
          .flatMap((system) => system.planets)
          .find((planet) => planet.id === placement.planetId)!,
        'Orbital shipyard',
        placement.site,
        position,
      );
    this.host.shipyardPlacement = null;
    this.host.notice = Object.freeze({ kind: 'shipyard-queued' });
  }
}
