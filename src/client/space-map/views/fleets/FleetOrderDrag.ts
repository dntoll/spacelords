/** dragbara-flottorder: a mouse swipe must never become a fleet command. */
export function bindFleetOrderDrag(toolbar: HTMLElement): void {
  let drag: { id: number; x: number; left: number; moved: boolean } | null =
    null;
  let suppressClick = false;
  toolbar.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    if ((event.target as Element).closest('.fleet-route-menu-choices')) return;
    suppressClick = false;
    drag = {
      id: event.pointerId,
      x: event.clientX,
      left: toolbar.scrollLeft,
      moved: false,
    };
  });
  toolbar.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const distance = drag.x - event.clientX;
    if (!drag.moved && Math.abs(distance) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      toolbar.setPointerCapture(event.pointerId);
      toolbar.classList.add('dragging-orders');
    }
    suppressClick = true;
    event.preventDefault();
    toolbar.scrollLeft = Math.max(
      0,
      Math.min(toolbar.scrollWidth - toolbar.clientWidth, drag.left + distance),
    );
  });
  const finish = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    const moved = drag.moved;
    drag = null;
    toolbar.classList.remove('dragging-orders');
    if (moved && toolbar.hasPointerCapture(event.pointerId))
      toolbar.releasePointerCapture(event.pointerId);
  };
  toolbar.addEventListener('pointerup', finish);
  toolbar.addEventListener('pointercancel', finish);
  toolbar.addEventListener('lostpointercapture', finish);
  toolbar.addEventListener('pointerleave', (event) => {
    if (drag && !drag.moved) finish(event);
  });
  toolbar.addEventListener(
    'click',
    (event) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
  toolbar.addEventListener('dragstart', (event) => event.preventDefault());
}
