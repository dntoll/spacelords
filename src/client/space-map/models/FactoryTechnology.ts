import type { BuildType, Technology } from './Game.js';
import type { Component } from './Economy.js';

// senaste-teknik-i-byggval / uppgradera-obsoleta-fabriker: only true successors replace a factory.
export class FactoryTechnology {
  static readonly #versions: readonly (readonly BuildType[])[] = [
    ['Telescope I factory', 'Telescope II factory', 'Telescope III factory'],
    ['Rocket engine factory', 'Ion pulse engine factory'],
  ];

  static successor(
    type: BuildType,
    researched: ReadonlySet<Technology>,
  ): BuildType | null {
    const versions = this.#versions.find((chain) => chain.includes(type));
    return (
      versions?.findLast(
        (candidate, index) =>
          index > versions.indexOf(type) &&
          researched.has(candidate as Technology),
      ) ?? null
    );
  }

  static canUpgrade(from: BuildType, to: BuildType): boolean {
    return this.#versions.some(
      (chain) =>
        chain.includes(from) && chain.indexOf(to) > chain.indexOf(from),
    );
  }

  static isObsoleteComponent(
    type: Component,
    researched: ReadonlySet<Technology>,
  ): boolean {
    return this.successor(`${type} factory` as BuildType, researched) !== null;
  }
}
