// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bindQueueOrder,
  decorateQueueRow,
} from '../../src/client/views/QueueView.js';

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});
function setup(locked = false) {
  const list = document.createElement('ol');
  document.body.append(list);
  const move = vi.fn();
  const ids = ['a', 'b', 'c'];
  ids.forEach((id, index) => {
    const row = document.createElement('li');
    row.textContent = id;
    decorateQueueRow(row, id, id, locked);
    vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, index * 50, 300, 50),
    );
    vi.spyOn(
      row.querySelector('.queue-drag-handle')!,
      'getBoundingClientRect',
    ).mockReturnValue(new DOMRect(0, index * 50, 44, 44));
    list.append(row);
  });
  bindQueueOrder(list, ids, move, locked);
  const handle = list.querySelector<HTMLButtonElement>('.queue-drag-handle')!;
  const key = (value: string) =>
    handle.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: value,
        bubbles: true,
        cancelable: true,
      }),
    );
  const pointer = (target: EventTarget, type: string, y: number) => {
    const event = new MouseEvent(type, {
      clientY: y,
      bubbles: true,
      cancelable: true,
      button: 0,
    });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    target.dispatchEvent(event);
  };
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  return { list, move, ids, handle, key, pointer };
}
describe('dragbara-koer', () => {
  it('previews keyboard movement, bounds it and commits only on drop', () => {
    const { key, move, list, ids } = setup();
    key(' ');
    key('ArrowUp');
    key('ArrowDown');
    key('ArrowDown');
    key('ArrowDown');
    expect(move).not.toHaveBeenCalled();
    expect(list.lastElementChild?.classList.contains('queue-drop-after')).toBe(
      true,
    );
    expect(document.querySelector('[role="status"]')?.textContent).toContain(
      'position 3 of 3',
    );
    key('Enter');
    expect(move).toHaveBeenCalledExactlyOnceWith('a', 2);
    expect(ids).toEqual(['a', 'b', 'c']);
    expect(list.querySelector('.queue-dragging')).toBeNull();
  });
  it('cancels keyboard moves and rejects locked interaction', () => {
    const normal = setup();
    normal.key(' ');
    normal.key('ArrowDown');
    normal.key('Escape');
    expect(normal.move).not.toHaveBeenCalled();
    expect(normal.list.querySelector('.queue-drop-after')).toBeNull();
    const locked = setup(true);
    locked.key(' ');
    locked.key('ArrowDown');
    locked.key('Enter');
    expect(locked.move).not.toHaveBeenCalled();
    expect(locked.handle.disabled).toBe(true);
  });
  it('commits pointer movement outside the list but leaves tiny and cancelled drags unchanged', () => {
    const { pointer, handle, move, list } = setup();
    pointer(handle, 'pointerdown', 25);
    pointer(document, 'pointermove', 29);
    pointer(document, 'pointerup', 29);
    expect(move).not.toHaveBeenCalled();
    pointer(handle, 'pointerdown', 25);
    pointer(document, 'pointermove', 300);
    expect(move).not.toHaveBeenCalled();
    expect(list.lastElementChild?.classList.contains('queue-drop-after')).toBe(
      true,
    );
    pointer(document, 'pointercancel', 300);
    expect(move).not.toHaveBeenCalled();
    expect(document.querySelector('.queue-drag-ghost')).toBeNull();
    pointer(handle, 'pointerdown', 25);
    pointer(document, 'pointermove', 300);
    pointer(document, 'pointerup', 300);
    expect(move).toHaveBeenCalledExactlyOnceWith('a', 2);
  });
});
