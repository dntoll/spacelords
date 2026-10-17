import type { AppReadModel } from '../models/AppModel.js';

export class AppView {
  readonly #root: HTMLElement;

  constructor(root: HTMLElement) {
    this.#root = root;
  }

  render(model: AppReadModel): void {
    const heading = document.createElement('h1');
    heading.textContent = model.name;
    this.#root.replaceChildren(heading);
  }
}
