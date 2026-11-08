import { describe, expect, it } from 'vitest';
import { PlanetQueues } from '../../src/client/models/PlanetQueues.js';

describe('utforskningsko / koloniseringsko', () => {
  it('keeps separate unique priorities and persists edits', () => {
    const queues = new PlanetQueues();
    queues.add('exploration', 'a');
    queues.add('exploration', 'b');
    queues.add('exploration', 'a');
    queues.add('colonization', 'c');
    queues.move('exploration', 'b', 0);
    const restored = new PlanetQueues(queues.snapshot());
    restored.remove('exploration', 'a');
    expect(restored.snapshot()).toEqual({
      exploration: ['b'],
      colonization: ['c'],
    });
    expect(queues.snapshot().exploration).toEqual(['b', 'a']);
  });

  it('rejects corrupt saved priorities and invalid moves', () => {
    expect(
      () => new PlanetQueues({ exploration: ['a', 'a'], colonization: [] }),
    ).toThrow();
    const queues = new PlanetQueues({ exploration: ['a'], colonization: [] });
    expect(() => queues.move('exploration', 'a', 1)).toThrow();
    expect(queues.snapshot().exploration).toEqual(['a']);
  });
});
