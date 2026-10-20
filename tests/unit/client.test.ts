// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { AppController } from '../../src/client/controllers/AppController.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
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

describe('bygga-forskningsstation', () => {
  it('offers a research station build order', () => {
    start();
    click('Open planet');
    click('Build building');
    const build = [...root.querySelectorAll('button')].find(
      (button) => button.textContent === 'Build Research station',
    );
    expect(build?.disabled).toBe(false);
  });
});

describe('forskningsoversikt', () => {
  it('shows factory research and its station prerequisite', () => {
    start();
    click('Research');
    expect(root.querySelector('h1')?.textContent).toBe('Research');
    expect(root.textContent).toContain('Research station');
    expect(root.textContent).toContain(
      'Build a Research station to advance research.',
    );
    expect(root.querySelectorAll('[data-technology]')).toHaveLength(7);
    click('Research Colony ship factory');
    expect(root.textContent).toContain('Researching · 0/1 points');
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
  it('shows management in Overview without construction tabs', () => {
    start();
    click('Open planet');
    expect(root.querySelector('[role="tab"]')).toBeNull();
    expect(root.querySelector('.overview')?.textContent).toContain(
      'Building sites',
    );
    expect(root.querySelector('.overview')?.textContent).toContain('Resources');
  });
});

describe('byggnaders-resursanvandning', () => {
  it('shows upkeep per completed building in Buildings', () => {
    const model = new AppModel();
    model.build('Research station');
    model.startTurn();
    model.finishTurn();

    model.openPlanet();
    const controller = new AppController(model, new AppView(root, mapFactory));
    controller.start();
    expect(root.querySelector('.building-panel')?.textContent).toContain(
      '600 workers · No recurring material cost',
    );
  });
});

function advance(model: AppModel): void {
  for (const frame of model.startTurn()) model.applyTurnFrame(frame);
  model.finishTurn();
}
function buildShipyard(model: AppModel): void {
  model.build('Research station');
  advance(model);
  model.research('Colony ship factory');
  advance(model);
  advance(model);
  model.build('Colony ship factory');
  advance(model);
}

describe('planetbyggplatser / visa-byggalternativ / forska-fram-fabriker', () => {
  it('opens a site-specific menu with researched buildings, costs, effects and image placeholders', () => {
    const model = new AppModel();
    model.build('Research station');
    advance(model);
    model.research('Colony ship factory');
    advance(model);
    advance(model);
    model.openPlanet();
    new AppController(model, new AppView(root, mapFactory)).start();
    expect(root.querySelectorAll('.building-site')).toHaveLength(10);
    expect(root.querySelector('.building-menu')).toBeNull();
    click('Build building');
    const menu = root.querySelector('.building-menu')!;
    expect(menu.textContent).toContain('Colony ship factory');
    expect(menu.textContent).toContain('Exploration ship factory');
    expect(menu.textContent).not.toContain('Queue Colony ship');
    expect(menu.textContent).toContain('Iron 18 units at build start');
    expect(menu.textContent).toContain('Water 10 units at build start');
    expect(menu.textContent).toContain('Oil 6 units at build start');
    expect(menu.textContent).toContain('2000 workers');
    expect(menu.querySelector('img')).not.toBeNull();
    click('Build Colony ship factory');
    expect(model.snapshot.planet!.sites[1]!.project?.type).toBe(
      'Colony ship factory',
    );
    click('Build building');
    const queuedAgain = [
      ...root.querySelectorAll<HTMLButtonElement>('.building-choice button'),
    ].find((b) => b.textContent === 'Build Colony ship factory')!;
    expect(queuedAgain.disabled).toBe(false);
  });
});

describe('fabrikskoer / skepp-till-destinationsflotta', () => {
  it('routes shared planet production, reordering, recipients and cancellation through the controller', () => {
    const model = new AppModel();
    buildShipyard(model);
    const home = model.snapshot.fleets[0]!;
    model.createFleet(home.id);
    const target = model.snapshot.fleets[1]!;
    model.openPlanet();
    new AppController(model, new AppView(root, mapFactory)).start();
    const site = () =>
      root.querySelector<HTMLElement>('[data-site-index="1"]')!;
    const production = () => root.querySelector('.planet-building-queue')!;
    expect(root.querySelectorAll('.queue-slots')).toHaveLength(1);
    expect(site().querySelectorAll('.queue-slots')).toHaveLength(0);
    expect(
      site().querySelector('[aria-label="Build ships at site 2"]'),
    ).toBeNull();
    const select = site().querySelector<HTMLSelectElement>(
      '[aria-label="Destination fleet for Colony ship"]',
    )!;
    select.value = target.id;
    click('Queue Colony ship');
    click('Queue Colony ship');
    const queue = () => model.snapshot.planet!.projects;
    expect(queue()[0]!.destinationFleetId).toBe(target.id);
    expect(production().querySelectorAll('.queue-order')).toHaveLength(2);
    const second = queue()[1]!.id;
    production()
      .querySelectorAll<HTMLButtonElement>('[aria-label^="Move up"]')[1]!
      .click();
    expect(queue()[0]!.id).toBe(second);
    const queuedFleet = production().querySelector<HTMLSelectElement>(
      '.queue-order select',
    )!;
    queuedFleet.value = target.id;
    queuedFleet.dispatchEvent(new Event('change'));
    expect(queue()[0]!.destinationFleetId).toBe(target.id);
    const drop = new Event('drop', { cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', {
      value: { getData: () => queue()[1]!.id },
    });
    production().querySelector('.queue-order')!.dispatchEvent(drop);
    expect(queue()[0]!.id).not.toBe(second);
    click('Cancel');
    expect(queue()).toHaveLength(1);
  });
});

describe('kolonisation / kartorderstatus', () => {
  it('offers Colonize at an uninhabited destination and opens the resulting colony', () => {
    const model = new AppModel();
    buildShipyard(model);
    model.scheduleShip('Colony ship', null);
    advance(model);
    model.setDestination('fleet-home', 0, 1);
    advance(model);
    model.select(new HexCoordinate(0, 1));
    new AppController(model, new AppView(root, mapFactory)).start();
    click('Colonize');
    expect(root.textContent).toContain('6 empty building sites');
    click('Open planet');
    expect(root.querySelector('h1')!.textContent).toBe('Vesta');
    expect(root.textContent).toContain('1,000');
    expect(root.querySelectorAll('.building-site')).toHaveLength(6);
    click('Build building');
    expect(
      root.querySelector<HTMLButtonElement>('.building-menu button')!.disabled,
    ).toBe(false);
  });
});
