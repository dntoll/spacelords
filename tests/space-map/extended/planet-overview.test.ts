// @vitest-environment jsdom
import { completeConstruction } from '../../fixtures/construction.js';
import { describe, it, expect } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { renderPlanet } from '../../../src/client/space-map/views/planet/PlanetView.js';
import { renderResearch } from '../../../src/client/space-map/views/research/ResearchView.js';
import {
  TECHNOLOGIES,
  type BuildType,
} from '../../../src/client/space-map/models/Game.js';
import {
  BUILDING_IMAGES,
  buildingImage,
} from '../../../src/client/space-map/views/BuildingImage.js';
import { AppView } from '../../../src/client/app/views/AppView.js';

function setup() {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const model = new AppModel();
  const controller = new MasterController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  const click = (text: string) => {
    const button = [...root.querySelectorAll('button')].find(
      (b) => b.textContent === text || b.getAttribute('aria-label') === text,
    );
    expect(button, text).toBeDefined();
    button!.click();
  };
  click('Open planet');
  return { root, model, click };
}

describe('planetbudgetoversikt', () => {
  it('updates resource bars when construction is reserved and cancelled', () => {
    const { root, model, click } = setup();
    expect(root.querySelectorAll('.resource-budget')).toHaveLength(3);
    expect(
      root.querySelector<HTMLElement>('[data-resource="Iron"] .budget-used')
        ?.style.width,
    ).toBe('0%');
    model.build('Research station', 2);
    click('Building sites');
    click('Overview');
    expect(
      root.querySelector<HTMLElement>('[data-resource="Iron"] .budget-used')
        ?.style.width,
    ).not.toBe('0%');
    model.cancelProject(model.snapshot.planet!.projects[0]!.id);
    click('Building sites');
    click('Overview');
    expect(
      root.querySelector<HTMLElement>('[data-resource="Iron"] .budget-used')
        ?.style.width,
    ).toBe('0%');
  });
});

describe('gemensamma-byggnadsbilder', () => {
  it('kompakt-forskningstrad: marks only the research queue head as actively researching and exposes status accessibly', () => {
    const view = renderResearch(
      {
        available: TECHNOLOGIES,
        completed: [],
        selected: 'Exploration ship factory',
        queueBlockedReason: null,
        stations: 1,
        builtStations: 1,
        queue: [
          'Exploration ship factory',
          'Transport ship factory',
          'Trade logistics',
        ],
      },
      false,
      () => {},
    );
    expect(
      view.querySelectorAll('.research-node [aria-description="Researching"]'),
    ).toHaveLength(1);
    const active = view.querySelector<HTMLElement>('.research-node.active')!;
    expect(active.dataset.technology).toBe('Exploration ship factory');
    expect(active.querySelector('.research-node-marker')!.textContent).toBe(
      '▶',
    );
    expect(view.querySelectorAll('.research-node.queued')).toHaveLength(2);
    expect(view.querySelectorAll('.research-node-status')).toHaveLength(0);
  });
});

describe('planetbudgetoversikt', () => {
  it.each([
    [0, 0, 0],
    [10, 0, 10],
    [10, 4, 6],
    [10, 10, 0],
  ])(
    'shows accurate proportions for total %i, used %i, available %i',
    (total, used, available) => {
      const { model } = setup();
      const planet = model.snapshot.planet!;
      const view = renderPlanet(
        {
          ...planet,
          economy: {
            ...planet.economy,
            stock: {
              ...planet.economy.stock,
              Iron: total,
              Water: total,
              Oil: total,
            },
            demand: {
              ...planet.economy.demand,
              Iron: used,
              Water: used,
              Oil: used,
            },
            incoming: {
              ...planet.economy.incoming,
              Iron: available,
              Water: available,
              Oil: available,
            },
          },
        },
        'Owner',
        () => {},
      );
      const bar = view.querySelector('[data-resource="Iron"]')!;
      expect(bar.querySelector<HTMLElement>('.budget-used')!.style.width).toBe(
        `${total ? (used / total) * 100 : 0}%`,
      );
      expect(
        bar.querySelector<HTMLElement>('.budget-available')!.style.width,
      ).toBe(`${total ? (available / total) * 100 : 0}%`);
      expect(bar.textContent).toContain(`Stored ${total}`);
      expect(bar.textContent).toContain(`Incoming ${available}`);
    },
  );
  it('keeps completed building material costs at zero for demolition and Keep', () => {
    const { model, root, click } = setup();
    model.build('Research station');
    completeConstruction(model, 'Research station');

    model.openPlanet();
    new MasterController(
      model,
      new AppView(root, () => ({ render() {}, dispose() {} })),
    ).start();
    const used = () =>
      root.querySelector<HTMLElement>('[data-resource="Iron"] .budget-used')!
        .style.width;
    const original = used();
    click('Building sites');
    root.querySelector<HTMLButtonElement>('[aria-label="Demolish"]')!.click();
    click('Overview');
    expect(used()).toBe('0%');
    click('Building sites');
    root.querySelector<HTMLButtonElement>('[aria-label="Keep"]')!.click();
    click('Overview');
    expect(used()).toBe(original);
  });
});

describe('gemensamma-byggnadsbilder', () => {
  it('resolves supplied images under the app base and falls back after a load error', () => {
    const view = buildingImage(
      'Research station',
      'images/research-station.png',
    );
    const image = view.querySelector('img')!;
    expect(image.getAttribute('src')).toBe(
      `${import.meta.env.BASE_URL}images/research-station.png`,
    );
    image.dispatchEvent(new Event('error'));
    expect(view.querySelector('img')).toBeNull();
    expect(view.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      'Research station image placeholder',
    );
  });
});

describe('gemensamma-byggnadsbilder', () => {
  it('shows a distinct supplied image for every building and reuses it in Research', () => {
    const research = renderResearch(
      {
        available: TECHNOLOGIES,
        completed: TECHNOLOGIES,
        selected: null,
        queueBlockedReason: null,
        stations: 0,
        builtStations: 1,
        queue: [],
      },
      false,
      () => {},
    );
    const sources: string[] = [];
    for (const type of Object.keys(BUILDING_IMAGES) as BuildType[]) {
      const image = buildingImage(type).querySelector('img');
      expect(image, type).not.toBeNull();
      expect(image!.alt).toBe(type);
      sources.push(image!.getAttribute('src')!);
      expect(
        research
          .querySelector<HTMLImageElement>(`img[alt="${type}"]`)
          ?.getAttribute('src'),
      ).toBe(image!.getAttribute('src'));
    }
    expect(new Set(sources).size).toBe(4);
  });
});
