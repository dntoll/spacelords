import type {
  BoardingMapListItem,
  BoardingMapsModel,
} from '../models/BoardingMapsModel.js';

export class BoardingMapsController {
  readonly #model: BoardingMapsModel;

  constructor(model: BoardingMapsModel) {
    this.#model = model;
  }

  get available(): boolean {
    return this.#model.available;
  }

  list(): readonly BoardingMapListItem[] {
    return this.#model.list();
  }

  read(id: string): string {
    return this.#model.read(id);
  }

  write(id: string, source: string): string {
    return this.#model.write(id, source);
  }
}
