import type { AppHost } from '../../../app/models/AppModel.js';

/** gemensam-produktionsko-i-flottan: Production waits for the fleet's queue. */
export class ProductionFacade {
  constructor(private readonly host: AppHost) {}

  openProduction(): void {
    this.host.screen = 'production';
  }
}
