import { element } from '../../common/dom.js';
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

export function planetIllustration(
  large = false,
  type: PlanetArtwork = 'Temperate',
): HTMLElement {
  const orbit = element(
    'div',
    large ? 'planet-art planet-art-large' : 'planet-art',
  );
  orbit.setAttribute('aria-hidden', 'true');
  const image = element('img', 'planet-portrait');
  image.src = PLANET_IMAGES[type];
  image.alt = '';
  image.width = 512;
  image.height = 512;
  image.decoding = 'async';
  image.addEventListener(
    'error',
    () => {
      orbit.replaceChildren(
        element('div', 'planet-orbit'),
        element('div', 'planet-sphere'),
      );
    },
    { once: true },
  );
  orbit.append(image);
  return orbit;
}
