export interface AppReadModel {
  readonly name: string;
}

export class AppModel {
  readonly #name: string;

  constructor(name = 'Spacelords') {
    this.#name = name;
  }

  // mvc-arkitektur: views receive immutable data without model write operations.
  get snapshot(): AppReadModel {
    return Object.freeze({ name: this.#name });
  }
}
