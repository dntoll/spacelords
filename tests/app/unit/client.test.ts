// @vitest-environment jsdom
import { turnFrames } from '../../fixtures/turn-steps.js';
import { completeConstruction } from '../../fixtures/construction.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import type { MapFactory } from '../../../src/client/app/views/ViewContracts.js';

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

function start(): MasterController {
  const controller = new MasterController(
    new AppModel(),
    new AppView(root, mapFactory),
  );
  controller.start();
  return controller;
}

function click(label: string): void {
  const button = [...root.querySelectorAll('button')].find(
    (candidate) =>
      candidate.textContent === label ||
      candidate.getAttribute('aria-label') === label,
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
    expect(root.textContent).toContain('Stored 100');
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
    expect(root.querySelector('img[src="x"], [onerror]')).toBeNull();
  });
});

describe('forskningsoversikt', () => {
  // forskningsvy-utan-station replaces the disabled tree of a new game.
  it('shows no research tree before a Research station exists, only the way to build one', () => {
    start();
    click('Research');
    expect(root.querySelector('h1')?.textContent).toBe('Research');
    expect(root.textContent).toContain('Research needs a Research station.');
    expect(
      root.querySelector('[data-technology="Rocket engine factory"]'),
    ).toBeNull();
    click('Star map');
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
    expect(root.querySelector('.known-objects')).toBeNull();
  });
});

describe('vynavigation', () => {
  it('disposes map resources on departure and at application teardown', () => {
    const controller = start();
    click('Research');
    expect(disposed).toBe(1);
    click('Star map');
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
    ).toContain('A colony of your empire.');
    expect(root.querySelector('[aria-label="Open planet"]')).not.toBeNull();
    expect(root.textContent).not.toContain('Din plats i galaxen.');
    click('Open planet');
    expect(root.textContent).toContain('Your empire');
    expect(root.textContent).toContain('Population');
  });
});

describe('focused-interface', () => {
  it('retains descriptions when selecting stars and uninhabited planets', () => {
    const model = new AppModel();
    const view = new AppView(root, mapFactory);
    const select = (q: number, r: number): void => {
      model.select(new HexCoordinate(q, r));
      view.render(model.snapshot);
    };
    select(0, 0);
    expect(
      root.querySelector('[aria-label="Selected hex"]')?.textContent,
    ).toContain('A star. Its hex is impassable.');
    select(0, 1);
    expect(
      root.querySelector('[aria-label="Selected hex"]')?.textContent,
    ).toContain('An uninhabited world near your homeworld.');
    expect(root.querySelector('[aria-label="Open planet"]')).toBeNull();
  });
});

describe('viewport-game-layout', () => {
  it('separates Overview and building site management', () => {
    start();
    click('Open planet');
    expect(root.querySelector('[role="tab"]')).toBeNull();
    expect(root.querySelector('.overview')?.textContent).toContain('Buildings');
    expect(root.querySelector('.overview')?.textContent).toContain('Resources');
  });
});

describe('byggnaders-resursanvandning', () => {
  it('shows upkeep per completed building in Buildings', () => {
    const model = new AppModel();
    model.build('Research station');
    completeConstruction(model, 'Research station');

    model.openPlanet();
    const controller = new MasterController(
      model,
      new AppView(root, mapFactory),
    );
    controller.start();
    click('Building sites');
    expect(root.querySelector('.building-panel')?.textContent).toContain(
      '600 workers · No recurring material cost',
    );
  });
});

function advance(model: AppModel): void {
  for (const frame of turnFrames(model)) model.applyTurnFrame(frame);
  model.finishTurn();
}
function buildShipyard(model: AppModel): void {
  model.build('Research station');
  completeConstruction(model, 'Research station');
  model.research('Colony ship factory');
  advance(model);
  advance(model);
  advance(model);
  advance(model);
  model.build('Colony ship factory');
  completeConstruction(model, 'Colony ship factory');
  model.build('Rocket engine factory');
  completeConstruction(model, 'Rocket engine factory');
}

describe('kolonisation / kartorderstatus', () => {
  it('offers Colonize at an uninhabited destination and opens the resulting colony', () => {
    const model = new AppModel();
    buildShipyard(model);
    model.scheduleShip('Colony ship', null);
    // en-enhet-per-fabrik-och-runda: three engines, then the ship.
    for (let year = 0; year < 4; year++) advance(model);
    model.setDestination('fleet-home', 0, 1);
    advance(model);
    model.select(new HexCoordinate(0, 1));
    new MasterController(model, new AppView(root, mapFactory)).start();
    click('Orders');
    click('Colonize');
    model.select(new HexCoordinate(0, 1));
    new MasterController(model, new AppView(root, mapFactory)).start();
    expect(
      model.snapshot.cells.find((cell) => cell.position.key === '0,1')!.object!
        .owned,
    ).toBe(true);
    click('Open planet');
    expect(root.querySelector('h1')!.textContent).toBe('Vesta');
    expect(root.textContent).toContain('1,000');
    click('Building sites');
    expect(root.querySelectorAll('.building-site')).toHaveLength(6);
    expect(root.textContent).toContain(
      'A Dome is required before this site can be used.',
    );
    expect(root.querySelectorAll('.locked-site')).toHaveLength(5);
  });
});

describe('kompakta-koknappar', () => {
  it('uses symbols while preserving named research actions, boundaries and controller dispatch', () => {
    const model = new AppModel();
    model.build('Research station');
    completeConstruction(model, 'Research station');
    model.research('Exploration ship factory');
    model.research('Colony ship factory');
    model.research('Transport ship factory');
    model.openResearch();
    new MasterController(model, new AppView(root, mapFactory)).start();
    const rows = () => [...root.querySelectorAll('.research-queue article')];
    const buttons = () => [
      ...rows()[0]!.querySelectorAll<HTMLButtonElement>('button'),
    ];
    expect(buttons().map((b) => b.textContent)).toEqual(['⠿', '×']);
    expect(buttons()[0]!.disabled).toBe(false);
    for (const control of buttons()) {
      expect(control.getAttribute('aria-label')).toContain(
        'Rocket engine factory',
      );
      expect(control.title.length).toBeGreaterThan(0);
    }
    const handle =
      rows()[3]!.querySelector<HTMLButtonElement>('.queue-drag-handle')!;
    for (const key of [' ', 'ArrowDown', 'Enter'])
      handle.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true }),
      );
    expect(model.snapshot.research.queue[3]).toBe('Transport ship factory');
    rows()[4]!.querySelector<HTMLButtonElement>('.queue-icon-button')!.click();
    expect(model.snapshot.research.queue).toContain('Colony ship factory');
    click('Remove research');
    expect(model.snapshot.research.queue).not.toContain('Colony ship factory');
  });
});
