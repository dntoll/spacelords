import type { AppModel } from '../models/AppModel.js';
import type { AppView } from '../views/AppView.js';

export class AppController {
  readonly #model: AppModel;
  readonly #view: AppView;

  constructor(model: AppModel, view: AppView) {
    this.#model = model;
    this.#view = view;
  }

  start(): void {
    this.#view.render(this.#model.snapshot);
  }
}
