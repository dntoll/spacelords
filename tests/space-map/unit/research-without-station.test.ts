// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import { researchStationModel } from '../../fixtures/research-station-model.js';

// forskningsvy-utan-station: without a built Research station, Research shows
// no tree, only a way to Factories where the station is built.
function open(model: AppModel) {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const controller = new MasterController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  model.openResearch();
  controller.start();
  return { root, controller };
}

describe('forskningsvy-utan-station', () => {
  it('replaces the tree with a link to Factories until a Research station is built', () => {
    const model = new AppModel();
    const { root, controller } = open(model);
    expect(model.snapshot.screen).toBe('research');
    expect(root.querySelector('.research-tree-area')).toBeNull();
    expect(root.querySelector('.research-queue')).toBeNull();
    const build = [...root.querySelectorAll('button')].find(
      (button) => button.textContent === 'Build a Research station',
    );
    build!.click();
    expect(model.snapshot.screen).toBe('factories');
    controller.dispose();
  });

  it('shows the tree once a Research station is built', () => {
    const { root, controller } = open(researchStationModel());
    expect(root.querySelector('.research-tree-area')).not.toBeNull();
    expect(root.textContent).not.toContain('Build a Research station');
    controller.dispose();
  });
});
