// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppView } from '../../src/client/views/AppView.js';
import { upgradeState } from '../fixtures/fleet-upgrades.js';

describe('flottorder-upgrade / spara-flottuppgradering', () => {
  it('orders and cancels Upgrade through the fleet toolbar and controller while persisting both actions', () => {
    const save = vi.fn();
    const model = new AppModel(undefined, {
      load: () => ({ state: upgradeState(), lastPlayed: '2026-10-31' }),
      save,
      clear() {},
    });
    model.startSlot(1);
    model.openFleet('fleet-home');
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    const controller = new AppController(model, view);
    controller.start();
    const button = (label: string) =>
      root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    button('Orders').click();
    expect(button('Upgrade').disabled).toBe(false);
    button('Upgrade').click();
    expect(model.snapshot.fleets[0]!.upgrade).toBeDefined();
    expect(root.querySelector('.fleet-upgrade-status')!.textContent).toContain(
      'Tellus',
    );
    expect(save).toHaveBeenCalled();
    button('Cancel Upgrade').click();
    expect(model.snapshot.fleets[0]!.upgrade).toBeUndefined();
    button('Orders').click();
    expect(button('Upgrade').disabled).toBe(false);
    expect(save.mock.calls.length).toBeGreaterThan(1);
    controller.dispose();
  });
});
