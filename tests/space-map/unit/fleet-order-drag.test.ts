// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { renderFleetCard } from '../../../src/client/space-map/views/FleetCard.js';

describe('inga-move-stop-knappar', () => {
  it('does not offer Move or Stop on the home fleet', () => {
    const model = new AppModel().snapshot;
    const card = renderFleetCard(model.fleet, model, vi.fn());
    expect(card.textContent).not.toContain('Move');
    expect(card.textContent).not.toContain('Stop');
    expect(card.querySelector('.fleet-order-button')).toBeNull();
  });
});
