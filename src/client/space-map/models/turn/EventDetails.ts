import type { ShipType, Technology } from '../Game.js';
import type { PlanetEnvironmentType } from '../Planet.js';

export type EventIllustration =
  | { readonly kind: 'star' }
  | { readonly kind: 'ship'; readonly type: ShipType }
  | { readonly kind: 'planet'; readonly type: PlanetEnvironmentType | 'Gas' }
  | { readonly kind: 'research'; readonly type: Technology };

export interface EventLine {
  readonly text: string;
  readonly illustration?: EventIllustration;
}
