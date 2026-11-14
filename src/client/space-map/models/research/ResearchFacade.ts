import { type Technology } from '../Game.js';
import { type Point } from '../../../common/HexCoordinate.js';
import type { AppHost } from '../../../app/models/AppModel.js';

export class ResearchFacade {
  constructor(private readonly host: AppHost) {}

  inspectResearch(technology: Technology | null): void {
    if (
      technology !== null &&
      !this.host.game.research.available.includes(technology)
    )
      return;
    this.host.inspectedResearch = technology;
  }

  openResearch(): void {
    this.host.screen = 'research';
  }

  research(type: Technology | null): void {
    this.host.game.selectResearch(type);
  }

  resizeResearch(width: number, height: number): void {
    this.host.researchCamera.setTechnologies(this.host.game.research.available);
    this.host.researchCamera.resize(width, height);
  }

  panResearch(delta: Point): void {
    this.host.researchCamera.panBy(delta);
  }

  zoomResearch(factor: number, anchor: Point): void {
    this.host.researchCamera.zoomAt(factor, anchor);
  }

  fitResearch(): void {
    this.host.researchCamera.fit();
  }

  moveResearch(type: Technology, index: number): void {
    this.host.game.moveResearch(type, index);
  }

  requestResearchRemoval(type: Technology | null): void {
    this.host.pendingResearchRemoval = type;
  }

  confirmResearchRemoval(): void {
    if (this.host.pendingResearchRemoval)
      this.host.game.removeResearch(this.host.pendingResearchRemoval);
    this.host.pendingResearchRemoval = null;
  }
}
