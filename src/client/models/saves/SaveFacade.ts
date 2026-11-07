import { Camera } from '../Camera.js';
import { Game } from '../Game.js';
import type { AppHost } from '../AppModel.js';

export class SaveFacade {
  constructor(private readonly host: AppHost) {}

  startSlot(id: number): void {
    if (
      this.host.screen !== 'saves' ||
      !this.host.saves ||
      ![1, 2, 3].includes(id)
    )
      return;
    const saved = this.host.saves.load(id);
    const game = saved
      ? Game.restore(saved.state)
      : new Game(this.host.initialGalaxy);
    // Save before switching so a failed write leaves the previous session intact.
    this.host.saves.save(id, {
      lastPlayed: new Date().toISOString(),
      state: game.exportState(),
    });
    this.host.mapTrade.clearSelection();
    this.host.mapProductionCategory = 'Buildings';
    this.host.mapProductionPage = 0;
    this.host.mapProductionOption = null;
    this.host.mapProjectId = null;
    this.host.game = game;
    this.host.testBattle = null;
    this.host.testBoarding = null;
    this.host.battleFeedback = null;
    this.host.orderSelection = null;
    this.host.shipStartOrder = null;
    this.host.inspectedResearch = null;
    this.host.eventPlayback = null;
    this.host.presentedEventIds.clear();
    for (const eventId of game.interruption?.presentedEventIds ?? [])
      this.host.presentedEventIds.add(eventId);
    this.host.movementPlayback = null;
    this.host.movementOrigin = null;
    this.host.eventCamera = null;
    this.host.cameraFraming = null;
    this.host.playbackPositions = [];
    this.host.turnContext = null;
    this.host.salvageSelection = null;
    this.host.shipyardPlacement = null;
    this.host.pendingEndTurn = false;
    this.host.pendingResearchRemoval = null;
    this.host.activeSlot = id;
    this.host.camera = new Camera(
      game.galaxy.homePlanet.position,
      game.galaxy.radius,
    );
    this.host.selected = game.galaxy.homePlanet.position;
    this.host.requestMapFocus(this.host.selected);
    this.host.screen = 'map';
    this.host.pendingClearSlot = null;
    this.host.constructionSite = null;
    this.host.selectedFleetId = null;
    this.host.fleetNameEdit = null;
    this.host.shipTransfer = null;
    this.host.mapFleetId = null;
    this.host.destinationFleetId = null;
    this.host.returnSite = null;
    this.host.buildSearch = '';
    this.host.cancelMapPointer();
    this.host.productionReceipt = null;
    if (game.interruption?.handling) this.host.focusInterruptedFleet();
    else if (game.phase === 'interrupted') this.host.beginEventPlayback();
  }

  openSaves(): void {
    if (!this.host.saves || this.host.game.phase === 'simulating') return;
    this.host.save();
    this.host.testBattle = null;
    this.host.testBoarding = null;
    this.host.battleFeedback = null;
    this.host.cancelMapPointer();
    this.host.screen = 'saves';
    this.host.pendingClearSlot = null;
    this.host.refreshSlots();
  }

  requestClearSlot(id: number): void {
    if (this.host.screen === 'saves' && [1, 2, 3].includes(id))
      this.host.pendingClearSlot = id;
  }

  cancelClearSlot(): void {
    this.host.pendingClearSlot = null;
  }

  confirmClearSlot(): void {
    if (this.host.screen !== 'saves' || this.host.pendingClearSlot === null)
      return;
    this.host.saves?.clear(this.host.pendingClearSlot);
    if (this.host.activeSlot === this.host.pendingClearSlot)
      this.host.activeSlot = null;
    this.host.pendingClearSlot = null;
    this.host.refreshSlots();
  }
}
