// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppView } from '../../src/client/views/AppView.js';
import { renderResearch } from '../../src/client/views/ResearchView.js';

describe('forskningstradets-utrymme', () => {
  it('places station information beside the heading and removes the reserved sidebar and zoom controls', () => {
    const model = new AppModel();
    const page = renderResearch(
      { ...model.snapshot.research, stations: 5 },
      false,
      () => {},
    );
    expect(
      page
        .querySelector('.screen-header .research-introduction summary')
        ?.getAttribute('aria-label'),
    ).toContain('Research stations · 5');
    expect(page.querySelector('.research-sidebar')).toBeNull();
    expect(page.querySelector('.research-tree-tools')).toBeNull();
    expect(page.querySelector('[aria-label="Research tree zoom"]')).toBeNull();
    expect(page.querySelector('[aria-label="Research tree"]')).not.toBeNull();
    const queue = page.querySelector<HTMLDetailsElement>('.research-queue');
    expect(queue?.tagName).toBe('DETAILS');
    expect(queue?.open).toBe(false);
  });

  it('keeps an opened queue available while its orders change without changing the camera', () => {
    const model = new AppModel();
    model.openResearch();
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    view.render(model.snapshot);
    const queue = root.querySelector<HTMLDetailsElement>('.research-queue')!;
    queue.open = true;
    const camera = model.snapshot.researchCamera;
    model.research('Colony ship factory');
    view.render(model.snapshot);
    expect(
      root.querySelector<HTMLDetailsElement>('.research-queue')!.open,
    ).toBe(true);
    expect(
      root.querySelectorAll('.research-queue article').length,
    ).toBeGreaterThan(0);
    expect(model.snapshot.researchCamera).toEqual(camera);
  });
});
