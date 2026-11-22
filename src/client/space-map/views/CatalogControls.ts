const paths = {
  Weapons: 'M3 12h18 M12 3v18 M7 7h10v10H7z',
  Armor: 'M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  Other: 'M8 3h8v5h5v8h-5v5H8v-5H3V8h5z M9 9h6v6H9z',
};
type SymbolName = keyof typeof paths;

function symbolFor(name: string): SymbolName {
  if (name === 'Missiles') return 'Weapons';
  if (name.startsWith('Armor')) return 'Armor';
  return 'Other';
}

// symbolbaserade-kataloger: symbols are decorative; accessible names remain explicit.
export function catalogIcon(name: string): SVGSVGElement {
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
