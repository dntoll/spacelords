// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { FleetSnapshot } from '../../src/client/models/Game.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { renderFleetCard } from '../../src/client/views/FleetCard.js';

describe('synlig-flottorder', () => {
  it('shows a colonization order and its target directly on the fleet card', () => {
    const model = new AppModel().snapshot;
    const fleet = model.fleets[0]!;
    const target = model.cells.find(
      (cell) => cell.object?.name && cell.position.key !== fleet.position?.key,
    )!;
    const card = renderFleetCard(
      {
        ...fleet,
        colonizationTargetId: 'target',
        destination: target.position,
      },
      model,
      () => {},
    );
    expect(card.querySelector('.fleet-order-status')?.textContent).toBe(
      `Colonize: ${target.object!.name}`,
    );
  });

  it('shows changing, paused and temporary orders without inventing an idle order', () => {
    const model = new AppModel().snapshot;
    const fleet: FleetSnapshot = { ...model.fleets[0]!, destination: null };
    const status = (changes: Partial<FleetSnapshot>) =>
      renderFleetCard({ ...fleet, ...changes }, model, () => {}).querySelector(
        '.fleet-order-status',
      )?.textContent;
    expect(status({})).toBeUndefined();
    expect(status({ exploration: 'explore-stars' })).toBe('Explore stars');
    expect(status({ exploration: 'explore', ordersPaused: true })).toBe(
      'Explore · paused',
    );
    expect(
      status({
        exploration: 'explore',
        detour: { kind: 'attack-pirate', targetId: 'pirate' },
      }),
    ).toBe('Attack Space pirate');
    expect(status({ destination: fleet.position })).toMatch(/^Move:/);
    expect(status({ automation: 'salvage' })).toContain('Auto salvage');
  });
});
