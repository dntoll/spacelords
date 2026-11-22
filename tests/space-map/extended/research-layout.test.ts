// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { researchStationModel } from '../../fixtures/research-station-model.js';
import { AppView } from '../../../src/client/app/views/AppView.js';

describe('forskningstradets-utrymme', () => {
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
    model.research('Armored Fighter');
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
