import colonyShip from '../assets/ships/colony-ship.webp';
import explorationShip from '../assets/ships/exploration-ship.webp';
import fighter from '../assets/ships/fighter.webp';
import raptor from '../assets/ships/raptor.webp';
import salvageShip from '../assets/ships/salvage-ship.webp';
import transportShip from '../assets/ships/transport-ship.webp';
import civilianShuttle from '../assets/ships/civilian-shuttle.webp';
import pirateShip from '../assets/ships/pirate-ship.webp';
import colonyShipBoarding from '../assets/ships/colony-ship-boarding-hd.webp';
import explorationShipBoarding from '../assets/ships/exploration-ship-boarding-hd.webp';
import fighterBoarding from '../assets/ships/fighter-boarding-hd.webp';
import raptorBoarding from '../assets/ships/raptor-boarding-hd.webp';
import salvageShipBoarding from '../assets/ships/salvage-ship-boarding-hd.webp';
import transportShipBoarding from '../assets/ships/transport-ship-boarding-hd.webp';
import civilianShuttleBoarding from '../assets/ships/civilian-shuttle-boarding-hd.webp';
import pirateShipBoarding from '../assets/ships/pirate-ship-boarding-hd.webp';
import type { ShipType } from '../models/Game.js';

export const SHIP_IMAGES: Readonly<Record<ShipType, string>> = Object.freeze({
  'Colony ship': colonyShip,
  'Exploration ship': explorationShip,
  Fighter: fighter,
  'Space pirate': pirateShip,
  'Transport ship': transportShip,
  'Civilian shuttle': civilianShuttle,
  'Salvage ship': salvageShip,
  Raptor: raptor,
});
export type ShipSpriteType = ShipType | 'Space pirate';
export const SHIP_SPRITES: Readonly<Record<ShipSpriteType, string>> =
  Object.freeze({
    ...SHIP_IMAGES,
    'Space pirate': pirateShip,
  });
/**
 * hogupplost-skeppsbild-i-bordning: the boarding deck is zoomed far in, so it
 * lies on a high-resolution picture with the same framing and aspect ratio as
 * the sprite, which keeps the editor's sprite alignment valid.
 */
export const SHIP_BOARDING_IMAGES: Readonly<Record<ShipSpriteType, string>> =
  Object.freeze({
    'Colony ship': colonyShipBoarding,
    'Exploration ship': explorationShipBoarding,
    Fighter: fighterBoarding,
    'Space pirate': pirateShipBoarding,
    'Transport ship': transportShipBoarding,
    'Civilian shuttle': civilianShuttleBoarding,
    'Salvage ship': salvageShipBoarding,
    Raptor: raptorBoarding,
  });
export const SHIP_TYPES: readonly ShipType[] = Object.freeze(
  Object.keys(SHIP_IMAGES) as ShipType[],
);
