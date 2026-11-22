import { type ShipOrder, type OrderKind } from '../../models/ShipOrders.js';
import type { OrderFacade } from '../../models/orders/OrderFacade.js';

export class OrderController {
  constructor(private readonly facade: OrderFacade) {}

  openFleetOrders(id: string): void {
    return this.facade.openFleetOrders(id);
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
}
