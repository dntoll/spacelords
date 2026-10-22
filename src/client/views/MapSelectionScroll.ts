// rullningsbar-kartpanel: keep native scrolling for touch, wheel and keyboard.
export function bindMapSelectionScroll(
  panel: HTMLElement,
  page: HTMLElement,
): () => void {
  let expansion = 0;
  let userScrolling = false;
  const beginScroll = () => {
    userScrolling = true;
  };
  panel.addEventListener('wheel', beginScroll, { passive: true });
  panel.addEventListener('touchmove', beginScroll, { passive: true });
  panel.addEventListener('keydown', (event) => {
    if (
      [
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'Home',
        'End',
        ' ',
      ].includes(event.key) &&
      !(
        event.target instanceof Element &&
        event.target.closest(
          'input, textarea, select, button, [contenteditable]',
        )
      )
    )
      beginScroll();
  });
  panel.addEventListener('pointerdown', (event) => {
    if (event.target === panel && event.offsetX >= panel.clientWidth)
      beginScroll();
  });
  panel.addEventListener('scroll', () => {
    if (!userScrolling) return;
    // Include the space already gained so resizing cannot feed back into scrolling.
    const overflow = panel.scrollHeight - panel.clientHeight + expansion;
    expansion = Math.max(
      0,
      Math.min(panel.scrollTop, overflow / 2, page.clientHeight * 0.35),
    );
    panel.style.setProperty('--selection-expansion', `${expansion}px`);
  });
  return () => {
    userScrolling = false;
  };
}
