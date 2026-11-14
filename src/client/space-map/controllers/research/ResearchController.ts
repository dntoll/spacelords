import { type Technology } from '../../models/Game.js';
import { type Point } from '../../../common/HexCoordinate.js';
import type { ResearchFacade } from '../../models/research/ResearchFacade.js';

export class ResearchController {
  constructor(private readonly facade: ResearchFacade) {}

  inspectResearch(technology: Technology | null): void {
    return this.facade.inspectResearch(technology);
  }

  openResearch(): void {
    return this.facade.openResearch();
  }

  research(type: Technology | null): void {
    return this.facade.research(type);
  }

  resizeResearch(width: number, height: number): void {
    return this.facade.resizeResearch(width, height);
  }

  panResearch(delta: Point): void {
    return this.facade.panResearch(delta);
  }

  zoomResearch(factor: number, anchor: Point): void {
    return this.facade.zoomResearch(factor, anchor);
  }

  fitResearch(): void {
    return this.facade.fitResearch();
  }

  moveResearch(type: Technology, index: number): void {
    return this.facade.moveResearch(type, index);
  }

  requestResearchRemoval(type: Technology | null): void {
    return this.facade.requestResearchRemoval(type);
  }

  confirmResearchRemoval(): void {
    return this.facade.confirmResearchRemoval();
  }
}
