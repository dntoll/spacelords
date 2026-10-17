import type { HealthModel, HealthStatus } from '../models/HealthModel.js';

export class HealthController {
  readonly #model: HealthModel;

  constructor(model: HealthModel) {
    this.#model = model;
  }

  getStatus(): HealthStatus {
    return this.#model.snapshot;
  }
}
