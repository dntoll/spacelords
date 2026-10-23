const compactLayout = '(max-width: 900px), (max-height: 500px)';

// rullningsbar-kartpanel: consume expansion before moving the panel's content.
export function bindMapSelectionScroll(
  panel: HTMLElement,
  page: HTMLElement,
): () => void {
  let expansion = 0;
  let touch: { id: number; x: number; y: number; started: boolean } | null =
    null;
  const isCompact = () => window.matchMedia?.(compactLayout).matches ?? true;
  const setExpansion = (height: number) => {
    expansion = height;
    panel.style.setProperty('--selection-expansion', `${height}px`);
  };
  const scroll = (distance: number) => {
    const maximum = Math.max(
      0,
      Math.min(
        page.clientHeight * 0.35,
        panel.scrollHeight - panel.clientHeight + expansion,
      ),
    );
    let remaining = distance;
    if (remaining > 0) {
      const growth = Math.min(remaining, Math.max(0, maximum - expansion));
      setExpansion(expansion + growth);
      remaining -= growth;
    } else {
      const upward = Math.min(-remaining, panel.scrollTop);
      panel.scrollTop -= upward;
      remaining += upward;
      const shrink = Math.min(-remaining, expansion);
      setExpansion(expansion - shrink);
      remaining += shrink;
    }
    panel.scrollTop = Math.max(
      0,
      Math.min(
        panel.scrollHeight - panel.clientHeight,
        panel.scrollTop + remaining,
      ),
    );
  };
  panel.addEventListener(
    'wheel',
    (event) => {
      if (
        !isCompact() ||
        event.ctrlKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      )
        return;
      event.preventDefault();
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? panel.clientHeight
            : 1;
      scroll(event.deltaY * unit);
    },
    { passive: false },
  );
  panel.addEventListener(
    'touchstart',
    (event) => {
      touch = null;
      if (
        !isCompact() ||
        event.touches.length !== 1 ||
        (event.target instanceof Element &&
          event.target.closest(
            '.ship-token, input, textarea, select, [contenteditable]',
          ))
      )
        return;
      const point = event.touches[0]!;
      touch = {
        id: point.identifier,
        x: point.clientX,
        y: point.clientY,
        started: false,
      };
    },
    { passive: true },
  );
  panel.addEventListener(
    'touchmove',
    (event) => {
      if (!touch || event.touches.length !== 1 || !isCompact()) {
        touch = null;
        return;
      }
      const point = event.touches[0]!;
      if (point.identifier !== touch.id) {
        touch = null;
        return;
      }
      const distance = touch.y - point.clientY;
      if (!touch.started) {
        if (Math.abs(point.clientX - touch.x) > Math.abs(distance)) {
          touch = null;
          return;
        }
        if (Math.abs(distance) < 6) return;
        touch.started = true;
      }
      event.preventDefault();
      scroll(distance);
      touch.y = point.clientY;
    },
    { passive: false },
  );
  const cancelTouch = () => {
    touch = null;
  };
  panel.addEventListener('touchend', cancelTouch);
  panel.addEventListener('touchcancel', cancelTouch);
  panel.addEventListener('keydown', (event) => {
    if (
      !isCompact() ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      (event.target instanceof Element &&
        event.target.closest(
          'input, textarea, select, button, [contenteditable]',
        ))
    )
      return;
    const distance = {
      ArrowDown: 40,
      ArrowUp: -40,
      PageDown: panel.clientHeight * 0.9,
      PageUp: -panel.clientHeight * 0.9,
      ' ': panel.clientHeight * (event.shiftKey ? -0.9 : 0.9),
      Home: -(panel.scrollHeight + expansion),
      End: panel.scrollHeight + page.clientHeight,
    }[event.key];
    if (distance === undefined) return;
    event.preventDefault();
    scroll(distance);
  });
  return cancelTouch;
}
