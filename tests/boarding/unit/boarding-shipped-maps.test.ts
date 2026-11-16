import { describe, expect, it } from 'vitest';
import { parseBoardingMapText } from '../../../src/shared/boarding/map-format.js';
import { boardingMapRequirements } from '../../../src/shared/boarding/map-rules.js';
import { parseBoardingMap } from '../../../src/client/boarding/models/map/BoardingMap.js';

// The only test that reads the editable layouts: any valid edit passes.
const maps = import.meta.glob<string>(
  '../../../src/client/boarding/maps/*.txt',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

describe('kravlista-i-bordningseditor / fast-airlock-i-bordningskarta', () => {
  it.each(Object.entries(maps))(
    '%s parses and meets every fixed layout rule',
    (_file, source) => {
      expect(() => parseBoardingMap(source)).not.toThrow();
      const missing = boardingMapRequirements(parseBoardingMapText(source))
        .filter((requirement) => !requirement.met)
        .map((requirement) => requirement.id);
      expect(missing).toEqual([]);
    },
  );
});
