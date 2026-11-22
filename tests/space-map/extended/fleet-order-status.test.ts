// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { FleetSnapshot } from '../../../src/client/space-map/models/Game.js';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { renderFleetCard } from '../../../src/client/space-map/views/FleetCard.js';

describe('synlig-flottorder', () => {
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
    expect(status({ destination: fleet.position })).toMatch(/^Move:/);
  });
});

describe('kompakt-flottkort-med-order', () => {
  it('puts accessible statistics beside ships and hides only the asteroid explanation', () => {
    const model = new AppModel().snapshot;
    const fleet = model.fleets[0]!;
    const card = renderFleetCard(
      {
        ...fleet,
        speed: 2,
        detectionRange: 3,
        navigationIssue: 'Asteroid passage requires a full round of movement.',
      },
      model,
      () => {},
    );
    const hangar = card.querySelector('.fleet-hangar')!;
    expect(hangar.querySelector('.ship-manifest')).not.toBeNull();
    expect(
      hangar.querySelector('.fleet-speed')?.getAttribute('aria-label'),
    ).toContain('2 hexes/round');
    expect(
      hangar.querySelector('.fleet-detection')?.getAttribute('aria-label'),
    ).toContain('3 hexes');
    expect(card.textContent).not.toContain('Asteroid passage');
    expect(card.querySelector('.fleet-rename-button')).toBeNull();
    const other = renderFleetCard(
      { ...fleet, navigationIssue: 'No known passable route.' },
      model,
      () => {},
    );
    expect(other.textContent).toContain('No known passable route.');
  });
});
