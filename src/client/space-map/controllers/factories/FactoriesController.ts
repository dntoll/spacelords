import type { FactoriesFacade } from '../../models/factories/FactoriesFacade.js';
import type {
  FactoriesAction,
  FactoriesOutcome,
} from '../../models/factories/FactoriesSnapshot.js';

/** Förenklad produktion: the Factories screens. */
export class FactoriesController {
  constructor(private readonly facade: FactoriesFacade) {}

  open(): void {
    this.facade.open();
  }

  handle(action: FactoriesAction): FactoriesOutcome {
    return this.facade.apply(action);
  }
}
