// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { playerNoticeText } from '../../../src/client/app/views/playerNoticeText.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import {
  HexCoordinate,
  HexGeometry,
} from '../../../src/client/common/HexCoordinate.js';

beforeEach(() => document.body.replaceChildren());

function setup(model = new AppModel()) {
  const root = document.createElement('div');
  document.body.append(root);
  const view = new AppView(root, () => ({ render() {}, dispose() {} }));
  const controller = new MasterController(model, view);
  controller.start();
  const click = (label: string) => {
    const target = (
      label === 'Orders'
        ? (root.querySelector('.selected-fleet-card') ?? root)
        : root
    ).querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);
    expect(target, label).not.toBeNull();
    target!.click();
  };
  return { model, root, view, click };
}

describe('flottadministration / flottval-pa-kartan', () => {
  it('shows ships directly without an expansion control or help disclosure', () => {
    const { root } = setup();
    const panel = root.querySelector('.map-fleet-management')!;
    expect(
      panel.querySelectorAll('.ship-manifest .ship-portrait'),
    ).toHaveLength(2);
    expect(panel.querySelector('.fleet-panel-sizing')).toBeNull();
    expect(panel.querySelector('.fleet-panel-help')).toBeNull();
    expect(panel.textContent).not.toContain('Expand fleet panel');
    expect(panel.textContent).not.toContain('Help');
  });
});

describe('flottnamn-direktredigering', () => {
  it('supports double click, preserves draft and caret on rerender, and saves with Enter', () => {
    const { model, root, view } = setup();
    root
      .querySelector('.fleet-name-button')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    let input = root.querySelector<HTMLInputElement>(
      '[aria-label="Fleet name"]',
    )!;
    expect(input).not.toBeNull();
    input.value = 'Northern Fleet';
    input.setSelectionRange(5, 5);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    view.render(model.snapshot);
    input = root.querySelector<HTMLInputElement>('[aria-label="Fleet name"]')!;
    expect(input.value).toBe('Northern Fleet');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(5);
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(model.snapshot.fleets[0]!.name).toBe('Northern Fleet');
    expect(root.querySelector('[aria-label="Fleet name"]')).toBeNull();
  });

  it('cancels with Escape or blur and leaves invalid names editable', () => {
    const { model, root } = setup();
    root
      .querySelector('.fleet-name-button')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    let input = root.querySelector<HTMLInputElement>(
      '[aria-label="Fleet name"]',
    )!;
    input.value = '   ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input = root.querySelector<HTMLInputElement>('[aria-label="Fleet name"]')!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(playerNoticeText(model.snapshot.notice)).toContain('1–40');
    expect(root.querySelector('[aria-label="Fleet name"]')).not.toBeNull();
    root
      .querySelector('input')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    expect(model.snapshot.fleets[0]!.name).toBe('Home Fleet');
    root
      .querySelector('.fleet-name-button')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    root.querySelector<HTMLInputElement>('[aria-label="Fleet name"]')!.blur();
    expect(root.querySelector('[aria-label="Fleet name"]')).toBeNull();
    warn.mockRestore();
  });
});

describe('flottknappar-pa-kartan / flottadministration', () => {
  it('provides destination selection without drag and removes the old map buttons', () => {
    const { model, root, view } = setup();
    expect(root.querySelector('[aria-label="Set destination"]')).toBeNull();
    expect(root.querySelector('[aria-label="Edit fleet"]')).toBeNull();
    expect(
      root.querySelector('[aria-label="Choose destination for Home Fleet"]'),
    ).toBeNull();
    expect(root.querySelector('[aria-label="Clear destination"]')).toBeNull();
    model.select(new HexCoordinate(0, 1));
    model.select(new HexCoordinate(0, 1));
    view.render(model.snapshot);
    expect(model.snapshot.fleets[0]!.destination?.key).toBe('0,1');
  });

  it('delad-kartkamera: explicitly opens a fleet without resetting zoom', () => {
    const { model, root, view } = setup();
    model.zoom(1.5, { x: 0, y: 0 });
    model.setDestination('fleet-home', 0, 1);
    model.pan({ x: 80, y: 25 });
    model.openFleet('fleet-home');
    view.render(model.snapshot);
    expect(
      root
        .querySelector('.selected-fleet-card')!
        .getAttribute('aria-description'),
    ).toContain('Destination: Vesta');
    expect(model.snapshot.screen).toBe('fleets');
    expect(model.snapshot.mapFleetId).toBe('fleet-home');
    expect(model.snapshot.camera.center).toEqual(
      HexGeometry.toPoint(model.snapshot.fleets[0]!.position!),
    );
    expect(model.snapshot.camera.zoom).toBe(1.5);
  });
});
