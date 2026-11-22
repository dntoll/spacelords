// @vitest-environment jsdom
import { renderMapLocationHeading } from '../../../src/client/space-map/views/index.js';
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
  it('treats planet names as text rather than markup', () => {
    const heading = renderMapLocationHeading('<img src=x onerror="alert(1)">');
    expect(heading.querySelector('h2')?.textContent).toBe(
      '<img src=x onerror="alert(1)">',
    );
    expect(heading.querySelector('img')).toBeNull();
  });
});

describe('forskningsoversikt', () => {
  // flottforskning-av-tekniker: the tree is shown, but research does not advance yet.
  it('shows the research tree and says that research does not advance yet', () => {
    start();
    click('Research');
    expect(root.querySelector('h1')?.textContent).toBe('Research');
    expect(root.textContent).toContain('Research does not advance yet.');
    expect(root.querySelector('[data-technology="Missiles"]')).not.toBeNull();
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
    ).toContain('A planet.');
    expect(root.querySelector('[aria-label="Open planet"]')).toBeNull();
    expect(root.textContent).not.toContain('Din plats i galaxen.');
    expect(root.textContent).toContain('Type: Temperate');
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
    ).toContain('A planet.');
    expect(root.querySelector('[aria-label="Open planet"]')).toBeNull();
  });
});

describe('kompakta-koknappar', () => {
  it('uses symbols while preserving named research actions, boundaries and controller dispatch', () => {
    const model = new AppModel();
    model.research('Missiles');
    model.research('Armored Transport');
    model.openResearch();
    new MasterController(model, new AppView(root, mapFactory)).start();
    const rows = () => [...root.querySelectorAll('.research-queue article')];
    const buttons = () => [
      ...rows()[0]!.querySelectorAll<HTMLButtonElement>('button'),
    ];
    expect(buttons().map((b) => b.textContent)).toEqual(['⠿', '×']);
    expect(buttons()[0]!.disabled).toBe(false);
    for (const control of buttons()) {
      expect(control.getAttribute('aria-label')).toContain('Missiles');
      expect(control.title.length).toBeGreaterThan(0);
    }
    const handle =
      rows()[0]!.querySelector<HTMLButtonElement>('.queue-drag-handle')!;
    for (const key of [' ', 'ArrowDown', 'Enter'])
      handle.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true }),
      );
    expect(model.snapshot.research.queue[1]).toBe('Missiles');
    rows()[2]!.querySelector<HTMLButtonElement>('.queue-icon-button')!.click();
    expect(model.snapshot.research.queue).toContain('Armored Transport');
    click('Remove research');
    expect(model.snapshot.research.queue).not.toContain('Armored Transport');
  });
});
