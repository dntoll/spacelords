import type { ProductionFacade } from '../../models/production/ProductionFacade.js';

export class ProductionController {
  constructor(private readonly facade: ProductionFacade) {}

  openProduction(): void {
    return this.facade.openProduction();
  }
}
