import type { Point } from '../models/HexCoordinate.js';

export interface DiagramInputPort {
  pan(delta: Point): void;
  zoom(factor: number, anchor: Point): void;
  fit(): void;
  start(id: number, point: Point): void;
  move(id: number, point: Point): void;
  end(id: number, point: Point): void;
  cancel(): void;
}

export function bindDiagramNavigation(
  viewport: HTMLElement,
  input: DiagramInputPort,
  cardSelector: string,
): void {
  const pointers = new Map<number, Point>();
  let moved = false;
  const adoptScroll = () => {
    const delta = { x: -viewport.scrollLeft, y: -viewport.scrollTop };
    if (!delta.x && !delta.y) return;
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;
    input.pan(delta);
  };
  const point = (event: { clientX: number; clientY: number }): Point => {
    const bounds = viewport.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };
  viewport.addEventListener('scroll', adoptScroll);
  viewport.addEventListener('pointerdown', (event) => {
    const target = event.target as Element;
    if (event.button !== 0) return;
    // research-med-ett-tryck: a new control press must not inherit the last pan.
    if (!pointers.size) moved = false;
    if (
      target.closest('button, input, select, [draggable="true"]') &&
      !target.closest('.research-node-select')
    )
      return;
    pointers.set(event.pointerId, point(event));
    if (!target.closest('.research-node-select')) {
      viewport.focus({ preventScroll: true });
      viewport.setPointerCapture(event.pointerId);
    }
    if (pointers.size > 1) {
      moved = true;
      for (const id of pointers.keys()) viewport.setPointerCapture(id);
    }
    input.start(event.pointerId, point(event));
  });
  viewport.addEventListener('pointermove', (event) => {
    const start = pointers.get(event.pointerId);
    if (!start) return;
    const current = point(event);
    if (!moved && Math.hypot(current.x - start.x, current.y - start.y) < 6)
      return;
    moved = true;
    if (!viewport.hasPointerCapture(event.pointerId))
      viewport.setPointerCapture(event.pointerId);
    input.move(event.pointerId, current);
  });
  viewport.addEventListener('pointerup', (event) => {
    input.end(event.pointerId, point(event));
    pointers.delete(event.pointerId);
    if (viewport.hasPointerCapture(event.pointerId))
      viewport.releasePointerCapture(event.pointerId);
  });
  const cancel = () => {
    pointers.clear();
    input.cancel();
  };
  viewport.addEventListener('pointercancel', cancel);
  viewport.addEventListener('lostpointercapture', cancel);
  viewport.addEventListener(
    'click',
    (event) => {
      if (!moved) return;
      moved = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
  viewport.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const delta =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? viewport.clientHeight
            : 1);
      input.zoom(
        Math.exp(Math.max(-0.7, Math.min(0.7, -delta * 0.002))),
        point(event),
      );
    },
    { passive: false },
  );
  viewport.addEventListener('keydown', (event) => {
    if (event.target !== viewport) return;
    const delta = {
      ArrowLeft: { x: 64, y: 0 },
      ArrowRight: { x: -64, y: 0 },
      ArrowUp: { x: 0, y: 64 },
      ArrowDown: { x: 0, y: -64 },
    }[event.key];
    if (delta) input.pan(delta);
    else if (['+', '=', '-', '−'].includes(event.key))
      input.zoom(['-', '−'].includes(event.key) ? 0.8 : 1.25, {
        x: viewport.clientWidth / 2,
        y: viewport.clientHeight / 2,
      });
    else if (event.key === '0') input.fit();
    else return;
    event.preventDefault();
  });
  viewport.addEventListener('focusin', (event) => {
    adoptScroll();
    const card = (event.target as Element).closest<HTMLElement>(cardSelector);
    if (!card) return;
    const frame = viewport.getBoundingClientRect();
    const cardBounds = card.getBoundingClientRect();
    const bounds =
      cardBounds.width <= frame.width && cardBounds.height <= frame.height
        ? cardBounds
        : (event.target as Element).getBoundingClientRect();
    if (
      bounds.left < frame.left ||
      bounds.right > frame.right ||
      bounds.top < frame.top ||
      bounds.bottom > frame.bottom
    )
      input.pan({
        x: (frame.left + frame.right - bounds.left - bounds.right) / 2,
        y: (frame.top + frame.bottom - bounds.top - bounds.bottom) / 2,
      });
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;
  });
}
