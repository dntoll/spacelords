// @vitest-environment jsdom
import { turnFrames } from '../fixtures/turn-steps.js';
import { describe, it, expect, vi } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { renderPlanet } from '../../src/client/views/PlanetView.js';
import { renderBuildSelection } from '../../src/client/views/BuildSelectionView.js';
import { renderResearch } from '../../src/client/views/ResearchView.js';
import {
  BUILDINGS,
  TECHNOLOGIES,
  type BuildType,
} from '../../src/client/models/Game.js';
import {
  BUILDING_IMAGES,
  buildingImage,
} from '../../src/client/views/BuildingImage.js';
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
    const action = /^(Build|Queue) (.+)$/.exec(text);
    if (action && !root.querySelector(`[aria-label="${text}"]`))
      root
        .querySelector<HTMLButtonElement>(`[aria-label="Show ${action[2]}"]`)
        ?.click();
    const button = [...root.querySelectorAll('button')].find(
      (b) => b.textContent === text || b.getAttribute('aria-label') === text,
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
    click('Building sites');
    root
      .querySelector<HTMLButtonElement>(
        '[aria-label="Build building at site 3"]',
      )!
      .click();
    expect(root.querySelector('h1')?.textContent).toBe('Build selection');
    expect(root.textContent).not.toContain('\ufffd');
    expect(root.querySelectorAll('.catalog-item')).toHaveLength(4);
    expect(root.querySelector('.catalog-details')).toBeNull();
    click('Show Research station');
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
    click('Building sites');
    click('Build building');
    const search = root.querySelector<HTMLInputElement>(
      'input[type="search"]',
    )!;
    search.focus();
    search.value = 'unknown';
    search.dispatchEvent(new Event('input'));
    expect(root.querySelectorAll('.catalog-item')).toHaveLength(0);
    expect(document.activeElement?.getAttribute('type')).toBe('search');
    click('Back to Building sites');
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
    click('Building sites');
    click('Build building');
    click('Build Research station');
    click('Overview');
    expect(
      root.querySelector<HTMLElement>('[data-resource="Iron"] .budget-used')
        ?.style.width,
    ).not.toBe('0%');
    click('Building sites');
    click('Cancel construction');
    click('Overview');
    expect(
      root.querySelector<HTMLElement>('[data-resource="Iron"] .budget-used')
        ?.style.width,
    ).toBe('0%');
  });
});

