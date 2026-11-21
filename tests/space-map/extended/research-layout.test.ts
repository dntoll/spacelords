// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { researchStationModel } from '../../fixtures/research-station-model.js';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import { renderResearch } from '../../../src/client/space-map/views/research/ResearchView.js';

describe('forskningstradets-utrymme', () => {
  it('forskning-utan-rubrikrad: shows station information in the queue summary without a heading row, sidebar or zoom controls', () => {
    const model = new AppModel();
    const page = renderResearch(
      { ...model.snapshot.research, stations: 5, builtStations: 5 },
      false,
      () => {},
    );
    expect(page.querySelector('.screen-header')).toBeNull();
    expect(page.querySelector('h1')?.classList).toContain('visually-hidden');
    const summary = page.querySelector('.research-queue-summary')!;
    expect(summary.getAttribute('aria-label')).toContain(
      'Research stations · 5',
    );
    expect(summary.textContent).toContain('5 stations');
    expect(page.querySelector('.research-sidebar')).toBeNull();
    expect(page.querySelector('.research-tree-tools')).toBeNull();
    expect(page.querySelector('[aria-label="Research tree zoom"]')).toBeNull();
    expect(page.querySelector('[aria-label="Research tree"]')).not.toBeNull();
    // forskningsflikar: the queue is a tab below the tree, Selected first.
    const queue = page.querySelector('.research-bottom > .research-queue');
    expect(queue?.hasAttribute('hidden')).toBe(true);
    expect(
      [...page.querySelectorAll('.research-tab')].map((tab) => tab.textContent),
    ).toEqual(['Selected', 'Queue · 0']);
  });

  it('keeps an opened queue available while its orders change without changing the camera', () => {
    const model = researchStationModel();
    model.openResearch();
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    view.render(model.snapshot);
    root
      .querySelector<HTMLButtonElement>('.research-tab[data-tab="queue"]')!
      .click();
    const camera = model.snapshot.researchCamera;
    model.research('Colony ship factory');
    view.render(model.snapshot);
    expect(root.querySelector('.research-queue')!.hasAttribute('hidden')).toBe(
      false,
    );
    expect(
      root.querySelectorAll('.research-queue article').length,
    ).toBeGreaterThan(0);
    expect(model.snapshot.researchCamera).toEqual(camera);
  });
});
