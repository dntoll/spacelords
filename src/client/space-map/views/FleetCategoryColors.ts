import type { FleetCategory } from '../models/fleets/FleetCategory.js';

/**
 * flottkategorier: one colour per fleet category. Red is kept for pirates,
 * and yellow for the selected fleet.
 */
export const FLEET_CATEGORY_COLORS: Readonly<Record<FleetCategory, string>> =
  Object.freeze({
    Transport: '#d8a7ff',
    Exploration: '#72d8ca',
    Colony: '#b6ea6f',
    Combat: '#6f9cff',
    Salvage: '#e8bd76',
    Civilian: '#9fb3bb',
    Mixed: '#ffffff',
  });
