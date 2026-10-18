import type { AppModel } from '../models/AppModel.js';
import type { AppIntent, AppPort } from '../views/ViewContracts.js';
import { MapGesture } from './MapGesture.js';

export class AppController {
  readonly #model: AppModel;
  readonly #view: AppPort;
  readonly #gesture = new MapGesture();

  constructor(model: AppModel, view: AppPort) {
    this.#model = model;
    this.#view = view;
  }

  start(): void {
    this.#view.bind((intent) => this.#handle(intent));
    this.#view.render(this.#model.snapshot);
  }

  dispose(): void {
    this.#gesture.cancel();
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
    switch (intent.type) {
      case 'open-map':
        this.#model.openMap();
        this.#gesture.cancel();
        break;
      case 'open-planet':
        this.#model.openPlanet();
        this.#gesture.cancel();
        break;
      case 'open-research':
        this.#model.openResearch();
        this.#gesture.cancel();
        break;
      case 'open-fleets':
        this.#model.openFleets();
        break;
      case 'planet-tab':
        this.#model.showPlanetTab(intent.tab);
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
      case 'shipyard-menu':
        this.#model.openShipyard(intent.id);
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
      case 'continue-planning':
        this.#model.continuePlanning();
        break;
      case 'end-turn':
        void this.#runTurn();
        return;
      case 'pointer-start':
        this.#gesture.start(intent.id, intent.point);
        return;
      case 'pointer-cancel':
        this.#gesture.cancel();
        return;
      case 'pointer-move': {
        const action = this.#gesture.move(intent.id, intent.point);
        if (action.type === 'none') return;
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
        this.#gesture.move(intent.id, intent.point);
        const selected = this.#gesture.end(intent.id);
        if (selected) this.#model.selectPoint(selected);
        break;
      }
    }
    this.#view.render(this.#model.snapshot);
  }

  async #runTurn(): Promise<void> {
    try {
      const frames = this.#model.startTurn();
      this.#view.render(this.#model.snapshot);
      for (const frame of frames) {
        await (this.#view.animateTurnStep?.(frame) ?? Promise.resolve());
        this.#model.applyTurnFrame(frame);
        this.#view.render(this.#model.snapshot);
      }
      this.#model.finishTurn();
      this.#view.render(this.#model.snapshot);
    } catch (error) {
      console.warn(error);
    }
  }
}
