// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import { researchStationModel } from '../../fixtures/research-station-model.js';

// beslutssektioner / stilla-beslutslista
function open() {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const model = researchStationModel({ shipFactory: true });
  model.openDecisions();
  const controller = new MasterController(
    model,
    new AppView(root, () => ({ render() {}, dispose() {} })),
  );
  controller.start();
  const sections = () =>
    [...root.querySelectorAll('.decisions-page .decision-section')].map(
      (section) => ({
        title: section.querySelector('h2')?.textContent,
        items: [...section.querySelectorAll('[data-decision-id]')].map(
          (card) => (card as HTMLElement).dataset.decisionId,
        ),
      }),
    );
  const section = (title: string) =>
    sections().find((item) => item.title === title)?.items ?? [];
  const reopen = () => {
    root.querySelector<HTMLButtonElement>('[data-screen="map"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-screen="decisions"]')!.click();
  };
  return { root, model, controller, sections, section, reopen };
}

describe('beslutssektioner', () => {
  it('groups decisions under Needs attention, Muted, Messages and Queues', () => {
    const { sections, section, model, controller, reopen } = open();
    expect(sections().map((item) => item.title)).toEqual([
      'Needs attention',
      'Messages',
      'Queues',
    ]);
    expect(section('Needs attention')).toContain('fleet-idle-fleet-home');
    expect(section('Messages')).toEqual(
      expect.arrayContaining(['message-population', 'message-habitability']),
    );
    model.muteDecision('message-population');
    reopen();
    expect(sections().map((item) => item.title)).toEqual([
      'Needs attention',
      'Muted',
      'Messages',
      'Queues',
    ]);
    expect(section('Muted')).toEqual(['message-population']);
    controller.dispose();
  });
});

describe('stilla-beslutslista', () => {
  it('keeps a muted decision in place and the list scrolled until Decisions is reopened', () => {
    const { root, sections, section, controller, reopen } = open();
    const before = sections();
    const content = root.querySelector<HTMLElement>('.empire-content')!;
    content.scrollTop = 120;
    const card = root.querySelector(
      '[data-decision-id="fleet-idle-fleet-home"]',
    )!;
    [...card.querySelectorAll('button')]
      .find((button) => button.textContent === 'Mute')!
      .click();
    expect(sections()).toEqual(before);
    expect(
      root.querySelector('[data-decision-id="fleet-idle-fleet-home"]')!
        .textContent,
    ).toContain('Muted for future turns');
    expect(root.querySelector<HTMLElement>('.empire-content')!.scrollTop).toBe(
      120,
    );
    reopen();
    expect(section('Muted')).toContain('fleet-idle-fleet-home');
    expect(section('Needs attention')).not.toContain('fleet-idle-fleet-home');
    controller.dispose();
  });
});
