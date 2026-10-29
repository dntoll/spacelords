import { PLANET_IMAGES, type PlanetArtwork } from './PlanetImages.js';

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(
  label: string,
  onClick: () => void,
  className = 'button',
): HTMLButtonElement {
  const node = element('button', className, label);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  node.addEventListener('click', onClick);
  return node;
}

export function labelValue(label: string, value: string): HTMLElement {
  const pair = element('div', 'stat');
  pair.append(
    element('dt', 'stat-label', label),
    element('dd', 'stat-value', value),
  );
  return pair;
}

export function queueButton(
  symbol: '↑' | '↓' | '×',
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  const node = button(label, onClick, 'button queue-icon-button');
  node.textContent = symbol;
  node.title = label;
  return node;
}

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
