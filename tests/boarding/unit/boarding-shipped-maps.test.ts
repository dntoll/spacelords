import { describe, expect, it } from 'vitest';
import { parseBoardingMap } from '../../../src/client/boarding/models/map/BoardingMap.js';

// datadriven-bordningskarta: the shipped maps are edited freely in the editor.
// The only test on them is that each one stays valid; behaviour uses fixtures.
const shippedMaps = import.meta.glob<string>(
  '../../../src/client/boarding/maps/*.txt',
  { query: '?raw', import: 'default', eager: true },
);

describe('datadriven-bordningskarta', () => {
  it('finds the shipped maps', () => {
    expect(Object.keys(shippedMaps).length).toBeGreaterThan(0);
  });

  it.each(Object.entries(shippedMaps))('%s is a valid map', (_, source) => {
    expect(() => parseBoardingMap(source)).not.toThrow();
  });
});
