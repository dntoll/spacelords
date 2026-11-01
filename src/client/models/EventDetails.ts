import type { BuildType, ProjectType, ShipType, Technology } from './Game.js';
import type { Component } from './Economy.js';
import type { PlanetEnvironmentType } from './Planet.js';

export type EventIllustration =
  | { readonly kind: 'star' }
  | { readonly kind: 'building'; readonly type: BuildType }
  | { readonly kind: 'ship'; readonly type: ShipType }
  | { readonly kind: 'planet'; readonly type: PlanetEnvironmentType | 'Gas' }
  | { readonly kind: 'component'; readonly type: Component }
  | { readonly kind: 'research'; readonly type: Technology };

export interface ProductionContext {
  readonly projectId: string;
  readonly target: ProjectType | 'Fleet upgrade';
  readonly recipient: string;
  readonly ready: number;
  readonly total: number;
}

export interface EventLine {
  readonly text: string;
  readonly illustration?: EventIllustration;
  readonly production?: ProductionContext;
}
