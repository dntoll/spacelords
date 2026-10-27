// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { renderFleetOrders } from '../../src/client/views/FleetOrdersView.js';

function setup() {
  const model = new AppModel().snapshot;
  const emit = vi.fn();
  const toolbar = renderFleetOrders(model.fleets[0]!, model, emit);
  document.body.replaceChildren(toolbar);
  Object.defineProperties(toolbar, {
    clientWidth: { value: 88 },
    scrollWidth: { value: 264 },
    setPointerCapture: { value: vi.fn() },
    releasePointerCapture: { value: vi.fn() },
    hasPointerCapture: { value: () => true },
  });
  const pointer = (target: Element, type: string, x: number) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      clientX: x,
      button: 0,
    });
    Object.defineProperties(event, {
      pointerId: { value: 1 },
      pointerType: { value: 'mouse' },
    });
    target.dispatchEvent(event);
  };
  return { toolbar, emit, pointer, button: toolbar.querySelector('button')! };
}

describe('dragbara-flottorder', () => {
  it('scrolls from a button after six pixels and suppresses its subsequent click', () => {
    const { toolbar, emit, pointer, button } = setup();
    pointer(button, 'pointerdown', 100);
    pointer(toolbar, 'pointermove', 96);
    expect(toolbar.scrollLeft).toBe(0);
    pointer(toolbar, 'pointermove', 50);
    expect(toolbar.scrollLeft).toBe(50);
    pointer(toolbar, 'pointerup', 50);
    button.click();
    expect(emit).not.toHaveBeenCalled();
    pointer(button, 'pointerdown', 50);
    pointer(button, 'pointerup', 50);
    button.click();
    expect(emit).toHaveBeenCalledOnce();
  });
  it('does not treat a cancelled drag as an order', () => {
    const { toolbar, emit, pointer, button } = setup();
    pointer(button, 'pointerdown', 100);
    pointer(toolbar, 'pointermove', 30);
    pointer(toolbar, 'pointercancel', 30);
    button.click();
    expect(emit).not.toHaveBeenCalled();
  });
});
