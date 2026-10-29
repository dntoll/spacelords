import type { BuildType } from '../models/Game.js';
import orbitalShipyardSymbol from '../assets/symbols/orbital-shipyard-symbol.webp';
import salvageShipFactorySymbol from '../assets/symbols/salvage-ship-factory-symbol.webp';
import telescopeIFactorySymbol from '../assets/symbols/telescope-i-factory-symbol.webp';
import telescopeIiFactorySymbol from '../assets/symbols/telescope-ii-factory-symbol.webp';
import telescopeIiiFactorySymbol from '../assets/symbols/telescope-iii-factory-symbol.webp';
import iceDomeSymbol from '../assets/symbols/ice-dome-symbol.webp';
import iceTerraformingFactorySymbol from '../assets/symbols/ice-terraforming-factory-symbol.webp';
import desertDomeSymbol from '../assets/symbols/desert-dome-symbol.webp';
import desertTerraformingFactorySymbol from '../assets/symbols/desert-terraforming-factory-symbol.webp';
import oceanDomeSymbol from '../assets/symbols/ocean-dome-symbol.webp';
import oceanTerraformingFactorySymbol from '../assets/symbols/ocean-terraforming-factory-symbol.webp';
import toxicDomeSymbol from '../assets/symbols/toxic-dome-symbol.webp';
import toxicTerraformingFactorySymbol from '../assets/symbols/toxic-terraforming-factory-symbol.webp';
import ironMineSymbol from '../assets/symbols/iron-mine-symbol.webp';
import rocketEngineFactorySymbol from '../assets/symbols/rocket-engine-factory-symbol.webp';
import ionPulseEngineFactorySymbol from '../assets/symbols/ion-pulse-engine-factory-symbol.webp';
import weaponsModuleFactorySymbol from '../assets/symbols/weapons-module-factory-symbol.webp';
import waterExtractorSymbol from '../assets/symbols/water-extractor-symbol.webp';
import oilExtractorSymbol from '../assets/symbols/oil-extractor-symbol.webp';
import transportShipFactorySymbol from '../assets/symbols/transport-ship-factory-symbol.webp';
import researchStationSymbol from '../assets/symbols/research-station-symbol.webp';
import colonyShipFactorySymbol from '../assets/symbols/colony-ship-factory-symbol.webp';
import explorationShipFactorySymbol from '../assets/symbols/exploration-ship-factory-symbol.webp';
import fighterFactorySymbol from '../assets/symbols/fighter-factory-symbol.webp';

// spelgrafik-symboler: shared by catalogs, queues and missing-portrait previews.
export const BUILDING_SYMBOLS: Readonly<Record<BuildType, string>> =
  Object.freeze({
    'Orbital shipyard': orbitalShipyardSymbol,
    'Salvage ship factory': salvageShipFactorySymbol,
    'Telescope I factory': telescopeIFactorySymbol,
    'Telescope II factory': telescopeIiFactorySymbol,
    'Telescope III factory': telescopeIiiFactorySymbol,
    'Ice dome': iceDomeSymbol,
    'Ice terraforming factory': iceTerraformingFactorySymbol,
    'Desert dome': desertDomeSymbol,
    'Desert terraforming factory': desertTerraformingFactorySymbol,
    'Ocean dome': oceanDomeSymbol,
    'Ocean terraforming factory': oceanTerraformingFactorySymbol,
    'Toxic dome': toxicDomeSymbol,
    'Toxic terraforming factory': toxicTerraformingFactorySymbol,
    'Iron mine': ironMineSymbol,
    'Rocket engine factory': rocketEngineFactorySymbol,
    'Ion pulse engine factory': ionPulseEngineFactorySymbol,
    'Weapons module factory': weaponsModuleFactorySymbol,
    'Water extractor': waterExtractorSymbol,
    'Oil extractor': oilExtractorSymbol,
    'Transport ship factory': transportShipFactorySymbol,
    'Research station': researchStationSymbol,
    'Colony ship factory': colonyShipFactorySymbol,
    'Exploration ship factory': explorationShipFactorySymbol,
    'Fighter factory': fighterFactorySymbol,
  });
