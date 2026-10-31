// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppView } from '../../src/client/views/AppView.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';
import type { SaveRepository } from '../../src/client/models/SaveRepository.js';

function setup() {
  const initial = tradeNetworkState();
  const state = {
    ...initial,
    researched: [...initial.researched, 'Automated exploration'] as const,
    fleets: initial.fleets.map((fleet) =>
      fleet.id === 'freighters' ? { ...fleet, routeId: 'route-test' } : fleet,
    ),
  };
  const save = vi.fn<SaveRepository['save']>();
  const model = new AppModel(undefined, {
    load: () => ({ state, lastPlayed: '2026-10-31' }),
    save,
    clear() {},
  });
  model.startSlot(1);
  model.openFleet('fleet-home');
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  let mapIntent: IntentHandler = () => {};
  const view = new AppView(root, (_container, emit) => {
    mapIntent = emit;
    return { render() {}, dispose() {} };
  });
  const controller = new AppController(model, view);
  controller.start();
  const click = (label: string) =>
    root.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click();
  return {
    model,
    root,
    controller,
    click,
    save,
    emitMap: (intent: Parameters<IntentHandler>[0]) => mapIntent(intent),
  };
}

describe('egen-ordervy / skeppsanpassade-specialorder / flottval-pa-orderkarta / patrullcentrum-vid-order', () => {
  it('keeps exactly Move, Stop and Orders in the fleet toolbar and uses named, explained special orders in a separate view', () => {
    const { model, root, click, controller } = setup();
    expect(
      [
        ...root.querySelectorAll(
          '.selected-fleet-card .fleet-primary-orders button',
        ),
      ].map((button) => button.textContent),
    ).toEqual(['Move', 'Stop', 'Orders']);
    click('Orders');
    expect(model.snapshot.screen).toBe('orders');
    expect(root.querySelector('.orders-view')!.textContent).toContain(
      'Explore unknown hexes',
    );
    expect(root.querySelector('.orders-view [aria-label="Move"]')).toBeNull();
    expect(root.querySelector('[aria-label="Auto salvage"]')).toBeNull();
    click('Explore stars');
    expect(model.snapshot.fleets[0]!.exploration).toBe('explore-stars');
    expect(model.snapshot.screen).toBe('fleets');
    controller.dispose();
  });

  it('shows eligible fleets on the order map and excludes route fleets from targets and markers', () => {
    const { model, click, controller } = setup();
    click('Orders');
    click('Join fleet');
    expect(
      model.snapshot.orderView!.fleetTargets.map((fleet) => fleet.id),
    ).not.toContain('freighters');
    expect(model.snapshot.fleets.map((fleet) => fleet.id)).not.toContain(
      'freighters',
    );
    model.selectMapFleet('travellers');
    expect(model.snapshot.orderView!.selectedFleetId).toBe('travellers');
    model.completeOrder({ kind: 'join-fleet', fleetId: 'travellers' });
    expect(model.snapshot.fleets[0]!.joinFleetId).toBe('travellers');
    controller.dispose();
  });

  it('waits for a Patrol position before changing the order', () => {
    const { model, click, controller, save, emitMap } = setup();
    click('Orders');
    click('Patrol');
    expect(model.snapshot.fleets[0]!.patrol).toBeUndefined();
    emitMap({ type: 'select', position: new HexCoordinate(7, 0) });
    expect(model.snapshot.fleets[0]!.patrol!.center).toEqual(
      new HexCoordinate(7, 0),
    );
    expect(model.snapshot.fleets[0]!.destination).toEqual(
      new HexCoordinate(7, 0),
    );
    expect(save.mock.calls.at(-1)?.[1].state.fleets[0]!.patrol!.center).toEqual(
      { q: 7, r: 0 },
    );
    controller.dispose();
  });
});
