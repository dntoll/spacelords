import colonyShip from '../assets/ships/colony-ship.webp';
import explorationShip from '../assets/ships/exploration-ship.webp';
import fighter from '../assets/ships/fighter.webp';
import salvageShip from '../assets/ships/salvage-ship.webp';
import transportShip from '../assets/ships/transport-ship.webp';
import civilianShuttle from '../assets/ships/civilian-shuttle.webp';
import pirateShip from '../assets/ships/pirate-ship.webp';
import type { ShipType } from '../models/Game.js';

export const SHIP_IMAGES: Readonly<Record<ShipType, string>> = Object.freeze({
  'Colony ship': colonyShip,
  'Exploration ship': explorationShip,
  Fighter: fighter,
  'Space pirate': pirateShip,
  'Transport ship': transportShip,
  'Civilian shuttle': civilianShuttle,
  'Salvage ship': salvageShip,
});
export type ShipSpriteType = ShipType | 'Space pirate';
export const SHIP_SPRITES: Readonly<Record<ShipSpriteType, string>> =
  Object.freeze({
    ...SHIP_IMAGES,
    'Space pirate': pirateShip,
  });
export const SHIP_TYPES: readonly ShipType[] = Object.freeze(
  Object.keys(SHIP_IMAGES) as ShipType[],
);
