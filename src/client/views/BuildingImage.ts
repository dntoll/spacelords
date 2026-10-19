import colonyFactory from '../assets/buildings/colony-ship-factory.webp';
import explorationFactory from '../assets/buildings/exploration-ship-factory.webp';
import fighterFactory from '../assets/buildings/fighter-factory.webp';
import researchStation from '../assets/buildings/research-station.webp';
import type { BuildType } from '../models/Game.js';
import { element } from './dom.js';

// gemensamma-byggnadsbilder: Vite resolves shared image URLs under the app base.
export const BUILDING_IMAGES: Readonly<Partial<Record<BuildType, string>>> =
  Object.freeze({
    'Colony ship factory': colonyFactory,
    'Exploration ship factory': explorationFactory,
    'Fighter factory': fighterFactory,
    'Research station': researchStation,
  });

export function buildingImage(
  type: BuildType,
  source = BUILDING_IMAGES[type],
): HTMLElement {
  const placeholder = () => {
    const node = element('div', 'building-placeholder', 'Image pending');
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', `${type} image placeholder`);
    return node;
  };
  if (!source) return placeholder();
  const frame = element('div', 'building-image');
  const image = element('img');
  image.src = source.startsWith('/')
    ? source
    : `${import.meta.env.BASE_URL}${source}`;
  image.width = 512;
  image.height = 512;
  image.decoding = 'async';
  image.alt = type;
  image.addEventListener('error', () => frame.replaceChildren(placeholder()), {
    once: true,
  });
  frame.append(image);
  return frame;
}
