import { TELESCOPES } from './Detection.js';

export const RESOURCES = ['Iron', 'Water', 'Oil'] as const;
export type Resource = (typeof RESOURCES)[number];
export const COMPONENTS = [
  'Rocket engine',
  'Ion pulse engine',
  'Weapons module',
  ...TELESCOPES,
] as const;
export type Component = (typeof COMPONENTS)[number];
export const MATERIALS = [...RESOURCES, ...COMPONENTS] as const;
export type Material = (typeof MATERIALS)[number];
export type Stock = Record<Material, number>;
export const emptyStock = (): Stock => ({
  Iron: 0,
  Water: 0,
  Oil: 0,
  'Rocket engine': 0,
  'Ion pulse engine': 0,
  'Weapons module': 0,
  'Telescope I': 0,
  'Telescope II': 0,
  'Telescope III': 0,
});
