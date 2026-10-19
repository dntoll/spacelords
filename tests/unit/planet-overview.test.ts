// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { renderPlanet } from '../../src/client/views/PlanetView.js';
import { renderBuildSelection } from '../../src/client/views/BuildSelectionView.js';
import { renderResearch } from '../../src/client/views/ResearchView.js';
import { BUILDINGS, type BuildType } from '../../src/client/models/Game.js';
import { buildingImage } from '../../src/client/views/BuildingImage.js';
import { AppView } from '../../src/client/views/AppView.js';

function setup() {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const model = new AppModel();
  const controller = new AppController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  const click = (text: string) => {
    const button = [...root.querySelectorAll('button')].find(
      (b) => b.textContent === text,
    );
    expect(button, text).toBeDefined();
    button!.click();
  };
  click('Open planet');
  return { root, model, click };
}

describe('visa-byggalternativ', () => {
  it('opens a separate selection and returns to the original site after an order', () => {
    const { root, model, click } = setup();
    expect(root.querySelector('[role="tab"]')).toBeNull();
    root
      .querySelector<HTMLButtonElement>(
        '[aria-label="Build building at site 3"]',
      )!
      .click();
    expect(root.querySelector('h1')?.textContent).toBe('Build selection');
    expect(root.textContent).not.toContain('\ufffd');
    expect(root.querySelectorAll('.building-choice')).toHaveLength(1);
    expect(root.querySelectorAll('.cost-ok')).toHaveLength(4);
    click('Build Research station');
    expect(model.snapshot.planet?.sites[2]?.project?.type).toBe(
      'Research station',
    );
    expect(document.activeElement?.getAttribute('data-site-index')).toBe('2');
    expect(root.querySelector('h1')?.textContent).toBe('Tellus');
  });
  it('cancels without ordering and searches without losing input focus', () => {
    const { root, model, click } = setup();
    click('Build building');
    const search = root.querySelector<HTMLInputElement>(
      'input[type="search"]',
    )!;
    search.focus();
    search.value = 'unknown';
    search.dispatchEvent(new Event('input'));
    expect(root.querySelectorAll('.building-choice')).toHaveLength(0);
    expect(document.activeElement?.getAttribute('type')).toBe('search');
    click('Back to Overview');
    expect(model.snapshot.planet?.projects).toHaveLength(0);
  });
});

describe('planetbudgetoversikt', () => {
  it('updates resource bars when construction is reserved and cancelled', () => {
    const { root, click } = setup();
    expect(root.querySelectorAll('.resource-budget')).toHaveLength(3);
    expect(
      root.querySelector<HTMLElement>('[data-resource="Iron"] .budget-used')
        ?.style.width,
    ).toBe('0%');
    click('Build building');
    click('Build Research station');
    expect(
      root.querySelector<HTMLElement>('[data-resource="Iron"] .budget-used')
        ?.style.width,
    ).not.toBe('0%');
    click('Cancel construction');
    expect(
      root.querySelector<HTMLElement>('[data-resource="Iron"] .budget-used')
        ?.style.width,
    ).toBe('0%');
  });
});

describe('gemensamma-byggnadsbilder', () => {
  it('uses the same supplied image for selection and construction', () => {
    const { root, click } = setup();
    click('Build building');
    const label = root.querySelector('img')?.getAttribute('src');
    click('Build Research station');
    expect(root.querySelector('img')?.getAttribute('src')).toBe(label);
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
          budget: {
            ...planet.budget,
            production: { Iron: total, Water: total, Oil: total },
            reserved: { Iron: used, Water: used, Oil: used },
            available: { Iron: available, Water: available, Oil: available },
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
      expect(bar.textContent).toContain(`Total ${total} units/year`);
      expect(bar.textContent).toContain(`Available ${available}`);
    },
  );
  it('releases and restores upkeep reservations for demolition and Keep', () => {
    const { model, root } = setup();
    model.build('Research station');
    for (const frame of model.startTurn()) model.applyTurnFrame(frame);
    model.finishTurn();
    model.continuePlanning();
    model.openPlanet();
    new AppController(
      model,
      new AppView(root, () => ({ render() {}, dispose() {} })),
    ).start();
    const used = () =>
      root.querySelector<HTMLElement>('[data-resource="Iron"] .budget-used')!
        .style.width;
    const original = used();
    root.querySelector<HTMLButtonElement>('[aria-label="Demolish"]')!.click();
    expect(used()).toBe('0%');
    root.querySelector<HTMLButtonElement>('[aria-label="Keep"]')!.click();
    expect(used()).toBe(original);
  });
});

describe('visa-byggalternativ', () => {
  it('marks missing resources independently and disables an unaffordable order', () => {
    const { model } = setup();
    model.openBuildSite(0);
    const snapshot = model.snapshot;
    const planet = snapshot.planet!;
    const view = renderBuildSelection(
      {
        ...snapshot,
        planet: {
          ...planet,
          budget: {
            ...planet.budget,
            available: { Iron: 0, Water: 3, Oil: 1 },
            availableWorkers: 599,
          },
          buildOptions: [
            { type: 'Research station', blockedReason: 'Not enough Iron.' },
          ],
        },
      },
      () => {},
    );
    expect(view.querySelectorAll('.cost-ok')).toHaveLength(2);
    expect(view.querySelectorAll('.cost-missing')).toHaveLength(2);
    expect(
      view.querySelector<HTMLButtonElement>('.building-choice button')!
        .disabled,
    ).toBe(true);
  });
  it('keeps a rejected order on selection without changing occupied sites', () => {
    const { root, model, click } = setup();
    click('Build building');
    model.build('Research station', 0);
    model.openBuildSite(1);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // Submit the old view's site 0 order after it has become occupied.
      click('Build Research station');
      expect(model.snapshot.screen).toBe('build-selection');
      expect(model.snapshot.constructionSite).toBe(1);
      expect(model.snapshot.planet?.projects).toHaveLength(1);
      expect(root.textContent).toContain('No build slots are available');
      expect(root.querySelector('.building-menu')).not.toBeNull();
    } finally {
      warning.mockRestore();
    }
  });
  it('matches descriptions as well as names', () => {
    const { model } = setup();
    model.openBuildSite(0);
    model.searchBuildings('research point');
    expect(
      renderBuildSelection(model.snapshot, () => {}).querySelectorAll(
        '.building-choice',
      ),
    ).toHaveLength(1);
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
      { completed: [], selected: null, stations: 0 },
      false,
      () => {},
    );
    const sources: string[] = [];
    for (const type of Object.keys(BUILDINGS) as BuildType[]) {
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
