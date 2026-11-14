import { button } from '../../common/dom.js';

const paths = {
  forward: 'M12 3 21 15h-6v6H9v-6H3Z',
  accelerate: 'M12 4v16M6 10l6-6 6 6',
  hold: 'M5 12h14',
  brake: 'M12 20V4M6 14l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  left: 'M8 4 3 9l5 5M3 9h10a7 7 0 0 1 0 14',
  right: 'm16 4 5 5-5 5m5-5H11a7 7 0 0 0 0 14',
  end: 'm4 12 5 5L20 5M4 21h16',
  cannon: 'm6 14 9-9 4 4-9 9H4v-4Zm2 4v3m8-14 3-3 2 2-3 3',
  missile:
    'M9 14C8 7 13 3 21 3c0 8-4 13-11 12l-4 5-2-2 5-4Zm4-6 3 3M8 11H4l-2 4h6m5 1v6l4-2v-5',
  info: 'M12 10v8m0-12v1M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
  exit: 'M10 3H3v18h7m5-15 6 6-6 6m-8-6h14',
  deploy: 'M3 3h6v6H3Zm12 0h6v6h-6ZM3 15h6v6H3Zm12 0h6v6h-6Z',
  start: 'm7 3 14 9-14 9Z',
  dock: 'M4 10h6v4H4zm10 0h6v4h-6M10 12h4M6 4v4m0 8v4m12-16v4m0 8v4',
} as const;

export function battleButton(
  label: string,
  icon: keyof typeof paths,
  activate: () => void,
  className = '',
): HTMLButtonElement {
  const node = button(label, activate, `battle-icon ${className}`);
  node.title = label;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', paths[icon]);
  svg.append(path);
  node.replaceChildren(svg);
  return node;
}
