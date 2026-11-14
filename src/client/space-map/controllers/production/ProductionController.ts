import { type MapProductionCategory } from '../../models/ProductionMap.js';
import { type ProjectType } from '../../models/Game.js';
import type { ProductionFacade } from '../../models/production/ProductionFacade.js';

export class ProductionController {
  constructor(private readonly facade: ProductionFacade) {}

  openProduction(planetId?: string): void {
    return this.facade.openProduction(planetId);
  }

  selectMapProductionCategory(category: MapProductionCategory): void {
    return this.facade.selectMapProductionCategory(category);
  }

  selectMapProductionPage(page: number): void {
    return this.facade.selectMapProductionPage(page);
  }

  selectMapProductionOption(type: ProjectType | null): void {
    return this.facade.selectMapProductionOption(type);
  }

  selectMapProject(id: string): void {
    return this.facade.selectMapProject(id);
  }

  orderMapProduction(option?: ProjectType): void {
    return this.facade.orderMapProduction(option);
  }

  clearProductionReceipt(): void {
    return this.facade.clearProductionReceipt();
  }
}
