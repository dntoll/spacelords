import colonyShip from '../assets/ships/colony-ship.webp';
import explorationShip from '../assets/ships/exploration-ship.webp';
import fighter from '../assets/ships/fighter.webp';
import salvageShip from '../assets/ships/salvage-ship.svg';
import type { ShipType } from '../models/Game.js';

export const SHIP_IMAGES: Readonly<Record<ShipType, string>> = Object.freeze({
  'Colony ship': colonyShip,
  'Exploration ship': explorationShip,
  Fighter: fighter,
  'Transport ship': `${import.meta.env.BASE_URL}transport-ship.svg`,
  'Salvage ship': salvageShip,
});
export const SHIP_TYPES: readonly ShipType[] = Object.freeze(
  Object.keys(SHIP_IMAGES) as ShipType[],
);
