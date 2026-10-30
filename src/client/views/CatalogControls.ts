import type { BuildingCategory } from '../models/AppModel.js';
import { BUILDINGS, type BuildType } from '../models/Game.js';
import { button, element } from './dom.js';
import { BUILDING_SYMBOLS } from './BuildingSymbols.js';

const paths = {
  All: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  Resources: 'M4 5c6-4 12-2 16 3 M12 5 4 21 M9 11l4 3',
  Research: 'M9 3h6 M10 3v7L4 20h16l-6-10V3 M8 14h8',
  Ships: 'M12 2 20 20l-8-4-8 4z M12 8v8',
  Components: 'M8 3h8v5h5v8h-5v5H8v-5H3V8h5z M9 9h6v6H9z',
  Terraforming: 'M4 20C2 9 9 3 21 3c0 12-6 18-17 17z M4 20 16 8',
  Water: 'M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13z',
  Oil: 'M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13z M8 16h8 M9 19h6',
  Engine: 'M9 3h6l3 13H6z M8 20l1-4 M12 22v-6 M16 20l-1-4',
  Weapons: 'M3 12h18 M12 3v18 M7 7h10v10H7z',
  Colony: 'M3 17a9 9 0 0 1 18 0 M3 17h18 M12 17V3l6 3-6 3',
  Exploration: 'M12 2v3 M12 19v3 M2 12h3 M19 12h3 M8 16l2-6 6-2-2 6z',
  Transport: 'M3 6h18v12H3z M8 6v12 M16 6v12 M7 21h10',
};
type SymbolName = keyof typeof paths;

function symbolFor(name: string): SymbolName {
  if (name in BUILDINGS) {
    const definition = BUILDINGS[name as BuildType];
    if (definition.ship || definition.component)
      return symbolFor((definition.ship ?? definition.component)!);
    if (definition.terraforming) return 'Terraforming';
  }
  if (name === 'Shipyards') return 'Ships';
  if (name === 'Buildings') return 'All';
  if (name === 'Research station') return 'Research';
  if (name === 'Iron mine') return 'Resources';
  if (name === 'Water extractor') return 'Water';
  if (name === 'Oil extractor') return 'Oil';
  if (name === 'Rocket engine' || name === 'Ion pulse engine') return 'Engine';
  if (name === 'Weapons module') return 'Weapons';
  if (name === 'Colony ship') return 'Colony';
  if (name === 'Exploration ship') return 'Exploration';
  if (name === 'Transport ship' || name === 'Civilian shuttle')
    return 'Transport';
  if (name === 'Fighter') return 'Ships';
  return name in paths ? (name as SymbolName) : 'Components';
}

// symbolbaserade-kataloger: symbols are decorative; accessible names remain explicit.
export function catalogIcon(name: string): SVGSVGElement | HTMLImageElement {
  const source = Object.hasOwn(BUILDING_SYMBOLS, name)
    ? BUILDING_SYMBOLS[name as BuildType]
    : undefined;
  if (source) {
    const image = element('img', 'catalog-icon catalog-artwork');
    image.src = source;
    image.alt = '';
    image.width = 24;
    image.height = 24;
    image.decoding = 'async';
    image.setAttribute('aria-hidden', 'true');
    image.addEventListener(
      'error',
      () => image.replaceWith(catalogFallback(name)),
      { once: true },
    );
    return image;
  }
  return catalogFallback(name);
}

function catalogFallback(name: string): SVGSVGElement {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('class', 'catalog-icon');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', paths[symbolFor(name)]);
  icon.append(path);
  return icon;
}

export const BUILDING_CATEGORIES: readonly BuildingCategory[] = [
  'All',
  'Resources',
  'Research',
  'Shipyards',
  'Components',
  'Terraforming',
];
export function buildingCategory(type: BuildType): BuildingCategory {
  if (type === 'Orbital shipyard') return 'Shipyards';
  const definition = BUILDINGS[type];
  return definition.ship
    ? 'Shipyards'
    : definition.component
      ? 'Components'
      : definition.extraction
        ? 'Resources'
        : definition.terraforming
          ? 'Terraforming'
          : 'Research';
}

export function categoryButtons<T extends string>(
  label: string,
  categories: readonly T[],
  selected: T,
  select: (category: T) => void,
): HTMLElement {
  const group = element('div', 'catalog-categories');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', label);
  for (const category of categories) {
    const control = button(
      category,
      () => select(category),
      'button secondary-button catalog-category',
    );
    control.replaceChildren(catalogIcon(category));
    control.title = category;
    control.setAttribute('aria-pressed', String(selected === category));
    group.append(control);
  }
  return group;
}

export function catalogItem(
  name: string,
  key: string,
  selected: boolean,
  choose: () => void,
): HTMLLIElement {
  const item = element('li', 'catalog-item');
  const control = button(
    `Show ${name}`,
    choose,
    'button secondary-button catalog-item-button',
  );
  control.replaceChildren(catalogIcon(name), element('span', '', name));
  control.dataset.catalogItem = key;
  control.setAttribute('aria-pressed', String(selected));
  item.append(control);
  return item;
}

export function catalogHeading(name: string): HTMLElement {
  const header = element('div', 'catalog-detail-heading');
  const heading = element('h2', '', name);
  heading.tabIndex = -1;
  header.append(catalogIcon(name), heading);
  return header;
}
