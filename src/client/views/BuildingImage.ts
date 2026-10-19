import type { BuildType } from '../models/Game.js';
import { element } from './dom.js';

// gemensamma-byggnadsbilder: add supplied image paths here, relative to BASE_URL.
export const BUILDING_IMAGES: Readonly<Partial<Record<BuildType, string>>> =
  Object.freeze({});

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
  image.src = `${import.meta.env.BASE_URL}${source}`;
  image.alt = type;
  image.addEventListener('error', () => frame.replaceChildren(placeholder()), {
    once: true,
  });
  frame.append(image);
  return frame;
}
