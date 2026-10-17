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
}
