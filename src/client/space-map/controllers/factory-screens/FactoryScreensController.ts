import type {
  FactoryScreensAction,
  FactoryScreensFacade,
} from '../../models/factory-screens/FactoryScreensFacade.js';

/** Klickbar prototyp av fabriksskärmarna: example data, no game rules. */
export class FactoryScreensController {
  constructor(private readonly facade: FactoryScreensFacade) {}

  open(): void {
    this.facade.open();
  }

  handle(action: FactoryScreensAction): void {
    this.facade.apply(action);
  }
}
