// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppView } from '../../src/client/views/AppView.js';
import type { MapFactory } from '../../src/client/views/ViewContracts.js';

let root: HTMLElement;
let disposed: number;
const mapFactory: MapFactory = () => ({
  render: () => undefined,
  dispose: () => {
    disposed += 1;
  },
});

beforeEach(() => {
  document.body.replaceChildren();
  root = document.createElement('div');
  document.body.append(root);
  disposed = 0;
});

function start(): AppController {
  const controller = new AppController(
    new AppModel(),
    new AppView(root, mapFactory),
  );
  controller.start();
  return controller;
}

function click(label: string): void {
  const button = [...root.querySelectorAll('button')].find(
    (candidate) => candidate.textContent === label,
  );
  expect(button).toBeDefined();
  button?.click();
}

describe('planetinformation', () => {
  it('opens the owned planet and presents its actual model values', () => {
    start();
    click('Öppna planet');
    expect(root.querySelector('h1')?.textContent).toBe('Tellus');
    expect(root.textContent).toContain('12 000');
    expect(root.textContent).toContain('100 %');
    expect(root.textContent).toContain('42 enheter/år');
    expect(root.textContent).toContain('0 av 6');
    expect(root.textContent).toContain('Ditt imperium');
  });

  it('treats planet names as text rather than markup', () => {
    const model = new AppModel();
    model.openPlanet();
    const view = new AppView(root, mapFactory);
    view.render({
      ...model.snapshot,
      planet: {
        ...model.snapshot.planet!,
        name: '<img src=x onerror="alert(1)">',
      },
    });
    expect(root.querySelector('h1')?.textContent).toBe(
      '<img src=x onerror="alert(1)">',
    );
    expect(root.querySelector('img')).toBeNull();
  });
});

describe('visa-byggalternativ', () => {
  it('shows research availability without allowing a build order', () => {
    start();
    click('Öppna planet');
    const build = [...root.querySelectorAll('button')].find(
      (button) => button.textContent === 'Bygg forskningsstation',
    );
    expect(build?.disabled).toBe(true);
    expect(root.textContent).toContain('Tillgänglig från start');
    expect(root.textContent).toContain('Byggande kommer i nästa steg');
  });
});

describe('forskningsoversikt', () => {
  it('explains future research without pretending research is running', () => {
    start();
    click('Forskning');
    expect(root.querySelector('h1')?.textContent).toBe('Forskning');
    expect(root.textContent).toContain('Forskningsstation');
    expect(root.textContent).toContain('Forskning kommer senare');
    expect(root.querySelector('[data-technology]')).toBeNull();
    click('Tillbaka till kartan');
    expect(root.querySelector('[data-testid="map-container"]')).not.toBeNull();
  });
});

describe('lokal-sikt', () => {
  it('does not render unknown planet names in any HTML or accessibility text', () => {
    start();
    expect(root.outerHTML).not.toContain('Brontes');
    expect(root.outerHTML).not.toContain('Nadir I');
    expect(root.outerHTML).not.toContain('Aster I');
    expect(root.textContent).toContain('Tellus');
    expect(root.textContent).toContain('Vesta');
  });
});

describe('vynavigation', () => {
  it('disposes map resources on departure and at application teardown', () => {
    const controller = start();
    click('Forskning');
    expect(disposed).toBe(1);
    click('Tillbaka till kartan');
    controller.dispose();
    expect(disposed).toBe(2);
    expect(root.childElementCount).toBe(0);
  });
});
