import { renderResearchDetails } from './ResearchDetailsView.js';
import { bindDiagramNavigation } from './DiagramNavigation.js';
import type {
  ResearchSnapshot,
  Technology,
  BuildType,
} from '../models/Game.js';
import { PREREQUISITES } from '../models/Research.js';
import {
  ResearchTreeLayout,
  isResearchIdentified,
  type ResearchCameraSnapshot,
} from '../models/ResearchTree.js';
import type { IntentHandler } from './ViewContracts.js';
import { BUILDING_IMAGES, buildingImage } from './BuildingImage.js';
import { button, element } from './dom.js';
import { catalogIcon } from './CatalogControls.js';

const svgNamespace = 'http://www.w3.org/2000/svg';

export function renderResearchTree(
  research: ResearchSnapshot,
  emit: IntentHandler,
  inspected: Technology | null = null,
  locked = false,
): HTMLElement {
  const layout = new ResearchTreeLayout(research.available);
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
  stage.style.width = `${layout.width}px`;
  stage.style.height = `${layout.height}px`;
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.setAttribute('width', String(layout.width));
  svg.setAttribute('height', String(layout.height));
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
  for (const edge of layout.edges) {
    const from = layout.nodes.find((n) => n.technology === edge.from)!;
    const to = layout.nodes.find((n) => n.technology === edge.to)!;
    const x = from.x + layout.cardWidth;
    const y = from.y + layout.cardHeight / 2;
    const endY = to.y + layout.cardHeight / 2;
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
  for (const [index, node] of layout.nodes.entries()) {
    const type = node.technology;
    const complete = research.completed.includes(type);
    const queued = research.queue.indexOf(type);
    const recovered = research.recovered?.includes(type) ?? false;
    const identified = isResearchIdentified(research, type);
    const ready =
      recovered ||
      PREREQUISITES[type].every((p) => research.completed.includes(p));
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
    card.dataset.identified = String(identified);
    card.style.left = `${node.x}px`;
    card.style.top = `${node.y}px`;
    const label = identified
      ? `Inspect ${type}`
      : `Inspect unknown technology ${index + 1}`;
    const choose = button(
      label,
      () => emit({ type: 'inspect-research', technology: type }),
      'research-node-select',
    );
    let touchClick = false;
    let lastTouch = -Infinity;
    const order = () => {
      if (
        !locked &&
        !research.queueBlockedReason &&
        identified &&
        !complete &&
        queued < 0
      )
        emit({ type: 'research', technology: type });
    };
    choose.addEventListener('pointerup', (event) => {
      touchClick = event.pointerType === 'touch';
    });
    choose.addEventListener('click', () => {
      if (!touchClick) return;
      touchClick = false;
      const now = performance.now();
      const doubleTap = now - lastTouch <= 500;
      lastTouch = now;
      if (doubleTap) order();
    });
    choose.addEventListener('dblclick', () => {
      // dubbelklick-koar-forskning: touch already orders on its second click.
      if (performance.now() - lastTouch > 750) order();
    });
    choose.replaceChildren();
    choose.id = `research-node-${index}`;
    choose.setAttribute('aria-pressed', String(inspected === type));
    choose.title = identified ? type : 'Unknown technology';
    const art =
      identified && type !== 'Trade logistics'
        ? BUILDING_IMAGES[type as BuildType]
          ? buildingImage(type as BuildType)
          : catalogIcon(type)
        : element(
            'div',
            'research-symbol',
            !identified
              ? '?'
              : type === 'Trade logistics'
                ? '↔'
                : type === 'Transport ship factory'
                  ? '△'
                  : '⚙',
          );
    art.setAttribute('aria-hidden', 'true');
    choose.append(
      art,
      element('span', 'research-node-name', identified ? type : 'Unknown'),
    );
    const status = !identified
      ? 'Undiscovered'
      : complete
        ? 'Researched'
        : queued === 0
          ? research.stations
            ? 'Researching'
            : 'Waiting for station'
          : queued > 0
            ? `Queued · ${queued + 1}`
            : ready
              ? recovered
                ? 'Recovered'
                : 'Available'
              : 'Prerequisites pending';
    choose.append(element('small', 'research-node-status', status));
    card.append(choose);
    if (identified)
      card.append(renderResearchDetails(research, type, locked, emit));
    stage.append(card);
  }
  viewport.append(stage);
  bindNavigation(viewport, emit);
  area.append(viewport);
  return area;
}

export function updateResearchCamera(
  root: HTMLElement,
  camera: ResearchCameraSnapshot,
): void {
  const stage = root.querySelector<HTMLElement>('.research-tree-stage');
  if (stage)
    stage.style.transform = `translate(${camera.offset.x}px, ${camera.offset.y}px) scale(${camera.zoom})`;
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
