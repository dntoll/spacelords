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
    click('Open planet');
    expect(root.querySelector('h1')?.textContent).toBe('Tellus');
    expect(root.textContent).toContain('12,000');
    expect(root.textContent).toContain('100%');
    expect(root.textContent).toContain('42 units/year');
    expect(root.textContent).toContain('0');
    expect(root.textContent).toContain('Your empire');
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

describe('bygga-forskningsstation', () => {
  it('offers a research station build order', () => {
    start();
    click('Open planet');
    click('Construction');
    const build = [...root.querySelectorAll('button')].find(
      (button) => button.textContent === 'Build Research station',
    );
    expect(build?.disabled).toBe(false);
  });
});

describe('forskningsoversikt', () => {
  it('explains future research without pretending research is running', () => {
    start();
    click('Research');
    expect(root.querySelector('h1')?.textContent).toBe('Research');
    expect(root.textContent).toContain('Research station');
    expect(root.textContent).toContain('Research is not available yet');
    expect(root.querySelector('[data-technology]')).toBeNull();
    click('Back to map');
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
    click('Research');
    expect(disposed).toBe(1);
    click('Back to map');
    controller.dispose();
    expect(disposed).toBe(2);
    expect(root.childElementCount).toBe(0);
  });
});

describe('english-game / focused-interface', () => {
  it('keeps useful object information and exposes game actions in English', () => {
    start();
    expect(
      root.querySelector('[aria-label="Selected hex"]')?.textContent,
    ).toContain('Your first colony among the stars.');
    expect(root.querySelector('[aria-label="Open planet"]')).not.toBeNull();
    expect(root.textContent).not.toContain('Din plats i galaxen.');
    click('Open planet');
    expect(root.textContent).toContain('Your empire');
    expect(root.textContent).toContain('Population');
  });
});

describe('focused-interface', () => {
  it('retains descriptions when selecting stars and uninhabited planets', () => {
    start();
    const known = root.querySelector('select')!;
    const select = (name: string): void => {
      known.value = [...known.options].find(
        (option) => option.textContent === name,
      )!.value;
      known.dispatchEvent(new Event('change'));
    };
    select('Sol');
    expect(
      root.querySelector('[aria-label="Selected hex"]')?.textContent,
    ).toContain('A star shining through unexplored space.');
    select('Vesta');
    expect(
      root.querySelector('[aria-label="Selected hex"]')?.textContent,
    ).toContain('An uninhabited world near your homeworld.');
    expect(root.querySelector('[aria-label="Open planet"]')).toBeNull();
  });
});

describe('viewport-game-layout', () => {
  it('exposes one planet panel at a time', () => {
    start();
    click('Open planet');
    const overview = root.querySelector('[role="tab"][aria-selected="true"]');
    expect(overview?.textContent).toBe('Overview');
    click('Construction');
    expect(root.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
    expect(root.querySelector('[role="tabpanel"]')?.textContent).toContain(
      'Construction',
    );
    click('Overview');
    expect(
      root.querySelector('[role="tab"][aria-selected="true"]')?.textContent,
    ).toBe('Overview');
    expect(root.querySelector('button')?.textContent).not.toBe('');
  });
});
