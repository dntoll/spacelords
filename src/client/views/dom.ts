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

export function planetIllustration(large = false): HTMLElement {
  const orbit = element(
    'div',
    large ? 'planet-art planet-art-large' : 'planet-art',
  );
  orbit.setAttribute('aria-hidden', 'true');
  orbit.append(element('div', 'planet-orbit'), element('div', 'planet-sphere'));
  return orbit;
}
