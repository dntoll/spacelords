import { type ShipOrder, type OrderKind } from '../ShipOrders.js';
import { type ShipType } from '../Game.js';
import type { AppHost } from '../AppModel.js';

export class OrderFacade {
  constructor(private readonly host: AppHost) {}

  openFleetOrders(id: string): void {
    const fleet = this.host.game.fleet(id);
    if (!fleet?.position) throw new Error('Choose a positioned fleet.');
    const returnScreen = this.host.screen;
    this.host.openMapScreen('orders');
    this.host.salvageSelection = null;
    this.host.orderSelection = {
      fleetId: id,
      planetId: null,
      projectId: null,
      ship: null,
      origin: fleet.position,
      title: `Orders · ${fleet.name}`,
      returnScreen,
      page: 'menu',
      selectedFleetId: null,
    };
  }

  openShipOrders(ship: ShipType, projectId?: string): void {
    const planet = this.host.game.planetAt(this.host.selected);
    if (!planet) throw new Error('Choose a production planet.');
    const returnScreen = this.host.screen;
    this.host.openMapScreen('orders');
    this.host.salvageSelection = null;
    this.host.mapFleetId = null;
    this.host.orderSelection = {
      fleetId: null,
      planetId: planet.id,
      projectId: projectId ?? null,
      ship,
      origin: planet.position,
      title: `Start order · ${ship}`,
      returnScreen,
      page: 'menu',
      selectedFleetId: null,
    };
  }

  chooseOrder(kind: OrderKind): void {
    const view = this.host.orderSnapshot();
    const option = view?.options.find((option) => option.kind === kind);
    if (!view || !option) throw new Error('Choose an available order.');
    if (option.blockedReason) throw new Error(option.blockedReason);
    const page =
      kind === 'join-route'
        ? 'routes'
        : kind === 'join-fleet'
          ? 'fleets'
          : ['patrol', 'salvage', 'colonize', 'explore-planet'].includes(kind)
            ? (kind as 'patrol' | 'salvage' | 'colonize' | 'explore-planet')
            : null;
    if (page) {
      this.host.orderSelection = { ...view, page, selectedFleetId: null };
      this.host.mapFleetId = null;
      return;
    }
    if (kind === 'upgrade' || kind === 'return-shipyard') {
      if (!view.fleetId) throw new Error('Choose an existing fleet.');
      if (kind === 'upgrade') this.host.game.upgradeFleet(view.fleetId);
      else this.host.game.returnToShipyard(view.fleetId);
      this.host.closeOrders();
    } else if (
      kind === 'auto-salvage' ||
      kind === 'civilian-transport' ||
      kind === 'guard-routes' ||
      kind === 'explore' ||
      kind === 'explore-stars'
    )
      this.host.completeOrder({ kind });
  }

  completeOrder(order: ShipOrder): void {
    const selection = this.host.orderSelection;
    if (!selection) return;
    if (selection.fleetId)
      this.host.game.issueFleetOrder(selection.fleetId, order);
    else if (selection.ship && selection.planetId) {
      if (selection.projectId) {
        const planet = this.host.game.galaxy.systems
          .flatMap((system) => system.planets)
          .find((planet) => planet.id === selection.planetId)!;
        this.host.game.setProjectInitialOrder(
          planet,
          selection.projectId,
          order,
        );
      } else
        this.host.shipStartOrder = {
          ship: selection.ship,
          order: structuredClone(order),
        };
    }
    this.host.closeOrders(
      order.kind === 'join-fleet' ? order.fleetId : undefined,
    );
  }

  orderBack(): void {
    if (this.host.orderSelection?.page !== 'menu' && this.host.orderSelection)
      this.host.orderSelection = {
        ...this.host.orderSelection,
        page: 'menu',
        selectedFleetId: null,
      };
    else this.host.closeOrders();
  }

  clearStartOrder(): void {
    const selection = this.host.orderSelection;
    if (selection?.projectId && selection.planetId) {
      const planet = this.host.game.galaxy.systems
        .flatMap((system) => system.planets)
        .find((planet) => planet.id === selection.planetId)!;
      this.host.game.setProjectInitialOrder(planet, selection.projectId, null);
    } else this.host.shipStartOrder = null;
    this.host.closeOrders();
  }
}