describe('gemensamma-byggnadsbilder', () => {
  it('labels only the research queue head as actively researching', () => {
    const view = renderResearch(
      {
        available: TECHNOLOGIES,
        completed: [],
        selected: 'Exploration ship factory',
        queueBlockedReason: null,
        stations: 1,
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
      [...view.querySelectorAll('.pill')].filter((node) =>
        node.textContent?.startsWith('Researching'),
      ),
    ).toHaveLength(1);
  });
  it('uses the same supplied image for selection and construction', () => {
    const { root, click } = setup();
    click('Building sites');
    click('Build building');
    click('Show Research station');
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
    for (const frame of turnFrames(model)) model.applyTurnFrame(frame);
    model.finishTurn();

    model.openPlanet();
    new AppController(
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

describe('visa-byggalternativ', () => {
  it('marks missing resources independently and disables an unaffordable order', () => {
    const { model } = setup();
    model.openBuildSite(0);
    const snapshot = model.snapshot;
    const planet = snapshot.planet!;
    const view = renderBuildSelection(
      {
        ...snapshot,
        selectedBuilding: 'Research station',
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
    click('Building sites');
    click('Build building');
    click('Show Research station');
    const staleOrder = root.querySelector<HTMLButtonElement>(
      '[aria-label="Build Research station"]',
    )!;
    model.build('Research station', 0);
    model.openBuildSite(1);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // Submit the old view's site 0 order after it has become occupied.
      staleOrder.click();
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
        '.catalog-item',
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
      {
        available: TECHNOLOGIES,
        completed: [],
        selected: null,
        queueBlockedReason: null,
        stations: 0,
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

describe('gemensam-planetko / fabrikskoer / kompakta-bygghandlingar', () => {
  it.each([
    'Colony ship factory',
    'Exploration ship factory',
    'Fighter factory',
  ] as const)('exposes ordering but no independent queue for %s', (type) => {
    const model = new AppModel();
    model.openPlanet();
    const planet = model.snapshot.planet!;
    const building = {
      id: 'yard',
      type,
      slotIndex: 0,
      queue: [],
      scheduledForDemolition: false,
    };
    const emit = vi.fn();
    const view = renderPlanet(
      {
        ...planet,
        buildings: [building],
        sites: [{ ...planet.sites[0]!, index: 0, building, project: null }],
      },
      'You',
      emit,
      model.snapshot.fleets,
      {
        phase: 'planning',
        planetTab: 'production',
        productionProduct: BUILDINGS[type].ship!,
      },
    );
    expect(
      view.querySelector('[aria-label="Build ships at site 1"]'),
    ).toBeNull();
    const order = view.querySelector('.production-order')!;
    expect(order).not.toBeNull();
    expect(order.textContent).toContain('crew');
    const select = order.querySelector<HTMLSelectElement>(
      '[aria-label^="Destination fleet for"]',
    )!;
    select.value = 'fleet-home';
    const queue = order.querySelector<HTMLButtonElement>(
      '[aria-label^="Queue "]',
    )!;
    expect(queue.textContent).toBe(`Queue ${BUILDINGS[type].ship}`);
    queue.click();
    expect(emit).toHaveBeenCalledWith({
      type: 'queue-ship',
      ship: BUILDINGS[type].ship,
      fleetId: 'fleet-home',
    });
    expect(view.querySelectorAll('.compact-build-queue')).toHaveLength(1);
    expect(view.querySelector('.queue-slots')).toBeNull();
  });
  it.each(['demolition', 'locked'])(
    'keeps ordering visible but disabled for %s factories',
    (state) => {
      const model = new AppModel();
      model.openPlanet();
      const planet = model.snapshot.planet!;
      const building = {
        id: 'yard',
        type: 'Colony ship factory' as const,
        slotIndex: 0,
        scheduledForDemolition: state === 'demolition',
        queue: [],
      };
      const view = renderPlanet(
        {
          ...planet,
          buildings: [building],
          sites: [{ ...planet.sites[0]!, index: 0, building, project: null }],
        },
        'You',
        vi.fn(),
        [],
        {
          phase: state === 'locked' ? 'simulating' : 'planning',
          planetTab: 'production',
          productionProduct: 'Colony ship',
        },
      );
      expect(
        view.querySelector<HTMLButtonElement>(
          '.production-details button[aria-label^="Queue "]',
        )?.disabled,
      ).toBe(true);
      expect(
        view.querySelector<HTMLSelectElement>(
          '[aria-label^="Destination fleet for"]',
        )?.disabled,
      ).toBe(true);
      expect(
        view.querySelector('.production-order .blocked-reason')?.textContent,
      ).toBeTruthy();
    },
  );
});

describe('byggnadsantal-lokalt-och-globalt', () => {
  it('shows completed buildings per selected planet and across the empire without counting queued projects twice', () => {
    const { model } = setup();
    model.build('Research station', 0);
    model.openBuildSite(1);
    const snapshot = model.snapshot;
    const planet = snapshot.planet!;
    const building = (
      id: string,
      type: BuildType,
      scheduledForDemolition = false,
    ) => ({
      id,
      type,
      slotIndex: 2,
      scheduledForDemolition,
      operational: false,
    });
    const local = {
      ...planet,
      buildings: [
        building('r1', 'Research station'),
        building('r2', 'Research station', true),
        building('i1', 'Iron mine'),
      ],
    };
    const remote = {
      ...planet,
      id: 'another-colony',
      name: 'Vesta',
      buildings: [
        building('r3', 'Research station'),
        building('r4', 'Research station'),
        building('r5', 'Research station'),
        building('w1', 'Water extractor'),
      ],
    };
    for (const [selected, expected] of [
      [local, '2'],
      [remote, '3'],
    ] as const) {
      const compact = renderBuildSelection(
        {
          ...snapshot,
          selectedBuilding: null,
          planet: selected,
          ownedPlanets: [local, remote],
        },
        () => {},
      );
      const compactCounts = (type: BuildType) =>
        compact.querySelector(
          `[aria-label="Show ${type}"] .building-list-inventory`,
        );
      expect(compact.querySelector('.catalog-details')).toBeNull();
      expect(compactCounts('Research station')?.textContent).toContain(
        `On ${selected.name}: ${expected}`,
      );
      expect(compactCounts('Research station')?.textContent).toContain(
        'All your planets: 5',
      );
      expect(compactCounts('Oil extractor')?.textContent).toContain(
        `On ${selected.name}: 0`,
      );
      expect(compactCounts('Oil extractor')?.textContent).toContain(
        'All your planets: 0',
      );
      const inventory = (type: BuildType) =>
        renderBuildSelection(
          {
            ...snapshot,
            selectedBuilding: type,
            planet: selected,
            ownedPlanets: [local, remote],
          },
          () => {},
        ).querySelector(`[data-building-type="${type}"] .building-inventory`)!;
      expect(inventory('Research station').textContent).toContain(
        `On ${selected.name}`,
      );
      expect(inventory('Research station').textContent).toContain(
        'All your planets',
      );
      expect(
        [...inventory('Research station').querySelectorAll('dd')].map(
          (n) => n.textContent,
        ),
      ).toEqual([expected, '5']);
      expect(
        [...inventory('Oil extractor').querySelectorAll('dd')].map(
          (n) => n.textContent,
        ),
      ).toEqual(['0', '0']);
    }
  });
});
