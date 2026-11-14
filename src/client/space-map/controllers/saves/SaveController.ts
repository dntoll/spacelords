import type { SaveFacade } from '../../models/saves/SaveFacade.js';

export class SaveController {
  constructor(private readonly facade: SaveFacade) {}

  startSlot(id: number): void {
    return this.facade.startSlot(id);
  }

  openSaves(): void {
    return this.facade.openSaves();
  }

  requestClearSlot(id: number): void {
    return this.facade.requestClearSlot(id);
  }

  cancelClearSlot(): void {
    return this.facade.cancelClearSlot();
  }

  confirmClearSlot(): void {
    return this.facade.confirmClearSlot();
  }
}
