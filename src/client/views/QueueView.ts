import { catalogIcon } from './CatalogControls.js';
import { button, element } from './dom.js';

export function decorateQueueRow(
  row: HTMLElement,
  id: string,
  label: string,
  locked: boolean,
): void {
  row.classList.add('queue-item');
  row.dataset.queueItemId = id;
  const handle = button(`Move ${label}`, () => {}, 'queue-drag-handle');
  handle.textContent = '⠿';
  handle.title =
    'Drag to reorder. Space to pick up, arrows to move, Enter to drop, Escape to cancel.';
  handle.disabled = locked;
  const content = element('div', 'queue-content');
  const actions = [...row.children].filter((child) =>
    child.matches('.queue-actions, .queue-icon-button'),
  );
  for (const child of [...row.childNodes])
    if (!actions.includes(child as Element)) content.append(child);
  row.replaceChildren(
    handle,
    catalogIcon(label.replace(/, position \d+$/, '')),
    content,
    ...actions,
  );
}

/** dragbara-koer: preview in the view; commit exactly once through its controller. */
export function bindQueueOrder(
  list: HTMLElement,
  ids: readonly string[],
  move: (id: string, index: number) => void,
  locked: boolean,
): void {
  list.classList.add('sortable-queue');
  type Drag = {
    from: number;
    to: number;
    start: number;
    y: number;
    pointerId: number | null;
    row: HTMLElement;
    handle: HTMLElement;
    moving: boolean;
    ghost: HTMLElement | null;
    abort: AbortController;
    frame: number;
  };
  let drag: Drag | null = null;
  const rows = () => [
    ...list.querySelectorAll<HTMLElement>(':scope > .queue-item'),
  ];
  const announce = (text: string) => {
    const root = list.closest('#app') ?? document.body;
    let status = root.querySelector<HTMLElement>('.queue-feedback');
    if (!status) {
      status = element('span', 'queue-feedback visually-hidden');
      status.setAttribute('role', 'status');
      root.append(status);
    }
    status.textContent = text;
  };
  const clear = () => {
    for (const row of rows())
      row.classList.remove(
        'queue-drop-before',
        'queue-drop-after',
        'queue-dragging',
      );
  };
  const preview = (to: number) => {
    if (!drag) return;
    drag.to = Math.max(0, Math.min(ids.length - 1, to));
    clear();
    drag.row.classList.add('queue-dragging');
    if (drag.to !== drag.from)
      rows()[drag.to]?.classList.add(
        drag.to > drag.from ? 'queue-drop-after' : 'queue-drop-before',
      );
    announce(
      `${drag.handle.getAttribute('aria-label')?.replace(/^Move /, '')} · position ${drag.to + 1} of ${ids.length}`,
    );
  };
  const finish = (commit: boolean) => {
    const current = drag;
    if (!current) return;
    drag = null;
    current.abort.abort();
    if (current.frame) cancelAnimationFrame(current.frame);
    current.ghost?.remove();
    clear();
    if (
      current.pointerId !== null &&
      current.handle.hasPointerCapture?.(current.pointerId)
    )
      current.handle.releasePointerCapture(current.pointerId);
    if (commit && current.moving && current.to !== current.from)
      move(ids[current.from]!, current.to);
    const root = list.closest('#app') ?? document.body;
    const restoredRow = [
      ...root.querySelectorAll<HTMLElement>('[data-queue-item-id]'),
    ].find((row) => row.dataset.queueItemId === ids[current.from]);
    const restored =
      restoredRow?.querySelector<HTMLElement>('.queue-drag-handle');
    (restored ?? current.handle).focus({ preventScroll: true });
    if (!commit) announce('Reordering cancelled.');
    else if (current.moving && restoredRow) {
      const position = [...restoredRow.parentElement!.children]
        .filter((row) => row.hasAttribute('data-queue-item-id'))
        .indexOf(restoredRow);
      announce(
        position === current.from
          ? 'Order unchanged.'
          : `Moved to position ${position + 1} of ${ids.length}.`,
      );
    }
  };
  const locate = () => {
    if (!drag) return;
    const remaining = rows().filter((row) => row !== drag!.row);
    const index = remaining.findIndex((row) => {
      const box = (
        row.querySelector('.queue-drag-handle') ?? row
      ).getBoundingClientRect();
      return drag!.y < box.top + box.height / 2;
    });
    preview(index < 0 ? ids.length - 1 : index);
  };
  const scroll = () => {
    if (!drag || drag.pointerId === null) return;
    let scroller: HTMLElement | null = list;
    while (
      scroller.parentElement &&
      scroller.scrollHeight <= scroller.clientHeight
    )
      scroller = scroller.parentElement;
    const bounds = scroller.getBoundingClientRect();
    const step =
      drag.y < bounds.top + 28 ? -8 : drag.y > bounds.bottom - 28 ? 8 : 0;
    if (step) {
      scroller.scrollTop += step;
      locate();
    }
    drag.frame = requestAnimationFrame(scroll);
  };
  list.addEventListener('pointerdown', (event) => {
    const handle = (event.target as Element).closest<HTMLElement>(
      '.queue-drag-handle',
    );
    if (locked || !handle || event.button !== 0 || ids.length < 2) return;
    if (drag) finish(false);
    const row = handle.closest<HTMLElement>('.queue-item')!;
    const from = ids.indexOf(row.dataset.queueItemId!);
    if (from < 0) return;
    event.preventDefault();
    const abort = new AbortController();
    drag = {
      from,
      to: from,
      start: event.clientY,
      y: event.clientY,
      pointerId: event.pointerId,
      row,
      handle,
      moving: false,
      ghost: null,
      abort,
      frame: 0,
    };
    handle.setPointerCapture?.(event.pointerId);
    const options = { signal: abort.signal };
    document.addEventListener(
      'pointermove',
      (next) => {
        if (!drag || next.pointerId !== drag.pointerId) return;
        drag.y = next.clientY;
        if (!drag.moving && Math.abs(next.clientY - drag.start) < 6) return;
        next.preventDefault();
        if (!drag.moving) {
          drag.moving = true;
          const box = row.getBoundingClientRect();
          const ghost = row.cloneNode(true) as HTMLElement;
          ghost.classList.add('queue-drag-ghost');
          ghost.setAttribute('aria-hidden', 'true');
          for (const node of [ghost, ...ghost.querySelectorAll('[id]')])
            node.removeAttribute('id');
          ghost.style.width = `${box.width}px`;
          ghost.style.left = `${box.left}px`;
          document.body.append(ghost);
          drag.ghost = ghost;
          drag.frame = requestAnimationFrame(scroll);
        }
        drag.ghost!.style.top = `${next.clientY - 22}px`;
        locate();
      },
      { ...options, passive: false },
    );
    document.addEventListener(
      'pointerup',
      (next) => {
        if (next.pointerId === drag?.pointerId) finish(true);
      },
      options,
    );
    document.addEventListener('pointercancel', () => finish(false), options);
    handle.addEventListener('lostpointercapture', () => finish(false), options);
    document.addEventListener(
      'keydown',
      (next) => {
        if (next.key === 'Escape') finish(false);
      },
      options,
    );
  });
  list.addEventListener('keydown', (event) => {
    const handle = (event.target as Element).closest<HTMLElement>(
      '.queue-drag-handle',
    );
    if (!handle || locked || ids.length < 2) return;
    if (!drag && [' ', 'Enter'].includes(event.key)) {
      event.preventDefault();
      const row = handle.closest<HTMLElement>('.queue-item')!;
      const from = ids.indexOf(row.dataset.queueItemId!);
      drag = {
        from,
        to: from,
        start: 0,
        y: 0,
        pointerId: null,
        row,
        handle,
        moving: true,
        ghost: null,
        abort: new AbortController(),
        frame: 0,
      };
      preview(from);
    } else if (
      drag?.pointerId === null &&
      ['ArrowUp', 'ArrowDown', ' ', 'Enter', 'Escape'].includes(event.key)
    ) {
      event.preventDefault();
      if (event.key === 'Escape') finish(false);
      else if ([' ', 'Enter'].includes(event.key)) finish(true);
      else preview(drag.to + (event.key === 'ArrowUp' ? -1 : 1));
    }
  });
}
