// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { renderDecisionGuidance } from '../../../src/client/space-map/views/decisions/DecisionGuidanceView.js';

describe('atgarder-for-rutttransport', () => {
  it('offers the actual next action and sends its route, without generic research advice', () => {
    const snapshot = new AppModel().snapshot;
    const emit = vi.fn();
    const guidance = renderDecisionGuidance(
      {
        ...snapshot,
        screen: 'route',
        decisions: [
          {
            id: 'route-idle-r',
            kind: 'route',
            label: 'Tellus ↔ Vesta: build a Transport ship in Production',
            routeId: 'r',
            current: true,
            skipped: false,
            muted: false,
            transportAction: {
              kind: 'ship',
              planetName: 'Tellus',
              planetId: 'sol-0',
            },
          },
        ],
      },
      emit,
    )!;
    expect(guidance.textContent).toContain('Queue Transport ship · Tellus');
    expect(guidance.textContent).not.toContain('Use Research or Production');
    const button = [...guidance.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Queue Transport ship'),
    )!;
    button.click();
    expect(emit).toHaveBeenCalledWith({
      type: 'prepare-route-transport',
      routeId: 'r',
    });
  });
  it('explains why research cannot be queued', () => {
    const snapshot = new AppModel().snapshot;
    const guidance = renderDecisionGuidance(
      {
        ...snapshot,
        screen: 'route',
        decisions: [
          {
            id: 'route-idle-r',
            kind: 'route',
            label: 'Research transport',
            routeId: 'r',
            current: true,
            skipped: false,
            muted: false,
            transportAction: {
              kind: 'research',
              blockedReason: 'Build a Research station first.',
            },
          },
        ],
      },
      () => {},
    )!;
    expect(guidance.textContent).toContain('Build a Research station first.');
    expect(guidance.querySelector<HTMLButtonElement>('button')?.disabled).toBe(
      true,
    );
  });
});
