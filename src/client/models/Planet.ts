import type { HexCoordinate } from './HexCoordinate.js';

export const TERRAFORM_ENVIRONMENTS = [
  'Ice',
  'Desert',
  'Ocean',
  'Toxic',
] as const;
export type TerraformEnvironment = (typeof TERRAFORM_ENVIRONMENTS)[number];
export type PlanetEnvironmentType = 'Temperate' | TerraformEnvironment;

export interface ResourceYield {
  readonly name: string;
  readonly perYear: number;
}

export class Player {
  constructor(
    readonly id: string,
    readonly name: string,
  ) {
    Object.freeze(this);
  }
}

export class Colony {
  readonly buildings: readonly string[] = Object.freeze([]);

  constructor(
    readonly ownerId: string,
    readonly population: number,
  ) {
    if (!Number.isSafeInteger(population) || population < 0) {
      throw new RangeError('Population must be a non-negative integer.');
    }
    Object.freeze(this);
  }
}

export interface PlanetSnapshot {
  readonly id: string;
  readonly name: string;
  readonly type: 'solid' | 'gas';
  readonly environment?: PlanetEnvironmentType;
  readonly position: HexCoordinate;
  readonly habitability: number;
  readonly buildSlots: number;
  readonly resources: readonly ResourceYield[];
  readonly colony: Colony | null;
}

export class Planet implements PlanetSnapshot {
  readonly id: string;
  readonly name: string;
  readonly type: 'solid' | 'gas';
  readonly environment: PlanetEnvironmentType;
  readonly position: HexCoordinate;
  readonly habitability: number;
  readonly buildSlots: number;
  readonly resources: readonly ResourceYield[];
  readonly colony: Colony | null;

  constructor(data: PlanetSnapshot) {
    if (
      !Number.isFinite(data.habitability) ||
      data.habitability < 0 ||
      data.habitability > 100
    ) {
      throw new RangeError('Habitability must be between 0 and 100.');
    }
    if (
      !Number.isInteger(data.buildSlots) ||
      data.buildSlots < 0 ||
      data.buildSlots > 10
    ) {
      throw new RangeError('Build slots must be an integer between 0 and 10.');
    }
    if (
      data.resources.some(
        (resource) =>
          !Number.isFinite(resource.perYear) || resource.perYear < 0,
      )
    ) {
      throw new RangeError('Resource yields must be finite and non-negative.');
    }
    if (
      data.environment !== undefined &&
      !['Temperate', ...TERRAFORM_ENVIRONMENTS].includes(data.environment)
    )
      throw new RangeError('Unknown planet environment.');
    this.environment = data.environment ?? 'Temperate';
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.position = data.position;
    this.habitability = data.habitability;
    this.buildSlots = data.buildSlots;
    this.resources = Object.freeze(
      data.resources.map((resource) => Object.freeze({ ...resource })),
    );
    this.colony = data.colony;
    Object.freeze(this);
  }

  get snapshot(): PlanetSnapshot {
    return this;
  }
}
