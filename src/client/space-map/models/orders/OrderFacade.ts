import { type ShipOrder, type OrderKind } from '../ShipOrders.js';
import type { AppHost } from '../../../app/models/AppModel.js';

export class OrderFacade {
  constructor(private readonly host: AppHost) {}

  openFleetOrders(id: string): void {
    const fleet = this.host.game.fleet(id);
    if (!fleet?.position) throw new Error('Choose a positioned fleet.');
    const returnScreen = this.host.screen;
    this.host.openMapScreen('orders');
    this.host.orderSelection = {
      fleetId: id,
      origin: fleet.position,
      title: `Orders · ${fleet.name}`,
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
      kind === 'join-fleet'
        ? 'fleets'
        : kind === 'patrol' || kind === 'explore-planet'
          ? kind
          : null;
    if (page) {
      this.host.orderSelection = { ...view, page, selectedFleetId: null };
      this.host.mapFleetId = null;
      return;
    }
    if (kind === 'explore' || kind === 'explore-stars')
      this.host.completeOrder({ kind });
  }

  completeOrder(order: ShipOrder): void {
    const selection = this.host.orderSelection;
    if (!selection) return;
    if (selection.fleetId)
      this.host.game.issueFleetOrder(selection.fleetId, order);
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
}
