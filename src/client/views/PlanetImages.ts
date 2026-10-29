import type { PlanetEnvironmentType } from '../models/Planet.js';
import temperate from '../assets/planets/temperate-planet.webp';
import ice from '../assets/planets/ice-planet.webp';
import desert from '../assets/planets/desert-planet.webp';
import ocean from '../assets/planets/ocean-planet.webp';
import toxic from '../assets/planets/toxic-planet.webp';
import gas from '../assets/planets/gas-planet.webp';

export type PlanetArtwork = PlanetEnvironmentType | 'Gas';
export const PLANET_IMAGES: Readonly<Record<PlanetArtwork, string>> =
  Object.freeze({
    Temperate: temperate,
    Ice: ice,
    Desert: desert,
    Ocean: ocean,
    Toxic: toxic,
    Gas: gas,
  });
