import type { AppModel } from '../models/AppModel.js';
import type { AppIntent, AppPort } from '../views/ViewContracts.js';
import type { Point } from '../models/HexCoordinate.js';
import { MapGesture } from './MapGesture.js';

export class AppController {
  readonly #model: AppModel;
  readonly #view: AppPort;
  readonly #gesture = new MapGesture();
  #fleetPointer: { id: number; start: Point; dragged: boolean } | null = null;

  constructor(model: AppModel, view: AppPort) {
    this.#model = model;
    this.#view = view;
  }

  start(): void {
    this.#view.bind((intent) => this.#handle(intent));
    this.#view.render(this.#model.snapshot);
  }

  dispose(): void {
    this.#cancelPointer();
    this.#view.dispose();
  }

  #handle(intent: AppIntent): void {
    try {
      this.#model.clearNotice();
      this.#handleIntent(intent);
    } catch (error) {
      console.warn(error);
      this.#model.reportError(error);
      this.#view.render(this.#model.snapshot);
    }
  }

  #handleIntent(intent: AppIntent): void {
    if (intent.type.startsWith('open-') || intent.type === 'end-turn')
      this.#model.cancelShipTransfer();
    if (
      [
        'open-map',
        'open-planet',
        'open-research',
        'open-fleets',
        'home',
        'pan',
        'zoom',
        'begin-destination',
        'end-turn',
      ].includes(intent.type)
    )
      this.#cancelPointer();
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
      case 'open-trade-routes':
        this.#model.openTradeRoutes();
        break;
      case 'open-decisions':
        this.#model.openDecisions();
        break;
      case 'next-decision':
        this.#model.openDecision();
        break;
      case 'open-decision':
        this.#model.openDecision(intent.id);
        break;
      case 'skip-decision':
        this.#model.skipDecision(intent.id);
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
        this.#model.openPlanet();
        break;
      case 'open-research':
        this.#model.openResearch();
        break;
      case 'open-fleets':
        this.#model.openFleets();
        break;
      case 'build-search':
        this.#model.searchBuildings(intent.query);
        break;
      case 'home':
        this.#model.home();
        break;
      case 'select':
        this.#model.select(intent.position);
        break;
      case 'pan':
        this.#model.pan(intent.delta);
        break;
      case 'zoom':
        this.#model.zoom(intent.factor, intent.anchor);
        break;
      case 'build':
        this.#model.build(intent.building, intent.slotIndex);
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
        this.#model.chooseShipTransfer(intent.fleetId, intent.ship);
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
          const fleetId = this.#model.fleetAtPoint(intent.point);
          if (!fleetId) return;
          this.#model.selectMapFleet(fleetId);
          this.#fleetPointer = {
            id: intent.id,
            start: intent.point,
            dragged: false,
          };
        }
        break;
      }
      case 'map-leave':
        if (!this.#model.hoverMapFleet(null)) return;
        break;
      case 'pointer-cancel':
        this.#cancelPointer();
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
          if (this.#fleetPointer.dragged)
            this.#model.previewFleetDestination(intent.point);
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
          this.#fleetPointer = null;
          if (dragged) {
            this.#model.previewFleetDestination(intent.point);
            this.#model.commitFleetDestination();
          }
          break;
        }
        this.#gesture.move(intent.id, intent.point);
        const selected = this.#gesture.end(intent.id);
        if (selected) this.#model.selectPoint(selected);
        break;
      }
    }
    if (
      ![
        'pointer-move',
        'pointer-start',
        'pan',
        'zoom',
        'home',
        'map-leave',
      ].includes(intent.type)
    )
      this.#model.save();
    this.#view.render(this.#model.snapshot);
  }

  #cancelPointer(): void {
    this.#gesture.cancel();
    this.#fleetPointer = null;
    this.#model.cancelMapPointer();
  }

  async #runTurn(): Promise<void> {
    if (this.#model.snapshot.phase !== 'planning') return;
    try {
      const frames = this.#model.startTurn();
      this.#view.render(this.#model.snapshot);
      for (const frame of frames) {
        await (this.#view.animateTurnStep?.(frame) ?? Promise.resolve());
        this.#model.applyTurnFrame(frame);
        this.#view.render(this.#model.snapshot);
      }
      this.#model.finishTurn();
      this.#model.save();
      this.#view.render(this.#model.snapshot);
    } catch (error) {
      console.warn(error);
      this.#model.reportError(error);
      this.#view.render(this.#model.snapshot);
    }
  }
}
