import { bindDiagramNavigation } from './DiagramNavigation.js';
import { BUILDINGS, type ResearchSnapshot } from '../models/Game.js';
import { PREREQUISITES } from '../models/Research.js';
import {
  RESEARCH_TREE,
  type ResearchCameraSnapshot,
} from '../models/ResearchTree.js';
import type { IntentHandler } from './ViewContracts.js';
import { BUILDING_IMAGES, buildingImage } from './BuildingImage.js';
import { button, element } from './dom.js';

const svgNamespace = 'http://www.w3.org/2000/svg';

export function renderResearchTree(
  research: ResearchSnapshot,
  locked: boolean,
  emit: IntentHandler,
): HTMLElement {
  const area = element('section', 'research-tree-area');
  const viewport = element('div', 'research-tree-viewport');
  viewport.tabIndex = 0;
  viewport.setAttribute('role', 'region');
  viewport.setAttribute('aria-label', 'Research tree');
  viewport.setAttribute(
    'aria-description',
    'Drag to pan. Scroll or pinch to zoom. Arrow keys pan; plus and minus zoom; 0 fits the tree.',
  );
  const stage = element('div', 'research-tree-stage');
  stage.style.width = `${RESEARCH_TREE.width}px`;
  stage.style.height = `${RESEARCH_TREE.height}px`;
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.setAttribute('width', String(RESEARCH_TREE.width));
  svg.setAttribute('height', String(RESEARCH_TREE.height));
  svg.setAttribute('aria-hidden', 'true');
  const defs = document.createElementNS(svgNamespace, 'defs');
  const marker = document.createElementNS(svgNamespace, 'marker');
  marker.id = 'research-arrow';
  for (const [key, value] of Object.entries({
    viewBox: '0 0 10 10',
    refX: '9',
    refY: '5',
    markerWidth: '7',
    markerHeight: '7',
    orient: 'auto',
  }))
    marker.setAttribute(key, value);
  const tip = document.createElementNS(svgNamespace, 'path');
  tip.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
  tip.setAttribute('fill', '#83a8b7');
  marker.append(tip);
  defs.append(marker);
  svg.append(defs);
  for (const edge of RESEARCH_TREE.edges) {
    const from = RESEARCH_TREE.nodes.find((n) => n.technology === edge.from)!;
    const to = RESEARCH_TREE.nodes.find((n) => n.technology === edge.to)!;
    const x = from.x + RESEARCH_TREE.cardWidth;
    const y = from.y + RESEARCH_TREE.cardHeight / 2;
    const endY = to.y + RESEARCH_TREE.cardHeight / 2;
    const mid = (x + to.x) / 2;
    const path = document.createElementNS(svgNamespace, 'path');
    path.dataset.from = edge.from;
    path.dataset.to = edge.to;
    path.setAttribute(
      'd',
      `M ${x} ${y} C ${mid} ${y}, ${mid} ${endY}, ${to.x - 6} ${endY}`,
    );
    path.setAttribute(
      'class',
      research.completed.includes(edge.from)
        ? 'research-edge unlocked'
        : 'research-edge',
    );
    path.setAttribute('marker-end', 'url(#research-arrow)');
    svg.append(path);
  }
  stage.append(svg);
  for (const node of RESEARCH_TREE.nodes) {
    const type = node.technology;
    const complete = research.completed.includes(type);
    const queued = research.queue.indexOf(type);
    const ready = PREREQUISITES[type].every((p) =>
      research.completed.includes(p),
    );
    const state = complete
      ? 'completed'
      : queued === 0
        ? 'active'
        : queued > 0
          ? 'queued'
          : ready
            ? 'available'
            : 'locked';
    const card = element('article', `research-choice research-node ${state}`);
    card.dataset.technology = type;
    card.dataset.state = state;
    card.style.left = `${node.x}px`;
    card.style.top = `${node.y}px`;
    card.title =
      type === 'Trade logistics'
        ? 'Connect owned planets with automated transport fleets.'
        : BUILDINGS[type].description;
    const art =
      type !== 'Trade logistics' && BUILDING_IMAGES[type]
        ? buildingImage(type)
        : element(
            'div',
            'research-symbol',
            type === 'Trade logistics'
              ? '↔'
              : type === 'Transport ship factory'
                ? '△'
                : '⚙',
          );
    art.setAttribute(
      'aria-hidden',
      art.classList.contains('research-symbol') ? 'true' : 'false',
    );
    card.append(art, element('h3', '', type));
    const status = complete
      ? 'Researched'
      : queued === 0
        ? 'Researching · 0/1 points'
        : queued > 0
          ? `Queued · ${queued + 1}`
          : ready
            ? 'Available · 1 point'
            : 'Prerequisites pending · 1 point';
    card.append(element('span', 'pill', status));
    const dependencies = element(
      'p',
      'research-requires',
      `Requires: ${PREREQUISITES[type].join(', ') || 'No prerequisites'}`,
    );
    card.append(dependencies);
    if (!complete) {
      const choose = button(`Research ${type}`, () =>
        emit({ type: 'research', technology: type }),
      );
      choose.textContent = queued >= 0 ? 'Queued' : 'Research';
      choose.disabled = locked || queued >= 0;
      card.append(choose);
    }
    stage.append(card);
  }
  viewport.append(stage);
  bindNavigation(viewport, emit);
  const tools = element('div', 'research-tree-tools');
  const zoom = (factor: number) =>
    emit({
      type: 'research-zoom',
      factor,
      anchor: { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 },
    });
  const out = button(
    'Zoom out research tree',
    () => zoom(1 / 1.25),
    'button secondary-button',
  );
  out.textContent = '−';
  const into = button(
    'Zoom in research tree',
    () => zoom(1.25),
    'button secondary-button',
  );
  into.textContent = '+';
  const fit = button(
    'Fit research tree',
    () => emit({ type: 'research-fit' }),
    'button secondary-button',
  );
  fit.textContent = '⤢';
  for (const control of [out, into, fit])
    control.title = control.getAttribute('aria-label')!;
  const output = element('output', 'research-zoom', '100%');
  output.setAttribute('aria-label', 'Research tree zoom');
  tools.append(out, output, into, fit);
  area.append(viewport, tools);
  return area;
}

export function updateResearchCamera(
  root: HTMLElement,
  camera: ResearchCameraSnapshot,
): void {
  const stage = root.querySelector<HTMLElement>('.research-tree-stage');
  if (stage)
    stage.style.transform = `translate(${camera.offset.x}px, ${camera.offset.y}px) scale(${camera.zoom})`;
  const output = root.querySelector('.research-zoom');
  if (output) output.textContent = `${Math.round(camera.zoom * 100)}%`;
}

function bindNavigation(viewport: HTMLElement, emit: IntentHandler): void {
  bindDiagramNavigation(
    viewport,
    {
      pan: (delta) => emit({ type: 'research-pan', delta }),
      zoom: (factor, anchor) => emit({ type: 'research-zoom', factor, anchor }),
      fit: () => emit({ type: 'research-fit' }),
      start: (id, point) => emit({ type: 'research-pointer-start', id, point }),
      move: (id, point) => emit({ type: 'research-pointer-move', id, point }),
      end: (id, point) => emit({ type: 'research-pointer-end', id, point }),
      cancel: () => emit({ type: 'research-pointer-cancel' }),
    },
    '.research-node',
  );
}
