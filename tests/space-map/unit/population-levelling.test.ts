import { describe, expect, it } from 'vitest';
import {
  PopulationLevelling,
  type SettlerPlanet,
} from '../../../src/client/space-map/models/production-network/PopulationLevelling.js';

// befolkningsutjamning-i-grupp: the levelling rules on their own.

function planet(
  id: string,
  population: number,
  capacity: number,
  workforce = 0,
): SettlerPlanet {
  return { id, population, capacity, workforce };
}

const oneLink = () => 1;

describe('befolkningsutjamning-i-grupp', () => {
  it('fills a workforce shortage first and keeps the donor at its own floor', () => {
    const levelling = new PopulationLevelling();
    const home = planet('home', 3000, 20000, 1800);
    const colony = planet('colony', 1000, 20000, 1600);
    const sent = levelling.dispatch([home, colony], 4, oneLink, 5);
    // The colony first gets the 600 workers it lacks, then 400 more toward
    // the same 10 % share. Home never drops below its 1 800 workers.
    expect(sent).toEqual([
      { from: 'home', to: 'colony', amount: 600, arrival: 6 },
      { from: 'home', to: 'colony', amount: 400, arrival: 6 },
    ]);
    expect(home.population).toBe(2000);
    expect(levelling.incoming('colony')).toBe(1000);
    const crowded = planet('crowded', 2500, 20000, 2000);
    const short = planet('short', 0, 20000, 1500);
    new PopulationLevelling().dispatch([crowded, short], 4, oneLink, 1);
    expect(crowded.population).toBe(2000);
  });

  it('levels toward the same share of capacity within the seats of the shuttles', () => {
    const levelling = new PopulationLevelling();
    const home = planet('home', 20000, 25000);
    const colony = planet('colony', 1000, 5000);
    levelling.dispatch([home, colony], 2, oneLink, 1);
    // Two shuttles carry 1 000 per round toward 70 % of capacity.
    expect(home.population).toBe(19000);
    expect(levelling.incoming('colony')).toBe(1000);
    levelling.dispatch([home, colony], 2, oneLink, 2);
    expect(levelling.incoming('colony')).toBe(2000);
    levelling.dispatch([home, colony], 10, oneLink, 3);
    // 21 000 of 30 000 is 70 %: the colony is filled to 3 500 in all.
    expect(levelling.incoming('colony') + colony.population).toBe(3500);
    expect(home.population).toBe(17500);
    levelling.dispatch([home, colony], 10, oneLink, 4);
    expect(levelling.incoming('colony') + colony.population).toBe(3500);
  });

  it('en-runda-per-lank: settlers land after one round per link and only once', () => {
    const levelling = new PopulationLevelling();
    const home = planet('home', 10000, 10000);
    const far = planet('far', 0, 10000, 500);
    const rounds = (from: string, to: string) =>
      from === to ? 0 : from === 'home' || to === 'home' ? 2 : 1;
    levelling.dispatch([home, far], 1, rounds, 3);
    expect(levelling.arrivals(4)).toEqual([]);
    expect(levelling.arrivals(5)).toEqual([
      { from: 'home', to: 'far', amount: 500, arrival: 5 },
    ]);
    expect(levelling.arrivals(5)).toEqual([]);
    expect(levelling.transits).toEqual([]);
  });

  it('takes from the nearest donor in links and leaves small differences alone', () => {
    const levelling = new PopulationLevelling();
    const near = planet('near', 6000, 10000);
    const far = planet('far', 6000, 10000);
    const fresh = planet('fresh', 1000, 10000);
    const rounds = (from: string, to: string) =>
      from === to ? 0 : [from, to].includes('far') ? 2 : 1;
    const sent = levelling.dispatch([far, fresh, near], 1, rounds, 1);
    expect(sent).toEqual([
      { from: 'near', to: 'fresh', amount: 500, arrival: 2 },
    ]);
    const even = new PopulationLevelling();
    const a = planet('a', 5050, 10000);
    const b = planet('b', 4950, 10000);
    expect(even.dispatch([a, b], 5, oneLink, 1)).toEqual([]);
  });

  it('rejects corrupt saved settlers', () => {
    const exists = (id: string) => id === 'home';
    expect(() =>
      PopulationLevelling.validate(
        [{ from: 'home', to: 'home', amount: 5, arrival: 2 }],
        exists,
      ),
    ).not.toThrow();
    for (const transit of [
      { from: 'home', to: 'gone', amount: 5, arrival: 2 },
      { from: 'home', to: 'home', amount: 0, arrival: 2 },
      { from: 'home', to: 'home', amount: 1.5, arrival: 2 },
      null,
    ])
      expect(() => PopulationLevelling.validate([transit], exists)).toThrow(
        'Invalid saved settlers',
      );
  });
});
