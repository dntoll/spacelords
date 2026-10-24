import type { Planet } from './Planet.js';

/** habitability-kapacitet: physical potential is fixed; usable capacity develops. */
export class PlanetEnvironment {
  constructor(
    readonly planet: Planet,
    readonly habitability: number,
  ) {
    if (
      !Number.isFinite(habitability) ||
      habitability < 0 ||
      habitability > 100
    )
      throw new RangeError('Habitability must be between 0 and 100.');
    Object.freeze(this);
  }

  get breathable(): boolean {
    return this.planet.type === 'solid' && this.habitability >= 80;
  }

  get populationCapacity(): number {
    return this.planet.type === 'gas'
      ? Number.MAX_SAFE_INTEGER
      : Math.max(1_000, Math.floor((20_000 * this.habitability) / 100));
  }

  get buildSlots(): number {
    const potential = this.planet.buildSlots;
    return this.planet.type === 'gas' || potential === 0
      ? potential
      : Math.min(
          potential,
          Math.max(1, Math.floor((potential * this.habitability) / 100)),
        );
  }

  thresholdForSite(index: number): number {
    return index === 0
      ? 0
      : Math.ceil(((index + 1) * 100) / this.planet.buildSlots);
  }
}
