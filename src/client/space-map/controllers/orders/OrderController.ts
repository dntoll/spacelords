import { type ShipOrder, type OrderKind } from '../../models/ShipOrders.js';
import { type ShipType } from '../../models/Game.js';
import type { OrderFacade } from '../../models/orders/OrderFacade.js';

export class OrderController {
  constructor(private readonly facade: OrderFacade) {}

  openFleetOrders(id: string): void {
    return this.facade.openFleetOrders(id);
  }

  openShipOrders(ship: ShipType, projectId?: string): void {
    return this.facade.openShipOrders(ship, projectId);
  }

  chooseOrder(kind: OrderKind): void {
    return this.facade.chooseOrder(kind);
  }

  completeOrder(order: ShipOrder): void {
    return this.facade.completeOrder(order);
  }

  orderBack(): void {
    return this.facade.orderBack();
  }

  clearStartOrder(): void {
    return this.facade.clearStartOrder();
  }
}
