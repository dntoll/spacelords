import type { AppModel } from '../models/AppModel.js';
import { TurnMovementPlayback } from '../models/TurnMovementPlayback.js';
import type { AppIntent, AppPort } from '../views/ViewContracts.js';
import type { Point } from '../models/HexCoordinate.js';
import { MapGesture } from './MapGesture.js';

export class AppController {
  readonly #model: AppModel;
  readonly #view: AppPort;
  readonly #gesture = new MapGesture();
  readonly #researchGesture = new MapGesture();
  #runningTurn = false;
  #disposed = false;
  #receiptTimer: ReturnType<typeof setTimeout> | undefined;
  #playbackTimer: ReturnType<typeof setTimeout> | undefined;
  #fleetPointer: {
    id: number;
    start: Point;
    dragged: boolean;
    kind: 'fleet' | 'route' | 'wreck';
  } | null = null;

  constructor(model: AppModel, view: AppPort) {
    this.#model = model;
    this.#view = view;
  }

  start(): void {
    this.#view.bind((intent) => this.#handle(intent));
    this.#view.render(this.#model.snapshot);
    this.#schedulePlayback();
  }

  dispose(): void {
    this.#disposed = true;
    clearTimeout(this.#receiptTimer);
    clearTimeout(this.#playbackTimer);
    this.#cancelPointer();
    this.#view.dispose();
  }

  #handle(intent: AppIntent): void {
    try {
      if (intent.type !== 'map-size') this.#model.clearNotice();
      const receipt = this.#model.snapshot.productionReceipt;
      this.#handleIntent(intent);
      if (this.#model.snapshot.productionReceipt !== receipt) {
        clearTimeout(this.#receiptTimer);
        if (this.#model.snapshot.productionReceipt)
          this.#receiptTimer = setTimeout(() => {
            this.#model.clearProductionReceipt();
            this.#view.render(this.#model.snapshot);
          }, 3000);
      }
    } catch (error) {
      console.warn(error);
      this.#model.endMovementPlayback();
      this.#model.reportError(error);
      this.#view.render(this.#model.snapshot);
    }
  }

  #handleIntent(intent: AppIntent): void {
    const playback = this.#model.snapshot.eventPlayback;
    if (playback) {
      if (
        playback.stage === 'awaiting-choice' &&
        ['handle-discoveries', 'ignore-discoveries'].includes(intent.type)
      ) {
        this.#model.chooseEvent(
          intent.type === 'handle-discoveries' ? 'handle' : 'ignore',
        );
        this.#model.save();
        this.#view.render(this.#model.snapshot);
        this.#schedulePlayback();
      } else if (intent.type === 'map-size') {
        this.#model.resizeMap(intent.viewport);
        this.#view.render(this.#model.snapshot);
      }
      return;
    }
    if (this.#model.snapshot.turnMovement) return;
    let mapOrder = false;
    if (!intent.type.startsWith('research-pointer-'))
      this.#researchGesture.cancel();
    if (intent.type.startsWith('open-') || intent.type === 'end-turn') {
      this.#model.cancelShipyardPlacement();
      this.#model.cancelShipTransfer();
      this.#model.cancelFleetRename();
    }
    if (
      intent.type.startsWith('open-') ||
      ['home', 'pan', 'zoom', 'begin-destination', 'end-turn'].includes(
        intent.type,
      )
    )
      this.#cancelPointer(['pan', 'zoom'].includes(intent.type));
    if (
      this.#model.snapshot.screen === 'saves' &&
      ![
        'start-slot',
        'request-clear-slot',
        'cancel-clear-slot',
        'confirm-clear-slot',
      ].includes(intent.type)
    )
      return;
    switch (intent.type) {
      case 'salvage-wreck':
        this.#model.orderSalvage(intent.fleetId, intent.wreckId);
        break;
      case 'release-wreck':
        this.#model.releaseWreck(intent.fleetId, intent.id);
        break;
      case 'return-shipyard':
        this.#model.returnToShipyard(intent.id);
        break;
      case 'select-salvage':
        this.#model.selectSalvage(intent.id);
        break;
      case 'rebuild-shipyard':
        this.#model.rebuildShipyard(intent.id);
        break;
      case 'move-repair':
        this.#model.moveRepair(intent.yardId, intent.wreckId, intent.index);
        break;
      case 'cancel-shipyard-placement':
        this.#model.cancelShipyardPlacement();
        break;
      case 'place-shipyard':
        this.#model.placeShipyard(intent.position);
        break;
      case 'explore-fleet':
        this.#model.exploreFleet(intent.id, intent.order);
        break;
      case 'patrol-fleet':
        this.#model.patrolFleet(intent.id);
        break;
      case 'handle-discoveries':
        this.#model.handleDiscoveries();
        break;
      case 'allow-other-fleet-orders':
        this.#model.allowOtherFleetOrders();
        break;
      case 'continue-turn':
        if (this.#model.snapshot.interruption?.handling) {
          this.#model.continueEventHandling();
          this.#model.save();
          this.#view.render(this.#model.snapshot);
          this.#schedulePlayback();
          return;
        }
        void this.#runTurn(true);
        return;
      case 'ignore-discoveries':
        void this.#runTurn(true);
        return;
      case 'begin-fleet-rename':
        this.#model.beginFleetRename(intent.id);
        break;
      case 'edit-fleet-name':
        this.#model.editFleetName(intent.draft);
        break;
      case 'cancel-fleet-rename':
        this.#model.cancelFleetRename();
        // flottnamn-direktredigering: keep the blurred-to control alive until its click.
        if (intent.reason === 'blur') return;
        break;
      case 'submit-fleet-name':
        this.#model.submitFleetName();
        break;
      case 'map-select-route':
        this.#model.selectMapRoute(intent.id);
        break;
      case 'map-select-fleet':
        this.#model.selectMapFleet(intent.id);
        break;
      case 'begin-map-route':
        this.#model.beginMapRoute(intent.id);
        break;
      case 'cancel-map-trade':
        this.#cancelPointer();
        break;
      case 'open-route':
        this.#model.openRoute(intent.planetId);
        break;
      case 'open-production':
        this.#model.openProduction(intent.planetId);
        break;
      case 'map-production-category':
        this.#model.selectMapProductionCategory(intent.category);
        break;
      case 'map-production-page':
        this.#model.selectMapProductionPage(intent.page);
        break;
      case 'map-production-option':
        this.#model.selectMapProductionOption(intent.option);
        break;
      case 'map-production-project':
        this.#model.selectMapProject(intent.id);
        break;
      case 'map-production-build':
        this.#model.orderMapProduction(intent.option);
        break;
      case 'map-size':
        this.#model.resizeMap(intent.viewport);
        break;
      case 'supply-open-planet':
        this.#model.openSupplyPlanet(intent.id);
        break;
      case 'supply-open-route':
        this.#model.openSupplyRoute(intent.id);
        break;
      case 'research-size':
        this.#model.resizeResearch(intent.width, intent.height);
        break;
      case 'research-pan':
        this.#model.panResearch(intent.delta);
        break;
      case 'research-zoom':
        this.#model.zoomResearch(intent.factor, intent.anchor);
        break;
      case 'research-fit':
        this.#model.fitResearch();
        break;
      case 'inspect-research':
        this.#model.inspectResearch(intent.technology);
        break;
      case 'research-pointer-start':
        this.#researchGesture.start(intent.id, intent.point);
        return;
      case 'research-pointer-cancel':
        this.#researchGesture.cancel();
        return;
      case 'research-pointer-end':
        this.#researchGesture.end(intent.id);
        return;
      case 'research-pointer-move': {
        const action = this.#researchGesture.move(intent.id, intent.point);
        if (action.type === 'none') return;
        if (action.type === 'pan') this.#model.panResearch(action.delta);
        else {
          this.#model.zoomResearch(action.factor, action.previousCenter);
          this.#model.panResearch({
            x: action.center.x - action.previousCenter.x,
            y: action.center.y - action.previousCenter.y,
          });
        }
        break;
      }
      case 'open-decisions':
        this.#model.openDecisions();
        break;
      case 'open-decision':
        this.#model.openDecision(intent.id);
        break;
      case 'skip-decision':
        this.#model.skipDecision(intent.id);
        break;
      case 'mute-decision':
        this.#model.muteDecision(intent.id);
        break;
      case 'unmute-decision':
        this.#model.unmuteDecision(intent.id);
        break;
      case 'create-trade-route':
        this.#model.createTradeRoute(intent.a, intent.b);
        break;
      case 'assign-trade-fleet':
        this.#model.assignTradeFleet(intent.routeId, intent.fleetId);
        break;
      case 'release-trade-fleet':
        this.#model.releaseTradeFleet(intent.id);
        break;
      case 'close-trade-route':
        this.#model.closeTradeRoute(intent.id);
        break;
      case 'move-research':
        this.#model.moveResearch(intent.technology, intent.index);
        break;
      case 'remove-research':
        this.#model.requestResearchRemoval(intent.technology);
        break;
      case 'confirm-research-removal':
        this.#model.confirmResearchRemoval();
        break;
      case 'cancel-research-removal':
        this.#model.requestResearchRemoval(null);
        break;
      case 'cancel-end-turn':
        this.#model.cancelEndTurn();
        break;
      case 'confirm-end-turn':
        void this.#runTurn();
        return;
      case 'open-saves':
        this.#cancelPointer();
        this.#model.openSaves();
        break;
      case 'start-slot':
        this.#model.startSlot(intent.id);
        this.#schedulePlayback();
        break;
      case 'request-clear-slot':
        this.#model.requestClearSlot(intent.id);
        break;
      case 'cancel-clear-slot':
        this.#model.cancelClearSlot();
        break;
      case 'confirm-clear-slot':
        this.#model.confirmClearSlot();
        break;
      case 'open-map':
        this.#model.openMap();
        break;
      case 'open-planet':
        this.#model.openPlanet(intent.id);
        break;
      case 'open-research':
        this.#model.openResearch();
        break;
      case 'open-fleets':
        this.#model.openFleets();
        break;
      case 'building-category':
        this.#model.selectBuildingCategory(intent.category);
        break;
      case 'building-selection':
        this.#model.selectBuilding(intent.building);
        break;
      case 'build-search':
        this.#model.searchBuildings(intent.query);
        break;
      case 'home':
        this.#model.home();
        break;
      case 'select': {
        const snapshot = this.#model.snapshot;
        mapOrder =
          !!snapshot.destinationFleetId || !!snapshot.mapTrade.sourcePlanetId;
        this.#model.select(intent.position);
        break;
      }
      case 'pan':
        this.#model.pan(intent.delta);
        break;
      case 'zoom':
        this.#model.zoom(intent.factor, intent.anchor);
        break;
      case 'build':
        this.#model.build(intent.building, intent.slotIndex);
        break;
      case 'planet-tab':
        this.#model.selectPlanetTab(intent.tab);
        break;
      case 'production-selection':
        this.#model.selectProduction(intent.category, intent.product);
        break;
      case 'production-fleet':
        this.#model.selectProductionFleet(intent.id);
        break;
      case 'project-supply':
        this.#model.toggleProjectSupply(intent.id, intent.open);
        break;
      case 'open-planet-project':
        this.#model.openPlanetProject(intent.planetId, intent.projectId);
        break;
      case 'build-site':
        this.#model.openBuildSite(intent.index);
        break;
      case 'research':
        this.#model.research(intent.technology);
        break;
      case 'colonize':
        this.#model.colonize(intent.id);
        break;
      case 'queue-ship':
        this.#model.scheduleShip(intent.ship, intent.fleetId, intent.factoryId);
        break;
      case 'queue-component':
        this.#model.scheduleComponent(intent.component);
        break;
      case 'move-project':
        this.#model.moveProject(intent.id, intent.index);
        break;
      case 'project-fleet':
        this.#model.setProjectFleet(intent.id, intent.fleetId);
        break;
      case 'cancel-project':
        this.#model.cancelProject(intent.id);
        break;
      case 'toggle-demolition':
        this.#model.toggleDemolition(intent.id);
        break;
      case 'produce-fighter':
        this.#model.produceFighter();
        break;
      case 'select-fleet':
        this.#model.selectFleet(intent.id);
        break;
      case 'open-fleet':
        this.#model.openFleet(intent.id);
        break;
      case 'rename-fleet':
        this.#model.renameFleet(intent.id, intent.name);
        break;
      case 'choose-ship-transfer':
        this.#model.chooseShipTransfer(
          intent.fleetId,
          intent.ship,
          intent.shipId,
        );
        break;
      case 'transfer-chosen-ship':
        this.#model.transferChosenShip(intent.target);
        break;
      case 'cancel-ship-transfer':
        this.#model.cancelShipTransfer();
        break;
      case 'transfer-ships':
        this.#model.transferShips(
          intent.source,
          intent.ship,
          intent.amount,
          intent.target,
          intent.shipId,
        );
        break;
      case 'begin-destination':
        this.#model.beginDestination(intent.id);
        break;
      case 'clear-destination':
        this.#model.clearDestination(intent.id);
        break;
      case 'create-fleet':
        this.#model.createFleet(intent.id);
        break;
      case 'delete-fleet':
        this.#model.deleteFleet(intent.id);
        break;
      case 'end-turn':
        if (this.#model.requestEndTurn()) {
          void this.#runTurn();
          return;
        }
        break;
      case 'pointer-start': {
        this.#gesture.start(intent.id, intent.point);
        if (this.#gesture.pointerCount > 1) {
          this.#fleetPointer = null;
          this.#model.cancelMapPointer();
        } else {
          const salvageId = this.#model.salvageAtPoint(intent.point);
          if (salvageId) {
            this.#model.selectSalvage(salvageId);
            this.#fleetPointer = {
              id: intent.id,
              start: intent.point,
              dragged: false,
              kind: 'wreck',
            };
            break;
          }
          const fleetId = this.#model.fleetAtPoint(intent.point);
          const source = fleetId
            ? null
            : this.#model.mapRouteDragSource(intent.point);
          if (!fleetId && !source) return;
          if (fleetId) this.#model.selectMapFleet(fleetId);
          this.#fleetPointer = {
            id: intent.id,
            start: intent.point,
            dragged: false,
            kind: fleetId ? 'fleet' : 'route',
          };
        }
        break;
      }
      case 'map-leave':
        if (!this.#model.hoverMapFleet(null)) return;
        break;
      case 'pointer-cancel':
        this.#model.cancelShipyardPlacement();
        this.#cancelPointer();
        if (this.#model.snapshot.screen === 'fleets') this.#model.openFleets();
        break;
      case 'pointer-move': {
        if (this.#fleetPointer?.id === intent.id) {
          this.#gesture.move(intent.id, intent.point);
          if (
            Math.hypot(
              intent.point.x - this.#fleetPointer.start.x,
              intent.point.y - this.#fleetPointer.start.y,
            ) > 6
          )
            this.#fleetPointer.dragged = true;
          if (this.#fleetPointer.dragged) {
            if (this.#fleetPointer.kind === 'wreck') {
              this.#model.previewSalvage(intent.point);
              break;
            }
            if (this.#fleetPointer.kind === 'route') {
              const source = this.#model.mapRouteDragSource(
                this.#fleetPointer.start,
              );
              if (source) this.#model.beginMapRoute(source);
              this.#model.previewMapRoute(intent.point);
            } else this.#model.previewFleetDestination(intent.point);
          }
          break;
        }
        if (this.#gesture.pointerCount === 0) {
          if (!this.#model.hoverMapFleet(intent.point)) return;
          break;
        }
        const action = this.#gesture.move(intent.id, intent.point);
        if (action.type === 'none') return;
        this.#model.hoverMapFleet(null);
        if (action.type === 'pan') this.#model.pan(action.delta);
        else {
          this.#model.zoom(action.factor, action.previousCenter);
          this.#model.pan({
            x: action.center.x - action.previousCenter.x,
            y: action.center.y - action.previousCenter.y,
          });
        }
        break;
      }
      case 'pointer-end': {
        if (this.#fleetPointer?.id === intent.id) {
          const dragged =
            this.#fleetPointer.dragged ||
            Math.hypot(
              intent.point.x - this.#fleetPointer.start.x,
              intent.point.y - this.#fleetPointer.start.y,
            ) > 6;
          this.#gesture.end(intent.id);
          const pointer = this.#fleetPointer;
          this.#fleetPointer = null;
          if (dragged) {
            mapOrder = true;
            if (pointer.kind === 'wreck') {
              this.#model.dropSalvage(intent.point);
            } else if (pointer.kind === 'route') {
              const source = this.#model.mapRouteDragSource(pointer.start);
              if (source) this.#model.beginMapRoute(source);
              this.#model.previewMapRoute(intent.point);
              this.#model.commitMapRoute();
            } else {
              this.#model.previewFleetDestination(intent.point);
              this.#model.commitFleetDestination();
            }
          }
          break;
        }
        this.#gesture.move(intent.id, intent.point);
        const selected = this.#gesture.end(intent.id);
        if (selected) {
          const snapshot = this.#model.snapshot;
          mapOrder =
            !!snapshot.destinationFleetId || !!snapshot.mapTrade.sourcePlanetId;
          this.#model.selectPoint(selected);
        }
        break;
      }
    }
    if (
      !(['select', 'pointer-end'].includes(intent.type) && !mapOrder) &&
      !intent.type.startsWith('research-') &&
      !intent.type.startsWith('supply-') &&
      !intent.type.startsWith('open-') &&
      !(
        intent.type.startsWith('map-production-') &&
        intent.type !== 'map-production-build'
      ) &&
      ![
        'pointer-cancel',
        'begin-map-route',
        'cancel-map-trade',
        'map-size',
        'map-select-route',
        'map-select-fleet',
        'pointer-move',
        'pointer-start',
        'pan',
        'zoom',
        'home',
        'map-leave',
        'edit-fleet-name',
        'begin-fleet-rename',
        'cancel-fleet-rename',
        'planet-tab',
        'building-category',
        'building-selection',
        'build-search',
        'production-selection',
        'production-fleet',
        'project-supply',
        'open-planet-project',
      ].includes(intent.type)
    )
      this.#model.save();
    this.#view.render(this.#model.snapshot);
  }

  #cancelPointer(keepRouteSource = false): void {
    this.#gesture.cancel();
    this.#fleetPointer = null;
    this.#model.cancelMapPointer(keepRouteSource);
  }

  #schedulePlayback(): void {
    clearTimeout(this.#playbackTimer);
    const playback = this.#model.snapshot.eventPlayback;
    if (this.#disposed) return;
    if (!playback) {
      if (
        this.#model.snapshot.phase === 'interrupted' &&
        !this.#model.snapshot.interruption?.handling
      )
        this.#playbackTimer = setTimeout(() => {
          void this.#runTurn(true);
        }, 0);
      return;
    }
    if (playback.stage === 'awaiting-choice') return;
    this.#playbackTimer = setTimeout(
      () => {
        if (this.#disposed) return;
        this.#model.advanceEventPlayback();
        this.#model.save();
        this.#view.render(this.#model.snapshot);
        this.#schedulePlayback();
      },
      playback.stage === 'announcing' ? 1400 : 450,
    );
  }

  async #runTurn(resume = false): Promise<void> {
    if (
      this.#runningTurn ||
      this.#disposed ||
      this.#model.snapshot.phase !== (resume ? 'interrupted' : 'planning')
    )
      return;
    this.#runningTurn = true;
    try {
      if (resume) this.#model.continueTurn();
      else this.#model.startTurn();
      this.#view.render(this.#model.snapshot);
      const origin = this.#model.snapshot;
      const movementPlayback = new TurnMovementPlayback(origin);
      let frame;
      while (!this.#disposed && (frame = this.#model.nextTurnFrame())) {
        const before = this.#model.snapshot;
        this.#model.applyTurnFrame(frame);
        const after = this.#model.snapshot;
        movementPlayback.record(frame, before, after);
        if (after.phase === 'interrupted') break;
      }
      if (this.#disposed) return;
      if (this.#model.snapshot.phase !== 'interrupted')
        this.#model.finishTurn();
      this.#model.save();
      const tracks = movementPlayback.tracks;
      if (tracks.length) {
        this.#model.beginMovementPlayback(movementPlayback, origin);
        for (const track of tracks) {
          for (const movement of track) {
            this.#model.focusTurnMovement(movement);
            this.#view.render(this.#model.snapshot);
            await (this.#view.animateTurnStep?.(
              { movements: [movement] },
              (progress) => {
                if (
                  !this.#disposed &&
                  this.#model.advanceTurnMovement(progress)
                )
                  this.#view.render(this.#model.snapshot);
              },
            ) ?? Promise.resolve());
            if (this.#disposed) return;
            this.#model.completeTurnMovement();
          }
        }
        this.#model.endMovementPlayback();
      }
      this.#model.beginEventPlayback();
      this.#view.render(this.#model.snapshot);
      this.#schedulePlayback();
    } catch (error) {
      console.warn(error);
      this.#model.endMovementPlayback();
      this.#model.reportError(error);
      this.#view.render(this.#model.snapshot);
    } finally {
      this.#runningTurn = false;
    }
  }
}
